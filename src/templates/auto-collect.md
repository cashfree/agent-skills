---
name: Cashfree Payments - Auto Collect (Virtual Bank Accounts, UPI VPAs, QR)
description: >
  Use when a merchant needs to accept pull-style inbound payments via static virtual bank account
  numbers, static/dynamic UPI VPAs, or QR codes — for B2B collections, rent, dealer inflows, loan
  EMI collection, or branch-wise reconciliation. Triggers: auto collect, virtual bank account,
  VBA, virtual account, virtual UPI ID, static VPA, QR code, BharatQR, smart collect, e-collect,
  POST /pg/vba, virtual_account_id, vba_account_number, vba_ifsc, VBA credit, VBA notification,
  remitter lock, bank transfer collection, IMPS NEFT RTGS inward, rent collection, dealer collection,
  FASTag top-up collection, loan EMI collection, invoice collection, branch-wise reconciliation,
  min_amount max_amount bank_codes UTIB ICIC YESB, virtual_account_email, virtual_account_phone.
  Pair with settlements-and-reconciliation (VBA credits appear in settlement recon).
---

# Cashfree Payments — Auto Collect (Virtual Bank Accounts, UPI VPAs, QR)

> **References available:** This SKILL.md covers the VBA lifecycle, the three collection rails (bank transfer / static VPA / QR), and the credit-notification webhook. For the full schema including KYC fields, remitter-lock configuration, per-bank rails (Axis / ICICI / Yes), per-language SDK code, and troubleshooting mis-credited payments and notification-group routing — read `references/REFERENCE.md` in this directory.

---

## 1. Scope & Boundaries

### When to use this skill

- The merchant collects **pull-style inbound payments** — the customer initiates the payment and sends money to a merchant-owned identifier (virtual account number, VPA, QR). Different from regular PG orders where the merchant pushes the customer to a checkout.
- Use cases: **B2B invoices, rent collection, dealer/franchisee inflows, insurance premium collection, FASTag top-ups, loan EMI collection, branch-wise or customer-wise reconciliation**.
- The merchant wants each customer/branch/invoice to have its own unique virtual identifier so inflows are automatically attributed.
- The merchant needs to accept payments via **IMPS / NEFT / RTGS** (bank transfer), **UPI collect/intent** (static VPA), or **QR scan** (static/dynamic QR) — without a customer-facing checkout UI.

### When NOT to use this skill

- If the customer goes through a **merchant-hosted checkout** (website / app with payment buttons) — that's regular PG. Use `pg/SKILL.md` / `pg/apis/SKILL.md`.
- If the merchant is **paying customers or vendors** (outbound) — use `payouts/SKILL.md`. Auto Collect is inbound only.
- If the merchant wants a **one-off collection URL** to share over SMS/email — use `pg/payment-links/SKILL.md`. Links are more customer-friendly for ad-hoc B2C collection; Auto Collect is for recurring B2B / high-volume attribution.
- If the need is specifically a **shareable QR for a physical storefront** with a single VPA — a Cashfree **Payment Link QR** or simply the merchant's master QR works. Auto Collect's value is multi-VPA / multi-account attribution; use it only if you need per-entity identifiers.

### Mental model

Auto Collect gives you a pool of **virtual identifiers** — each one attached to your master Cashfree account but tagged by a merchant-provided id (`virtual_account_id`). When money arrives at a virtual identifier, Cashfree credits your PG settlement account and fires a credit-notification webhook tagged with `virtual_account_id` so your backend can attribute it.

---

## 2. Structural Overview

### Collection Rails

| Rail | Identifier | Use case |
|---|---|---|
| **Virtual Bank Account (VBA)** | `vba_account_number` + `vba_ifsc` | Customer sends IMPS/NEFT/RTGS from their bank to your virtual account |
| **Static UPI VPA** | `virtual_vpa@cfhdfc` (or similar) | Customer pushes UPI to a merchant-owned VPA — works via any UPI app |
| **Static/Dynamic QR** | QR image (base64 or hosted) | Customer scans at counter / on invoice |

All three resolve into the same "VBA" object under `/pg/vba/*`. The response object tells you which identifiers were allocated.

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
| Create VBA | `POST /pg/vba` |
| Fetch VBA | `GET /pg/vba/{virtual_account_id}` |
| List VBAs | `GET /pg/vba` |
| List payments credited to a VBA | `GET /pg/vba/{virtual_account_id}/payments` |
| Close / deactivate VBA | `POST /pg/vba/{virtual_account_id}/close` |
| Webhook — credit notification | `VBA_CREDIT` (or `VBA_NOTIFICATION`) — same envelope as other Cashfree webhooks |

### Prerequisites

- **Auto Collect must be enabled on the merchant account.** Contact Cashfree support if the Dashboard doesn't show the product.
- Merchant KYC on the master account must cover inbound collections (most Cashfree PG KYC does).

---

## 3. Core Workflow: Create VBA → Accept Payment → Attribute

### Step 1 — Create a virtual account per customer/invoice/branch

```
POST /pg/vba
```

```json
{
    "virtual_account_id": "vba_customer_42",
    "virtual_account_name": "Acme Logistics Pvt Ltd",
    "virtual_account_email": "accounts@acme.com",
    "virtual_account_phone": "9999999999",
    "gst": "07AAACR1234K1Z5",
    "pan": "AAACR1234K",
    "bank_codes": ["UTIB", "ICIC", "YESB"],
    "min_amount": 100,
    "max_amount": 1000000,
    "notification_group": "finance_team"
}
```

| Field | Required | Notes |
|---|---|---|
| `virtual_account_id` | Yes | Your stable id — customer id, invoice id, branch id. Alphanumeric only |
| `virtual_account_name` | Yes | Shown on customer's bank statement as the beneficiary name |
| `virtual_account_email` / `phone` | Yes | Customer contact (for your notifications) |
| `gst` / `pan` / `aadhaar` | No | Remitter-side KYC for compliance attribution |
| `bank_codes` | No | Array subset of `["UTIB", "ICIC", "YESB"]` (Axis, ICICI, Yes). If omitted, Cashfree picks |
| `min_amount` / `max_amount` | No | Reject inbound payments outside this range |
| `account_number` + `ifsc` | No | **Remitter lock** — only accept payments from this customer's own bank account (prevents mis-credit) |
| `notification_group` | No | Group name for webhook routing — multiple VBAs can share a group |

### Step 2 — Receive the identifiers

Response:

```json
{
    "virtual_account_id": "vba_customer_42",
    "vba_account_number": "2323232323232323",
    "vba_ifsc": "YESB0CMSNOC",
    "vba_bank_code": "YESB",
    "vba_status": "ACTIVE",
    "vba_vpa": "vba_customer_42@cfhdfc",
    "vba_qr": "data:image/png;base64,iVBORw0K...",
    "vba_created_on": "2026-04-19T10:00:00+05:30",
    "vba_last_updated_on": "2026-04-19T10:00:00+05:30"
}
```

Share with the customer:

- **Bank-transfer customers** — email `vba_account_number` + `vba_ifsc` + `virtual_account_name`.
- **UPI-first customers** — share `vba_vpa` (scannable QR + tap-to-pay-ready).
- **In-person / invoice-embedded** — print `vba_qr` on the invoice.

### Step 3 — Customer pays; Cashfree attributes + notifies

When the customer sends money, Cashfree receives the credit, matches it to the VBA by the receiving identifier, and fires a webhook:

```javascript
if (event.type === "VBA_CREDIT") {                // or "VBA_NOTIFICATION", depending on vintage
    const d = event.data;
    await db.payments.insert({
        virtual_account_id: d.vba.virtual_account_id,
        cf_payment_id: d.payment.cf_payment_id,
        amount: d.payment.amount,
        rail: d.payment.rail,                     // IMPS / NEFT / RTGS / UPI
        remitter_account_number: d.remitter?.account_number,
        remitter_ifsc:           d.remitter?.ifsc,
        remitter_name:           d.remitter?.name,
        utr: d.payment.utr,
        credited_at: d.payment.credited_at,
    });
    await closeInvoiceIfMatches(d.vba.virtual_account_id, d.payment.amount);
}
```

Signature verification is identical to other Cashfree webhooks — raw body + `x-webhook-timestamp`, HMAC-SHA256, base64.

### Step 4 — Reconcile

Money credited to VBAs settles into your regular Cashfree PG settlement account, subject to your standard settlement cycle. In settlement recon, these appear as standard `PAYMENT` events tagged with the `virtual_account_id` in metadata. See `settlements-and-reconciliation/SKILL.md`.

### Step 5 — Close a VBA when no longer needed

```
POST /pg/vba/{virtual_account_id}/close
```

Once closed, any new inbound payments to the VBA are **rejected at the bank rail** (customer's transfer bounces). Only close after confirming no pending / in-flight transfers.

---

## 4. Use-Case Patterns

### Pattern A — B2B invoice collection with remitter lock

Use Case: Acme Ltd has 200 dealers, each invoiced monthly. Each dealer should only be able to pay from their own registered bank account (to prevent someone else paying Acme's invoice by mistake or fraud).

```json
{
    "virtual_account_id": "dealer_17_invoice_may",
    "virtual_account_name": "Acme — Dealer 17 May Invoice",
    "virtual_account_email": "dealer17@example.com",
    "virtual_account_phone": "9988776655",
    "account_number": "123456789012",       // dealer 17's registered account — remitter lock
    "ifsc": "HDFC0001234",
    "min_amount": 50000,
    "max_amount": 500000,
    "bank_codes": ["UTIB", "ICIC"]
}
```

Payments from any account other than `123456789012` are rejected by Cashfree.

### Pattern B — Rent collection with amount lock

Use Case: Landlord has 50 tenants paying ₹15,000 each on the 1st of every month.

```json
{
    "virtual_account_id": "tenant_apt_301",
    "virtual_account_name": "Property Mgmt — Apt 301",
    "virtual_account_email": "owner@example.com",
    "virtual_account_phone": "9876543210",
    "min_amount": 15000,
    "max_amount": 15000
}
```

Inbound payments outside ₹15,000 fail — landlord avoids partial-rent confusion.

### Pattern C — FASTag / wallet top-up with no lock

Use Case: Any customer can top up from any account.

```json
{
    "virtual_account_id": "customer_c789_topup",
    "virtual_account_name": "FleetCo Wallet",
    "virtual_account_email": "support@fleetco.in",
    "virtual_account_phone": "9999999999",
    "min_amount": 100
}
```

No remitter lock; min_amount guards against ₹1 spam.

### Pattern D — Branch-wise reconciliation

Use Case: Retailer with 300 branches; each branch has its own QR for customer payments.

Create 300 VBAs, one per branch, each with the branch id as `virtual_account_id`. Print `vba_qr` on a standee at every counter. Credit webhooks arrive tagged per-branch; reconcile against a daily branch sales report.

---

## 5. Security Constraints — Never Violate

- **Never expose a customer's `virtual_account_id` if it reveals internal attribution** (e.g. `vba_high_value_customer_17`). Use opaque ids; attribution is your problem to solve internally.
- **Use remitter lock for high-value B2B flows.** An unlocked VBA is a valid target for mis-sent money and (worse) fraud refunds where a bad actor sends money from a stolen account.
- **Never close a VBA without checking in-flight.** `GET /pg/vba/{id}/payments` to see recent credits; wait 48 hours after the last expected payment before closing.
- **Always set `min_amount` / `max_amount`** on single-purpose VBAs. Protects against typo amounts and fraud probes.
- **Verify webhook signatures** on every `VBA_CREDIT` — attackers will spoof credit notifications if you don't.

---

## 6. Testing in Sandbox

- Create a sandbox VBA with minimal fields.
- Use Cashfree sandbox "simulate inbound UPI/bank transfer" (Dashboard → Auto Collect → Simulate) to fire a credit.
- Verify the `VBA_CREDIT` webhook arrives with correct `virtual_account_id`.
- Batch-resend from Dashboard → Webhooks → Logs to verify idempotent handling.
- Close the VBA, simulate another credit, confirm rejection.

---

## 7. Quick Diagnostic

| Symptom | Likely cause | Fix |
|---|---|---|
| `vba_status: "PENDING"` for hours | Bank-side allocation delay | Normal for Yes/ICICI; usually `ACTIVE` within 15 min |
| Customer claims they paid but no webhook | Remitter lock rejected the transfer | Check `GET /pg/vba/{id}/payments` for rejected entries; unlock or correct remitter |
| Amount below `min_amount` failed | Config doing its job | Lower min_amount or direct customer to send a larger amount |
| Duplicate credit webhook | At-least-once delivery | Dedupe on `cf_payment_id` + `utr` |
| Mis-credited to wrong VBA | Customer used wrong virtual_account_id | Hard to recover — refund via Payouts and close the VBA |
| `vba_vpa` not working in some UPI apps | UPI app UI restrictions | Fall back to `vba_account_number` + IMPS rail |
| QR scans to an error | QR linked to a closed VBA | Don't reuse `virtual_account_id`s after close; regenerate |
| Large RTGS transfer rejected | RTGS min amount ₹2,00,001 — but VBA `max_amount` lower | Raise `max_amount` or redirect customer to NEFT |
| Webhook payload's `rail` unexpectedly null | Bank didn't populate rail field | Infer from amount + UTR format; generally IMPS for small, RTGS for ≥₹2L |

---

## 8. Useful Links

- [Create VBA API](https://www.cashfree.com/docs/api-reference/payments/latest/pgvba)
- [Auto Collect product](https://www.cashfree.com/auto-e-collect/)
- [Virtual Payment Address](https://www.cashfree.com/virtual-payment-address/)
- [UPI QR Code](https://www.cashfree.com/upi-qr-code/)
- [VBA credit webhook — pg/webhooks/references/REFERENCE.md](pg/webhooks/references/REFERENCE.md)
- [Settlement recon for VBA credits](settlements-and-reconciliation/references/REFERENCE.md)
