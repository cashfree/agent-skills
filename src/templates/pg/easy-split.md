---
name: Cashfree Payment Gateway - Easy Split (Marketplace Split Payments)
description: >
  Use when building a marketplace / platform flow where a single customer payment must be
  split across multiple vendors (sellers, partners, drivers, agents) with Cashfree handling
  vendor KYC, vendor settlements, and commission holds. Triggers: marketplace payments, split
  payment, Easy Split, Cashfree vendor, vendor_id, order_splits, split after payment, commission,
  platform payout, vendor settlement, vendor KYC, vendor dashboard, static split, dynamic split,
  POST /pg/easy-split/vendors, POST /pg/orders with order_splits, POST /pg/orders/{id}/split,
  on-demand vendor balance, vendor recon, vendor_recon, food-delivery split, edtech commission,
  freelancer platform, rental platform, split_details, split_service_charge, vendor_commission.
  Pair with pg/refunds (refund-before-split behaviour) and settlements-and-reconciliation
  (vendor balances in settlement recon).
---

# Cashfree Payment Gateway — Easy Split (Marketplace Split Payments)

> **References available:** This SKILL.md covers vendor creation, the two split modes (static-at-order and dynamic-after-payment), settlement schedules, and the refund-before-split rule. For full vendor KYC field schemas, on-demand vendor transfers, vendor-recon response shape, per-language SDK code, and troubleshooting vendor-account verification failures — read `references/REFERENCE.md` in this directory.

---

## 1. Scope & Boundaries

### When to use this skill

- The platform collects money from end customers and must **split** each order across multiple vendors (sellers in a marketplace, partners on a platform, drivers on a ride app, freelancers on a gig platform, property managers on a rental site).
- The platform wants Cashfree to handle **vendor KYC, vendor bank accounts, vendor settlement cycles, and per-vendor statements** — rather than building all of that in-house.
- The developer needs to pick between **static splits** (fixed at order creation — good when the split is known upfront) and **dynamic splits** (allocated after payment — good when the split depends on outcome, e.g. which driver actually picked up the order).
- The finance team needs per-vendor reconciliation: "how much did vendor X earn in April, how much did we retain as commission, what was each vendor's settlement UTR".

### When NOT to use this skill

- **Plain inbound payments with no split** — use `pg/SKILL.md` / `pg/apis/SKILL.md`. Easy Split adds vendor-management overhead that a non-marketplace merchant doesn't need.
- **Bulk disbursements to workers / refunds to customers / partner payouts outside a PG order flow** — use `payouts/SKILL.md`. Payouts is initiate-from-merchant-balance; Easy Split is split-at-the-moment-of-capture.
- **Partner-platform reselling** (you are Cashfree's partner onboarding sub-merchants) — different product; use the Partner/Platform APIs (future skill).
- **International vendor payouts** — Easy Split settles INR to Indian vendor bank accounts. Cross-border vendor settlement is a separate product conversation with Cashfree.

---

## 2. Structural Overview

### Core Objects

| Object | Description |
|---|---|
| **Vendor** | A beneficiary with Cashfree — has a `vendor_id` (merchant-provided, unique), KYC details, a bank account (or UPI VPA), and a settlement `schedule_option`. Once `ACTIVE`, vendors can receive their share of order payments. |
| **Split** | The allocation of an order's amount across vendors. Can be set at order-create time (**static**) or after payment success (**dynamic**). |
| **Commission** | The amount Cashfree leaves in the merchant's balance after vendor shares are split out. Computed as `order_amount − Σ vendor_share − fees`. |
| **Vendor Settlement** | A Cashfree payout from the vendor's Easy-Split balance to the vendor's bank account on the vendor's configured schedule (T+1 default; instant available). |
| **Vendor Recon** | A per-vendor transaction-level statement — payments in, refunds out, adjustments — used for vendor-facing invoices and reconciliation. |

### Environments & auth

Same as the rest of the PG API:

| Environment | Base URL |
|---|---|
| Sandbox | `https://sandbox.cashfree.com/pg` |
| Production | `https://api.cashfree.com/pg` |

Headers: `x-client-id`, `x-client-secret`, `x-api-version: 2025-01-01`, `Content-Type: application/json`.

### Endpoints

| Purpose | Endpoint |
|---|---|
| Create vendor | `POST /pg/easy-split/vendors` |
| Update vendor | `PATCH /pg/easy-split/vendors/{vendor_id}` |
| List / fetch vendors | `GET /pg/easy-split/vendors` |
| Static split (at order create) | `POST /pg/orders` with `order_splits: [{vendor_id, amount|percentage}]` |
| Dynamic split (after payment) | `POST /pg/orders/{order_id}/split` |
| Order split details | `GET /pg/orders/{order_id}/split` |
| On-demand vendor balance | `GET /pg/easy-split/vendors/{vendor_id}/on-demand-balance` |
| On-demand transfer (instant vendor payout) | `POST /pg/easy-split/vendors/on-demand-transfer` |
| Vendor reconciliation | `GET /pg/recon/vendor-recon` |

### Prerequisites

- **Easy Split must be enabled on the merchant account.** Contact Cashfree support if Dashboard → Settings doesn't show Easy Split.
- The merchant is responsible for vendor KYC documents — Cashfree verifies at `POST /pg/easy-split/vendors` and marks the vendor `ACTIVE` only after successful verification.

---

## 3. Core Workflow: Onboard Vendor → Split → Settle

### Step 1 — Create the vendor

```
POST /pg/easy-split/vendors
```

```json
{
    "vendor_id": "vendor_acme_01",
    "status": "ACTIVE",
    "name": "Acme Sellers Pvt Ltd",
    "email": "acme-finance@example.com",
    "phone": "9999999999",
    "verify_account": true,
    "dashboard_access": false,
    "schedule_option": 1,
    "kyc_details": {
        "account_type": "BUSINESS",
        "business_type": "Private Limited",
        "pan": "AAACR1234K",
        "gst": "07AAACR1234K1Z5",
        "cin": "U74110DL2020PTC123456"
    },
    "bank": {
        "account_number": "50100123456789",
        "account_holder": "Acme Sellers Pvt Ltd",
        "ifsc": "HDFC0001234"
    }
}
```

**Required:** `vendor_id` (alphanumeric + `_`, unique), `status` (`ACTIVE`), `name`, `email`, `phone`, `kyc_details` (matched to `account_type`).

**Optional but important:**
- `verify_account: true` — triggers bank-account penny-test verification; vendor stays `PENDING` until the ₹1 test succeeds.
- `schedule_option: 1` — T+1 at 11:00 AM (default). `8` / `9` enable instant vendor settlements (fees apply).
- `dashboard_access: true` — creates a Cashfree merchant-dashboard login for the vendor (they can see their own payments).

**Response:** echoes the vendor object with current `status`. Store the `vendor_id` on your side; use it as the stable key for all splits.

### Step 2 — Pick a split mode

#### Mode A: Static split (fixed at order creation)

Include `order_splits` on `POST /pg/orders`:

```json
{
    "order_id": "order_42",
    "order_amount": 1000.00,
    "order_currency": "INR",
    "customer_details": { "customer_id": "cust_1", "customer_phone": "9988776655" },
    "order_meta": { "return_url": "...", "notify_url": "..." },
    "order_splits": [
        { "vendor_id": "vendor_acme_01", "amount": 850.00 },
        { "vendor_id": "vendor_logistics_02", "amount": 100.00 }
    ]
}
```

What gets split:

- Vendors: sum of `order_splits` amounts = ₹950.
- Merchant (platform commission): `order_amount − Σ vendor_shares = ₹50` (pre-fee; actual commission after PG fees).
- `percentage` works too — `[{ vendor_id, percentage: 85 }, { vendor_id, percentage: 10 }]`. Use either `amount` or `percentage` per split object, not both.

Use static split when **you know the split upfront** — sellers on an e-commerce checkout, partners on a fixed-commission platform.

#### Mode B: Dynamic split (allocated after payment success)

Create the order without `order_splits`, wait for `PAYMENT_SUCCESS_WEBHOOK`, then:

```
POST /pg/orders/{order_id}/split
```

```json
{
    "split": [
        { "vendor_id": "vendor_acme_01", "amount": 850.00 },
        { "vendor_id": "vendor_logistics_02", "amount": 100.00 }
    ]
}
```

Use dynamic split when **the allocation depends on what happens post-capture** — which driver picked up the order, which partner fulfilled the booking, or the customer's loyalty status unlocks a different split.

**Gotcha:** The dynamic split must be posted **before** the order settles. After settlement, the split becomes immutable. Rule of thumb: split within 24 hours of `PAYMENT_SUCCESS_WEBHOOK`.

### Step 3 — Let Cashfree settle vendors

Each vendor's share lands in their Easy-Split balance at the time of order settlement. From there, Cashfree pushes the balance to the vendor's bank account per their `schedule_option`:

| `schedule_option` | When vendor gets paid |
|---|---|
| `1` | T+1 at 11:00 AM |
| `8` / `9` | Instant (within minutes) — fees apply |

Vendor settlement webhooks (same PG webhook envelope, vendor-scoped payload) fire on `SETTLEMENT_SUCCESS` events tied to vendor UTRs. See `pg/webhooks/references/REFERENCE.md`.

### Step 4 — Refunds against a split order

- **Refund before split settlement:** The refund debits proportionally from each vendor's outstanding balance. Specify `refund_splits: [{vendor_id, amount}]` on the refund create call if you want a non-proportional split; omit to let Cashfree mirror the original.
- **Refund after split settlement:** Cashfree recovers from the merchant balance and issues a debit against the affected vendors in the next cycle. If the vendor balance is insufficient, Cashfree holds and surfaces this in vendor recon as a negative adjustment.

See `pg/refunds/SKILL.md` for the refund-side depth. Always supply a `refund_splits` array for split orders to avoid surprise proportional splits.

### Step 5 — Vendor reconciliation

Your vendor-facing ops build a dashboard or email-statement flow using `GET /pg/recon/vendor-recon`. The response is a per-transaction ledger scoped to a vendor and date range — payments in, refunds out, adjustments, settlement UTRs.

For the merchant's own recon, the same events also appear in **settlement recon** with an `event_details.event_type: "PAYMENT"` and `sale_type: "DEBIT"` rows tagged by vendor_id — see `settlements-and-reconciliation/SKILL.md`.

---

## 4. Security Constraints — Never Violate

- **Never expose `vendor_id` → customer mapping to end users.** Internal platform use only.
- **Never skip `verify_account`** when onboarding vendors with merchant-supplied bank details. An unverified vendor can block settlements for weeks if the IFSC / account mix is wrong.
- **Always generate a new vendor_id** if the vendor changes their bank account materially — rather than updating the existing one mid-cycle. Updates mid-cycle can delay in-flight settlements.
- **Never trust the dynamic split after settlement closes.** If you miss the 24h window, record the correction as a manual adjustment rather than retrying the split endpoint.
- **Always use `refund_splits` explicitly on split-order refunds** so you control which vendor is debited. Default proportional behaviour is rarely what a marketplace really wants.

---

## 5. Testing in Sandbox

- Onboard a test vendor with sandbox KYC values (ask Cashfree for the test PAN / GST / bank numbers that don't fail verification).
- Create a sandbox order with `order_splits`, pay with `testsuccess@gocash`, verify the split via `GET /pg/orders/{order_id}/split`.
- For dynamic split: create an order without `order_splits`, pay, then call `POST /pg/orders/{order_id}/split`.
- Use `GET /pg/easy-split/vendors/{vendor_id}/on-demand-balance` to confirm the vendor balance moved.
- Batch-resend vendor settlement webhooks from Dashboard → Webhooks → Logs to verify idempotency.

---

## 6. Quick Diagnostic

| Symptom | Likely cause | Fix |
|---|---|---|
| Vendor stuck at `PENDING` | Bank penny-test failed | Check Dashboard → Vendors → status detail; re-upload correct account/IFSC |
| `POST /pg/orders` with `order_splits` returns `400 vendor_not_active` | Vendor is `PENDING` / `BLOCKED` | Wait for verification; don't assign orders to inactive vendors |
| Sum of `order_splits` exceeds `order_amount` | Math error in platform logic | Validate server-side: `Σ splits ≤ order_amount` |
| `POST /pg/orders/{id}/split` returns `409 split_already_finalized` | Order already settled | Record as a manual adjustment; use next-cycle correction |
| Vendor didn't get paid despite `SETTLEMENT_SUCCESS` | Bank-side delay or wrong IFSC | Re-fetch vendor; check Dashboard for settlement UTR; verify IFSC |
| `refund_splits` omitted — wrong vendor debited | Cashfree defaulted to proportional | Always specify `refund_splits` on split-order refunds |
| Vendor recon shows negative balance | Refund exceeded vendor's credit | Cashfree will recover from future orders; track "vendor IOU" explicitly |
| Instant vendor settlement didn't fire | `schedule_option` not set to 8/9 | Update vendor; check fee rate card before enabling |
| Vendor dashboard shows no data | `dashboard_access: false` at creation | PATCH vendor to enable; invitation email goes out next |

---

## 7. Useful Links

- [Easy Split product](https://www.cashfree.com/easy-split/split-payment-gateway/)
- [Create Vendor](https://www.cashfree.com/docs/api-reference/payments/previous/v2023-08-01/split/vendors/create)
- [Static split on order create](https://www.cashfree.com/docs/api-reference/payments/latest/split/configuration/static-split)
- [Split after payment](https://www.cashfree.com/docs/api-reference/payments/latest/split/configuration/split-after-payment)
- [Vendor Recon](https://www.cashfree.com/docs/api-reference/payments/latest/reconciliation/vendor-recon)
- [Easy Split FAQs](https://www.cashfree.com/docs/help/easy-split/faqs/faqs)
- [Refunds on split orders](../refunds/SKILL.md)
- [Settlement recon event types](../../settlements-and-reconciliation/references/REFERENCE.md)
