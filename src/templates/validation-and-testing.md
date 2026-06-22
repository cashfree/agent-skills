---
name: Validation and Testing
description: Post-integration validation checklist, testing guidelines, test credentials, and go-live readiness checks for Cashfree Payments.
---

# Validation and Testing — Cashfree Payments

Use this skill when the developer needs to validate their Cashfree Payments integration, run sandbox tests, use test credentials, verify webhook security, or prepare for go-live.

## ⚠️ Before you say "production-ready"

Never use the phrases "production-ready", "ready to go live", "complete", or "done" without going through this list and **explicitly reporting the status of each item back to the user**. If any item is unmet, your verdict is "looks correct, but X is still required" — not a blanket "ready".

- [ ] **Domain / app whitelisted** on the production dashboard (HTTPS only). Without this, checkout silently fails in prod even if everything else is right.
- [ ] **SDK initialised ONCE** at module / page load — never inside a click handler.
- [ ] **3-state Promise handling** for `cashfree.checkout` / `cashfree.pay` — `result.error` (incl. user dismissed modal), `result.redirect`, `result.paymentDetails`. User-closed modal is **not** "payment failed".
- [ ] **Backend is the source of truth.** Fulfilment happens only after `GET /pg/orders/{order_id}` returns `order_status === "PAID"`. No frontend-only fulfilment paths.
- [ ] **Webhook signature verified server-side** with the secret + the raw request body (`x-webhook-signature` + `x-webhook-timestamp`). No "trust the headers" shortcuts.
- [ ] **Webhook idempotency** — duplicate deliveries do not double-fulfil.
- [ ] **Dead code removed** — e.g. a `DOMContentLoaded` `?order_id` redirect handler is unreachable in a `_modal`-only app; delete it.
- [ ] **Env vars used; no hardcoded keys.** `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY` come from env, not from source.
- [ ] **Sandbox → Production swap** is end-to-end: keys, mode flag (`Cashfree({ mode: "production" })`), base URL (`https://api.cashfree.com`), webhook URLs registered in the prod dashboard.
- [ ] **`return_url` is realistic.** No `localhost`, no literal `{order_id}` placeholder that wasn't intended as a Cashfree template token (see `pg/sdk.md` for the `{order_id}` rules).
- [ ] **Webhook IPs whitelisted on your firewall** if you have one. Sandbox → production IPs change.
- [ ] **API version pinned consistently.** Mixing `2025-01-01` on some calls and omitting it on others (legacy `cashfree-pg < 6.x`) breaks signatures and response parsing.
- [ ] **Control flow branches on codes/enums, never on message text.** All decisions key off `order_status` / `payment_status` / `error_details.error_code` / `refund_status` etc. No `if (error_description === "...")` or `.includes("declined")`. Description/message strings are display-and-log only — they get reworded across API & SDK versions and will silently break string matches. (See `common-mistakes/SKILL.md` §C4.)

If you completed only one or two of these, the integration is not ready — say so. The team has been burned by AI agents confidently calling work "production-ready" while missing domain whitelisting or signature verification.

---

## Key Documentation Pages

- **Payment Gateway Test Data**: https://www.cashfree.com/docs/api-reference/payments/data-to-test-integration
- **Sandbox Environment**: https://www.cashfree.com/docs/payments/online/resources/sandbox-environment
- **Go-Live Checklist (Payments)**: https://www.cashfree.com/docs/payments/online/go-live/checklist
- **Go-Live Checklist (Payouts)**: https://www.cashfree.com/docs/payouts/payouts/integrations/payouts-go-live
- **Go-Live Checklist (Secure ID)**: https://www.cashfree.com/docs/secure-id/get-started/integration/go-live-checklist
- **Webhook Signature Verification**: https://www.cashfree.com/docs/payments/online/webhooks/signature-verification
- **Webhook Security Checklist**: https://www.cashfree.com/docs/payments/online/webhooks/security-checklist
- **API Best Practices**: https://www.cashfree.com/docs/api-reference/payments/api-best-practices
- **API Errors Reference**: https://www.cashfree.com/docs/api-reference/payments/errors
- **Quickstart Guide**: https://www.cashfree.com/docs/payments/quickstart-guide
- **Payouts Test Data**: https://www.cashfree.com/docs/payouts/payouts/integrations/data-to-test
- **Cashgram Test Data**: https://www.cashfree.com/docs/payouts/cashgram/integration/data-to-test-integration
- **Account Activation**: https://www.cashfree.com/docs/help/account/account-activation

---

## Environment Overview

Cashfree provides two environments:

| Feature            | Sandbox (Test)                        | Production                              |
|--------------------|---------------------------------------|-----------------------------------------|
| **PG Endpoint**    | `https://sandbox.cashfree.com/pg`     | `https://api.cashfree.com/pg`           |
| **Payouts Endpoint** | `https://sandbox.cashfree.com/payout` | `https://api.cashfree.com/payout` (v2) or `https://payout-api.cashfree.com` (v1) |
| **Secure ID Endpoint** | `https://sandbox.cashfree.com/verification` | `https://api.cashfree.com/verification` |
| **API Credentials** | Sandbox App ID + Secret (prefix `TEST_`) | Production App ID + Secret (prefix `PROD_`) |
| **KYC Required**   | No                                    | Yes — mandatory for live processing     |
| **Transactions**   | Simulated, no financial impact        | Real-time payments and settlements      |

Switch between environments from the Merchant Dashboard using "Switch to Test" / "Switch to Prod" in the top-right corner.

---

## Sandbox Test Credentials — Payment Gateway

### Test Cards (INR)

OTP for all test cards: **`111000`**
Expiry: **`03/2028`** | CVV: **`123`** | Name: **`Test`**

| Scheme     | Card Type       | Sub Type   | Card Number 1        | Card Number 2        |
|------------|-----------------|------------|----------------------|----------------------|
| Visa       | Debit           | Retail     | 4706131211212123     | 4062288312345026     |
| Visa       | Credit          | Retail     | 4576238912771450     | 4444333322221111     |
| Visa       | Credit          | Premium    | 4466050254381183     | 4136880012657791     |
| Visa       | Credit          | Corporate  | 4074970084343075     | 4770355457382883     |
| Mastercard | Debit           | Retail     | 5409162669381034     | 5445856839524391     |
| Mastercard | Credit          | Retail     | 5105105105105100     | 5176539438527826     |
| Mastercard | Credit          | Premium    | 5242535837492075     | 5203860658394375     |
| Mastercard | Credit          | Corporate  | 5552190758372734     | 5506908329471983     |
| Rupay      | Debit           | Retail     | 6074825972083818     | 6074828163369590     |
| Rupay      | Credit          | Retail     | 6528591234543575     | 65292523412356       |

### Test UPI VPAs

| VPA                          | Result                                                        |
|------------------------------|---------------------------------------------------------------|
| `testsuccess@gocash`         | Success                                                       |
| `testfailure@gocash`         | Failed                                                        |
| `testinvalid@gocash`         | Invalid VPA                                                   |
| `testdeclineuser@gocash`     | Issue from user side                                          |
| `testexpired@gocash`         | User did not complete in time                                 |
| `testtimeoutbank@gocash`     | Issuing bank timeout                                          |
| `testinsufficientfunds@gocash` | Insufficient funds                                          |
| `testbankdeclined@gocash`    | Bank declined                                                 |
| `testriskflagged@gocash`     | Risk check declined                                           |
| `testnetworkerror@gocash`    | Network error                                                 |
| `testinvalidpin@gocash`      | Wrong PIN                                                     |
| `testuserdropped@gocash`     | Cancelled/unattempted                                         |

### Test Net Banking

| Bank      | Payment Code | API Code |
|-----------|-------------|----------|
| TEST Bank | 3333        | TESTR    |

### Test TPV (Third-Party Validation)

- **Net Banking**: accountNumber `1111222233`, IFSC `TEST0001234`
- **UPI Success**: `testtpvsuccess@gocash` (accountNumber `1111222233`, IFSC `TEST0001234`)
- **UPI Fail**: `testtpvfail@gocash`

### Paylater & Cardless EMI

- **Mobile number**: `8714268343` (any provider)
- If PAN digits asked: use `1234`
- If OTP asked: use `777777`

### Preauthorisation (Sandbox)

Create the order with `order_note` set to `preauth_transaction`, then capture or void using the Preauthorisation API. Supported for card and UPI via Order Pay link channel.

### Token Vault Test Card BINs

Append any 10 digits to the BIN. Expiry: any future date. CVV: any 3 digits.

| Scheme     | Card BINs                                    |
|------------|----------------------------------------------|
| Visa       | 470613, 457623, 436534, 415527, 466535       |
| Mastercard | 559423, 544405, 533983, 555219, 524877       |

### Unsupported in Sandbox

PayPal and bank transfer payment modes are **not** supported in the sandbox environment.

---

## Sandbox Test Credentials — Payouts

Standard OTP for all test requests: **`111000`**. SMS notifications are unavailable in the TEST environment.

### Bank Accounts

| Account Number     | IFSC         | Result                                  |
|--------------------|--------------|-----------------------------------------|
| 026291800001191    | YESB0000262  | Success                                 |
| 00011020001772     | HDFC0000001  | Success                                 |
| 1233943142         | ICIC0000009  | Success                                 |
| 000890289871772    | SCBL0036078  | Success                                 |
| 000100289877623    | SBIN0008752  | Success                                 |
| 2640101002729      | CNRR0002640  | Failure – Invalid IFSC                  |
| 026291800001190    | YESB0000262  | Failure – Invalid Account               |
| 007711000031       | HDFC0000077  | Pending                                 |
| 00224412311300     | YESB0000001  | Pending → Success                       |
| 7766666351000      | YESB0000001  | Pending → Failure                       |
| 7766671735000      | SBIN0000004  | Success → Reversed                      |
| 02014457596969     | CITI0000001  | Success → Reversed                      |
| 34978321547298     | KKBK0000001  | Timeout 25s → Success                   |

### UPI (Payouts)

| VPA            | Result                    |
|----------------|---------------------------|
| `success@upi`  | Successful UPI transfer   |
| `failure@upi`  | Failed UPI transfer       |

### Wallets (Payouts)

| Phone Number | Result                          |
|--------------|---------------------------------|
| 9999999999   | Paytm successful transfer       |
| 8888888888   | Paytm successful transfer       |
| 7777777777   | AmazonPay successful transfer   |
| 6666666666   | AmazonPay successful transfer   |

### Cards (Payouts — Cashgram)

| Card Number        | Result                    |
|--------------------|---------------------------|
| 4434260000000000   | Successful card transfer  |
| 4434260000000001   | Failed card transfer      |

---

## Go-Live Checklist — Payment Gateway

Complete all items before switching to production (from https://www.cashfree.com/docs/payments/online/go-live/checklist):

1. **Branding**: Ensure the checkout page reflects your brand colors and themes. Customize via Merchant Dashboard.
2. **Production API Keys**: Use production App ID and Secret Key (never expose in frontend/app code). Get from Dashboard → Payment Gateway → Developers → API Keys.
3. **Domain/Package Whitelisting**: Whitelist your production domain name or Android package. Non-whitelisted domains will be blocked.
4. **Server-Side Order Verification**: Before confirming payment to the user, verify the final order status with Cashfree's server using the Get Order or Get Payment API.
5. **Webhook Integration**: Subscribe to webhooks for asynchronous payment status updates. After receiving a webhook, call the Get Status API to verify.
6. **API & Success Rate Alerts**: Subscribe to API alerts on the Dashboard → Payment Gateway → Developers → Rate Limits.
7. **Payment Methods Enabled**: Confirm all desired payment methods are enabled. Dashboard → Payment Gateway → Settings → Payment Methods.
8. **App Integrity Check**: Verify app integrity for production testing.

---

## Go-Live Checklist — Payouts

1. **Production Credentials**: Switch from TEST to PROD credentials (get from production dashboard).
2. **Production Host URL**: Change endpoint to `https://payout-api.cashfree.com` (v1) or `https://api.cashfree.com/payout` (v2).
3. **IP Whitelisting**: Whitelist your server's static IP to communicate with Cashfree.
4. **Production Webhook Endpoint**: Configure your production webhook URL.
5. **Webhook Signature Verification**: **Mandatory** — do not go live without verifying webhook signatures.

---

## Go-Live Checklist — Secure ID (Verification)

1. **Production Credentials**: Obtain from the production Merchant Dashboard.
2. **Correct Host URL**: Switch from `https://sandbox.cashfree.com/verification` to `https://api.cashfree.com/verification`.
3. **IP Whitelisting**: Whitelist your IP address.
4. **Success Rate Alerts**: Set up SR alerts for API downtime notifications.

---

## Webhook Signature Verification

**Mandatory for production.** Prevents fraudulent notifications and payload tampering.

### How It Works

```
timestamp := <value from x-webhook-timestamp header>
signedPayload := timestamp + rawPayload
expectedSignature := Base64Encode(HMAC-SHA256(signedPayload, merchantSecretKey))
```

Compare `expectedSignature` with the value in the `x-webhook-signature` header.

### Required Headers to Validate

| Header                  | Description                                    |
|-------------------------|------------------------------------------------|
| `x-webhook-signature`  | Cryptographic signature for payload verification |
| `x-webhook-timestamp`  | Timestamp when the webhook was generated        |
| `x-webhook-version`    | API version of the webhook payload              |

### SDK Verification Examples

**Node.js:**
```javascript
const { Cashfree, CFEnvironment } = require("cashfree-pg");
const cashfree = new Cashfree(CFEnvironment.PRODUCTION, "{Client ID}", "{Client Secret Key}");

app.post('/webhook', function (req, res) {
  try {
    cashfree.PGVerifyWebhookSignature(
      req.headers["x-webhook-signature"],
      req.rawBody,
      req.headers["x-webhook-timestamp"]
    );
  } catch (err) {
    console.log(err.message);
  }
});
```

**Go (v6+):**
```go
signature := c.Request().Header.Get("x-webhook-signature")
timestamp := c.Request().Header.Get("x-webhook-timestamp")
body, _ := io.ReadAll(c.Request().Body)
rawBody := string(body)
ok := cashfree.PGVerifyWebhookSignature(signature, rawBody, timestamp) // returns bool in v6
```

**PHP:**
```php
$inputJSON = file_get_contents('php://input');
$expectedSig = getallheaders()['x-webhook-signature'];
$ts = getallheaders()['x-webhook-timestamp'];
$response = $cashfree->PGVerifyWebhookSignature($expectedSig, $inputJSON, $ts);
```

**Important**: Cashfree generates the signature based on the **raw payload**, not the parsed payload. Always use the raw body for verification.

---

## Webhook Security Checklist

| Security Control            | Priority           | Description                                              |
|-----------------------------|--------------------|---------------------------------------------------------|
| Public HTTPS endpoint       | Mandatory          | Endpoint must be publicly accessible over HTTPS          |
| IP whitelisting             | Highly recommended | Restrict traffic to Cashfree's known IP ranges           |
| Signature verification      | Highly recommended | Verify HMAC signature for each request                   |
| SSL whitelisting (mTLS)     | Optional           | Configure mutual TLS for enhanced security               |
| Authentication validation   | Optional           | Add Basic auth, Bearer tokens, or custom headers         |

---

## API Best Practices for Testing & Production

1. **Test in sandbox first**: Always validate in sandbox before deploying to production. Use sandbox API keys from Dashboard → Payment Gateway → Developers → API Keys.
2. **Use webhooks, not polling**: Subscribe to webhook events instead of polling the API to stay within rate limits.
3. **Handle rate limits**: Respect `x-ratelimit-retry`, `x-ratelimit-remaining`, and `x-ratelimit-reset` headers. If rate-limited, stop requests temporarily.
4. **Connection keep-alive**: Set `Connection: keep-alive` header for optimal performance.
5. **Use SDKs**: Cashfree provides official SDKs that handle authentication, request/response formatting, and error handling.
6. **API versioning**: Always use the latest API version via the `x-api-version` header (format: `YYYY-MM-DD`).
7. **Secure API keys**: Never expose keys in public repos or client-side code. Use environment variables.
8. **Avoid concurrent requests**: Process requests sequentially from the same account to avoid rate limit errors.
9. **Use request IDs**: Include a unique `x-request-id` header in each request for debugging and monitoring.

---

## Common Error Types to Watch For

| Error Type                 | Description                                          |
|----------------------------|------------------------------------------------------|
| `authentication_error`     | Invalid or missing authentication credentials        |
| `invalid_request_error`    | Malformed request or invalid parameters              |
| `rate_limit_error`         | Too many requests sent in a short time               |
| `validation_error`         | Request failed validation checks                     |
| `api_connection_error`     | Network communication issue with API server          |
| `api_error`                | General server error during request processing       |
| `bad_gateway_error`        | Invalid response from upstream server                |

Key error codes to handle in testing:
- `order_id_invalid` / `order_not_found` — verify order IDs are correct
- `payment_session_id_invalid` — session expired or incorrect
- `domain_name_refererString` — domain not whitelisted
- `authentication_error` — wrong environment credentials
- `order_already_paid` — duplicate payment attempt

---

## Validation Workflow Summary

```
1. Set up sandbox environment
   └─ Get TEST_ credentials from Dashboard

2. Integrate APIs
   └─ Use sandbox base URLs
   └─ Use official SDKs where possible

3. Test all payment flows
   └─ Cards (Visa, MC, Rupay — success cases)
   └─ UPI (success, failure, timeout, insufficient funds, etc.)
   └─ Net Banking (TEST Bank)
   └─ EMI, Paylater, Cardless EMI
   └─ Preauthorisation (if applicable)
   └─ Refunds

4. Validate webhooks
   └─ Implement signature verification
   └─ Test all webhook event types
   └─ Verify using raw payload (not parsed)

5. Verify error handling
   └─ Test failure scenarios (invalid VPA, declined cards, timeouts)
   └─ Handle rate limit responses gracefully

6. Server-side order verification
   └─ Always call Get Order/Payment API before confirming to user

7. Run go-live checklist
   └─ Switch to PROD_ credentials
   └─ Update base URLs to production
   └─ Whitelist production domain/IP
   └─ Enable all required payment methods
   └─ Set up API alerts
   └─ Confirm webhook signature verification is active

8. Account activation
   └─ Complete KYC and document submission
   └─ Activation typically takes 24 working hours
```
