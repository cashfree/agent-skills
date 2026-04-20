---
name: Cashfree Payment Gateway - Go-Live Reference
description: >
  Reference material for the Go-Live skill. Read this when you need:
  detailed domain/app whitelisting rules and requirements, mobile production testing
  (Cashfree Integrity), decision rules for environment and credential management,
  common go-live mistakes, production rate limits, or API best practices.
  Always read go-live/SKILL.md first for the step-by-step go-live workflow.
---

# Cashfree Payment Gateway — Go-Live Reference

> This document is in `references/` — file name `REFERENCE.md`. Read `../SKILL.md` first for the step-by-step go-live workflow.

---

## 1. Domain & App Whitelisting — Detailed Rules

### Website Domain Rules

| Example | Status | Notes |
|---|---|---|
| `https://www.yoursite.com` | Allowed | HTTPS required |
| `https://www.yoursite.com/` | Allowed | Trailing slash permitted |
| `https://www.yoursite.com/checkout` | Allowed | HTTPS with path allowed |
| `www.yoursite.com` | **Not allowed** | Missing HTTPS protocol |
| `http://www.yoursite.com` | **Not allowed** | HTTP not secure enough |
| `https://www.yoursite.com:8000/` | **Not allowed** | Custom ports not supported |
| `https://sandbox.cashfree.com` | **Not allowed** | Sandbox/test environments not allowed |

### Website Requirements for Approval

- Must have a **Contact Us** page.
- Must have **Terms and Conditions** page.
- Must have **Refunds and Cancellations** page.
- Products or services should be listed.
- Product or service pricing should be in Indian Rupees (INR).

### Mobile App Rules

| Example | Status | Notes |
|---|---|---|
| `https://play.google.com/store/apps/details?id=com.yourapp` | Allowed | Google Play Store link |
| `https://apps.apple.com/in/app/your-app/id123456` | Allowed | Apple App Store link |
| `com.yourapp.package` | **Not allowed** | Package name alone not accepted |
| Third-party APK/IPA links | **Not allowed** | Must be official stores |
| Shortened/redirected URLs | **Not allowed** | Destination cannot be verified |

**Processing time:** Most whitelisting requests are reviewed within **24 hours**.

---

## 2. Mobile Production Testing (Cashfree Integrity)

When testing in **Production**, apps installed from sources other than the Play Store will be blocked:

```json
{
  "message": "com.google.android.packageinstaller is not a trusted source. App should be installed from play store or another whitelisted app store.",
  "code": "installer_package_not_approved",
  "type": "feature_not_enabled"
}
```

**Affected platforms:** Android, React Native, Flutter, Cordova, Ionic, Capacitor.

**How to test in Production:**

1. Upload your app bundle/APK to the **Play Store Internal Testing** track.
2. Create a tester email list in Play Console > Internal Testing > Testers tab.
3. Share the invitation link with testers.
4. Testers accept the invitation and download the app from the Play Store.
5. Ensure the Android device has **Developer Mode** enabled.

> In Sandbox, integrity checks always pass. This issue only appears in Production.

---

## 3. Post-Code-Change Steps

### Verify Payment Methods Are Enabled

1. Production dashboard → **Payment Gateway > Settings > Payment Methods**.
2. Verify all desired methods are enabled.
3. If any method is missing, contact Cashfree support via the [Support Form](https://merchant.cashfree.com/merchants/landing?env=prod&raise_issue=1).

### Set Up API Alerts and Monitoring

1. Production dashboard → **Payment Gateway > Developers > API Logs and Alerts**.
2. Configure **API Alerts** for error rates and rate limits.

**Recommended alerts:**
- Create Order API error rate > 5% → High severity.
- Pay Order API error rate > 10% → High severity.
- Rate limit remaining < 10% → Medium severity.

### Customize Checkout Branding

Customize via Merchant Dashboard or SDK theme configuration. Clear branding improves conversion.

### Final Verification

Before accepting real payments:

1. **Make a small real payment** (e.g., ₹1) using a real card or UPI ID.
2. **Verify the payment** in the Production dashboard under Transactions.
3. **Verify your webhook endpoint** receives `PAYMENT_SUCCESS_WEBHOOK`.
4. **Verify backend** correctly reads `order_status: "PAID"`.
5. **Process a test refund** to verify refund flow end-to-end.

---

## 4. Decision Rules

### Environment selection

- **Developing or testing** → `SANDBOX` with `TEST_` credentials.
- **Ready for real payments** → `PRODUCTION` with `PROD_` credentials.
- **Testing production mobile app** → Play Store Internal Testing track.

### Credential management

- **Backend SDK** → Change environment constant + credential values. SDK handles base URL.
- **Raw HTTP calls** → Change base URL (`sandbox.cashfree.com` → `api.cashfree.com`) AND credentials.
- **Mobile SDK** → Change only environment constant in `CFSession`. Mobile SDK doesn't use API credentials.

### Webhook configuration

- **Endpoint behind firewall** → Update IP whitelist from sandbox to production IPs.
- **Publicly accessible endpoint** → Still configure webhook URL in Production dashboard (doesn't carry over).
- **Signature verification failing** → Ensure production `x-client-secret` and raw request body.

### Domain whitelisting

- **Website** → Whitelist HTTPS domain. No HTTP, no custom ports.
- **Mobile app** → Whitelist official store listing URL. Package names alone not accepted.
- **Whitelisting pending** → Standard within 24 hours. Use support form for urgent requests.

### Payment methods

- **Method works in sandbox but not production** → Check Production dashboard > Settings > Payment Methods.
- **PayPal or bank transfer in sandbox** → Not supported in sandbox; will work in production if enabled.

---

## 5. Common Go-Live Mistakes

| Mistake | Consequence | Fix |
|---|---|---|
| Changed credentials but not environment constant | SDK sends prod creds to sandbox URL (or vice versa) | Update environment constant, credentials, AND base URL together |
| `TEST_` credentials with production URL | `401 authentication_error` on every call | Use `PROD_` credentials from production dashboard |
| `PROD_` credentials with sandbox URL | Sandbox rejects production credentials | Match credentials to correct environment |
| Forgot to whitelist production domain | Checkout page blocked | Whitelist HTTPS domain in Production dashboard |
| HTTP domain instead of HTTPS | Whitelisting rejected | Only HTTPS URLs accepted |
| Forgot webhooks in production dashboard | No notifications for real payments | Configure separately in Production (sandbox doesn't carry over) |
| Webhook IP whitelist still has sandbox IPs | Production webhooks blocked by firewall | Update to: `52.66.101.190`, `3.109.102.144`, `18.60.134.245`, `18.60.183.142` |
| Webhook verification uses sandbox secret | All signatures fail | Use production `x-client-secret` |
| Hardcoded test data in code | Test instruments don't exist in production | Remove all test cards, UPI VPAs, bank codes |
| Sideloading APK for production testing | `installer_package_not_approved` | Use Play Store Internal Testing track |
| KYC not completed | Cannot generate prod keys or process payments | Complete KYC first |
| Payment methods not enabled | Methods fail despite working in sandbox | Enable in Production dashboard > Settings |
| Not verifying payment from backend | Fulfilling failed/pending payments — real financial loss | Always call `GET /orders/{order_id}` before fulfilling |
| Hardcoded `sandbox.cashfree.com` in URLs | Webhooks and redirects go to sandbox | Update all URLs to production domain |
| No API alerts configured | Issues go unnoticed until customers complain | Set up in Dashboard > Developers > API Logs and Alerts |

---

## 6. Production Rate Limits

| API | Limit/min | Type |
|---|---|---|
| Create Order | 200 | Account |
| Get Order | 400 | Account |
| Pay Order | 100 | IP |
| Get Payments | 100 | Account |
| Get Payment by ID | 130 | Account |
| Get Settlements | 30 | Account |
| Initiate Refund | 100 | Account |
| Get Refund | 30 | Account |

Increase via **Merchant Dashboard > Payment Gateway > Developers > Rate Limits**.

---

## 7. API Best Practices for Production

- **Use `Connection: keep-alive`** to reuse HTTP connections and reduce latency.
- **Use webhooks instead of polling** to stay within rate limits.
- **Include `x-request-id`** in every request for debugging and support.
- **Use `x-idempotency-key`** for safe retries on Create Order and Pay Order.
- **Avoid concurrent requests** from the same account — use a queue if needed.
- **Always use the latest API version** (`x-api-version: 2025-01-01`).
