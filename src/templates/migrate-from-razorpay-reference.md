---
name: Migrate Razorpay to Cashfree — Reference
description: >
  Deep reference for Razorpay → Cashfree migration. Endpoint-by-endpoint map, field-level request/response
  diffs, Checkout JS option-by-option translation, per-language SDK rewrites, webhook payload shape diffs,
  refund/subscription/mobile/RazorpayX mapping, and error code translations. Read after SKILL.md.
---

# Migrating From Razorpay to Cashfree — Reference

This reference is the source of truth for field-level and endpoint-level differences. Sections are independent; jump to the one you need.

- §1 Endpoint map
- §2 Order creation — field-by-field diff
- §3 Checkout JS — option-by-option diff
- §4 Per-language backend SDK rewrites (Python, Java, Go, PHP, .NET, Ruby)
- §5 Webhook payload shape diff
- §6 Auto-capture vs Pre-Authorization (Razorpay `payment_capture: 0`)
- §7 Subscriptions mapping
- §8 Mobile SDK mapping (`react-native-razorpay`, native Android/iOS, Flutter)
- §9 RazorpayX Payouts → Cashfree Payouts mapping
- §10 Error code translation table

---

## 1. Endpoint Map

Razorpay base: `https://api.razorpay.com/v1/`. Cashfree bases: `https://sandbox.cashfree.com/pg` (test), `https://api.cashfree.com/pg` (prod). All Cashfree calls require headers `x-client-id`, `x-client-secret`, `x-api-version: 2025-01-01`, `Content-Type: application/json`. Razorpay uses HTTP Basic.

| Purpose | Razorpay | Cashfree |
|---|---|---|
| Create order | `POST /v1/orders` | `POST /pg/orders` |
| Fetch order | `GET /v1/orders/{id}` | `GET /pg/orders/{order_id}` |
| List payments on order | `GET /v1/orders/{id}/payments` | `GET /pg/orders/{order_id}/payments` |
| Fetch single payment | `GET /v1/payments/{pay_id}` | `GET /pg/orders/{order_id}/payments/{cf_payment_id}` (note: keyed by **both** order_id AND cf_payment_id) |
| Capture manually | `POST /v1/payments/{pay_id}/capture` | `POST /pg/orders/{order_id}/authorization` (pre-auth flow only — see §6) |
| Refund | `POST /v1/payments/{pay_id}/refund` | `POST /pg/orders/{order_id}/refunds` |
| Fetch refund | `GET /v1/payments/{pay_id}/refunds/{rfnd_id}` or `GET /v1/refunds/{rfnd_id}` | `GET /pg/orders/{order_id}/refunds/{refund_id}` |
| List refunds | `GET /v1/refunds` | `GET /pg/orders/{order_id}/refunds` (scoped to one order) |
| Settlements | `GET /v1/settlements` | `GET /pg/settlements` |
| Payment Links / hosted | `POST /v1/payment_links` | `POST /pg/links` |
| Submit payment (S2S) | *(Razorpay S2S is restricted — most merchants use checkout only)* | `POST /pg/orders/sessions` (authenticated via `payment_session_id`) |
| Create plan (subscriptions) | `POST /v1/plans` | `POST /pg/plans` |
| Create subscription | `POST /v1/subscriptions` | `POST /pg/subscriptions` |

Cashfree API reference: [cashfree.com/docs/api-reference/payments](https://www.cashfree.com/docs/api-reference/payments/latest).

---

## 2. Order Creation — Field Diff

**Razorpay `POST /v1/orders`:**
```json
{
    "amount": 50000,
    "currency": "INR",
    "receipt": "rcpt_0001",
    "partial_payment": false,
    "notes": { "anything": "free-form" }
}
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
    "order_note": "optional",
    "order_tags": { "anything": "free-form" }
}
```

| Razorpay field | Cashfree field | Notes |
|---|---|---|
| `amount` (int, paise) | `order_amount` (decimal, rupees) | **Stop multiplying by 100.** Cashfree max `order_amount` is 1,000,000 |
| `currency` | `order_currency` | Same 3-letter ISO codes |
| `receipt` | `order_id` | Cashfree requires merchant to supply this; use the same unique id used for Razorpay `receipt`. Max ~50 chars, alphanumeric + `-_` |
| `notes` | `order_tags` | Same free-form `string→string` map semantics; Cashfree caps values at small size — keep them short |
| `partial_payment` | *(no direct equivalent)* | For partial payments, use Cashfree's Split/Easy-split — see `payouts/SKILL.md` |
| `payment_capture` | *(auto-captures by default)* | For manual capture, use Pre-Auth flow; see §6 below |
| *(none)* | `customer_details.customer_id` | **Required.** Use merchant's user id |
| *(none)* | `customer_details.customer_phone` | **Required.** 10-digit Indian number (no `+91`) |
| *(none)* | `order_meta.return_url` | Redirect target post-payment. Use `{order_id}` placeholder for Cashfree to substitute |
| *(none)* | `order_meta.notify_url` | Per-order webhook override (optional if set in Dashboard) |
| *(none)* | `order_expiry_time` | ISO-8601. Razorpay has no order-level expiry |

**Response diff:**

| Razorpay response field | Cashfree response field |
|---|---|
| `id` (`order_XXX`) | `order_id` (what you sent) + `cf_order_id` (internal) |
| `status` (`created` / `attempted` / `paid`) | `order_status` (`ACTIVE` / `PAID` / `EXPIRED` / `TERMINATED`) |
| `amount` / `amount_paid` / `amount_due` | `order_amount` + polled payment records (Cashfree doesn't expose `amount_paid` directly — compute from `GET /pg/orders/{id}/payments`) |
| *(none)* | `payment_session_id` — **critical**, pass to client |
| `created_at` (Unix int) | `created_at` (ISO-8601 string) |

---

## 3. Checkout JS — Option-by-Option

**Script URLs:**

| | URL |
|---|---|
| Razorpay | `https://checkout.razorpay.com/v1/checkout.js` |
| Cashfree (v3, web) | `https://sdk.cashfree.com/js/v3/cashfree.js` |
| Cashfree Drop-in (v3) | `https://sdk.cashfree.com/js/v3/cashfree.js` (same bundle; different method call) |

### 3.1 Options Translation

| Razorpay option | Cashfree equivalent | Notes |
|---|---|---|
| `key` | *(nothing)* | Cashfree does not use a client-side API key. All auth is via `payment_session_id` |
| `amount`, `currency`, `order_id` | *(nothing — already in the session)* | Cashfree derives amount/currency/order from the `payment_session_id` — never pass them client-side |
| `name`, `description`, `image` | Configured in Dashboard → Branding & Theme | Dashboard-driven, not per-checkout |
| `handler(response)` | `.checkout(...).then(result => ...)` + backend re-fetch | **Do not trust `result` for fulfillment.** Use `GET /pg/orders/{order_id}` |
| `prefill.name` / `.email` / `.contact` | Passed at order creation via `customer_details` (backend) | Cashfree populates the prefill from the order's customer details, not from a client-side option |
| `notes` | `order_tags` on order creation | Backend-only |
| `theme.color` | Dashboard-configured brand color | Dashboard-driven |
| `modal.ondismiss` | `paymentCallback: { onPaymentCancel }` (Drop-in) or handle `result.error.code === "PAYMENT_CANCELLED"` | — |
| `modal.escape`, `modal.backdropclose` | *(Cashfree modal fixed)* | Not configurable |
| `callback_url` + `redirect: true` | `redirectTarget: "_self"` + `return_url` on the order | Cashfree's equivalent of redirect-mode checkout. `return_url` is set on the **order**, not the JS call |
| `rzp.on("payment.failed", fn)` | Handle error in `.then(result)` — check `result.error` | Cashfree surfaces failure synchronously in the promise resolution |
| `rzp.open()` | `cashfree.checkout({ paymentSessionId, redirectTarget })` | Single call; no separate `open()` |

### 3.2 Drop-in (embedded) vs Elements (custom UI) vs Modal

Razorpay has one primary checkout mode (modal). Cashfree v3 has three:

| Cashfree mode | When to use | Razorpay analog |
|---|---|---|
| `redirectTarget: "_modal"` | Modal popup over your page | Razorpay modal (default) |
| `redirectTarget: "_self"` | Redirects to Cashfree-hosted page, returns to `return_url` | Razorpay `redirect: true` + `callback_url` |
| Drop-in (`cashfree.create("paymentComponent")`) | Embed payment UI inside your own layout | No direct Razorpay analog (closest: Razorpay custom integration) |
| Elements | Fully custom UI with Cashfree handling compliance | Razorpay S2S/custom flow |

See `pg/backend-sdks/references/REFERENCE.md` and [Cashfree web docs](https://www.cashfree.com/docs/payments/online/web/checkout) for Drop-in wiring.

---

## 4. Per-Language Backend SDK Rewrites

### 4.1 Python (Flask / Django)

**Before:**
```python
import razorpay
client = razorpay.Client(auth=(os.environ["RAZORPAY_KEY_ID"], os.environ["RAZORPAY_KEY_SECRET"]))

order = client.order.create({
    "amount": amount_rupees * 100,
    "currency": "INR",
    "receipt": receipt_id,
    "notes": {"customer_id": customer_id},
})

# Verify callback
client.utility.verify_payment_signature({
    "razorpay_order_id": req.form["razorpay_order_id"],
    "razorpay_payment_id": req.form["razorpay_payment_id"],
    "razorpay_signature": req.form["razorpay_signature"],
})

# Refund
client.payment.refund(payment_id, {"amount": refund_rupees * 100})
```

**After:**
```python
from cashfree_pg.api_client import Cashfree
from cashfree_pg.models.create_order_request import CreateOrderRequest
from cashfree_pg.models.customer_details import CustomerDetails
from cashfree_pg.models.order_meta import OrderMeta
from cashfree_pg.models.create_refund_request import CreateRefundRequest

Cashfree.XClientId = os.environ["CASHFREE_APP_ID"]
Cashfree.XClientSecret = os.environ["CASHFREE_SECRET_KEY"]
Cashfree.XEnvironment = Cashfree.XSandbox  # or Cashfree.XProduction
x_api_version = "2025-01-01"
cf = Cashfree()

order = cf.PGCreateOrder(x_api_version, CreateOrderRequest(
    order_id=receipt_id,
    order_amount=amount_rupees,              # rupees
    order_currency="INR",
    customer_details=CustomerDetails(
        customer_id=customer_id,
        customer_phone=customer_phone,        # required
    ),
    order_meta=OrderMeta(
        return_url=f"{APP_URL}/return/{receipt_id}",
        notify_url=f"{APP_URL}/webhook",
    ),
))
payment_session_id = order.data.payment_session_id

# Verify — re-fetch from backend
fetched = cf.PGFetchOrder(x_api_version, receipt_id)
if fetched.data.order_status == "PAID":
    fulfill(receipt_id)

# Refund
cf.PGCreateRefund(x_api_version, receipt_id, CreateRefundRequest(
    refund_id=f"refund_{int(time.time())}",
    refund_amount=refund_rupees,
    refund_note="Customer request",
))
```

### 4.2 Java (Spring Boot)

| Razorpay | Cashfree |
|---|---|
| `new RazorpayClient(keyId, keySecret)` | `Cashfree.XClientId = appId; Cashfree.XClientSecret = secretKey; Cashfree.XEnvironment = Cashfree.SANDBOX; Cashfree cf = new Cashfree();` |
| `razorpay.orders.create(new JSONObject(...))` | `cf.PGCreateOrder("2025-01-01", createOrderRequest)` |
| `razorpay.payments.refund(id, json)` | `cf.PGCreateRefund("2025-01-01", orderId, createRefundRequest)` |
| `Utils.verifyPaymentSignature(attrs, secret)` | **None.** Call `cf.PGFetchOrder` and check `order_status == "PAID"` |
| `Utils.verifyWebhookSignature(body, sig, secret)` | `cf.PGVerifyWebhookSignature(signature, rawBody, timestamp)` |

Amounts: Razorpay Java takes paise `int`; Cashfree Java takes rupees `Double`.

### 4.3 Go

| Razorpay | Cashfree |
|---|---|
| `razorpay.NewClient(keyId, keySecret)` | `cashfree.XClientId = &appId; cashfree.XClientSecret = &secret; cashfree.XEnvironment = cashfree.SANDBOX` |
| `client.Order.Create(data, nil)` | `cashfree.PGCreateOrder(&version, &createOrderRequest, nil, nil, nil)` |
| `client.Payment.Refund(pid, amount, data, nil)` | `cashfree.PGCreateRefund(&version, orderId, &createRefundRequest, nil, nil, nil)` |
| hex HMAC verify | `cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp)` — returns boolean |

### 4.4 PHP

| Razorpay | Cashfree |
|---|---|
| `new Razorpay\Api\Api($keyId, $keySecret)` | `Cashfree::$XClientId = $appId; Cashfree::$XClientSecret = $secret; Cashfree::$XEnvironment = Cashfree::$XSandbox;` |
| `$api->order->create($data)` | `(new Cashfree)->PGCreateOrder("2025-01-01", $createOrderRequest)` |
| `$api->utility->verifyPaymentSignature($attrs)` | `GET /pg/orders/{order_id}` re-fetch (no equivalent utility) |
| `$api->utility->verifyWebhookSignature($body, $sig, $secret)` | `(new Cashfree)->PGVerifyWebhookSignature($signature, $rawBody, $timestamp)` |

### 4.5 .NET (C#)

| Razorpay | Cashfree |
|---|---|
| `new RazorpayClient(keyId, keySecret)` | `Cashfree.XClientId = appId; Cashfree.XClientSecret = secret; Cashfree.XEnvironment = Cashfree.SANDBOX; var cf = new Cashfree();` |
| `client.Order.Create(options)` | `cf.PGCreateOrder("2025-01-01", createOrderRequest)` |
| `Utils.verifyPaymentSignature(attrs, secret)` | Re-fetch via `cf.PGFetchOrder` |

**TLS note:** older .NET Framework clients default to TLS 1.0 — Cashfree requires TLS 1.2. Set `ServicePointManager.SecurityProtocol |= SecurityProtocolType.Tls12;` at startup. See `pg/backend-sdks/references/REFERENCE.md`.

### 4.6 Ruby — No official Cashfree SDK

Cashfree has no official Ruby SDK (Razorpay does). Options:

1. Use the **S2S REST API** directly with Ruby's `Net::HTTP` or `Faraday` — see `pg/apis/SKILL.md`. Build HMAC-SHA256 (base64) with `OpenSSL::HMAC.digest`.
2. Call the Node SDK from a sidecar if the team maintains a polyglot stack.

Ruby HMAC for webhook verification:
```ruby
require "openssl"; require "base64"
expected = Base64.strict_encode64(
  OpenSSL::HMAC.digest("sha256", ENV["CASHFREE_SECRET_KEY"], timestamp + raw_body)
)
Rack::Utils.secure_compare(expected, request.headers["x-webhook-signature"])
```

---

## 5. Webhook Payload Shape Diff

**Razorpay envelope:**
```json
{
    "entity": "event",
    "account_id": "acc_XXX",
    "event": "payment.captured",
    "contains": ["payment"],
    "payload": {
        "payment": { "entity": { "id": "pay_XXX", "amount": 50000, "status": "captured", "order_id": "order_XXX", ... } }
    },
    "created_at": 1700000000
}
```

**Cashfree envelope:**
```json
{
    "type": "PAYMENT_SUCCESS_WEBHOOK",
    "event_time": "2026-04-18T10:00:00+05:30",
    "data": {
        "order": {
            "order_id": "rcpt_0001",
            "order_amount": 500.00,
            "order_currency": "INR",
            "order_tags": { ... }
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
        "payment_gateway_details": { "gateway_name": "...", "gateway_order_id": "...", "gateway_payment_id": "...", "gateway_status_code": null }
    }
}
```

**Field lookup map (common handlers):**

| What you want | Razorpay path | Cashfree path |
|---|---|---|
| Event name | `event` | `type` |
| Top-level timestamp | `created_at` (unix int) | `event_time` (ISO string) |
| Order id (merchant's) | `payload.payment.entity.order_id` / `payload.order.entity.receipt` | `data.order.order_id` |
| Payment id (gateway's) | `payload.payment.entity.id` | `data.payment.cf_payment_id` |
| Amount (paid) | `payload.payment.entity.amount` (paise) | `data.payment.payment_amount` (rupees) |
| Payment status | `payload.payment.entity.status` | `data.payment.payment_status` |
| Method | `payload.payment.entity.method` | `data.payment.payment_group` (+ `data.payment.payment_method`) |
| Customer | `payload.payment.entity.email` / `.contact` | `data.customer_details.customer_email` / `.customer_phone` |
| Failure reason | `payload.payment.entity.error_code` / `.error_description` / `.error_source` | `data.error_details.error_code` / `.error_description` / `.error_reason` / `.error_source` |
| Refund (on refund events) | `payload.refund.entity.*` | `data.refund.*` |

**Header diff:**

| Purpose | Razorpay | Cashfree |
|---|---|---|
| Signature | `X-Razorpay-Signature` | `x-webhook-signature` |
| Timestamp | *(none — hash body only)* | `x-webhook-timestamp` (**required in HMAC input**) |
| Event dedupe id | `x-razorpay-event-id` | `x-idempotency-key` (available on versions ≥ 2025-01-01) |
| Version | *(none)* | `x-webhook-version` |

For every Cashfree event's complete payload, see `pg/webhooks/references/REFERENCE.md`.

---

## 6. Auto-Capture vs Pre-Authorization

Razorpay's legacy `payment_capture: 0` flag delayed capture so merchants could authorize, inspect, then capture. Cashfree's equivalent is **Pre-Authorization**, enabled via `order_meta.payment_methods` configuration and a dedicated capture/void endpoint.

**Enabling pre-auth on order creation:**
```json
{
    "order_id": "...",
    "order_amount": 500.00,
    "order_currency": "INR",
    "customer_details": { ... },
    "order_meta": {
        "payment_methods": "cc,dc"
    },
    "order_splits": [],
    "order_tags": { "preauth": "true" }
}
```
(Pre-auth is account-level: enable it in Dashboard → Settings → Payment Gateway.)

**Capture or void the authorized payment:**
```
POST /pg/orders/{order_id}/authorization
{
    "action": "CAPTURE",   // or "VOID"
    "amount": 500.00       // partial capture supported
}
```

Razorpay → Cashfree pre-auth event mapping:

| Razorpay | Cashfree |
|---|---|
| `payment.authorized` | `PAYMENT_SUCCESS_WEBHOOK` with `payment.payment_status: "SUCCESS"` and order in pre-auth state — inspect via `GET /pg/orders/{id}/payments` |
| `POST /payments/{id}/capture` | `POST /pg/orders/{order_id}/authorization` with `action: "CAPTURE"` |
| Payment void (no explicit Razorpay API — uncaptured auths auto-void after 5 days) | `POST /pg/orders/{order_id}/authorization` with `action: "VOID"` |

More in `pg/backend-sdks/references/REFERENCE.md` (pre-auth section).

---

## 7. Subscriptions Mapping

| Concept | Razorpay | Cashfree |
|---|---|---|
| Pricing template | `Plan` (`POST /v1/plans`) — `period` (`daily`/`weekly`/`monthly`/`yearly`), `interval`, `item.amount` (paise) | `Plan` (`POST /pg/plans`) — `plan_id`, `plan_name`, `plan_type`, `plan_recurring_amount` (rupees), `plan_interval_type`, `plan_intervals`, `plan_max_cycles` |
| Subscription | `POST /v1/subscriptions` (`plan_id`, `total_count`, `customer_notify`) | `POST /pg/subscriptions` (`subscription_id`, `plan_id`, `customer_details`, `authorization_details`) |
| First-charge auth | Customer completes first payment on Razorpay checkout; mandate auto-registered | Customer completes **Authorization** (₹0 or nominal) via `payment_session_id` on the subscription's `authorization_details` |
| Mandate types | UPI AutoPay / eMandate / card token | UPI AutoPay / eMandate / PhysicalMandate / card (token vault) |
| Status values | `created`, `authenticated`, `active`, `pending`, `halted`, `cancelled`, `completed`, `paused`, `expired` | `INITIALIZED`, `BANK_APPROVAL_PENDING`, `ACTIVE`, `ON_HOLD`, `CANCELLED`, `COMPLETED` |
| Recurring charge | Auto per plan schedule (Razorpay debits) | Auto per schedule OR merchant-initiated `POST /pg/subscriptions/{sub_id}/payments` |
| Pause / resume | `POST /v1/subscriptions/{id}/pause` / `/resume` | `PATCH /pg/subscriptions/{sub_id}` with `status: "ON_HOLD"` / `"ACTIVE"` |
| Cancel | `POST /v1/subscriptions/{id}/cancel` | `PATCH /pg/subscriptions/{sub_id}` with `status: "CANCELLED"` |
| Webhook events | `subscription.authenticated` / `.activated` / `.charged` / `.completed` / `.halted` / `.paused` / `.resumed` / `.cancelled` | `SUBSCRIPTION_PAYMENT_SUCCESS` / `SUBSCRIPTION_PAYMENT_FAILED` / `SUBSCRIPTION_STATUS_CHANGED` / `AUTHORIZATION_APPROVED` / `AUTHORIZATION_DECLINED` |

Full Cashfree subscription flow: `subscriptions/SKILL.md` and `subscriptions/references/REFERENCE.md`.

---

## 8. Mobile SDK Mapping

### 8.1 React Native

| Razorpay | Cashfree |
|---|---|
| `npm i react-native-razorpay` | `npm i react-native-cashfree-pg-sdk @cashfreepayments/cashfree-pg-api-contract` |
| `RazorpayCheckout.open(options).then(data => ...)` | `CFPaymentGatewayService.doPayment(dropCheckoutPayment)` + `CFPaymentGatewayService.setCallback({ onVerify, onError })` |
| `options.key = keyId` | Nothing — pass `payment_session_id` in `session` |
| Response `{ razorpay_payment_id, razorpay_order_id, razorpay_signature }` → verify server-side | Callback gives `orderID` → **backend** calls `PGFetchOrder` |

Critical: register `setCallback` BEFORE `doPayment` and remove on unmount. See `pg/mobile-sdks/SKILL.md` + `common-mistakes/SKILL.md` §E1/E8.

### 8.2 Android (native Kotlin/Java)

| Razorpay | Cashfree |
|---|---|
| `implementation 'com.razorpay:checkout:1.6.38'` | `implementation 'com.cashfree.pg:api:2.x.x'` + `implementation 'com.cashfree.pg:payment:2.x.x'` |
| `Checkout.preload(context)` | `CFPaymentGatewayService.getInstance()` |
| `co.open(activity, options)` | `CFPaymentGatewayService.getInstance().doPayment(activity, cfDropCheckoutPayment)` |
| `PaymentResultListener.onPaymentSuccess(paymentId)` | `CFCheckoutResponseCallback.onPaymentVerify(orderId)` |

### 8.3 iOS (Swift/Obj-C)

| Razorpay | Cashfree |
|---|---|
| `pod 'razorpay-pod'` | `pod 'CashfreePG'` |
| `Razorpay.initWithKey(_:andDelegate:)` | `CFPaymentGatewayService.getInstance()` |
| Pass `order_id` + `key` in options | Pass `payment_session_id` in `CFDropCheckoutPayment` |
| `RazorpayPaymentCompletionProtocolWithData` | `CFResponseDelegate` |

**iOS `info.plist`:** add `LSApplicationQueriesSchemes` entries for UPI apps — see `common-mistakes/SKILL.md` §E3.

### 8.4 Flutter

| Razorpay | Cashfree |
|---|---|
| `razorpay_flutter: ^x.y.z` | `flutter_cashfree_pg_sdk: ^x.y.z` |
| `Razorpay()` + `razorpay.on(Razorpay.EVENT_PAYMENT_SUCCESS, handler)` | `CFPaymentGatewayService()` + `cfPaymentGatewayService.setCallback(onVerify, onError)` |
| `razorpay.open(options)` | `cfPaymentGatewayService.doPayment(cfDropCheckoutPayment)` |

### 8.5 Cordova / Capacitor / Ionic

| Razorpay | Cashfree |
|---|---|
| `cordova-plugin-razorpaycheckout` | `cordova-plugin-cashfree-pg` (Cordova) **or** `cordova-plugin-cashfree-pg@capacitor` (Capacitor — use this tag, see `common-mistakes/SKILL.md` §E7) |

Full Cashfree mobile details + `CFSession` vs `CFDropCheckoutPayment` vs `CFPaymentComponentBuilder`: `pg/mobile-sdks/references/REFERENCE.md`.

---

## 9. RazorpayX Payouts → Cashfree Payouts

Razorpay and Cashfree both offer payouts but model them differently.

| Concept | RazorpayX | Cashfree Payouts |
|---|---|---|
| Recipient | `Contact` + `Fund Account` (2-object split) | `Beneficiary` (single object) |
| Create recipient | `POST /v1/contacts` then `POST /v1/fund_accounts` | `POST /payout/beneficiary` |
| Initiate transfer | `POST /v1/payouts` — `fund_account_id`, `amount` (paise), `currency`, `mode` (`IMPS`/`NEFT`/`RTGS`/`UPI`/`card`), `purpose` | `POST /payout/transfers` — `transfer_id`, `transfer_amount` (rupees), `transfer_mode`, `beneficiary_details.beneficiary_id` |
| Auth | Key_id / key_secret (same Razorpay API auth) | V2: `x-client-id` + `x-client-secret` headers (like PG). V1 legacy: RSA-signed token (`POST /payout/v1/authorize`) with 10-min expiry |
| IP whitelisting | Optional | **Required** per account; must be a static IP — see `common-mistakes/SKILL.md` §G1/G2 |
| Transfer status | `pending`, `queued`, `initiated`, `processed`, `reversed`, `rejected`, `failed` | `PENDING`, `APPROVED`, `REJECTED`, `SUCCESS`, `FAILED`, `REVERSED` |
| Webhook events | `payout.processed`, `payout.reversed`, `payout.failed`, etc. | `TRANSFER_SUCCESS`, `TRANSFER_FAILED`, `TRANSFER_REVERSED`, etc. |

Prefer Cashfree Payouts **V2** (`/payout/*`) unless you have a legacy V1 integration. Full mapping + 2FA signature flow: `payouts/SKILL.md` + `payouts/references/REFERENCE.md`.

---

## 10. Error Code Translation

Razorpay errors have a nested `error.code` / `.description` / `.source` / `.step` / `.reason` structure. Cashfree errors use `message` / `code` / `type`.

| Razorpay shape | Cashfree shape |
|---|---|
| `{ "error": { "code": "BAD_REQUEST_ERROR", "description": "...", "source": "customer", "step": "payment_authentication", "reason": "payment_failed" } }` | `{ "message": "...", "code": "...", "type": "invalid_request_error" \| "authentication_error" \| "rate_limit_error" \| "api_error" }` |

**Common cross-gateway mappings:**

| Razorpay code/reason | Cashfree analog |
|---|---|
| `BAD_REQUEST_ERROR` + field-specific reason | `invalid_request_error` (4xx with `code` like `order_amount_invalid`, `customer_id_missing`) |
| `GATEWAY_ERROR` with `source: gateway` | `502 bank_processing_failure` (retry / try another method) |
| `SERVER_ERROR` | `500 internal_server_error` |
| `authentication` failures | `401 authentication_error` |
| Rate-limit (non-standard on Razorpay) | `429 rate_limit_error` |

Payment-level failure mapping (what to show the user):

| Razorpay payment failure reason | Cashfree `payment_status` + `error_details.error_reason` |
|---|---|
| `payment_failed` / `gateway_error` | `FAILED` + `gateway_error` |
| `authentication_failed` | `FAILED` + `authentication_failed` |
| `insufficient_funds` | `FAILED` + `insufficient_funds` |
| User abandoned | `USER_DROPPED` |

Full per-product error table: `common-mistakes/SKILL.md` §F1 (rate limits) + `pg/apis/references/REFERENCE.md` (error codes).

---

## 11. Useful Links

**Cashfree mapping targets:**
- [Create Order](https://www.cashfree.com/docs/api-reference/payments/latest/orders/create-order)
- [Fetch Order](https://www.cashfree.com/docs/api-reference/payments/latest/orders/fetch-order)
- [Pre-Authorization](https://www.cashfree.com/docs/api-reference/payments/latest/preauthorization/preauthorization)
- [Refunds](https://www.cashfree.com/docs/api-reference/payments/latest/refunds/create-refund)
- [Subscriptions](https://www.cashfree.com/docs/api-reference/payments/subs/latest)
- [Payouts](https://www.cashfree.com/docs/api-reference/payouts/latest)
- [Webhook payload schemas](https://www.cashfree.com/docs/payments/online/webhooks/payloads)

**Razorpay source-of-truth (for the existing code):**
- [Orders API](https://razorpay.com/docs/api/orders/)
- [Payments API](https://razorpay.com/docs/api/payments/)
- [Refunds API](https://razorpay.com/docs/api/refunds/)
- [Checkout JS](https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/)
- [Webhooks](https://razorpay.com/docs/webhooks/)
- [Subscriptions](https://razorpay.com/docs/api/payments/subscriptions/)
- [RazorpayX Payouts](https://razorpay.com/docs/x/apis/)
