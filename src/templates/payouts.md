---
name: Cashfree Payouts
description: >
  Use when integrating Cashfree Payouts for fund disbursals to bank accounts, UPI, cards, and wallets.
  Triggers: Cashfree Payouts, payout integration, disburse funds, send money, bank transfer API,
  UPI payout, batch transfer, beneficiary API, payout webhook, transfer status, direct transfer,
  Cashfree payout SDK, payout Node.js, payout Python, payout Java, payout PHP, IMPS transfer,
  NEFT transfer, RTGS payout, wallet payout, Paytm payout, Amazon Pay payout, card payout,
  Cashgram, payout protect, escrow payout, payout balance, payout authorize, payout 2FA,
  IP whitelist payout, payout signature, batch payout, bulk transfer, vendor payment,
  salary disbursement, refund payout, instant transfer, payout webhook verification.
---

# Cashfree Payouts — Integration

> **References available:** This SKILL.md covers the core payout flow. For 2FA RSA signature generation, V1 legacy APIs, batch transfer details, all webhook payloads, and key status codes — read `references/REFERENCE.md` in this directory.

---

## 1. Overview

Cashfree Payouts enables instant fund transfers to bank accounts, UPI IDs, cards, and wallets. **Backend-only integration** — no frontend SDK required.

**Core Products:**
- **Payouts Dashboard**: Web-based payout management with approval workflows
- **One Escrow**: Conditional disbursals with escrow management for marketplace settlements
- **Cashgram**: Send instant payout links without collecting bank details from recipients
- **Payout Protect**: Real-time risk control and fraud detection

**Integration Flow:** Setup & Auth → Add Beneficiary → Initiate Transfer → Track Status → Handle Webhooks

---

## 2. Environment Configuration

### V2 APIs (Recommended)

| Environment | Base URL |
|---|---|
| Production | `https://api.cashfree.com/payout` |
| Sandbox | `https://sandbox.cashfree.com/payout` |

### Required Headers (V2)

```
x-client-id: <YOUR_CLIENT_ID>
x-client-secret: <YOUR_CLIENT_SECRET>
x-api-version: 2024-01-01
Content-Type: application/json
```

> **V1 legacy APIs** use different base URLs and Bearer token auth — see `references/REFERENCE.md`.

---

## 3. Authentication

### V2 API (Direct Authentication — Recommended)

Use `x-client-id` and `x-client-secret` headers directly with every request. No token generation needed.

```bash
curl -X POST 'https://sandbox.cashfree.com/payout/transfers' \
  -H 'x-client-id: <CLIENT_ID>' \
  -H 'x-client-secret: <CLIENT_SECRET>' \
  -H 'x-api-version: 2024-01-01' \
  -H 'Content-Type: application/json' \
  -d '{ ... }'
```

### Generate API Keys

1. Log in to the **Merchant Dashboard**
2. Go to **Payouts Dashboard** → **Developers**
3. Click **API Keys** → **Generate API Keys**
4. Download and securely store the keys

- Maximum of **10 API keys** can be generated
- Production keys require **OTP authentication**

### Two-Factor Authentication (2FA)

**Option 1 — IP Whitelisting:** Whitelist up to 25 IPv4 addresses in Dashboard → Developers → Two-Factor Authentication. Only production requires this; sandbox does not.

**Option 2 — Public Key Signature (Dynamic IP):** Use RSA encryption with `X-Cf-Signature` header. See `references/REFERENCE.md` for full code (PHP, Java, Node.js, Python).

---

## 4. Payout Methods

| Method | Speed | Limit | Required Details |
|---|---|---|---|
| **IMPS** | Instant | ₹5 lakhs/payout | Beneficiary ID, name, email, phone, bank account, IFSC |
| **NEFT** | Up to 2 hrs (Mon–Sat) | Default for >₹2 lakhs | Beneficiary ID, name, email, phone, bank account, IFSC |
| **UPI** | 24×7 | ₹1 lakh | Beneficiary ID, name, email, phone, VPA |
| **Card** | Instant–48 hrs | All credit cards | Beneficiary ID, name, email, phone, tokenised card number |
| **Paytm wallet** | — | ₹1 lakh (KYC required) | Phone number |
| **Amazon Pay wallet** | — | ₹10,000 | Phone number |

---

## 5. Create Beneficiary

```bash
curl -X POST 'https://sandbox.cashfree.com/payout/beneficiary' \
  -H 'x-client-id: <CLIENT_ID>' \
  -H 'x-client-secret: <CLIENT_SECRET>' \
  -H 'x-api-version: 2024-01-01' \
  -H 'Content-Type: application/json' \
  -d '{
    "beneficiary_id": "JOHN18011343",
    "beneficiary_name": "John Doe",
    "beneficiary_instrument_details": {
      "bank_account_number": "00111122233",
      "bank_ifsc": "HDFC0000001",
      "vpa": "test@upi"
    },
    "beneficiary_contact_details": {
      "beneficiary_email": "johndoe@cashfree.com",
      "beneficiary_phone": "9876543210",
      "beneficiary_city": "Bangalore",
      "beneficiary_state": "Karnataka"
    }
  }'
```

**Get Beneficiary:** `GET /payout/beneficiary?beneficiary_id=JOHN18011343`

**Remove Beneficiary:** `DELETE /payout/beneficiary?beneficiary_id=JOHN18011343`

---

## 6. Initiate Transfer

### Standard Transfer (V2)

```bash
curl -X POST 'https://sandbox.cashfree.com/payout/transfers' \
  -H 'x-client-id: <CLIENT_ID>' \
  -H 'x-client-secret: <CLIENT_SECRET>' \
  -H 'x-api-version: 2024-01-01' \
  -H 'Content-Type: application/json' \
  -d '{
    "transfer_id": "TRANSFER_001",
    "transfer_amount": 100.00,
    "transfer_currency": "INR",
    "transfer_mode": "banktransfer",
    "beneficiary_details": {
      "beneficiary_id": "JOHN18011343"
    },
    "transfer_remarks": "Payout for order"
  }'
```

**transfer_mode values:** `banktransfer`, `imps`, `neft`, `rtgs`, `upi`, `paytm`, `amazonpay`, `card`, `cardupi`

> The transfer body is **nested**: `beneficiary_details` is an object (pass `beneficiary_id` of an existing beneficiary, or inline `beneficiary_name` + `beneficiary_instrument_details` + `beneficiary_contact_details`). Amount is `transfer_amount`, remarks is `transfer_remarks` — there are no flat `amount`/`remarks` fields.

Transfers are **async by default** — you receive `RECEIVED` immediately; final status via webhook.

### Get Transfer Status

```bash
curl -X GET 'https://sandbox.cashfree.com/payout/transfers?transfer_id=TRANSFER_001' \
  -H 'x-client-id: <CLIENT_ID>' \
  -H 'x-client-secret: <CLIENT_SECRET>' \
  -H 'x-api-version: 2024-01-01'
```

> Status lookup is a **query parameter** (`?transfer_id=` or `?cf_transfer_id=`), not a path segment.

---

## 7. Transfer Status Values

| Status | Description | Final? |
|---|---|---|
| `RECEIVED` | Transfer received for processing | No |
| `PENDING` | Awaiting bank confirmation | No |
| `SUCCESS` | Transfer completed, account debited | No* |
| `FAILED` | Transfer failed | Yes |
| `REVERSED` | Bank reversed the transfer | Yes |
| `REJECTED` | Rejected by Cashfree (risk, blacklist, limits) | Yes |
| `APPROVAL_PENDING` | Requires manual approval in Dashboard | No |
| `QUEUED` | Queued for processing | No |
| `MANUALLY_REJECTED` | Rejected by merchant/team member | Yes |

*SUCCESS can transition to REVERSED if beneficiary bank reverses the transfer.

---

## 8. Webhooks

### Configure

1. Log in to **Merchant Dashboard** → **Payouts Dashboard** → **Developers** → **Webhooks**
2. Click **Add Webhook URL**
3. Enter your HTTPS webhook endpoint
4. Select webhook version: **V2** (recommended)
5. Click **Test & Add Webhook**

### Events

| Event | Description |
|---|---|
| `TRANSFER_SUCCESS` | Transfer successful, funds sent to beneficiary bank |
| `TRANSFER_ACKNOWLEDGED` | Beneficiary bank confirmed credit to end user |
| `TRANSFER_FAILED` | Transfer attempt failed |
| `TRANSFER_REVERSED` | Beneficiary bank reversed the transfer |
| `TRANSFER_REJECTED` | Cashfree rejected the transfer |
| `BULK_TRANSFER_REJECTED` | One or more transfers in batch rejected |
| `BENEFICIARY_INCIDENT` | Service disruption for beneficiary bank/payment mode |
| `CREDIT_CONFIRMATION` | Funds credited to your account balance |
| `LOW_BALANCE_ALERT` | Account balance below threshold |

### Webhook Signature Verification (V2 — HMAC-SHA256)

**CRITICAL:** Always verify signatures. Use the **oldest active client secret**.

```javascript
// Node.js (Express)
const crypto = require("crypto");

app.post("/payout-webhook", express.raw({ type: "application/json" }), (req, res) => {
    const timestamp = req.headers["x-webhook-timestamp"];
    const signature = req.headers["x-webhook-signature"];
    const rawBody = req.body.toString();

    const computedSignature = crypto
        .createHmac("sha256", process.env.CASHFREE_CLIENT_SECRET)
        .update(timestamp + rawBody)
        .digest("base64");

    if (computedSignature === signature) {
        const payload = JSON.parse(rawBody);
        // Route by payload.type
        res.status(200).send("OK");
    } else {
        res.status(400).send("Invalid signature");
    }
});
```

> For Python signature verification, all V2 webhook payloads (TRANSFER_ACKNOWLEDGED, SUCCESS, FAILED, REVERSED, REJECTED, BULK_TRANSFER_REJECTED), V1 webhook payloads, batch transfer details, and key status codes — see `references/REFERENCE.md`.

---

## 9. Security — Never Violate

- **Never expose `x-client-secret` in frontend code.**
- **Never retry on 5XX responses** without checking transfer status first — duplicate transfers are hard to reverse.
- **Store credentials in environment variables**, never hardcoded.
- **Verify webhook signatures** before processing any event.
