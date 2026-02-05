---
name: Cashfree Payment Gateway
description: Use this to see payment gateway documentation and API references
---

# Cashfree Payment Gateway Integration Skills

## Project Overview

This project integrates Cashfree Payment Gateway for accepting payments. The integration follows a 3-step flow:

1. Create Order (backend) → 2. Open Checkout (frontend) → 3. Confirm Payment via Webhooks

---

## API Configuration

### Environments

| Environment | Base URL                          |
| ----------- | --------------------------------- |
| Sandbox     | `https://sandbox.cashfree.com/pg` |
| Production  | `https://api.cashfree.com/pg`     |

### Required Headers

```
x-client-id: <Your App ID>
x-client-secret: <Your Secret Key>
x-api-version: 2025-01-01
Content-Type: application/json
```

### Authentication

- Credentials are obtained from Merchant Dashboard
- Never expose `x-client-secret` in frontend code
- Whitelist your domain in Merchant Dashboard before going live

---

## Backend Integration

### Create Order API

**Endpoint:** `POST /orders`

Creates a payment order and returns `payment_session_id` for frontend checkout.

#### Request Body

```json
{
    "order_id": "unique_order_id",
    "order_amount": 100.0,
    "order_currency": "INR",
    "customer_details": {
        "customer_id": "customer_123",
        "customer_phone": "9999999999",
        "customer_email": "customer@example.com",
        "customer_name": "John Doe"
    },
    "order_meta": {
        "return_url": "https://yoursite.com/return/{order_id}",
        "notify_url": "https://yoursite.com/webhook"
    },
    "order_note": "Optional order note",
    "order_tags": {
        "key": "value"
    }
}
```

#### Response

```json
{
    "cf_order_id": 2149460581,
    "order_id": "order_123",
    "order_status": "ACTIVE",
    "payment_session_id": "session_xxx...",
    "order_expiry_time": "2023-09-09T18:02:46+05:30",
    "payments": {
        "url": "https://sandbox.cashfree.com/pg/orders/order_123/payments"
    }
}
```

#### Backend SDK Examples

**Node.js:**

```javascript
const { Cashfree } = require("cashfree-pg");

Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = Cashfree.Environment.SANDBOX;

const request = {
    order_amount: 100.0,
    order_currency: "INR",
    customer_details: {
        customer_id: "customer_123",
        customer_phone: "9999999999",
    },
};

const response = await Cashfree.PGCreateOrder("2025-01-01", request);
```

**Python:**

```python
from cashfree_pg.api_client import Cashfree

Cashfree.XClientId = "<app_id>"
Cashfree.XClientSecret = "<secret_key>"
Cashfree.XEnvironment = Cashfree.SANDBOX

request = CreateOrderRequest(
    order_amount=100.00,
    order_currency="INR",
    customer_details=CustomerDetails(
        customer_id="customer_123",
        customer_phone="9999999999"
    )
)
response = Cashfree.PGCreateOrder("2025-01-01", request)
```

**Java:**

```java
Cashfree.XClientId = "<app_id>";
Cashfree.XClientSecret = "<secret_key>";
Cashfree.XEnvironment = Cashfree.SANDBOX;

CustomerDetails customerDetails = new CustomerDetails();
customerDetails.setCustomerId("customer_123");
customerDetails.setCustomerPhone("9999999999");

CreateOrderRequest request = new CreateOrderRequest();
request.setOrderAmount(100.00);
request.setOrderCurrency("INR");
request.setCustomerDetails(customerDetails);

Cashfree cashfree = new Cashfree();
OrderEntity response = cashfree.PGCreateOrder("2025-01-01", request, null, null, null);
```

**Go:**

```go
import cashfree "github.com/cashfree/cashfree-pg/v4"

clientId := "<app_id>"
clientSecret := "<secret_key>"
cashfree.XClientId = &clientId
cashfree.XClientSecret = &clientSecret
cashfree.XEnvironment = cashfree.SANDBOX

request := cashfree.CreateOrderRequest{
    OrderAmount:  100.00,
    OrderCurrency: "INR",
    CustomerDetails: cashfree.CustomerDetails{
        CustomerId:    "customer_123",
        CustomerPhone: "9999999999",
    },
}
response, _, err := cashfree.PGCreateOrder(&xApiVersion, &request, nil, nil, nil)
```

### Get Order Status API

**Endpoint:** `GET /orders/{order_id}`

Always verify payment status from backend before fulfilling orders.

```javascript
const response = await Cashfree.PGFetchOrder("2025-01-01", orderId);
// Check response.order_status: "PAID", "ACTIVE", "EXPIRED"
```

---

## Frontend Integration

### 1. Include JavaScript SDK

```html
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
```

### 2. Initialize and Open Checkout

```javascript
// Initialize Cashfree
const cashfree = Cashfree({
    mode: "sandbox", // or "production"
});

// Open checkout (modal or redirect)
cashfree.checkout({
    paymentSessionId: "session_id_from_backend",
    redirectTarget: "_modal", // "_modal" for popup, "_self" for redirect
});
```

### 3. Handle Payment Response

```javascript
cashfree.checkout({
    paymentSessionId: sessionId,
    redirectTarget: "_modal",
    onSuccess: function (data) {
        console.log("Payment successful", data);
        // Verify payment on backend
    },
    onFailure: function (data) {
        console.log("Payment failed", data);
    },
    onClose: function () {
        console.log("Checkout closed");
    },
});
```

### Mobile SDK Integration

**Android (Gradle):**

```groovy
implementation 'com.cashfree.pg:api:2.2.8'
```

**iOS (CocoaPods):**

```ruby
pod 'CashfreePG', '2.2.4'
```

**Flutter:**

```yaml
dependencies:
    flutter_cashfree_pg_sdk: ^2.2.9
```

**React Native:**

```bash
npm install react-native-cashfree-pg-sdk
```

---

## Webhook Integration

### Configure Webhooks

1. Go to **Payment Gateway Dashboard** > **Developers** > **Webhooks**
2. Click **Add Webhook URL**
3. Enter your webhook endpoint URL
4. Select events to subscribe

### Webhook Events

| Event                          | Description                     |
| ------------------------------ | ------------------------------- |
| `PAYMENT_SUCCESS_WEBHOOK`      | Payment completed successfully  |
| `PAYMENT_FAILED_WEBHOOK`       | Payment failed                  |
| `PAYMENT_USER_DROPPED_WEBHOOK` | User dropped off during payment |
| `REFUND_STATUS_WEBHOOK`        | Refund status update            |
| `SETTLEMENT_WEBHOOK`           | Settlement processed            |

### Webhook Payload Structure

```json
{
    "data": {
        "order": {
            "order_id": "order_123",
            "order_amount": 100.0,
            "order_currency": "INR",
            "order_tags": null
        },
        "payment": {
            "cf_payment_id": 1234567890,
            "payment_status": "SUCCESS",
            "payment_amount": 100.0,
            "payment_currency": "INR",
            "payment_message": "Transaction successful",
            "payment_time": "2023-08-11T18:02:46+05:30",
            "bank_reference": "123456789",
            "payment_method": {
                "upi": {
                    "upi_id": "user@upi"
                }
            }
        },
        "customer_details": {
            "customer_id": "customer_123",
            "customer_name": "John Doe",
            "customer_email": "john@example.com",
            "customer_phone": "9999999999"
        }
    },
    "event_time": "2023-08-11T18:02:46+05:30",
    "type": "PAYMENT_SUCCESS_WEBHOOK"
}
```

### Webhook Headers

| Header                | Description                            |
| --------------------- | -------------------------------------- |
| `x-webhook-signature` | HMAC-SHA256 signature for verification |
| `x-webhook-timestamp` | Timestamp when webhook was sent        |
| `x-webhook-version`   | API version used                       |

### Signature Verification (REQUIRED)

**IMPORTANT:** Always verify webhook signatures before processing. Never process webhooks without verification.

**Verification Process:**

1. Extract `x-webhook-timestamp` from headers
2. Concatenate: `timestamp + rawBody`
3. Generate HMAC-SHA256 hash using your secret key
4. Base64-encode the hash
5. Compare with `x-webhook-signature` header

**Node.js (Express):**

```javascript
const crypto = require("crypto");

function verifyWebhookSignature(req) {
    const timestamp = req.headers["x-webhook-timestamp"];
    const signature = req.headers["x-webhook-signature"];
    const rawBody = req.rawBody; // Must use raw body, not parsed JSON

    const signatureString = timestamp + rawBody;
    const computedSignature = crypto
        .createHmac("sha256", process.env.CASHFREE_SECRET_KEY)
        .update(signatureString)
        .digest("base64");

    return computedSignature === signature;
}

// Using SDK
const { Cashfree } = require("cashfree-pg");
try {
    Cashfree.PGVerifyWebhookSignature(
        req.headers["x-webhook-signature"],
        req.rawBody,
        req.headers["x-webhook-timestamp"],
    );
} catch (err) {
    console.log("Invalid signature:", err.message);
}
```

**Python (Flask):**

```python
import base64
import hashlib
import hmac

def verify_webhook_signature(request):
    raw_body = request.data.decode('utf-8')
    timestamp = request.headers['x-webhook-timestamp']
    signature = request.headers['x-webhook-signature']

    signature_data = timestamp + raw_body
    message = bytes(signature_data, 'utf-8')
    secret_key = bytes(os.environ['CASHFREE_SECRET_KEY'], 'utf-8')

    computed_signature = base64.b64encode(
        hmac.new(secret_key, message, digestmod=hashlib.sha256).digest()
    ).decode('utf-8')

    return computed_signature == signature
```

**Go:**

```go
import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/base64"
)

func VerifySignature(signature, timestamp, rawBody, secretKey string) bool {
    signatureString := timestamp + rawBody
    h := hmac.New(sha256.New, []byte(secretKey))
    h.Write([]byte(signatureString))
    computedSignature := base64.StdEncoding.EncodeToString(h.Sum(nil))
    return computedSignature == signature
}
```

**PHP:**

```php
function verifyWebhookSignature() {
    $rawBody = file_get_contents('php://input');
    $timestamp = getallheaders()['x-webhook-timestamp'];
    $signature = getallheaders()['x-webhook-signature'];

    $signatureString = $timestamp . $rawBody;
    $computedSignature = base64_encode(
        hash_hmac('sha256', $signatureString, $_ENV['CASHFREE_SECRET_KEY'], true)
    );

    return $computedSignature === $signature;
}
```

**Java:**

```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

public String generateSignature(String timestamp, String rawBody, String secretKey) throws Exception {
    String data = timestamp + rawBody;
    Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
    SecretKeySpec secret_key_spec = new SecretKeySpec(secretKey.getBytes(), "HmacSHA256");
    sha256_HMAC.init(secret_key_spec);
    return Base64.getEncoder().encodeToString(sha256_HMAC.doFinal(data.getBytes()));
}
```

### Webhook Response Requirements

- Return HTTP 200 to acknowledge receipt
- Cashfree retries on non-200 responses
- Implement idempotency to handle duplicate deliveries

### IPs to Whitelist

**Sandbox:**

- 52.66.25.127
- 15.206.45.168

**Production:**

- 52.66.101.190
- 3.109.102.144
- 18.60.134.245
- 18.60.183.142

**Port:** 443 (HTTPS only)

---

## Payment Status Values

| Status          | Description                    |
| --------------- | ------------------------------ |
| `SUCCESS`       | Payment completed successfully |
| `FAILED`        | Payment failed                 |
| `PENDING`       | Payment awaiting confirmation  |
| `NOT_ATTEMPTED` | No payment attempt made        |
| `USER_DROPPED`  | User abandoned payment         |

---

## Security Checklist

- [ ] Never expose secret key in frontend code
- [ ] Always verify webhook signatures before processing
- [ ] Whitelist your domain in Merchant Dashboard
- [ ] Use HTTPS endpoints for webhooks
- [ ] Whitelist Cashfree IPs for webhook endpoints
- [ ] Always verify payment status from backend before fulfilling orders
- [ ] Use raw request body for signature verification (not parsed JSON)
- [ ] Implement idempotency for webhook handlers

---

## Testing

- Use sandbox environment for development
- Test cards and UPI IDs available in Cashfree documentation
- Verify webhook delivery in Dashboard > Developers > Webhooks

---

## Useful Links

- [Cashfree Dev Studio](https://www.cashfree.com/devstudio)
- [GitHub SDKs](https://github.com/cashfree/)
- [Postman Collections](/api-reference/postman-collections)
