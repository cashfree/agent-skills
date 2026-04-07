---
name: Cashfree Payment Gateway - S2S REST API Integration
description: >
  Use when integrating Cashfree Payments with an app using direct REST API calls (no SDK).
  Triggers: integrate Cashfree Payments, integrate Cashfree with my app, add Cashfree Payments,
  accept payments, add checkout, collect money, create payment order, get payment status,
  Cashfree REST API, S2S API, cURL payments, Postman Cashfree, HTTP payment API, raw API integration,
  server-side payment, create order API, payment session ID, fetch order status, refund API.
  Use for any backend language not covered by the official SDKs (Ruby, PHP, Rust, etc.)
  or when the developer wants direct HTTP calls over a library.
---

# Cashfree Payment Gateway – Server-to-Server (S2S) Integration Skills

## Project Overview

This project integrates Cashfree Payment Gateway using the **Server-to-Server (S2S) APIs** directly — no frontend SDK or Cashfree Checkout involved. The merchant's backend controls the entire payment flow, collecting payment details and submitting them via API.

**S2S Flow:**

1. Create Order (backend) → 2. Collect Payment Details (your UI) → 3. Call Order Pay API (backend) → 4. Handle Response (redirect/OTP/poll) → 5. Confirm Payment via Webhooks + Get Order API

> **Prerequisites:** S2S flag must be enabled from the Cashfree backend. For plain card payments, PCI DSS compliance is required — fill out the [Support Form](https://merchant.cashfree.com/merchants/landing?env=prod&raise_issue=1) to request enablement.

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

### Optional Headers

| Header              | Description                                                                 |
| ------------------- | --------------------------------------------------------------------------- |
| `x-request-id`      | Unique ID for the request, useful for debugging                            |
| `x-idempotency-key` | Idempotency key to safely retry requests without duplicate side effects     |

### Authentication

- Credentials are obtained from the [Merchant Dashboard](https://merchant.cashfree.com/auth/login/pg/developers/api-keys?env=prod)
- **Never expose `x-client-secret` in frontend/client-side code**
- Whitelist your domain in Merchant Dashboard before going live

### Rate Limits

| API            | Production (per min) | Sandbox (per min) | Rate Limit Type |
| -------------- | -------------------- | ----------------- | --------------- |
| Create Order   | 200                  | 30                | Account         |
| Get Order      | 400                  | 60                | Account         |
| Pay Order      | 100                  | 30                | IP              |
| Get Payments   | 100                  | 30                | Account         |
| Get Payment ID | 130                  | —                 | Account         |
| Get Settlements| 30                   | 20                | Account         |
| Initiate Refund| 100                  | 30                | Account         |
| Get Refund     | 30                   | 60                | Account         |

**Rate Limit Response Headers:**

| Header                   | Description                                              |
| ------------------------ | -------------------------------------------------------- |
| `x-ratelimit-limit`      | Max number of calls allowed per minute                  |
| `x-ratelimit-remaining`  | Remaining calls in the current minute                   |
| `x-ratelimit-retry`      | Seconds to wait before next call (when rate limited)    |
| `x-ratelimit-type`       | Type of rate limiting applied (`app_id` or `ip`)        |

Rate limits can be increased via Merchant Dashboard > Payment Gateway > Developers > Rate Limits.

---

## Step 1: Create Order

**Endpoint:** `POST /orders`

Creates a payment order and returns `payment_session_id` required for the Order Pay API.

### Request Body

```json
{
    "order_id": "unique_order_id",
    "order_amount": 100.00,
    "order_currency": "INR",
    "customer_details": {
        "customer_id": "customer_123",
        "customer_phone": "9999999999",
        "customer_email": "customer@example.com",
        "customer_name": "John Doe"
    },
    "order_meta": {
        "return_url": "https://yoursite.com/return/{order_id}",
        "notify_url": "https://yoursite.com/webhook",
        "payment_methods": "cc,dc,upi,nb"
    },
    "order_expiry_time": "2025-07-02T10:20:12+05:30",
    "order_note": "Optional order note",
    "order_tags": {
        "key": "value"
    }
}
```

**Required Fields:** `order_amount`, `order_currency`, `customer_details.customer_id`, `customer_details.customer_phone`

### Response

```json
{
    "cf_order_id": 2149460581,
    "order_id": "order_123",
    "order_status": "ACTIVE",
    "payment_session_id": "session_xxx...",
    "order_expiry_time": "2025-09-09T18:02:46+05:30",
    "payments": {
        "url": "https://sandbox.cashfree.com/pg/orders/order_123/payments"
    }
}
```

> **Important:** Store the `payment_session_id` — it is required for the Order Pay API call.

---

## Step 2: Order Pay API (S2S Core)

**Endpoint:** `POST /orders/sessions`

This is the core S2S API. After creating an order, use this API to initiate payment with a specific payment method. The request body varies by payment method.

### Request Structure

```json
{
    "payment_session_id": "<payment_session_id from Create Order>",
    "payment_method": {
        "<method_key>": {
            // method-specific fields
        }
    },
    "save_instrument": false,
    "offer_id": "optional-offer-id"
}
```

**Required Fields:** `payment_session_id`, `payment_method`

---

### Payment Method: Card

#### Plain Card (requires PCI DSS)

```json
{
    "payment_session_id": "session_xxx",
    "payment_method": {
        "card": {
            "channel": "link",
            "card_number": "4111111111111111",
            "card_holder_name": "John Doe",
            "card_expiry_mm": "06",
            "card_expiry_yy": "25",
            "card_cvv": "900"
        }
    },
    "save_instrument": true
}
```

| Field              | Type   | Required | Description                                                                 |
| ------------------ | ------ | -------- | --------------------------------------------------------------------------- |
| `channel`          | string | Yes      | `"link"` for redirect flow, `"post"` for Native OTP flow                   |
| `card_number`      | string | Yes*     | Full card number (plain card) or token number (external token)              |
| `card_holder_name` | string | No       | Name on the card                                                            |
| `card_expiry_mm`   | string | Yes*     | Card expiry month (2 digits)                                                |
| `card_expiry_yy`   | string | Yes*     | Card expiry year (2 digits)                                                 |
| `card_cvv`         | string | Yes*     | CVV (min 3 chars). Mandatory for plain card; optional for saved card        |
| `instrument_id`    | string | No       | Instrument ID of a saved card (from Token Vault). Use instead of card details |
| `cryptogram`       | string | No       | For external token/Alt ID transactions                                      |
| `token_requestor_id` | string | No    | TRID from card network (external token transactions)                        |
| `emi_tenure`       | int    | No       | EMI tenure (required for EMI payments)                                      |
| `card_bank_name`   | string | No       | Required for EMI. Values: `hdfc`, `icici`, `kotak`, `rbl`, `bob`, `axis`, `standard chartered`, `au`, `yes`, `sbi`, `fed`, `hsbc`, `citi`, `amex`, `onecard`, `idfc` |

*Required for plain card transactions. Not needed when using `instrument_id`.

#### Saved Card (Token Vault)

```json
{
    "payment_session_id": "session_xxx",
    "payment_method": {
        "card": {
            "channel": "link",
            "instrument_id": "54deabb4-ba45-4a60-9e6a-9c016fe7ab10"
        }
    }
}
```

#### Card with Native OTP (Headless/Zero-Redirect)

```json
{
    "payment_session_id": "session_xxx",
    "payment_method": {
        "card": {
            "channel": "post",
            "card_number": "4111111111111111",
            "card_expiry_mm": "03",
            "card_expiry_yy": "25",
            "card_cvv": "326",
            "card_holder_name": "John"
        }
    }
}
```

**Native OTP Response Handling:**

When `channel: "post"` is used:

- If Native OTP is **supported**: response returns `action: "post"` → render your OTP UI, submit OTP to `data.url`
- If Native OTP is **not supported**: response returns `action: "link"` → redirect user to `data.url`

```json
// Native OTP supported response
{
    "action": "post",
    "cf_payment_id": "3991346241",
    "channel": "post",
    "payment_amount": 1.00,
    "payment_method": "card",
    "data": {
        "url": "https://api.cashfree.com/pg/orders/pay/authenticate/3991346241",
        "payload": null,
        "content_type": "application/json",
        "method": "post",
        "redirect_to_bank": "https://api.cashfree.com/pg/view/redirecttobank/..."
    }
}
```

> Keep a **10-second max timeout** for the Order Pay API response when using Native OTP, as it depends on bank ACS load time.

#### Submit/Resend OTP API

**Endpoint:** `POST /orders/pay/authenticate/{cf_payment_id}`

```json
// Submit OTP
{
    "action": "SUBMIT_OTP",
    "otp": "123456"
}

// Resend OTP
{
    "action": "RESEND_OTP"
}
```

**Response:**

```json
{
    "action": "SUBMIT_OTP",
    "authenticate_status": "SUCCESS",
    "cf_payment_id": "3991872901",
    "payment_message": "payment successful"
}
```

**OTP Rules:**
- Resend OTP allowed **twice**, enabled after **30 seconds** each
- **5-minute session timeout** per bank limits
- Provide a "redirect to bank page" fallback option using `data.redirect_to_bank`

#### International Card Payments (Address Required)

```json
{
    "payment_session_id": "session_xxx",
    "payment_method": {
        "card": {
            "channel": "link",
            "card_number": "4111111111111111",
            "card_holder_name": "John Doe",
            "card_expiry_mm": "06",
            "card_expiry_yy": "25",
            "card_cvv": "900",
            "address_line_one": "123 Main St",
            "address_line_two": "Apt 4",
            "city": "Minnehaha",
            "zip_code": "57109",
            "country": "United States",
            "country_code": "US",
            "state": "South Dakota",
            "state_code": "SD"
        }
    }
}
```

> **Note:** Cards issued in India cannot be used for non-INR currency transactions.

---

### Payment Method: UPI

#### UPI Collect

Customer receives a collect request on their UPI app.

```json
{
    "payment_session_id": "session_xxx",
    "payment_method": {
        "upi": {
            "channel": "collect",
            "upi_id": "customer@upi",
            "upi_expiry_minutes": 10
        }
    }
}
```

| Field                 | Type    | Required       | Description                                                    |
| --------------------- | ------- | -------------- | -------------------------------------------------------------- |
| `channel`             | string  | Yes            | `"collect"`, `"link"`, `"qrcode"`, or `"podQrCode"`           |
| `upi_id`              | string  | Yes (collect)  | Customer's UPI VPA (required for `collect` channel)            |
| `upi_expiry_minutes`  | number  | No             | Expiry in minutes (min: 5, max: 15, default: 5)               |
| `upi_redirect_url`    | boolean | No             | If true, returns a redirect URL with loader (collect only)     |
| `authorize_only`      | boolean | No             | For one-time UPI mandate. Only works with `collect` channel    |

**Response:**

```json
{
    "action": "custom",
    "cf_payment_id": "7845123001",
    "payment_method": "upi",
    "channel": "collect",
    "payment_amount": 250,
    "data": {
        "vpa": "testsuccess@gocash",
        "expiry": "2025-10-07T18:30:00+05:30"
    }
}
```

#### UPI Intent (Mobile Deep Link)

```json
{
    "payment_session_id": "session_xxx",
    "payment_method": {
        "upi": {
            "channel": "link"
        }
    }
}
```

#### UPI QR Code

```json
{
    "payment_session_id": "session_xxx",
    "payment_method": {
        "upi": {
            "channel": "qrcode"
        }
    }
}
```

---

### Payment Method: Netbanking

#### By Bank Code

```json
{
    "payment_session_id": "session_xxx",
    "payment_method": {
        "netbanking": {
            "channel": "link",
            "netbanking_bank_code": 3021
        }
    }
}
```

#### By Bank Name

```json
{
    "payment_session_id": "session_xxx",
    "payment_method": {
        "netbanking": {
            "channel": "link",
            "netbanking_bank_name": "TESTR"
        }
    }
}
```

| Field                   | Type    | Required | Description                                    |
| ----------------------- | ------- | -------- | ---------------------------------------------- |
| `channel`               | string  | Yes      | Always `"link"` for netbanking                 |
| `netbanking_bank_code`  | integer | No*      | 4-digit bank code                              |
| `netbanking_bank_name`  | string  | No*      | 5-character bank string code (e.g., `"TESTR"`) |

*Either `netbanking_bank_code` or `netbanking_bank_name` is required.

**Response:**

```json
{
    "action": "link",
    "cf_payment_id": "7845123101",
    "payment_method": "netbanking",
    "channel": "link",
    "payment_amount": 999,
    "data": {
        "url": "https://api.cashfree.com/pg/view/gateway/session_..."
    }
}
```

> Redirect the customer to `data.url` to complete the netbanking payment.

---

### Payment Method: Wallet / App

```json
{
    "payment_session_id": "session_xxx",
    "payment_method": {
        "app": {
            "provider": "phonepe",
            "channel": "link",
            "phone": "8474090589"
        }
    }
}
```

| Field      | Type   | Required | Description                                                                                      |
| ---------- | ------ | -------- | ------------------------------------------------------------------------------------------------ |
| `channel`  | string | Yes      | Specify the channel (typically `"link"`)                                                         |
| `provider` | string | Yes      | One of: `gpay`, `phonepe`, `ola`, `paytm`, `amazon`, `airtel`, `freecharge`, `mobikwik`, `jio`   |
| `phone`    | string | Yes      | Customer phone number associated with the wallet                                                 |

---

### Payment Method: Card EMI

```json
{
    "payment_session_id": "session_xxx",
    "payment_method": {
        "emi": {
            "channel": "link",
            "card_number": "4748461111111111",
            "card_expiry_mm": "12",
            "card_expiry_yy": "24",
            "card_cvv": "123",
            "card_bank_name": "ICICI",
            "emi_tenure": 3
        }
    }
}
```

| Field            | Type    | Required | Description                                                                                                                                  |
| ---------------- | ------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `channel`        | string  | Yes      | Always `"link"`                                                                                                                              |
| `card_number`    | string  | Yes      | Customer card number                                                                                                                         |
| `card_expiry_mm` | string  | Yes      | Card expiry month                                                                                                                            |
| `card_expiry_yy` | string  | Yes      | Card expiry year                                                                                                                             |
| `card_cvv`       | string  | Yes      | Card CVV                                                                                                                                     |
| `card_bank_name` | string  | Yes      | One of: `hdfc`, `kotak`, `icici`, `rbl`, `bob`, `standard chartered`, `axis`, `au`, `yes`, `sbi`, `fed`, `hsbc`, `citi`, `amex`              |
| `emi_tenure`     | integer | Yes      | EMI tenure in months                                                                                                                         |

---

### Payment Method: Cardless EMI

```json
{
    "payment_session_id": "session_xxx",
    "payment_method": {
        "cardless_emi": {
            "channel": "link",
            "provider": "kotak",
            "phone": "7768913241",
            "emi_tenure": 3
        }
    }
}
```

| Field        | Type    | Required                                          | Description                                                                                                  |
| ------------ | ------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `channel`    | string  | Yes                                               | Always `"link"`                                                                                              |
| `provider`   | string  | Yes                                               | One of: `flexmoney`, `zestmoney`, `hdfc`, `icici`, `cashe`, `idfc`, `kotak`, `snapmint`, `bharatx`          |
| `phone`      | string  | Yes                                               | Customer phone number                                                                                        |
| `emi_tenure` | integer | Yes (for `hdfc`, `icici`, `cashe`, `idfc`, `kotak`) | EMI tenure in months                                                                                         |

---

### Payment Method: Paylater

```json
{
    "payment_session_id": "session_xxx",
    "payment_method": {
        "paylater": {
            "channel": "link",
            "provider": "lazypay",
            "phone": "7789112345"
        }
    }
}
```

| Field      | Type   | Required | Description                                                                                                                |
| ---------- | ------ | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `channel`  | string | Yes      | Always `"link"`                                                                                                            |
| `provider` | string | Yes      | One of: `kotak`, `flexipay`, `zestmoney`, `lazypay`, `olapostpaid`, `simpl`, `freechargepaylater`. (Flexipay = HDFC bank) |
| `phone`    | string | Yes      | Customer phone number                                                                                                      |

---

### Payment Method: Bank Transfer

```json
{
    "payment_session_id": "session_xxx",
    "payment_method": {
        "banktransfer": {
            "channel": "link"
        }
    }
}
```

**Response:**

```json
{
    "action": "custom",
    "cf_payment_id": "7845123701",
    "payment_method": "banktransfer",
    "channel": "qrcode",
    "payment_amount": 500,
    "data": {
        "account_number": "XXXXXXXX1234",
        "ifsc": "CASHF000XXX",
        "virtual_vpa": "order_8123@cashfree"
    }
}
```

---

## Step 3: Handle Order Pay Response

The Order Pay API returns a `PayOrderEntity` with the following structure:

```json
{
    "action": "link | post | custom | form",
    "cf_payment_id": "string",
    "channel": "link | post | collect | qrcode | podQrCode",
    "payment_amount": 100.00,
    "payment_method": "card | upi | netbanking | app | cardless_emi | paylater | banktransfer | applepay",
    "data": {
        "url": "redirect URL or OTP submission URL",
        "payload": null,
        "content_type": "application/json or null",
        "method": "post or null",
        "redirect_to_bank": "fallback bank redirect URL (Native OTP only)"
    }
}
```

### Action Handling Matrix

| `action` | What to Do                                                                                          |
| -------- | --------------------------------------------------------------------------------------------------- |
| `link`   | **Redirect** the customer to `data.url` (browser or in-app webview)                                |
| `post`   | **Render Native OTP UI**, collect OTP, and POST it to `data.url`                                   |
| `form`   | **Render the HTML form** from `data.payload` and auto-submit to `data.url`                         |
| `custom` | **Follow method-specific logic** — e.g., for UPI collect, poll for status; for bank transfer, display account details |

### Polling for Payment Status (UPI Collect / Bank Transfer)

For `action: "custom"` responses (UPI collect, bank transfer), you must poll the Get Payments API to check status:

**Endpoint:** `GET /orders/{order_id}/payments`

Poll every 3-5 seconds until you get a terminal status (`SUCCESS`, `FAILED`, `USER_DROPPED`).

---

## Step 4: Verify Payment Status

### Get Order API

**Endpoint:** `GET /orders/{order_id}`

**ALWAYS** verify payment status from your backend before fulfilling orders. Never rely solely on frontend callbacks.

```
GET /orders/{order_id}
Headers:
  x-client-id: <app_id>
  x-client-secret: <secret_key>
  x-api-version: 2025-01-01
```

**Order Status Values:**

| Status    | Description                    |
| --------- | ------------------------------ |
| `PAID`    | Payment completed successfully |
| `ACTIVE`  | Order is active, awaiting payment |
| `EXPIRED` | Order has expired              |

### Get Payment by ID

**Endpoint:** `GET /orders/{order_id}/payments/{cf_payment_id}`

**Payment Status Values:**

| Status          | Description                    |
| --------------- | ------------------------------ |
| `SUCCESS`       | Payment completed successfully |
| `FAILED`        | Payment failed                 |
| `PENDING`       | Payment awaiting confirmation  |
| `NOT_ATTEMPTED` | No payment attempt made        |
| `USER_DROPPED`  | User abandoned payment         |

---

## Step 5: Webhook Integration

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
            "payment_time": "2025-08-11T18:02:46+05:30",
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
    "event_time": "2025-08-11T18:02:46+05:30",
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

**Node.js:**

```javascript
const crypto = require("crypto");

function verifyWebhookSignature(timestamp, rawBody, signature, secretKey) {
    const signatureString = timestamp + rawBody;
    const computedSignature = crypto
        .createHmac("sha256", secretKey)
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
        req.headers["x-webhook-timestamp"]
    );
} catch (err) {
    console.log("Invalid signature:", err.message);
}
```

**Python:**

```python
import base64, hashlib, hmac

def verify_webhook_signature(timestamp, raw_body, signature, secret_key):
    signature_data = timestamp + raw_body
    message = bytes(signature_data, 'utf-8')
    secret = bytes(secret_key, 'utf-8')
    computed = base64.b64encode(
        hmac.new(secret, message, digestmod=hashlib.sha256).digest()
    ).decode('utf-8')
    return computed == signature
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
    computed := base64.StdEncoding.EncodeToString(h.Sum(nil))
    return computed == signature
}
```

**PHP:**

```php
function verifyWebhookSignature($rawBody, $timestamp, $signature, $secretKey) {
    $signatureString = $timestamp . $rawBody;
    $computed = base64_encode(
        hash_hmac('sha256', $signatureString, $secretKey, true)
    );
    return $computed === $signature;
}
```

**Java:**

```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

public boolean verifySignature(String timestamp, String rawBody, String signature, String secretKey) throws Exception {
    String data = timestamp + rawBody;
    Mac sha256HMAC = Mac.getInstance("HmacSHA256");
    SecretKeySpec keySpec = new SecretKeySpec(secretKey.getBytes(), "HmacSHA256");
    sha256HMAC.init(keySpec);
    String computed = Base64.getEncoder().encodeToString(sha256HMAC.doFinal(data.getBytes()));
    return computed.equals(signature);
}
```

**C# / .NET:**

```csharp
using System.Security.Cryptography;
using System.Text;

public static bool VerifySignature(string timestamp, string rawBody, string signature, string secretKey)
{
    string data = timestamp + rawBody;
    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secretKey));
    byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
    string computed = Convert.ToBase64String(hash);
    return computed == signature;
}
```

### Webhook Response Requirements

- Return **HTTP 200** to acknowledge receipt
- Cashfree **retries on non-200** responses
- Implement **idempotency** to handle duplicate deliveries
- Use **raw request body** for signature verification (not parsed JSON)

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

## Complete S2S Flow — Language-Agnostic HTTP Examples

### Full Flow: UPI Collect Payment

```
# Step 1: Create Order
POST https://sandbox.cashfree.com/pg/orders
Headers:
  x-client-id: YOUR_APP_ID
  x-client-secret: YOUR_SECRET_KEY
  x-api-version: 2025-01-01
  Content-Type: application/json

Body:
{
    "order_id": "order_upi_001",
    "order_amount": 250.00,
    "order_currency": "INR",
    "customer_details": {
        "customer_id": "cust_001",
        "customer_phone": "9999999999"
    },
    "order_meta": {
        "notify_url": "https://yoursite.com/webhook"
    }
}

# Response → Extract payment_session_id

# Step 2: Order Pay (UPI Collect)
POST https://sandbox.cashfree.com/pg/orders/sessions
Headers:
  x-api-version: 2025-01-01
  Content-Type: application/json

Body:
{
    "payment_session_id": "session_xxx_from_step1",
    "payment_method": {
        "upi": {
            "channel": "collect",
            "upi_id": "customer@upi"
        }
    }
}

# Response → action: "custom", poll for status

# Step 3: Poll Payment Status
GET https://sandbox.cashfree.com/pg/orders/order_upi_001/payments
Headers:
  x-client-id: YOUR_APP_ID
  x-client-secret: YOUR_SECRET_KEY
  x-api-version: 2025-01-01

# Step 4: Verify Final Status
GET https://sandbox.cashfree.com/pg/orders/order_upi_001
Headers:
  x-client-id: YOUR_APP_ID
  x-client-secret: YOUR_SECRET_KEY
  x-api-version: 2025-01-01
```

### Full Flow: Card Payment with Native OTP

```
# Step 1: Create Order (same as above)

# Step 2: Order Pay (Card with Native OTP)
POST https://sandbox.cashfree.com/pg/orders/sessions
Headers:
  x-api-version: 2025-01-01
  Content-Type: application/json

Body:
{
    "payment_session_id": "session_xxx",
    "payment_method": {
        "card": {
            "channel": "post",
            "card_number": "4111111111111111",
            "card_expiry_mm": "03",
            "card_expiry_yy": "25",
            "card_cvv": "326",
            "card_holder_name": "John Doe"
        }
    }
}

# Response → If action: "post", render OTP UI

# Step 3: Submit OTP
POST https://sandbox.cashfree.com/pg/orders/pay/authenticate/{cf_payment_id}
Headers:
  x-api-version: 2025-01-01
  Content-Type: application/json

Body:
{
    "action": "SUBMIT_OTP",
    "otp": "123456"
}

# Step 4: Verify via Get Order API + Webhooks
```

### Full Flow: Netbanking Payment

```
# Step 1: Create Order (same as above)

# Step 2: Order Pay (Netbanking)
POST https://sandbox.cashfree.com/pg/orders/sessions
Headers:
  x-api-version: 2025-01-01
  Content-Type: application/json

Body:
{
    "payment_session_id": "session_xxx",
    "payment_method": {
        "netbanking": {
            "channel": "link",
            "netbanking_bank_code": 3021
        }
    }
}

# Response → action: "link", redirect customer to data.url
# After bank authentication, customer returns to return_url
# Verify via Get Order API + Webhooks
```

---

## Refunds

### Create Refund

**Endpoint:** `POST /orders/{order_id}/refunds`

```json
{
    "refund_amount": 50.00,
    "refund_id": "refund_001",
    "refund_note": "Customer requested refund"
}
```

### Get Refund Status

**Endpoint:** `GET /orders/{order_id}/refunds/{refund_id}`

---

## Pre-Authorization (Hold & Capture)

If pre-auth is enabled for your account:

### Authorize Order

**Endpoint:** `POST /orders/{order_id}/authorization`

```json
// Capture
{
    "action": "CAPTURE",
    "amount": 100.00
}

// Void
{
    "action": "VOID"
}
```

**Authorization Status Values:** `SUCCESS`, `PENDING`

---

## Error Handling

### Common Error Codes

| Code                          | Description                                                                 | HTTP Status |
| ----------------------------- | --------------------------------------------------------------------------- | ----------- |
| `channel_missing`             | `channel` field is required                                                 | 400         |
| `phone_invalid`               | Phone must be valid 10-digit Indian number                                  | 400         |
| `phone_missing`               | `phone` field is required                                                   | 400         |
| `provider_missing`            | `provider` field is required                                                | 400         |
| `card_number_invalid`         | Invalid card number                                                         | 400         |
| `card_number_missing`         | `card_number` field is required                                             | 400         |
| `card_cvv_invalid`            | CVV must be at least 3 characters                                           | 400         |
| `card_cvv_missing`            | `card_cvv` field is required                                                | 400         |
| `card_expiry_mm_missing`      | `card_expiry_mm` field is required                                          | 400         |
| `card_expiry_yy_missing`      | `card_expiry_yy` field is required                                          | 400         |
| `card_bank_name_invalid`      | Unrecognized bank name for EMI                                              | 400         |
| `card_bank_name_missing`      | `card_bank_name` required for EMI                                           | 400         |
| `emi_tenure_missing`          | `emi_tenure` field is required                                              | 400         |
| `netbanking_bank_code_invalid`| Invalid bank code                                                           | 400         |
| `payment_method_invalid`      | Unrecognized payment method                                                 | 400         |
| `payment_method_missing`      | `payment_method` field is required                                          | 400         |
| `payment_method_unsupported`  | Payment method not supported for this request                               | 400         |
| `order_amount_invalid`        | Amount exceeds max (1,000,000)                                              | 400         |
| `orderpay_not_found`          | Order is no longer active                                                   | 404         |
| `request_failed`              | Payment mode not configured for account                                     | 400         |
| `request_invalid`             | Indian cards cannot be used for non-INR transactions                        | 400         |
| `bank_processing_failure`     | Transaction failed at banking partner                                       | 502         |
| `version_missing`             | API version header missing or invalid                                       | 400         |

### Error Response Format

```json
{
    "message": "descriptive error message",
    "code": "error_code",
    "type": "invalid_request_error | authentication_error | api_error",
    "help": "Check latest errors and resolution from Merchant Dashboard API logs: https://bit.ly/4glEd0W"
}
```

---

## Security Checklist

- [ ] S2S flag enabled in Cashfree backend
- [ ] PCI DSS flag enabled (if handling plain card numbers)
- [ ] Never expose secret key in frontend/client-side code
- [ ] Always verify webhook signatures before processing
- [ ] Always verify payment status from backend (Get Order API) before fulfilling orders
- [ ] Whitelist your domain in Merchant Dashboard
- [ ] Use HTTPS endpoints for webhooks
- [ ] Whitelist Cashfree IPs for webhook endpoints
- [ ] Use raw request body for signature verification (not parsed JSON)
- [ ] Implement idempotency for webhook handlers and payment retries
- [ ] Use `x-idempotency-key` header for safe retries on Order Pay API
- [ ] Set 10-second timeout for Native OTP Order Pay requests
- [ ] Handle all `action` types in Order Pay response (`link`, `post`, `custom`, `form`)
- [ ] Poll payment status for async methods (UPI collect, bank transfer)

---

## Testing

- Use **sandbox environment** for development
- Test cards and UPI IDs available in Cashfree documentation
- Sandbox test UPI VPA: `testsuccess@gocash` (for successful payments)
- Sandbox test card: `4111111111111111` (Visa test card)
- Verify webhook delivery in Dashboard > Developers > Webhooks
- Use the **Simulate API** (`POST /simulate`) to test payment states

---

## Useful Links

- [Cashfree Dev Studio](https://www.cashfree.com/devstudio)
- [GitHub SDKs](https://github.com/cashfree/)
- [API Reference — Order Pay](https://www.cashfree.com/docs/api-reference/payments/latest/payments/pay)
- [Native OTP Documentation](https://www.cashfree.com/docs/payments/features/native-otp)
- [Rate Limits](https://www.cashfree.com/docs/api-reference/payments/rate-limits)
- [Postman Collections](https://www.cashfree.com/docs/api-reference/postman-collections)
