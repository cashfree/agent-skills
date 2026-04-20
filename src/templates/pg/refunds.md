---
name: Cashfree Payment Gateway - Refunds
description: >
  Use when integrating Cashfree refund flows — creating refunds, checking status, handling
  partial or multi-refunds, choosing INSTANT vs STANDARD speed, reacting to REFUND_STATUS_WEBHOOK,
  and reversing pre-authorized payments. Triggers: refund customer, process refund, issue refund,
  cancel payment, reverse payment, partial refund, multi-refund, instant refund, refund speed,
  refund_amount, refund_id, PGOrderCreateRefund, PGOrderFetchRefund, PGOrderFetchRefunds,
  POST orders refunds, refund webhook, REFUND_STATUS_WEBHOOK, refund_arn, refund PENDING,
  refund ONHOLD, refund CANCELLED, refund failed, reverse preauth, VOID pre-authorization,
  refund vs void, refund within 6 months, refund after settlement, refund before settlement,
  refund on UPI, refund on card, refund split, refund PCI, refund taxes, refund GST.
  Pair with pg/webhooks (for REFUND_STATUS_WEBHOOK) and settlements-and-reconciliation
  (for how refunds appear as DEBIT events in settlement recon).
---

# Cashfree Payment Gateway — Refunds

> **References available:** This SKILL.md covers the happy-path refund flow, status values, the webhook, and idempotency. For the full `POST /pg/orders/{order_id}/refunds` field schema, INSTANT eligibility rules, refund_splits (Easy Split), per-language SDK code (Node, Python, Java, Go, PHP, .NET), refund ARN semantics, and troubleshooting a PENDING / ONHOLD / FAILED refund — read `references/REFERENCE.md` in this directory.

---

## 1. Scope & Boundaries

### When to use this skill

- The developer is wiring a **customer-initiated** or **support-console-initiated** refund into their backend — full, partial, or multiple partial refunds against a single captured payment.
- The developer is deciding between **INSTANT** (NEFT/IMPS return within minutes) and **STANDARD** (T+5–7 business days back to the original instrument) refund speed.
- The developer is reacting to the **`REFUND_STATUS_WEBHOOK`** — updating their order ledger, emailing the customer, or triggering downstream reversals.
- The developer has a pre-authorized (held) payment and is asking "should I refund or void?" — this skill covers the answer.
- The support team hits an edge case: refund stuck at `PENDING` / `ONHOLD`, refund failed, refund after 6 months, refund on a UPI collect payment vs card payment.

### When NOT to use this skill

- If no payment has been captured yet — **void the authorization** (`POST /pg/orders/{order_id}/authorization` with `action: "VOID"`). Voiding a pre-auth does not fee you a refund. See `pg/backend-sdks/references/REFERENCE.md` §5.
- If the order is still `ACTIVE` and the customer hasn't paid — just let it expire, or call `PATCH /pg/orders/{order_id}` with `order_status: "TERMINATED"`.
- If the refund target is **not a PG payment** (e.g. a Payouts disbursement that needs to be recalled) — that's a Payouts product problem, not PG refunds.
- If the refund target is a **settled marketplace vendor share**, you need `Easy Split vendor adjustment` — this skill covers the simple case where Cashfree handles the split; vendor-adjustment is a separate future skill.

---

## 2. Structural Overview

### Core Objects

| Object | Description |
|---|---|
| **Refund** | A reversal of (part or all of) a captured payment. Identified by your merchant-provided `refund_id` (must be unique per order) and Cashfree's `cf_refund_id`. |
| **ARN (Acquirer Reference Number)** | The bank-side reference customers can quote to their card issuer / UPI app to trace the refund. Populated at `refund_status: "SUCCESS"`. |
| **Refund Speed** | `STANDARD` (default, 5–7 working days) or `INSTANT` (minutes, where eligible). |
| **Refund Split** | Per-vendor allocation for Easy-Split merchants; mirrors the order's split proportions unless overridden. |

### Environments & auth

Same as the rest of the PG API:

| Environment | Base URL |
|---|---|
| Sandbox | `https://sandbox.cashfree.com/pg` |
| Production | `https://api.cashfree.com/pg` |

Headers on every call: `x-client-id`, `x-client-secret`, `x-api-version: 2025-01-01`, `Content-Type: application/json`.

### Endpoints

| Purpose | Endpoint | SDK method |
|---|---|---|
| Create refund | `POST /pg/orders/{order_id}/refunds` | `PGOrderCreateRefund` |
| Fetch one refund | `GET /pg/orders/{order_id}/refunds/{refund_id}` | `PGOrderFetchRefund` |
| List refunds for an order | `GET /pg/orders/{order_id}/refunds` | `PGOrderFetchRefunds` |

Webhook event: `REFUND_STATUS_WEBHOOK`.

### Prerequisites

- The parent order's `order_status` must be `PAID` (or the specific payment's `payment_status` must be `SUCCESS`).
- The original transaction must be within the last **6 months** — older refunds must be processed out-of-band (Cashfree support) or as a new payout.
- `refund_amount` sum across all refunds on an order must be `≤ order_amount`. Multiple partial refunds are allowed until the order is fully refunded.

---

## 3. Core Workflow: Create Refund → Check Status → Webhook

### Step 1 — Create the refund

```
POST /pg/orders/{order_id}/refunds
Headers: x-client-id, x-client-secret, x-api-version: 2025-01-01, Content-Type: application/json
```

```json
{
    "refund_id": "refund_order42_001",
    "refund_amount": 50.00,
    "refund_note": "Customer requested partial refund",
    "refund_speed": "STANDARD"
}
```

**Required:** `refund_id` (unique per order; use your own, not Cashfree's), `refund_amount` (rupees, decimal).

**Optional:** `refund_speed` (`STANDARD` default, `INSTANT` where eligible), `refund_note` (shown to finance team), `refund_splits` (Easy-Split only — override vendor allocations).

**Response — a refund object:**

```json
{
    "cf_refund_id": 11325632,
    "refund_id": "refund_order42_001",
    "order_id": "order42",
    "refund_amount": 50.00,
    "refund_currency": "INR",
    "refund_status": "PENDING",
    "refund_note": "Customer requested partial refund",
    "refund_arn": null,
    "refund_type": "MERCHANT_INITIATED",
    "created_at": "2026-04-18T12:20:29+05:30",
    "processed_at": null,
    "requested_speed": "STANDARD",
    "processed_speed": null
}
```

`refund_arn` is always `null` on creation; it populates when the acquiring bank assigns it.

### Step 2 — Poll (or, better, wait for the webhook)

```
GET /pg/orders/{order_id}/refunds/{refund_id}
```

**Status values:**

| `refund_status` | Meaning | What to do |
|---|---|---|
| `PENDING` | Cashfree has accepted and is processing with the acquiring bank | Wait for webhook; don't retry create |
| `SUCCESS` | Credited to the customer's original instrument | Inform the customer; `refund_arn` is now populated |
| `ONHOLD` | Held for review (fraud signal, split ambiguity, insufficient Cashfree balance) | Check Dashboard → Refunds → status detail |
| `CANCELLED` | Refund cancelled before processing | Create a new refund if still needed |
| `FAILED` | Bank rejected the refund (account closed, card cancelled) | Fall back to a payout or manual reversal |

Terminal states: `SUCCESS`, `CANCELLED`, `FAILED`.

### Step 3 — Handle `REFUND_STATUS_WEBHOOK`

Subscribe in Dashboard → Payment Gateway → Developers → Webhooks. Payload envelope matches all Cashfree webhooks; `type` is `REFUND_STATUS_WEBHOOK` and `data.refund` contains the fields listed above (plus `service_charge`, `service_tax`, `refund_splits`, `status_description`).

```javascript
// Node.js handler (raw body + timestamp + HMAC-base64 verification — see pg/webhooks/SKILL.md)
if (event.type === "REFUND_STATUS_WEBHOOK") {
    const r = event.data.refund;
    await db.refunds.upsert({
        cf_refund_id: r.cf_refund_id,
        refund_id: r.refund_id,
        order_id: r.order_id,
        refund_status: r.refund_status,
        refund_arn: r.refund_arn,
        processed_speed: r.processed_speed,
        processed_at: r.processed_at,
    });
    if (r.refund_status === "SUCCESS") {
        await emailCustomer(r.order_id, r.refund_amount, r.refund_arn);
    }
}
```

**Dedupe** on `(refund_id, refund_status)` — the same webhook can arrive multiple times due to at-least-once delivery. If your API version is ≥ `2025-01-01`, use the `x-idempotency-key` header on the webhook as the primary dedupe key.

---

## 4. INSTANT vs STANDARD — When to Use Which

| Factor | STANDARD | INSTANT |
|---|---|---|
| Default | ✓ | — |
| Speed | 5–7 working days (bank-driven) | Minutes (NPCI/IMPS rails) |
| Fee | No extra fee beyond PG fee already charged | Small per-refund fee (merchant account pricing) |
| Eligibility | All payment modes | UPI, most Visa/Mastercard/RuPay debit; **not** for bank transfers, EMI, paylater, many credit cards |
| When chosen | When refund falls back to STANDARD | When merchant explicitly sets `refund_speed: "INSTANT"` |

**Important:** `requested_speed` is what you asked for; `processed_speed` is what Cashfree actually used. If ineligible, Cashfree falls back to STANDARD automatically — your UI should never promise "instant" without checking `processed_speed` in the webhook.

---

## 5. Refund vs Void (for Pre-Auth)

| Payment state | Use |
|---|---|
| Authorized, **not** captured | `POST /pg/orders/{order_id}/authorization` with `action: "VOID"` — zero fee, zero customer-side hold release instant |
| Captured (`payment_status: "SUCCESS"`) | `POST /pg/orders/{order_id}/refunds` — fees may apply depending on rate card |

Never refund a pre-auth you could have voided — VOID is faster, free, and cleaner for the customer's bank statement.

---

## 6. Security Constraints — Never Violate

- **`refund_id` must be unique per order.** Cashfree uses it for idempotency. Reusing `refund_id` returns the existing refund, **not** a new one — safe for retries, dangerous if you thought you were creating a second partial refund.
- **Never trust a `PENDING` refund as "done"**. Do not send a confirmation email or reverse local inventory/credits until `refund_status: "SUCCESS"` arrives via webhook or `GET` poll.
- **Always run refund creation through your backend** — never from a client. A compromised client could refund arbitrary orders.
- **Cap the refund amount server-side** against the order's paid amount. Don't let a buggy frontend submit a refund larger than the order.
- **Use raw body + timestamp** for the refund webhook verification, same as every other Cashfree webhook. See `pg/webhooks/SKILL.md`.

---

## 7. Testing in Sandbox

- Create a successful sandbox payment (e.g. UPI VPA `testsuccess@gocash`).
- Call `POST /pg/orders/{order_id}/refunds` with `refund_amount` less than the paid amount.
- In sandbox, refunds typically settle to `SUCCESS` within seconds. Batch-resend the webhook from Dashboard → Webhooks → Logs to test idempotency.
- To exercise `FAILED`: refund an amount greater than the paid total (API rejects with 400 instead of reaching webhook), or refund a sandbox "deliberately fails" VPA. See `validation-and-testing/SKILL.md` for the full test-data table.

---

## 8. Quick Diagnostic

| Symptom | Likely cause | Fix |
|---|---|---|
| `refund_amount_invalid` on create | Amount > remaining refundable on this order | Subtract prior refunds from `order_amount`; refund the remainder |
| `refund_id_already_exists` (or silent return of existing refund) | You passed a `refund_id` you already used | Generate a new unique id per refund attempt — `refund_{order_id}_{n}` is a safe shape |
| `refund_not_found` on fetch | Refund not yet indexed (race) or wrong order_id | Retry after a short backoff; confirm the path uses the **merchant** `refund_id`, not `cf_refund_id` |
| Refund sits at `PENDING` for hours | Normal for STANDARD refunds (bank windows) | Wait; escalate via Dashboard only after 24h for STANDARD, 1h for INSTANT |
| `requested_speed: "INSTANT"` but `processed_speed: "STANDARD"` | Instrument ineligible (e.g. credit card) | Working as designed — Cashfree fell back; inform the customer of the longer ETA |
| `refund_status: "ONHOLD"` | Risk review or Cashfree settlement balance low | Check Dashboard → Refunds → the specific refund has a status_description |
| `refund_status: "FAILED"` | Customer account closed, card cancelled, UPI VPA deactivated | Create a Payout to the customer instead (`payouts/SKILL.md`) |
| Refund after 6 months rejected | Policy hard limit | Process out-of-band as a Payout; do not attempt via refunds API |
| Webhook fires twice, email sent twice | No idempotency on webhook ingestion | Dedupe by `refund_id` + `refund_status` (or `x-idempotency-key`) |
| `refund_arn: null` in webhook | Webhook fired before acquirer assigned ARN | ARN appears in the `SUCCESS` webhook; wait for that instead of parsing the `PENDING` webhook |

---

## 9. Useful Links

- [Create Refund API](https://www.cashfree.com/docs/api-reference/payments/latest/refunds/create-refund)
- [Get Refund API](https://www.cashfree.com/docs/api-reference/payments/latest/refunds/get-refund)
- [Get All Refunds for Order](https://www.cashfree.com/docs/api-reference/payments/latest/refunds/get-all-refunds-for-order)
- [Refund webhook payload — pg/webhooks/references/REFERENCE.md](../webhooks/references/REFERENCE.md)
- [Instant Refunds product](https://www.cashfree.com/instant-refunds/)
- [Refunds in Merchant Dashboard](https://merchant.cashfree.com/merchants/pg/refunds)
