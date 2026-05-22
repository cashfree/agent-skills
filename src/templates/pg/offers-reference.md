---
name: Cashfree Offers — Reference
description: >
  Deep reference for the Cashfree Offers API. Full request/response schema, every
  offer_validations.payment_method variant (card / netbanking / upi / wallet / paylater / emi /
  all), per-language SDK code, the payment_offers webhook array schema, no-cost EMI recipe
  across all issuers, stacking rules, and troubleshooting offer-ineligibility reasons.
  Read after Offers SKILL.md.
---

# Cashfree Offers — Reference

> Read `../SKILL.md` first for the lifecycle, no-cost EMI recipe, and webhook contract. This file is the schema + payment-method filter source of truth.

---

## 1. Endpoint Map

| Method | Path | Purpose |
|---|---|---|
| POST | `/pg/offers` | Create a new offer |
| GET  | `/pg/offers/{offer_id}` | Fetch one |
| GET  | `/pg/offers` | List (filters on status / time range) |
| Pay with offer | `POST /pg/orders/sessions` — include `offer_id` | — |

Offer statuses: `active`, `expired`, `inactive`. Default on creation: `active`.

---

## 2. Create Offer — Full Schema

```
POST /pg/offers
```

```jsonc
{
    "offer_meta": {
        "offer_title":        "...",           // 3–50 chars
        "offer_description":  "...",           // 3–100 chars
        "offer_code":         "...",           // 1–45 chars, unique per merchant
        "offer_start_time":   "ISO-8601",      // must be future
        "offer_end_time":     "ISO-8601"
    },
    "offer_tnc": {
        "offer_tnc_type":  "text" | "link",
        "offer_tnc_value": "..."               // 3–100 chars
    },
    "offer_details": {
        "offer_type": "DISCOUNT" | "CASHBACK" | "DISCOUNT_AND_CASHBACK" | "NO_COST_EMI",
        "discount_details": {                  // required for DISCOUNT + DISCOUNT_AND_CASHBACK
            "discount_type": "flat" | "percentage",
            "discount_value": 10,
            "max_discount_amount": 500
        },
        "cashback_details": {                  // required for CASHBACK + DISCOUNT_AND_CASHBACK
            "cashback_type": "flat" | "percentage",
            "cashback_value": 5,
            "max_cashback_amount": 250
        }
    },
    "offer_validations": {
        "min_amount":  1500,                   // order_amount threshold
        "max_allowed": 1000,                   // lifetime redemptions cap (some tiers)
        "payment_method": { /* see §3 */ }
    }
}
```

### Discount math (DISCOUNT offer)

- `discount_type: "flat"` with `discount_value: 100` → flat ₹100 off.
- `discount_type: "percentage"` with `discount_value: 10`, `max_discount_amount: 500` → 10% off, capped at ₹500.

### Cashback math

Same shape as discount, but reflects as a **bank-issued cashback** on the customer's statement rather than a discount on the transaction. Settlement is unaffected; merchant pays the cashback via offer fee to Cashfree, who pays the issuer.

### `DISCOUNT_AND_CASHBACK`

Include both `discount_details` and `cashback_details`. Both apply at payment.

### `NO_COST_EMI`

Skip `discount_details` / `cashback_details`. Only `offer_validations.payment_method.emi` + `tenures` matters. Cashfree covers the interest differential.

---

## 3. `offer_validations.payment_method` — All Variants

Use exactly one of:

### Card

```json
"card": {
    "type": "cc" | "dc" | "prepaid",
    "bank_name": "hdfc" | "icici" | "axis" | "kotak" | "sbi" | "rbl" | "bob" | "standard chartered" | "au" | "yes" | "fed" | "hsbc" | "citi" | "amex" | "onecard" | "idfc",
    "scheme_name": "visa" | "mastercard" | "rupay" | "amex" | "diners"
}
```

All three optional — omit to broaden the filter.

### Netbanking

```json
"netbanking": { "bank_name": "hdfc" }
```

### UPI

```json
"upi": {}        // applies to any UPI payment
```

### Wallet

```json
"wallet": { "provider": "paytm" | "phonepe" | "amazon" | "freecharge" | "mobikwik" | "airtel" | "ola" | "jio" }
```

### Paylater

```json
"paylater": { "provider": "lazypay" | "simpl" | "flexipay" | "zestmoney" | "olapostpaid" | "freechargepaylater" | "kotak" }
```

### EMI (the NO_COST_EMI anchor)

```json
"emi": {
    "type": "credit_card_emi" | "debit_card_emi" | "cardless_emi",
    "issuer": "hdfc" | "icici" | "axis" | ...,
    "tenures": [3, 6, 9, 12, 18, 24]
}
```

Omit `tenures` to cover all supported tenures.

### Universal

```json
"all": {}       // matches every payment method
```

Only one `payment_method` object per offer. If you need to cover two distinct methods, create two offers.

---

## 4. Payment-time Attachment

### S2S (Order Pay)

```json
{
    "payment_session_id": "session_xxx",
    "payment_method": { "card": { "channel": "link", "card_number": "...", ... } },
    "offer_id": "b1c2d3e4-5678-90ab-cdef-1234567890ab"
}
```

### Web SDK (cashfree.js v3)

```javascript
await cashfree.pay({
    paymentSessionId: paymentSessionId,
    paymentMethod: cardComponent,
    offerId: "b1c2d3e4-5678-90ab-cdef-1234567890ab",
});
```

### Mobile SDKs

Pass `offerId` on the payment payload — field name varies by SDK; see `pg/mobile-sdks/references/REFERENCE.md`.

---

## 5. `payment_offers` Webhook Array

Inside `PAYMENT_SUCCESS_WEBHOOK` → `data.payment.payment_offers`:

```jsonc
[
    {
        "offer_id": "b1c2d3e4-5678-90ab-cdef-1234567890ab",
        "offer_type": "DISCOUNT",                      // DISCOUNT | CASHBACK | DISCOUNT_AND_CASHBACK | NO_COST_EMI
        "offer_meta": {
            "offer_title": "Flat 10% off on HDFC CC",
            "offer_code":  "HDFC10APR"
        },
        "offer_redemption": {
            "redemption_status": "SUCCESS",            // SUCCESS | FAILED | PENDING
            "discount_amount":   50.00,                // present for DISCOUNT / DISCOUNT_AND_CASHBACK
            "cashback_amount":   10.00,                // present for CASHBACK / DISCOUNT_AND_CASHBACK
            "offer_ineligibility_reason": null         // populated on FAILED
        }
    }
]
```

On `FAILED`, common `offer_ineligibility_reason` values:

- `bank_mismatch` — card not from the required bank
- `scheme_mismatch` — network differs (Visa offer, RuPay card)
- `amount_below_minimum` — `order_amount < offer_validations.min_amount`
- `tenure_not_supported` — EMI tenure picked not in the offer's `tenures`
- `offer_expired` — campaign expired between create and payment
- `offer_usage_cap_reached` — account-level or per-customer cap hit

---

## 6. Per-Language SDK Usage

Many Cashfree SDKs expose `PGCreateOffer` / `PGFetchOffer` / `PGFetchOffers` directly; where not, raw REST works.

### Node.js

```javascript
import { Cashfree, CFEnvironment } from "cashfree-pg";
const cashfree = new Cashfree(CFEnvironment.SANDBOX, process.env.CASHFREE_APP_ID, process.env.CASHFREE_SECRET_KEY);

const res = await cashfree.PGCreateOffer({
    offer_meta: { ... },
    offer_tnc:  { ... },
    offer_details: { offer_type: "DISCOUNT", discount_details: { discount_type: "percentage", discount_value: 10, max_discount_amount: 500 } },
    offer_validations: { min_amount: 1500, max_allowed: 1000, payment_method: { card: { type: "cc", bank_name: "hdfc" } } },
});

const offer = await cashfree.PGFetchOffer(offerId);
```

### Python (v6+)

```python
from cashfree_pg.api_client import Cashfree
from cashfree_pg.models.create_offer_request import CreateOfferRequest

cashfree = Cashfree(
    XEnvironment=Cashfree.SANDBOX,
    XClientId=os.environ["CASHFREE_APP_ID"],
    XClientSecret=os.environ["CASHFREE_SECRET_KEY"],
)

res = cashfree.PGCreateOffer(CreateOfferRequest(...), None, None)
offer = cashfree.PGFetchOffer(offer_id, None, None)
```

### Raw REST (any language)

```bash
curl -X POST "https://api.cashfree.com/pg/offers" \
    -H "x-client-id: $APP_ID" -H "x-client-secret: $SECRET_KEY" \
    -H "x-api-version: 2025-01-01" -H "Content-Type: application/json" \
    -d @offer.json
```

---

## 7. Stacking Rules

- **One offer per payment.** Passing multiple `offer_id`s rejects with `multiple_offers_not_allowed` unless your account has stacking enabled.
- **Merchant offer + bank-native offer:** A customer may see both a merchant offer (configured via this API) and a bank's own offer (e.g. HDFC SmartBuy). These stack at the bank's discretion; Cashfree only tracks the merchant offer.
- **With Easy Split:** Discount is applied to `order_amount` before splits compute. Design vendor splits as percentages where offers are in play, or specify `refund_splits` if a refund is later issued.
- **With subscriptions:** First-charge offers work; subsequent recurring charges don't inherit the offer by default. Create per-cycle offers or use campaign automation.

---

## 8. No-Cost EMI — Tenure Table (common issuers)

| Issuer | Typical no-cost tenures supported | Notes |
|---|---|---|
| HDFC | 3, 6 months | 9/12/18/24 also available with interest |
| ICICI | 3, 6 months | — |
| Axis | 3, 6 months | — |
| Kotak | 3, 6 months | — |
| SBI | 3, 6 months | — |
| RBL | 3, 6 months | — |
| HSBC | 3, 6 months | Limited merchants |
| StanChart | 3, 6 months | Limited merchants |
| Amex | Rare | Often not offered |
| Bajaj Finserv (cardless) | 3, 6, 9 | Separate cardless EMI offer type |
| ZestMoney / Flexmoney (cardless) | 3, 6, 9, 12 | Cardless-EMI offer type |

Exact availability per merchant category varies; confirm with Cashfree support before advertising.

---

## 9. Error Codes

| HTTP | `code` | Meaning | Fix |
|---|---|---|---|
| 400 | `offer_meta_invalid` | Title/description too long/short | Stay within 3–50 / 3–100 chars |
| 400 | `offer_start_time_invalid` | Past time or > end | Use future ISO-8601 |
| 400 | `offer_code_invalid` | Special chars / too long | Use `[A-Z0-9_-]`, ≤ 45 chars |
| 409 | `offer_code_already_exists` | Duplicate code | Version suffix (`HDFC10_V2`) |
| 400 | `discount_type_invalid` | Missing for DISCOUNT offer | Include `discount_details` |
| 400 | `payment_method_missing` | `offer_validations.payment_method` absent | Add one (use `"all": {}` for universal) |
| 400 | `multiple_offers_not_allowed` | Stacking without flag | Attach one offer; ask Cashfree to enable stacking |
| 400 | `offer_not_active` | Offer expired / inactive at payment time | Check `offer_status` before attach |
| 404 | `offer_not_found` | Wrong `offer_id` | Use id from create response |
| 400 | `offer_usage_cap_reached` | Lifetime `max_allowed` hit | Raise cap via PATCH or end campaign |

---

## 10. Troubleshooting

| Issue | Cause | Resolution |
|---|---|---|
| Discount visible in API but not on customer receipt | Receipt rendered by merchant | Include `payment_offers` data in your own receipt email |
| Cashback not credited to customer card | Bank's own cashback cycle (T+30) | Normal; disclose expected credit timeline in T&Cs |
| No-cost EMI: customer charged interest upfront on statement | Bank applies interest then Cashfree reverses | Standard; inform customer via email |
| Fetching offers returns expired ones in list | No state filter | `GET /pg/offers?status=active` — always filter in the request |
| Two offers look like they stack but only one applied | Stacking not enabled | Contact Cashfree; otherwise design one as merchant-only cart discount |
| Offer created via API doesn't show in Dashboard | Cache / view permission | `GET /pg/offers/{offer_id}` is source of truth; refresh Dashboard |
| Customer complains "offer code HDFC10APR didn't work" | Entered at merchant checkout but merchant didn't attach `offer_id` at Cashfree | Ensure checkout wiring passes `offer_id` to `cashfree.pay()` / Order Pay |

---

## 11. See Also

- `pg/apis/references/REFERENCE.md` — Card EMI / Cardless EMI payment method shape for no-cost EMI combinations.
- `pg/webhooks/references/REFERENCE.md` — full `PAYMENT_SUCCESS_WEBHOOK` including `payment_offers` array.
- `pg/easy-split/SKILL.md` — when offers affect vendor splits.
- `settlements-and-reconciliation/references/REFERENCE.md` — offer discounts surface as event_details adjustments.
- `common-mistakes/SKILL.md` — general webhook + payment gotchas.
