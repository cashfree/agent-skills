---
name: Cashfree Auto Collect — Reference
description: >
  Deep reference for Cashfree Auto Collect (Virtual Bank Accounts). Full VBA
  schema with KYC + remitter-lock + amount-lock, every bank_codes rail (UTIB Axis / ICIC ICICI
  / YESB Yes), VBA credit webhook (PAYMENT_SUCCESS_WEBHOOK with vba_transfer), per-language SDK code, notification_group routing,
  and troubleshooting bank-side allocation delays. Read after Auto Collect SKILL.md.
---

# Cashfree Auto Collect — Reference

> Read `../SKILL.md` first for the VBA lifecycle and the four use-case patterns. This file is the schema source of truth. A VBA collects via **bank transfer (IMPS/NEFT/RTGS) only** — there is no UPI-VPA or QR rail.

---

## 1. Endpoint Map

| Method | Path | Purpose |
|---|---|---|
| POST | `/pg/vba` | Create VBA |
| GET  | `/pg/vba/{virtual_account_id}` | Get VBA details |
| PUT  | `/pg/vba/{virtual_account_id}` | Edit / deactivate VBA (set `INACTIVE`) |
| POST | `/pg/vba/payments` | List credits (filters in the body) |
| GET  | `/pg/vba/payments/{utr}` | Get a specific credit by UTR |
| POST | `/pg/vba/notificationgroup` | Create notification group |
| PUT  | `/pg/vba/notificationgroup/{notification_group_name}` | Edit notification group |

Headers: `x-client-id`, `x-client-secret`, **`x-api-version: 2024-07-10`** (VBA's own version — not the PG `2025-01-01`), `Content-Type: application/json`.

> There is no "list all VBAs" endpoint and no `/close`. Deactivate by editing to `INACTIVE` via `PUT /pg/vba/{virtual_account_id}`.

---

## 2. VBA Create — Full Schema

The request body is **nested**:

```jsonc
{
    "virtual_account_details": {                          // required
        "virtual_account_id":    "vba_customer_42",       // alphanumeric only, ≤ 20 chars
        "virtual_account_name":  "Acme Logistics Pvt Ltd",// alphanumeric + whitespace
        "virtual_account_email": "accounts@acme.com",     // optional
        "virtual_account_phone": "9999999999"             // optional
    },
    "kyc_details": {                                      // optional
        "gst":     "07AAACR1234K1Z5",
        "pan":     "AAACR1234K",
        "aadhaar": "655675523712"                         // full 12-digit
    },
    "remitter_lock_details": {                            // optional — accept only from these payers
        "allowed_remitters": [
            { "account_number": "50100123456789", "ifsc": "HDFC0001234" }
        ]
    },
    "amount_lock_details": {                              // optional — reject outside range
        "min_amount": 100,                                // integer rupees
        "max_amount": 1000000
    },
    "bank_codes": ["UTIB", "ICIC", "YESB"],               // optional. Axis, ICICI, Yes. Omit = Cashfree picks
    "notification_group": "finance_team"                  // optional; group name, not per-VBA
}
```

### Field constraints

| Field | Constraints |
|---|---|
| `virtual_account_details.virtual_account_id` | `[a-zA-Z0-9]+`, unique per merchant, **≤ 20 chars** |
| `virtual_account_details.virtual_account_name` | Shown on customer's bank statement as beneficiary — alphanumeric + space |
| `remitter_lock_details.allowed_remitters[]` | Each `{account_number, ifsc}`; enables remitter lock. Supports multiple |
| `bank_codes` | Subset of `["UTIB", "ICIC", "YESB"]`. Not all banks are enabled on every merchant — check Dashboard |
| `amount_lock_details.min_amount` / `max_amount` | Integer rupees. Missing = no limits |
| `notification_group` | Free-form string. Used to route webhooks (see §5) |

---

## 3. Response Schema

```jsonc
{
    "vba_account_number":  "2323232323232323",        // VBA account on the allocated bank
    "vba_ifsc":            "YESB0CMSNOC",              // allocated bank's IFSC
    "vba_bank_code":       "YESB",                     // which bank was picked
    "vba_status":          "ACTIVE",                   // ACTIVE | INACTIVE
    "vba_created_on":      "2026-04-19T10:00:00+05:30",
    "vba_last_updated_on": "2026-04-19T10:00:00+05:30",
    "virtual_account_details": {
        "virtual_account_id":   "vba_customer_42",
        "virtual_account_name": "Acme Logistics Pvt Ltd"
    },
    "remitter_lock_details": { "allowed_remitters": [ ... ] },
    "amount_lock_details":   { "min_amount": 100, "max_amount": 1000000 },
    "notification_group":    "finance_team"
}
```

There is **no `vba_vpa` and no `vba_qr`** — a VBA collects via bank transfer (IMPS/NEFT/RTGS) only.

### VBA statuses

| Status | Meaning |
|---|---|
| `ACTIVE` | VBA is live; can receive inbound bank transfers |
| `INACTIVE` | Deactivated (edited via `PUT`). Inbound transfers bounce |

---

## 4. Inbound credit webhook — `PAYMENT_SUCCESS_WEBHOOK` (VBA transfer)

A VBA credit is delivered as a standard **`PAYMENT_SUCCESS_WEBHOOK`** — there is **no `VBA_CREDIT` event**. Identify it by `payment_group: "vba_transfer"`; the UTR, remitter details, and the virtual-account id/number live inside `data.payment.payment_method.vba_transfer`.

```json
{
    "data": {
        "order": {
            "order_id": "n585ctivoh6g",
            "order_amount": 1500,
            "order_currency": "INR"
        },
        "payment": {
            "cf_payment_id": "5114925103565",
            "payment_status": "SUCCESS",
            "payment_amount": 1500,
            "payment_currency": "INR",
            "payment_time": "2026-02-05T15:19:36+05:30",
            "bank_reference": "MerchantID_TESTUTR12362",
            "payment_group": "vba_transfer",
            "payment_method": {
                "vba_transfer": {
                    "utr": "MerchantID_TESTUTR12362",
                    "credit_ref_no": "NA",
                    "remitter_account": "123456789012",
                    "remitter_name": "John Doe",
                    "remitter_ifsc": "NOOB0CMSNOC",
                    "email": "user@cashfree.com",
                    "phone": "9999999999",
                    "vaccount_id": "USER09",
                    "vaccount_number": "98912574JSER10"
                }
            }
        },
        "customer_details": {
            "customer_name": "John Doe",
            "customer_id": null,
            "customer_email": "user@cashfree.com",
            "customer_phone": "9999999999"
        },
        "payment_gateway_details": { "gateway_name": "CASHFREE" }
    },
    "event_time": "2026-02-05T15:19:35+05:30",
    "type": "PAYMENT_SUCCESS_WEBHOOK"
}
```

> **Structure note.** VBA credits are NOT a separate event — branch on `data.payment.payment_group === "vba_transfer"` (or the presence of `data.payment.payment_method.vba_transfer`). Remitter account/name/IFSC and the `vaccount_id` / `vaccount_number` all sit **inside `data.payment.payment_method.vba_transfer`** — there is no top-level `vba` or `remitter` object.

**Deprecated legacy event.** The old Auto-Collect `AMOUNT_COLLECTED` (and `VBA_TRANSFER_SUCCESS_PAYMENT`) used a different, **flat** shape (no `data` wrapper) with its own `signature` field — `{ "event": "AMOUNT_COLLECTED", "amount": "400", "vAccountId": "...", "utr": "...", "remitterAccount": "...", "remitterName": "...", "signature": "..." }`. Don't build new integrations against it.

Signature verification: `Base64(HMAC-SHA256(x-webhook-timestamp + rawBody, CASHFREE_SECRET_KEY))` = `x-webhook-signature`. Identical to other Cashfree webhooks.

Dedupe on `data.payment.cf_payment_id` (+ the `vba_transfer.utr`).

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

A VBA accepts **bank transfers only** (IMPS / NEFT / RTGS) on the allocated bank.

| `bank_code` | Bank | IMPS | NEFT | RTGS |
|---|---|---|---|---|
| `UTIB` | Axis Bank | ✅ | ✅ | ✅ |
| `ICIC` | ICICI Bank | ✅ | ✅ | ✅ |
| `YESB` | Yes Bank | ✅ | ✅ | ✅ |

RTGS has a hard **minimum ₹2,00,001** — regardless of your VBA's `max_amount`, transfers below this won't use RTGS. IMPS and NEFT don't have a minimum. (There is no UPI or QR rail on a VBA.)

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
            "x-api-version": "2024-07-10",
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    return res.json();
}

const vba = await createVBA({
    virtual_account_details: {
        virtual_account_id: "dealer_17_may",
        virtual_account_name: "Acme - Dealer 17",
        virtual_account_email: "d17@example.com",
        virtual_account_phone: "9988776655",
    },
    amount_lock_details: { min_amount: 100, max_amount: 500000 },
    bank_codes: ["UTIB", "ICIC"],
});
```

### Python

```python
import os, requests
HDR = {
    "x-client-id": os.environ["CASHFREE_APP_ID"],
    "x-client-secret": os.environ["CASHFREE_SECRET_KEY"],
    "x-api-version": "2024-07-10",
    "Content-Type": "application/json",
}
def create_vba(body):
    return requests.post("https://api.cashfree.com/pg/vba", headers=HDR, json=body).json()

def list_payments(vid):
    # List credits — POST with filters in the body (no GET /{id}/payments endpoint)
    return requests.post("https://api.cashfree.com/pg/vba/payments", headers=HDR,
                         json={"virtual_account_id": vid}).json()

def deactivate_vba(vid, edit_body):
    # No /close endpoint — deactivate by editing the VBA to INACTIVE (PUT)
    return requests.put(f"https://api.cashfree.com/pg/vba/{vid}", headers=HDR, json=edit_body).json()
```

### Java

```java
var client = HttpClient.newHttpClient();
var req = HttpRequest.newBuilder()
    .uri(URI.create("https://api.cashfree.com/pg/vba"))
    .header("x-client-id", System.getenv("CASHFREE_APP_ID"))
    .header("x-client-secret", System.getenv("CASHFREE_SECRET_KEY"))
    .header("x-api-version", "2024-07-10")
    .header("Content-Type", "application/json")
    .POST(HttpRequest.BodyPublishers.ofString(bodyJson))
    .build();
var res = client.send(req, HttpResponse.BodyHandlers.ofString());
```

### Raw curl

```bash
curl -X POST "https://api.cashfree.com/pg/vba" \
    -H "x-client-id: $APP_ID" -H "x-client-secret: $SECRET_KEY" \
    -H "x-api-version: 2024-07-10" -H "Content-Type: application/json" \
    -d '{
        "virtual_account_details": {
            "virtual_account_id": "vba_customer_42",
            "virtual_account_name": "Acme",
            "virtual_account_email": "a@ex.com",
            "virtual_account_phone": "9988776655"
        },
        "amount_lock_details": { "min_amount": 100, "max_amount": 500000 },
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

VBA credits roll up into your standard PG settlement cycle and appear in settlement recon (`POST /pg/settlement/recon`) like any other payment. Reconcile them by the `vba_transfer` details on the `PAYMENT_SUCCESS_WEBHOOK` (the `utr` + `vaccount_id`) and the `cf_payment_id`, matched against recon rows. See `settlements-and-reconciliation/references/REFERENCE.md`.

---

## 10. Troubleshooting

| Issue | Cause | Resolution |
|---|---|---|
| Customer's transfer shows in their bank but no webhook | Remitter-lock rejection, or bank-side hold | `POST /pg/vba/payments` (filter by `virtual_account_id`) — rejected transfers appear with a failure reason |
| Customer tried to pay the VBA over UPI and it failed | VBAs accept **bank transfer only** (NPCI bars UPI to a VBA) | Direct them to IMPS/NEFT/RTGS, or use a PG UPI flow instead |
| Wrong amount credited despite `min_amount`/`max_amount` | Amount check happens at Cashfree, not at payer bank — if the bank already debited the customer, Cashfree auto-returns | Customer sees reversal in ~2–3 working days; log the rejected event |
| Duplicate credits for same UTR | Bank retry + Cashfree re-delivery | Dedupe on `cf_payment_id` + `utr` |
| Inactive VBA still receiving "credits" in test | Sandbox may not enforce deactivation | Production-only; test by deactivating (`PUT … INACTIVE`) and re-simulating |
| Branch reconciliation: too many VBAs to manage | Creating one per branch hitting account limits | Contact Cashfree for higher limits |

---

## 11. See Also

- `pg/payment-links/SKILL.md` — when a shareable link is better than a VBA.
- `settlements-and-reconciliation/SKILL.md` — where VBA credits surface.
- `pg/webhooks/SKILL.md` — signature verification (same as all Cashfree webhooks).
- `payouts/SKILL.md` — reversing a mis-credited VBA payment.
- `common-mistakes/SKILL.md` — general webhook gotchas.
