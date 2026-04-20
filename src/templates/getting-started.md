---
name: Getting Started with Cashfree Payments
description: How to start integrating with Cashfree Payments - authentication, environment setup, API keys, and initial configuration.
---

# Getting Started with Cashfree Payments

Use this skill when the user needs help with initial Cashfree Payments setup, authentication, API keys, environments, or first integration steps.

## Documentation Reference

- Authentication: https://www.cashfree.com/docs/api-reference/authentication
- API Overview: https://www.cashfree.com/docs/api-reference/payments/latest/overview
- Sandbox Environment: https://www.cashfree.com/docs/payments/online/resources/sandbox-environment
- Web Integration: https://www.cashfree.com/docs/payments/online/web/redirect
- API Best Practices: https://www.cashfree.com/docs/api-reference/payments/api-best-practices
- Account Overview: https://www.cashfree.com/docs/help/account/overview
- Security: https://www.cashfree.com/docs/security

## Account Setup

1. **Create a Cashfree Merchant Account** at https://www.cashfree.com. Sign up and complete KYC verification. Entity-wise document checklists are available in the dashboard.
2. **Log in to the Merchant Dashboard** to access Payment Gateway, generate API keys, and configure settings.

## API Key Generation

Each Cashfree product (Payments, Payouts, Secure ID, etc.) requires its **own unique client ID and client secret**. You cannot share keys across products.

Steps to generate Payment Gateway API keys:
1. Go to **Payment Gateway Dashboard > Developers** (or click the Developers icon in the right navigation).
2. Click **API Keys** under Payment Gateway.
3. In the **test environment**, API keys are auto-generated.
4. In the **production environment**, click **Generate API Keys** and complete 2FA authentication.
5. Keys are shown masked. Click the icon and select **View API Key** (production requires 2FA to view).
6. **Store keys securely.** Only one API key pair can be active at a time. If lost, regenerate from the dashboard.

## Authentication

### Merchant Authentication

All APIs require authentication except `POST /orders/sessions`. Use these two headers:

```
x-client-id: <YOUR_APP_ID>
x-client-secret: <YOUR_SECRET_KEY>
```

Example curl request:
```bash
curl --request {REQUEST-TYPE} \
  --url https://sandbox.cashfree.com/pg/{resource} \
  --header 'Content-Type: application/json' \
  --header 'x-api-version: 2025-01-01' \
  --header 'x-client-id: <YOUR_APP_ID>' \
  --header 'x-client-secret: <YOUR_SECRET_KEY>'
```

### Partner Authentication

If building a platform on behalf of merchants, use:
- `x-partner-apikey`: Common API Key unique to each Partner
- `x-partner-merchantid`: Unique merchant ID for each associated merchant

**Never expose secret keys in client-side code.** Always call authenticated APIs from your server/backend.

## Environments

| Environment | Base URL |
|-------------|----------|
| **Sandbox (Test)** | `https://sandbox.cashfree.com/pg` |
| **Production** | `https://api.cashfree.com/pg` |

Other products have their own base URLs:
- **Payouts**: `https://sandbox.cashfree.com/payout` (test) / `https://api.cashfree.com/payout` (production)
- **Verification (Secure ID)**: `https://sandbox.cashfree.com/verification` (test) / `https://api.cashfree.com/verification` (production)

## API Versioning

The latest Payment Gateway API version is **2025-01-01** (v5). Previous versions: 2023-08-01, 2022-09-01, 2022-01-01, 2021-05-21.

Set the version via the `x-api-version` header (format: `YYYY-MM-DD`). Always use the latest version for new integrations.

## Integration Flow (3 Steps)

The core payment integration follows three steps:

### Step 1: Create an Order (Server-Side)

Call the Create Order API from your backend. **Never call this from the client side** as it requires your secret key.

```javascript
import { Cashfree, CFEnvironment } from "cashfree-pg";

const cashfree = new Cashfree(
  CFEnvironment.PRODUCTION,
  "{Client ID}",
  "{Client Secret Key}"
);

function createOrder() {
  var request = {
    order_amount: "1",
    order_currency: "INR",
    customer_details: {
      customer_id: "node_sdk_test",
      customer_name: "",
      customer_email: "example@gmail.com",
      customer_phone: "9999999999",
    },
    order_meta: {
      return_url: "https://test.cashfree.com/pgappsdemos/return.php?order_id=order_123",
    },
    order_note: "",
  };

  cashfree.PGCreateOrder(request)
    .then((response) => console.log(response.data))
    .catch((error) => console.error("Error:", error.response.data));
}
```

### Step 2: Open the Checkout Page

Use the `payment_session_id` from the Create Order response to open the Cashfree checkout (web, Android, iOS, React Native, etc.).

### Step 3: Confirm the Payment

Verify payment status via webhooks or the Get Order API. Subscribe to webhook events rather than polling.

## Sandbox Testing

Before going to production, test in the sandbox environment. Key test credentials:

- **Test Cards**: Use card number `4706131211212123` (Visa Debit) with OTP `111000`, expiry `03/2028`, CVV `123`, name `Test`
- **Test UPI VPA**: `testsuccess@gocash` (success), `testfailure@gocash` (failed)
- **Test Net Banking**: Bank code `3333`, API code `TESTR`

PayPal and bank transfer are not supported in sandbox.

## Rate Limits

Production rate limits include:
- **Create Order**: 200 requests/minute (account-based)
- **Pay Order**: 100 requests/minute (IP-based)
- **Get Payments**: 100 requests/minute (account-based)

Check response headers: `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`, `x-ratelimit-retry`.

## Best Practices

1. **Use webhooks** instead of polling for payment status updates.
2. **Use SDKs** — Cashfree offers backend SDKs in Node.js, Python, Java, and more.
3. **Secure your API keys** — use environment variables, never expose in client-side code or public repos.
4. **Use `Connection: keep-alive`** header for optimal performance.
5. **Include `x-request-id`** header for tracking and troubleshooting.
6. **Avoid concurrent requests** from the same account to prevent rate limit errors.
7. **Whitelist your domain** before using web checkout (required for production).
8. **Test in sandbox** before deploying to production.

This skill file is built entirely from the Cashfree Payments documentation, covering:

- **Account setup** ([/help/account/overview](https://www.cashfree.com/docs/help/account/overview))
- **Authentication & API keys** ([/api-reference/authentication](https://www.cashfree.com/docs/api-reference/authentication))
- **Environments & base URLs** ([/api-reference/payments/latest/overview](https://www.cashfree.com/docs/api-reference/payments/latest/overview))
- **Sandbox testing** ([/payments/online/resources/sandbox-environment](https://www.cashfree.com/docs/payments/online/resources/sandbox-environment))
- **Integration flow** ([/payments/online/web/redirect](https://www.cashfree.com/docs/payments/online/web/redirect))
- **Best practices & rate limits** ([/api-reference/payments/api-best-practices](https://www.cashfree.com/docs/api-reference/payments/api-best-practices), [/security](https://www.cashfree.com/docs/security))