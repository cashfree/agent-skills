---
name: Cashfree Disputes — Reference
description: >
  Deep reference for Cashfree Payment Gateway disputes. Full endpoint map, complete dispute
  object schema, all 24 dispute_status values, reason-code interpretation, evidence document
  format/size/count limits, per-language SDK code for Get / List / Accept / Contest, dispute
  webhook payload (all three event types), and a troubleshooting table for evidence rejection,
  SLA breaches, and cross-dispute escalations. Read after the Disputes SKILL.md.
---

# Cashfree Disputes — Reference

> Read `../SKILL.md` first for the dispute lifecycle and the decide-to-accept-or-contest workflow. This file is the schema + code + status-enum source of truth.

---

## 1. Endpoint Map

| Method | Path | Purpose |
|---|---|---|
| GET  | `/pg/disputes/{dispute_id}` | Fetch one dispute with full evidence context |
| GET  | `/pg/orders/{order_id}/disputes` | List disputes on an order |
| GET  | `/pg/payments/{cf_payment_id}/disputes` | List disputes on a specific payment attempt |
| POST | `/pg/disputes/{dispute_id}/accept` | Accept liability (terminal) |
| POST | `/pg/disputes/{dispute_id}/contest` | Submit evidence to contest |

All endpoints require `x-client-id`, `x-client-secret`, `x-api-version: 2025-01-01`, `Content-Type: application/json`. Partner / signature auth variants also supported (`x-partner-apikey`, `x-client-signature`) — see `pg/apis/references/REFERENCE.md`.

### Rate limits (production)

~30/min per endpoint, per account. Sandbox is lower. Back off on `429` per `x-ratelimit-retry`.

---

## 2. Dispute Object — Full Schema

```jsonc
{
    "dispute_id": 1234567,                    // int — Cashfree primary key
    "dispute_type": "CHARGEBACK",             // enum — see §3
    "dispute_status": "CHARGEBACK_CREATED",   // enum — 24 values, see §4
    "dispute_amount": 500.00,                 // number — may be less than payment_amount for partials
    "dispute_amount_currency": "INR",         // v2025-01-01+; v2023-08-01 omits

    "reason_code": "1401",                    // string — network reason code (Visa/MC/RuPay/UPI)
    "reason_description": "Fraud Transaction",

    "respond_by": "2026-05-18T23:59:59+05:30",// ISO-8601 — SLA hard deadline
    "created_at": "2026-04-18T10:00:00+05:30",
    "updated_at": "2026-04-18T10:00:00+05:30",
    "resolved_at": null,                      // ISO-8601 on terminal status

    "cf_dispute_remarks": null,               // Cashfree/bank-side notes, often populated at UPDATE
    "dispute_action_on": "MERCHANT",          // MERCHANT | CASHFREE | BANK — who is expected to act next

    "preferred_evidence": [                   // what the bank wants
        { "type": "INVOICE",            "mandatory": true  },
        { "type": "PROOF_OF_DELIVERY",  "mandatory": true  },
        { "type": "CUSTOMER_COMMUNICATION", "mandatory": false },
        { "type": "REFUND_PROOF",       "mandatory": false }
    ],

    "dispute_evidence": [                     // what you've already submitted
        {
            "evidence_id": "ev_abcd1234",
            "type": "INVOICE",
            "url": "https://cdn.example.com/evidence/order_42_invoice.pdf",
            "uploaded_at": "2026-04-19T08:00:00+05:30"
        }
    ],

    "order_details": {
        "order_id": "order_42",
        "order_amount": 500.00,
        "order_currency": "INR",
        "cf_payment_id": 789727431,
        "payment_amount": 500.00,
        "payment_currency": "INR"
    },

    "customer_details": {
        "customer_name":  "Jane Doe",
        "customer_phone": "9999999999",
        "customer_email": "jane@example.com"
    }
}
```

---

## 3. `dispute_type` Enum

| Value | Meaning | Typical network | Typical SLA |
|---|---|---|---|
| `RETRIEVAL` | Issuer asking for info; no debit yet | Visa / MC | 7 days |
| `DISPUTE` | UPI / NPCI-style in-app dispute; pre-chargeback | UPI | 7–15 days |
| `CHARGEBACK` | Formal reversal; amount already debited | All | 30 days (card) / 7 days (UPI) |
| `PRE_ARBITRATION` | Issuer rejected merchant's chargeback win | Visa / MC | 30 days |
| `ARBITRATION` | Network adjudicates; loser pays arb fee | Visa / MC | 30–45 days |

---

## 4. `dispute_status` — All 24 Values

Pattern: `{TYPE}_{SUB_STATUS}`. The 7 sub-statuses below combine with the 5 types (not every pair exists; rare combinations are simply never emitted):

### Sub-statuses

| Sub-status | Meaning | Terminal? |
|---|---|---|
| `CREATED` | New — merchant action needed | No |
| `DOCS_RECEIVED` | Cashfree/bank received contest evidence | No |
| `UNDER_REVIEW` | Bank/network evaluating | No |
| `MERCHANT_WON` | Evidence accepted; funds return | **Yes** |
| `MERCHANT_LOST` | Evidence rejected; funds stay debited | **Yes** |
| `MERCHANT_ACCEPTED` | Merchant chose to accept | **Yes** |
| `INSUFFICIENT_EVIDENCE` | Merchant did not respond in time / evidence rejected outright | **Yes** (auto-loss) |

### Valid combinations you'll see

```
RETRIEVAL_CREATED, RETRIEVAL_DOCS_RECEIVED, RETRIEVAL_UNDER_REVIEW,
RETRIEVAL_MERCHANT_WON, RETRIEVAL_MERCHANT_LOST, RETRIEVAL_MERCHANT_ACCEPTED,
RETRIEVAL_INSUFFICIENT_EVIDENCE,

DISPUTE_CREATED, DISPUTE_DOCS_RECEIVED, DISPUTE_UNDER_REVIEW,
DISPUTE_MERCHANT_WON, DISPUTE_MERCHANT_LOST, DISPUTE_MERCHANT_ACCEPTED,
DISPUTE_INSUFFICIENT_EVIDENCE,

CHARGEBACK_CREATED, CHARGEBACK_DOCS_RECEIVED, CHARGEBACK_UNDER_REVIEW,
CHARGEBACK_MERCHANT_WON, CHARGEBACK_MERCHANT_LOST, CHARGEBACK_MERCHANT_ACCEPTED,
CHARGEBACK_INSUFFICIENT_EVIDENCE,

PRE_ARBITRATION_CREATED, PRE_ARBITRATION_DOCS_RECEIVED, PRE_ARBITRATION_UNDER_REVIEW,
PRE_ARBITRATION_MERCHANT_WON, PRE_ARBITRATION_MERCHANT_LOST,
PRE_ARBITRATION_MERCHANT_ACCEPTED, PRE_ARBITRATION_INSUFFICIENT_EVIDENCE,

ARBITRATION_CREATED, ARBITRATION_DOCS_RECEIVED, ARBITRATION_UNDER_REVIEW,
ARBITRATION_MERCHANT_WON, ARBITRATION_MERCHANT_LOST
```

---

## 5. Reason-Code Reference (common)

Reason codes come from the underlying card network or UPI ruleset. `reason_description` is the human-readable label. Common ones you'll see:

| `reason_code` | `reason_description` | What the bank wants |
|---|---|---|
| `1401` | Fraud Transaction — Card Not Present | KYC of cardholder, 3DS logs, IP/device info, AVS match |
| `4855` | Goods or Services Not Received | Tracking, proof of delivery, signature |
| `4853` | Cardholder Disputes — Quality | Product description vs. delivered, customer communication |
| `4834` | Duplicate Processing | Evidence that each charge was for distinct goods/services |
| `4863` | Cardholder Does Not Recognize | Invoice, customer communication, AVS/3DS trace |
| `RR-001` (UPI) | Customer Claim – Unauthorized Debit | KYC, device logs, order context |
| `RR-005` (UPI) | Credit Not Processed | Refund ARN + bank proof |

Networks change reason-code semantics periodically. Always let `preferred_evidence` drive your evidence UI rather than maintaining a static table.

---

## 6. Accept & Contest — Request Schemas

### `POST /pg/disputes/{dispute_id}/accept`

```json
{}
```

No body required. Response is the current dispute object with `dispute_status: "{TYPE}_MERCHANT_ACCEPTED"`.

### `POST /pg/disputes/{dispute_id}/contest`

```json
{
    "evidence_document_urls": [
        "https://cdn.example.com/evidence/order_42_invoice.pdf",
        "https://cdn.example.com/evidence/order_42_delivery_proof.pdf"
    ],
    "evidence_text": "Free-form narrative, up to 2000 chars.",
    "contact_name":  "Ops Team",
    "contact_email": "disputes@example.com",
    "contact_phone": "9988776655"
}
```

### Evidence document limits

| Limit | Value |
|---|---|
| Max documents per contest | 10 (often 5 per category) |
| Max file size per document | ~5 MB |
| Supported formats | PDF, JPG, JPEG, PNG |
| URL requirement | HTTPS, publicly reachable at time of submission |
| URL TTL recommendation | ≥24h (Cashfree fetches within minutes; longer is safer for reviews) |

### When you can contest

Only while `dispute_status` ends in `CREATED` or `DOCS_RECEIVED`. Once `UNDER_REVIEW` or terminal, a contest POST returns `409 dispute_already_closed` or `409 contest_locked`. If the bank reopens (rare), a `DISPUTE_UPDATED` webhook reverts to `DOCS_RECEIVED` and you may re-submit.

### Best practice: cover every `mandatory` preferred_evidence item

```javascript
const dispute = await cashfree.PGFetchDispute(disputeId);
const required = dispute.data.preferred_evidence
    .filter(e => e.mandatory)
    .map(e => e.type);

const uploadedTypes = await uploadEvidenceToCdn(disputeId, required);
// uploadedTypes = { INVOICE: "https://...", PROOF_OF_DELIVERY: "https://..." }
const missing = required.filter(t => !uploadedTypes[t]);
if (missing.length) throw new Error(`Missing mandatory evidence: ${missing.join(", ")}`);

await cashfree.PGContestDispute(disputeId, {
    evidence_document_urls: Object.values(uploadedTypes),
    evidence_text: buildNarrative(dispute.data, uploadedTypes),
    contact_name: "Ops Team",
    contact_email: "disputes@example.com",
    contact_phone: "9988776655",
});
```

---

## 7. Webhook Events — Full Payloads

### Signature

Identical to all other Cashfree webhooks: `Base64(HMAC-SHA256(x-webhook-timestamp + rawBody, CASHFREE_SECRET_KEY))` = `x-webhook-signature`. `x-idempotency-key` header is present on v2025-01-01+.

### `DISPUTE_CREATED`

See SKILL.md §3 Step 1 for a full sample. Key points:

- Fires at every initial dispute — including each re-escalation (pre-arb, arb) as its own `DISPUTE_CREATED`.
- `data.dispute.respond_by` is the SLA.
- `data.dispute.dispute_action_on: "MERCHANT"` — action is yours.

### `DISPUTE_UPDATED`

Same envelope; fires on any of:

- Status change within a dispute (e.g., `CHARGEBACK_CREATED` → `CHARGEBACK_DOCS_RECEIVED`).
- Bank adding `cf_dispute_remarks` / issuer comments.
- `respond_by` extension (rare; occasionally Cashfree extends by one business day).
- Additional evidence request.

```json
{
    "data": {
        "dispute": {
            "dispute_id": 1234567,
            "dispute_type": "CHARGEBACK",
            "dispute_status": "CHARGEBACK_UNDER_REVIEW",
            "dispute_update": "Evidence received; under bank review.",
            "updated_at": "2026-04-19T14:00:00+05:30",
            "respond_by": "2026-05-18T23:59:59+05:30",
            ...
        },
        "order_details":     { ... },
        "customer_details":  { ... }
    },
    "event_time": "2026-04-19T14:00:00+05:30",
    "type": "DISPUTE_UPDATED"
}
```

### `DISPUTE_CLOSED`

Terminal. `resolved_at` is populated; `dispute_status` is one of the `MERCHANT_WON` / `MERCHANT_LOST` / `MERCHANT_ACCEPTED` / `INSUFFICIENT_EVIDENCE` variants.

```json
{
    "data": {
        "dispute": {
            "dispute_id": 1234567,
            "dispute_type": "CHARGEBACK",
            "dispute_status": "CHARGEBACK_MERCHANT_WON",
            "resolved_at": "2026-05-10T12:00:00+05:30",
            ...
        },
        "order_details":    { ... },
        "customer_details": { ... }
    },
    "event_time": "2026-05-10T12:00:00+05:30",
    "type": "DISPUTE_CLOSED"
}
```

Note: resolution may result in escalation — a `MERCHANT_WON` at `CHARGEBACK` can be followed days later by a fresh `DISPUTE_CREATED` at `PRE_ARBITRATION`.

---

## 8. Per-Language SDK Usage

Where the SDK doesn't yet expose named methods for disputes (older SDK versions), fall back to raw REST.

### Node.js

```javascript
// Fetch
const res = await fetch(`https://api.cashfree.com/pg/disputes/${disputeId}`, {
    headers: {
        "x-client-id": process.env.CASHFREE_APP_ID,
        "x-client-secret": process.env.CASHFREE_SECRET_KEY,
        "x-api-version": "2025-01-01",
    },
});
const dispute = await res.json();

// Contest
const contest = await fetch(`https://api.cashfree.com/pg/disputes/${disputeId}/contest`, {
    method: "POST",
    headers: {
        "x-client-id": process.env.CASHFREE_APP_ID,
        "x-client-secret": process.env.CASHFREE_SECRET_KEY,
        "x-api-version": "2025-01-01",
        "Content-Type": "application/json",
    },
    body: JSON.stringify({
        evidence_document_urls: evidenceUrls,
        evidence_text: narrative,
        contact_name: "Ops Team",
        contact_email: "disputes@example.com",
        contact_phone: "9988776655",
    }),
});
```

### Python

```python
import os, requests
HEADERS = {
    "x-client-id": os.environ["CASHFREE_APP_ID"],
    "x-client-secret": os.environ["CASHFREE_SECRET_KEY"],
    "x-api-version": "2025-01-01",
    "Content-Type": "application/json",
}
BASE = "https://api.cashfree.com/pg"

def fetch_dispute(dispute_id):
    return requests.get(f"{BASE}/disputes/{dispute_id}", headers=HEADERS, timeout=10).json()

def accept_dispute(dispute_id):
    return requests.post(f"{BASE}/disputes/{dispute_id}/accept", headers=HEADERS, timeout=10).json()

def contest_dispute(dispute_id, evidence_urls, narrative, contact):
    body = {
        "evidence_document_urls": evidence_urls,
        "evidence_text": narrative,
        **contact,
    }
    return requests.post(f"{BASE}/disputes/{dispute_id}/contest", headers=HEADERS, json=body, timeout=10).json()
```

### Go

```go
type DisputeContest struct {
    EvidenceDocumentURLs []string `json:"evidence_document_urls"`
    EvidenceText         string   `json:"evidence_text"`
    ContactName          string   `json:"contact_name"`
    ContactEmail         string   `json:"contact_email"`
    ContactPhone         string   `json:"contact_phone"`
}

func contestDispute(disputeID int64, body DisputeContest) (*http.Response, error) {
    data, _ := json.Marshal(body)
    req, _ := http.NewRequest("POST",
        fmt.Sprintf("https://api.cashfree.com/pg/disputes/%d/contest", disputeID),
        bytes.NewReader(data))
    req.Header.Set("x-client-id", os.Getenv("CASHFREE_APP_ID"))
    req.Header.Set("x-client-secret", os.Getenv("CASHFREE_SECRET_KEY"))
    req.Header.Set("x-api-version", "2025-01-01")
    req.Header.Set("Content-Type", "application/json")
    return http.DefaultClient.Do(req)
}
```

### cURL

```bash
# Fetch
curl "https://api.cashfree.com/pg/disputes/1234567" \
    -H "x-client-id: $CASHFREE_APP_ID" \
    -H "x-client-secret: $CASHFREE_SECRET_KEY" \
    -H "x-api-version: 2025-01-01"

# Accept
curl -X POST "https://api.cashfree.com/pg/disputes/1234567/accept" \
    -H "x-client-id: $CASHFREE_APP_ID" \
    -H "x-client-secret: $CASHFREE_SECRET_KEY" \
    -H "x-api-version: 2025-01-01"

# Contest
curl -X POST "https://api.cashfree.com/pg/disputes/1234567/contest" \
    -H "x-client-id: $CASHFREE_APP_ID" \
    -H "x-client-secret: $CASHFREE_SECRET_KEY" \
    -H "x-api-version: 2025-01-01" \
    -H "Content-Type: application/json" \
    -d '{
        "evidence_document_urls": ["https://cdn.example.com/ev1.pdf"],
        "evidence_text": "See attached invoice, delivery proof, customer comms.",
        "contact_name": "Ops", "contact_email": "d@ex.com", "contact_phone": "9988776655"
    }'
```

---

## 9. Dispute Fees

Cashfree typically passes through the card-network chargeback / retrieval fees to the merchant:

| Event | Fee appearance | Reversible on win? |
|---|---|---|
| Retrieval request | Usually zero or small | N/A |
| Chargeback raised | Per-incident fee (merchant-specific; ₹250–₹500 typical) | Sometimes — network-dependent |
| Arbitration initiated | ₹2000–₹5000 + network fees | Loser pays |

All fees surface in settlement recon as `OTHER_ADJUSTMENT` DEBIT events tied to the `dispute_id`.

---

## 10. How Disputes Affect Refunds

- If you **refund** during an open `RETRIEVAL` or `DISPUTE` stage, the dispute usually auto-closes as resolved. Include the refund `refund_arn` in any follow-up contest evidence.
- If you **refund** during an open `CHARGEBACK`, the amount is **still debited** by the bank — you'll end up with a double-debit that reverses when you accept the chargeback. Avoid refunding once `CHARGEBACK_CREATED` has fired unless you've already accepted.
- If you **win** a chargeback, a `CHARGEBACK_REVERSAL` credits your next settlement. Do not refund in addition — you've already gotten the money back.

---

## 11. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Contest returns `409 dispute_already_closed` | Status moved to UNDER_REVIEW or terminal | Fetch first, check status, contest only on `CREATED`/`DOCS_RECEIVED` |
| Contest returns `400 evidence_url_unreachable` | URL 404, non-HTTPS, or expired presign | Re-issue presigned URL with ≥24h TTL; confirm curl from your server works |
| Lost despite contesting | Missing mandatory items in `preferred_evidence` | Always cover every mandatory item; narrative alone is insufficient |
| Cross-dispute escalation lost by default | Treated `PRE_ARBITRATION_CREATED` as a duplicate of the won chargeback | Treat every `*_CREATED` webhook as a fresh case; new SLA applies |
| `DISPUTE_CLOSED` came without `DISPUTE_UPDATED` | Auto-accept via inaction (`INSUFFICIENT_EVIDENCE`) | You missed the SLA; wire a reminder |
| `respond_by` is in the past on `DISPUTE_CREATED` | Backdated dispute from a retry | Contest immediately — Cashfree usually accepts late submissions within hours of `respond_by` if the delay is its own |

---

## 12. See Also

- `pg/webhooks/SKILL.md` — signature verification, idempotency for all event types.
- `settlements-and-reconciliation/references/REFERENCE.md` §2 — how `CHARGEBACK` / `CHARGEBACK_REVERSAL` / `DISPUTE` events appear as DEBIT/CREDIT rows.
- `pg/refunds/SKILL.md` — interaction between refunds and open disputes.
- `common-mistakes/SKILL.md` — general webhook + signature gotchas.
