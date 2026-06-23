---
name: Migrate Juspay to Cashfree — Reference
description: >
  Deep reference for Juspay → Cashfree migration. Endpoint-by-endpoint map, field-level request/response
  diffs, Hypercheckout / Express Checkout handoff translation, per-language backend rewrites, webhook and
  status model changes, refund / mandate / mobile mapping, and orchestrator exit checklist. Read after SKILL.md.
---

# Migrating From Juspay to Cashfree — Reference

This reference is the field-level and endpoint-level source of truth. Sections are independent.

- §1 Endpoint map
- §2 Order / session creation diff
- §3 Checkout handoff and frontend model diff
- §4 Per-language backend rewrites
- §5 Webhook model diff
- §6 Status model translation
- §7 Refund mapping
- §8 Subscriptions / mandates mapping
- §9 Mobile SDK mapping
- §10 Orchestrator feature exit checklist
- §11 Error / diagnostic translation

---

## 1. Endpoint Map

Juspay commonly appears in two shapes during migration:

1. **Hypercheckout / orchestrated flow**: `POST /session` returns `sdk_payload` and hosted links.
2. **Express Checkout / headless flow**: `POST /orders` returns `client_auth_token` for client-side process calls.

Cashfree direct PG flow is centered on `POST /pg/orders` and `payment_session_id`.

| Purpose | Juspay | Cashfree |
|---|---|---|
| Create order for client-side checkout | `POST /orders` | `POST /pg/orders` |
| Create order + Hypercheckout payload | `POST /session` | `POST /pg/orders` |
| Fetch order status | `GET /orders/{order_id}` | `GET /pg/orders/{order_id}` |
| Fetch payments / attempts | Order status response includes txn details; separate processor detail depends on flow | `GET /pg/orders/{order_id}/payments` |
| Fetch one payment attempt | No common direct equivalent in the orchestrator abstraction | `GET /pg/orders/{order_id}/payments/{cf_payment_id}` |
| Initiate refund | `POST /orders/{order_id}/refunds` | `POST /pg/orders/{order_id}/refunds` |
| Fetch refund state | Refund block in order status / refund webhooks | `GET /pg/orders/{order_id}/refunds` and `GET /pg/orders/{order_id}/refunds/{refund_id}` |
| Hosted shareable payment URL | `payment_links` in session response | Use Cashfree PG checkout for app/web flows, or `POST /pg/links` for Payment Links |
| Mandate / subscription registration | Juspay mandate create / order APIs | `POST /pg/subscriptions` and related subscription APIs |

Auth differences:

| | Juspay | Cashfree |
|---|---|---|
| Server auth | Basic Auth (`base64(api_key:)`) | `x-client-id` + `x-client-secret` |
| Required extra headers | `x-merchantid`, `x-routing-id` | `x-api-version: 2025-01-01` |
| Browser-callable payment submission endpoint | Client SDK uses `client_auth_token` / `sdk_payload` | `POST /orders/sessions` can be called from the browser; most merchants use Cashfree.js / mobile SDK instead |

Cashfree overview: https://www.cashfree.com/docs/api-reference/payments/latest/overview  
Juspay Hypercheckout overview: https://docs.juspay.io/hyper-checkout/overview

---

## 2. Order / Session Creation — Field Diff

### 2.1 Juspay `POST /session` or `POST /orders`

Common Juspay request fields:

```json
{
    "order_id": "order_123",
    "amount": "100.00",
    "customer_id": "cust_42",
    "customer_email": "c@example.com",
    "customer_phone": "9999999999",
    "return_url": "https://app.example.com/return/order_123",
    "udf1": "segment_a",
    "metadata": {
        "PAYTM": {
            "PROMO_CAMP_ID": "SALE123"
        }
    },
    "options": {
        "get_client_auth_token": true
    }
}
```

Common Juspay response shapes:

```json
{
    "order_id": "order_123",
    "status": "NEW",
    "client_auth_token": "...",
    "sdk_payload": { "...": "..." },
    "payment_links": {
        "web": "https://api.juspay.in/merchant/pay/..."
    }
}
```

### 2.2 Cashfree `POST /pg/orders`

```json
{
    "order_id": "order_123",
    "order_amount": 100.00,
    "order_currency": "INR",
    "customer_details": {
        "customer_id": "cust_42",
        "customer_email": "c@example.com",
        "customer_phone": "9999999999",
        "customer_name": "Jane Doe"
    },
    "order_meta": {
        "return_url": "https://app.example.com/return/order_123",
        "notify_url": "https://app.example.com/webhook"
    },
    "order_note": "optional",
    "order_tags": {
        "segment": "a"
    }
}
```

Response:

```json
{
    "cf_order_id": "2149460581",
    "order_id": "order_123",
    "order_status": "ACTIVE",
    "payment_session_id": "session_...",
    "order_amount": 100.00
}
```

### 2.3 Field Map

| Juspay field / concept | Cashfree equivalent | Notes |
|---|---|---|
| `order_id` | `order_id` | Both are merchant-supplied ids |
| `amount` | `order_amount` | Both accept decimal-style amounts; Cashfree is numeric in docs |
| `customer_id` | `customer_details.customer_id` | Cashfree requires `customer_details`; use dummy values if necessary |
| `customer_email` | `customer_details.customer_email` | Same intent |
| `customer_phone` | `customer_details.customer_phone` | Same intent |
| `return_url` | `order_meta.return_url` | Same operational use |
| `udf1` ... `udf10` | `order_tags` / `order_note` / internal DB | No fixed UDF slots in Cashfree |
| `metadata.<gateway>` | No generic equivalent | Translate only if Cashfree has a native feature; otherwise delete |
| `options.get_client_auth_token` | None | Cashfree always returns `payment_session_id` on create order |
| `client_auth_token` | `payment_session_id` | Different client SDKs consume these |
| `sdk_payload` | `payment_session_id` | `sdk_payload` is Juspay-specific |
| `payment_links.web` | `cashfree.checkout()` or `POST /pg/links` | Use Payment Links only if you need a shareable URL |
| `x-routing-id` | Internal correlation only | Keep it in your app logs if useful; it is not a Cashfree API header |

### 2.4 Response / Status Differences

| Juspay | Cashfree |
|---|---|
| `status: "NEW"` right after create | `order_status: "ACTIVE"` right after create |
| `client_auth_token` may be returned only when requested | `payment_session_id` is part of create-order response |
| `payment_links` can be used to open hosted checkout directly | Cashfree standard flow expects SDK / app integration using `payment_session_id` |

---

## 3. Checkout Handoff and Frontend Model Diff

### 3.1 Mental model change

| Juspay | Cashfree |
|---|---|
| Server generates a **process payload** (`sdk_payload`) or client auth token and the platform SDK runs `process(...)` calls | Server creates a Cashfree order and returns a **payment session id** |
| Hypercheckout / Express Checkout may expose payment method discovery, saved cards, app invoke, and routing behind one SDK | Cashfree splits concerns across Web SDK, Mobile SDKs, Token Vault, Payment Links, and Subscriptions |
| Some merchants directly use `payment_links.web` | Cashfree PG checkout is opened with `cashfree.checkout({ paymentSessionId })` |

### 3.2 Web mapping

| Juspay | Cashfree |
|---|---|
| `sdk_payload` -> Hypercheckout `process(...)` | `payment_session_id` -> `cashfree.checkout(...)` |
| `client_auth_token` passed inside process payloads | No equivalent; session id alone is used |
| `payment_links.web` | `cashfree.checkout({ redirectTarget: "_self" })` or Payment Links product |
| Hypercheckout callback / return | Cashfree promise result / return URL |
| Mandatory backend status check after callback | Same requirement: fetch order on backend |

Cashfree web checkout docs: https://www.cashfree.com/docs/payments/online/web/redirect

### 3.3 Saved payment methods

Juspay often centralizes saved cards / wallets across processors. Cashfree does not inherit that state. If the legacy project depends on saved cards, read:

- `pg/token-vault/SKILL.md`
- `pg/token-vault/references/REFERENCE.md`

Do **not** promise card migration unless there is an explicit processor-approved path. Default assumption: saved instruments are not portable.

---

## 4. Per-Language Backend Rewrites

### 4.1 Node.js / TypeScript

**Juspay create order / session:**

```javascript
const auth = "Basic " + Buffer.from(`${process.env.JUSPAY_API_KEY}:`).toString("base64");

await fetch("https://sandbox.juspay.in/session", {
    method: "POST",
    headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        "x-merchantid": process.env.JUSPAY_MERCHANT_ID,
        "x-routing-id": customerId || orderId,
    },
    body: JSON.stringify({
        order_id: orderId,
        amount: amountRupees.toFixed(2),
        customer_id: customerId || "",
        customer_email: email,
        customer_phone: phone,
    }),
});
```

**Cashfree create order:**

```javascript
import { Cashfree, CFEnvironment } from "cashfree-pg";

const cashfree = new Cashfree(
    process.env.CASHFREE_ENV === "PRODUCTION"
        ? CFEnvironment.PRODUCTION
        : CFEnvironment.SANDBOX,
    process.env.CASHFREE_APP_ID,
    process.env.CASHFREE_SECRET_KEY,
);

await cashfree.PGCreateOrder({
    order_id: orderId,
    order_amount: amountRupees,
    order_currency: "INR",
    customer_details: {
        customer_id: customerId || `guest_${orderId}`,
        customer_phone: phone || "9999999999",
        customer_email: email,
    },
});
```

**Juspay verify status:**

```javascript
await fetch(`https://sandbox.juspay.in/orders/${orderId}`, {
    headers: {
        Authorization: auth,
        "x-merchantid": process.env.JUSPAY_MERCHANT_ID,
        "x-routing-id": customerId || orderId,
    },
});
```

**Cashfree verify status:**

```javascript
const order = await cashfree.PGFetchOrder(orderId);
if (order.data.order_status === "PAID") {
    fulfill(orderId);
}
```

### 4.2 Python

| Juspay | Cashfree |
|---|---|
| `requests.post("https://sandbox.juspay.in/session", headers={"Authorization": "Basic ...", "x-merchantid": ..., "x-routing-id": ...}, json=...)` | `cf = Cashfree(XEnvironment=Cashfree.SANDBOX, XClientId=..., XClientSecret=...); cf.PGCreateOrder(CreateOrderRequest(...), None, None)` (SDK v6+) |
| `requests.get(f".../orders/{order_id}")` and check `status == "CHARGED"` | `cf.PGFetchOrder(order_id, None, None)` and check `order_status == "PAID"` |
| Refund body uses `unique_request_id` | Refund body uses `refund_id` |

### 4.3 Java

| Juspay | Cashfree |
|---|---|
| `HttpClient` / `OkHttp` with Basic Auth + `x-merchantid` + `x-routing-id` | `Cashfree.XClientId = appId; Cashfree.XClientSecret = secret; Cashfree.XEnvironment = Cashfree.SANDBOX; Cashfree cf = new Cashfree();` |
| `/session` or `/orders` | `cf.PGCreateOrder("2025-01-01", createOrderRequest)` |
| `GET /orders/{id}` and compare `"CHARGED"` | `cf.PGFetchOrder("2025-01-01", orderId)` and compare `"PAID"` |
| Custom webhook Basic Auth validation | HMAC verification using raw body + timestamp |

### 4.4 Go (SDK v6+)

| Juspay | Cashfree |
|---|---|
| `http.NewRequest` with Basic Auth and Juspay headers | `cashfree := cashfreepg.Cashfree{XEnvironment: cashfreepg.SANDBOX, XClientID: &appId, XClientSecret: &secret}` |
| `/orders/{order_id}/refunds` with `unique_request_id` | `cashfree.PGOrderCreateRefund(orderId, &orderCreateRefundRequest, nil, nil, nil)` with `refund_id` |
| `status == "CHARGED"` | `order_status == "PAID"` |

---

## 5. Webhook Model Diff

### 5.1 Authentication / Verification

| Aspect | Juspay | Cashfree |
|---|---|---|
| Default webhook auth | Dashboard-configured username/password sent as Basic Auth | Signed payload |
| Extra auth | Optional custom headers | Optional IP whitelisting + required signature verification |
| Body requirement | JSON POST body | Raw request body required for signature verification |
| Verification input | Authorization header / custom headers | `x-webhook-timestamp + rawBody` |
| Digest encoding | N/A | Base64 |

Juspay webhook configuration docs: https://docs.juspay.io/express-checkout-sdk-global/react-native/base-sdk-integration/1-webhooks  
Cashfree signature verification docs: https://www.cashfree.com/docs/payments/online/webhooks/signature-verification

### 5.2 Event Map

| Juspay event | Cashfree event | Notes |
|---|---|---|
| `ORDER_SUCCEEDED` | `PAYMENT_SUCCESS_WEBHOOK` | Success / fulfilment signal |
| `ORDER_FAILED` | `PAYMENT_FAILED_WEBHOOK` or `PAYMENT_USER_DROPPED_WEBHOOK` | Split into explicit failure vs user-abandonment in Cashfree |
| `TXN_CREATED` | No fulfilment equivalent | Use only if you track attempts |
| `ORDER_REFUNDED` | `REFUND_STATUS_WEBHOOK` with `refund_status = SUCCESS` | |
| `ORDER_REFUND_FAILED` | `REFUND_STATUS_WEBHOOK` with `refund_status = FAILED` | |
| `REFUND_MANUAL_REVIEW_NEEDED` | No direct 1:1 | Handle operationally |
| `MANDATE_CREATED`, `MANDATE_ACTIVATED`, `MANDATE_FAILED` | Cashfree subscription webhook family | See §8 |

### 5.3 Payload Shape

Juspay webhooks are event-name driven and usually reflect order / refund state in a relatively flat shape. Cashfree payment webhooks use a structured envelope:

```json
{
    "type": "PAYMENT_SUCCESS_WEBHOOK",
    "event_time": "2026-04-19T10:00:00+05:30",
    "data": {
        "order": {
            "order_id": "order_123",
            "order_amount": 100.00
        },
        "payment": {
            "cf_payment_id": "123456",
            "payment_status": "SUCCESS",
            "payment_amount": 100.00
        }
    }
}
```

Field lookup map:

| What you want | Juspay | Cashfree |
|---|---|---|
| Event name | `event_name` | `type` |
| Order id | `order_id` | `data.order.order_id` |
| Status | `status` | `data.payment.payment_status` or `data.refund.refund_status` |
| Payment id | `txn_id` / `txn_uuid` | `data.payment.cf_payment_id` |
| Refund id | `unique_request_id` / refund block `id` | `data.refund.refund_id` |
| Bank / processor ref | gateway-specific fields such as `rrn`, `epg_txn_id` | `bank_reference`, gateway details in payment object |

---

## 6. Status Model Translation

### 6.1 Order / payment state map

| Juspay status | Meaning | Cashfree equivalent |
|---|---|---|
| `NEW` | Order created, transaction not started | `order_status = ACTIVE`, payment `NOT_ATTEMPTED` |
| `STARTED` | Pending initiation / route issue | `order_status = ACTIVE`, payment `PENDING` or `NOT_ATTEMPTED` |
| `PENDING_VBV` | Authentication in progress | `order_status = ACTIVE`, payment `PENDING` |
| `AUTHORIZING` | Waiting on bank / processor | `order_status = ACTIVE`, payment `PENDING` |
| `CHARGED` | Success | `order_status = PAID`, payment `SUCCESS` |
| `AUTHORIZED` | Pre-auth success awaiting capture | Cashfree authorization object / capture-flow inspection |
| `AUTHENTICATION_FAILED` | Customer auth failed | payment `FAILED` |
| `AUTHORIZATION_FAILED` | Bank / issuer rejected | payment `FAILED` |
| `JUSPAY_DECLINED` | Juspay / processor-level decline | payment `FAILED` |
| `AUTO_REFUNDED` | Late / conflicted success got auto-refunded | model explicitly using refund + cancelled / reversed business outcome |

### 6.2 Refund states

| Juspay | Cashfree |
|---|---|
| `PENDING` | `PENDING` |
| `SUCCESS` | `SUCCESS` |
| `FAILURE` | `FAILED` |
| `MANUAL_REVIEW` | No direct enum; requires merchant ops review |

### 6.3 Fulfilment rule

**Do not replace `CHARGED` with `SUCCESS` blindly.**

Correct Cashfree fulfilment rule:

1. Fetch order.
2. Fulfil only if `order_status == "PAID"`.
3. If needed, inspect payments list for the terminal attempt and log `payment_status`, `cf_payment_id`, and `bank_reference`.

---

## 7. Refund Mapping

### 7.1 Request model

| Juspay | Cashfree |
|---|---|
| Endpoint: `POST /orders/{order_id}/refunds` | Endpoint: `POST /pg/orders/{order_id}/refunds` |
| Unique id: `unique_request_id` | Unique id: `refund_id` |
| Amount field: `amount` | Amount field: `refund_amount` |
| Note / description: `metaData.description` | `refund_note` |
| Refund speed: `refund_type` / platform support | `refund_speed` (`STANDARD`, `INSTANT`) |

Juspay explicitly requires `unique_request_id` uniqueness to avoid duplicate refunds. Cashfree also requires merchant-generated uniqueness via `refund_id`, and raw REST calls additionally support `x-idempotency-key`.

### 7.2 Operational differences

| Juspay | Cashfree |
|---|---|
| Refunds are queued before being sent to the processor; initial state is always `PENDING` | Refunds are async and updated via refund APIs + refund webhooks |
| Manual review has its own webhook event | No direct `MANUAL_REVIEW` event in standard PG refund webhooks |
| Auto-refund conflict features can exist in Juspay dashboard | Cashfree late-success / cancel / refund handling follows Cashfree payment lifecycle, not Juspay conflict toggles |

Cashfree refund docs: https://www.cashfree.com/docs/api-reference/payments/latest/refunds/create

---

## 8. Subscriptions / Mandates Mapping

Juspay mandate and recurring flows are part of its broader checkout abstraction. Cashfree separates subscriptions more explicitly.

| Concept | Juspay | Cashfree |
|---|---|---|
| Recurring setup primitive | Mandate registration / mandate order | Subscription + authorization |
| Activation signal | `MANDATE_ACTIVATED` | Subscription / authorization success webhooks |
| Charge success | Order status `CHARGED` + webhook `ORDER_SUCCEEDED` | `SUBSCRIPTION_PAYMENT_SUCCESS` |
| Charge failure | `ORDER_FAILED` with mandate context | `SUBSCRIPTION_PAYMENT_FAILED` |
| Status model | `CREATED`, `ACTIVE`, `FAILURE` for mandate; order carries txn status | `INITIALIZED`, `BANK_APPROVAL_PENDING`, `ACTIVE`, `ON_HOLD`, `PAUSED`, `COMPLETED`, `CANCELLED`, etc. |

Cashfree subscription states and webhooks:

- Overview: https://www.cashfree.com/docs/payments/subscription/introduction
- Create / authorize: https://www.cashfree.com/docs/payments/subscription/create
- Webhooks: https://www.cashfree.com/docs/payments/subscription/webhooks

If the merchant uses Juspay mandates today, read `subscriptions/SKILL.md` before estimating migration effort. This is not a trivial search-and-replace.

---

## 9. Mobile SDK Mapping

Juspay's strongest differentiator is its unified cross-platform Hyper SDK. Cashfree supports mobile, but the integration model changes.

### 9.1 React Native

| Juspay | Cashfree |
|---|---|
| Hypercheckout / Express Checkout SDK with `process(...)` payloads | `react-native-cashfree-pg-sdk` |
| Backend returns `sdk_payload` / `client_auth_token` | Backend returns `payment_session_id` |
| Callback then backend `GET /orders/{order_id}` | Callback / return then backend `PGFetchOrder(orderId)` |

### 9.2 Android / iOS / Flutter

| Juspay | Cashfree |
|---|---|
| Hyper SDK init + process payload lifecycle | Cashfree SDK session object + checkout payment object |
| Unified orchestration SDK | Provider-specific direct PG SDK |
| Saved methods / routing may be dashboard-driven in Juspay | Saved cards need Token Vault; routing is no longer abstracted |

Cashfree mobile docs:

- Android: https://www.cashfree.com/docs/payments/online/mobile/android
- React Native: https://www.cashfree.com/docs/docs/react-native-integration
- Flutter: https://www.cashfree.com/docs/payments/online/mobile/flutter

---

## 10. Orchestrator Feature Exit Checklist

This is the part migrations underestimate. Cashfree can replace payment processing; it does not automatically replace Juspay's orchestration layer.

Audit these explicitly:

1. **Gateway routing / failover**
   If the merchant relied on Juspay routing across multiple PGs, decide whether that behaviour is being intentionally dropped.
2. **Processor-specific metadata**
   Remove `metadata.<gateway>` customizations unless there is a Cashfree-native feature.
3. **Hosted links**
   If teams or ops users send Juspay `payment_links.web`, move that workflow to Cashfree Payment Links.
4. **Saved cards**
   Rebuild using Cashfree Token Vault going forward.
5. **Analytics / dashboards**
   Replace any operational dashboards or alerts that read Juspay statuses directly.
6. **Conflict / auto-refund automations**
   Re-review late-success and refund handling in the new state machine.
7. **Order id assumptions**
   Keep merchant order ids stable if downstream OMS / ERP / reconciliation tooling depends on them.

---

## 11. Error / Diagnostic Translation

Juspay failures are often expressed as order states or gateway-response fields in the order status / webhook payload. Cashfree separates API errors from payment attempt statuses.

### 11.1 API / integration failures

| Juspay symptom | Cashfree analog |
|---|---|
| Auth/header failure due to missing `x-merchantid` / bad Basic Auth | `401 authentication_error` |
| Invalid input / missing mandatory params | `400 invalid_request_error` |
| Downstream processor ambiguity reflected in status transitions | payment `PENDING`, `FAILED`, or operational review depending event |

### 11.2 Payment failures

| Juspay | Cashfree |
|---|---|
| `AUTHENTICATION_FAILED` | `FAILED` with auth-related error details |
| `AUTHORIZATION_FAILED` | `FAILED` with bank / issuer error |
| `JUSPAY_DECLINED` | `FAILED` |
| User abandons before completion | `USER_DROPPED` |

### 11.3 Migration-specific red flags

| Symptom | Root cause |
|---|---|
| Team still looking for `sdk_payload` in API responses | Frontend handoff not rewritten |
| Webhooks now fail at firewall / proxy | Old Juspay webhook auth model was retained |
| PM says "success rate fell after migration" | Orchestrator routing / fallback was silently removed |
| Refunds double-trigger after retries | `refund_id` / idempotency strategy not redesigned |

---

## 12. Useful Links

**Cashfree**

- Create Order: https://www.cashfree.com/docs/api-reference/payments/latest/orders/create
- Get Order: https://www.cashfree.com/docs/api-reference/payments/latest/orders/get
- Get Payments for an Order: https://www.cashfree.com/docs/api-reference/payments/latest/payments/get-payments-for-order
- Refunds: https://www.cashfree.com/docs/api-reference/payments/latest/refunds/create
- Enums: https://www.cashfree.com/docs/api-reference/payments/enums
- Web checkout: https://www.cashfree.com/docs/payments/online/web/redirect
- Webhooks: https://www.cashfree.com/docs/payments/webhooks
- Subscription overview: https://www.cashfree.com/docs/payments/subscription/introduction

**Juspay**

- Hypercheckout overview: https://docs.juspay.io/hyper-checkout/overview
- Session API: https://docs.juspay.io/hyper-checkout/web/base-sdk-integration/session
- Create Order API: https://docs.juspay.io/api-reference/docs/express-checkout/create-order-api
- Order Status API: https://docs.juspay.io/api-reference/docs/express-checkout/order-status-api
- Refund Order API: https://docs.juspay.io/hyper-checkout/capacitor/base-sdk-integration/refund-order-api
- Webhooks: https://docs.juspay.io/express-checkout-sdk-global/react-native/base-sdk-integration/1-webhooks
