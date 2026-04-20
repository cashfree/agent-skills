---
name: Cashfree Payment Gateway - Webhook Integration
description: >
  Use when integrating Cashfree Payments webhooks or handling real-time payment events.
  Triggers: integrate Cashfree Payments webhooks, integrate Cashfree with my app webhooks,
  set up Cashfree webhooks, receive payment notifications, payment success event, payment failed event,
  webhook handler, verify webhook signature, HMAC signature verification, webhook payload,
  notify_url, handle payment events, refund webhook, settlement webhook, whitelist Cashfree IPs,
  x-webhook-signature, x-webhook-timestamp, listen for payments, real-time payment updates,
  configure webhook dashboard, debug webhook, test webhook endpoint, webhook not received.
  Always use before writing any custom webhook logic or signature verification code.
---

# Cashfree Payment Gateway — Webhook Integration

> **References available:** This SKILL.md covers webhook setup and signature verification. For all event payload structures (payment success/failed, refund, settlement, token vault), idempotency implementation, retry policy configuration, and troubleshooting — read `references/REFERENCE.md` in this directory.

---

## 1. Scope & Boundaries

### When to use this skill

- The developer needs to **receive, verify, and process real-time event notifications** from Cashfree (payment success/failure, refund status, settlement updates).
- The developer needs guidance on **configuring webhook endpoints** in the Merchant Dashboard.
- The developer needs to **verify webhook signatures** (HMAC-SHA256).
- The developer is **troubleshooting** webhook delivery issues or signature mismatches.

### When NOT to use this skill

- Creating orders, processing payments, initiating refunds → use Backend SDK or S2S REST API skill.
- Frontend checkout setup → use Web Checkout skill.
- Mobile SDK setup → use Mobile SDK skill.
- Payouts, Subscriptions, or Secure ID webhooks → separate products/skills.

### Relationship to other skills

Webhooks are a **cross-cutting concern**. Regardless of which integration method (S2S, Backend SDK, Mobile SDK), developers will likely need this skill to handle async event notifications. Assumes payment integration is already complete.

---

## 2. Core Concepts

### What Webhooks Are

HTTP POST callbacks from Cashfree to your server. When a payment event occurs, Cashfree POSTs a JSON payload to your configured endpoint. Your server must verify the signature, return HTTP 200, and process the event.

### Webhook Flow

```
Customer pays → Cashfree processes → Cashfree sends webhook to your server
                                   → Customer redirected to return_url
                                   → Your backend verifies via GET /orders/{order_id}
```

Webhooks provide real-time notification. Always also verify via `GET /orders/{order_id}` for authoritative confirmation.

### Webhook Versions

| Version | Notes |
|---|---|
| `2025-01-01` | **Recommended.** Includes `x-idempotency-key` for deduplication. |
| `2023-08-01` | No `x-idempotency-key`. |

### Available Events

| Event | Description |
|---|---|
| `PAYMENT_SUCCESS_WEBHOOK` | Payment completed successfully |
| `PAYMENT_FAILED_WEBHOOK` | Payment failed |
| `PAYMENT_USER_DROPPED_WEBHOOK` | User dropped off during payment |
| `REFUND_STATUS_WEBHOOK` | Refund status update |
| `SETTLEMENT_INITIATED` | Settlement initiated |
| `SETTLEMENT_SUCCESS` | Settlement processed |
| `SETTLEMENT_FAILED` | Settlement failed |
| `SETTLEMENT_REVERSED` | Settlement reversed |
| `INSTRUMENT_ACTIVE_WEBHOOK` | Card tokenisation successful (Token Vault) |
| `INSTRUMENT_FAILED_WEBHOOK` | Card tokenisation failed (Token Vault) |
| `DISPUTE_CREATED` | Dispute created |
| `DISPUTE_UPDATED` | Dispute updated |
| `DISPUTE_CLOSED` | Dispute closed |

### Webhook Headers (v2025-01-01)

| Header | Description |
|---|---|
| `x-webhook-signature` | HMAC-SHA256 signature for verification |
| `x-webhook-timestamp` | Timestamp when webhook was generated |
| `x-webhook-version` | API version of the payload |
| `x-webhook-attempt` | Delivery attempt number |
| `x-idempotency-key` | Unique hash per payload (for deduplication) |
| `content-type` | `application/json` |

### IPs to Whitelist

| Environment | IPs |
|---|---|
| Sandbox | `52.66.25.127`, `15.206.45.168` |
| Production | `52.66.101.190`, `3.109.102.144`, `18.60.134.245`, `18.60.183.142` |

Port: 443 (HTTPS only).

---

## 3. Setup Webhooks

### Step 1: Create Your Webhook Endpoint

Build an HTTP POST endpoint that:
1. Reads the **raw request body** (do NOT parse to JSON first).
2. Extracts `x-webhook-signature` and `x-webhook-timestamp` from headers.
3. Verifies the signature.
4. Returns HTTP 200 immediately.
5. Processes the event asynchronously.

```javascript
// Node.js (Express) — skeleton
app.post('/webhook', express.raw({ type: "application/json" }), (req, res) => {
    // 1. Verify signature
    // 2. Acknowledge immediately
    res.status(200).send("OK");
    // 3. Process async
    processWebhookAsync(JSON.parse(req.body));
});
```

### Step 2: Configure in Dashboard

1. Log in to **Merchant Dashboard**.
2. Go to **Payment Gateway > Developers > Webhooks > Configuration**.
3. Click **Add Webhook Endpoint**.
4. Enter your URL, select version `2025-01-01`.
5. Click **Test** (your endpoint must respond within 50ms), then **Next**.
6. Select events to subscribe to, click **Add Webhook**.

**Alternative: Per-order via `notify_url`:**

```json
{ "order_meta": { "notify_url": "https://yoursite.com/webhook" } }
```

### Step 3: Implement Signature Verification (MANDATORY)

**CRITICAL:** Always verify before processing. Never trust unverified webhooks.

**Algorithm:**
```
signedPayload = x-webhook-timestamp + rawBody
expectedSignature = Base64Encode(HMACSHA256(signedPayload, x-client-secret))
Compare with x-webhook-signature header
```

**IMPORTANT:** Use the **raw body** — NOT parsed JSON. Parsing can change `170.00` → `170`, breaking the signature.

**SDK verification (recommended):**

<details>
<summary>Node.js (Express)</summary>

```javascript
const { Cashfree, CFEnvironment } = require("cashfree-pg");

const cashfree = new Cashfree(CFEnvironment.SANDBOX, "{Client ID}", "{Client Secret Key}");

app.post('/webhook', express.raw({ type: "application/json" }), function (req, res) {
  try {
    cashfree.PGVerifyWebhookSignature(
      req.headers["x-webhook-signature"],
      req.body.toString(),
      req.headers["x-webhook-timestamp"]
    );
    res.status(200).send("OK");
  } catch (err) {
    res.status(400).send("Invalid signature");
  }
});
```
</details>

<details>
<summary>Python (Flask)</summary>

```python
from cashfree_pg.api_client import Cashfree

@app.route('/webhook', methods=['POST'])
def webhook():
    cashfree = Cashfree()
    cashfree.XClientId = "<app_id>"
    cashfree.XClientSecret = "<secret_key>"
    try:
        cashfree.PGVerifyWebhookSignature(
            request.headers['x-webhook-signature'],
            request.data.decode('utf-8'),
            request.headers['x-webhook-timestamp']
        )
        return "OK", 200
    except:
        return "Invalid signature", 400
```
</details>

<details>
<summary>Java (Spring Boot)</summary>

```java
@PostMapping("/webhook")
public String handlePost(HttpServletRequest request) throws IOException {
    Cashfree.XClientId = "<x-client-id>";
    Cashfree.XClientSecret = "<x-client-secret>";
    Cashfree.XEnvironment = Cashfree.SANDBOX;

    StringBuilder sb = new StringBuilder();
    BufferedReader reader = request.getReader();
    String line;
    while ((line = reader.readLine()) != null) { sb.append(line).append('\n'); }

    try {
        new Cashfree().PGVerifyWebhookSignature(
            request.getHeader("x-webhook-signature"),
            sb.toString(),
            request.getHeader("x-webhook-timestamp")
        );
        return "OK";
    } catch (Exception e) {
        return "Invalid signature";
    }
}
```
</details>

<details>
<summary>Go (Echo)</summary>

```go
func Webhook(c echo.Context) error {
    clientId := "<x-client-id>"
    clientSecret := "<x-client-secret>"
    cashfree.XClientId = &clientId
    cashfree.XClientSecret = &clientSecret
    cashfree.XEnvironment = cashfree.SANDBOX

    body, _ := ioutil.ReadAll(c.Request().Body)
    _, err := cashfree.PGVerifyWebhookSignature(
        c.Request().Header.Get("x-webhook-signature"),
        string(body),
        c.Request().Header.Get("x-webhook-timestamp"),
    )
    if err != nil {
        return c.String(400, "Invalid signature")
    }
    return c.String(200, "OK")
}
```
</details>

<details>
<summary>PHP</summary>

```php
$inputJSON = file_get_contents('php://input');
$expectedSig = getallheaders()['x-webhook-signature'];
$ts = getallheaders()['x-webhook-timestamp'];

\Cashfree\Cashfree::$XClientId = "<x-client-id>";
\Cashfree\Cashfree::$XClientSecret = "<x-client-secret>";

try {
    (new \Cashfree\Cashfree())->PGVerifyWebhookSignature($expectedSig, $inputJSON, $ts);
    http_response_code(200);
    echo "OK";
} catch (Exception $e) {
    http_response_code(400);
    echo "Invalid signature";
}
```
</details>

**Manual verification (if no SDK):**

```javascript
// Node.js — manual
const crypto = require("crypto");
function verifyWebhookSignature(timestamp, rawBody, signature, secretKey) {
    const computed = crypto.createHmac("sha256", secretKey).update(timestamp + rawBody).digest("base64");
    return computed === signature;
}
```

```python
# Python — manual
import base64, hashlib, hmac
def verify_webhook_signature(timestamp, payload, secret_key):
    message = bytes(timestamp + payload, 'utf-8')
    return base64.b64encode(
        hmac.new(bytes(secret_key, 'utf-8'), message, digestmod=hashlib.sha256).digest()
    ).decode("utf-8")
    # Compare returned value with x-webhook-signature
```

### Step 4: Event Processing — Bifurcate by Type and Status

Webhook payload top-level shape:

```json
{
  "type": "PAYMENT_SUCCESS_WEBHOOK",
  "event_time": "2025-01-15T11:16:10+05:30",
  "data": {
    "order":   { "order_id": "...", "order_amount": 100.00, ... },
    "payment": { "cf_payment_id": "...", "payment_status": "SUCCESS", "payment_group": "upi", ... },
    "customer_details": { ... },
    "error_details": { "error_code": "...", "error_description": "...", "error_reason": "...", "error_source": "..." }
  }
}
```

**Two-layer bifurcation — always route on `payload.type` first, then check `payment_status` within:**

```javascript
// Node.js — after signature verification
const payload = JSON.parse(req.body);
const { type, data } = payload;
const orderId = data.order.order_id;
const paymentStatus = data.payment?.payment_status;

switch (type) {
    case "PAYMENT_SUCCESS_WEBHOOK":
        // payment_status is usually "SUCCESS" here, but can be "PENDING" (late authorization)
        if (paymentStatus === "SUCCESS") {
            // Always re-verify from backend before fulfilling
            const order = await cashfree.PGFetchOrder(orderId);
            if (order.data.order_status === "PAID") {
                await fulfillOrder(orderId);           // unlock access, send confirmation
            }
        } else if (paymentStatus === "PENDING") {
            // Late authorization — bank hasn't confirmed yet
            await markOrderPending(orderId);           // hold fulfillment, wait for final webhook
        }
        break;

    case "PAYMENT_FAILED_WEBHOOK":
        // payment_status === "FAILED"
        const err = data.error_details;
        await handlePaymentFailure(orderId, {
            errorCode:   err?.error_code,
            errorReason: err?.error_reason,       // e.g. "bank_declined", "insufficient_funds"
            errorSource: err?.error_source,       // e.g. "bank", "cashfree"
        });
        break;

    case "PAYMENT_USER_DROPPED_WEBHOOK":
        // payment_status === "USER_DROPPED" — user closed checkout without completing
        await handleUserDropped(orderId);          // re-engagement, retry nudge, analytics
        break;

    case "REFUND_STATUS_WEBHOOK":
        // data.refund.refund_status: SUCCESS | PENDING | CANCELLED | ONHOLD
        await handleRefundUpdate(
            data.refund.refund_id,
            data.refund.refund_status
        );
        break;

    case "SETTLEMENT_SUCCESS":
    case "SETTLEMENT_INITIATED":
    case "SETTLEMENT_FAILED":
    case "SETTLEMENT_REVERSED":
        await handleSettlement(data.settlement);
        break;

    default:
        console.log("Unhandled event type:", type);
}
```

**Payment status values inside `data.payment.payment_status`:**

| `payment_status` | Arrives in event type | What to do |
|---|---|---|
| `SUCCESS` | `PAYMENT_SUCCESS_WEBHOOK` | Re-verify order, then fulfill |
| `PENDING` | `PAYMENT_SUCCESS_WEBHOOK` | Hold fulfillment — await final webhook |
| `FAILED` | `PAYMENT_FAILED_WEBHOOK` | Log `error_details`, notify user |
| `USER_DROPPED` | `PAYMENT_USER_DROPPED_WEBHOOK` | Track abandonment, re-engage |

**`error_details` fields (present on `PAYMENT_FAILED_WEBHOOK`):**

| Field | Description |
|---|---|
| `error_code` | Machine-readable error code |
| `error_description` | Human-readable description |
| `error_reason` | Reason category (e.g. `bank_declined`) |
| `error_source` | Origin: `bank`, `cashfree`, `user` |

**Idempotency:** Use `x-idempotency-key` header to skip duplicate deliveries. Store processed keys in Redis or DB.

**Retry policy:** If your endpoint doesn't return HTTP 200, Cashfree retries — 3 retries at 2, 10, and 30-minute intervals.

> **Read `references/REFERENCE.md` for:** full event payload structures for all event types, idempotency implementation details, retry policy configuration, IP whitelisting steps, and troubleshooting guide.
