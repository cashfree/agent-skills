---
name: Cashfree Token Vault — Reference
description: >
  Deep reference for Cashfree token vault (RBI-compliant network tokenization). Complete
  endpoint list, instrument + cryptogram schemas, INSTRUMENT_ACTIVE_WEBHOOK /
  INSTRUMENT_FAILED_WEBHOOK payloads, per-language SDK code (Node, Python, Java, Go, raw REST),
  network behaviour (Visa/Mastercard/RuPay), and troubleshooting for CVV/3DS edge cases.
  Read after the Token Vault SKILL.md.
---

# Cashfree Token Vault — Reference

> Read `../SKILL.md` first for the consent flow, saved-card UX, and the INSTRUMENT webhook loop. This file is the schema + code + network-behaviour source of truth.

---

## 1. Endpoint Map

| Method | Path | Purpose | SDK method |
|---|---|---|---|
| GET  | `/pg/customers/{customer_id}/instruments?instrument_type=card` | List saved instruments | `PGCustomerFetchInstruments` |
| GET  | `/pg/customers/{customer_id}/instruments/{instrument_id}` | Fetch one | `PGCustomerFetchInstrument` |
| DELETE | `/pg/customers/{customer_id}/instruments/{instrument_id}` | Delete | `PGCustomerDeleteInstrument` |
| GET  | `/pg/customers/{customer_id}/instruments/{instrument_id}/cryptogram` | Get one-time cryptogram | `PGCustomerInstrumentsFetchCryptogram` |

Plus the payment-time integration: `POST /pg/orders/sessions` with `payment_method.card.save_instrument: true` (save) or `payment_method.card.instrument_id: "..."` (charge with saved token).

Headers: `x-client-id`, `x-client-secret`, `x-api-version: 2025-01-01`, `Content-Type: application/json`. Rate limits share the general Get/Pay buckets (~30–100/min).

---

## 2. Instrument Object — Full Schema

```jsonc
{
    "customer_id": "customer_123",
    "instrument_id": "54deabb4-ba45-4a60-9e6a-9c016fe7ab10",
    "instrument_type": "card",
    "instrument_uid": "4111XXXXXXXX1111",     // masked PAN, first 6 + last 4
    "instrument_display": "XXXX XXXX XXXX 1111",
    "instrument_status": "ACTIVE",             // CREATED | ACTIVE | FAILED | DELETED
    "afa_reference": "...",                    // additional-factor authentication reference
    "instrument_meta": {
        "card_network":  "VISA",               // VISA | MASTERCARD | RUPAY | AMEX | DINERS
        "card_bank_name": "HDFC",
        "card_country":  "IN",
        "card_type":     "CREDIT",             // CREDIT | DEBIT | PREPAID
        "card_token_details": null              // populated with TRID for network tokens
    },
    "created_at": "2026-04-19T10:00:00+05:30"
}
```

### Instrument statuses

| Status | Meaning | Usable for CoF? |
|---|---|---|
| `CREATED` | Consent captured; tokenization in progress | No — wait for ACTIVE |
| `ACTIVE` | Network token issued | **Yes** |
| `FAILED` | Issuer rejected tokenization | No — prompt re-entry |
| `DELETED` | Customer deleted | No |

---

## 3. Cryptogram Object — Full Schema

```jsonc
{
    "instrument_id": "54deabb4-ba45-4a60-9e6a-9c016fe7ab10",
    "token_requestor_id": "50040xxxxxxxxxxxxxxx",  // Cashfree's TRID at the network
    "card_number": "4111XXXXXXXXXXXX",             // the NETWORK TOKEN, not the PAN
    "card_expiry_mm": "12",
    "card_expiry_yy": "29",
    "cryptogram": "AgAAAAAAAAAAA...",              // one-time code; short-lived
    "card_display": "1111"
}
```

**Cryptogram rules:**

- One-time use — a second charge attempt with the same cryptogram fails with `cryptogram_expired` or `cryptogram_already_used`.
- Short TTL — seconds to minutes. Fetch and pay atomically.
- Never log the `cryptogram` value. Never persist it.
- The `card_number` here is the **network token** (PAN-less) — treat it with PCI-level hygiene, but it's not the raw PAN.

---

## 4. Pay with Saved Instrument — Order Pay Body

```json
{
    "payment_session_id": "session_xxx",
    "payment_method": {
        "card": {
            "channel": "link",
            "instrument_id": "54deabb4-ba45-4a60-9e6a-9c016fe7ab10"
        }
    }
}
```

Optional fields:

- `card_cvv` — include when network policy requires CVV on reuse (common for first-reuse on Indian credit cards).
- `channel: "post"` for Native OTP (see `pg/apis/references/REFERENCE.md` Workflow B).

### Save-at-first-payment body

```json
{
    "payment_session_id": "session_xxx",
    "payment_method": {
        "card": {
            "channel": "link",
            "card_number": "4111111111111111",
            "card_expiry_mm": "12",
            "card_expiry_yy": "29",
            "card_cvv": "123",
            "card_holder_name": "Jane Doe",
            "save_instrument": true
        }
    }
}
```

### Direct CoF charge with cryptogram (advanced)

Some flows require passing the cryptogram explicitly (e.g. external subscription engines). Body:

```json
{
    "payment_session_id": "session_xxx",
    "payment_method": {
        "card": {
            "channel": "link",
            "instrument_id": "...",
            "cryptogram": "AgAAAAAAAAAAA...",
            "token_requestor_id": "50040xxxxxxxxxxxxxxx"
        }
    }
}
```

Use sparingly — prefer the `instrument_id`-only path (§4 first sub-block), which lets Cashfree manage cryptogram lifecycle.

---

## 5. INSTRUMENT Webhook Payloads

### `INSTRUMENT_ACTIVE_WEBHOOK`

```json
{
    "data": {
        "instrument": {
            "customer_id": "customer_123",
            "afa_reference": "xxxxx",
            "instrument_id": "54deabb4-ba45-4a60-9e6a-9c016fe7ab10",
            "instrument_type": "card",
            "instrument_uid": "4111XXXXXXXX1111",
            "instrument_display": "XXXX XXXX XXXX 1111",
            "instrument_status": "ACTIVE",
            "instrument_meta": {
                "card_network": "VISA",
                "card_bank_name": "HDFC",
                "card_country": "IN",
                "card_type": "CREDIT",
                "card_token_details": null
            }
        }
    },
    "event_time": "2026-04-19T11:00:00+05:30",
    "type": "INSTRUMENT_ACTIVE_WEBHOOK"
}
```

### `INSTRUMENT_FAILED_WEBHOOK`

Same envelope, `instrument_status: "FAILED"`, plus an `error_details` object:

```jsonc
{
    "data": {
        "instrument": { ... "instrument_status": "FAILED" },
        "error_details": {
            "error_code": "issuer_declined",
            "error_description": "Card issuer did not support tokenization",
            "error_reason": "tokenization_not_supported",
            "error_source": "bank"
        }
    },
    "event_time": "2026-04-19T11:00:00+05:30",
    "type": "INSTRUMENT_FAILED_WEBHOOK"
}
```

Signature = `Base64(HMAC-SHA256(x-webhook-timestamp + rawBody, CASHFREE_SECRET_KEY))`. Dedupe on `instrument_id + instrument_status`.

---

## 6. Per-Language SDK Usage

### Node.js

```javascript
// List saved cards
const { data: cards } = await cashfree.PGCustomerFetchInstruments(customerId, "card");

// Fetch one
const { data: card } = await cashfree.PGCustomerFetchInstrument(customerId, instrumentId);

// Delete
await cashfree.PGCustomerDeleteInstrument(customerId, instrumentId);

// Cryptogram (advanced)
const { data: cryp } = await cashfree.PGCustomerInstrumentsFetchCryptogram(customerId, instrumentId);

// Pay with saved card
await cashfree.PGPayOrder({
    payment_session_id: paymentSessionId,
    payment_method: { card: { channel: "link", instrument_id: instrumentId } },
});
```

### Python (v6+)

```python
cards = cashfree.PGCustomerFetchInstruments(customer_id, "card", None, None)
card  = cashfree.PGCustomerFetchInstrument(customer_id, instrument_id, None, None)
cashfree.PGCustomerDeleteInstrument(customer_id, instrument_id, None, None)
cryp  = cashfree.PGCustomerInstrumentsFetchCryptogram(customer_id, instrument_id, None, None)
```

### Java

```java
var cards = new Cashfree().PGCustomerFetchInstruments("2025-01-01", customerId, "card", null, null, null);
var card  = new Cashfree().PGCustomerFetchInstrument("2025-01-01", customerId, instrumentId, null, null, null);
new Cashfree().PGCustomerDeleteInstrument("2025-01-01", customerId, instrumentId, null, null, null);
var cryp  = new Cashfree().PGCustomerInstrumentsFetchCryptogram("2025-01-01", customerId, instrumentId, null, null, null);
```

### Go (v6+)

```go
cards, _, _ := cashfree.PGCustomerFetchInstruments(customerId, "card", nil, nil, nil)
card,  _, _ := cashfree.PGCustomerFetchInstrument(customerId, instrumentId, nil, nil, nil)
_,     _, _  = cashfree.PGCustomerDeleteInstrument(customerId, instrumentId, nil, nil, nil)
cryp,  _, _ := cashfree.PGCustomerInstrumentsFetchCryptogram(customerId, instrumentId, nil, nil, nil)
```

### Raw REST (Ruby / any language)

```bash
# List
curl "https://api.cashfree.com/pg/customers/customer_123/instruments?instrument_type=card" \
    -H "x-client-id: $APP_ID" -H "x-client-secret: $SECRET_KEY" -H "x-api-version: 2025-01-01"

# Delete
curl -X DELETE "https://api.cashfree.com/pg/customers/customer_123/instruments/54deabb4..." \
    -H "x-client-id: $APP_ID" -H "x-client-secret: $SECRET_KEY" -H "x-api-version: 2025-01-01"

# Cryptogram
curl "https://api.cashfree.com/pg/customers/customer_123/instruments/54deabb4.../cryptogram" \
    -H "x-client-id: $APP_ID" -H "x-client-secret: $SECRET_KEY" -H "x-api-version: 2025-01-01"
```

---

## 7. Network-Specific Behaviour

| Network | Tokenization supported | CVV on reuse | Notes |
|---|---|---|---|
| Visa (VTS) | ✅ Full | Often required on first reuse | Widest issuer coverage; Visa provides TRID via VTS |
| Mastercard (MDES) | ✅ Full | Often required on first reuse | Similar to Visa |
| RuPay (NTS) | ✅ via NPCI | Often required | RuPay tokenization via NPCI; newer than Visa/MC |
| Amex | ⚠️ Limited | Required | Amex-India tokenization support narrower; fall back to non-saved flow if `INSTRUMENT_FAILED_WEBHOOK` |
| Diners | ⚠️ Limited | Required | Similar to Amex |
| International (foreign-issued) | ❌ Not via RBI token vault | N/A | Use vendor-specific tokenization (Stripe, Adyen) for non-Indian cards |

Issuer-specific quirks surface as `INSTRUMENT_FAILED_WEBHOOK` — Cashfree abstracts most of them; your job is to listen and fall back.

---

## 8. Error Codes

| HTTP | `code` | Meaning | Fix |
|---|---|---|---|
| 400 | `instrument_id_invalid` | Bad format | Use UUIDs returned by Cashfree verbatim |
| 400 | `instrument_id_expired` | Card expired or token rotated | Re-save (prompt customer to enter card again) |
| 400 | `cvv_required` | Network policy requires CVV on this charge | Collect CVV via CVV-only UI; include `card_cvv` in Pay |
| 400 | `cryptogram_expired` / `cryptogram_already_used` | Cryptogram TTL exceeded or double-spent | Fetch + pay atomically, no caching |
| 404 | `instrument_not_found` | Wrong id, wrong customer, or deleted | Re-fetch list; verify ownership |
| 409 | `instrument_already_deleted` | Second delete on same id | Idempotent; treat 409 as success |
| 403 | `save_instrument_not_enabled` | Feature disabled on merchant account | Contact Cashfree to enable Token Vault |
| 502 | `tokenization_service_unavailable` | Network / issuer outage | Retry later; fall back to non-saved flow |

---

## 9. Interaction With Other Products

- **Subscriptions:** A mandate (`subscriptions/SKILL.md`) references a customer's token implicitly via the mandate id, not via `instrument_id`. Token vault is the card-only, one-shot-charge flow; subscriptions is the ongoing-mandate flow.
- **Refunds:** Refunds on a CoF payment behave identically to any other refund — via the `order_id`, not the `instrument_id`. The refund returns to the underlying card through the network even if the instrument is later deleted.
- **Disputes:** A chargeback on a CoF payment appears the same way as any other dispute (see `pg/disputes/SKILL.md`). Preserving the `instrument_id` and `save_instrument` consent log is valuable evidence.
- **Settlements:** No direct impact; token-vault payments settle like any card payment.

---

## 10. Troubleshooting

| Issue | Cause | Resolution |
|---|---|---|
| Customer can't see saved card despite paying yesterday | Tokenization still in flight or failed | Check webhook; if FAILED, prompt re-save |
| Repeated FAILED for same customer | Issuer/BIN doesn't support tokenization | Accept that this card cannot be saved; collect fresh on each transaction |
| CoF payment returns 3DS challenge | Network required step-up auth | Handle like a regular card payment — same `action: "link"` / `action: "post"` logic |
| "We saved PAN anyway, migration path?" | Legal violation | Purge PAN immediately; re-save via token vault on next customer interaction; disclose per DPDP |
| `instrument_display` masks don't match customer's card | Different card stored under a matching customer_id | Always scope listings by the logged-in customer's id, not a shared id |
| Card deleted on merchant side but still charged | You used a stale `instrument_id` | Re-fetch saved list on every checkout render |
| GDPR / DPDP deletion request | Customer withdraws consent | Call DELETE on every instrument for that customer_id |

---

## 11. See Also

- `pg/apis/SKILL.md` §Card — save-instrument and instrument_id field semantics on Order Pay.
- `pg/webhooks/references/REFERENCE.md` — canonical `INSTRUMENT_ACTIVE_WEBHOOK` / `INSTRUMENT_FAILED_WEBHOOK` payloads.
- `subscriptions/SKILL.md` — mandate-backed recurring (complement, not alternative).
- `common-mistakes/SKILL.md` — webhook + signature gotchas.
- `pg/go-live/SKILL.md` — enabling Token Vault on production (account-level feature gate).
