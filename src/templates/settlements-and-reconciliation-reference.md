---
name: Settlements & Reconciliation — Reference
description: >
  Deep reference for Cashfree settlements and reconciliation. Full field-level schema for the
  Settlement Reconciliation API, every event_type / sale_type / event_status value, endpoint rate
  limits, per-language SDK code for PGFetchSettlements / PGOrderFetchSettlement /
  PGSettlementReconciliation / PGPaymentReconciliation, a sample idempotent reconciler,
  and troubleshooting for fees, TDS, and fund-sweep adjustments. Read after SKILL.md.
---

# Settlements & Reconciliation — Reference

> Read `../SKILL.md` first for the cycle overview, webhook ingestion pattern, and the bank-matching workflow. This file is the schema + code source of truth.

---

## 1. Endpoint Map

| Method | Path | Purpose | SDK method |
|---|---|---|---|
| GET | `/pg/settlements` | List settlements with filters | `PGFetchSettlements` |
| GET | `/pg/orders/{order_id}/settlements` | Settlements for one order | `PGOrderFetchSettlement` |
| POST | `/pg/settlement/recon` | Event-level breakdown of one or more settlements | `PGSettlementReconciliation` |
| POST | `/pg/recon` | Transaction-level recon by date range | `PGPaymentReconciliation` |

All endpoints: `x-client-id`, `x-client-secret`, `x-api-version: 2025-01-01`, `Content-Type: application/json`.

### Rate limits

Settlements endpoints are rate-limited **per account**. See `pg/apis/references/REFERENCE.md` §1 for the full table — current production limits:

| Endpoint | Limit / min |
|---|---|
| `GET /pg/settlements` | 30 |
| `GET /pg/orders/{id}/settlements` | 30 |
| `POST /pg/settlement/recon` | 30 |
| `POST /pg/recon` | 30 |

Sandbox limits are ~20/min. Respect `x-ratelimit-retry` on 429 responses; back off exponentially.

---

## 2. Settlement Reconciliation — Full Response Schema

`POST /pg/settlement/recon`

### Request body

```json
{
    "pagination": {
        "limit": 1000,
        "cursor": null
    },
    "filters": {
        "cf_settlement_ids": [12345, 12346],
        "settlement_utrs": ["AXIS1234567890"],
        "start_date": "2026-04-01T00:00:00+05:30",
        "end_date":   "2026-04-30T23:59:59+05:30"
    }
}
```

- `pagination.limit` — integer, max `1000`, default `10`.
- `pagination.cursor` — string, `null` on first call; use the `cursor` returned in each response until it becomes `null`.
- `filters` — any one of `cf_settlement_ids`, `settlement_utrs`, or `start_date`+`end_date` is required. Combinations AND together.

### Response shape

```json
{
    "cursor": "eyJpZCI6MTIzNDU2fQ==",
    "data": [
        {
            "event_details":     { ... },
            "order_details":     { ... },
            "customer_details":  { ... },
            "payment_details":   { ... },
            "settlement_details":{ ... },
            "dispute_details":   { ... },
            "refund_details":    { ... }
        }
    ]
}
```

### Nested object schemas

**`event_details`** — this is the row's identity (one per debit/credit event):

| Field | Type | Values |
|---|---|---|
| `event_id` | string | — |
| `event_type` | enum | `PAYMENT`, `REFUND`, `REFUND_REVERSAL`, `DISPUTE`, `DISPUTE_REVERSAL`, `CHARGEBACK`, `CHARGEBACK_REVERSAL`, `OTHER_ADJUSTMENT`, `FUND_SWEEP_REVERSAL` |
| `event_amount` | number (rupees) | Event's gross amount |
| `event_currency` | string | `INR` |
| `event_settlement_amount` | number | Net after fees, contributes to `amount_settled` |
| `sale_type` | enum | `CREDIT` (adds to settlement), `DEBIT` (deducts) |
| `event_status` | enum | `SUCCESS`, `FAILED`, `PENDING`, `CANCELLED` |
| `event_time` | ISO-8601 string | — |
| `event_service_charge` | number | PG fee for this event |
| `event_service_tax` | number | GST on the event fee |
| `event_remarks` | string | Free text |
| `entity` | string | Always `"settlement_event"` |

**`order_details`**:

| Field | Type |
|---|---|
| `order_id` | string |
| `order_amount` | number |
| `order_currency` | string |
| `order_tags` | object |

**`customer_details`** (contains PII — redact before logging/exporting):

| Field | Type |
|---|---|
| `customer_id`, `customer_name`, `customer_email`, `customer_phone` | string |
| `customer_bank_account_number`, `customer_bank_code`, `customer_bank_ifsc` | string (bank-transfer payments only) |

**`payment_details`**:

| Field | Type |
|---|---|
| `cf_payment_id` | integer |
| `payment_amount`, `payment_currency` | — |
| `payment_mode` | string (`UPI`, `CARD`, `NET_BANKING`, `WALLET`, `EMI`, `PAY_LATER`, `BANK_TRANSFER`) |
| `payment_time` | ISO-8601 |
| `payment_service_charge`, `payment_service_tax` | number |
| `bank_reference` | string |
| `status` | `SUCCESS`, `FAILED`, `PENDING`, … |
| `forex_conversion_handling_charge`, `forex_conversion_handling_tax`, `charges_currency` | number / string — only for cross-border |

**`settlement_details`**:

| Field | Type |
|---|---|
| `cf_settlement_id` | integer |
| `utr` | string |
| `settlement_date` | date |
| `settlement_initiated_on` | ISO-8601 |
| `payment_from`, `payment_till` | ISO-8601 — the capture window this settlement covers |
| `service_charge`, `service_tax` | aggregate event fees |
| `settlement_charge`, `settlement_tax` | instant/on-demand fees only |
| `split_service_charge`, `split_service_tax` | Easy-Split fees |
| `vendor_commission` | Easy-Split commission on this event |
| `amount_settled` | net rupees of this event going to the merchant |
| `adjustment` | prior-cycle correction |
| `reason`, `remarks` | strings |
| `settlement_type` | `STANDARD`, `INSTANT`, `ON_DEMAND` |

**`dispute_details`** (present for dispute/chargeback events):

| Field | Type |
|---|---|
| `dispute_category`, `dispute_note` | string |
| `dispute_resolved_on`, `resolved_on` | ISO-8601 |
| `closed_in_favor_of` | `MERCHANT` \| `CUSTOMER` |

**`refund_details`** (present for refund events):

| Field | Type |
|---|---|
| `refund_id` | string |
| `refund_arn` | string (bank's acquirer reference number) |
| `refund_note` | string |
| `refund_processed_at` | ISO-8601 |

### Response headers

`x-request-id`, `x-api-version`, `x-idempotency-key` (for the *request*, not a webhook), `x-idempotency-replayed` (`true` if you re-sent a prior idempotency key), `x-ratelimit-*`.

---

## 3. List Settlements — Response Fields

`GET /pg/settlements` returns an array of settlement objects (not recon rows). Each settlement:

| Field | Type | Notes |
|---|---|---|
| `cf_settlement_id` | integer | Primary key. Use as dedupe key across webhook + API |
| `entity` | string | `"settlement"` |
| `amount` | number | Same as `payment_amount` on webhook — gross |
| `amount_settled` | number | Net; rupees hitting the bank |
| `amount_withheld` | number | Non-zero when funds are held (disputes, risk) |
| `settlement_currency` | string | `INR` |
| `status` | enum | `INITIATED`, `SUCCESS`, `FAILED`, `REVERSED` |
| `service_charge` / `service_tax` | number | PG fee breakdown |
| `adjustment` / `refund` / `chargeback` / `tax` | number | Aggregates |
| `type` | enum | `STANDARD`, `INSTANT`, `ON_DEMAND` |
| `utr` | string | Populated at `SUCCESS` |
| `payment_time` / `settlement_time` | ISO-8601 | — |
| `settlement_bank` / `settlement_bank_account_number` | string | Target bank account |
| `remarks` | string | — |
| `merchant_id` | string | Cashfree merchant id (for partner accounts) |

Query params: `start_date`, `end_date`, pagination `cursor` + `limit`.

---

## 4. Per-Language SDK Usage

All examples assume the SDK has already been initialized per `pg/backend-sdks/SKILL.md` §3.

### Node.js

```javascript
// All settlements in a window
const res = await cashfree.PGFetchSettlements({
    pagination: { limit: 100, cursor: null },
    filters: {
        start_date: "2026-04-01T00:00:00+05:30",
        end_date: "2026-04-30T23:59:59+05:30",
    },
});

// Recon events for one settlement
const recon = await cashfree.PGSettlementReconciliation({
    pagination: { limit: 1000, cursor: null },
    filters: { cf_settlement_ids: [12345] },
});

// Order-scoped settlements
const orderSettles = await cashfree.PGOrderFetchSettlement(orderId);
```

### Python

```python
from cashfree_pg.api_client import Cashfree
from cashfree_pg.models.settlement_fetch_request import SettlementFetchRequest
from cashfree_pg.models.fetch_settlements_request import FetchSettlementsRequest

res = Cashfree().PGFetchSettlements("2025-01-01", FetchSettlementsRequest(
    pagination={"limit": 100, "cursor": None},
    filters={"start_date": "2026-04-01T00:00:00+05:30", "end_date": "2026-04-30T23:59:59+05:30"},
))

recon = Cashfree().PGSettlementReconciliation("2025-01-01", SettlementFetchRequest(
    pagination={"limit": 1000, "cursor": None},
    filters={"cf_settlement_ids": [12345]},
))
```

### Java

```java
Cashfree cashfree = new Cashfree();
FetchSettlementsRequest req = new FetchSettlementsRequest();
req.setPagination(new PaginationForSettlements().limit(100).cursor(null));
req.setFilters(new FetchSettlementsFilters()
        .startDate("2026-04-01T00:00:00+05:30")
        .endDate("2026-04-30T23:59:59+05:30"));
var res = cashfree.PGFetchSettlements("2025-01-01", req, null, null, null);
```

### Go

```go
xApiVersion := "2025-01-01"
req := cashfree.FetchSettlementsRequest{
    Pagination: &cashfree.PaginationForSettlements{Limit: 100},
    Filters:    &cashfree.FetchSettlementsFilters{StartDate: &start, EndDate: &end},
}
res, _, err := cashfree.PGFetchSettlements(&xApiVersion, &req, nil, nil, nil)
```

### Direct REST (Ruby / PHP / any language)

```bash
curl -X POST "https://api.cashfree.com/pg/settlement/recon" \
  -H "x-client-id: $CASHFREE_APP_ID" \
  -H "x-client-secret: $CASHFREE_SECRET_KEY" \
  -H "x-api-version: 2025-01-01" \
  -H "Content-Type: application/json" \
  -d '{"pagination":{"limit":1000,"cursor":null},"filters":{"cf_settlement_ids":[12345]}}'
```

---

## 5. Sample Idempotent Reconciler (Python)

A pattern merchants frequently implement as a cron: walk all new settlements since last run, pull recon rows, upsert, and mark processed.

```python
import os, time
from cashfree_pg.api_client import Cashfree

Cashfree.XClientId = os.environ["CASHFREE_APP_ID"]
Cashfree.XClientSecret = os.environ["CASHFREE_SECRET_KEY"]
Cashfree.XEnvironment = Cashfree.XProduction

def pull_settlements_since(iso_from, iso_to):
    cursor = None
    while True:
        res = Cashfree().PGFetchSettlements("2025-01-01", {
            "pagination": {"limit": 200, "cursor": cursor},
            "filters": {"start_date": iso_from, "end_date": iso_to},
        })
        for s in res.data.data:
            upsert_settlement(s)                           # keyed by cf_settlement_id
            if s.status == "SUCCESS":
                pull_recon_for(s.cf_settlement_id)
        cursor = res.data.cursor
        if not cursor: break

def pull_recon_for(cf_settlement_id):
    cursor = None
    while True:
        res = Cashfree().PGSettlementReconciliation("2025-01-01", {
            "pagination": {"limit": 1000, "cursor": cursor},
            "filters": {"cf_settlement_ids": [cf_settlement_id]},
        })
        for row in res.data.data:
            upsert_event(row)                              # keyed by event_details.event_id
        cursor = res.data.cursor
        if not cursor: break
```

Keys to avoid double-processing:

- Settlements are unique by `cf_settlement_id`.
- Recon events are unique by `event_details.event_id` (stable across retries).
- Webhooks carry `x-idempotency-key` (≥ v2025-01-01) — if you ingest both the webhook and the API nightly, use the API as source-of-truth and the webhook as a real-time trigger.

---

## 6. PG Reconciliation (Transaction-level)

`POST /pg/recon` returns **every transaction** (orders + payments + refunds) in a date window — regardless of settlement state. Use it for "what was captured yesterday" reports that can't wait for a settlement cycle.

### Request

```json
{
    "pagination": { "limit": 1000, "cursor": null },
    "filters": {
        "start_date": "2026-04-18T00:00:00+05:30",
        "end_date":   "2026-04-18T23:59:59+05:30"
    }
}
```

### Response row fields

| Field | Type |
|---|---|
| `order_details` | see §2 |
| `payment_details` | see §2 (also `auth_id`, `international_payment` flag) |
| `refund_details` | if the transaction is a refund |
| `event_time` | ISO-8601 |

Pagination identical to settlement recon.

### Choosing between the two recon APIs

| Use case | Endpoint |
|---|---|
| "Show me every payment captured yesterday, even if unsettled" | `POST /pg/recon` |
| "Show me every rupee in each settlement line-by-line" | `POST /pg/settlement/recon` |
| "What's the net payout in my bank this week?" | `GET /pg/settlements` |
| "Why was this specific order's net different from gross?" | `GET /pg/orders/{id}/settlements` + recon filtered by that `cf_settlement_id` |

---

## 7. MIS Reports (Dashboard)

Programmatic APIs cover most needs; for accountants who want scheduled CSV/XLSX emails or SFTP delivery, use Dashboard → Reports → Scheduled Reports.

| Report | What it contains |
|---|---|
| Transactions | Every order + payment attempt in the period |
| Settlements | Same as `GET /pg/settlements` output |
| Settlement Recon | Same as `POST /pg/settlement/recon` output |
| Ledger | Running balance view (for partner/platform accounts) |
| Refunds | Every refund with processed speed + status |
| Vendor Recon | Per-vendor breakdown for Easy-Split accounts |
| Disputes | All disputes with current status |

Each report supports: one-off download, daily/weekly schedule to email, or SFTP drop-off.

---

## 8. Troubleshooting

### "My bank statement has a credit but I don't have a matching `SETTLEMENT_SUCCESS` webhook"

- Check **Dashboard → PG → Developers → Webhooks → Logs**; the delivery may have failed (non-200 or timeout) and be in retry.
- Use **Batch Resend** to replay from the Dashboard. Your handler must be idempotent — see §5.
- Fall back to `GET /pg/settlements?settlement_utrs=<UTR_FROM_BANK>` to fetch by UTR directly.

### "A payment captured last week isn't in any settlement yet"

- Inspect `GET /pg/orders/{order_id}/settlements`. If empty, the payment is still in the upcoming cycle's window or is on **hold** (new-merchant holds, dispute under review, risk).
- For risk-hold, check Dashboard → Payment Gateway → Settlement Hold.

### "Our computed net doesn't match `amount_settled`"

- Most common: missed pages (cursor not followed to `null`).
- Second most common: ignoring `adjustment` and prior-cycle `REFUND_REVERSAL` / `CHARGEBACK_REVERSAL` events — these can be positive.
- TDS (1% under §194-O) is applied **off** the settlement amount for e-commerce operator merchants; download the MIS TDS report monthly and reconcile separately against Form 26AS.

### "We got `SETTLEMENT_REVERSED`"

- A rare event — bank recalled the transfer (usually due to account closure or stop-payment). Cashfree will re-initiate once the account is fixed. Mark the original row as reversed; do not double-book income when the retry succeeds.

### "Why do refund_arn and refund_processed_at appear in the recon row but not in the original webhook?"

- `refund_arn` is assigned by the acquiring bank at processing time, which is later than the refund API call. The settlement recon row is authoritative; the webhook's `refund_arn` is populated at `REFUND_STATUS_WEBHOOK` with `refund_status: "SUCCESS"`.

---

## 9. See Also

- `pg/webhooks/references/REFERENCE.md` — full webhook payload schemas including `SETTLEMENT_SUCCESS`.
- `pg/apis/references/REFERENCE.md` §1 — rate limit table; §New — client-side API idempotency.
- `pg/refunds/SKILL.md` — when refunds hit the settlement cycle.
- `pg/disputes/SKILL.md` — how chargebacks appear as debits in settlement recon.
- `common-mistakes/SKILL.md` — general webhook + signature gotchas.
