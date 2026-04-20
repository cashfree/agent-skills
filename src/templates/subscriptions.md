---
name: Cashfree Subscriptions — Recurring Payments & Mandates
description: >
  Use when integrating Cashfree Subscriptions for recurring payments, mandates, and automated billing.
  Triggers: Cashfree Subscriptions, recurring payments, subscription API, mandate, eNACH, UPI Autopay,
  standing instructions, SI on cards, physical NACH, subscription plan, create subscription, charge subscription,
  subscription webhook, subscription checkout, subscription_session_id, periodic subscription, on-demand subscription,
  mandate authorization, subscription lifecycle, subscription status, BANK_APPROVAL_PENDING, subscription refund,
  subscription SDK, Android subscription SDK, iOS subscription SDK, Flutter subscription SDK, React Native subscription,
  Cordova subscription, subscription payment failed, subscription retry, cancel subscription, pause subscription,
  reactivate subscription, import mandates, batch subscriptions, subscription card expiry, subscription hosted checkout,
  PGCreatePlan, PGCreateSubscription, subscription_first_charge_time, subscription_expiry_time, plan_type PERIODIC,
  plan_type ON_DEMAND, subscription payment modes, subscription error codes, subscription rate limits.
---

# Cashfree Subscriptions — Recurring Payments & Mandates

> **References available:** This SKILL.md covers the core subscription flow. For full API reference with all methods, mobile SDKs (Android/iOS/Flutter/React Native), complete webhook payloads, cut-off timelines, eNACH eligibility, UPI Autopay apps, and refunds — read `references/REFERENCE.md` in this directory.

---

## 1. Overview

Cashfree Subscriptions automates recurring payment collection. Supports mandates (contracts authorizing recurring debits), multiple payment methods, and both periodic and on-demand billing — all compliant with RBI regulations.

**Key Concepts:**
- **Mandate**: Contract between merchant and customer authorizing recurring debits up to a maximum amount
- **Plan**: Template defining billing terms (frequency, amount, currency)
- **Subscription**: The relationship between a customer and a plan
- **Authorization**: Customer's initial approval of the mandate
- **Charge**: Each individual recurring payment debit

**Integration Flow:**
1. **Create Plan** (optional) → 2. **Create Subscription** → 3. **Customer Authorization** → 4. **Raise Charges** → 5. **Handle Webhooks** → 6. **Manage Lifecycle**

---

## 2. Subscription Types

### Periodic Subscriptions
Debit a **fixed amount** at **fixed intervals** (daily, weekly, monthly, or yearly). For monthly/annual memberships, regular service charges, recurring deliveries.

### On-Demand Subscriptions
Debit **variable amounts** at **any time** up to the mandate maximum. For utility bills, usage-based billing, variable payment schedules.

---

## 3. Supported Payment Methods

| Payment Method | Max Mandate Amount | Frequencies | Authorization |
|---|---|---|---|
| **eNACH** (Net Banking/Debit Card/Aadhaar) | ₹1,00,00,000 | Daily, Weekly, Monthly, Yearly, Ad-hoc | Net banking, debit card, or Aadhaar |
| **UPI Autopay** | ₹15,000 (no AFA) / ₹1,00,000 (with AFA) | Daily, Weekly, Monthly, Ad-hoc | UPI PIN |
| **Card — Indian** (Visa, Mastercard, RuPay) | ₹15,000 (no AFA) / ₹1,00,00,000 (with AFA) | Weekly, Monthly, Yearly, Ad-hoc | OTP or 2FA |
| **Card — International** (Visa, Mastercard) | ₹1,00,00,000 | Weekly, Monthly, Yearly, Ad-hoc | OTP or 2FA |
| **Physical NACH** | ₹1,00,00,000 | Daily, Weekly, Monthly, Yearly, Ad-hoc | Physical signature |

> **NPCI Guidelines (effective Aug 1, 2025):** UPI Autopay only during non-peak hours: before 10:00 AM, 1:00–5:00 PM, or after 9:30 PM.

---

## 4. Environment Configuration

| Environment | Base URL |
|---|---|
| Sandbox | `https://sandbox.cashfree.com/pg` |
| Production | `https://api.cashfree.com/pg` |

```
x-client-id: <YOUR_CLIENT_ID>
x-client-secret: <YOUR_CLIENT_SECRET>
x-api-version: 2025-01-01
Content-Type: application/json
```

Generate API keys from **Merchant Dashboard** → **Payment Gateway** → **Developers** → **API Keys**.

---

## 5. Core API Flow

### Create Plan

```bash
curl --request POST \
  --url https://sandbox.cashfree.com/pg/plans \
  --header 'x-api-version: 2025-01-01' \
  --header 'x-client-id: YOUR_CLIENT_ID' \
  --header 'x-client-secret: YOUR_CLIENT_SECRET' \
  --header 'content-type: application/json' \
  --data '{
    "plan_id": "plan_premium",
    "plan_name": "Premium Plan",
    "plan_type": "PERIODIC",
    "plan_currency": "INR",
    "plan_max_amount": 1000,
    "plan_recurring_amount": 100,
    "plan_intervals": 1,
    "plan_interval_type": "MONTH"
  }'
```

Plans are optional — you can create subscriptions directly with inline plan details.

### Create Subscription

**Endpoint:** `POST /pg/subscriptions`

| Field | Required | Description |
|---|---|---|
| `subscription_id` | Yes | Unique subscription identifier |
| `customer_details.customer_email` | Yes | Customer email (for notifications) |
| `customer_details.customer_phone` | Yes | Customer phone (for notifications) |
| `plan_details.plan_id` | Conditional | Existing plan ID (or provide inline plan) |
| `authorization_details.authorization_amount` | No | Initial authorization charge |
| `authorization_details.authorization_amount_refund` | No | Refund auth amount after success |
| `subscription_meta.return_url` | No | Redirect URL after authorization |
| `subscription_expiry_time` | No | ISO 8601 expiry timestamp |
| `subscription_first_charge_time` | No | ISO 8601 first charge date (periodic only) |

```bash
curl --request POST \
  --url https://sandbox.cashfree.com/pg/subscriptions \
  --header 'x-api-version: 2025-01-01' \
  --header 'x-client-id: YOUR_CLIENT_ID' \
  --header 'x-client-secret: YOUR_CLIENT_SECRET' \
  --header 'content-type: application/json' \
  --data '{
    "subscription_id": "sub_unique_id",
    "customer_details": {
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "customer_phone": "9999999999"
    },
    "plan_details": { "plan_id": "plan_premium" },
    "authorization_details": {
      "authorization_amount": 1,
      "authorization_amount_refund": true
    },
    "subscription_meta": {
      "return_url": "https://yoursite.com/return",
      "notification_channel": ["EMAIL", "SMS"]
    },
    "subscription_expiry_time": "2028-12-24T14:15:22Z"
  }'
```

Response includes `subscription_session_id` for frontend checkout SDK.

### Manage Subscription

**Endpoint:** `POST /pg/subscriptions/{subscription_id}/manage`

```bash
# Cancel
curl --request POST --url https://sandbox.cashfree.com/pg/subscriptions/sub_unique_id/manage \
  --header 'content-type: application/json' --data '{ "action": "CANCEL" }'

# Pause (periodic only)
curl --request POST --url https://sandbox.cashfree.com/pg/subscriptions/sub_unique_id/manage \
  --header 'content-type: application/json' --data '{ "action": "PAUSE" }'

# Reactivate
curl --request POST --url https://sandbox.cashfree.com/pg/subscriptions/sub_unique_id/manage \
  --header 'content-type: application/json' --data '{ "action": "ACTIVATE" }'

# Change plan (periodic only — amount can't exceed original plan max)
curl --request POST --url https://sandbox.cashfree.com/pg/subscriptions/sub_unique_id/manage \
  --header 'content-type: application/json' --data '{ "action": "CHANGE_PLAN", "plan_id": "new_plan_id" }'
```

> `CHANGE_PLAN` and `PAUSE` are not supported for On-Demand subscriptions.

### Raise a Charge

**Endpoint:** `POST /pg/subscriptions/pay`

| Field | Required | Description |
|---|---|---|
| `subscription_id` | Yes | Subscription to charge |
| `payment_id` | Yes | Unique payment identifier |
| `payment_type` | Yes | `"CHARGE"` for recurring, `"AUTH"` for authorization |
| `payment_amount` | Yes | Amount to charge |
| `payment_schedule_date` | No | ISO 8601 scheduled charge date |

```bash
curl --request POST \
  --url https://sandbox.cashfree.com/pg/subscriptions/pay \
  --header 'x-api-version: 2025-01-01' \
  --header 'x-client-id: YOUR_CLIENT_ID' \
  --header 'x-client-secret: YOUR_CLIENT_SECRET' \
  --header 'content-type: application/json' \
  --data '{
    "subscription_id": "sub_unique_id",
    "payment_id": "payment_001",
    "payment_type": "CHARGE",
    "payment_amount": 100,
    "payment_schedule_date": "2025-11-30T14:15:22Z"
  }'
```

---

## 6. Charge Transaction States

| State | Description |
|---|---|
| `INITIALIZED` | Transaction initialized |
| `PENDING` | Being processed, sent to bank |
| `SUCCESS` | Completed successfully |
| `FAILED` | Failed |
| `CANCELLED` | On-demand transaction cancelled |

**Retry Policy:**
- **UPI Autopay:** 1+3 retry mechanism — up to 3 retries at hourly intervals
- **eNACH and Card:** Do not support automatic retries

---

## 7. Subscription Lifecycle

### Authorization States

| State | Description |
|---|---|
| `INITIALIZED` | Authorization request created |
| `PENDING` | Customer needs to act; bank must confirm |
| `SUCCESS` | Customer completed and approved |
| `FAILED` | Failed (decline, timeout, errors) |

### Subscription States

| State | Description | Terminal? |
|---|---|---|
| `INITIALIZED` | Created, awaiting customer authorization | No |
| `BANK_APPROVAL_PENDING` | Customer authorized, bank confirmation pending (24–48 hrs for NACH) | No |
| `ACTIVE` | Bank fully authorized, ready for payment collection | No |
| `ON_HOLD` | Failed recurring payment (NACH/Cards only) | No |
| `PAUSED` | Merchant paused (periodic only) | No |
| `CUSTOMER_PAUSED` | Customer paused from UPI app | No |
| `COMPLETED` | Subscription cycle completed | Yes |
| `CUSTOMER_CANCELLED` | Customer cancelled at bank | Yes |
| `EXPIRED` | Reached expiry date | Yes |
| `LINK_EXPIRED` | Authorization link expired | Yes |
| `CARD_EXPIRED` | Authorized card expired | Yes |
| `CANCELLED` | Merchant cancelled | Yes |

### First Charge Date (FCD) Rules

| Payment Mode | Authorization Time | Nearest Possible Debit Date |
|---|---|---|
| UPI Autopay | Before 9:00 PM | T + 1 |
| UPI Autopay | After 9:00 PM | T + 2 |
| Cards | Before 9:00 PM | T + 1 |
| Cards | After 9:00 PM | T + 2 |
| eNACH | Anytime | T + 4 |

*T = Date customer completes authorization*

---

## 8. Frontend Integration — Web (Hosted Checkout)

```html
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
```

```javascript
const cashfree = Cashfree({ mode: "sandbox" }); // or "production"

document.getElementById("payButton").addEventListener("click", function() {
  cashfree.subscriptionsCheckout({
    subsSessionId: "subscription_session_id_from_backend",
    redirectTarget: "_blank" // or "_self"
  }).then(function(result) {
    if (result.error) console.error(result.error.message);
  });
});
```

---

## 9. Webhooks

### Configure

1. **Merchant Dashboard** → **Payment Gateway** → **Developers** → **Webhooks**
2. Click **Add Webhook URL** → enter HTTPS endpoint
3. Select webhook version: **2025-01-01**
4. Click **Test & Add Webhook**

### Events

| Event | Description |
|---|---|
| `SUBSCRIPTION_STATUS_CHANGED` | Subscription status updates |
| `SUBSCRIPTION_AUTH_STATUS` | Authorization completion (success/failed) |
| `SUBSCRIPTION_PAYMENT_NOTIFICATION_INITIATED` | Pre-debit notification sent to customer |
| `SUBSCRIPTION_PAYMENT_SUCCESS` | Successful recurring payment |
| `SUBSCRIPTION_PAYMENT_FAILED` | Failed payment |
| `SUBSCRIPTION_PAYMENT_CANCELLED` | Cancelled payment |
| `SUBSCRIPTION_REFUND_STATUS` | Refund status updates |
| `SUBSCRIPTION_CARD_EXPIRY_REMINDER` | Card expiry reminder (6 days before expiry) |

---

## 10. Security — Never Violate

- **Never expose `x-client-secret` in frontend code.**
- **Always verify webhook signatures** before processing.
- **Store credentials in environment variables**, never hardcoded.

> **Read `references/REFERENCE.md` for:** full API reference (Fetch Plan/Subscription/Payment, Upload Physical NACH, Refunds), cut-off timelines table, complete webhook payloads, mobile SDKs (Android/iOS/Flutter/React Native), UPI Autopay intent apps, and eNACH eligibility rules.
