---
name: Migrate PayU to Cashfree — Reference
description: >
  Deep reference for PayU → Cashfree migration. Endpoint-by-endpoint map, hash-auth vs header-auth deep
  dive, field-level request/response diffs, Bolt JS option-by-option translation, per-language SDK rewrites,
  webhook payload shape diffs, verify_payment / cancel_refund_transaction command-API translation, SI →
  Subscriptions, mobile (CheckoutPro) mapping, and status/error code translations. Read after SKILL.md.
---

# Migrating From PayU to Cashfree — Reference

This reference is the source of truth for field-level and endpoint-level differences. Sections are independent; jump to the one you need.

- §1 Endpoint map
- §2 Hash auth (PayU) → header auth (Cashfree) — the core difference
- §3 Payment request — field-by-field diff
- §4 Bolt / form-post checkout — option-by-option diff
- §5 Per-language backend SDK rewrites (Node, Python, Java, Go, PHP, .NET)
- §6 Auto-capture vs Pre-Authorization
- §7 `verify_payment` / `cancel_refund_transaction` command-API translation
- §8 Webhook payload shape diff
- §9 SI (Standing Instruction / recurring) → Subscriptions mapping
- §10 Mobile SDK mapping (CheckoutPro: Android, iOS, React Native, Flutter)
- §11 Status & error code translation

---

## 1. Endpoint Map

PayU has two surfaces: the **payment/redirect** surface (`secure.payu.in` / `test.payu.in`) and the **command (postservice)** surface for verification/refunds (`info.payu.in` / `test.payu.in`). Cashfree exposes a single REST base: `https://sandbox.cashfree.com/pg` (test), `https://api.cashfree.com/pg` (prod). All Cashfree calls require headers `x-client-id`, `x-client-secret`, `x-api-version: 2025-01-01`, `Content-Type: application/json`. PayU calls carry a `hash` field instead of auth headers.

| Purpose | PayU | Cashfree |
|---|---|---|
| Start a payment | `POST https://secure.payu.in/_payment` (form) | `POST /pg/orders` then client checkout with `payment_session_id` |
| Verify / fetch a transaction | `POST .../merchant/postservice?form=2` `command=verify_payment`, `var1=txnid` | `GET /pg/orders/{order_id}` |
| Transaction details (date range) | `command=get_Transaction_Details`, `var1=from`, `var2=to` | `GET /pg/orders/{order_id}/payments` (per-order; no native date-range list) |
| Refund | `command=cancel_refund_transaction`, `var1=mihpayid` | `POST /pg/orders/{order_id}/refunds` |
| Refund status (by PayU id) | `command=check_action_status`, `var1=mihpayid` | `GET /pg/orders/{order_id}/refunds/{refund_id}` |
| Refund status (by request id) | `command=check_action_status_txnid`, `var1=request_id` | `GET /pg/orders/{order_id}/refunds/{refund_id}` |
| List refunds | *(per-txn via status commands)* | `GET /pg/orders/{order_id}/refunds` (scoped to one order) |
| Settlements | *(dashboard / settlement report API)* | `GET /pg/settlements` |
| Payment Links / hosted | `POST https://oneapi.payu.in/payment-links` (Bearer token) | `POST /pg/links` |
| Recurring debit (SI) | `command=si_transaction` (+ `pre_debit_SI`) | `POST /pg/subscriptions/{sub_id}/payments` |
| Create subscription/mandate | `_payment` with `si=1` + `si_details` | `POST /pg/subscriptions` |

Cashfree API reference: [cashfree.com/docs/api-reference/payments](https://www.cashfree.com/docs/api-reference/payments/latest).

---

## 2. Hash Auth (PayU) → Header Auth (Cashfree) — The Core Difference

This is the single biggest conceptual change. Internalize it before rewriting anything.

### 2.1 PayU: every request is hashed with the salt

PayU has no auth headers. Integrity + authenticity come from a `SHA-512` hash built from your `key`, the request fields, and a secret `salt`. The salt **never** leaves your server.

**Request hash (payment / Bolt):**
```
sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
```
Note the **six empty pipes** (`||||||`) reserved between `udf5` and `SALT`. If you send no UDFs, the udf positions are empty but every pipe stays:
```
sha512(key|txnid|amount|productinfo|firstname|email|||||||||||SALT)
```

**Reverse (response) hash — what you verify on `surl`/`furl`/webhook:** the request sequence reversed, salt first, with the six empty pipes after `status`:
```
sha512(SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
```
*(If PayU adds `additional_charges`, it is prepended: `additional_charges|SALT|status|...` — confirm against PayU's response doc for your flow.)*

**Command-API hash (verify / refund / status):**
```
sha512(key|command|var1|salt)
```

### 2.2 Cashfree: headers, no per-request hash

Cashfree authenticates server-to-server calls with three headers — the SDK sets them for you:

```
x-client-id:      <CASHFREE_APP_ID>
x-client-secret:  <CASHFREE_SECRET_KEY>
x-api-version:    2025-01-01
```

There is **no request hash** to compute. The only place HMAC appears is **inbound webhook verification** (§8) — and that is `HMAC-SHA256` over `timestamp + rawBody`, base64-encoded, which is a different algorithm/encoding/input than any PayU hash.

### 2.3 Migration consequence

| PayU mechanism | Cashfree replacement | Action |
|---|---|---|
| Request hash builder (`sha512(key\|...\|salt)`) | SDK sets headers | **Delete it** |
| Reverse-hash verifier on `surl` | `PGFetchOrder` backend re-fetch | **Replace with a status fetch** |
| Command hash (`sha512(key\|command\|var1\|salt)`) | SDK sets headers on REST call | **Delete it** |
| Webhook reverse-hash verifier | `HMAC-SHA256(timestamp+rawBody)` base64 | **Rewrite the algorithm** |

If you keep any SHA-512 hashing logic after migration, it is dead code at best and a bug at worst.

---

## 3. Payment Request — Field Diff

**PayU `POST /_payment` (form fields):**
```
key=<merchant_key>
txnid=rcpt_0001
amount=500.00
productinfo=Pro plan
firstname=Jane
email=c@example.com
phone=9999999999
surl=https://app.example.com/payu/success
furl=https://app.example.com/payu/failure
udf1=...  udf2=...  (through udf5)
hash=<sha512 request hash>
```

**Cashfree `POST /pg/orders`:**
```json
{
    "order_id": "rcpt_0001",
    "order_amount": 500.00,
    "order_currency": "INR",
    "customer_details": {
        "customer_id": "cust_42",
        "customer_phone": "9999999999",
        "customer_email": "c@example.com",
        "customer_name": "Jane Doe"
    },
    "order_meta": {
        "return_url": "https://app.example.com/return/{order_id}",
        "notify_url": "https://app.example.com/webhook",
        "payment_methods": "cc,dc,upi,nb"
    },
    "order_expiry_time": "2026-01-01T10:00:00+05:30",
    "order_note": "Pro plan",
    "order_tags": { "anything": "free-form" }
}
```

| PayU field | Cashfree field | Notes |
|---|---|---|
| `key` | *(none in body — `x-client-id` header)* | Auth moves to headers |
| `salt` | *(none — `x-client-secret` header)* | Never in the body |
| `hash` | *(none)* | **No request hash.** Delete it |
| `txnid` | `order_id` | Both merchant-supplied & unique. Reuse the same value. Cashfree: ≤50 chars, alphanumeric + `-_` |
| `amount` (rupees string) | `order_amount` (rupees number) | **Same unit** — just send a number, not `"500.00"`. Cashfree max `order_amount` is 1,000,000 |
| *(implicit INR)* | `order_currency` | Explicit 3-letter ISO code |
| `productinfo` | `order_note` (or `order_tags`) | Free-form description |
| `firstname` | `customer_details.customer_name` | — |
| `email` | `customer_details.customer_email` | — |
| `phone` | `customer_details.customer_phone` | **Required.** 10-digit Indian number (no `+91`) |
| *(none)* | `customer_details.customer_id` | **Required.** Use your user id |
| `surl` + `furl` (two URLs) | `order_meta.return_url` (one URL) | Cashfree returns to one URL for both outcomes; backend re-fetch decides. Use `{order_id}` placeholder |
| *(dashboard-configured S2S)* | `order_meta.notify_url` | Per-order webhook override |
| `udf1`–`udf5` | `order_tags` | Free-form `string→string` map; keep values short |
| *(none)* | `order_expiry_time` | ISO-8601 order-level expiry |

**Response diff:**

| PayU response (callback) field | Cashfree response field |
|---|---|
| `mihpayid` | `cf_payment_id` (on payment objects) + `cf_order_id` (internal order id) |
| `txnid` | `order_id` (what you sent) |
| `status` (`success`/`failure`/`pending`) | `order_status` (`ACTIVE`/`PAID`/`EXPIRED`/`TERMINATED`) + `payment_status` |
| `amount` | `order_amount` |
| `bank_ref_num` | `bank_reference` |
| `mode` / `PG_TYPE` | `payment_group` + `payment_method` |
| *(none)* | `payment_session_id` — **critical**, pass to client |

---

## 4. Bolt / Form-Post Checkout — Option-by-Option

**Script / entry points:**

| | URL / mechanism |
|---|---|
| PayU redirect | Auto-submitting HTML form → `https://secure.payu.in/_payment` |
| PayU Bolt (prod) | `https://jssdk.payu.in/bolt/bolt.min.js` → `bolt.launch(data, handlers)` |
| PayU Bolt (UAT) | `https://jssdk-uat.payu.in/bolt/bolt.min.js` |
| Cashfree (v3, web) | `https://sdk.cashfree.com/js/v3/cashfree.js` → `cashfree.checkout({ paymentSessionId })` |
| Cashfree Drop-in (v3) | same bundle; `cashfree.create("paymentComponent")` |

### 4.1 Options Translation

| PayU Bolt option | Cashfree equivalent | Notes |
|---|---|---|
| `key` | *(nothing)* | Cashfree uses no client-side key |
| `hash` | *(nothing)* | No client-side hash — the session id is the credential |
| `txnid` | *(nothing — in the session)* | Derived from `payment_session_id` |
| `amount`, `productinfo` | *(nothing — in the session)* | Cashfree derives these from the order behind the session id |
| `firstname`, `email`, `phone` | Passed at order creation via `customer_details` (backend) | Cashfree prefills from the order, not a client option |
| `surl` / `furl` | `order_meta.return_url` on the order + `redirectTarget: "_self"` | One URL; outcome learned via backend re-fetch |
| `udf1`–`udf5` | `order_tags` on order creation | Backend-only |
| `responseHandler(BOLT)` | `.checkout(...).then(result => ...)` + backend re-fetch | **Do not trust `BOLT.response.txnStatus` for fulfilment.** Re-fetch `GET /pg/orders/{order_id}` |
| `catchException(BOLT)` | `result.error` branch in `.then(...)` | Cashfree surfaces errors in the promise |
| `BOLT.response.txnStatus` (`SUCCESS`/`FAILED`/`CANCEL`) | `order_status` after re-fetch (`PAID` / non-`PAID`) | Re-model; do not 1:1 map the strings |

### 4.2 Checkout modes

PayU's Bolt is essentially one modal mode. Cashfree v3 has three:

| Cashfree mode | When to use | PayU analog |
|---|---|---|
| `redirectTarget: "_modal"` | Modal popup over your page | Bolt modal |
| `redirectTarget: "_self"` | Redirect to Cashfree-hosted page, return to `return_url` | Classic `_payment` form-post redirect |
| Drop-in (`cashfree.create("paymentComponent")`) | Embed payment UI in your own layout | No direct PayU analog |

See [Cashfree web docs](https://www.cashfree.com/docs/payments/online/web/checkout) for Drop-in wiring.

---

## 5. Per-Language Backend SDK Rewrites

Common theme across all languages: **the hash helper disappears** and HTTP `_payment`/`postservice` calls become Cashfree SDK methods.

### 5.1 Python (Flask / Django)

**Before (PayU — hand-rolled):**
```python
import hashlib, requests

hash_str = f"{KEY}|{txnid}|{amount}|{productinfo}|{firstname}|{email}|||||||||||{SALT}"
hash_ = hashlib.sha512(hash_str.encode()).hexdigest()
# render form to https://secure.payu.in/_payment with key, txnid, amount, ..., hash

# Verify
v_hash = hashlib.sha512(f"{KEY}|verify_payment|{txnid}|{SALT}".encode()).hexdigest()
requests.post("https://info.payu.in/merchant/postservice.php?form=2", data={
    "key": KEY, "command": "verify_payment", "var1": txnid, "hash": v_hash,
})

# Refund
r_hash = hashlib.sha512(f"{KEY}|cancel_refund_transaction|{mihpayid}|{SALT}".encode()).hexdigest()
requests.post(".../postservice.php?form=2", data={
    "key": KEY, "command": "cancel_refund_transaction", "hash": r_hash,
    "var1": mihpayid, "var2": token[:23], "var3": refund_amount,
})
```

**After (Cashfree Python SDK v6+):**
```python
from cashfree_pg.api_client import Cashfree
from cashfree_pg.models.create_order_request import CreateOrderRequest
from cashfree_pg.models.customer_details import CustomerDetails
from cashfree_pg.models.order_meta import OrderMeta
from cashfree_pg.models.order_create_refund_request import OrderCreateRefundRequest

cf = Cashfree(
    XEnvironment=Cashfree.SANDBOX,   # or Cashfree.PRODUCTION
    XClientId=os.environ["CASHFREE_APP_ID"],
    XClientSecret=os.environ["CASHFREE_SECRET_KEY"],
)

order = cf.PGCreateOrder(CreateOrderRequest(
    order_id=txnid,                         # reuse your PayU txnid
    order_amount=amount_rupees,             # number, not string
    order_currency="INR",
    customer_details=CustomerDetails(customer_id=customer_id, customer_phone=phone),
    order_meta=OrderMeta(return_url=f"{APP_URL}/return/{txnid}", notify_url=f"{APP_URL}/webhook"),
), None, None)
payment_session_id = order.data.payment_session_id

# Verify — re-fetch (replaces verify_payment + reverse hash)
fetched = cf.PGFetchOrder(txnid, None, None)
if fetched.data.order_status == "PAID":
    fulfill(txnid)

# Refund — keyed by order_id (replaces cancel_refund_transaction + mihpayid)
cf.PGOrderCreateRefund(txnid, OrderCreateRefundRequest(
    refund_id=f"refund_{int(time.time())}",
    refund_amount=refund_rupees,
    refund_note="Customer request",
), None, None)
```

### 5.2 Java (Spring Boot)

| PayU | Cashfree |
|---|---|
| `MessageDigest.getInstance("SHA-512")` over `key\|txnid\|...\|salt` | `Cashfree cf = new Cashfree(Cashfree.SANDBOX, appId, secret, null, null, null);` |
| Form post to `/_payment` | `cf.PGCreateOrder(createOrderRequest, null, null, null)` |
| `verify_payment` postservice call | `cf.PGFetchOrder(orderId, null, null, null)` → check `order_status == "PAID"` |
| `cancel_refund_transaction` postservice call | `cf.PGOrderCreateRefund(orderId, orderCreateRefundRequest, null, null, null)` |
| Reverse-hash verify on webhook | `cf.PGVerifyWebhookSignature(signature, rawBody, timestamp)` |

Amounts: both PayU and Cashfree use rupees; Cashfree Java takes a `Double`.

### 5.3 Go (SDK v6+)

| PayU | Cashfree |
|---|---|
| `sha512.New()` over the pipe string | `cashfree := cashfreepg.Cashfree{XEnvironment: cashfreepg.SANDBOX, XClientID: &appId, XClientSecret: &secret}` |
| `http.PostForm(".../_payment", ...)` | `cashfree.PGCreateOrder(&createOrderRequest, nil, nil, nil)` |
| `verify_payment` post | `cashfree.PGFetchOrder(orderId, nil, nil, nil)` |
| `cancel_refund_transaction` post | `cashfree.PGOrderCreateRefund(orderId, &orderCreateRefundRequest, nil, nil, nil)` |
| reverse-hash verify | `cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp)` |

### 5.4 PHP

| PayU | Cashfree |
|---|---|
| `hash('sha512', "$key\|$txnid\|...\|$salt")` | `$cf = new \Cashfree\Cashfree(\Cashfree\Cashfree::$SANDBOX, $appId, $secret, "", "", "", true);` |
| `curl` form post to `/_payment` | `$cf->PGCreateOrder($createOrderRequest)` |
| `verify_payment` postservice | `GET /pg/orders/{order_id}` re-fetch via `PGFetchOrder` |
| reverse-hash webhook verify | `$cf->PGVerifyWebhookSignature($signature, $rawBody, $timestamp)` |

### 5.5 .NET (C#)

PayU has no official .NET SDK, so existing code is hand-rolled `SHA512Managed` + `HttpClient`.

| PayU | Cashfree |
|---|---|
| `SHA512.Create().ComputeHash(...)` | `var cf = new Cashfree(Cashfree.SANDBOX, appId, secret, null, null, null, null);` |
| `HttpClient` form post to `/_payment` | `cf.PGCreateOrder(createOrderRequest, null, null, null)` |
| `verify_payment` call | `cf.PGFetchOrder(...)` → check `order_status == "PAID"` |

**TLS note:** older .NET Framework clients default to TLS 1.0 — Cashfree requires TLS 1.2. Set `ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;` at startup.

---

## 6. Auto-Capture vs Pre-Authorization

PayU defaults to capture (the callback `unmappedstatus` is `captured`). If you ran an **auth-then-capture** flow on PayU, the Cashfree equivalent is **Pre-Authorization**, enabled via account config + `order_meta` and a dedicated capture/void endpoint.

**Capture or void an authorized payment:**
```
POST /pg/orders/{order_id}/authorization
{
    "action": "CAPTURE",   // or "VOID"
    "amount": 500.00       // partial capture supported
}
```
(Pre-auth is account-level: enable it in Dashboard → Settings → Payment Gateway.)

If you never used PayU auth-only flows, ignore this section — Cashfree auto-capture matches PayU's default. More in `pg/backend-sdks/references/REFERENCE.md` (pre-auth section).

---

## 7. `verify_payment` / `cancel_refund_transaction` Command-API Translation

PayU verification and refunds go through the command (`postservice`) API. Cashfree replaces both with plain REST/SDK calls.

### 7.1 Verify

| | PayU `verify_payment` | Cashfree |
|---|---|---|
| Endpoint | `POST .../merchant/postservice?form=2` | `GET /pg/orders/{order_id}` |
| Auth | `hash = sha512(key\|command\|var1\|salt)` | headers |
| Key field | `var1 = txnid` | path `order_id` |
| Success check | `transaction_details[txnid].status == "success"` | `order_status == "PAID"` |
| Attempt detail | inside `transaction_details` | `GET /pg/orders/{order_id}/payments` |

### 7.2 Refund

| | PayU `cancel_refund_transaction` | Cashfree |
|---|---|---|
| Endpoint | `POST .../merchant/postservice?form=2` | `POST /pg/orders/{order_id}/refunds` |
| Auth | `hash = sha512(key\|command\|var1\|salt)` | headers |
| Original txn ref | `var1 = mihpayid` (PayU's id) | path `order_id` (yours) |
| Refund id | `var2 = token` (merchant, **≤23 chars**) | `refund_id` (merchant-generated) |
| Amount | `var3` | `refund_amount` (rupees) |
| Refund callback | `var5` (optional) | `notify_url` / `REFUND_STATUS_WEBHOOK` |
| Returned id | `request_id` (PayU's refund id) | `cf_refund_id` |
| Success signal | `error_code == 102` ⇒ success | `refund_status == "SUCCESS"` |

### 7.3 Refund status

| PayU | Cashfree |
|---|---|
| `check_action_status` (`var1 = mihpayid`) | `GET /pg/orders/{order_id}/refunds/{refund_id}` |
| `check_action_status_txnid` (`var1 = request_id`) | `GET /pg/orders/{order_id}/refunds/{refund_id}` |

Cashfree refund docs: [create-refund](https://www.cashfree.com/docs/api-reference/payments/latest/refunds/create-refund).

---

## 8. Webhook Payload Shape Diff

PayU's payment webhook (S2S callback) is **`application/x-www-form-urlencoded`** with the same field set as the `surl` POST, and is verified by recomputing the **reverse SHA-512 hash**. Cashfree's webhook is **JSON** with an **HMAC-SHA256** signature header.

**PayU S2S payload (form-urlencoded, flat):**
```
mihpayid=403993715...&txnid=rcpt_0001&status=success&amount=500.00
&productinfo=Pro+plan&firstname=Jane&email=c@example.com&mode=UPI
&bank_ref_num=...&PG_TYPE=...&unmappedstatus=captured&hash=<sha512 reverse hash>
```

**Cashfree envelope (JSON):**
```json
{
    "type": "PAYMENT_SUCCESS_WEBHOOK",
    "event_time": "2026-04-18T10:00:00+05:30",
    "data": {
        "order": {
            "order_id": "rcpt_0001",
            "order_amount": 500.00,
            "order_currency": "INR",
            "order_tags": { }
        },
        "payment": {
            "cf_payment_id": 12345,
            "payment_status": "SUCCESS",
            "payment_amount": 500.00,
            "payment_currency": "INR",
            "payment_method": { "upi": { "channel": "collect", "upi_id": "test@ybl" } },
            "payment_group": "upi",
            "bank_reference": "...",
            "payment_time": "2026-04-18T10:00:00+05:30"
        },
        "customer_details": { "customer_id": "cust_42", "customer_phone": "9999999999" },
        "payment_gateway_details": { "gateway_name": "...", "gateway_payment_id": "..." }
    }
}
```

**Verification diff:**

| Aspect | PayU | Cashfree |
|---|---|---|
| Body format | `x-www-form-urlencoded` | raw JSON (`express.raw`) |
| Algorithm | `SHA-512` (plain hash) | `HMAC-SHA256` |
| Secret | `salt` | `CASHFREE_SECRET_KEY` |
| Hash input | reverse field sequence | `x-webhook-timestamp + rawBody` |
| Encoding | hex | base64 |
| Where | inline `hash` field in body | `x-webhook-signature` header (+ `x-webhook-timestamp`) |

**Field lookup map (common handlers):**

| What you want | PayU path | Cashfree path |
|---|---|---|
| Event/outcome | `status` (`success`/`failure`/`pending`) | `type` + `data.payment.payment_status` |
| Timestamp | *(none; `addedon`)* | `event_time` (ISO string) |
| Order id (merchant's) | `txnid` | `data.order.order_id` |
| Payment id (gateway's) | `mihpayid` | `data.payment.cf_payment_id` |
| Amount | `amount` (rupees) | `data.payment.payment_amount` (rupees) |
| Method | `mode` / `PG_TYPE` | `data.payment.payment_group` (+ `payment_method`) |
| Customer | `email` / `phone` | `data.customer_details.customer_email` / `.customer_phone` |
| Failure reason | `error` / `error_Message` | `data.error_details.error_code` / `.error_description` / `.error_reason` |
| Bank ref | `bank_ref_num` | `data.payment.bank_reference` |
| Refund (on refund events) | refund S2S fields | `data.refund.*` |

For every Cashfree event's complete payload, see `pg/webhooks/references/REFERENCE.md`.

---

## 9. SI (Standing Instruction / recurring) → Subscriptions Mapping

PayU recurring rides on the standard `_payment` request with `si=1` and an `si_details` JSON. Cashfree models recurring as a first-class **Subscription** with an explicit authorization step. This is **not** a string-replace migration.

### 9.1 Registration

| Concept | PayU SI | Cashfree Subscriptions |
|---|---|---|
| Enable recurring | `si=1`, `api_version=7` on `_payment` | `POST /pg/subscriptions` (separate object) |
| Plan/amount | `si_details` JSON: `billingAmount`, `billingCurrency`, `billingCycle` (`ONCE`/`ADHOC`/`DAILY`/`WEEKLY`/`MONTHLY`/`YEARLY`), `billingInterval`, `paymentStartDate`, `paymentEndDate` | `Plan` (`plan_id`, `plan_recurring_amount`, `plan_interval_type`, `plan_intervals`, `plan_max_cycles`) + `subscription` |
| Hash | `sha512(key\|txnid\|amount\|...\|udf5\|\|\|\|\|\|\|si_details\|SALT)` | none — headers |
| First-charge auth | Customer completes registration txn on PayU page | Customer completes **Authorization** (₹0 / nominal) via `payment_session_id` |
| Mandate types | card eMandate (SI), eNACH (`beneficiaryDetail`), UPI AutoPay (`billingRule`, `billingLimit`) | UPI AutoPay / eMandate / PhysicalMandate / card (token vault) |

### 9.2 Management commands

| PayU command | Cashfree |
|---|---|
| `pre_debit_SI` (pre-debit notice, ≥24–48h before card debit) | Cashfree manages pre-debit notification per mandate rules |
| `si_transaction` (execute recurring debit) | `POST /pg/subscriptions/{sub_id}/payments` |
| `mandate_revoke` (cancel card mandate) | `PATCH /pg/subscriptions/{sub_id}` → `status: "CANCELLED"` |
| `upi_mandate_status` | `GET /pg/subscriptions/{sub_id}` |
| `upi_mandate_modify` | `PATCH /pg/subscriptions/{sub_id}` |
| `upi_mandate_revoke` | `PATCH /pg/subscriptions/{sub_id}` → `status: "CANCELLED"` |

### 9.3 Status & webhooks

| PayU recurring signal | Cashfree |
|---|---|
| registration txn `success` | `AUTHORIZATION_APPROVED` / subscription `ACTIVE` |
| recurring debit `success` | `SUBSCRIPTION_PAYMENT_SUCCESS` |
| recurring debit `failure` | `SUBSCRIPTION_PAYMENT_FAILED` |
| mandate revoked | `SUBSCRIPTION_STATUS_CHANGED` → `CANCELLED` |

Full Cashfree subscription flow: `subscriptions/SKILL.md` and `subscriptions/references/REFERENCE.md`.

---

## 10. Mobile SDK Mapping (CheckoutPro)

PayU's mobile SDK family is **CheckoutPro** (org `payu-intrepos`). The merchant supplies hashes via a `generateHash` callback; Cashfree mobile SDKs need only the `payment_session_id`.

### 10.1 React Native

| PayU | Cashfree |
|---|---|
| `npm i payu-non-seam-less-react` | `npm i react-native-cashfree-pg-sdk @cashfreepayments/cashfree-pg-api-contract` |
| `PayUBizSdk.openCheckoutScreen({ payUPaymentParams, payUCheckoutProConfig })` | `CFPaymentGatewayService.doPayment(dropCheckoutPayment)` + `CFPaymentGatewayService.setCallback({ onVerify, onError })` |
| `generateHash` event → return server hash | Nothing — backend creates the order; pass `payment_session_id` in `session` |
| `onPaymentSuccess` event → verify server-side | `onVerify(orderId)` → **backend** calls `PGFetchOrder` |

Critical: register `setCallback` BEFORE `doPayment` and remove on unmount. See `pg/mobile-sdks/SKILL.md` + `common-mistakes/SKILL.md` §E1/E8.

### 10.2 Android (native Kotlin/Java)

| PayU | Cashfree |
|---|---|
| `implementation 'in.payu:payu-checkout-pro:<ver>'` | `implementation 'com.cashfree.pg:api:2.x.x'` + `implementation 'com.cashfree.pg:payment:2.x.x'` |
| `PayUCheckoutPro.open(activity, payUPaymentParams, listener)` | `CFPaymentGatewayService.getInstance().doPayment(activity, cfDropCheckoutPayment)` |
| `PayUCheckoutProListener.generateHash(...)` | Nothing — `payment_session_id` carries auth |
| `onPaymentSuccess()` | `CFCheckoutResponseCallback.onPaymentVerify(orderId)` |

### 10.3 iOS (Swift/Obj-C)

| PayU | Cashfree |
|---|---|
| `pod 'PayUIndia-CheckoutPro'` | `pod 'CashfreePG'` |
| `PayUCheckoutPro` init + `PayUCheckoutProDelegate` | `CFPaymentGatewayService.getInstance()` + `CFResponseDelegate` |
| `generateHash` delegate callback | Nothing — pass `payment_session_id` in `CFDropCheckoutPayment` |

**iOS `info.plist`:** add `LSApplicationQueriesSchemes` entries for UPI apps — see `common-mistakes/SKILL.md` §E3.

### 10.4 Flutter

| PayU | Cashfree |
|---|---|
| `payu_checkoutpro_flutter` (pub.dev) | `flutter_cashfree_pg_sdk` (pub.dev) |
| `_checkoutPro.openCheckoutScreen(payUPaymentParams, payUCheckoutProConfig)` + `generateHash` callback | `CFPaymentGatewayService().doPayment(cfDropCheckoutPayment)` + `setCallback(onVerify, onError)` |

Full Cashfree mobile details: `pg/mobile-sdks/references/REFERENCE.md`.

---

## 11. Status & Error Code Translation

### 11.1 Payment status

| PayU `status` / `unmappedstatus` | Cashfree |
|---|---|
| `status = success` (`unmappedstatus = captured`) | `order_status = PAID`, `payment_status = SUCCESS` |
| `status = failure` (`unmappedstatus = failed`) | `payment_status = FAILED` |
| `unmappedstatus = userCancelled` | `payment_status = USER_DROPPED` |
| `status = pending` | `payment_status = PENDING` — **non-terminal on Cashfree** (poll/wait), unlike PayU where you treat pending as failed at callback time |
| pre-auth `unmappedstatus = auth` | Cashfree authorization state — inspect via `GET /pg/orders/{id}/payments` |

### 11.2 Refund status

| PayU | Cashfree |
|---|---|
| `error_code = 102` (refund initiated/success) | `refund_status = SUCCESS` |
| refund `pending` | `refund_status = PENDING` |
| refund `failure` | `refund_status = FAILED` |

### 11.3 API / integration errors

| PayU symptom | Cashfree analog |
|---|---|
| Hash mismatch / bad `key`+`salt` | `401 authentication_error` |
| Missing mandatory field | `400 invalid_request_error` (e.g. `customer_phone_missing`, `order_amount_invalid`) |
| Gateway/bank decline reflected in `error` / `error_Message` | `502 bank_processing_failure` or `payment_status = FAILED` with `error_details` |
| Server error | `500 internal_server_error` |
| Rate limited | `429 rate_limit_error` |

### 11.4 Migration-specific red flags

| Symptom | Root cause |
|---|---|
| Team still building/verifying a SHA-512 hash | Hash auth not removed; switch to header auth |
| Frontend can't open checkout | Code still passes `key`+`hash`; pass `payment_session_id` instead |
| Webhook verification always fails | Reusing PayU reverse-hash (SHA-512/hex/fields); use HMAC-SHA256/base64 over `timestamp+rawBody` |
| Payments auto-failed that should wait | Cashfree `PENDING` treated as PayU `pending` (= failed); re-model as non-terminal |
| Refund "not found" | Calling refund by `mihpayid`; use `order_id` + fresh `refund_id` |
| Saved cards gone | PayU-managed instruments aren't portable; rebuild with Token Vault |

Full per-product error table: `common-mistakes/SKILL.md` §F1 + `pg/apis/references/REFERENCE.md`.

---

## 12. Useful Links

**Cashfree mapping targets:**
- [Create Order](https://www.cashfree.com/docs/api-reference/payments/latest/orders/create-order)
- [Fetch Order](https://www.cashfree.com/docs/api-reference/payments/latest/orders/fetch-order)
- [Refunds](https://www.cashfree.com/docs/api-reference/payments/latest/refunds/create-refund)
- [Pre-Authorization](https://www.cashfree.com/docs/api-reference/payments/latest/preauthorization/preauthorization)
- [Subscriptions](https://www.cashfree.com/docs/api-reference/payments/subs/latest)
- [Webhook payload schemas](https://www.cashfree.com/docs/payments/online/webhooks/payloads)
- [Web checkout (Cashfree.js v3)](https://www.cashfree.com/docs/payments/online/web/checkout)

**PayU source-of-truth (for the existing code):**
- [Authentication / Hashing](https://docs.payu.in/reference/authentication-with-payu-apis)
- [Hashing Request & Response](https://docs.payu.in/docs/hashing-request-and-response)
- [Hosted / Prebuilt Checkout](https://docs.payu.in/docs/prebuilt-checkout-page-integration)
- [Working with the Response](https://docs.payu.in/docs/working-with-response-after-a-customer-checkout)
- [Verify Payment API](https://docs.payu.in/reference/verify_payment_api)
- [Refund Transaction API](https://docs.payu.in/reference/refund_transaction_api)
- [Webhooks](https://docs.payu.in/docs/webhooks)
- [Recurring Payments (SI)](https://docs.payu.in/docs/using-api-integration-recurring-payments)
- [Android CheckoutPro](https://docs.payu.in/docs/integration-steps-android-checkout-pro)
