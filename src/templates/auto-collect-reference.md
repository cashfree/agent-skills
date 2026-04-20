---
name: Cashfree Auto Collect — Reference
description: >
  Deep reference for Cashfree Auto Collect (Virtual Bank Accounts, UPI VPAs, QR). Full VBA
  schema with KYC + remitter-lock + amount-lock, every bank_codes rail (UTIB Axis / ICIC ICICI
  / YESB Yes), VBA_CREDIT webhook payload, per-language SDK code, notification_group routing,
  and troubleshooting bank-side allocation delays. Read after Auto Collect SKILL.md.
---

# Cashfree Auto Collect — Reference

> Read `../SKILL.md` first for the VBA lifecycle, the three rails, and the four use-case patterns. This file is the schema + per-rail source of truth.

---

## 1. Endpoint Map

| Method | Path | Purpose |
|---|---|---|
| POST | `/pg/vba` | Create VBA |
| GET  | `/pg/vba` | List VBAs (filters: status, date range) |
| GET  | `/pg/vba/{virtual_account_id}` | Fetch one |
| GET  | `/pg/vba/{virtual_account_id}/payments` | List credits to this VBA |
| POST | `/pg/vba/{virtual_account_id}/close` | Deactivate |

Headers: `x-client-id`, `x-client-secret`, `x-api-version` (check current — VBA endpoints sometimes require `2024-07-10` or `2025-01-01`; latest always preferred).

---

## 2. VBA Create — Full Schema

```jsonc
{
    // Identity (required)
    "virtual_account_id":   "vba_customer_42",          // alphanumeric only
    "virtual_account_name": "Acme Logistics Pvt Ltd",   // alphanumeric + whitespace
    "virtual_account_email": "accounts@acme.com",
    "virtual_account_phone": "9999999999",

    // KYC (optional, but often required for compliance on B2B)
    "gst":     "07AAACR1234K1Z5",
    "pan":     "AAACR1234K",
    "aadhaar": "XXXX-XXXX-1234",       // last-4 only for display; API accepts full or masked per config

    // Remitter lock — accept only from this payer bank account
    "account_number": "50100123456789",
    "ifsc":           "HDFC0001234",

    // Amount lock — reject payments outside this range
    "min_amount": 100,                  // integer rupees
    "max_amount": 1000000,

    // Rail selection
    "bank_codes":         ["UTIB", "ICIC", "YESB"],  // Axis, ICICI, Yes. Omit = Cashfree picks

    // Notification routing
    "notification_group": "finance_team"             // group name, not per-VBA
}
```

### Field constraints

| Field | Constraints |
|---|---|
| `virtual_account_id` | `[a-zA-Z0-9]+`, unique per merchant, ≤ 50 chars |
| `virtual_account_name` | Shown on customer's bank statement as beneficiary — alphanumeric + space only |
| `account_number` | Remitter's bank account; if set with `ifsc`, enables remitter lock |
| `bank_codes` | Subset of `["UTIB", "ICIC", "YESB"]`. Not all banks are enabled on every merchant — check Dashboard |
| `min_amount` / `max_amount` | Integer rupees. Missing = no limits |
| `notification_group` | Free-form string. Used to route webhooks (see §5) |

---

## 3. Response Schema

```jsonc
{
    "virtual_account_id":  "vba_customer_42",
    "vba_account_number":  "2323232323232323",        // VBA account on the allocated bank
    "vba_ifsc":            "YESB0CMSNOC",              // allocated bank's IFSC
    "vba_bank_code":       "YESB",                     // which bank was picked
    "vba_status":          "ACTIVE",                   // ACTIVE | PENDING | CLOSED
    "vba_vpa":             "vba_customer_42@cfhdfc",  // static UPI VPA
    "vba_qr":              "data:image/png;base64,iVBORw0K...",  // QR PNG
    "vba_created_on":      "2026-04-19T10:00:00+05:30",
    "vba_last_updated_on": "2026-04-19T10:00:00+05:30",
    // Echoes of the input
    "virtual_account_name": "Acme Logistics Pvt Ltd",
    "min_amount": 100, "max_amount": 1000000,
    "bank_codes": ["UTIB", "ICIC", "YESB"]
}
```

### VBA statuses

| Status | Meaning |
|---|---|
| `PENDING` | Cashfree requested the VBA; bank-side allocation not yet complete. Typically `ACTIVE` within 15 min |
| `ACTIVE` | VBA is live; can receive inbound payments |
| `CLOSED` | Merchant has called `/close`. Inbound transfers bounce |

---

## 4. VBA_CREDIT Webhook Payload

```json
{
    "data": {
        "vba": {
            "virtual_account_id": "vba_customer_42",
            "vba_account_number": "2323232323232323",
            "vba_ifsc": "YESB0CMSNOC",
            "vba_vpa":  "vba_customer_42@cfhdfc",
            "virtual_account_name": "Acme Logistics Pvt Ltd",
            "notification_group": "finance_team"
        },
        "payment": {
            "cf_payment_id": 893827472,
            "amount": 5000.00,
            "currency": "INR",
            "rail": "IMPS",                 // IMPS | NEFT | RTGS | UPI
            "utr": "204910123456",
            "credited_at": "2026-04-19T10:30:00+05:30",
            "status": "SUCCESS"
        },
        "remitter": {
            "account_number": "XXXX6789",   // masked
            "ifsc":           "HDFC0001234",
            "name":           "Rajesh Kumar"
        }
    },
    "event_time": "2026-04-19T10:30:05+05:30",
    "type": "VBA_CREDIT"
}
```

Signature verification: `Base64(HMAC-SHA256(x-webhook-timestamp + rawBody, CASHFREE_SECRET_KEY))` = `x-webhook-signature`. Identical to other Cashfree webhooks.

Dedupe on `cf_payment_id` + `utr`.

---

## 5. notification_group Routing

Multiple VBAs can share a `notification_group`. You can configure different webhook URLs for different groups in Dashboard → Auto Collect → Webhooks.

Typical patterns:

| Use case | Groups |
|---|---|
| Separate finance email vs. ops team | `finance_team`, `ops_team` |
| Per-BU routing | `bu_india`, `bu_middle_east` |
| Per-product webhook endpoint | `invoicing_service`, `wallet_service` |

If `notification_group` is omitted, the default PG webhook URL receives the credit. Most merchants use defaults and route internally after receipt.

---

## 6. Rails — Per-Bank Behaviour

| Rail | Bank (by `vba_bank_code`) | UPI support | IMPS support | NEFT | RTGS |
|---|---|---|---|---|---|
| `UTIB` | Axis Bank | ✅ | ✅ | ✅ | ✅ |
| `ICIC` | ICICI Bank | ✅ | ✅ | ✅ | ✅ |
| `YESB` | Yes Bank | ✅ | ✅ | ✅ | ✅ |

RTGS has a hard **minimum ₹2,00,001** — regardless of your VBA's `max_amount`, transfers below this won't use RTGS. IMPS and NEFT don't have a minimum.

VPA format: typically `{virtual_account_id}@cfhdfc` / `@cfyesb` / `@cficici` depending on allocated rail; the full string comes back in `vba_vpa`.

---

## 7. Per-Language SDK Usage

VBA endpoints may not yet be surfaced as named SDK methods in all languages. Raw REST is the most reliable path.

### Node.js

```javascript
async function createVBA(body) {
    const res = await fetch("https://api.cashfree.com/pg/vba", {
        method: "POST",
        headers: {
            "x-client-id": process.env.CASHFREE_APP_ID,
            "x-client-secret": process.env.CASHFREE_SECRET_KEY,
            "x-api-version": "2025-01-01",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    return res.json();
}

const vba = await createVBA({
    virtual_account_id: "dealer_17_may",
    virtual_account_name: "Acme - Dealer 17",
    virtual_account_email: "d17@example.com",
    virtual_account_phone: "9988776655",
    min_amount: 100,
    max_amount: 500000,
    bank_codes: ["UTIB", "ICIC"],
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
def create_vba(body):
    return requests.post("https://api.cashfree.com/pg/vba", headers=HDR, json=body).json()

def list_payments(vid):
    return requests.get(f"https://api.cashfree.com/pg/vba/{vid}/payments", headers=HDR).json()

def close_vba(vid):
    return requests.post(f"https://api.cashfree.com/pg/vba/{vid}/close", headers=HDR).json()
```

### Java

```java
var client = HttpClient.newHttpClient();
var req = HttpRequest.newBuilder()
    .uri(URI.create("https://api.cashfree.com/pg/vba"))
    .header("x-client-id", System.getenv("CASHFREE_APP_ID"))
    .header("x-client-secret", System.getenv("CASHFREE_SECRET_KEY"))
    .header("x-api-version", "2025-01-01")
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(bodyJson))
    .build();
var res = client.send(req, HttpResponse.BodyHandlers.ofString());
```

### Raw curl

```bash
curl -X POST "https://api.cashfree.com/pg/vba" \
    -H "x-client-id: $APP_ID" -H "x-client-secret: $SECRET_KEY" \
    -H "x-api-version: 2025-01-01" -H "Content-Type: application/json" \
    -d '{
        "virtual_account_id": "vba_customer_42",
        "virtual_account_name": "Acme",
        "virtual_account_email": "a@ex.com",
        "virtual_account_phone": "9988776655",
        "min_amount": 100,
        "max_amount": 500000,
        "bank_codes": ["UTIB", "ICIC"]
    }'
```

---

## 8. Error Codes

| HTTP | `code` | Meaning | Fix |
|---|---|---|---|
| 400 | `virtual_account_id_invalid` | Bad chars or already exists | Alphanumeric only; unique |
| 400 | `bank_codes_invalid` | Bank not enabled on merchant | Remove; or contact Cashfree to enable |
| 400 | `min_max_amount_invalid` | min > max | Swap |
| 400 | `remitter_lock_incomplete` | `account_number` without `ifsc` or vice versa | Provide both |
| 404 | `vba_not_found` | Wrong id | Check path |
| 409 | `virtual_account_id_already_exists` | Reused id | Generate fresh |
| 422 | `idempotency_error` | `x-idempotency-key` mismatch | Fresh key or send original body |
| 429 | — | Rate limit | Respect `x-ratelimit-retry` |
| 502 | `bank_processing_failure` | Bank-side allocation issue | Retry; contact Cashfree if persistent |

---

## 9. Settlement Behaviour

VBA credits roll up into your standard PG settlement cycle. In `POST /pg/settlement/recon`, VBA credits appear as rows with:

- `event_details.event_type: "PAYMENT"`
- `event_details.sale_type: "CREDIT"`
- `order_details.order_id` — synthetically generated by Cashfree for the VBA credit (pattern: `CFVA_<cf_payment_id>`)
- `payment_details.payment_mode: "BANK_TRANSFER"` or `"UPI"` depending on rail

You can filter recon rows by `order_id LIKE 'CFVA_%'` to isolate VBA inflows from regular PG traffic. See `settlements-and-reconciliation/references/REFERENCE.md`.

---

## 10. Troubleshooting

| Issue | Cause | Resolution |
|---|---|---|
| VBA stuck `PENDING` > 1 hour | Bank allocation backlog | Check Dashboard; contact Cashfree support with `virtual_account_id` |
| Customer's transfer shows in their bank but no webhook | Remitter-lock rejection, or bank-side hold | `GET /pg/vba/{id}/payments` — rejected transfers appear with failure reason |
| Wrong amount credited despite `min_amount`/`max_amount` | Amount check happens at Cashfree, not at payer bank — if the bank already debited the customer, Cashfree auto-returns | Customer sees reversal in ~2–3 working days; log the rejected event |
| UPI VPA works in PhonePe but not GPay | VPA-app compatibility issue with certain handle formats | Fall back to bank-transfer rail; share `vba_account_number` + `vba_ifsc` |
| `vba_qr` base64 image too long for our invoice PDF | Large data URI | Decode to PNG, host on your own CDN, use the URL |
| Duplicate credits for same UTR | Bank retry + Cashfree re-delivery | Dedupe on `cf_payment_id` + `utr` |
| Closed VBA still receiving "credits" in test | Sandbox may not enforce closure | Production-only; test closure by closing and re-simulating |
| Branch reconciliation: too many VBAs to manage | Creating one per branch hitting account limits | Contact Cashfree for higher limits; typical tiers allow thousands |

---

## 11. See Also

- `pg/payment-links/SKILL.md` — when a shareable link is better than a VBA.
- `settlements-and-reconciliation/SKILL.md` — where VBA credits surface.
- `pg/webhooks/SKILL.md` — signature verification (same as all Cashfree webhooks).
- `payouts/SKILL.md` — reversing a mis-credited VBA payment.
- `common-mistakes/SKILL.md` — general webhook gotchas.
