---
name: Cashfree Payments - Auto Collect (Virtual Bank Accounts)
description: >
  Use when a merchant needs to accept pull-style inbound bank transfers (IMPS / NEFT / RTGS)
  via static virtual bank account numbers — for B2B collections, rent, dealer inflows, loan
  EMI collection, or branch-wise reconciliation. Triggers: auto collect, virtual bank account,
  VBA, virtual account, e-collect, smart collect, POST /pg/vba, virtual_account_id,
  vba_account_number, vba_ifsc, vba_transfer credit, VBA notification group, remitter lock,
  amount lock, IMPS NEFT RTGS inward, rent collection, dealer collection, FASTag top-up collection,
  loan EMI collection, invoice collection, branch-wise reconciliation, bank_codes UTIB ICIC YESB,
  virtual_account_email, virtual_account_phone.
  Note: VBAs accept bank transfers only — NPCI does not permit UPI payments to a VBA.
  Pair with settlements-and-reconciliation (VBA credits appear in settlement recon).
---

# Cashfree Payments — Auto Collect (Virtual Bank Accounts)

> **References available:** This SKILL.md covers the VBA lifecycle and the credit-notification webhook. For the full create schema (KYC, remitter-lock, amount-lock), per-bank rails (Axis / ICICI / Yes), notification-group routing, per-language SDK code, and troubleshooting mis-credited payments — read `references/REFERENCE.md` in this directory.

---

## 1. Scope & Boundaries

### When to use this skill

- The merchant collects **pull-style inbound bank transfers** — the customer initiates the payment and sends money (**IMPS / NEFT / RTGS**) to a merchant-owned virtual account number. Different from regular PG orders where the merchant pushes the customer to a checkout.
- Use cases: **B2B invoices, rent collection, dealer/franchisee inflows, insurance premium collection, FASTag top-ups, loan EMI collection, branch-wise or customer-wise reconciliation**.
- The merchant wants each customer/branch/invoice to have its own unique virtual account number so inflows are automatically attributed.

### When NOT to use this skill

- If you need to collect over **UPI** — a VBA **cannot** accept UPI (NPCI does not permit UPI transfers to virtual bank accounts). Use standard PG UPI (`pg/apis` / `pg/web-sdk`), a UPI QR via `pg/payment-links`, or static UPI VPAs if separately enabled on your account.
- If the customer goes through a **merchant-hosted checkout** — that's regular PG. Use `pg/SKILL.md` / `pg/apis/SKILL.md`.
- If the merchant is **paying customers or vendors** (outbound) — use `payouts/SKILL.md`. Auto Collect is inbound only.
- If the need is a **one-off collection URL** to share over SMS/email — use `pg/payment-links/SKILL.md`.

### Mental model

Auto Collect gives you a pool of **virtual bank account numbers** — each attached to your master Cashfree account but tagged by a merchant-provided id (`virtual_account_id`). When money arrives via bank transfer, Cashfree credits your PG settlement account and fires a credit-notification webhook (a `PAYMENT_SUCCESS_WEBHOOK` with `payment_group: "vba_transfer"`) so your backend can attribute it.

---

## 2. Structural Overview

### Collection rail

A VBA accepts **bank transfers only — IMPS, NEFT, and RTGS**. There is **no UPI VPA and no QR** rail on a VBA (NPCI rules prohibit UPI to a virtual bank account). The customer sends money from their bank to your `vba_account_number` + `vba_ifsc`.

### Environments & auth

| Environment | Base URL |
|---|---|
| Sandbox | `https://sandbox.cashfree.com/pg` |
| Production | `https://api.cashfree.com/pg` |

Headers: `x-client-id`, `x-client-secret`, `x-api-version: 2024-07-10`, `Content-Type: application/json`.

> ⚠️ VBA APIs use their **own** `x-api-version: 2024-07-10` — **not** the PG `2025-01-01`.

### Endpoints

| Purpose | Endpoint |
|---|---|
| Create VBA | `POST /pg/vba` |
| Get VBA details | `GET /pg/vba/{virtual_account_id}` |
| Edit / deactivate VBA | `PUT /pg/vba/{virtual_account_id}` |
| List payments credited to VBAs | `POST /pg/vba/payments` (filters in the body) |
| Get a specific credit by UTR | `GET /pg/vba/payments/{utr}` |
| Create notification group | `POST /pg/vba/notificationgroup` |
| Edit notification group | `PUT /pg/vba/notificationgroup/{notification_group_name}` |
| Webhook — credit notification | `PAYMENT_SUCCESS_WEBHOOK` with `payment_group: "vba_transfer"` — a VBA credit is delivered as a normal payment webhook, not a dedicated VBA event |

> There is **no** "list all VBAs" endpoint and **no** `/close` endpoint. To stop collecting on a VBA, edit it to `INACTIVE` via `PUT /pg/vba/{virtual_account_id}`.

### Prerequisites

- **Auto Collect must be enabled on the merchant account.** Contact Cashfree support if the Dashboard doesn't show the product.
- Merchant KYC on the master account must cover inbound collections (most Cashfree PG KYC does).

---

## 3. Core Workflow: Create VBA → Accept Transfer → Attribute

### Step 1 — Create a virtual account per customer/invoice/branch

```
POST /pg/vba
Headers: x-client-id, x-client-secret, x-api-version: 2024-07-10
```

The request body is **nested** (not flat):

```json
{
    "virtual_account_details": {
        "virtual_account_id": "vba_customer_42",
        "virtual_account_name": "Acme Logistics Pvt Ltd",
        "virtual_account_email": "accounts@acme.com",
        "virtual_account_phone": "9999999999"
    },
    "kyc_details": {
        "gst": "07AAACR1234K1Z5",
        "pan": "AAACR1234K"
    },
    "remitter_lock_details": {
        "allowed_remitters": [
            { "account_number": "123456789012", "ifsc": "HDFC0001234" }
        ]
    },
    "amount_lock_details": { "min_amount": 100, "max_amount": 1000000 },
    "bank_codes": ["UTIB", "ICIC", "YESB"],
    "notification_group": "finance_team"
}
```

| Field | Required | Notes |
|---|---|---|
| `virtual_account_details.virtual_account_id` | Yes | Your stable id — customer/invoice/branch id. Alphanumeric only |
| `virtual_account_details.virtual_account_name` | Yes | Shown on the customer's bank statement as the beneficiary name |
| `virtual_account_details.virtual_account_email` / `virtual_account_phone` | No | Customer contact (for your notifications) |
| `kyc_details.gst` / `pan` / `aadhaar` | No | KYC to associate with the VBA |
| `remitter_lock_details.allowed_remitters[]` | No | **Remitter lock** — accept payments only from these `{account_number, ifsc}` (prevents mis-credit). Supports multiple |
| `amount_lock_details.min_amount` / `max_amount` | No | Reject inbound transfers outside this range |
| `bank_codes` | No | Array subset of `["UTIB", "ICIC", "YESB"]` (Axis, ICICI, Yes). If omitted, Cashfree picks |
| `notification_group` | No | Group name for webhook routing — multiple VBAs can share a group |

### Step 2 — Receive the account number

Response (no `vba_vpa` / `vba_qr` — bank transfer only):

```json
{
    "vba_account_number": "2323232323232323",
    "vba_ifsc": "YESB0CMSNOC",
    "vba_bank_code": "YESB",
    "vba_status": "ACTIVE",
    "vba_created_on": "2026-04-19T10:00:00+05:30",
    "vba_last_updated_on": "2026-04-19T10:00:00+05:30",
    "virtual_account_details": {
        "virtual_account_id": "vba_customer_42",
        "virtual_account_name": "Acme Logistics Pvt Ltd"
    },
    "remitter_lock_details": { "allowed_remitters": [ ... ] },
    "amount_lock_details": { "min_amount": 100, "max_amount": 1000000 },
    "notification_group": "finance_team"
}
```

Share `vba_account_number` + `vba_ifsc` + `virtual_account_name` with the customer so they can send a bank transfer (IMPS/NEFT/RTGS) from their bank.

### Step 3 — Customer pays; Cashfree attributes + notifies

When the customer sends money, Cashfree receives the credit, matches it to the VBA, and fires a webhook:

```javascript
// A VBA credit arrives as a standard PAYMENT_SUCCESS_WEBHOOK — there is NO
// dedicated VBA event. Route it by payment_group (or the vba_transfer block).
if (event.type === "PAYMENT_SUCCESS_WEBHOOK"
    && event.data.payment.payment_group === "vba_transfer") {
    const p = event.data.payment;
    const t = p.payment_method.vba_transfer;   // utr, remitter_*, vaccount_id/number
    await db.payments.insert({
        virtual_account_id: t.vaccount_id,
        vaccount_number:    t.vaccount_number,
        cf_payment_id: p.cf_payment_id,
        amount: p.payment_amount,
        utr: t.utr,
        remitter_account_number: t.remitter_account,
        remitter_ifsc:           t.remitter_ifsc,
        remitter_name:           t.remitter_name,
        credited_at: p.payment_time,
    });
    await closeInvoiceIfMatches(t.vaccount_id, p.payment_amount);
}
```

Signature verification is identical to other Cashfree webhooks — raw body + `x-webhook-timestamp`, HMAC-SHA256, base64.

### Step 4 — Reconcile

Money credited to VBAs settles into your regular Cashfree PG settlement account, subject to your standard settlement cycle. In settlement recon, these appear as standard payment events. See `settlements-and-reconciliation/SKILL.md`.

### Step 5 — Deactivate a VBA when no longer needed

```
PUT /pg/vba/{virtual_account_id}
```

There is no `/close` endpoint — **edit the VBA to `INACTIVE`** via `PUT`. Once inactive, new inbound transfers are rejected. Confirm no in-flight transfers first (`POST /pg/vba/payments` filtered by `virtual_account_id`).

---

## 4. Use-Case Patterns

### Pattern A — B2B invoice collection with remitter lock

Acme Ltd has 200 dealers, each invoiced monthly. Each dealer should only be able to pay from their own registered bank account.

```json
{
    "virtual_account_details": {
        "virtual_account_id": "dealer_17_invoice_may",
        "virtual_account_name": "Acme — Dealer 17 May Invoice"
    },
    "remitter_lock_details": {
        "allowed_remitters": [ { "account_number": "123456789012", "ifsc": "HDFC0001234" } ]
    },
    "amount_lock_details": { "min_amount": 50000, "max_amount": 500000 },
    "bank_codes": ["UTIB", "ICIC"]
}
```

Payments from any account other than `123456789012` are rejected by Cashfree.

### Pattern B — Rent collection with amount lock

Landlord has 50 tenants paying ₹15,000 each on the 1st of every month.

```json
{
    "virtual_account_details": { "virtual_account_id": "tenant_apt_301", "virtual_account_name": "Property Mgmt — Apt 301" },
    "amount_lock_details": { "min_amount": 15000, "max_amount": 15000 }
}
```

Inbound transfers outside ₹15,000 fail — landlord avoids partial-rent confusion.

### Pattern C — FASTag / wallet top-up with no lock

Any customer can top up from any account.

```json
{
    "virtual_account_details": { "virtual_account_id": "customer_c789_topup", "virtual_account_name": "FleetCo Wallet" },
    "amount_lock_details": { "min_amount": 100 }
}
```

No remitter lock; `min_amount` guards against ₹1 spam.

### Pattern D — Branch-wise reconciliation

Retailer with 300 branches. Create 300 VBAs, one per branch, each with the branch id as `virtual_account_id`, and share each branch's `vba_account_number` for customer transfers. Credit webhooks arrive tagged per-branch (via `vaccount_id`); reconcile against a daily branch sales report.

---

## 5. Security Constraints — Never Violate

- **Never expose a customer's `virtual_account_id` if it reveals internal attribution** (e.g. `vba_high_value_customer_17`). Use opaque ids.
- **Use remitter lock for high-value B2B flows.** An unlocked VBA is a valid target for mis-sent money and fraud.
- **Never deactivate a VBA without checking in-flight.** `POST /pg/vba/payments` (filtered by `virtual_account_id`) to see recent credits; wait 48 hours after the last expected payment.
- **Always set `amount_lock_details`** on single-purpose VBAs. Protects against typo amounts and fraud probes.
- **Verify webhook signatures** on every inbound credit (`PAYMENT_SUCCESS_WEBHOOK`) — attackers will spoof credit notifications if you don't.

---

## 6. Testing in Sandbox

- Create a sandbox VBA with minimal fields.
- Use Cashfree sandbox "simulate inbound bank transfer" (Dashboard → Auto Collect) to fire a credit.
- Verify the `PAYMENT_SUCCESS_WEBHOOK` arrives with `payment_group: "vba_transfer"` and the expected `vaccount_id`.
- Batch-resend from Dashboard → Webhooks → Logs to verify idempotent handling.
- Deactivate the VBA (`PUT … INACTIVE`), simulate another credit, confirm rejection.

---

## 7. Quick Diagnostic

| Symptom | Likely cause | Fix |
|---|---|---|
| Customer claims they paid but no webhook | Remitter lock rejected the transfer | Check `POST /pg/vba/payments` for rejected entries; unlock or correct remitter |
| Amount below `min_amount` failed | Config doing its job | Lower `min_amount` or direct customer to send a larger amount |
| Duplicate credit webhook | At-least-once delivery | Dedupe on `cf_payment_id` + `utr` |
| Mis-credited to wrong VBA | Customer used wrong account number | Hard to recover — refund via Payouts and deactivate the VBA |
| Customer tried to pay the VBA over UPI and it failed | VBAs accept **bank transfer only** (NPCI bars UPI to VBAs) | Direct the customer to IMPS/NEFT/RTGS, or use a PG UPI flow instead |
| Large RTGS transfer rejected | RTGS min amount ₹2,00,001 but VBA `max_amount` lower | Raise `max_amount` or redirect customer to NEFT |

---

## 8. Useful Links

- [Auto Collect / VBA API reference](https://www.cashfree.com/docs/api-reference/payments/latest/pgvba)
- [Auto Collect product](https://www.cashfree.com/auto-e-collect/)
- [VBA credit webhook (PAYMENT_SUCCESS_WEBHOOK)](pg/webhooks/references/REFERENCE.md)
- [Settlement recon for VBA credits](settlements-and-reconciliation/references/REFERENCE.md)
