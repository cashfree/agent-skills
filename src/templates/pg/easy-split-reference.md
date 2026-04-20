---
name: Cashfree Easy Split — Reference
description: >
  Deep reference for Cashfree Easy Split. Full vendor schema including every KYC field by
  account_type, bank/UPI objects, schedule_option values, static-split and split-after-payment
  request bodies, on-demand transfer flow, vendor-recon response, per-language SDK code, and
  troubleshooting vendor KYC, penny-test failures, and split mis-allocation. Read after the
  Easy Split SKILL.md.
---

# Cashfree Easy Split — Reference

> Read `../SKILL.md` first for the vendor lifecycle, split modes, and refund behaviour. This file is the schema + code source of truth.

---

## 1. Endpoint Map

| Method | Path | Purpose |
|---|---|---|
| POST   | `/pg/easy-split/vendors` | Create vendor |
| PATCH  | `/pg/easy-split/vendors/{vendor_id}` | Update vendor |
| GET    | `/pg/easy-split/vendors` | List vendors |
| GET    | `/pg/easy-split/vendors/{vendor_id}` | Fetch one vendor |
| GET    | `/pg/easy-split/vendors/{vendor_id}/on-demand-balance` | Current balance |
| POST   | `/pg/easy-split/vendors/on-demand-transfer` | Trigger instant vendor payout |
| POST   | `/pg/orders` (with `order_splits`) | Static split at order creation |
| POST   | `/pg/orders/{order_id}/split` | Dynamic split after payment |
| GET    | `/pg/orders/{order_id}/split` | Fetch split details for an order |
| GET    | `/pg/recon/vendor-recon` | Per-vendor transaction-level recon |

Headers on every call: `x-client-id`, `x-client-secret`, `x-api-version: 2025-01-01`, `Content-Type: application/json`.

---

## 2. Vendor Object — Full Schema

### Create vendor request

```json
{
    "vendor_id": "vendor_acme_01",
    "status": "ACTIVE",
    "name": "Acme Sellers Pvt Ltd",
    "email": "ops@acme.com",
    "phone": "9999999999",
    "verify_account": true,
    "dashboard_access": false,
    "schedule_option": 1,
    "kyc_details": {
        "account_type": "BUSINESS",
        "business_type": "Private Limited",
        "pan": "AAACR1234K",
        "gst": "07AAACR1234K1Z5",
        "cin": "U74110DL2020PTC123456",
        "uidai": 123456789012
    },
    "bank": {
        "account_number": "50100123456789",
        "account_holder": "Acme Sellers Pvt Ltd",
        "ifsc": "HDFC0001234"
    },
    "upi": {
        "vpa": "acme@hdfcbank"
    }
}
```

| Field | Type | Required | Notes |
|---|---|---|---|
| `vendor_id` | string | Yes | Alphanumeric + `_`; unique per merchant account |
| `status` | enum | Yes | `ACTIVE` on create; later values `PENDING`, `BLOCKED`, `DELETED` |
| `name` | string | Yes | Special chars allowed: `. / - &` |
| `email` | string | Yes | Valid email |
| `phone` | string | Yes | 10-digit Indian phone |
| `verify_account` | boolean | No | Enables bank penny-test verification. Recommended `true` |
| `dashboard_access` | boolean | No | `true` creates a vendor login on Merchant Dashboard |
| `schedule_option` | integer | No | See §3 |
| `kyc_details` | object | Yes | See §2.1 |
| `bank` | object | Conditional | Required if UPI not provided |
| `upi` | object | Conditional | Required if bank not provided |

### 2.1 kyc_details by account_type

| `account_type` | Required KYC fields |
|---|---|
| `BUSINESS` | `pan`, `gst` (if registered), `cin` (if Private/Public Ltd), `business_type` |
| `INDIVIDUAL` | `pan`; one of `uidai` / `passport_number` / `driving_license` / `voter_id` |

`business_type` values: `Private Limited`, `Public Limited`, `Proprietorship`, `Partnership`, `LLP`, `Trust`, `Society`.

### Response object

Echoes the request plus:

| Field | Type | Notes |
|---|---|---|
| `status` | enum | Current vendor status (may be `PENDING` initially pending KYC + penny-test) |
| `added_on` / `last_modified` | ISO-8601 | — |
| `schedule_option` | array | Full schedule metadata — `settlement_schedule_message`, `schedule_id`, `merchant_default` |
| `bank_details_verified` | boolean | Outcome of penny-test (when `verify_account: true`) |

### Vendor statuses

| Status | Meaning |
|---|---|
| `PENDING` | KYC/penny-test in progress; can receive splits but will hold settlement until verified |
| `ACTIVE` | Fully operational — can receive splits and settle on schedule |
| `BLOCKED` | Flagged by Cashfree risk — splits rejected |
| `DELETED` | Merchant-removed; no longer usable |

---

## 3. `schedule_option` Values

| Value | Cycle | Use case |
|---|---|---|
| `1` | T+1, 11:00 AM | Default; general marketplace |
| `2` | T+2 | Longer hold (e.g. return windows) |
| `3` | Weekly | Low-volume vendors, weekly recon cadence |
| `8` | Instant (every event) | Platform-paid drivers, gig workers |
| `9` | Instant on request | Vendor-triggered via on-demand transfer |

Instant options (`8`/`9`) carry a per-transfer fee. Confirm your merchant's rate card before enabling.

---

## 4. Static Split on Order Create

```json
{
    "order_id": "order_42",
    "order_amount": 1000.00,
    "order_currency": "INR",
    "customer_details": { ... },
    "order_meta": { ... },
    "order_splits": [
        { "vendor_id": "vendor_acme_01",      "amount": 850.00 },
        { "vendor_id": "vendor_logistics_02", "amount": 100.00 }
    ]
}
```

Alternative: percentages.

```json
"order_splits": [
    { "vendor_id": "vendor_acme_01",      "percentage": 85 },
    { "vendor_id": "vendor_logistics_02", "percentage": 10 }
]
```

Rules:

- Each split object uses **either** `amount` **or** `percentage`, not both.
- `Σ amounts ≤ order_amount`; `Σ percentages ≤ 100`. Remainder is merchant commission.
- Maximum vendors per order: per your merchant tier (typically 10–20; ask Cashfree for higher).

Cashfree response echoes `order_splits` back on `GET /pg/orders/{order_id}`.

---

## 5. Dynamic Split After Payment

`POST /pg/orders/{order_id}/split`

Must be called **after** `PAYMENT_SUCCESS_WEBHOOK` but **before** order settlement (typically within 24h).

```json
{
    "split": [
        { "vendor_id": "vendor_acme_01",      "amount": 850.00 },
        { "vendor_id": "vendor_logistics_02", "amount": 100.00 }
    ],
    "disable_split": false
}
```

| Field | Notes |
|---|---|
| `split[]` | Same shape as `order_splits` on create |
| `disable_split` | `true` = no split at all (funds stay with merchant). Useful as an opt-out for dynamic-split orders where the condition never materialized |

Response: the order with `split` details attached. Fetch via `GET /pg/orders/{order_id}/split` for current state.

---

## 6. On-Demand Vendor Transfer (Instant Payout)

Move funds from vendor balance → vendor bank account immediately, outside the normal schedule.

### Fetch balance

```
GET /pg/easy-split/vendors/{vendor_id}/on-demand-balance
```

Returns `merchant_balance` + `vendor_balance` (rupees). Use the vendor balance as the upper bound for the transfer request.

### Initiate transfer

```
POST /pg/easy-split/vendors/on-demand-transfer
```

```json
{
    "vendor_id": "vendor_acme_01",
    "amount": 5000.00,
    "transfer_mode": "BANK",
    "tag": "advance_payout_april"
}
```

| Field | Notes |
|---|---|
| `vendor_id` | The vendor to pay |
| `amount` | Rupees; ≤ vendor balance |
| `transfer_mode` | `BANK` or `UPI` — must match what's configured on the vendor |
| `tag` | Free-form merchant-side correlation id |

Fee applies per Cashfree rate card. Response returns a `transfer_id` + `status`.

---

## 7. Vendor Reconciliation

`GET /pg/recon/vendor-recon`

Query params: `vendor_id`, `start_date`, `end_date`, `page`, `size`.

Response rows: per-transaction ledger scoped to the vendor — `order_id`, `cf_payment_id`, `transaction_type` (`PAYMENT` / `REFUND` / `ADJUSTMENT`), `amount`, `settlement_id`, `settlement_utr`, `settlement_time`.

Use this to generate per-vendor monthly statements or power a vendor-facing dashboard (outside Cashfree's built-in vendor dashboard).

---

## 8. Per-Language SDK Usage

Easy Split endpoints may not yet be surfaced as named SDK methods in every language. Raw REST is the most reliable path.

### Node.js

```javascript
// Create vendor
const res = await fetch("https://api.cashfree.com/pg/easy-split/vendors", {
    method: "POST",
    headers: {
        "x-client-id": process.env.CASHFREE_APP_ID,
        "x-client-secret": process.env.CASHFREE_SECRET_KEY,
        "x-api-version": "2025-01-01",
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        vendor_id: "vendor_acme_01",
        status: "ACTIVE",
        name: "Acme Sellers",
        email: "ops@acme.com",
        phone: "9999999999",
        verify_account: true,
        schedule_option: 1,
        kyc_details: { account_type: "BUSINESS", pan: "AAACR1234K", business_type: "Private Limited" },
        bank: { account_number: "50100123456789", account_holder: "Acme Sellers", ifsc: "HDFC0001234" },
    }),
});

// Create order with static split
await cashfree.PGCreateOrder({
    order_id: "order_42",
    order_amount: 1000,
    order_currency: "INR",
    customer_details: { customer_id: "c1", customer_phone: "9988776655" },
    order_splits: [
        { vendor_id: "vendor_acme_01", amount: 850 },
        { vendor_id: "vendor_logistics_02", amount: 100 },
    ],
});

// Dynamic split after payment
await fetch(`https://api.cashfree.com/pg/orders/${orderId}/split`, {
    method: "POST",
    headers: { /* same auth headers */ },
    body: JSON.stringify({ split: [{ vendor_id: "vendor_acme_01", amount: 950 }] }),
});
```

### Python

```python
import os, requests
HDR = {
    "x-client-id": os.environ["CASHFREE_APP_ID"],
    "x-client-secret": os.environ["CASHFREE_SECRET_KEY"],
    "x-api-version": "2025-01-01",
    "Content-Type": "application/json",
}
BASE = "https://api.cashfree.com/pg"

def create_vendor(body):
    return requests.post(f"{BASE}/easy-split/vendors", headers=HDR, json=body).json()

def split_after_payment(order_id, split):
    return requests.post(f"{BASE}/orders/{order_id}/split", headers=HDR, json={"split": split}).json()

def vendor_balance(vendor_id):
    return requests.get(f"{BASE}/easy-split/vendors/{vendor_id}/on-demand-balance", headers=HDR).json()
```

---

## 9. Refund Behaviour on Split Orders

- **Before order settlement:** refund debits each vendor's open balance in proportion to the original split — unless you specify `refund_splits`.
- **After order settlement:** refund debits the merchant balance; Cashfree then books a recovery against affected vendor balances in the next cycle.

### Always specify `refund_splits` for split orders

```json
{
    "refund_id": "refund_42_v1",
    "refund_amount": 500.00,
    "refund_note": "Partial return",
    "refund_splits": [
        { "vendor_id": "vendor_acme_01", "amount": 425.00 },
        { "vendor_id": "vendor_logistics_02", "amount": 50.00 }
    ]
}
```

The remaining ₹25 comes from merchant commission. See `pg/refunds/SKILL.md` for the rest of the refund contract.

---

## 10. Error Codes

| HTTP | `code` | Meaning | Fix |
|---|---|---|---|
| 400 | `vendor_id_invalid` | Bad chars in vendor_id | Use `[a-zA-Z0-9_]+` only |
| 400 | `kyc_details_missing` | Required KYC field absent | Check §2.1 by `account_type` |
| 400 | `bank_details_invalid` | Wrong IFSC / account format | Validate IFSC against RBI list |
| 409 | `vendor_already_exists` | Reused `vendor_id` | Use a fresh id or PATCH existing |
| 400 | `splits_exceed_order_amount` | Σ > order_amount | Platform validation |
| 400 | `vendor_not_active` | Vendor `PENDING`/`BLOCKED` | Wait / resolve KYC |
| 409 | `split_already_finalized` | Settlement already ran | Record as manual adjustment |
| 400 | `insufficient_balance` | Vendor balance < on-demand request | Wait for more payments or reduce amount |
| 403 | `easy_split_not_enabled` | Feature gate off | Contact Cashfree support |

---

## 11. Troubleshooting

| Issue | Cause | Resolution |
|---|---|---|
| Penny-test stuck for days | Wrong account type (savings vs current) | Update via PATCH with correct details |
| GST verification failed | GSTIN not active on GSTN | Confirm GST status on GST portal before upload |
| Vendor balance mismatches our books | Refund reversals from prior cycle pending | Run vendor recon for the specific date range |
| On-demand transfer `PENDING` | Bank processing window (NEFT/IMPS) | Check again in 30 min; webhook on completion |
| Dynamic split missed — settled without split | 24h window exceeded | Manual adjustment via Cashfree support or next-cycle correction |
| Percentages rounded unexpectedly | Cashfree rounds to 2 dp | Use integer amounts where exact splits matter |
| Vendor dashboard shows no logins | `dashboard_access: false` at creation | PATCH `dashboard_access: true`; invite email sent |

---

## 12. See Also

- `pg/refunds/SKILL.md` — refund_splits on split-order refunds.
- `settlements-and-reconciliation/references/REFERENCE.md` — how split events appear in settlement recon (`vendor_commission`, `split_service_charge`, `split_service_tax`).
- `pg/webhooks/SKILL.md` — settlement webhooks also fire per-vendor for instant schedules.
- `payouts/SKILL.md` — when to use Payouts vs Easy Split for paying partners.
- `common-mistakes/SKILL.md` — general integration + webhook gotchas.
