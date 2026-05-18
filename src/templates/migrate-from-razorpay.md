---
name: Migrate Payment Gateway - Razorpay to Cashfree Payments
description: >
  Use when migrating an existing Razorpay Payment Gateway integration to Cashfree Payments.
  Triggers: migrate from Razorpay to Cashfree, replace Razorpay with Cashfree, switch payment
  gateway from Razorpay, port Razorpay integration, Razorpay to Cashfree, swap Razorpay,
  Razorpay vs Cashfree, replace razorpay-node, replace razorpay pip, replace checkout.razorpay.com,
  rewrite Razorpay checkout, move off Razorpay, deprecate Razorpay, convert razorpay_payment_id
  to cf_payment_id, translate Razorpay webhook to Cashfree webhook, change X-Razorpay-Signature
  to x-webhook-signature, port razorpay.orders.create, port Razorpay handler to Cashfree,
  reimplement Razorpay signature verification with Cashfree, migrate Razorpay refund to Cashfree,
  Razorpay paise to Cashfree rupees, key_id to x-client-id, key_secret to x-client-secret,
  migrate RazorpayX payouts to Cashfree Payouts, migrate Razorpay Subscriptions to Cashfree Subscriptions.
  Pair this with the Cashfree backend-sdks, apis, webhooks, and go-live skills once the mapping is clear.
---

# Migrating From Razorpay to Cashfree Payments

> **References available:** This SKILL.md covers the end-to-end migration path and the most common code rewrites. For the exhaustive endpoint-by-endpoint map, field-level diffs, Checkout JS → Cashfree JS translation, refunds, subscriptions, RazorpayX → Cashfree Payouts, and status/error code tables — read `references/REFERENCE.md` in this directory.

---

## 1. Scope & Boundaries

### When to use this skill

- The codebase **already integrates Razorpay** (uses `razorpay` npm/pip/maven/gem/composer/nuget/go package, calls `api.razorpay.com`, loads `checkout.razorpay.com/v1/checkout.js`, verifies `X-Razorpay-Signature`, or handles `razorpay_payment_id` / `razorpay_order_id` / `razorpay_signature`).
- The developer wants to **replace** that integration with Cashfree Payments — keeping the same user-facing flow but swapping the payment provider.
- The developer asks "how do I migrate from Razorpay", "what's the Cashfree equivalent of `razorpay.orders.create`", "what replaces `checkout.razorpay.com`", or similar.
- You need to rewrite **Orders, Payments, Refunds, Checkout, Webhooks, Signature Verification, or Subscriptions** code from Razorpay to Cashfree.

### When NOT to use this skill

- The project has **no existing Razorpay code** — use `getting-started/SKILL.md` and the relevant `pg/*/SKILL.md` instead; a fresh integration is simpler than a migration.
- The developer is staying on Razorpay and just asking questions — this skill is one-way (Razorpay → Cashfree) and assumes a switch is the goal.
- The ask is about a product Cashfree offers differently (Verification Suite, Secure ID, Cross-Border) and has no direct Razorpay analog — go to that product's skill.
- The ask is about **RazorpayX payouts only** with no PG migration — jump straight to `payouts/SKILL.md` and use Section 9 of `references/REFERENCE.md` here for the header/auth differences.

### What this skill does NOT do

- It does not preserve Razorpay IDs. `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` have **no Cashfree equivalent** — new orders created via Cashfree will have fresh `order_id` / `cf_payment_id` values. Historical Razorpay orders stay in Razorpay; only **new** traffic moves.
- It does not perform data migration (historical payments, refund records, settlement reports). Run a parallel-reporting period; pull both Razorpay and Cashfree reports during cutover.

---

## 2. Concept Mapping — Read This First

The two gateways have the same shape (create an order, render a checkout, verify on backend, listen to webhooks) but **five specific gotchas** trip up every migration. Internalize these before touching code:

| # | Gotcha | Razorpay | Cashfree |
|---|---|---|---|
| 1 | **Amount unit** | Paise (integer). `₹500` = `50000` | Rupees (decimal). `₹500` = `500.00` — pass as `order_amount: 500.00`, **not** `50000` |
| 2 | **API auth** | HTTP Basic (`key_id:key_secret` base64) | Three headers: `x-client-id`, `x-client-secret`, `x-api-version: 2025-01-01` |
| 3 | **Checkout handoff** | Client gets `key_id` + `order_id`; success handler returns `razorpay_payment_id` + `razorpay_signature` | Client gets **`payment_session_id`** (short-lived) — no API keys on the client. Success is **verified by the backend via `GET /pg/orders/{order_id}`**, never by trusting a client callback |
| 4 | **Webhook signature** | `HMAC-SHA256(rawBody, webhook_secret)` → **hex** in `X-Razorpay-Signature`. Webhook secret ≠ API secret | `HMAC-SHA256(timestamp + rawBody, client_secret)` → **base64** in `x-webhook-signature`, with separate `x-webhook-timestamp` header. Same secret as API |
| 5 | **Refund target** | `POST /v1/payments/{payment_id}/refund` — keyed by **payment** | `POST /pg/orders/{order_id}/refunds` — keyed by **order**, amount in rupees, requires a merchant-generated `refund_id` |

### Object & Identifier Map

| Concept | Razorpay | Cashfree |
|---|---|---|
| Order | `order` entity, id `order_...` | `CFOrder`, id = your `order_id` + internal `cf_order_id` |
| Payment attempt | `payment` entity, id `pay_...` | `CFPayment`, id `cf_payment_id` |
| Refund | `refund` entity, id `rfnd_...` | `CFRefund`, id = your merchant-provided `refund_id` |
| Short-lived checkout token | `order_id` + `key_id` on client | `payment_session_id` |
| Public-safe API key | `key_id` (shippable to client) | **None — nothing is client-safe.** Only `payment_session_id` goes to the client |
| Server secret | `key_secret` | `x-client-secret` |
| Webhook secret | Separate per-webhook secret | Same as `x-client-secret` |

### Credential & URL Map

| | Razorpay | Cashfree |
|---|---|---|
| Sandbox/Test base URL | `https://api.razorpay.com/v1/` (test keys) | `https://sandbox.cashfree.com/pg` |
| Production base URL | `https://api.razorpay.com/v1/` (live keys) | `https://api.cashfree.com/pg` |
| Dashboard | `dashboard.razorpay.com` | `merchant.cashfree.com` |
| Get credentials | Account & Settings → API Keys | Developers → API Keys |
| Environment switch | Change keys (same base URL) | Change **both** keys **and** base URL |

### Status Value Map

| Concept | Razorpay values | Cashfree equivalent |
|---|---|---|
| Order status | `created`, `attempted`, `paid` | `ACTIVE`, `ACTIVE` (while retrying), `PAID` (also `EXPIRED` / `TERMINATED` on Cashfree) |
| Payment status | `created`, `authorized`, `captured`, `refunded`, `failed` | `NOT_ATTEMPTED`, `PENDING` (pre-auth), `SUCCESS`, `SUCCESS` (+ refund record), `FAILED` / `USER_DROPPED` |
| Refund status | `pending`, `processed`, `failed` | `PENDING`, `SUCCESS`, `FAILED` |

**Important difference in capture:** Cashfree auto-captures by default. Razorpay's `payment_capture: 0` manual-capture pattern maps to Cashfree's **Pre-Authorization** flow (`order_meta.payment_methods` + `/authorization` endpoint) — see REFERENCE Section 6.

---

## 3. Migration Workflow

Follow these seven steps in order. Do not skip the parallel-run step — it catches webhook and signature bugs before production traffic.

### Step 1 — Inventory the existing Razorpay surface

Before writing any Cashfree code, grep the codebase and list:

1. Every call to the Razorpay SDK or HTTP API: `razorpay.orders.create`, `razorpay.payments.fetch`, `razorpay.payments.capture`, `razorpay.payments.refund`, `razorpay.subscriptions.*`, direct `api.razorpay.com` HTTP calls.
2. Every place `checkout.razorpay.com/v1/checkout.js` is loaded and every `new Razorpay(options)` construction.
3. Every place `razorpay_payment_id`, `razorpay_order_id`, or `razorpay_signature` is read (success handlers, `/verify` endpoints).
4. Every webhook handler that reads `X-Razorpay-Signature` or a Razorpay event name (`payment.captured`, `order.paid`, `refund.processed`, etc.).
5. Where the **amount** is computed — every `* 100` conversion to paise is a future bug.
6. All env vars: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.

Keep this list — it's your migration checklist.

### Step 2 — Get Cashfree credentials and configure env

- Sign up / sign in to [merchant.cashfree.com](https://merchant.cashfree.com).
- Developers → API Keys → copy **Test** `App ID` + `Secret Key` first (production keys come later, post-KYC).
- Replace env vars:

    | Razorpay var | → | Cashfree var |
    |---|---|---|
    | `RAZORPAY_KEY_ID` | → | `CASHFREE_APP_ID` |
    | `RAZORPAY_KEY_SECRET` | → | `CASHFREE_SECRET_KEY` |
    | `RAZORPAY_WEBHOOK_SECRET` | → | *(none — Cashfree uses `CASHFREE_SECRET_KEY` for webhook verification too)* |

  Keep the Razorpay vars around until cutover so you can dual-run during testing.

- Set `CASHFREE_ENV=SANDBOX` (later `PRODUCTION`). Derive base URL from it — never hardcode.

### Step 3 — Swap the SDK

| Razorpay package | → | Cashfree package |
|---|---|---|
| `razorpay` (npm) | → | `cashfree-pg` (npm) |
| `razorpay` (PyPI) | → | `cashfree-pg` (PyPI) |
| `com.razorpay:razorpay-java` | → | `com.cashfree.pg:cashfree-pg` |
| `razorpay/razorpay` (Composer) | → | `cashfree/cashfree-pg` |
| `Razorpay` (NuGet) | → | `cashfree_pg` (NuGet) |
| `github.com/razorpay/razorpay-go` | → | `github.com/cashfree/cashfree-pg/v6` |
| `razorpay` (Ruby gem) | → | *(no official SDK — use the S2S REST API, see `pg/apis/SKILL.md`)* |

### Step 4 — Rewrite backend: create order, verify payment, refund

Pattern follows the 5 gotchas above. Node.js example (Express):

**Before (Razorpay):**
```javascript
// Create order
import Razorpay from "razorpay";
const rzp = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.post("/create-order", async (req, res) => {
    const order = await rzp.orders.create({
        amount: req.body.amountRupees * 100,   // paise
        currency: "INR",
        receipt: req.body.receiptId,
        notes: { customerId: req.body.customerId },
    });
    res.json({ orderId: order.id, keyId: process.env.RAZORPAY_KEY_ID });
});

// Verify checkout callback
import crypto from "crypto";
app.post("/verify", (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");
    if (expected !== razorpay_signature) return res.status(400).send("bad sig");
    // Trust and fulfill
    fulfillOrder(razorpay_order_id);
    res.json({ ok: true });
});

// Refund
await rzp.payments.refund(paymentId, { amount: refundAmountRupees * 100 });
```

**After (Cashfree):**
```javascript
import { Cashfree, CFEnvironment } from "cashfree-pg";
import crypto from "crypto";

const cashfree = new Cashfree(
    process.env.CASHFREE_ENV === "PRODUCTION"
        ? CFEnvironment.PRODUCTION
        : CFEnvironment.SANDBOX,
    process.env.CASHFREE_APP_ID,
    process.env.CASHFREE_SECRET_KEY,
);

app.post("/create-order", async (req, res) => {
    const orderId = req.body.receiptId; // your own unique id — Cashfree echoes it back
    const response = await cashfree.PGCreateOrder({
        order_id: orderId,
        order_amount: req.body.amountRupees,   // RUPEES, decimal — no * 100
        order_currency: "INR",
        customer_details: {
            customer_id: req.body.customerId,           // required
            customer_phone: req.body.customerPhone,     // required, 10-digit
            customer_email: req.body.customerEmail,
            customer_name: req.body.customerName,
        },
        order_meta: {
            return_url: `${process.env.APP_URL}/return/${orderId}`,
            notify_url: `${process.env.APP_URL}/webhook`,
        },
        order_note: req.body.note,
    });
    // Ship the SHORT-LIVED session token to the client — NOT any API key.
    res.json({
        orderId,
        paymentSessionId: response.data.payment_session_id,
    });
});

// Verify — do NOT trust a client-side signature. Re-fetch order status from the backend.
app.get("/verify/:orderId", async (req, res) => {
    const order = await cashfree.PGFetchOrder(req.params.orderId);
    if (order.data.order_status === "PAID") {
        fulfillOrder(req.params.orderId);
        return res.json({ status: "PAID" });
    }
    res.json({ status: order.data.order_status }); // ACTIVE / EXPIRED / TERMINATED
});

// Refund — keyed by order_id, not payment_id
await cashfree.PGOrderCreateRefund(orderId, {
    refund_id: `refund_${Date.now()}`, // you generate it
    refund_amount: refundAmountRupees, // RUPEES
    refund_note: "Customer request",
});
```

**Key rewrites:**
- Drop every `* 100` / `/ 100` amount conversion.
- Replace the `/verify` signature-check endpoint with a **backend re-fetch** (`GET /pg/orders/{order_id}` or `PGFetchOrder`). Cashfree deliberately does **not** send a signed success payload to the client — the "always verify on the backend" pattern is the only correct pattern.
- Provide `customer_id` and `customer_phone` on order creation. Both are **required** by Cashfree. Razorpay treats them as optional `notes`.
- Generate your own `order_id` (unique, idempotent) and `refund_id`. Cashfree does not auto-generate them the way Razorpay does.

### Step 5 — Replace Checkout JS

Razorpay uses a **modal JS SDK with the public `key_id`**. Cashfree uses **`payment_session_id`** via the Cashfree JS SDK or Drop-in — no API key is sent to the browser.

**Before:**
```html
<script src="https://checkout.razorpay.com/v1/checkout.js"></script>
<script>
const rzp = new Razorpay({
    key: keyId,              // from /create-order
    amount: 50000,
    currency: "INR",
    order_id: orderId,
    name: "Acme",
    prefill: { email, contact, name },
    handler: function (response) {
        fetch("/verify", {
            method: "POST",
            body: JSON.stringify(response), // razorpay_payment_id, _order_id, _signature
        });
    },
});
rzp.on("payment.failed", (r) => console.error(r.error));
rzp.open();
</script>
```

**After (Cashfree JS / Drop-in):**
```html
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
<script>
const cashfree = Cashfree({ mode: "sandbox" }); // or "production"
cashfree
    .checkout({
        paymentSessionId: paymentSessionId,   // from /create-order
        redirectTarget: "_self",              // redirects to return_url on completion
    })
    .then(async (result) => {
        if (result.error) return console.error(result.error);
        // result.redirect=true means the page is navigating to return_url.
        // The backend MUST re-fetch order status — don't trust `result` alone.
        const r = await fetch(`/verify/${orderId}`).then((r) => r.json());
        if (r.status === "PAID") /* show success */;
    });
</script>
```

Full option-by-option JS translation (including Drop-in, themes, `prefill` mapping, `modal.ondismiss` → `onPaymentCancel`) lives in `references/REFERENCE.md` Section 3.

### Step 6 — Rewrite webhooks

Header name, signature algorithm, and event names all change. Use the raw request body in **both** gateways — that part is the same.

**Before (Razorpay):**
```javascript
app.post("/webhook",
    express.raw({ type: "application/json" }),
    (req, res) => {
        const sig = req.headers["x-razorpay-signature"];
        const expected = crypto
            .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
            .update(req.body)                 // raw body
            .digest("hex");                   // HEX
        if (expected !== sig) return res.sendStatus(400);
        const event = JSON.parse(req.body.toString());
        switch (event.event) {
            case "payment.captured":  handleSuccess(event.payload.payment.entity); break;
            case "payment.failed":    handleFailure(event.payload.payment.entity); break;
            case "refund.processed":  handleRefund(event.payload.refund.entity);  break;
        }
        res.sendStatus(200);
    });
```

**After (Cashfree):**
```javascript
app.post("/webhook",
    express.raw({ type: "application/json" }),
    (req, res) => {
        const timestamp = req.headers["x-webhook-timestamp"];
        const signature = req.headers["x-webhook-signature"];
        const expected = crypto
            .createHmac("sha256", process.env.CASHFREE_SECRET_KEY)
            .update(timestamp + req.body.toString())  // timestamp + raw body
            .digest("base64");                        // BASE64
        if (expected !== signature) return res.sendStatus(400);

        const event = JSON.parse(req.body.toString());
        switch (event.type) {
            case "PAYMENT_SUCCESS_WEBHOOK":       handleSuccess(event.data);  break;
            case "PAYMENT_FAILED_WEBHOOK":        handleFailure(event.data);  break;
            case "PAYMENT_USER_DROPPED_WEBHOOK": handleDropped(event.data);   break;
            case "REFUND_STATUS_WEBHOOK":         handleRefund(event.data);   break;
            case "SETTLEMENT_WEBHOOK":            handleSettlement(event.data); break;
        }
        res.sendStatus(200); // always 200, always quickly; process async if slow
    });
```

**Event-name map (most common):**

| Razorpay event | → | Cashfree event |
|---|---|---|
| `order.paid` | → | `PAYMENT_SUCCESS_WEBHOOK` |
| `payment.authorized` | → | `PAYMENT_SUCCESS_WEBHOOK` (pre-auth variant — see REFERENCE §6) |
| `payment.captured` | → | `PAYMENT_SUCCESS_WEBHOOK` |
| `payment.failed` | → | `PAYMENT_FAILED_WEBHOOK` or `PAYMENT_USER_DROPPED_WEBHOOK` |
| `refund.created` / `refund.processed` / `refund.failed` | → | `REFUND_STATUS_WEBHOOK` (single event — check `data.refund.refund_status`) |
| `settlement.processed` | → | `SETTLEMENT_WEBHOOK` |
| `subscription.*` | → | See `subscriptions/SKILL.md` (different event names) |
| `payout.*` (RazorpayX) | → | See `payouts/SKILL.md` |

**Configure webhooks:** Cashfree Dashboard → Developers → Webhooks → add endpoint for each environment. Subscribe to the specific events above. Full event → Cashfree payload schemas live in `pg/webhooks/references/REFERENCE.md`.

Whitelist Cashfree's IPs so your firewall doesn't drop calls:

| Environment | IPs |
|---|---|
| Sandbox | `52.66.25.127`, `15.206.45.168` |
| Production | `52.66.101.190`, `3.109.102.144`, `18.60.134.245`, `18.60.183.142` |

### Step 7 — Parallel-run, then cut over

Do not flip 100% of traffic on day 1.

1. **Dual-deploy in sandbox.** Keep both integrations wired, pick provider via a feature flag (`PAYMENT_PROVIDER=razorpay|cashfree`). Run Cashfree end-to-end with test cards/VPAs (see `pg/apis/SKILL.md` §5).
2. **Smoke-test webhook delivery** in the Cashfree Dashboard → Developers → Webhooks → Logs tab. Replay a successful order via "Batch Resend" to prove your handler is idempotent.
3. **Shadow in production.** Move 5–10% of traffic to Cashfree via the feature flag. Watch both dashboards for conversion and failure parity.
4. **Ramp to 100%.** Once parity holds, flip the flag. Leave the Razorpay code path dormant for 30 days to handle delayed webhooks (disputes, settlements) on pre-cutover orders.
5. **Decommission.** Remove Razorpay SDK/env vars/endpoints. Archive Razorpay dashboard settlements and reconcile.

The full go-live checklist (domain whitelisting, `x-api-version` pinning, TLS 1.2, production integrity checks on Android) lives in `pg/go-live/SKILL.md` — run through it before Step 4.

---

## 4. Security Constraints — Never Violate

These four rules are what breaks Razorpay→Cashfree migrations most often:

1. **Never send `x-client-secret` to the client.** Razorpay's `key_id` is public; Cashfree has no public equivalent. Send only the `payment_session_id`.
2. **Never trust a client-side success signal.** The equivalent of Razorpay's `razorpay_signature` verification is Cashfree's **backend re-fetch** (`PGFetchOrder` / `GET /pg/orders/{order_id}`). Fulfill **only** when `order_status === "PAID"`.
3. **Always use the raw webhook body, and always include the timestamp in the HMAC input.** Forgetting to prepend `x-webhook-timestamp` is the #1 Cashfree signature bug for Razorpay migrants — Razorpay hashes the body alone, Cashfree does not.
4. **Base64, not hex.** The digest encoding changes between gateways. A working Razorpay verifier that switches only the secret will **always fail** against Cashfree.

---

## 5. Quick Diagnostic — "My migration broke"

| Symptom | Likely cause | Fix |
|---|---|---|
| `order_amount` looks 100× wrong (`50000.00` when user paid `₹500`) | Paise → rupees conversion missed | Remove `* 100` on amount sent to `PGCreateOrder`; pass rupees |
| `401 authentication_error` | Sending `key_id`/`key_secret` as Basic Auth | Use the SDK, or send `x-client-id` / `x-client-secret` / `x-api-version` headers |
| Signature verification always fails | Using hex encoding, or hashing `rawBody` only | Switch to `base64`; include `x-webhook-timestamp` before `rawBody` in the HMAC input |
| Client shows "payment successful" but backend never fulfills | Relying on a JS-side callback like the old Razorpay `handler` | Call `PGFetchOrder` / `GET /orders/{id}` from the backend; only fulfill on `PAID` |
| `customer_id_missing` / `customer_phone_missing` | Razorpay treated these as optional `notes` | Add both as required fields in `customer_details` |
| `400 version_missing` | No `x-api-version` | Add `x-api-version: 2025-01-01` (SDK handles this automatically) |
| Refunds fail with "payment not found" | Calling refund by `payment_id` | Use the merchant's `order_id` — `POST /pg/orders/{order_id}/refunds` |
| Webhooks never arrive | Default firewall rules, or wrong events subscribed | Whitelist Cashfree IPs (see Step 6); re-check event subscriptions in Dashboard |
| UPI apps missing on iOS after mobile migration | `LSApplicationQueriesSchemes` not set | See `common-mistakes/SKILL.md` §E3 |

Cross-reference `common-mistakes/SKILL.md` for all other debugging — it's gateway-agnostic and applies equally to post-migration issues.

---

## 6. After This Skill — Follow-up Reading

Once the mapping is clear, these are the skills to read next in order:

1. `pg/backend-sdks/SKILL.md` — idiomatic per-language SDK patterns (or `pg/apis/SKILL.md` if the project will use raw HTTP, e.g. a Ruby codebase).
2. `pg/webhooks/SKILL.md` — full signature-verification reference and event payload schemas.
3. `pg/go-live/SKILL.md` — production checklist, domain whitelisting, integrity checks.
4. `validation-and-testing/SKILL.md` — post-integration test matrix (run this after every step above).
5. `common-mistakes/SKILL.md` — diagnostic companion during the parallel-run period.

For product areas that need their own mapping:

- **Subscriptions / mandates:** `subscriptions/SKILL.md` + this skill's REFERENCE §7.
- **RazorpayX Payouts → Cashfree Payouts:** `payouts/SKILL.md` + this skill's REFERENCE §9.
- **Mobile SDKs (`react-native-razorpay`, Razorpay Android/iOS, Flutter):** `pg/mobile-sdks/SKILL.md` + this skill's REFERENCE §8.

---

## 7. Useful Links

**Cashfree:**
- [Cashfree Dev Studio](https://www.cashfree.com/devstudio)
- [Merchant Dashboard](https://merchant.cashfree.com)
- [Create Order API](https://www.cashfree.com/docs/api-reference/payments/latest/orders/create-order)
- [Fetch Order API](https://www.cashfree.com/docs/api-reference/payments/latest/orders/fetch-order)
- [Refund API](https://www.cashfree.com/docs/api-reference/payments/latest/refunds/create-refund)
- [Webhook Signature Verification](https://www.cashfree.com/docs/payments/online/webhooks/signature-verification)
- [Cashfree JS SDK (v3)](https://www.cashfree.com/docs/payments/online/web/checkout)
- [Cashfree GitHub SDKs](https://github.com/cashfree/)

**Razorpay (for reference while migrating):**
- [Razorpay Orders API](https://razorpay.com/docs/api/orders/)
- [Razorpay Webhooks](https://razorpay.com/docs/webhooks/)
- [Razorpay Checkout JS](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/)
