---
name: Cashfree Payment Gateway - Backend SDK Reference
description: >
  Reference material for the Backend SDK skill. Read this when you need:
  the complete SDK method map, refunds, settlements, payment links, pre-authorization,
  token vault (saved instruments), S2S payment (PGPayOrder), or error handling patterns.
  Always read backend-sdks/SKILL.md first for installation and core flow.
---

# Cashfree Payment Gateway — Backend SDK Reference

> This document is in `references/` — file name `REFERENCE.md`. Read `../SKILL.md` first for installation, initialization, and core workflow.

---

## 1. Complete SDK Method Map

| SDK Method | HTTP Endpoint | Description |
|---|---|---|
| `PGCreateOrder` | `POST /orders` | Create a new order |
| `PGFetchOrder` | `GET /orders/{order_id}` | Get order details/status |
| `PGTerminateOrder` | `PATCH /orders/{order_id}` | Terminate an active order |
| `PGPayOrder` | `POST /orders/sessions` | S2S payment (no frontend) |
| `PGAuthorizeOrder` | `POST /orders/{order_id}/authorization` | Capture/void preauth |
| `PGOrderFetchPayments` | `GET /orders/{order_id}/payments` | Get all payments for order |
| `PGOrderFetchPayment` | `GET /orders/{order_id}/payments/{id}` | Get specific payment |
| `PGOrderCreateRefund` | `POST /orders/{order_id}/refunds` | Create refund |
| `PGOrderFetchRefund` | `GET /orders/{order_id}/refunds/{id}` | Get specific refund |
| `PGOrderFetchRefunds` | `GET /orders/{order_id}/refunds` | Get all refunds for order |
| `PGOrderFetchSettlement` | `GET /orders/{order_id}/settlements` | Get settlements for order |
| `PGFetchSettlements` | `GET /settlements` | Get all settlements |
| `PGCreateLink` | `POST /links` | Create payment link |
| `PGFetchLink` | `GET /links/{link_id}` | Fetch payment link |
| `PGCancelLink` | `POST /links/{link_id}/cancel` | Cancel payment link |
| `PGCustomerFetchInstruments` | `GET /customers/{id}/instruments` | Get saved instruments |
| `PGVerifyWebhookSignature` | — | Verify webhook signature |

---

## 2. Refunds

**Prerequisites:** Order must have `order_status: "PAID"`. Refunds must be initiated within 6 months of the original transaction.

**Request fields:**

| Field | Required | Description |
|---|---|---|
| `refund_amount` | Yes | Amount to refund |
| `refund_id` | Yes | Unique refund identifier |
| `refund_note` | No | Reason for refund |
| `refund_speed` | No | `"STANDARD"` or `"INSTANT"` |

<details>
<summary>Node.js</summary>

```javascript
async function createRefund(orderId, refundAmount, refundId) {
  const request = {
    refund_amount: refundAmount,
    refund_id: refundId,
    refund_note: "Customer requested refund",
    refund_speed: "STANDARD"
  };
  const response = await cashfree.PGOrderCreateRefund(orderId, request);
  return response.data;
}
```
</details>

<details>
<summary>Python (v6+)</summary>

```python
from cashfree_pg.models.order_create_refund_request import OrderCreateRefundRequest

def create_refund(order_id, refund_amount, refund_id):
    request = OrderCreateRefundRequest(
        refund_amount=refund_amount,
        refund_id=refund_id,
        refund_note="Customer requested refund",
        refund_speed="STANDARD",
    )
    response = cashfree.PGOrderCreateRefund(order_id, request, None, None)
    return response.data
```
</details>

<details>
<summary>Java</summary>

```java
public RefundEntity createRefund(String orderId, double amount, String refundId) throws Exception {
    OrderCreateRefundRequest request = new OrderCreateRefundRequest();
    request.setRefundAmount(amount);
    request.setRefundId(refundId);
    request.setRefundNote("Customer requested refund");
    request.setRefundSpeed("STANDARD");

    Cashfree cashfree = new Cashfree(Cashfree.SANDBOX, "<app_id>", "<secret_key>", null, null, null);
    var response = cashfree.PGOrderCreateRefund(orderId, request, null, null, null);
    return response.getData();
}
```
</details>

<details>
<summary>Go (v6+)</summary>

```go
func createRefund(orderId string, amount float64, refundId string) (*cashfreepg.RefundEntity, error) {
    note := "Customer requested refund"
    speed := "STANDARD"
    request := cashfreepg.OrderCreateRefundRequest{
        RefundAmount: amount,
        RefundId:     refundId,
        RefundNote:   &note,
        RefundSpeed:  &speed,
    }
    response, _, err := cashfree.PGOrderCreateRefund(orderId, &request, nil, nil, nil)
    return response, err
}
```
</details>

**Check refund status** — call `PGOrderFetchRefund`:

| Status | Description |
|---|---|
| `SUCCESS` | Processed successfully |
| `PENDING` | Being processed |
| `CANCELLED` | Cancelled |
| `ONHOLD` | On hold |

Listen for `REFUND_STATUS_WEBHOOK` for async updates.

---

## 3. Fetch Payment Details

**Get all payments for an order** (`PGOrderFetchPayments`):

```javascript
// Node.js
const response = await cashfree.PGOrderFetchPayments(orderId);
// response.data → array of payment objects
```

```python
# Python (v6+)
response = cashfree.PGOrderFetchPayments(order_id, None, None)
```

**Get a specific payment** (`PGOrderFetchPayment`):

```javascript
const response = await cashfree.PGOrderFetchPayment(orderId, cfPaymentId);
```

**Payment status values:**

| Status | Description |
|---|---|
| `SUCCESS` | Payment completed |
| `FAILED` | Payment failed |
| `PENDING` | Awaiting confirmation |
| `NOT_ATTEMPTED` | No attempt made |
| `USER_DROPPED` | User abandoned payment |

---

## 4. Terminate an Order

Cancel an active order so no further payments can be made.

```javascript
// Node.js
const response = await cashfree.PGTerminateOrder(orderId, { order_status: "TERMINATED" });
```

---

## 5. Pre-Authorization (Hold & Capture)

**Prerequisite:** Pre-auth must be enabled for your account.

**Capture:**

```javascript
// Node.js
const response = await cashfree.PGAuthorizeOrder(orderId, { action: "CAPTURE", amount: 100.00 });
```

**Void:**

```javascript
const response = await cashfree.PGAuthorizeOrder(orderId, { action: "VOID" });
```

---

## 6. S2S Payment (PGPayOrder)

Use when your backend collects payment details directly — no frontend checkout UI.

**Prerequisites:** S2S flag enabled. For plain card: PCI DSS compliance flag.

> `PGPayOrder` does NOT use `x-client-id`/`x-client-secret` — authenticates via `payment_session_id`.

```javascript
// Node.js — example with UPI collect
async function orderPay(paymentSessionId) {
  const request = {
    payment_session_id: paymentSessionId,
    payment_method: {
      upi: { channel: "collect", upi_id: "user@upi" }
      // Card: { card: { channel: "link", card_number: "4111...", card_expiry_mm: "12", card_expiry_yy: "25", card_cvv: "123" } }
    }
  };
  const response = await cashfree.PGPayOrder(request);
  return response.data;
}
```

For full payment method details (Card, UPI, Netbanking, Wallet, EMI, Paylater) — see the S2S REST API skill.

---

## 7. Payment Links

Generate shareable payment URLs without building a full checkout.

**Create:**

```javascript
// Node.js
async function createPaymentLink() {
  const request = {
    link_id: "link_" + Date.now(),
    link_amount: 100.00,
    link_currency: "INR",
    link_purpose: "Payment for order",
    customer_details: { customer_phone: "9999999999" }
  };
  const response = await cashfree.PGCreateLink(request);
  // response.data.link_url → share this URL
  return response.data;
}
```

**Fetch:** `PGFetchLink(version, link_id)`

**Cancel:** `PGCancelLink(version, link_id)`

---

## 8. Settlements

**Settlements for a specific order:**

```javascript
const response = await cashfree.PGOrderFetchSettlement(orderId);
```

**All settlements (by ID, UTR, or date range):**

```javascript
const response = await cashfree.PGFetchSettlements(params);
```

---

## 9. Token Vault (Saved Instruments)

**Fetch all saved cards for a customer:**

```javascript
const response = await cashfree.PGCustomerFetchInstruments(customerId, "card");
// response.data → array of instrument objects with instrument_id
```

**Fetch a specific instrument:** `PGCustomerFetchInstrument(version, customerId, instrumentId)`

**Delete an instrument:** `PGCustomerDeleteInstrument(version, customerId, instrumentId)`

**Fetch cryptogram** (for external token transactions): `PGCustomerInstrumentsFetchCryptogram(version, customerId, instrumentId)`

To pay with a saved card, use `instrument_id` in `PGPayOrder` instead of card details (CVV optional).

---

## 10. API Idempotency via SDK

Cashfree SDKs expose a per-call parameter (usually the last optional arg) for sending the `x-idempotency-key` header. Use it on every write call you want to make retry-safe — Create Order, Create Refund, Authorization, Terminate Order.

**Why:** A network timeout between your app and Cashfree is indistinguishable from a failure. Without an idempotency key, a retry creates a duplicate resource. With one, Cashfree replays the original response and surfaces `x-idempotency-replayed: true`.

### Node.js

```javascript
// cashfree-pg v6+ — instance method, no API version arg
const idempotencyKey = `order:${orderId}:v1`;

const response = await cashfree.PGCreateOrder(
    orderPayload,
    null,                         // x-request-id (optional)
    idempotencyKey,               // x-idempotency-key
);
```

### Python (v6+)

```python
response = cashfree.PGCreateOrder(
    request,
    None,                                         # x_request_id
    f"order:{order_id}:v1",                       # x_idempotency_key
)
```

### Java

```java
var response = cashfree.PGCreateOrder(
    "2025-01-01",
    request,
    null,                                  // x-request-id
    "order:" + orderId + ":v1",            // x-idempotency-key
    null                                   // x-signature
);
```

### Go (v6+)

```go
idem := fmt.Sprintf("order:%s:v1", orderId)
response, _, err := cashfree.PGCreateOrder(&req, nil, &idem, nil)
```

### Retry pattern (language-agnostic)

1. Derive the idempotency key **deterministically** from the business operation (`order:<order_id>`, `refund:<refund_id>`, `capture:<order_id>:<nth>`).
2. Persist the key to your DB before issuing the first call — so a crash + retry uses the same key.
3. Cap retries at 3 attempts with exponential backoff on `5xx` + network errors only. Never retry on `4xx` other than `429`.
4. On `x-idempotency-replayed: true`, treat the response as authoritative — no further action.

Full semantics and header behaviour live in `pg/apis/references/REFERENCE.md` §4.

### Common mistakes

| Mistake | Consequence | Fix |
|---|---|---|
| Random UUID per attempt | Each retry = new resource | Derive key from the business operation; persist before first call |
| Reusing key with a different body | `422 idempotency_error` | Lock the body together with the key in durable storage |
| Retrying on `4xx` (other than `429`) | Burns requests; no replay benefit | Only retry on `5xx` + network errors |
| Not scoping keys per environment | Sandbox/prod collisions in your own store | Namespace by `${env}:${operation}:${id}` |

---

## 11. Common Mistakes & Error Handling

### Common mistakes

| Mistake | Consequence | Fix |
|---|---|---|
| Hardcoding `x-client-secret` | Secret in version control | Use environment variables |
| Using parsed JSON for webhook verification | Signature mismatch (`170.00` → `170`) | Use raw request body |
| Not wrapping SDK calls in try-catch | Unhandled exceptions crash server | Always wrap with try-catch |
| Fulfilling based on frontend callback alone | May fulfill failed/pending payments | Call `PGFetchOrder` to confirm `PAID` |
| Wrong API version string | Unexpected response formats | Use `"2025-01-01"` consistently |
| No webhook idempotency | Duplicate processing | Use `x-idempotency-key` to deduplicate |
| `PGPayOrder` without S2S flag | API rejects request | Request S2S enablement from Cashfree |
| Refund on unpaid order | API error | Only refund when `order_status: "PAID"` |
| Refund after 6 months | API rejects | Refunds within 6 months only |
| .NET Framework using TLS 1.0 (default) | SSL handshake fails — `Could not create SSL/TLS secure channel` | Force TLS 1.2+ at app startup (see below) |

### .NET TLS Version Compatibility

Cashfree requires **TLS 1.2 or higher**. Older .NET Framework versions default to TLS 1.0/1.1 and will fail with:

```
System.Net.WebException: The request was aborted: Could not create SSL/TLS secure channel.
```

**Affected versions:**

| .NET Version | Default TLS | Action needed |
|---|---|---|
| .NET Framework 4.0 and below | SSL 3.0 / TLS 1.0 | Add fix + may need OS patch |
| .NET Framework 4.5 – 4.5.2 | TLS 1.0 | Add fix |
| .NET Framework 4.6 – 4.6.1 | TLS 1.0 / 1.1 | Add fix |
| .NET Framework 4.6.2+ | TLS 1.2 (default) | Usually fine |
| .NET Core / .NET 5+ | TLS 1.2+ (default) | No action needed |

**Fix — add at application startup** (before any HTTP calls):

```csharp
// Program.cs / Global.asax / Startup.cs
using System.Net;

// Force TLS 1.2 and 1.3
ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls13;
```

For ASP.NET Core / .NET 5+, set it in `Program.cs`:

```csharp
// .NET 5+ — usually not needed, but explicit if required
AppContext.SetSwitch("System.Net.Http.SocketsHttpHandler.Http2UnencryptedSupport", false);
ServicePointManager.SecurityProtocol = SecurityProtocolType.Tls12 | SecurityProtocolType.Tls13;
```

For `HttpClient` with `HttpClientHandler`:

```csharp
var handler = new HttpClientHandler
{
    SslProtocols = System.Security.Authentication.SslProtocols.Tls12 | System.Security.Authentication.SslProtocols.Tls13
};
var client = new HttpClient(handler);
```

> **Note:** If you are on .NET Framework 4.0, also ensure your server OS has the TLS 1.2 patch applied (Windows Server 2008 R2 SP1 or later). Check via `regedit` → `HKLM\SYSTEM\CurrentControlSet\Control\SecurityProviders\SCHANNEL\Protocols`.

### Error response format

```json
{
  "message": "Error description",
  "code": "error_code",
  "type": "invalid_request_error | authentication_error | api_error",
  "status": 400
}
```

### Common error codes

| Code | HTTP | Meaning |
|---|---|---|
| `order_id_invalid` | 400 | Invalid order ID format |
| `order_not_found` | 404 | Order does not exist |
| `payment_not_found` | 404 | Payment does not exist |
| `version_missing` | 400 | API version header missing |
| `order_amount_invalid` | 400 | Amount below minimum (`1.00`) or above your MID's configured per-transaction limit (no fixed `1,000,000` cap) |
| `authentication_error` | 401 | Invalid credentials |
| `bank_processing_failure` | 502 | Bank-side failure |

### Error handling pattern

```javascript
// Node.js
try {
  const response = await cashfree.PGCreateOrder(request);
  return response.data;
} catch (error) {
  if (error.response) {
    console.error("Status:", error.response.status);
    console.error("Error:", error.response.data);
  } else {
    console.error("Network error:", error.message);
  }
}
```

```python
# Python (v6+)
try:
    response = cashfree.PGCreateOrder(request, None, None)
    return response.data
except Exception as e:
    print(f"Error: {e}")
```

```java
// Java
try {
    var response = cashfree.PGCreateOrder(request, null, null, null);
    return response.getData();
} catch (ApiException e) {
    System.err.println("Status: " + e.getCode());
    System.err.println("Body: " + e.getResponseBody());
}
```
