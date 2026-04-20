---
name: Cashfree Payment Gateway - Sandbox to Production Go-Live
description: >
  Use when a developer has completed their Cashfree Payments integration in sandbox
  and needs to go live in production.
  Triggers: go live, go to production, switch to production, sandbox to production,
  deploy to production, production checklist, go-live checklist, launch payments,
  production API keys, whitelist domain, whitelist app, production credentials,
  TEST_ to PROD_, change environment, production mode, live payments, enable production,
  production setup, pre-launch checklist, go live with Cashfree, deploy Cashfree,
  production readiness, live mode, switch from sandbox.
  Use after the developer has a working sandbox integration and wants to accept real payments.
---

# Cashfree Payment Gateway — Sandbox to Production Go-Live

> **References available:** For detailed domain/app whitelisting rules, mobile production testing (Cashfree Integrity), decision rules, common mistakes table, production rate limits, and API best practices — read `references/REFERENCE.md` in this directory.

---

## 1. Scope & Boundaries

### When to use this skill

- The developer has a **working Cashfree Payments integration in sandbox** and wants to switch to production to accept real payments.
- The developer needs to know **what changes in code, configuration, and dashboard settings** when moving from sandbox to production.
- The developer is troubleshooting a **production-specific issue** (domain whitelisting errors, integrity check failures, credential mismatches).
- The developer wants a **pre-launch checklist** to ensure nothing is missed.

### When NOT to use this skill

- If the developer hasn't started integrating yet — use the appropriate integration skill first.
- If debugging a **sandbox-specific issue** — this skill covers production migration only.
- If the question is about **Payouts**, **Subscriptions**, or other non-PG products going live.

---

## 2. What Changes Between Sandbox and Production

| Aspect | Sandbox | Production |
|---|---|---|
| **API Endpoint** | `https://sandbox.cashfree.com/pg` | `https://api.cashfree.com/pg` |
| **API Credentials** | `TEST_` prefix | `PROD_` prefix |
| **KYC** | Not required | Mandatory |
| **Transactions** | Simulated | Real payments |
| **Domain/App Whitelisting** | Not required | Mandatory |
| **Webhook IPs** | `52.66.25.127`, `15.206.45.168` | `52.66.101.190`, `3.109.102.144`, `18.60.134.245`, `18.60.183.142` |
| **Rate Limits** | Lower | Higher |
| **Cashfree Integrity (Mobile)** | Always passes | Blocks sideloaded apps |

### 5 Code/Config Changes Required

1. **API Base URL** — sandbox → production endpoint.
2. **API Credentials** — `TEST_` → `PROD_` keys.
3. **SDK Environment Constant** — `SANDBOX` → `PRODUCTION`.
4. **Webhook IP Whitelist** — sandbox IPs → production IPs.
5. **Test Data Removal** — remove hardcoded test cards, UPI VPAs, bank codes.

### 4 Dashboard Actions Required

1. **Complete KYC** — business verification and document submission.
2. **Generate Production API Keys** — via dashboard with 2FA.
3. **Whitelist Domain or App Package** — your production website or mobile app.
4. **Enable Payment Methods** — verify all desired methods are active.

---

## 3. Go-Live Workflow (Step-by-Step)

Follow these steps in order. Do not skip any step.

### Step 1: Complete KYC and Account Activation

1. Log in to the [Merchant Dashboard](https://merchant.cashfree.com).
2. Switch to **Production** environment (top-right corner).
3. Complete KYC — submit required business documents.
4. Wait for approval.

> You cannot generate production API keys or process live payments until KYC is approved.

### Step 2: Generate Production API Keys

1. Production dashboard → **Payment Gateway > Developers > API Keys**.
2. Click **Generate API Keys**.
3. Complete **2FA authentication**.
4. Download and securely store keys. They start with `PROD_`.

> Store keys in environment variables or a secrets manager — never in source code.

### Step 3: Whitelist Your Domain or App

1. Production dashboard → **Payment Gateway > Developers > Whitelisting**.
2. Click **Add New**.
3. Select **Domain name** (websites) or **App package** (mobile apps).
4. Enter the value and confirm.

**Key rules:**
- Websites: HTTPS required. No HTTP, no custom ports, no sandbox URLs.
- Mobile apps: Official Play Store or App Store listing URL only. Package names alone not accepted.
- Processing time: typically within **24 hours**.

> For detailed whitelisting rules and website requirements, see `references/REFERENCE.md`.

### Step 4: Update Code — Credentials and Environment

**Backend SDK:**

<details>
<summary>Node.js</summary>

```javascript
import { Cashfree, CFEnvironment } from "cashfree-pg";

// BEFORE (Sandbox)
const cashfree = new Cashfree(
  CFEnvironment.SANDBOX,
  "TEST_xxxxxxxxxxxxx",
  "TEST_xxxxxxxxxxxxx"
);

// AFTER (Production)
const cashfree = new Cashfree(
  CFEnvironment.PRODUCTION,
  process.env.CASHFREE_APP_ID,       // "PROD_xxxxxxxxxxxxx"
  process.env.CASHFREE_SECRET_KEY    // "PROD_xxxxxxxxxxxxx"
);
```
</details>

<details>
<summary>Python</summary>

```python
# BEFORE (Sandbox)
Cashfree.XClientId = "TEST_xxxxxxxxxxxxx"
Cashfree.XClientSecret = "TEST_xxxxxxxxxxxxx"
Cashfree.XEnvironment = Cashfree.SANDBOX

# AFTER (Production)
import os
Cashfree.XClientId = os.environ["CASHFREE_APP_ID"]         # "PROD_xxxxxxxxxxxxx"
Cashfree.XClientSecret = os.environ["CASHFREE_SECRET_KEY"]  # "PROD_xxxxxxxxxxxxx"
Cashfree.XEnvironment = Cashfree.PRODUCTION
```
</details>

<details>
<summary>Java</summary>

```java
// BEFORE (Sandbox)
Cashfree.XClientId = "TEST_xxxxxxxxxxxxx";
Cashfree.XClientSecret = "TEST_xxxxxxxxxxxxx";
Cashfree.XEnvironment = Cashfree.SANDBOX;

// AFTER (Production)
Cashfree.XClientId = System.getenv("CASHFREE_APP_ID");
Cashfree.XClientSecret = System.getenv("CASHFREE_SECRET_KEY");
Cashfree.XEnvironment = Cashfree.PRODUCTION;
```
</details>

<details>
<summary>Go</summary>

```go
// BEFORE (Sandbox)
clientId := "TEST_xxxxxxxxxxxxx"
clientSecret := "TEST_xxxxxxxxxxxxx"
cashfree.XEnvironment = cashfree.SANDBOX

// AFTER (Production)
clientId := os.Getenv("CASHFREE_APP_ID")
clientSecret := os.Getenv("CASHFREE_SECRET_KEY")
cashfree.XEnvironment = cashfree.PRODUCTION
```
</details>

<details>
<summary>PHP</summary>

```php
// BEFORE (Sandbox)
Cashfree::$XClientId = "TEST_xxxxxxxxxxxxx";
Cashfree::$XClientSecret = "TEST_xxxxxxxxxxxxx";
Cashfree::$XEnvironment = Cashfree::$SANDBOX;

// AFTER (Production)
Cashfree::$XClientId = $_ENV["CASHFREE_APP_ID"];
Cashfree::$XClientSecret = $_ENV["CASHFREE_SECRET_KEY"];
Cashfree::$XEnvironment = Cashfree::$PRODUCTION;
```
</details>

<details>
<summary>.NET</summary>

```csharp
// BEFORE (Sandbox)
Cashfree.XClientId = "TEST_xxxxxxxxxxxxx";
Cashfree.XClientSecret = "TEST_xxxxxxxxxxxxx";
Cashfree.XEnvironment = Cashfree.SANDBOX;

// AFTER (Production)
Cashfree.XClientId = Environment.GetEnvironmentVariable("CASHFREE_APP_ID");
Cashfree.XClientSecret = Environment.GetEnvironmentVariable("CASHFREE_SECRET_KEY");
Cashfree.XEnvironment = Cashfree.PRODUCTION;
```
</details>

**Raw REST API (cURL):**

```bash
# Sandbox → Production
# URL: sandbox.cashfree.com/pg → api.cashfree.com/pg
# Headers: TEST_xxx → PROD_xxx
```

**Mobile SDK — Change environment constant only:**

```java
// Android: CFSession.Environment.SANDBOX → CFSession.Environment.PRODUCTION
// iOS:     .SANDBOX → .PRODUCTION
// Flutter: CFEnvironment.SANDBOX → CFEnvironment.PRODUCTION
// RN:      CFEnvironment.SANDBOX → CFEnvironment.PRODUCTION
// Cordova: "SANDBOX" → "PRODUCTION"
```

### Step 5: Update Webhook Configuration

1. **Update webhook IP whitelist** on your firewall: remove sandbox IPs, add production IPs (`52.66.101.190`, `3.109.102.144`, `18.60.134.245`, `18.60.183.142`). Port 443, HTTPS only.
2. **Configure webhook endpoints** in the Production dashboard (does NOT carry over from sandbox).
3. Endpoint must use **HTTPS**.
4. Signature verification automatically uses the correct key if you read from env vars.

### Step 6: Remove Test Data

Search and remove all hardcoded test data:

| Test Data | Values to Remove |
|---|---|
| Test cards | `4706131211212123`, `4576238912771450`, `5105105105105100`, `4111111111111111` |
| Test UPI | `testsuccess@gocash`, `testfailure@gocash` |
| Test net banking | Bank code `3333`, bank name `TESTR` |
| Sandbox URLs | Any hardcoded `sandbox.cashfree.com` |

---

## 4. Quick Reference Checklist

### Dashboard
- [ ] KYC completed and approved
- [ ] Production API keys generated (2FA)
- [ ] Domain/app whitelisted
- [ ] Webhooks configured in production
- [ ] Payment methods enabled
- [ ] API alerts configured

### Code
- [ ] Base URL: `sandbox.cashfree.com/pg` → `api.cashfree.com/pg`
- [ ] Credentials: `TEST_` → `PROD_` (in env vars)
- [ ] SDK environment: `SANDBOX` → `PRODUCTION`
- [ ] All test data removed
- [ ] All sandbox URLs removed from return_url, notify_url

### Infrastructure
- [ ] Webhook IPs updated to production
- [ ] Webhook endpoint uses HTTPS
- [ ] Signature verification uses production secret

### Verification
- [ ] Small real payment (₹1) processed
- [ ] Payment appears in production dashboard
- [ ] Webhook received and signature verified
- [ ] Backend reads `order_status: "PAID"` correctly
- [ ] Test refund processed
- [ ] Mobile app tested via Play Store Internal Testing (if applicable)

---

## 5. Security — Never Violate

- **Never hardcode production credentials in source code.**
- **Never commit `PROD_` credentials to version control.**
- **Never expose `x-client-secret` in frontend or mobile code.**
- **Never use `TEST_` credentials in production** (payments fail).
- **Never use `PROD_` credentials in sandbox** (real charges).
- **Never skip webhook signature verification in production.**

---

## 6. Useful Links

- [Go-Live Checklist](https://www.cashfree.com/docs/payments/online/go-live/checklist)
- [Domain/App Whitelisting](https://www.cashfree.com/docs/payments/online/go-live/whitelist)
- [API Logs and Alerts](https://www.cashfree.com/docs/payments/online/go-live/api-logs)
- [Sandbox Environment & Test Data](https://www.cashfree.com/docs/payments/online/resources/sandbox-environment)
- [Authentication & API Keys](https://www.cashfree.com/docs/api-reference/authentication)
- [API Best Practices](https://www.cashfree.com/docs/api-reference/payments/api-best-practices)
- [Cashfree Integrity (Mobile Testing)](https://www.cashfree.com/docs/payments/online/mobile/misc/cashfree_integrity_prod_testing)
- [Merchant Dashboard](https://merchant.cashfree.com)
