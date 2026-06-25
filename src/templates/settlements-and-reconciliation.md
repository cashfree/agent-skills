---
name: Cashfree Payments - Settlements & Reconciliation
description: >
  Use when a merchant needs to understand, fetch, or reconcile their Cashfree settlements —
  the money actually credited to their bank account — against orders, refunds, disputes, and
  bank statements. Triggers: settlements, when will I get paid, settlement cycle, T+1, T+2,
  instant settlement, on-demand settlement, UTR, settlement UTR, match bank statement, ledger,
  finance ops, settlement recon, pg recon, reconciliation, MIS report, ledger export,
  SETTLEMENT_SUCCESS, settlement webhook, amount settled less than payment amount, TDS,
  service charge, GST on PG fees, settlement hold, amount_settled, cf_settlement_id,
  PGFetchSettlements, PGOrderFetchSettlement, settlement status, bounced settlement,
  settlement adjustment, next-day settlement, weekly settlement, settle to bank account,
  settlement bank account, fund sweep.
  Read after pg/go-live — every live merchant hits this within the first settlement cycle.
---

# Cashfree Payments — Settlements & Reconciliation

> **References available:** This SKILL.md covers the settlement lifecycle, the two recon APIs, the webhook flow, and the UTR-matching pattern finance teams ask for. For the complete field-level recon row schema, every event_type / sale_type value, rate limits, and a sample Python reconciler, read `references/REFERENCE.md` in this directory.

---

## 1. Scope & Boundaries

### When to use this skill

- The developer or finance ops user is asking **"when will the money hit our bank"**, **"why is the settled amount less than the payment amount"**, **"how do I match a UTR on our bank statement back to a Cashfree order"**, or **"how do I automate settlement ingestion into our accounting system"**.
- The merchant has gone live and is receiving their first settlement webhook (`SETTLEMENT_SUCCESS`) and needs to wire it into a ledger, Tally/Zoho/QuickBooks/Netsuite/SAP, or an internal finance dashboard.
- The developer wants to programmatically pull settlement or transaction-level recon reports on a daily/weekly cron in place of downloading CSVs from the Dashboard.
- The developer is debugging a "bounced" settlement, a settlement adjustment in the following cycle, or a TDS/GST deduction that surprised the accounts team.

### When NOT to use this skill

- If the developer is still building the accept-payments flow — start at `pg/SKILL.md` and `pg/apis/SKILL.md` or `pg/backend-sdks/SKILL.md`. Settlements only make sense once real orders exist.
- If the question is about **payouts** (disbursing to vendors/customers), not inbound PG settlements — use `payouts/SKILL.md`.
- If the question is about **marketplace vendor splits and vendor settlement** specifically — this skill covers the umbrella concepts, but the Easy Split / vendor-recon surface has its own (future) skill.
- If the question is about **disputes/chargebacks** specifically — use `pg/disputes/SKILL.md`. Disputes show up in the settlement recon as deductions but the SLA-driven response flow lives there.

---

## 2. Structural Overview

### Core Objects

| Object | Description |
|---|---|
| **Settlement** | A single payout from Cashfree's nodal account to your bank account. Identified by `cf_settlement_id` (Cashfree's internal id) and a `utr` (the bank's reference you'll see on your statement). |
| **Settlement Event** | One row in a settlement's recon breakdown — a payment credit, refund debit, dispute debit, chargeback reversal, or ad-hoc adjustment. Every rupee of the settled amount is the sum of its events. |
| **UTR (Unique Transaction Reference)** | The bank-side identifier for a payout. Your accounts team matches this against the bank statement line item. |
| **Adjustment** | A net correction applied in a settlement — prior-cycle refund reversal, dispute deduction, incorrect fee reversal, fund-sweep reversal. |

### API Environments

| Environment | Base URL |
|---|---|
| Sandbox | `https://sandbox.cashfree.com/pg` |
| Production | `https://api.cashfree.com/pg` |

Auth is identical to the rest of the PG API — `x-client-id`, `x-client-secret`, `x-api-version: 2025-01-01`, `Content-Type: application/json`.

### Primary Endpoints

| Purpose | Endpoint | SDK method |
|---|---|---|
| List all settlements (filtered) | `POST /pg/settlements` (body = `FetchSettlementsRequest`: `{ pagination, filters }`) | `PGFetchSettlements` |
| Settlements for a specific order | `GET /pg/orders/{order_id}/settlements` | `PGOrderFetchSettlement` |
| **Settlement Reconciliation** (event-level breakdown of settled/to-be-settled transactions) | `POST /pg/settlement/recon` | `PGSettlementFetchRecon` |
| **PG Reconciliation** (transaction-level, by date range) | `POST /pg/recon` | `PGFetchRecon` |

> "List all settlements" is a **POST** (it takes a `FetchSettlementsRequest` body with `pagination` + `filters`), not a GET with query params.

### Webhook Events

| Event `type` | Meaning |
|---|---|
| `SETTLEMENT_INITIATED` | Cashfree has initiated the bank transfer; UTR may be assigned |
| `SETTLEMENT_SUCCESS` | The payout has been credited (success end-state) |
| `SETTLEMENT_FAILED` | Bank rejected the transfer (bad account, NEFT window, etc.) |
| `SETTLEMENT_REVERSED` | A previously successful settlement was reversed (rare — bank recall) |

All four share the same envelope; see `pg/webhooks/references/REFERENCE.md` for the full payload schema (settlement object: `settlement_id`, `utr`, `amount_settled`, `payment_amount`, `service_charge`, `service_tax`, `adjustment`, `settlement_type`, `status`, `settled_on`, `settlement_initiated_on`).

---

## 3. Settlement Cycles — What to Expect

Cashfree supports four cycle types. Which one applies to the merchant is set at the account level in Dashboard → Payment Gateway → Settlement Cycle.

| Cycle | Timing | Fee |
|---|---|---|
| **T+1** (default) | Captured today, settled next working day | Standard PG fee only |
| **T+2** | Two working days | Standard PG fee only |
| **Weekly** | Fixed day of the week | Standard PG fee only |
| **Instant** | ~15 min, 24×7 including holidays | Standard PG fee + instant-settlement fee |
| **On-Demand** | Merchant triggers via Dashboard / API | Same as instant |

"Working day" = NEFT working day, so Saturdays (except the 2nd and 4th), Sundays, and bank holidays push the cycle.

### Why `amount_settled` is less than `payment_amount`

Every settlement is net of:

1. **`service_charge`** — PG fee (per your pricing: ~1.95% UPI, ~2% cards, flat for netbanking, etc.)
2. **`service_tax`** — 18% GST on the service charge
3. **`settlement_charge`** / **`settlement_tax`** — applies only to Instant/On-demand cycles
4. **`adjustment`** — prior-cycle corrections. Can be **negative** (refunds, disputes, chargebacks) or **positive** (reversals of prior deductions)
5. **TDS** (1% for e-commerce operators under Section 194-O, where applicable) — applied at source, reflected in the MIS report

Formula: `amount_settled = payment_amount − service_charge − service_tax − settlement_charge − settlement_tax + adjustment`

The GST invoice Cashfree issues to you (for service charge + service tax) downloads monthly from Dashboard → Account → Invoices. You can input-credit it if your business is GST-registered.

---

## 4. Core Workflow: Ingest Settlements Into Your Ledger

This is the pattern every merchant implements in the first 30 days of going live.

### Step 1 — Subscribe to the settlement webhook

Dashboard → Payment Gateway → Developers → Webhooks → add your endpoint, subscribe to all four `SETTLEMENT_*` events.

### Step 2 — On `SETTLEMENT_SUCCESS`, persist the settlement row

Verify the signature exactly as you do for payment webhooks (HMAC-SHA256 of `x-webhook-timestamp + rawBody`, base64-encoded, compared with `x-webhook-signature`). Then:

```javascript
// Node.js
app.post("/webhook/cashfree",
    express.raw({ type: "application/json" }),
    async (req, res) => {
        // ... signature verification (see pg/webhooks/SKILL.md)

        const event = JSON.parse(req.body.toString());
        if (event.type === "SETTLEMENT_SUCCESS") {
            const s = event.data.settlement;
            await db.settlements.upsert({
                cf_settlement_id: s.settlement_id,
                utr: s.utr,
                amount_settled: s.amount_settled,      // what actually hits the bank
                payment_amount: s.payment_amount,      // gross before fees
                service_charge: s.service_charge,
                service_tax: s.service_tax,
                adjustment: s.adjustment,
                settlement_type: s.settlement_type,    // STANDARD | INSTANT | ON_DEMAND
                settled_on: s.settled_on,
                status: s.status,
            });
        }
        res.sendStatus(200);
    });
```

### Step 3 — Nightly, pull the recon breakdown

A settlement row tells you the totals. To attribute each rupee to an order / refund / dispute, call the Settlement Reconciliation API. Paginate with `cursor`; max `limit` is 1000.

```javascript
// Node.js — walk all events in a settlement
async function pullReconFor(cfSettlementId) {
    let cursor = null;
    do {
        const response = await cashfree.PGSettlementFetchRecon({
            pagination: { limit: 1000, cursor },
            filters: { cf_settlement_ids: [cfSettlementId] },
        });
        for (const row of response.data.data) {
            await db.settlement_events.upsert({
                cf_settlement_id: row.settlement_details.cf_settlement_id,
                utr: row.settlement_details.utr,
                event_id: row.event_details.event_id,
                event_type: row.event_details.event_type,        // PAYMENT | REFUND | CHARGEBACK | ...
                sale_type: row.event_details.sale_type,          // CREDIT | DEBIT
                event_amount: row.event_details.event_amount,
                event_status: row.event_details.event_status,
                order_id: row.order_details?.order_id,
                cf_payment_id: row.payment_details?.cf_payment_id,
                refund_id: row.refund_details?.refund_id,
            });
        }
        cursor = response.data.cursor;
    } while (cursor);
}
```

`event_type` values: `PAYMENT`, `REFUND`, `REFUND_REVERSAL`, `DISPUTE`, `DISPUTE_REVERSAL`, `CHARGEBACK`, `CHARGEBACK_REVERSAL`, `OTHER_ADJUSTMENT`, `FUND_SWEEP_REVERSAL`.

`sale_type`: `CREDIT` (money into your settlement) or `DEBIT` (money out — e.g. refunds and chargebacks appear as debits).

### Step 4 — Match against the bank statement

Your accounts team matches bank-statement lines to settlements by **UTR**. One UTR = one `cf_settlement_id` = one row in your `settlements` table, and its sum across `settlement_events` must equal `amount_settled`.

```sql
-- Canonical finance-team query
SELECT s.utr, s.settled_on, s.amount_settled,
       SUM(CASE WHEN e.sale_type = 'CREDIT' THEN e.event_amount ELSE -e.event_amount END) AS reconciled_total
FROM settlements s
JOIN settlement_events e USING (cf_settlement_id)
WHERE s.settled_on BETWEEN ? AND ?
GROUP BY s.utr, s.settled_on, s.amount_settled
HAVING ROUND(reconciled_total, 2) <> ROUND(s.amount_settled, 2);
```

A non-empty result = a break. Investigate **before** the next cycle.

### Step 5 — Transaction-level recon for a date range

Use `POST /pg/recon` when you want every transaction (including not-yet-settled ones) between two dates — useful for a daily "what was captured yesterday" report that doesn't depend on cycle timing.

```javascript
const response = await cashfree.PGFetchRecon({
    pagination: { limit: 1000, cursor: null },
    filters: {
        start_date: "2026-04-18T00:00:00+05:30",
        end_date: "2026-04-18T23:59:59+05:30",
    },
});
```

---

## 5. Instant & On-Demand Settlements

For cash-flow-sensitive merchants. Both produce `settlement_type: "INSTANT"` in the webhook. Instant eligibility and per-request limits are set per account.

- **Scheduled Instant** — every captured payment is settled within ~15 min automatically. No API call needed once enabled.
- **On-Demand** — triggered from Dashboard → Instant Settlement, or programmatically via the on-demand settlement endpoint (ask Cashfree support to enable; fee is a percentage of the requested amount).

Both have the **same signature verification and webhook shape** as standard settlements; only `settlement_type` differs. Fees appear as additional deductions (`settlement_charge` + `settlement_tax`) in the recon row.

---

## 6. Security Constraints — Never Violate

- **Never rely on the settlement webhook alone** for your books. At-least-once delivery means you may see a `SETTLEMENT_SUCCESS` twice; always dedupe on `settlement_id` (or the webhook's `x-idempotency-key`).
- **Never treat a missing UTR as "settlement failed"**. For `SETTLEMENT_INITIATED` the UTR may be null; it populates at `SETTLEMENT_SUCCESS`.
- **Never expose raw recon rows to external systems without redacting `customer_bank_account_number`, `customer_bank_ifsc`, and `customer_phone`** — the recon API returns these on the payer for dispute/trace purposes and they are PII.
- **Always verify webhook signatures with the raw body** (see `pg/webhooks/SKILL.md`). No finance event is safe to process unsigned.

---

## 7. Testing in Sandbox

- Sandbox does settle, but on an accelerated/simulated cycle — expect `SETTLEMENT_INITIATED` within minutes of a successful test payment, followed by `SETTLEMENT_SUCCESS`. UTR values in sandbox are synthetic (will not exist on any real bank statement).
- Force specific settlement scenarios (failed, reversed) via Dashboard → PG → Developers → Webhooks → "Batch Resend" on a sample payload. Use this to prove your handler is idempotent.
- To exercise the recon API without live traffic: run a few sandbox payments + a refund, wait for settlement, then call `POST /pg/settlement/recon` with `filters.start_date/end_date` covering that window.

---

## 8. Quick Diagnostic

| Symptom | Likely cause | Fix |
|---|---|---|
| Money hasn't hit the bank but webhook says `SETTLEMENT_SUCCESS` | NEFT settlement window (pre-8am/after-7pm, weekend) — bank credits in the next window | Wait for next banking window; confirm `utr` matches on bank statement |
| `amount_settled` is 100× what we expected | Reading the webhook's `amount_settled` as paise | Cashfree sends rupees (decimal). Stop multiplying/dividing by 100 |
| Sum of `settlement_events` ≠ `amount_settled` | Missing events because pagination wasn't followed | Re-paginate with `cursor` until it's `null` |
| Prior cycle's refund shows up as a deduction today | Working as designed — refunds hit the settlement of the cycle **the refund processed in**, not the cycle of the original payment | Track via `REFUND_REVERSAL` / `REFUND` events in recon; reconcile at event level, not order level |
| `SETTLEMENT_FAILED` repeating | Wrong settlement bank account or KYC issue | Dashboard → Account → Settlement Account; fix and request Cashfree to retry the failed batch |
| Tally/accounting tool shows duplicate ledger lines | No idempotency on webhook ingestion | Dedupe by `cf_settlement_id` + `event.type`; or by the webhook's `x-idempotency-key` header |
| Our invoice says ₹100 but settled ₹97.94 | PG fee + GST — this is correct | Compute expected fee from merchant's rate card; `service_charge + service_tax = expected deduction` |

---

## 9. Useful Links

- [Settlement Reconciliation API](https://www.cashfree.com/docs/api-reference/payments/latest/settlements/settlement-reconciliation)
- [Get All Settlements](https://www.cashfree.com/docs/api-reference/payments/latest/settlements/get-all-settlements)
- [Settlements help](https://www.cashfree.com/docs/help/payments/settlements/settlements)
- [Instant Settlements product](https://www.cashfree.com/instant-settlements/)
- [Settlement webhook payload — pg/webhooks/references/REFERENCE.md](../pg/webhooks/references/REFERENCE.md)
- [Reports in Dashboard](https://www.cashfree.com/docs/payments/manage/reports)
