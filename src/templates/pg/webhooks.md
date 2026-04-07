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

# Cashfree Webhook Integration Skills

## Overview
This file covers setting up and consuming Cashfree Payment Gateway webhooks **after** you have completed your payment integration (S2S, Mobile SDK, or Backend SDK). Webhooks are HTTP POST callbacks from Cashfree to your server, delivering real-time event notifications (payment success, failure, refunds, settlements, etc.).

---

## Prerequisites
Before setting up webhooks, ensure:
- You have completed PG integration (S2S / Mobile SDK / Backend SDK)
- You have your `x-client-id` and `x-client-secret` from the Merchant Dashboard
- You have a publicly accessible HTTPS endpoint (production requires HTTPS; sandbox allows HTTP)
- Your endpoint can respond within 50ms during configuration test

---

## Step 1: Configure Webhook Endpoints in Dashboard

### Add a Webhook Endpoint
1. Log in to the **Merchant Dashboard**
2. Go to **Payment Gateway > Developers** (or select Developers from homepage)
3. Select **Webhooks** tab > **Configuration**
4. Click **Add Webhook Endpoint**
5. Enter the endpoint URL and select the webhook version from the drop-down:
   - `2022-09-01`
   - `2023-08-01`
   - `2025-01-01` (recommended — supports `x-idempotency-key`)
6. Click **Test** to verify your endpoint returns a response, then click **Next**
7. Select the events you want to subscribe to
8. Click **Add Webhook**

### Available Webhook Events (Payment Gateway)

| Event                          | Description                                          |
| ------------------------------ | ---------------------------------------------------- |
| `PAYMENT_SUCCESS_WEBHOOK`      | Payment completed successfully                       |
| `PAYMENT_FAILED_WEBHOOK`       | Payment failed                                       |
| `PAYMENT_USER_DROPPED_WEBHOOK` | User dropped off during payment                      |
| `REFUND_STATUS_WEBHOOK`        | Refund status update (success or cancelled)          |
| `SETTLEMENT_INITIATED`         | Settlement initiated                                 |
| `SETTLEMENT_SUCCESS`           | Settlement processed successfully                    |
| `SETTLEMENT_FAILED`            | Settlement failed                                    |
| `SETTLEMENT_REVERSED`          | Settlement reversed                                  |
| `INSTRUMENT_ACTIVE_WEBHOOK`    | Card tokenisation successful (Token Vault)           |
| `INSTRUMENT_FAILED_WEBHOOK`    | Card tokenisation failed (Token Vault)               |
| `DISPUTE_CREATED`              | Dispute created                                      |
| `DISPUTE_UPDATED`              | Dispute updated                                      |
| `DISPUTE_CLOSED`               | Dispute closed                                       |
| `VENDOR_SETTLEMENT_INITIATED`  | Vendor settlement initiated (Easy Split)             |
| `VENDOR_SETTLEMENT_SUCCESS`    | Vendor settlement successful (Easy Split)            |
| `VENDOR_SETTLEMENT_FAILED`     | Vendor settlement failed (Easy Split)                |
| `VENDOR_SETTLEMENT_REVERSED`   | Vendor settlement reversed (Easy Split)              |
| `SUCCESS_PAYMENT_TDR`          | TDR for successful payment                           |

### Using `notify_url` (Per-Order Webhook)
You can also set a per-order webhook URL via the `notify_url` field in the Create Order API:
```json
{
  "order_meta": {
    "notify_url": "https://yoursite.com/webhook"
  }
}
```
The default retry policy applies to `notify_url` endpoints. Custom retry policies can only be configured for dashboard-added URLs.

---

## Step 2: Webhook Headers

Every webhook request from Cashfree includes these headers:

### Version 2025-01-01 Headers
| Header                  | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| `x-webhook-signature`  | HMAC-SHA256 cryptographic signature for verification     |
| `x-webhook-timestamp`  | Timestamp when the webhook was generated                 |
| `x-webhook-version`    | API version of the webhook payload                       |
| `x-webhook-attempt`    | Attempt number (1 for first delivery)                    |
| `x-idempotency-key`    | Unique hash per webhook payload (for deduplication)      |
| `content-type`         | `application/json`                                       |

### Version 2023-08-01 Headers
| Header                  | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| `x-webhook-signature`  | HMAC-SHA256 cryptographic signature for verification     |
| `x-webhook-timestamp`  | Timestamp when the webhook was generated                 |
| `x-webhook-version`    | API version of the webhook payload                       |
| `x-webhook-attempt`    | Attempt number                                           |
| `content-type`         | `application/json`                                       |

---

## Step 3: Webhook Payload Structures

### Payment Success Webhook (v2025-01-01)
```json
{
  "data": {
    "order": {
      "order_id": "order_OFR_2",
      "order_amount": 2,
      "order_currency": "INR",
      "order_tags": null
    },
    "payment": {
      "cf_payment_id": "1453002795",
      "payment_status": "SUCCESS",
      "payment_amount": 1,
      "payment_currency": "INR",
      "payment_message": "00::Transaction success",
      "payment_time": "2025-01-15T12:20:29+05:30",
      "bank_reference": "234928698581",
      "auth_id": null,
      "payment_method": {
        "upi": {
          "channel": "collect",
          "upi_id": "user@ybl",
          "upi_instrument": "UPI_CREDIT_CARD",
          "upi_instrument_number": "masked card number",
          "upi_payer_ifsc": "SBI0025434",
          "upi_payer_account_number": "XXXXX0231"
        }
      },
      "payment_group": "upi",
      "international_payment": {
        "international": false
      },
      "payment_surcharge": {
        "payment_surcharge_service_charge": 0.36,
        "payment_surcharge_service_tax": 0.06
      }
    },
    "customer_details": {
      "customer_name": null,
      "customer_id": "7112AAA812234",
      "customer_email": "test@gmail.com",
      "customer_phone": "9908734801"
    },
    "payment_gateway_details": {
      "gateway_name": "CASHFREE",
      "gateway_order_id": "1634766330",
      "gateway_payment_id": "1504280029",
      "gateway_order_reference_id": "abc_124",
      "gateway_settlement": "CASHFREE",
      "gateway_status_code": null
    },
    "payment_offers": [
      {
        "offer_id": "0f05e1d0-fbf8-4c9c-a1f0-814c7b2abdba",
        "offer_type": "DISCOUNT",
        "offer_meta": {
          "offer_title": "50% off on UPI",
          "offer_description": "50% off for testing",
          "offer_code": "UPI50",
          "offer_start_time": "2022-11-09T06:23:25.972Z",
          "offer_end_time": "2025-02-27T18:30:00Z"
        },
        "offer_redemption": {
          "redemption_status": "SUCCESS",
          "discount_amount": 1,
          "cashback_amount": 0
        }
      }
    ],
    "terminal_details": {
      "cf_terminal_id": 17269,
      "terminal_phone": "8971520311"
    }
  },
  "event_time": "2025-01-15T11:16:10+05:30",
  "type": "PAYMENT_SUCCESS_WEBHOOK"
}
```

### Payment Failed Webhook
Same structure as success webhook but with:
- `"payment_status": "FAILED"`
- `"type": "PAYMENT_FAILED_WEBHOOK"`

### Payment User Dropped Webhook
Same structure but with:
- `"payment_status": "USER_DROPPED"`
- `"type": "PAYMENT_USER_DROPPED_WEBHOOK"`

### Refund Webhook (v2025-01-01)
```json
{
  "data": {
    "refund": {
      "cf_refund_id": 11325632,
      "cf_payment_id": 789727431,
      "refund_id": "refund_sampleorder0413",
      "order_id": "sampleorder0413",
      "refund_amount": 2.00,
      "refund_currency": "INR",
      "entity": "Refund",
      "refund_type": "MERCHANT_INITIATED",
      "refund_arn": "205907014017",
      "refund_status": "SUCCESS",
      "status_description": "Refund processed successfully",
      "created_at": "2022-02-28T12:54:25+05:30",
      "processed_at": "2022-02-28T13:04:27+05:30",
      "refund_note": "Test",
      "refund_splits": [
        {
          "merchantVendorId": "sampleID12345",
          "amount": 1,
          "percentage": null
        }
      ],
      "metadata": null,
      "requested_speed": "STANDARD",
      "processed_speed": "STANDARD",
      "service_charge": 0.00,
      "service_tax": 0.00
    },
    "terminalDetails": {
      "cf_terminal_id": 17269,
      "terminal_phone": "8971520311"
    }
  },
  "event_time": "2022-02-28T13:04:28+05:30",
  "type": "REFUND_STATUS_WEBHOOK"
}
```

### Settlement Webhook (v2025-01-01)
```json
{
  "data": {
    "settlement": {
      "adjustment": 0,
      "amount_settled": 97.94,
      "payment_amount": 100,
      "payment_from": "2025-02-14 12:00:00",
      "payment_till": "2025-02-14 12:15:00",
      "reason": null,
      "service_charge": 1.75,
      "service_tax": 0.31,
      "settled_on": "2025-02-14T12:35:19+05:30",
      "settlement_type": "STANDARD",
      "settlement_amount": 97.94,
      "settlement_id": 738,
      "settlement_initiated_on": "2025-02-14T12:35:17+05:30",
      "status": "SUCCESS",
      "utr": 1644822317781212,
      "settlement_charge": 0,
      "settlement_tax": 0,
      "remarks": null,
      "forex_conversion_handling_charge": null,
      "forex_conversion_handling_tax": null,
      "forex_conversion_rate": null,
      "charges_currency": null
    }
  },
  "event_time": "2022-02-08T13:37:34+05:30",
  "type": "SETTLEMENT_SUCCESS"
}
```

#### Settlement Webhook Events
| Event                    | Description                              |
| ------------------------ | ---------------------------------------- |
| `SETTLEMENT_INITIATED`   | Settlement is initiated                  |
| `SETTLEMENT_SUCCESS`     | Settlement is successful                 |
| `SETTLEMENT_FAILED`      | Settlement has failed                    |
| `SETTLEMENT_REVERSED`    | Settlement has been reversed             |

### Token Vault - Instrument Active Webhook (v2025-01-01)
```json
{
  "data": {
    "instrument": {
      "customer_id": "customer_123",
      "afa_reference": "887316963",
      "instrument_id": "af250dc5-e5e5-4e7d-a7cf-3f446741fa54",
      "instrument_type": "card",
      "instrument_uid": "680cd717...",
      "instrument_display": "XXXXXXXXXXXX6854",
      "instrument_status": "ACTIVE",
      "added_at": "2022-04-14T10:42:59+05:30",
      "instrument_meta": {
        "card_network": "visa",
        "card_bank_name": "HDFC BANK",
        "card_country": "IN",
        "card_type": "credit",
        "sub_type": "R",
        "card_par": "50012ADWQZJKHCLXLT61QTYD5QNX1",
        "card_token_details": null
      }
    }
  },
  "event_time": "2022-04-14T10:44:14+05:30",
  "type": "INSTRUMENT_ACTIVE_WEBHOOK"
}
```

---

## Step 4: Signature Verification (MANDATORY)

**CRITICAL:** Always verify webhook signatures before processing. Never process unverified webhooks. This prevents fraudulent payment confirmations and man-in-the-middle attacks.

### Verification Algorithm
```
timestamp := x-webhook-timestamp header
signedPayload := timestamp + rawBody
expectedSignature := Base64Encode(HMACSHA256(signedPayload, merchantSecretKey))
// Compare expectedSignature with x-webhook-signature header
```

**IMPORTANT:** 
- Use the **raw request body** (exact bytes), NOT parsed/re-serialized JSON
- Parsing JSON can transform `payment_amount: 170.00` → `payment_amount: 170`, causing signature mismatch
- Correct: `payment_amount: 170.00` ✅
- Incorrect: `payment_amount: 170` ❌

---

### SDK Verification (Recommended Approach)

#### Node.js (Express)
```javascript
var express = require('express');
const { Cashfree, CFEnvironment } = require("cashfree-pg");

var app = express();

const cashfree = new Cashfree(
  CFEnvironment.SANDBOX,  // or CFEnvironment.PRODUCTION
  "{Client ID}",
  "{Client Secret Key}"
);

app.post('/webhook', function (req, res) {
  try {
    cashfree.PGVerifyWebhookSignature(
      req.headers["x-webhook-signature"],
      req.rawBody,
      req.headers["x-webhook-timestamp"]
    );
    // Signature valid — process the webhook
    res.status(200).send("OK");
  } catch (err) {
    console.log("Invalid signature:", err.message);
    res.status(400).send("Invalid signature");
  }
});
```

#### Python (Flask)
```python
from cashfree_pg.api_client import Cashfree

@app.route('/webhook', methods=['POST'])
def webhook():
    # Get the raw body from the request
    raw_body = request.data
    decoded_body = raw_body.decode('utf-8')

    timestamp = request.headers['x-webhook-timestamp']
    signature = request.headers['x-webhook-signature']

    cashfree = Cashfree()
    cashfree.XClientId = "<app_id>"
    cashfree.XClientSecret = "<secret_key>"

    try:
        cashfreeWebhookResponse = cashfree.PGVerifyWebhookSignature(
            signature, decoded_body, timestamp
        )
        # Signature valid — process the webhook
        return "OK", 200
    except:
        # Signature mismatch — reject
        return "Invalid signature", 400
```

#### Java (Spring Boot)
```java
import com.cashfree.*;

@PostMapping("/webhook")
public String handlePost(HttpServletRequest request) throws IOException {
    Cashfree.XClientId = "<x-client-id>";
    Cashfree.XClientSecret = "<x-client-secret>";
    Cashfree.XEnvironment = Cashfree.SANDBOX;

    StringBuilder stringBuilder = new StringBuilder();
    BufferedReader bufferedReader = null;

    try {
        bufferedReader = request.getReader();
        String line;
        while ((line = bufferedReader.readLine()) != null) {
            stringBuilder.append(line).append('\n');
        }

        String rawBody = stringBuilder.toString();
        String signature = request.getHeader("x-webhook-signature");
        String timestamp = request.getHeader("x-webhook-timestamp");

        Cashfree cashfree = new Cashfree();
        PGWebhookEvent webhook = cashfree.PGVerifyWebhookSignature(
            signature, rawBody, timestamp
        );
        // Signature valid — process webhook
        return "OK";
    } catch (Exception e) {
        // Signature verification failed
        return "Invalid signature";
    } finally {
        if (bufferedReader != null) {
            bufferedReader.close();
        }
    }
}
```

#### Go (Echo)
```go
import (
    cashfree "github.com/cashfree/cashfree-pg/v4"
    "io/ioutil"
)

func Webhook(c echo.Context) error {
    clientId := "<x-client-id>"
    clientSecret := "<x-client-secret>"
    cashfree.XClientId = &clientId
    cashfree.XClientSecret = &clientSecret
    cashfree.XEnvironment = cashfree.SANDBOX

    signature := c.Request().Header.Get("x-webhook-signature")
    timestamp := c.Request().Header.Get("x-webhook-timestamp")

    body, _ := ioutil.ReadAll(c.Request().Body)
    rawBody := string(body)

    webhookEvent, err := cashfree.PGVerifyWebhookSignature(
        signature, rawBody, timestamp,
    )
    if err != nil {
        fmt.Println(err.Error())
        return c.String(400, "Invalid signature")
    }
    fmt.Println(webhookEvent.Object)
    return c.String(200, "OK")
}
```

#### PHP
```php
<?php
$inputJSON = file_get_contents('php://input');

$expectedSig = getallheaders()['x-webhook-signature'];
$ts = getallheaders()['x-webhook-timestamp'];

if (!isset($expectedSig) || !isset($ts)) {
    echo "Bad Request";
    die();
}

\Cashfree\Cashfree::$XClientId = "<x-client-id>";
\Cashfree\Cashfree::$XClientSecret = "<x-client-secret>";
$cashfree = new \Cashfree\Cashfree();

try {
    $response = $cashfree->PGVerifyWebhookSignature($expectedSig, $inputJSON, $ts);
    // Signature valid — process webhook
    http_response_code(200);
    echo "OK";
} catch (Exception $e) {
    // Signature verification failed
    http_response_code(400);
    echo "Invalid signature";
}
?>
```

#### C# (.NET)
```csharp
using cashfree_pg.Client;
using cashfree_pg.Model;

[Route("api/[controller]")]
[ApiController]
public class WebhookController : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Post()
    {
        using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
        {
            string requestBody = await reader.ReadToEndAsync();
            var headers = Request.Headers;
            var signature = headers["x-webhook-signature"];
            var timestamp = headers["x-webhook-timestamp"];

            Cashfree.XClientId = "<x-client-id>";
            Cashfree.XClientSecret = "<x-client-secret>";
            Cashfree.XEnvironment = Cashfree.SANDBOX;
            var cashfree = new Cashfree();

            try
            {
                var response = cashfree.PGVerifyWebhookSignature(
                    signature, requestBody, timestamp
                );
                // Signature valid — process webhook
                return Ok("OK");
            }
            catch (Exception e)
            {
                // Signature verification failed
                return BadRequest("Invalid signature");
            }
        }
    }
}
```

---

### Manual Verification (Custom Approach)

If you cannot use the SDK, implement signature verification manually:

#### Node.js
```javascript
const crypto = require("crypto");

function verifyWebhookSignature(req) {
    const timestamp = req.headers["x-webhook-timestamp"];
    const signature = req.headers["x-webhook-signature"];
    const rawBody = req.rawBody; // Must use raw body

    const body = timestamp + rawBody;
    const secretKey = process.env.CASHFREE_SECRET_KEY;
    const generatedSignature = crypto
        .createHmac("sha256", secretKey)
        .update(body)
        .digest("base64");

    if (generatedSignature === signature) {
        return JSON.parse(rawBody);
    }
    throw new Error("Signature mismatch");
}
```

#### Python
```python
import base64
import hashlib
import hmac

def verify_webhook_signature(timestamp, payload, secret_key):
    signature_data = timestamp + payload
    message = bytes(signature_data, 'utf-8')
    secret = bytes(secret_key, 'utf-8')
    signature = base64.b64encode(
        hmac.new(secret, message, digestmod=hashlib.sha256).digest()
    )
    return signature.decode("utf-8")
    # Compare returned value with x-webhook-signature
```

#### Go
```go
import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/base64"
)

func VerifySignature(expectedSig, ts, rawBody, clientSecret string) bool {
    signatureString := ts + rawBody
    h := hmac.New(sha256.New, []byte(clientSecret))
    h.Write([]byte(signatureString))
    computedSignature := base64.StdEncoding.EncodeToString(h.Sum(nil))
    return computedSignature == expectedSig
}
```

#### PHP
```php
function verifyWebhookSignature($rawBody, $timestamp, $signature, $secretKey) {
    $signatureString = $timestamp . $rawBody;
    $computedSignature = base64_encode(
        hash_hmac('sha256', $signatureString, $secretKey, true)
    );
    return $computedSignature === $signature;
}
```

#### Java
```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

public String generateSignature(String timestamp, String rawBody, String secretKey) 
    throws Exception {
    String data = timestamp + rawBody;
    Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
    SecretKeySpec keySpec = new SecretKeySpec(secretKey.getBytes(), "HmacSHA256");
    sha256_HMAC.init(keySpec);
    return Base64.getEncoder().encodeToString(
        sha256_HMAC.doFinal(data.getBytes())
    );
    // Compare returned value with x-webhook-signature
}
```

---

## Step 5: Idempotency & Duplicate Handling

Cashfree practices **at-least-once delivery**. You may receive duplicate webhooks due to:
- Retries from Cashfree during downtime
- Network issues causing acknowledgement failures

### How to Handle Duplicates
- **Version 2025-01-01+**: Validate the `x-idempotency-key` header. This hashed value is unique for each unique webhook payload.
- Store processed `x-idempotency-key` values and skip duplicates.
- For older versions: Use `cf_payment_id` or `order_id` + `type` as your deduplication key.

```javascript
// Example: Node.js idempotency check
const processedKeys = new Set(); // Use Redis/DB in production

app.post('/webhook', (req, res) => {
    const idempotencyKey = req.headers['x-idempotency-key'];
    
    if (processedKeys.has(idempotencyKey)) {
        return res.status(200).send("Already processed");
    }
    
    // Verify signature first...
    // Process webhook...
    
    processedKeys.add(idempotencyKey);
    res.status(200).send("OK");
});
```

---

## Step 6: Retry Policy Configuration

If your endpoint does not return HTTP 200, Cashfree retries based on the configured policy.

### Retry Policy Types

| Policy        | Description                                                                                                  |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| **Default**   | Retries up to 3 times at 2, 10, and 30-minute intervals                                                     |
| **Fixed**     | Specify number of retries (max 10) and fixed interval between retries                                        |
| **Exponential** | Specify retries (max 10), interval, and multiplier. E.g., 5 retries, 15min interval, 2x multiplier → retries at 15, 17, 19, 23, 31 minutes |
| **Custom**    | Specify retries (max 10) with custom intervals for each retry                                                |

### Configure Retry Policy
1. Log in to **Merchant Dashboard**
2. Go to **Payment Gateway > Developers > Webhooks**
3. Two URL types are listed:
   - **NOTIFY_URL**: Default config (cannot be edited/deleted). Applies to URLs sent in `notify_url` param of Create Order API.
   - **Custom URLs**: Click **Edit** to define a custom retry policy.

---

## Step 7: Resend Webhooks (Dashboard)

If you missed webhooks, you can resend them:

1. Go to **Webhooks** under **Developer** section
2. Go to **Logs** tab
3. Click **Batch Resend** (top right)
4. Choose one of three options:
   - **Text**: Enter transaction IDs (comma separated)
   - **File**: Upload file with transaction IDs (format downloadable from dashboard)
   - **Time Duration**: Select time period (max 24 hours)
5. Click **Resend**

> Note: Resend is only available for payment webhooks.

---

## Step 8: IP Whitelisting

Restrict inbound traffic to your webhook endpoint to only accept requests from Cashfree's IPs.

### Sandbox IPs
- `52.66.25.127`
- `15.206.45.168`

### Production IPs
- `52.66.101.190`
- `3.109.102.144`
- `18.60.134.245`
- `18.60.183.142`

### Port
- `443` (HTTPS only)

> Cashfree may update IP ranges periodically. Monitor the documentation for changes.

---

## Step 9: Webhook Response Requirements

Your endpoint **MUST**:
- Return **HTTP 200** to acknowledge receipt
- Respond quickly (within 50ms recommended during configuration test)
- Not return 3xx, 4xx, or 5xx status codes (any non-200 triggers retries)

```javascript
// Correct: Acknowledge immediately, process asynchronously
app.post('/webhook', async (req, res) => {
    // 1. Verify signature
    // 2. Acknowledge immediately
    res.status(200).send("OK");
    
    // 3. Process asynchronously (queue, background job, etc.)
    processWebhookAsync(req.body);
});
```

---

## Security Checklist

| Security Control              | Priority           | Description                                                    |
| ----------------------------- | ------------------ | -------------------------------------------------------------- |
| Public HTTPS endpoint         | **Mandatory**      | Endpoint must be publicly accessible over HTTPS                |
| IP whitelisting               | Highly recommended | Restrict traffic to Cashfree's IP ranges                       |
| Signature verification        | Highly recommended | Verify HMAC signature for each request                         |
| SSL whitelisting (mTLS)       | Optional           | Configure mutual TLS for enhanced security                     |
| Authentication validation     | Optional           | Add Basic Auth, Bearer tokens, or custom headers               |

### Additional Best Practices
- [ ] Never expose `x-client-secret` in frontend code
- [ ] Always verify webhook signatures before processing any webhook
- [ ] Use raw request body for signature verification (not parsed JSON)
- [ ] Implement idempotency to handle duplicate webhook deliveries
- [ ] Use HTTPS endpoints for webhooks (mandatory in production)
- [ ] Whitelist Cashfree IPs for webhook endpoints
- [ ] Always verify payment status from backend (`GET /orders/{order_id}`) before fulfilling orders — do not rely solely on webhooks
- [ ] Return HTTP 200 immediately, process asynchronously
- [ ] Store and check `x-idempotency-key` (v2025-01-01+) to prevent duplicate processing
- [ ] Monitor webhook analytics in Dashboard for success rates and latency

---

## Testing Webhooks

### Sandbox Testing
- Configure webhooks in the **test environment** on the dashboard
- Events triggered in test transactions will send webhooks to your configured endpoint
- Both `http://` and `https://` endpoints are supported in sandbox

### Testing Tools
- Use [webhook.site](https://webhook.site) to create temporary endpoint URLs and inspect payloads
- Use [ngrok](https://ngrok.com) to create a tunnel to your localhost for local development

### Dashboard Logs
- Go to **Payment Gateway > Developers > Webhooks > Logs**
- View all webhook logs (successful or failed)
- Filter by date range, URL, and webhook type
- View details: Message, Time, Version, Header Details, and Payload

### Dashboard Analytics
- Go to **Payment Gateway > Developers > Webhooks > Analytics**
- View metrics: Total Attempts, Successful, Retried Successful, Failed
- Monitor latency (time taken to respond to webhooks)

---

## Troubleshooting

### Webhook Did Not Trigger
1. Check **Dashboard > Developer > Webhooks > Logs** for failures
2. Common reasons:
   - Endpoint returns 500 error or does not respond
   - Required event is not configured in webhook settings
3. Use **Batch Resend** to resend missed events

### Cannot Add Webhook Endpoint
- Cashfree sends a test POST request when adding the URL
- If endpoint doesn't respond within 50ms, select **Continue** and manually choose events

### Receiving Duplicate Webhooks
- Check if you've subscribed to the same event multiple times across different versions/URLs
- Retries due to downtime can cause duplicates
- Validate `x-idempotency-key` header (v2025-01-01+)

### Signature Mismatch
- Ensure you're using the **raw request body**, not parsed JSON
- JSON parsing can transform decimals (e.g., `170.00` → `170`), causing mismatch
- Ensure you're concatenating: `timestamp + rawBody` (not `rawBody + timestamp`)
- Use the correct `x-client-secret` (oldest active API key is used for verification)

---

## Useful Links
- [Cashfree Dev Studio](https://www.cashfree.com/devstudio)
- [GitHub SDKs](https://github.com/cashfree/)
- [Webhook Overview](https://www.cashfree.com/docs/payments/online/webhooks/overview)
- [Signature Verification](https://www.cashfree.com/docs/payments/online/webhooks/signature-verification)
- [Security Checklist](https://www.cashfree.com/docs/payments/online/webhooks/security-checklist)
- [Webhook Configuration](https://www.cashfree.com/docs/payments/online/webhooks/configure)
- [Payment Webhooks](https://www.cashfree.com/docs/api-reference/payments/latest/payments/webhooks)
- [Refund Webhooks](https://www.cashfree.com/docs/api-reference/payments/latest/refunds/webhooks)
- [Settlement Webhooks](https://www.cashfree.com/docs/api-reference/payments/latest/settlements/settlement-webhooks)
- [Webhook Troubleshooting](https://www.cashfree.com/docs/payments/online/webhooks/troubleshooting)

