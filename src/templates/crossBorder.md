---
name: Cashfree Cross Border - Collect from India
description: >
  Use when integrating Cashfree's Cross Border Collect from India solution.
  Triggers: cross border payments, collect from India, foreign merchant India payments,
  PA-CB compliance, import transactions, payment verification, ICA settlement,
  overseas merchant collect INR, international merchant India, cross border webhook,
  upload verification details, import settlement, transaction verification,
  goods description, importer name, HSN code, shipment date, AWB number,
  PAYMENT_VERIFICATION_UPDATE, ICA_SETTLEMENT_UPDATE, cross border sandbox,
  foreign currency settlement, LRS TCS declaration, collect payments from Indian customers.
  Use for foreign merchants (based outside India) collecting payments from Indian customers.
---

# Cashfree Cross Border — Collect from India Integration

> **References available:** This SKILL.md covers the core integration flow and webhooks. For the full Verification Parameters reference table, Workflow C (submit via order_tags), Workflow D (subscription charges), Workflow E (sandbox testing with test values), and verification details by goods type — read `references/REFERENCE.md` in this directory.

---

## 1. Scope & Boundaries

### When to use this skill

- The developer is a **foreign merchant** (based outside India) integrating Cashfree to collect payments from **Indian customers** using Indian payment methods (UPI, cards, net banking, virtual accounts).
- The integration involves the **Collect from India** product — Cashfree's PA-CB-compliant imports solution.
- The developer needs guidance on creating orders, uploading payment verification documents (regulatory compliance), checking verification status, handling cross-border-specific webhooks (`PAYMENT_VERIFICATION_UPDATE`, `ICA_SETTLEMENT_UPDATE`), or understanding settlement flows to overseas bank accounts.

### When NOT to use this skill

- If the developer is an **Indian merchant** accepting payments from Indian customers — use the standard Payment Gateway skills.
- If the developer is accepting **international card payments** (Pay in Native Currency / IPG) — that's a different product.
- If the question is about **Payouts**, **Subscriptions**, **Token Vault**, or **Secure ID** — separate products.

---

## 2. Integration Architecture

### What This Product Does

Cashfree's Collect from India solution enables foreign merchants to:
1. **Collect payments** from Indian customers using Indian payment methods (UPI, cards, net banking, virtual accounts).
2. **Verify transactions** by uploading regulatory compliance documents (importer details, goods descriptions, invoices, HSN codes, shipping details).
3. **Receive settlements** in foreign currency to their overseas bank account.

This is India's first **PA-CB-compliant** (Payment Aggregator - Cross Border) imports solution.

### Flow

```
1. Create Order (standard PG API)
       ↓
2. Collect Payment (Checkout JS / SDK / S2S)
       ↓
3. Upload Verification Details (cross-border-specific — regulatory compliance)
       ↓
4. Verification Review (Cashfree reviews documents)
       ↓
5. Settlement to Overseas Bank Account (in foreign currency)
```

Steps 1–2 are identical to standard Cashfree PG integration. Steps 3–5 are unique to cross-border.

### Core Objects

| Object | Description |
|---|---|
| **Order** | Standard PG order. Created via `POST /pg/orders`. Returns `payment_session_id`. |
| **Payment** | A payment attempt against an order. Identified by `cf_payment_id`. |
| **Verification Details** | Regulatory compliance documents uploaded via `POST /import/transactions/{cf_payment_id}/details`. |
| **Verification Status** | Review status of uploaded documents. Statuses: `ACTION_REQUIRED`, `IN_REVIEW`, `VERIFIED`, `REJECTED`. |
| **ICA Settlement** | Cross-border settlement to merchant's overseas bank account in foreign currency. |

### API Environments

| Environment | Base URL |
|---|---|
| Sandbox | `https://sandbox.cashfree.com/` |
| Production | `https://api.cashfree.com/` |

> Standard PG endpoints use `/pg` prefix. Cross-border-specific endpoints use `/import` prefix.

### Authentication

```
x-client-id: <Your App ID>
x-client-secret: <Your Secret Key>
x-api-version: 2025-01-01
Content-Type: application/json
```

**Never expose `x-client-secret` in frontend/client-side code.**

### API Endpoint Map

| API | Endpoint | Purpose |
|---|---|---|
| Create Order | `POST /pg/orders` | Create payment order (standard) |
| Get Payment | `GET /pg/orders/{order_id}/payments/{cf_payment_id}` | Verify payment status (standard) |
| Upload Verification Details | `POST /import/transactions/{cf_payment_id}/details` | Upload compliance documents |
| Get Verification Details | `GET /import/transactions/{cf_payment_id}` | Check verification status |
| Get Import Settlement | `GET /import/settlements` | Get ICA settlement details |
| Get Settlement Recon | `GET /import/settlements/recon` | Settlement reconciliation events |
| Trigger Sandbox Settlement | `POST /import/settlements/simulate` | Trigger settlement in sandbox |
| Mark Sandbox Settlement Processed | `POST /import/settlements/simulate/processed` | Mark settlement processed in sandbox |

> For the full **Verification Parameters Reference** table (all fields, field keys, required conditions) — see `references/REFERENCE.md`.

---

## 3. Workflow A: Complete Cross-Border Payment Flow

### Step 1: Create Order

```json
POST /pg/orders
Headers: x-client-id, x-client-secret, x-api-version: 2025-01-01

{
  "order_id": "order_crossborder_001",
  "order_amount": 1000.00,
  "order_currency": "INR",
  "customer_details": {
    "customer_id": "customer_india_123",
    "customer_email": "customer@example.com",
    "customer_phone": "9999999999"
  },
  "order_meta": {
    "return_url": "https://yoursite.com/return?order_id={order_id}",
    "notify_url": "https://yoursite.com/webhook"
  }
}
```

Response: extract `payment_session_id` and `order_id`, send to your frontend.

**Alternative:** Submit verification details at order creation time via `order_tags` — see `references/REFERENCE.md` Workflow C.

### Step 2: Collect Payment

Use Cashfree Checkout JS, Mobile SDK, or S2S API to collect payment from the Indian customer. Identical to standard PG integration.

```html
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
<script>
  const cashfree = Cashfree({ mode: "sandbox" }); // or "production"
  cashfree.checkout({
    paymentSessionId: paymentSessionId,
    redirectTarget: "_modal"
  });
</script>
```

### Step 3: Verify Payment Status

```
GET /pg/orders/{order_id}/payments/{cf_payment_id}
Headers: x-client-id, x-client-secret, x-api-version: 2025-01-01
```

### Step 4: Upload Verification Details (Cross-Border Specific)

After a successful payment, upload compliance documents for PA-CB regulatory compliance.

```
POST /import/transactions/{cf_payment_id}/details
Headers: x-client-id, x-client-secret, x-api-version: 2025-01-01
```

```json
{
  "goods_description": "Premium chocolate assortment",
  "invoice_number": "INV-2025-001",
  "importer_name": "John Doe",
  "importer_address": "123 Main Street, Mumbai",
  "importer_address_postal_code": "400001",
  "country_of_origin": "USA",
  "hs_code": "1806",
  "ecommerce_order_serial_number": "ECO-12345",
  "shipment_date": "01/07/2025",
  "port_of_loading": "Los Angeles",
  "awb_number": "AWB123456789"
}
```

```javascript
// Node.js
const uploadVerificationDetails = async (cfPaymentId, details) => {
  const response = await fetch(
    `https://api.cashfree.com/import/transactions/${cfPaymentId}/details`,
    {
      method: 'POST',
      headers: {
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
        'x-api-version': '2025-01-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(details)
    }
  );
  return response.json();
};
```

### Step 5: Monitor Verification Status

```
GET /import/transactions/{cf_payment_id}
Headers: x-client-id, x-client-secret, x-api-version: 2025-01-01
```

| Status | Meaning |
|---|---|
| `ACTION_REQUIRED` | Documents missing or need resubmission |
| `IN_REVIEW` | Documents submitted and under Cashfree review |
| `VERIFIED` | All documents verified — settlement proceeds |
| `REJECTED` | Documents rejected — check `remarks` for reason and resubmit |

### Step 6: Receive Settlement

Once verification is complete, Cashfree settles funds to your overseas bank account in foreign currency. Settlements can be as fast as **T+2 days**.

```
GET /import/settlements
Headers: x-client-id, x-client-secret, x-api-version: 2025-01-01
```

---

## 4. Workflow B: Handle Cross-Border Webhooks

Cross-border has two additional webhook events beyond standard PG webhooks.

**Prerequisites:** Subscribe to `PAYMENT_VERIFICATION_UPDATE` and `ICA_SETTLEMENT_UPDATE` in Dashboard > Developers > Webhooks.

| Event | Description |
|---|---|
| `PAYMENT_VERIFICATION_UPDATE` | Verification status changed (documents reviewed, action required, verified, or rejected) |
| `ICA_SETTLEMENT_UPDATE` | ICA settlement status updated |
| `PAYMENT_SUCCESS_WEBHOOK` | Standard PG — payment completed successfully |
| `PAYMENT_FAILED_WEBHOOK` | Standard PG — payment failed |

```javascript
// Node.js — verify signature + route by event type
const crypto = require('crypto');

app.post('/webhook/cashfree', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const rawBody = req.body.toString();

  const expectedSignature = crypto
    .createHmac('sha256', process.env.CASHFREE_CLIENT_SECRET)
    .update(timestamp + rawBody)
    .digest('base64');

  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }

  const payload = JSON.parse(rawBody);

  switch (payload.type) {
    case 'PAYMENT_VERIFICATION_UPDATE':
      if (payload.data.payment_verification_status === 'ACTION_REQUIRED') {
        const actionItems = payload.data.required_details.filter(
          d => d.doc_status === 'ACTION_REQUIRED'
        );
        // Upload missing documents for: actionItems.map(d => d.doc_name)
      }
      break;
    case 'ICA_SETTLEMENT_UPDATE':
      // payload.data.cf_ica_settlement_id, payload.data.status
      break;
    case 'PAYMENT_SUCCESS_WEBHOOK':
      // verify then fulfill
      break;
    case 'PAYMENT_FAILED_WEBHOOK':
      break;
  }

  res.status(200).send('OK');
});
```

**Webhook IP whitelist:**

| Environment | IPs |
|---|---|
| Sandbox | `52.66.25.127`, `15.206.45.168` |
| Production | `52.66.101.190`, `3.109.102.144`, `18.60.134.245`, `18.60.183.142` |

Port 443 (HTTPS only). Return HTTP 200 to acknowledge. Implement idempotency to handle duplicate deliveries.

---

## 5. Decision Rules

- **Have all verification details at order creation time** → Submit via `order_tags` (Workflow C in REFERENCE.md).
- **Don't have details at creation time** → Upload separately after payment via `POST /import/transactions/{cf_payment_id}/details`.
- **`ACTION_REQUIRED` webhook received** → Check `required_details` array, upload missing documents.
- **`REJECTED` status** → Check `remarks` field, fix issues, and resubmit.
- **Selling digital services** → `importer_name`, `goods_description`, `invoice_number`, `importer_address_line`, `importer_address_postal_code`, `country_of_origin`, `invoice_file`.
- **Selling digital goods** → All digital services fields + `hs_code` + `ecommerce_order_serial_number`.
- **Selling physical goods** → All digital goods fields + `shipment_date` + `port_of_loading` + `awb_number`.
- **Web frontend** → Cashfree Checkout JS. **Mobile** → Mobile SDK. **Backend only** → S2S API.

---

## 6. Security — Never Violate

- **Never expose `x-client-secret` in frontend/client-side code.**
- **Always verify webhook signatures** using raw request body + HMAC-SHA256.
- **Complete all verification uploads** — unverified payments will not be settled.
- **Store credentials in environment variables**, never hardcoded.

> **Read `references/REFERENCE.md` for:** full Verification Parameters table, Workflow C (order_tags submission), Workflow D (subscription charges), Workflow E (sandbox testing with test values), and verification requirements by goods type.
