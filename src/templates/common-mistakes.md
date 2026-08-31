---
name: Cashfree Payment Gateway - Common Integration Mistakes
description: >
  Use when a developer is debugging a failed integration, encountering errors, or asking
  why something isn't working.
  Triggers: payment not working, webhook not received, signature mismatch, order creation failed,
  payment failing, integration error, Cashfree error, 400 error, 401 error, 502 error,
  webhook signature invalid, duplicate webhooks, secret key exposed, sandbox vs production,
  rate limit exceeded, 429 error, payment status wrong, order not paid, callback not firing,
  SDK error, MISSING_CALLBACK, INVALID_WEB_DATA, why is my payment failing, debug Cashfree,
  troubleshoot Cashfree, common mistakes, best practices, go-live checklist, production checklist.
  Use as a diagnostic companion alongside any other Cashfree integration skill.
---

# Cashfree Payment Gateway — Common Integration Mistakes & Pitfalls

---

## 1. Scope & Boundaries

### When to use this skill

- The developer is **debugging a failed or broken integration** — payments failing, webhooks not arriving, signature mismatches, SDK errors, unexpected API responses.
- The developer is asking **"why isn't this working?"** or **"what am I doing wrong?"** in the context of a Cashfree Payment Gateway integration.
- The developer is preparing to **go live** and wants a pre-launch checklist to catch common issues.
- The developer wants to understand **best practices** for security, reliability, and error handling across any Cashfree integration type (Backend SDK, Mobile SDK, S2S REST API, Web Checkout).

### When NOT to use this skill

- If the developer needs **step-by-step integration instructions** — use the Backend SDK, Mobile SDK, S2S REST API, or Web Checkout skill instead. This skill diagnoses problems; those skills build integrations.
- If the question is about **Payouts**, **Subscriptions/Recurring**, **Verification Suite**, or **Secure ID** — those products have their own error handling and troubleshooting patterns.
- If the developer needs help with **Cashfree Dashboard configuration only** (no code) — this skill is not the right fit.

---

## 2. Structural Overview

### How This Skill Is Organized

This skill covers mistakes across **six categories**, matching the layers of a typical Cashfree integration:

| Category | What It Covers |
|---|---|
| **A. Security & Credentials** | Secret key exposure, credential misconfiguration, environment mismatches |
| **B. Order Creation** | Missing required fields, invalid amounts, API version issues |
| **C. Payment Verification** | Trusting frontend callbacks, not checking order status, race conditions |
| **D. Webhook Integration** | Signature mismatches, missed webhooks, duplicate processing, IP whitelisting |
| **E. Mobile SDK** | Callback timing, iOS configuration, Expo/Capacitor issues, Cashfree Integrity |
| **F. Rate Limits & Production Readiness** | Throttling, go-live checklist, domain whitelisting |
| **G. Payouts — IP & Signature Auth** | Multiple account IP mismatch, dynamic IP, signature expiry |

Each mistake follows the format: **What goes wrong → Why it happens → How to fix it**.

---

## 3. Category A: Security & Credential Mistakes

### A1. Exposing `x-client-secret` in frontend or mobile code

**What goes wrong:** The secret key is embedded in JavaScript bundles, mobile app binaries, or client-side code. Attackers extract it and make unauthorized API calls (create fake orders, initiate refunds, access payment data).

**Why it happens:** Developers call `POST /orders` directly from the browser or mobile app instead of routing through their backend.

**How to fix it:**
- **NEVER** include `x-client-secret` in any client-side code — browser JS, React/Vue/Angular bundles, Android/iOS apps, React Native, Flutter, or Cordova.
- Create orders exclusively from your backend server.
- The mobile/web SDK authenticates via `payment_session_id` (a short-lived token), not API keys.
- Store credentials in environment variables or a secrets manager, never hardcoded in source code or committed to version control.

---

### A2. Using sandbox credentials in production (or vice versa)

**What goes wrong:** API calls return `authentication_error` (401) or orders are created in the wrong environment. Payments appear to succeed in sandbox but fail in production.

**Why it happens:** Developers forget to switch credentials and base URLs when deploying.

**How to fix it:**
- Sandbox and production use **different** `x-client-id` / `x-client-secret` pairs and **different** base URLs.
- Use environment variables to manage this:

| Environment | Base URL | SDK Constant |
|---|---|---|
| Sandbox | `https://sandbox.cashfree.com/pg` | `Cashfree.Environment.SANDBOX` |
| Production | `https://api.cashfree.com/pg` | `Cashfree.Environment.PRODUCTION` |

- Never hardcode the environment — derive it from a config variable (`NODE_ENV`, `DJANGO_SETTINGS_MODULE`, etc.).

---

### A3. Hardcoding credentials in source code

**What goes wrong:** Credentials end up in Git repositories, CI/CD logs, or Docker images. Even private repos can be compromised.

**Why it happens:** Quick prototyping habits carry over to production code.

**How to fix it:**
- Use environment variables: `process.env.CASHFREE_APP_ID` (Node.js), `os.environ["CASHFREE_APP_ID"]` (Python), etc.
- Use a secrets manager (AWS Secrets Manager, HashiCorp Vault, GCP Secret Manager) for production.
- Add `.env` files to `.gitignore`.
- Rotate credentials immediately if they've been committed to version control.

---

### A4. Not whitelisting your domain in Merchant Dashboard

**What goes wrong:** Checkout pages fail to load or return CORS/domain errors in production.

**Why it happens:** Domain whitelisting is a Merchant Dashboard configuration step that's easy to overlook.

**How to fix it:**
- Log in to the [Merchant Dashboard](https://merchant.cashfree.com).
- Navigate to Payment Gateway > Settings.
- Add your production domain(s) to the whitelist.
- Websites must include policy pages (Contact Us, Terms and Conditions, Refunds and Cancellations) to qualify for whitelisting.
- The review process takes up to 24 hours.

---

## 4. Category B: Order Creation Mistakes

### B1. Missing required fields in `POST /orders`

**What goes wrong:** API returns `400 Bad Request` with error codes like `customer_id_missing`, `customer_phone_missing`, or `order_amount_invalid`.

**Why it happens:** Developers omit required fields or pass them in the wrong format.

**How to fix it:** These four fields are **always required**:

| Field | Type | Rules |
|---|---|---|
| `order_amount` | float | Must be > 0, max 1,000,000 |
| `order_currency` | string | e.g., `"INR"` |
| `customer_details.customer_id` | string | Unique customer identifier |
| `customer_details.customer_phone` | string | Valid 10-digit Indian phone number |

---

### B2. Invalid or missing `x-api-version` header

**What goes wrong:** API returns `version_missing` (400) or returns responses in an unexpected format.

**Why it happens:** The header is omitted, misspelled, or set to an outdated version.

**How to fix it:**
- Always include `x-api-version: 2025-01-01` (latest) in every API call.
- In SDK calls, pass `"2025-01-01"` as the first parameter to every method.
- Use the same version consistently across all API calls and webhook configurations.

---

### B3. Not storing `payment_session_id` after order creation

**What goes wrong:** The developer creates an order but doesn't persist the `payment_session_id`, so they can't proceed to checkout.

**Why it happens:** The response is logged but not stored, or the frontend/mobile app doesn't receive it.

**How to fix it:**
- After calling `POST /orders` (or `PGCreateOrder`), extract and store both `payment_session_id` and `order_id`.
- Send both values to your frontend/mobile app via your own API response.
- `payment_session_id` is required for the Order Pay API (S2S) and for all mobile/web SDK checkout flows.

---

### B4. Order amount exceeds maximum

**What goes wrong:** API returns `order_amount_invalid` (400).

**Why it happens:** The amount exceeds the 1,000,000 limit.

**How to fix it:** Keep `order_amount` at or below 1,000,000. For larger amounts, contact Cashfree support.

---

## 5. Category C: Payment Verification Mistakes

### C1. Fulfilling orders based on frontend callbacks alone

**What goes wrong:** Orders are fulfilled for payments that actually failed, are pending, or were spoofed. This is the **single most dangerous mistake** in any payment integration.

**Why it happens:** Developers treat the `return_url` redirect, the `onVerify` mobile SDK callback, or the Checkout JS `onSuccess` callback as proof of payment.

**How to fix it:**
- **ALWAYS** verify payment status from your backend by calling `GET /orders/{order_id}` (or `PGFetchOrder`).
- Only fulfill when `order_status` is `"PAID"`.
- Frontend callbacks and return URLs are **hints**, not guarantees. They can be spoofed, arrive out of order, or fail to fire.
- Implement a dual-verification approach: check both the backend API response AND the webhook notification.

**Order status values:**

| Status | Meaning | Action |
|---|---|---|
| `PAID` | Payment succeeded | Safe to fulfill |
| `ACTIVE` | Awaiting payment | Do NOT fulfill |
| `EXPIRED` | Order expired | Do NOT fulfill |

---

### C2. Not handling all payment status values

**What goes wrong:** The application only checks for `SUCCESS` and ignores other states, leading to stuck orders or incorrect user messaging.

**Why it happens:** Developers only test the happy path.

**How to fix it:** Handle all payment-level statuses:

| Status | What to Do |
|---|---|
| `SUCCESS` | Fulfill the order |
| `FAILED` | Show failure message, allow retry |
| `PENDING` | Show "processing" message, poll or wait for webhook |
| `NOT_ATTEMPTED` | User hasn't tried paying yet |
| `USER_DROPPED` | User abandoned checkout — send a reminder or allow retry |
| `CANCELLED` | Amount reversed — do not fulfill |
| `VOID` | Pre-auth not captured — do not fulfill |

> The full `payment_status` enum is `SUCCESS`, `NOT_ATTEMPTED`, `FAILED`, `USER_DROPPED`, `VOID`, `CANCELLED`, `PENDING`. There is no `FLAGGED` status.

---

### C3. Race condition between return URL and webhook

**What goes wrong:** The user lands on the return URL before the webhook arrives, or the webhook arrives before the return URL handler runs. The application shows inconsistent status.

**Why it happens:** Webhooks and return URL redirects are asynchronous and independent.

**How to fix it:**
- Design your system so that **either** the return URL handler **or** the webhook can trigger fulfillment — whichever arrives first.
- Use your database as the source of truth. Both the return URL handler and the webhook handler should call `GET /orders/{order_id}` and update the same order record.
- Implement idempotency so processing the same order twice is safe.

---

### C4. Branching on error message strings instead of error codes

**What goes wrong:** Code compares against the human-readable failure text — e.g. `if (error_description === "Your card was declined by the bank")` or `if (msg.includes("insufficient funds"))`. The message wording then changes in a later API/SDK version (or differs by issuer/locale), the comparison silently stops matching, and the failure-handling branch (retry, fallback mode, user messaging) breaks in production with no error thrown.

**Why it happens:** The description string is the most visible field in the response, so developers reach for it. The machine-readable `error_code` looks less friendly and gets ignored.

**How to fix it:** Branch **only** on the stable, machine-readable fields. Treat description text as display-only — log it, show it to the user, but never make a control-flow decision on it.

A payment failure carries four `error_details` fields. Three are stable, machine-readable contract; one is free text:

| Field | Use for control flow? | Example values |
|---|---|---|
| `error_code` | ✅ yes — precise code | `issuer_declined`, `instrument_id_expired`, `cryptogram_expired` |
| `error_reason` | ✅ yes — category | `bank_declined`, `insufficient_funds` |
| `error_source` | ✅ yes — origin | `bank`, `cashfree`, `user` |
| `error_description` | ❌ **no** — display/log only | "Card issuer did not support tokenization" |

```js
// ❌ Fragile — breaks the moment Cashfree rewords the message
if (err?.error_description?.includes("declined")) { ... }

// ✅ Stable — error_code / error_reason / error_source are part of the API contract
const err = payment.error_details;
if (err?.error_reason === "insufficient_funds") { suggestLowerAmount(); }
else if (err?.error_code === "issuer_declined")  { promptRetryDifferentCard(); }
else if (err?.error_source === "user")           { allowRetry(); }      // user-side, retryable
// error_description is for the UI / logs only:
log.info(err?.error_description);
```

> Full decline-code catalog: `pg/apis/references/REFERENCE.md` §5, and the official list at https://www.cashfree.com/docs/api-reference/payments/errors.

Apply the same rule to every status-like field:

| Branch on (stable, contracted) | Never branch on (display-only, mutable) |
|---|---|
| `order_status`, `payment_status`, `transaction_status` | any "*_message" / "*_description" / "*_note" |
| `error_details.error_code`, `error_reason`, `error_source` | `error_details.error_description` |
| refund `refund_status`, dispute `dispute_status` | reason / remarks free-text |
| webhook `type` + the typed `error_code` | webhook human-readable summary text |

Rule of thumb: **codes and enums are the contract; descriptions are documentation.** If you find yourself string-matching a description, there is almost always a code field carrying the same signal — use that instead. This also keeps your integration forward-compatible across API-version and SDK upgrades.

---

## 6. Category D: Webhook Mistakes

### D1. Webhook signature verification fails (signature mismatch)

**What goes wrong:** Your signature verification code always returns `false`, even for legitimate Cashfree webhooks.

**Why it happens (most common causes):**

1. **Using parsed JSON instead of raw body.** This is the #1 cause. When you parse the JSON body and re-serialize it, decimal values change (e.g., `170.00` → `170`), field ordering changes, or whitespace changes — all of which break the signature.
2. **Using the wrong secret key.** Sandbox and production have different keys.
3. **Middleware parsing the body before your handler.** Express `body-parser`, Django middleware, Spring Boot auto-deserialization, etc.

**How to fix it:**
- **Always use the raw request body** (the exact bytes received) for signature verification.
- In Express.js: use `express.raw({ type: "application/json" })` on the webhook route, NOT `express.json()`.
- In Flask: use `request.data.decode('utf-8')`, not `request.json`.
- In Java/Spring Boot: read from `HttpServletRequest.getReader()`, not from a `@RequestBody` parameter.
- In PHP: use `file_get_contents('php://input')`.
- Use the SDK's built-in `PGVerifyWebhookSignature` method when available — it handles this correctly.

**Verification process:**
1. Extract `x-webhook-timestamp` from headers.
2. Concatenate: `timestamp + rawBody`.
3. Generate HMAC-SHA256 hash using your `x-client-secret`.
4. Base64-encode the hash.
5. Compare with `x-webhook-signature` header.

---

### D2. Webhooks not being received at all

**What goes wrong:** Your webhook endpoint never gets called by Cashfree.

**Why it happens:**

1. **The webhook endpoint is not configured.** You haven't added it in Dashboard > Developers > Webhooks.
2. **The required event is not subscribed.** You configured the URL but didn't select the specific events (e.g., `PAYMENT_SUCCESS_WEBHOOK`).
3. **The endpoint returns a 500 error or doesn't respond.** Cashfree's test POST during setup fails.
4. **Firewall blocks Cashfree's IPs.** Your server rejects requests from Cashfree's IP addresses.
5. **The endpoint is not publicly accessible.** Localhost, private networks, or VPN-only URLs won't work.

**How to fix it:**
- Configure webhooks in Dashboard > Developers > Webhooks > Add Webhook Endpoint.
- Subscribe to the specific events you need.
- Ensure your endpoint is publicly accessible over HTTPS.
- Whitelist Cashfree's IPs:

| Environment | IPs |
|---|---|
| Sandbox | `52.66.25.127`, `15.206.45.168` |
| Production | `52.66.101.190`, `3.109.102.144`, `18.60.134.245`, `18.60.183.142` |

- Port: 443 (HTTPS only).
- Check webhook logs in Dashboard > Developers > Webhooks > Logs tab.
- Use "Batch Resend" in the dashboard to resend missed webhook events.

---

### D3. Processing duplicate webhook events

**What goes wrong:** The same payment is fulfilled twice, refunds are doubled, or inventory is decremented multiple times.

**Why it happens:**
- Cashfree retries webhooks when your endpoint returns a non-200 response or times out.
- Server downtime causes retries.
- Multiple webhook subscriptions to the same event across different URLs or versions.

**How to fix it:**
- **Implement idempotency.** Use the `x-idempotency-key` header (available in webhook versions from 2025-01-01) to deduplicate. Store processed webhook IDs and skip duplicates.
- **Always return HTTP 200** immediately upon receiving a webhook, even if you process it asynchronously.
- Check for duplicate event subscriptions in Dashboard > Developers > Webhooks — remove any redundant configurations.
- Design your fulfillment logic to be idempotent: processing the same event twice should have no additional effect.

---

### D4. Not returning HTTP 200 from webhook endpoint

**What goes wrong:** Cashfree keeps retrying the webhook, causing duplicate deliveries and potential rate limiting.

**Why it happens:** The endpoint throws an unhandled exception, returns a 500, or takes too long to respond.

**How to fix it:**
- Return HTTP 200 **immediately** after receiving and validating the webhook.
- Process the webhook payload **asynchronously** (queue it for background processing) if your business logic takes time.
- Wrap your webhook handler in a try-catch to prevent unhandled exceptions from returning 500s.

---

### D5. Webhook endpoint not using HTTPS

**What goes wrong:** Cashfree rejects the endpoint or webhook data is transmitted insecurely.

**Why it happens:** Development environments often use HTTP.

**How to fix it:**
- All webhook endpoints **must** use HTTPS in production.
- Use a valid SSL certificate (Let's Encrypt is free).
- For local development, use a tunneling tool (ngrok, localtunnel) that provides HTTPS.

---

## 7. Category E: Mobile SDK Mistakes

### E1. Setting callback AFTER calling `doPayment()`

**What goes wrong:** The callback is never fired. The app doesn't receive the payment result. The user sees a blank screen or gets stuck.

**Why it happens:** The developer calls `doPayment()` before registering the callback.

**How to fix it:**
- **Always register the callback BEFORE calling `doPayment()`.**
- Register in the correct lifecycle method:

| Platform | Where to Register |
|---|---|
| Android | `onCreate()` |
| iOS | `viewDidLoad()` |
| Flutter | `initState()` |
| React Native | `componentDidMount()` |
| Cordova | `onDeviceReady()` |

---

### E2. Callback lost on activity/view restart (Android)

**What goes wrong:** After screen rotation or the OS killing the activity in the background, the callback is gone. The payment completes but the app doesn't know.

**Why it happens:** The callback is set in a method that doesn't re-execute on activity recreation.

**How to fix it:**
- Set the callback in `onCreate()`, which runs on every activity creation (including restarts).
- Implement `CFCheckoutResponseCallback` on the Activity class itself.

---

### E3. Missing `LSApplicationQueriesSchemes` in iOS `info.plist`

**What goes wrong:** UPI apps are not detected on iOS. The UPI Intent checkout shows no apps. UPI payments fail silently.

**Why it happens:** iOS requires explicit declaration of URL schemes your app queries.

**How to fix it:** Add to `info.plist`:
```xml
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>amazonpay</string>
    <string>upi</string>
    <string>credpay</string>
    <string>bhim</string>
    <string>paytmmp</string>
    <string>phonepe</string>
    <string>tez</string>
    <string>navipay</string>
    <string>mobikwik</string>
    <string>myairtel</string>
    <string>popclubapp</string>
    <string>super</string>
    <string>kiwi</string>
    <string>simplypayupi</string>
    <string>whatsapp</string>
</array>
```

This applies to **all** iOS-targeting SDKs: native iOS, Flutter, React Native, and Cordova.

---

### E4. Using Expo Go instead of a dev client build

**What goes wrong:** The Cashfree SDK crashes or doesn't load in Expo Go.

**Why it happens:** Cashfree's React Native SDK uses native modules that Expo Go doesn't support.

**How to fix it:**
```bash
npx expo prebuild  # mandatory
npx expo run:android
npx expo run:ios
```
Use `expo-dev-client` for development builds, not Expo Go.

---

### E5. Cashfree Integrity blocks production payments (sideloaded APK)

**What goes wrong:** Production payments fail with:
```json
{
  "message": "com.google.android.packageinstaller is not a trusted source. App should be installed from play store or another whitelisted app store.",
  "code": "installer_package_not_approved",
  "type": "feature_not_enabled"
}
```

**Why it happens:** In production, Cashfree verifies that the app was installed from a trusted app store (Google Play, App Store, Samsung Galaxy Store, etc.). Sideloaded APKs fail this check.

**How to fix it:**
1. Upload your app to the **Play Store Internal Testing** track.
2. Create a tester email list in Play Console > Internal Testing > Testers.
3. Share the invitation link with testers.
4. Testers install the app from the Play Store.
5. In **Sandbox**, integrity checks always pass — this only affects production.

**Affected SDKs:** Android, React Native, Flutter, Cordova, Ionic, Capacitor.

---

### E6. Not running `pod install --repo-update` after adding iOS dependencies

**What goes wrong:** iOS build fails with "module not found" or "no such module" errors.

**Why it happens:** CocoaPods cache is stale or the new dependency isn't resolved.

**How to fix it:**
```bash
cd ios
pod install --repo-update
```
Run this after every dependency change for Flutter, React Native, and Cordova iOS builds.

---

### E7. Using the Cordova plugin under Capacitor

**What goes wrong:** The Cordova plugin doesn't work cleanly with Capacitor.

**Why it happens:** `cordova-plugin-cashfree-pg` is built for Cordova. Capacitor (7+) has its own dedicated plugin.

**How to fix it:**
```bash
# For Capacitor 7+ — use the dedicated Capacitor plugin
npm install capacitor-plugin-cashfree-pg cashfree-pg-api-contract
npx cap sync

# NOT this (this is for Cordova only):
npm install cordova-plugin-cashfree-pg
```

---

### E8. Not removing callback in React Native `componentWillUnmount`

**What goes wrong:** Memory leak. Stale callbacks may fire on unmounted components, causing React Native warnings or crashes.

**How to fix it:**
```typescript
componentWillUnmount() {
  CFPaymentGatewayService.removeCallback();
}
```

---

## 7.5. Category E.5: Web SDK — checkout result handling & init mistakes

### E.5.1. Treating `result.error` from `cashfree.checkout({ redirectTarget: "_modal" })` as "payment failed"

**What goes wrong:** App toasts "Payment failed. Please try again." every time the user closes the Cashfree modal — even when they just changed their mind.

**Why it happens:** `result.error` fires for **three** things: SDK errors, network errors, AND the user dismissing the modal. The code treated it as a single failure signal.

**Fix:** Handle all three resolution states. `result.error` → "Payment was not completed" (neutral), `result.redirect` → the page is navigating (stop), `result.paymentDetails` → an attempt was made (backend-verify before fulfilling). See `pg/web-sdk/SKILL.md` §3 for the full pattern.

### E.5.2. Mounting Cashfree Elements then calling `cashfree.checkout()` to "submit"

**What goes wrong:** App mounts `cardNumber` / `cardCvv` / `cardExpiry` / `cardHolder`. On submit, it calls `cashfree.checkout({ redirectTarget: "_modal" })`. A Drop-in modal opens that **ignores the card form the user just filled in**.

**Why it happens:** The two paths (Drop-in vs Elements) are mutually exclusive but look similar to AI agents and the docs sometimes show both in the same file.

**Fix:** Elements forms **must** submit via `cashfree.pay({ paymentMethod: cardNumber, paymentSessionId })`. `cashfree.checkout()` is for Drop-in only. See the Web SDK decision matrix in `pg/web-sdk/SKILL.md` §2.

### E.5.3. Initializing `Cashfree({ mode })` inside a click handler

**What goes wrong:** A new SDK instance is created on every checkout click. Memory grows, instance state is lost, certain SDK features (event listeners, saved-card cache) behave inconsistently between attempts.

**Fix:** Call `Cashfree({ mode })` **once** at module / page load. The returned instance is reusable across multiple `.checkout()` / `.pay()` calls.

### E.5.4. Dead `?order_id` redirect-handler in a `_modal`-only app

**What goes wrong:** A `DOMContentLoaded` listener reads `?order_id` from the URL and calls `verifyOrder`. The app uses `redirectTarget: "_modal"` everywhere — Cashfree never navigates the browser, so this block is unreachable.

**Fix:** Delete it. The block is only needed for `_self` / `_top` redirect modes. Leaving it in misleads future maintainers (and AI agents) into thinking two flows are supported when only one is.

---

## 7.6. Category E.6: Backend SDK — legacy version-arg & `return_url` traps

### E.6.1. Inconsistent `x_api_version` in the legacy version-first style

**What goes wrong:**

```python
cashfree_client.PGCreateOrder('2025-01-01', payload)   # ok
cashfree_client.PGFetchOrder(order_id)                  # ❌ missing version
```

**Why it happens:** In the static/legacy call style, the SDK requires the version as the first positional arg on **every** method. AI agents often apply it to `PGCreateOrder` and forget the rest.

**Fix:** Pick **one** style per client. Either pass `'2025-01-01'` first on **every** method (static/legacy style), or use the instance style (`new Cashfree(env, id, secret)`) and omit the version everywhere. Mixing the two is the most common migration bug. See `pg/backend-sdks/SKILL.md` §2.

### E.6.2. `return_url` with literal `{order_id}` inside a Python f-string

**What goes wrong:**

```python
return_url = f"http://localhost:{PORT}/return/{{order_id}}"
# Sent to Cashfree: http://localhost:5000/return/{order_id}  (literal braces)
# Flask route /return/<order_id> tries to match the string "{order_id}" as the path param → 404 / wrong handler
```

**Why it happens:** `{order_id}` is a Cashfree server-side substitution token. Inside a Python f-string, `{...}` is also interpolation syntax. Escaping as `{{order_id}}` produces a literal `{order_id}` in the URL — which Flask's route converter then can't match.

**Fix:** Use a **static** `return_url` (`https://yoursite.com/return`) — Cashfree appends `?order_id=ORDER_ID` automatically. Read it on the handler with `request.args.get('order_id')`. Avoid the `{order_id}` token unless you really want server-side substitution, and never wrap it in an f-string. See `pg/backend-sdks/SKILL.md` §4 Step 1.

---

## 8. Category F: Rate Limits & Production Readiness

### F1. Hitting rate limits (429 Too Many Requests)

**What goes wrong:** API returns `429 Too Many Requests`. Payments fail during peak traffic.

**Why it happens:** Your application exceeds the per-minute request limits.

**Production rate limits:**

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

**Sandbox limits are lower** (e.g., Create Order: 30/min).

**How to fix it:**
- Implement **exponential backoff** for retries.
- Monitor rate limit response headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.
- Cache responses where applicable (e.g., don't poll `GET /orders` every second).
- For UPI collect/bank transfer polling, use 3–5 second intervals, not faster.
- Request rate limit increases via Merchant Dashboard > Payment Gateway > Developers > Rate Limits, or contact your account manager.

---

### F2. Polling too frequently for async payment status

**What goes wrong:** Rate limits are hit. The application gets throttled.

**Why it happens:** Developers poll `GET /orders/{order_id}/payments` every 500ms for UPI collect or bank transfer status.

**How to fix it:**
- Poll every **3–5 seconds**, not faster.
- Stop polling when you receive a terminal status: `SUCCESS`, `FAILED`, or `USER_DROPPED`.
- Better yet, rely on **webhooks** as the primary notification mechanism and use polling only as a fallback.

---

### F3. Not setting timeouts on HTTP calls

**What goes wrong:** Your server hangs indefinitely waiting for a Cashfree API response, blocking threads and degrading performance.

**Why it happens:** No timeout configured on the HTTP client.

**How to fix it:**
- Set a **10-second timeout** for the Order Pay API (especially for Native OTP, which depends on bank ACS load time).
- Set a **5–10 second timeout** for all other API calls.
- Implement retry logic with exponential backoff for transient failures.

---

## 9. Category G: Payouts — IP Whitelisting & Signature Auth Mistakes

### G1. Signature mismatch despite IP being whitelisted (multiple Payout accounts)

**What goes wrong:** The Payout API returns `signature mismatch` or authentication errors even though you've already whitelisted your server's IP.

**Why it happens:** Cashfree Payouts allows merchants to have **multiple Payout accounts**. IP whitelisting is configured **per account**. If you whitelist the IP on Account A but make API calls using the `client_id` / `client_secret` of Account B, authentication fails — the IP is unknown to Account B.

**How to fix it:**
- Log in to the Cashfree Merchant Dashboard for **each Payout account separately**.
- Navigate to Payouts > Settings > IP Whitelisting and whitelist your server IP in **every account** that your API keys belong to.
- Double-check that the `client_id` in your request matches the account where the IP is whitelisted.
- If you have staging and production Payout accounts, whitelist your IPs in both.

---

### G2. Whitelisting a dynamic IP — IP changes and breaks authentication

**What goes wrong:** Payouts API authentication works initially but then suddenly starts failing with IP-related errors days or weeks later, with no code changes.

**Why it happens:** Two types of IPs exist:
- **Static IP** — fixed, never changes. Required for Cashfree IP whitelisting.
- **Dynamic IP** — assigned by the ISP or cloud provider and can change at any time (common with home internet, shared hosting, or auto-scaled cloud instances without Elastic IP).

The developer whitelisted a dynamic IP that happened to be assigned to their server at that moment. When the IP rotated, Cashfree's whitelist no longer matched the new IP, and authentication started failing.

**How to fix it:**
- Use a **static IP** for any server making Payout API calls.
- On AWS: assign an **Elastic IP** to your EC2 instance or NAT Gateway.
- On GCP: reserve a **static external IP** for your compute resource.
- On Azure: use a **static public IP** address.
- For office networks: contact your ISP to provision a fixed/static IP.
- After getting a static IP, update the whitelist in the Cashfree Payout Dashboard and remove the old dynamic IP entry.

---

### G3. Payout signature expires — not regenerating within the 10-minute window

**What goes wrong:** Payout API calls start returning authentication errors after the application has been running for a while. The error typically indicates an invalid or expired token/signature.

**Why it happens:** In the Payouts V1 flow, the signature is generated using an **RSA public key** and is valid for only **10 minutes**. If your application generates the signature once at startup (or caches it indefinitely), it expires and all subsequent API calls fail.

**How to fix it:**
- **Regenerate the signature before every API call**, or at most cache it for fewer than 10 minutes.
- In the V1 auth flow: call `POST /payout/v1/authorize` to get a new token regularly.
- Implement a token refresh mechanism — on receiving a `401` or `token_expired` error, re-authenticate immediately before retrying the request.
- Prefer the **V2 Payout API** (direct `client_id` + `client_secret` headers) which does not use a time-limited RSA-signed token.

---

## 10. Pre-Production Go-Live Checklist

Run through this checklist before switching from sandbox to production:

### Credentials & Environment
- [ ] Production `x-client-id` and `x-client-secret` are configured (not sandbox credentials).
- [ ] SDK environment is set to `PRODUCTION` (not `SANDBOX`).
- [ ] Base URL is `https://api.cashfree.com/pg` (not `https://sandbox.cashfree.com/pg`).
- [ ] Credentials are stored in environment variables or a secrets manager, not hardcoded.
- [ ] `x-client-secret` is NOT present in any frontend or mobile app code.

### Domain & Dashboard
- [ ] Your production domain is whitelisted in Merchant Dashboard.
- [ ] Website includes required policy pages (Contact Us, Terms & Conditions, Refunds & Cancellations).

### Order Creation
- [ ] `x-api-version: 2025-01-01` is set on all API calls.
- [ ] All required fields are provided: `order_amount`, `order_currency`, `customer_details.customer_id`, `customer_details.customer_phone`.
- [ ] `payment_session_id` is stored and passed to frontend/mobile SDK.

### Payment Verification
- [ ] Backend calls `GET /orders/{order_id}` to verify `order_status: "PAID"` before fulfilling.
- [ ] Frontend callbacks (`onVerify`, `onSuccess`, `return_url`) are NOT used as sole proof of payment.
- [ ] All payment statuses are handled (`SUCCESS`, `FAILED`, `PENDING`, `NOT_ATTEMPTED`, `USER_DROPPED`, `CANCELLED`, `VOID`).

### Webhooks
- [ ] Webhook endpoint is configured in Dashboard > Developers > Webhooks.
- [ ] Required events are subscribed (`PAYMENT_SUCCESS_WEBHOOK`, `PAYMENT_FAILED_WEBHOOK`, etc.).
- [ ] Webhook endpoint uses HTTPS.
- [ ] Webhook signature verification is implemented using raw body (not parsed JSON).
- [ ] Cashfree IPs are whitelisted: `52.66.101.190`, `3.109.102.144`, `18.60.134.245`, `18.60.183.142`.
- [ ] Endpoint returns HTTP 200 immediately.
- [ ] Idempotency is implemented to handle duplicate webhook deliveries.

### Mobile SDK (if applicable)
- [ ] iOS `info.plist` includes `LSApplicationQueriesSchemes` for UPI apps.
- [ ] Callbacks are registered in the correct lifecycle method (`onCreate`, `viewDidLoad`, `initState`, `componentDidMount`, `onDeviceReady`).
- [ ] Callbacks are registered BEFORE `doPayment()` is called.
- [ ] For React Native: callback is removed in `componentWillUnmount`.
- [ ] For Expo: `npx expo prebuild` has been run.
- [ ] For production Android testing: app is distributed via Play Store Internal Testing track (not sideloaded).

### Error Handling & Resilience
- [ ] All SDK/API calls are wrapped in try-catch blocks.
- [ ] HTTP timeouts are configured (10s for Order Pay, 5–10s for others).
- [ ] Rate limit headers are monitored; exponential backoff is implemented for retries.
- [ ] Async payment methods (UPI collect, bank transfer) are polled at 3–5 second intervals.
- [ ] All API error responses are logged for debugging and audit trails.

### Security
- [ ] Webhook signature verification is mandatory and implemented.
- [ ] SSL certificate is valid on webhook endpoint.
- [ ] Cashfree Integrity is accounted for (Android production apps installed from trusted stores).
- [ ] 2FA is enabled on Merchant Dashboard account.

---

## 11. Quick Diagnostic: "My Payment Isn't Working"

Use this decision tree when a developer says "it's not working":

1. **Is the API returning an error?**
   - If `401 authentication_error` → Check credentials. Are you using the right environment's keys? (See A2)
   - If `400 version_missing` → Add `x-api-version: 2025-01-01` header. (See B2)
   - If `400` with a field-specific error → Check required fields. (See B1)
   - If `429 Too Many Requests` → You're rate limited. Implement backoff. (See F1)
   - If `502 bank_processing_failure` → Bank-side issue. Retry or try a different payment method.

2. **Is the order created but checkout doesn't open?**
   - Did you pass `payment_session_id` to the frontend/mobile SDK? (See B3)
   - Is the domain whitelisted? (See A4)
   - Is the SDK environment set correctly? (See A2)

3. **Does checkout open but payment fails?**
   - Check the specific error code in the response.
   - For card payments: Is PCI DSS enabled (S2S only)? Are card details valid?
   - For UPI: Is the VPA valid? Is the expiry within 5–15 minutes?
   - For mobile: Is `LSApplicationQueriesSchemes` configured (iOS)? (See E3)

4. **Payment seems to succeed but order isn't fulfilled?**
   - Are you verifying from the backend? (See C1)
   - Is `order_status` actually `"PAID"`? Check via `GET /orders/{order_id}`.
   - Is there a race condition between return URL and webhook? (See C3)

5. **Webhooks aren't arriving?**
   - Is the endpoint configured in the dashboard? (See D2)
   - Are the right events subscribed?
   - Is the endpoint publicly accessible over HTTPS?
   - Are Cashfree IPs whitelisted? (See D2)
   - Check Dashboard > Developers > Webhooks > Logs.

6. **Webhook signature verification fails?**
   - Are you using the raw body or parsed JSON? (See D1 — this is the #1 cause)
   - Are you using the correct secret key for the environment?
   - Is middleware parsing the body before your handler?

7. **Mobile SDK callback not firing?**
   - Is the callback registered BEFORE `doPayment()`? (See E1)
   - Is it in the correct lifecycle method? (See E1)
   - For React Native: is the callback removed in `componentWillUnmount`? (See E8)

8. **Production payments blocked on Android?**
   - Is the app sideloaded? Use Play Store Internal Testing. (See E5)

9. **Payout API failing with signature mismatch or auth error?**
   - Is your server using a static IP? Dynamic IPs change and break whitelist. (See G2)
   - Do you have multiple Payout accounts? The IP must be whitelisted in the account whose API keys you're using. (See G1)
   - Is the RSA-signed token older than 10 minutes? Regenerate it. (See G3)

---

## 12. Useful Links

- [Troubleshooting Overview](https://www.cashfree.com/docs/api-reference/integration-troubleshooting/overview-ts)
- [Webhook Troubleshooting](https://www.cashfree.com/docs/payments/online/webhooks/troubleshooting)
- [Webhook Security Checklist](https://www.cashfree.com/docs/payments/online/webhooks/security-checklist)
- [Webhook Signature Verification](https://www.cashfree.com/docs/payments/online/webhooks/signature-verification)
- [Rate Limits](https://www.cashfree.com/docs/api-reference/rate-limits)
- [Security Features](https://www.cashfree.com/docs/security)
- [Payment Monitoring & Troubleshooting](https://www.cashfree.com/docs/payments/quick-guide/payment)
- [Cashfree Integrity (Production Testing)](https://www.cashfree.com/docs/payments/online/mobile/misc/cashfree_integrity_prod_testing)
- [Integration FAQs](https://www.cashfree.com/docs/payments/online/mobile/integration-faqs)
