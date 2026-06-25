---
name: Cashfree Payment Gateway - Disputes & Chargebacks
description: >
  Use when handling disputes, chargebacks, retrieval requests, pre-arbitration, or arbitration
  against Cashfree payments — programmatically fetching dispute state, accepting liability,
  contesting with evidence, and reacting to dispute webhooks. Triggers: dispute, chargeback,
  retrieval request, pre-arbitration, arbitration, fraud dispute, unauthorized transaction,
  customer disputed payment, respond by, SLA, evidence, submit evidence, accept dispute,
  contest dispute, dispute_id, dispute_type, dispute_status, reason_code, DISPUTE_CREATED,
  DISPUTE_UPDATED, DISPUTE_CLOSED, Visa reason code, Mastercard reason code, 30-day dispute
  deadline, chargeback fee, dispute won, dispute lost, dispute resolved, dispute webhook,
  respond_by, preferred_evidence, cf_dispute_id.
  Read once live traffic exists — every merchant with >1000 orders/month will see disputes.
---

# Cashfree Payment Gateway — Disputes & Chargebacks

> **References available:** This SKILL.md covers the dispute lifecycle, the three state-change endpoints, the evidence contract, and the webhook. For the full list of all 35 `dispute_status` values, reason-code semantics, per-language SDK code, evidence document format/size limits, and how disputes show up in settlement recon — read `references/REFERENCE.md` in this directory.

---

## 1. Scope & Boundaries

### When to use this skill

- A customer has filed a dispute / chargeback with their bank and Cashfree has raised a `DISPUTE_CREATED` webhook. The developer needs to surface it to the ops/support team, track the `respond_by` SLA, and let an operator accept or contest.
- The support/ops team is building a dispute console — fetching all open disputes, filtering by `dispute_type`, uploading evidence documents, and tracking `dispute_status` transitions.
- A dispute has been lost and the developer is figuring out why the chargeback hit their settlement (answer: as a DEBIT in settlement recon — see §6).
- The developer wants to auto-accept low-value disputes (cost-of-contesting > lost amount) and contest everything else.

### When NOT to use this skill

- If no dispute has been raised yet — use `pg/refunds/SKILL.md` for customer-initiated refunds (which usually **prevent** disputes).
- If the question is "how do I prevent disputes in the first place" — use `common-mistakes/SKILL.md` §D (webhooks) and `pg/go-live/SKILL.md` (fraud signals). Strong signature verification and correct fulfillment discipline are the primary prevention.
- If the question is about **arbitration fees or network dispute policy** in detail — Cashfree surfaces the mechanics of the API; the card-network rulebook (Visa VCR, Mastercard MCOP, RuPay) is the source of truth for fees and deadlines.
- If the question is about **Payouts reversals** (recalling a disbursement you sent out) — that's `payouts/SKILL.md`, not PG disputes.

---

## 2. Dispute Lifecycle

Every dispute moves through a state machine. The exact state name is `{TYPE}_{SUB_STATUS}` (e.g. `CHARGEBACK_CREATED`, `RETRIEVAL_DOCS_RECEIVED`, `PRE_ARBITRATION_MERCHANT_WON`). There are **five** dispute types and **seven** sub-statuses, giving **35** distinct `dispute_status` values (5 × 7).

### The 5 `dispute_type` values (ordered by escalation)

| Stage | `dispute_type` | What it is | Typical SLA |
|---|---|---|---|
| 1 | `RETRIEVAL` | Issuer asks for info about a transaction. Not yet a financial reversal. | 7 days |
| 2 | `DISPUTE` | Customer formally disputes — pre-chargeback "soft" state used for UPI/NPCI in-app disputes. | 7–15 days |
| 3 | `CHARGEBACK` | Bank has debited the disputed amount. Burden of proof on merchant. | **30 days** (card) / 7 days (UPI) |
| 4 | `PRE_ARBITRATION` | Issuer disagrees with merchant's win at chargeback. Second evidence round. | 30 days |
| 5 | `ARBITRATION` | Network adjudicates. Loser pays arbitration fee. | 30–45 days |

### The 7 sub-status values

Used as a suffix on each dispute_type:

`CREATED`, `DOCS_RECEIVED`, `UNDER_REVIEW`, `MERCHANT_WON`, `MERCHANT_LOST`, `MERCHANT_ACCEPTED`, `INSUFFICIENT_EVIDENCE`.

So a chargeback you won after contesting ends with `dispute_status: "CHARGEBACK_MERCHANT_WON"`; one you auto-accepted with `"CHARGEBACK_MERCHANT_ACCEPTED"`; one you didn't respond to in time with `"CHARGEBACK_INSUFFICIENT_EVIDENCE"` (auto-lost).

### State transitions you must handle

```
DISPUTE_CREATED (webhook)
   │
   ├── accept  → {TYPE}_MERCHANT_ACCEPTED  (terminal)
   ├── contest → {TYPE}_DOCS_RECEIVED → {TYPE}_UNDER_REVIEW → {TYPE}_MERCHANT_WON / MERCHANT_LOST (terminal)
   └── no-op  → {TYPE}_INSUFFICIENT_EVIDENCE (terminal — auto-lost)
```

A dispute that escalates to `PRE_ARBITRATION` starts the cycle again at `PRE_ARBITRATION_CREATED`.

---

## 3. Core Workflow: Receive → Fetch → Respond

### Step 1 — Subscribe to dispute webhooks

Dashboard → Payment Gateway → Developers → Webhooks. Subscribe to all three:

- `DISPUTE_CREATED` — a new dispute landed (any type).
- `DISPUTE_UPDATED` — status transition, new comments from the bank, or evidence deadline changed.
- `DISPUTE_CLOSED` — terminal — `MERCHANT_WON`, `MERCHANT_LOST`, or `MERCHANT_ACCEPTED`.

Signature verification is identical to every other Cashfree webhook: `HMAC-SHA256(x-webhook-timestamp + rawBody, CASHFREE_SECRET_KEY)` → base64, compared to `x-webhook-signature`.

**Payload shape:**

```json
{
    "data": {
        "dispute": {
            "dispute_id": "1234567",
            "dispute_type": "CHARGEBACK",
            "dispute_status": "CHARGEBACK_CREATED",
            "dispute_amount": 500.00,
            "dispute_amount_currency": "INR",
            "reason_code": "1401",
            "reason_description": "Fraud Transaction",
            "respond_by": "2026-05-18T23:59:59+05:30",
            "created_at": "2026-04-18T10:00:00+05:30",
            "updated_at": "2026-04-18T10:00:00+05:30",
            "cf_dispute_remarks": null,
            "dispute_action_on": "MERCHANT"
        },
        "order_details": {
            "order_id": "order_42",
            "order_amount": 500.00,
            "order_currency": "INR",
            "cf_payment_id": 789727431,
            "payment_amount": 500.00,
            "payment_currency": "INR"
        },
        "customer_details": {
            "customer_name": "Jane Doe",
            "customer_phone": "9999999999",
            "customer_email": "jane@example.com"
        }
    },
    "event_time": "2026-04-18T10:00:00+05:30",
    "type": "DISPUTE_CREATED"
}
```

### Step 2 — Persist + start the SLA clock

On `DISPUTE_CREATED`, upsert the dispute into your ops console and **schedule a reminder at `respond_by − 24h`**. Missing `respond_by` = auto-loss.

```javascript
// Node.js
if (event.type === "DISPUTE_CREATED") {
    const d = event.data.dispute;
    await db.disputes.upsert({
        dispute_id: d.dispute_id,
        order_id: event.data.order_details.order_id,
        cf_payment_id: event.data.order_details.cf_payment_id,
        dispute_type: d.dispute_type,
        dispute_status: d.dispute_status,
        dispute_amount: d.dispute_amount,
        reason_code: d.reason_code,
        reason_description: d.reason_description,
        respond_by: d.respond_by,
        created_at: d.created_at,
    });
    await scheduleReminder(d.dispute_id, d.respond_by);
    await paging.notify("ops", `New ${d.dispute_type} for order ${event.data.order_details.order_id}: ${d.reason_description}`);
}
```

### Step 3 — Fetch detail + decide

```
GET /pg/disputes/{dispute_id}
```

The full response includes `preferred_evidence` — the list of document types the bank wants for this specific `reason_code`. Use this to drive your evidence-collection UI.

Decision rubric (each merchant should write their own):

| Scenario | Action |
|---|---|
| Obvious fraud admitted by merchant | Accept — don't waste ops cycles |
| Dispute amount < cost-of-contesting (evidence gathering + chargeback fee if lost) | Accept |
| Genuine transaction with clear delivery / fulfillment proof | Contest |
| Customer claims non-receipt but tracking shows delivered + signed | Contest with delivery proof |
| Customer claims duplicate but payments show different `cf_payment_id` and timestamps | Contest with proof of distinct transactions |

### Step 4a — Accept the dispute

```
PUT /pg/disputes/{dispute_id}/accept
```

No request body needed beyond auth (SDK: `PGAcceptDisputeByID`). Response confirms `dispute_status: "{TYPE}_MERCHANT_ACCEPTED"`. The disputed amount has already been debited — no further accounting movement (beyond what's in settlement recon).

### Step 4b — Contest the dispute by uploading evidence

There is **no JSON "contest" call**. You contest by **uploading evidence documents** (one per request) as `multipart/form-data`:

```
POST /pg/disputes/{dispute_id}/documents
Content-Type: multipart/form-data
```

| Form field | Required | Notes |
|---|---|---|
| `file` | Yes | The evidence document (PDF/JPG/PNG). **Max 20 MB.** |
| `doc_type` | Yes | Evidence category — match a `document_type` from the dispute's `preferred_evidence` (Step 3) |
| `note` | No | Free-text note for the bank |

```bash
# Contest = upload each required document (SDK: PGUploadDisputesDocuments)
curl -X POST "https://api.cashfree.com/pg/disputes/{dispute_id}/documents" \
  -H "x-client-id: $APP_ID" -H "x-client-secret: $SECRET_KEY" -H "x-api-version: 2025-01-01" \
  -F "file=@order_42_delivery_proof.pdf" \
  -F "doc_type=DeliveryProof" \
  -F "note=Delivered to billing address on 2026-04-01, AWB123456, signed."
```

Upload one document per `preferred_evidence` item the bank requested. You can submit only while `dispute_status` is `CREATED` or `DOCS_RECEIVED`; once `UNDER_REVIEW`, evidence is locked (re-opens only if a `DISPUTE_UPDATED` reverts status to `DOCS_RECEIVED`).

### Step 5 — Track transitions to terminal status

Listen for `DISPUTE_UPDATED` (status change) and `DISPUTE_CLOSED` (terminal). On `DISPUTE_CLOSED`, finalize your records:

| Terminal status | Accounting impact |
|---|---|
| `{TYPE}_MERCHANT_WON` | Previously-debited amount returns as a `CHARGEBACK_REVERSAL` event in settlement recon |
| `{TYPE}_MERCHANT_LOST` / `MERCHANT_ACCEPTED` / `INSUFFICIENT_EVIDENCE` | Amount stays debited; reflected in settlement recon as a `CHARGEBACK` or `DISPUTE` event |

If the dispute escalates to `PRE_ARBITRATION`, a new `DISPUTE_CREATED` webhook fires with the new `dispute_type` and a new `respond_by`. Treat it as a fresh case.

---

## 4. Security Constraints — Never Violate

- **Never miss `respond_by`.** It is a hard clock; Cashfree cannot extend it. Auto-schedule a 24h-prior reminder and a final-hour escalation.
- **Contest by uploading the document directly** (`multipart/form-data` to `/documents`) — Cashfree does **not** fetch evidence from a URL. Upload over HTTPS; keep each file ≤ 20 MB.
- **Never put customer PAN, full card numbers, or CVV in evidence text or documents.** Redact. You only need the last 4 digits and the transaction reference for the bank's purposes.
- **Always dedupe dispute webhooks.** At-least-once delivery means `DISPUTE_CREATED` may fire twice; keyed-by-`dispute_id` upsert is mandatory.
- **Never accept a dispute without operator review above your auto-accept threshold.** A low-value threshold can still be exploited by fraudsters.

---

## 5. Testing in Sandbox

- Sandbox disputes are created **manually by Cashfree support** on request — there is no customer-side trigger. File a sandbox ticket asking for a simulated dispute on a test order.
- Once raised, the full webhook → fetch → contest/accept → close flow can be exercised end-to-end using synthetic evidence URLs.
- Use Dashboard → Webhooks → Logs → Batch Resend on the `DISPUTE_CREATED` payload to verify your handler is idempotent.

---

## 6. How Disputes Show Up in Settlement Recon

Every dispute-related movement is a DEBIT or CREDIT event in settlement recon:

| Scenario | `event_type` | `sale_type` |
|---|---|---|
| Chargeback debited | `CHARGEBACK` | `DEBIT` |
| Chargeback won (funds returned) | `CHARGEBACK_REVERSAL` | `CREDIT` |
| UPI / in-app dispute debit | `DISPUTE` | `DEBIT` |
| UPI dispute resolved in merchant's favor | `DISPUTE_REVERSAL` | `CREDIT` |

Joining is straightforward: `event_id` in recon carries the same origin ID; the dispute's `order_id` + `cf_payment_id` let you reconcile by the pair. See `settlements-and-reconciliation/references/REFERENCE.md` §2.

Arbitration fees (if you take an arbitration to the network and lose) show up as `OTHER_ADJUSTMENT` DEBIT events.

---

## 7. Quick Diagnostic

| Symptom | Likely cause | Fix |
|---|---|---|
| `DISPUTE_CREATED` fired but our system didn't register | Webhook not subscribed, or handler non-200 | Subscribe dispute events, use `common-mistakes/SKILL.md` §D webhook fixes |
| Contest returned `409 dispute_already_closed` | Dispute moved to `UNDER_REVIEW` or terminal before your POST | Act faster; set up a near-real-time alert on `DISPUTE_CREATED` |
| Evidence upload rejected (`400`) | File > 20 MB or unsupported format | Keep each file ≤ 20 MB; use PDF/JPG/PNG; upload one doc per `preferred_evidence` item |
| `CHARGEBACK_INSUFFICIENT_EVIDENCE` though we did contest | Evidence submitted was missing a `preferred_evidence` category | Always fetch `GET /pg/disputes/{id}` and cover every item in `preferred_evidence` |
| Same dispute appears twice | At-least-once delivery on webhook, not deduping | Upsert by `dispute_id` |
| `respond_by` unexpectedly shorter than 30 days | Not a card chargeback — likely a `RETRIEVAL` or UPI `DISPUTE` (shorter SLAs) | Handle per `dispute_type`, not one-size-fits-all |
| Won the dispute but bank statement didn't credit back | `CHARGEBACK_REVERSAL` hits the **next** settlement cycle | Check next cycle's settlement recon; do not double-book |
| Customer also opens a chargeback after we already refunded | Common — bank doesn't know refund is in flight | Accept the chargeback (amount is already returned); Cashfree's recon will show a net-zero |

---

## 8. Useful Links

- [Cashfree Disputes API — Get Dispute](https://www.cashfree.com/docs/api-reference/payments/latest/disputes/get-disputes-by-dispute-id)
- [Cashfree Disputes — Accept / Contest](https://www.cashfree.com/docs/api-reference/payments/latest/disputes)
- [Dispute Webhooks](https://www.cashfree.com/docs/api-reference/payments/latest/disputes/dispute-webhooks)
- [Disputes & Chargebacks help](https://www.cashfree.com/docs/help/end-customer/disputes-and-chargeback)
- [Settlement recon event types (`CHARGEBACK`, `DISPUTE`, reversals)](../../settlements-and-reconciliation/references/REFERENCE.md)
