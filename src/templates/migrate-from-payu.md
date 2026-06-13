---
name: Migrate Payment Gateway - PayU to Cashfree Payments
description: >
  Use when migrating an existing PayU (PayU India / PayUBiz / PayUMoney) Payment Gateway integration to
  Cashfree Payments. Triggers: migrate from PayU to Cashfree, replace PayU with Cashfree, switch payment
  gateway from PayU, port PayU integration, PayU to Cashfree, swap PayU, PayU vs Cashfree, replace
  secure.payu.in/_payment, replace test.payu.in, rewrite PayU _payment form post, move off PayU, deprecate
  PayU, replace PayU key and salt with Cashfree headers, replace SHA-512 PayU hash with Cashfree signature,
  convert txnid to order_id, convert mihpayid to cf_payment_id, replace PayU reverse hash verification with
  Cashfree backend re-fetch, replace surl furl with return_url, translate PayU verify_payment to Cashfree
  fetch order, migrate PayU cancel_refund_transaction to Cashfree refund, translate PayU webhook hash to
  x-webhook-signature, replace PayU Bolt checkout with Cashfree.js, migrate PayU CheckoutPro mobile SDK to
  Cashfree mobile SDK, migrate PayU SI Standing Instruction to Cashfree Subscriptions, PayU success failure
  pending status to Cashfree PAID. Pair this with the Cashfree backend-sdks, apis, webhooks, web-sdk,
  mobile-sdks, subscriptions, and go-live skills once the mapping is clear.
---

# Migrating From PayU to Cashfree Payments

> **References available:** This SKILL.md covers the end-to-end migration path and the most common code rewrites. For the exhaustive endpoint-by-endpoint map, field-level diffs, Bolt JS → Cashfree.js translation, per-language SDK rewrites, refunds, the `verify_payment`/`cancel_refund_transaction` command-API translation, SI → Subscriptions, mobile SDKs, and status/error code tables — read `references/REFERENCE.md` in this directory.

---

## 1. Scope & Boundaries

### When to use this skill

- The codebase **already integrates PayU** (posts a form to `secure.payu.in/_payment` / `test.payu.in/_payment`, computes a `SHA-512` request hash from `key|txnid|amount|productinfo|firstname|email|...|SALT`, verifies a reverse hash on `surl`/`furl`, calls the `merchant/postservice` command API with `verify_payment` / `cancel_refund_transaction`, loads PayU **Bolt** `bolt.min.js`, or uses the PayU **CheckoutPro** mobile SDK).
- The developer wants to **replace** that integration with Cashfree Payments — keeping the same user-facing flow but swapping the payment provider.
- The developer asks "how do I migrate from PayU", "what's the Cashfree equivalent of the PayU `_payment` post", "what replaces the PayU hash", "what replaces `verify_payment`", or similar.
- You need to rewrite **Payment requests, Hash generation/verification, Checkout, Webhooks, Verification, Refunds, or Standing Instructions (SI / recurring)** code from PayU to Cashfree.

### When NOT to use this skill

- The project has **no existing PayU code** — use `getting-started/SKILL.md` and the relevant `pg/*/SKILL.md` instead; a fresh integration is simpler than a migration.
- The developer is staying on PayU and just asking questions — this skill is one-way (PayU → Cashfree) and assumes a switch is the goal.
- The ask is about a product Cashfree offers differently (Verification Suite, Secure ID, Cross-Border) and has no direct PayU analog — go to that product's skill.
- The ask is about **PayU Payments / Payouts disbursals only** with no PG checkout migration — jump straight to `payouts/SKILL.md`.

### What this skill does NOT do

- It does not preserve PayU IDs. `mihpayid` and PayU's internal references have **no Cashfree equivalent** — new orders created via Cashfree will have fresh `order_id` / `cf_payment_id` values. Your merchant `txnid` can be reused as Cashfree's `order_id` (both are merchant-generated), but historical PayU transactions stay in PayU; only **new** traffic moves.
- It does not perform data migration (historical payments, refund records, settlement reports, saved cards / tokens). Saved instruments held by PayU are **not portable** — future saved-card flows must be rebuilt with Cashfree Token Vault. Run a parallel-reporting period; pull both PayU and Cashfree reports during cutover.

---

## 2. Concept Mapping — Read This First

Both gateways let you start a payment, redirect/checkout, verify on the backend, and react to webhooks. But PayU's **hash-based** security model is fundamentally different from Cashfree's, and **five specific gotchas** trip up every migration. Internalize these before touching code:

| # | Gotcha | PayU | Cashfree |
|---|---|---|---|
| 1 | **API auth** | No headers. Every request carries a `SHA-512` **hash** built from `key` + secret `salt`. The salt never leaves your server | Three headers: `x-client-id`, `x-client-secret`, `x-api-version: 2025-01-01`. **No request hash** — the secret is sent (server-to-server only) in a header |
| 2 | **Amount unit** | Rupees (decimal/string). `₹500` = `"500.00"` | Rupees (decimal). `₹500` = `order_amount: 500.00` — **good news: no unit change**, just drop the string-quoting and send a number |
| 3 | **Checkout handoff** | Server computes the `hash` and posts a form (`key`, `txnid`, `amount`, `hash`, `surl`, `furl`, …) to `_payment`, or hands the same fields + hash to **Bolt** | Server gets a **`payment_session_id`** (short-lived) — no key/salt/hash on the client. Client passes only the session id to Cashfree.js / Drop-in |
| 4 | **Success verification** | Verify the **reverse hash** PayU posts to `surl`, then optionally call `verify_payment`. Trust is anchored on the hash | Verified by the backend via `GET /pg/orders/{order_id}` (`PGFetchOrder`). There is **no client-side success hash** — re-fetch and check `order_status === "PAID"` |
| 5 | **Refund target** | `cancel_refund_transaction` command, keyed by PayU's **`mihpayid`**, with a merchant `token` (≤23 chars) and amount | `POST /pg/orders/{order_id}/refunds` — keyed by your **`order_id`**, amount in rupees, requires a merchant-generated `refund_id` |

### Object & Identifier Map

| Concept | PayU | Cashfree |
|---|---|---|
| Merchant transaction id | `txnid` (you generate it) | `order_id` (you generate it — reuse the same value) |
| Gateway payment id | `mihpayid` (PayU's id) | `cf_payment_id` (Cashfree's id) |
| Bank reference | `bank_ref_num` | `bank_reference` |
| Refund id | merchant `token` (var2, ≤23 chars) + PayU `request_id` | your merchant-provided `refund_id` |
| Short-lived checkout token | *(none — server posts `key`+`hash`+fields)* | `payment_session_id` |
| Public-safe key | `key` (sent to client, but **useless without server-side hash**) | **None — nothing is client-safe.** Only `payment_session_id` goes to the client |
| Server secret | `salt` (used only to build/verify hashes; never sent) | `x-client-secret` (sent in a header on server-to-server calls) |
| Webhook secret | the same `salt` (webhook hash uses it) | same as `x-client-secret` |

### Credential & URL Map

| | PayU | Cashfree |
|---|---|---|
| Sandbox/Test base URL | `https://test.payu.in` (`/_payment`, `/merchant/postservice`) | `https://sandbox.cashfree.com/pg` |
| Production base URL | `https://secure.payu.in` (`/_payment`); `https://info.payu.in/merchant/postservice.php` (commands) | `https://api.cashfree.com/pg` |
| Dashboard | `onboarding.payu.in` | `merchant.cashfree.com` |
| Get credentials | Dashboard → Test Mode → Developer → API Keys (`key` + `Salt`) | Developers → API Keys (`App ID` + `Secret Key`) |
| Environment switch | Change base URL + `key`/`salt` | Change **both** keys **and** base URL |

### Status Value Map

| Concept | PayU values | Cashfree equivalent |
|---|---|---|
| Payment outcome (callback `status`) | `success` / `failure` / `pending` | `PAID` (order) + `SUCCESS` (payment) / `FAILED` or `USER_DROPPED` / `PENDING` |
| Granular state (`unmappedstatus`) | `captured`, `auth`, `failed`, `userCancelled`, … | `SUCCESS`, pre-auth state, `FAILED`, `USER_DROPPED` |
| Refund status | `success` (PayU `error_code` 102 = success), `pending`, `failure` | `SUCCESS`, `PENDING`, `FAILED` |

> **Critical PayU semantics:** PayU explicitly instructs merchants to treat **`pending` as a NON-success (failed)** transaction at callback time, and to only ever trust the `status` field after verifying the hash. Cashfree splits this cleanly: `order_status` (`ACTIVE` / `PAID` / `EXPIRED` / `TERMINATED`) plus a separate `payment_status` (`SUCCESS` / `FAILED` / `PENDING` / `USER_DROPPED`). **Do not string-replace `success` with `PAID`** — re-model the state machine: fulfil only on `order_status === "PAID"`, and treat Cashfree `PENDING` as "keep waiting / poll", not as a hard failure.

**Capture:** Cashfree auto-captures by default, matching PayU's default `captured` behaviour. If you used PayU pre-authorization (auth-then-capture), that maps to Cashfree **Pre-Authorization** (`order_meta` config + `/authorization` endpoint) — see REFERENCE §6.

---

## 3. Migration Workflow

Follow these seven steps in order. Do not skip the parallel-run step — it catches hash, webhook, and state-machine bugs before production traffic.

### Step 1 — Inventory the existing PayU surface

Before writing any Cashfree code, grep the codebase and list:

1. Every place the **request hash** is built — `sha512(...)` / `hash_hmac` / `crypto.createHash("sha512")` over `key|txnid|amount|productinfo|firstname|email|udf1|...|SALT`. Each is a future bug surface.
2. Every form post / redirect to `secure.payu.in/_payment` or `test.payu.in/_payment`, and every `bolt.launch(...)` / Bolt `bolt.min.js` load.
3. Every `surl` / `furl` handler that reads PayU's POST-back (`status`, `mihpayid`, `txnid`, `hash`) and verifies the **reverse hash**.
4. Every call to the command API `merchant/postservice` — `verify_payment`, `get_Transaction_Details`, `cancel_refund_transaction`, `check_action_status`, SI commands (`si_transaction`, `pre_debit_SI`, `mandate_revoke`, `upi_mandate_*`).
5. Every webhook / S2S handler that verifies a PayU hash.
6. All env vars: `PAYU_MERCHANT_KEY`, `PAYU_MERCHANT_SALT` (and any `PAYU_*` URL/config).
7. Any **SI / recurring** request (`si=1`, `si_details` JSON, `api_version=7`) and any saved-card / token logic.

Keep this list — it's your migration checklist.

### Step 2 — Get Cashfree credentials and configure env

- Sign up / sign in to [merchant.cashfree.com](https://merchant.cashfree.com).
- Developers → API Keys → copy **Test** `App ID` + `Secret Key` first (production keys come later, post-KYC).
- Replace env vars:

    | PayU var | → | Cashfree var |
    |---|---|---|
    | `PAYU_MERCHANT_KEY` | → | `CASHFREE_APP_ID` |
    | `PAYU_MERCHANT_SALT` | → | `CASHFREE_SECRET_KEY` (used for both API auth **and** webhook verification) |

  Keep the PayU vars around until cutover so you can dual-run during testing.

- Set `CASHFREE_ENV=SANDBOX` (later `PRODUCTION`). Derive base URL from it — never hardcode.

### Step 3 — Swap the SDK

PayU's official backend SDKs live under the `payu-india` GitHub org and are not consistently published to language registries; many merchants hand-roll the hash + HTTP. Cashfree ships first-class SDKs — prefer them.

| PayU package / approach | → | Cashfree package |
|---|---|---|
| `payu-india/payu-sdk-node` or hand-rolled hash + `_payment` post | → | `cashfree-pg` (npm) |
| `payu-india/web-sdk-python` or hand-rolled | → | `cashfree-pg` (PyPI) |
| `in.payu:payu-sdk` (Maven) or hand-rolled | → | `com.cashfree.pg.java:cashfree_pg` |
| `payu-india/web-sdk-go` or hand-rolled | → | `github.com/cashfree/cashfree-pg/v6` |
| `payu-india/payubiz_php7` sample or hand-rolled | → | `cashfree/cashfree-pg` (Composer) |
| Hand-rolled .NET (no official PayU SDK) | → | `cashfree_pg` (NuGet) |

The single biggest deletion in this step: **the entire hash-generation helper goes away.** Cashfree authenticates with headers (the SDK sets them) — there is no per-request SHA-512 to compute on the order-create path.

### Step 4 — Rewrite backend: create order, verify payment, refund

Pattern follows the 5 gotchas above. Node.js example (Express):

**Before (PayU — hand-rolled hash + form post):**
```javascript
import crypto from "crypto";

const PAYU_BASE =
    process.env.PAYU_ENV === "PRODUCTION"
        ? "https://secure.payu.in"
        : "https://test.payu.in";

app.post("/create-order", (req, res) => {
    const txnid = req.body.receiptId;            // you generate it
    const amount = req.body.amountRupees.toFixed(2); // rupees as string
    const { productinfo, firstname, email } = req.body;

    // PayU request hash: key|txnid|amount|productinfo|firstname|email|udf1..udf5||||||SALT
    const hashString =
        `${process.env.PAYU_MERCHANT_KEY}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${process.env.PAYU_MERCHANT_SALT}`;
    const hash = crypto.createHash("sha512").update(hashString).digest("hex");

    // Render an auto-submitting form to PayU's _payment (or hand these to Bolt)
    res.json({
        action: `${PAYU_BASE}/_payment`,
        fields: {
            key: process.env.PAYU_MERCHANT_KEY,
            txnid, amount, productinfo, firstname, email,
            phone: req.body.phone,
            surl: `${process.env.APP_URL}/payu/success`,
            furl: `${process.env.APP_URL}/payu/failure`,
            hash,
        },
    });
});

// surl handler — verify the REVERSE hash, then trust status
app.post("/payu/success", (req, res) => {
    const p = req.body; // status, mihpayid, txnid, amount, hash, ...
    const reverse =
        `${process.env.PAYU_MERCHANT_SALT}|${p.status}|||||||||||${p.email}|${p.firstname}|${p.productinfo}|${p.amount}|${p.txnid}|${process.env.PAYU_MERCHANT_KEY}`;
    const expected = crypto.createHash("sha512").update(reverse).digest("hex");
    if (expected !== p.hash) return res.status(400).send("bad hash");
    if (p.status === "success") fulfillOrder(p.txnid);
    res.redirect("/order/" + p.txnid);
});

// Refund — command API, keyed by mihpayid
const cmd = "cancel_refund_transaction";
const refundHash = crypto.createHash("sha512")
    .update(`${process.env.PAYU_MERCHANT_KEY}|${cmd}|${mihpayid}|${process.env.PAYU_MERCHANT_SALT}`)
    .digest("hex");
await postForm(`${PAYU_BASE}/merchant/postservice?form=2`, {
    key: process.env.PAYU_MERCHANT_KEY, command: cmd, hash: refundHash,
    var1: mihpayid, var2: `rfnd_${Date.now()}`.slice(0, 23), var3: refundAmount,
});
```

**After (Cashfree):**
```javascript
import { Cashfree, CFEnvironment } from "cashfree-pg";

const cashfree = new Cashfree(
    process.env.CASHFREE_ENV === "PRODUCTION"
        ? CFEnvironment.PRODUCTION
        : CFEnvironment.SANDBOX,
    process.env.CASHFREE_APP_ID,
    process.env.CASHFREE_SECRET_KEY,
);

app.post("/create-order", async (req, res) => {
    const orderId = req.body.receiptId; // reuse your PayU txnid scheme — Cashfree echoes it back
    const response = await cashfree.PGCreateOrder({
        order_id: orderId,
        order_amount: req.body.amountRupees,   // RUPEES, decimal number — no .toFixed string, no hash
        order_currency: "INR",
        customer_details: {
            customer_id: req.body.customerId,           // required
            customer_phone: req.body.phone,             // required, 10-digit
            customer_email: req.body.email,
            customer_name: req.body.firstname,
        },
        order_meta: {
            return_url: `${process.env.APP_URL}/return/${orderId}`, // replaces surl/furl (one URL)
            notify_url: `${process.env.APP_URL}/webhook`,
        },
        order_note: req.body.productinfo,
    });
    // Ship the SHORT-LIVED session token to the client — NOT key/salt/hash.
    res.json({
        orderId,
        paymentSessionId: response.data.payment_session_id,
    });
});

// Verify — do NOT verify a client-side hash. Re-fetch order status from the backend.
app.get("/verify/:orderId", async (req, res) => {
    const order = await cashfree.PGFetchOrder(req.params.orderId);
    if (order.data.order_status === "PAID") {
        fulfillOrder(req.params.orderId);
        return res.json({ status: "PAID" });
    }
    res.json({ status: order.data.order_status }); // ACTIVE / EXPIRED / TERMINATED
});

// Refund — keyed by order_id, not mihpayid; no command/hash
await cashfree.PGOrderCreateRefund(orderId, {
    refund_id: `refund_${Date.now()}`, // you generate it
    refund_amount: refundAmountRupees, // RUPEES
    refund_note: "Customer request",
});
```

**Key rewrites:**
- **Delete the hash helpers** (request hash, reverse hash, and the `key|command|var1|salt` command hash). Cashfree auth is header-based via the SDK — there is no SHA-512 to compute on order create, verify, or refund.
- Replace the `surl` + `furl` **pair** with a single `order_meta.return_url` (Cashfree returns there for both success and failure — you re-fetch to learn the outcome). Set `notify_url` for the webhook.
- Replace the reverse-hash `/payu/success` check with a **backend re-fetch** (`PGFetchOrder` / `GET /pg/orders/{order_id}`). Fulfil **only** on `order_status === "PAID"`.
- Provide `customer_id` and `customer_phone` on order creation. Both are **required** by Cashfree; PayU only required `firstname`/`email`/`phone` loosely.
- Reuse your `txnid` as `order_id` if its format fits (alphanumeric + `-_`, ≤50 chars). Generate your own `refund_id` (PayU's `mihpayid`/`token` model goes away).

### Step 5 — Replace the checkout (form post / Bolt)

PayU either **auto-submits a form to `_payment`** (full redirect) or opens the **Bolt** modal with `key`+`hash`+fields. Cashfree uses **`payment_session_id`** via Cashfree.js or Drop-in — no key/salt/hash is sent to the browser.

**Before (PayU Bolt):**
```html
<script src="https://jssdk.payu.in/bolt/bolt.min.js"></script>
<script>
// fields + hash come from /create-order (hash computed server-side)
bolt.launch({
    key, txnid, amount, productinfo, firstname, email, phone,
    surl, furl, hash,
    udf1: "", udf2: "", udf3: "", udf4: "", udf5: "",
}, {
    responseHandler: function (BOLT) {
        // BOLT.response.txnStatus -> "SUCCESS" | "FAILED" | "CANCEL"
        fetch("/payu/verify?txnid=" + txnid);
    },
    catchException: function (BOLT) { console.error(BOLT.message); },
});
</script>
```

**After (Cashfree.js / Drop-in):**
```html
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
<script>
const cashfree = Cashfree({ mode: "sandbox" }); // or "production"
cashfree
    .checkout({
        paymentSessionId: paymentSessionId,   // from /create-order — that's all the client needs
        redirectTarget: "_self",              // redirects to return_url on completion
    })
    .then(async (result) => {
        if (result.error) return console.error(result.error);
        // The backend MUST re-fetch order status — don't trust `result` (or any client signal) alone.
        const r = await fetch(`/verify/${orderId}`).then((r) => r.json());
        if (r.status === "PAID") /* show success */;
    });
</script>
```

Full option-by-option JS translation (Bolt `responseHandler`/`catchException` → `.then(result)`, `udf*` → `order_tags`, Drop-in, themes) lives in `references/REFERENCE.md` §3.

### Step 6 — Rewrite webhooks

PayU's webhook/S2S callback is `application/x-www-form-urlencoded` and is authenticated by **re-computing the same SHA-512 reverse hash** over the posted fields. Cashfree uses an **HMAC signature header** over `timestamp + rawBody`.

**Before (PayU S2S — hash verify):**
```javascript
app.post("/payu/webhook", express.urlencoded({ extended: true }), (req, res) => {
    const p = req.body; // status, mihpayid, txnid, amount, hash, ...
    const reverse =
        `${process.env.PAYU_MERCHANT_SALT}|${p.status}|||||||||||${p.email}|${p.firstname}|${p.productinfo}|${p.amount}|${p.txnid}|${process.env.PAYU_MERCHANT_KEY}`;
    const expected = crypto.createHash("sha512").update(reverse).digest("hex");
    if (expected !== p.hash) return res.sendStatus(400);
    if (p.status === "success") handleSuccess(p);
    else handleFailure(p); // failure OR pending -> non-success
    res.sendStatus(200);
});
```

**After (Cashfree):**
```javascript
app.post("/webhook",
    express.raw({ type: "application/json" }),   // RAW body, not urlencoded
    (req, res) => {
        const timestamp = req.headers["x-webhook-timestamp"];
        const signature = req.headers["x-webhook-signature"];
        const expected = crypto
            .createHmac("sha256", process.env.CASHFREE_SECRET_KEY) // HMAC-SHA256, not plain SHA-512
            .update(timestamp + req.body.toString())               // timestamp + raw body
            .digest("base64");                                     // BASE64, not hex
        if (expected !== signature) return res.sendStatus(400);

        const event = JSON.parse(req.body.toString());
        switch (event.type) {
            case "PAYMENT_SUCCESS_WEBHOOK":       handleSuccess(event.data);    break;
            case "PAYMENT_FAILED_WEBHOOK":        handleFailure(event.data);    break;
            case "PAYMENT_USER_DROPPED_WEBHOOK":  handleDropped(event.data);    break;
            case "REFUND_STATUS_WEBHOOK":         handleRefund(event.data);     break;
            case "SETTLEMENT_WEBHOOK":            handleSettlement(event.data); break;
        }
        res.sendStatus(200); // always 200, always quickly; process async if slow
    });
```

**Three things change at once** (this is the #1 source of post-migration webhook bugs): the algorithm (`SHA-512 hash` → `HMAC-SHA256`), the input (`fields` → `timestamp + rawBody`), and the encoding (`hex` → `base64`). A PayU verifier with the secret swapped will **always** fail against Cashfree.

**Event-name map (most common):**

| PayU signal | → | Cashfree event |
|---|---|---|
| callback `status = success` | → | `PAYMENT_SUCCESS_WEBHOOK` |
| callback `status = failure` | → | `PAYMENT_FAILED_WEBHOOK` |
| `unmappedstatus = userCancelled` / abandonment | → | `PAYMENT_USER_DROPPED_WEBHOOK` |
| refund S2S / `cancel_refund_transaction` result | → | `REFUND_STATUS_WEBHOOK` (check `data.refund.refund_status`) |
| settlement report | → | `SETTLEMENT_WEBHOOK` |
| dispute / chargeback notification | → | `DISPUTE_*` events (see `pg/disputes/SKILL.md`) |
| SI / mandate events | → | See `subscriptions/SKILL.md` (different event names) |

**Configure webhooks:** Cashfree Dashboard → Developers → Webhooks → add endpoint for each environment. Subscribe to the specific events above. Whitelist Cashfree's IPs so your firewall doesn't drop calls:

| Environment | IPs |
|---|---|
| Sandbox | `52.66.25.127`, `15.206.45.168` |
| Production | `52.66.101.190`, `3.109.102.144`, `18.60.134.245`, `18.60.183.142` |

### Step 7 — Parallel-run, then cut over

Do not flip 100% of traffic on day 1.

1. **Dual-deploy in sandbox.** Keep both integrations wired, pick provider via a feature flag (`PAYMENT_PROVIDER=payu|cashfree`). Run Cashfree end-to-end with test cards/VPAs (see `pg/apis/SKILL.md` §5).
2. **Smoke-test webhook delivery** in the Cashfree Dashboard → Developers → Webhooks → Logs tab. Replay a successful order to prove your handler is idempotent.
3. **Shadow in production.** Move 5–10% of traffic to Cashfree via the feature flag. Watch both dashboards for conversion and failure parity — and re-confirm the `pending`/`PENDING` state machine, since PayU and Cashfree treat it differently.
4. **Ramp to 100%.** Once parity holds, flip the flag. Leave the PayU code path dormant for 30 days to handle delayed webhooks (refunds, settlements, disputes) on pre-cutover transactions.
5. **Decommission.** Remove PayU SDK/env vars/hash helpers/endpoints. Archive PayU dashboard settlements and reconcile.

The full go-live checklist (domain whitelisting, `x-api-version` pinning, TLS 1.2, production integrity checks on Android) lives in `pg/go-live/SKILL.md` — run through it before Step 4.

---

## 4. Security Constraints — Never Violate

These rules are what break PayU→Cashfree migrations most often:

1. **Never send `x-client-secret` to the client.** With PayU the browser saw `key` + a precomputed `hash`; with Cashfree the client gets **only** the `payment_session_id`. The secret stays on the server, in headers, on server-to-server calls.
2. **Never trust a client-side success signal.** PayU anchored trust on the reverse hash; Cashfree's equivalent is the **backend re-fetch** (`PGFetchOrder` / `GET /pg/orders/{order_id}`). Fulfil **only** when `order_status === "PAID"` — not on `BOLT.response.txnStatus`, not on `result` from `.checkout()`.
3. **Webhook = HMAC-SHA256, base64, over `timestamp + rawBody`.** Not plain `SHA-512`, not hex, not over the field list. Use the **raw** request body and prepend `x-webhook-timestamp`. Forgetting the timestamp is the #1 signature bug for PayU migrants.
4. **Re-model `pending`.** PayU told you to treat `pending` as failed at callback time. Cashfree's `PENDING` means "not terminal yet — keep polling / wait for the webhook". Do not auto-fail Cashfree `PENDING` payments.

---

## 5. Quick Diagnostic — "My migration broke"

| Symptom | Likely cause | Fix |
|---|---|---|
| `401 authentication_error` | Still building a SHA-512 hash / posting `key`+`salt` | Use the SDK, or send `x-client-id` / `x-client-secret` / `x-api-version` headers. Delete the hash code |
| Order create rejected on amount | Passing `"500.00"` string or multiplying anything | Send `order_amount: 500.00` as a **number**; PayU and Cashfree are both rupees, so no `*100` |
| Webhook signature always fails | Reusing PayU's SHA-512/hex/field-list hash | Switch to `HMAC-SHA256` → `base64` over `x-webhook-timestamp + rawBody` with `CASHFREE_SECRET_KEY` |
| Client shows "successful" but backend never fulfils | Trusting `BOLT.response` / `.checkout()` result like the old reverse-hash trust | Call `PGFetchOrder` / `GET /orders/{id}` from the backend; only fulfil on `PAID` |
| `customer_id_missing` / `customer_phone_missing` | PayU treated customer fields loosely | Add both as required fields in `customer_details` |
| `400 version_missing` | No `x-api-version` | Add `x-api-version: 2025-01-01` (SDK handles this automatically) |
| Refunds fail with "not found" | Calling refund by `mihpayid` / `token` | Use your merchant `order_id` — `POST /pg/orders/{order_id}/refunds` with a fresh `refund_id` |
| Payments stuck "failed" that PayU would have shown processing | Auto-failing Cashfree `PENDING` (PayU treated pending as failed) | Treat `PENDING` as non-terminal; poll `PGFetchOrder` / wait for webhook |
| Two `return_url`s needed | Looking for `surl`/`furl` split | Cashfree has **one** `return_url`; the backend re-fetch decides success vs failure |
| Webhooks never arrive | Firewall rules, or expecting urlencoded | Whitelist Cashfree IPs (Step 6); parse **raw JSON**, not form-urlencoded |

Cross-reference `common-mistakes/SKILL.md` for all other debugging — it's gateway-agnostic and applies equally to post-migration issues.

---

## 6. After This Skill — Follow-up Reading

Once the mapping is clear, these are the skills to read next in order:

1. `pg/backend-sdks/SKILL.md` — idiomatic per-language SDK patterns (or `pg/apis/SKILL.md` if the project will use raw HTTP).
2. `pg/webhooks/SKILL.md` — full signature-verification reference and event payload schemas.
3. `pg/web-sdk/SKILL.md` or `pg/mobile-sdks/SKILL.md` — checkout rewrite (Bolt → Cashfree.js, CheckoutPro → Cashfree mobile SDK).
4. `pg/go-live/SKILL.md` — production checklist, domain whitelisting, integrity checks.
5. `validation-and-testing/SKILL.md` — post-integration test matrix (run this after every step above).
6. `common-mistakes/SKILL.md` — diagnostic companion during the parallel-run period.

For product areas that need their own mapping:

- **SI / Standing Instructions / recurring → Subscriptions:** `subscriptions/SKILL.md` + this skill's REFERENCE §7.
- **Saved cards (PayU-managed → Cashfree):** `pg/token-vault/SKILL.md` (instruments are **not** portable; rebuild for new traffic).
- **Mobile SDKs (PayU CheckoutPro Android/iOS/RN/Flutter):** `pg/mobile-sdks/SKILL.md` + this skill's REFERENCE §8.
- **Hosted payment links (PayU Payment Links):** `pg/payment-links/SKILL.md`.

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

**PayU (for reference while migrating):**
- [PayU Authentication / Hashing](https://docs.payu.in/reference/authentication-with-payu-apis)
- [PayU Hosted Checkout](https://docs.payu.in/docs/prebuilt-checkout-page-integration)
- [PayU Response Handling](https://docs.payu.in/docs/working-with-response-after-a-customer-checkout)
- [PayU Verify Payment API](https://docs.payu.in/reference/verify_payment_api)
- [PayU Refund API](https://docs.payu.in/reference/refund_transaction_api)
- [PayU Webhooks](https://docs.payu.in/docs/webhooks)
