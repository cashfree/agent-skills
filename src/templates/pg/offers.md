---
name: Cashfree Payment Gateway - Offers, Discounts & No-Cost EMI
description: >
  Use when a merchant wants to run instant discounts, cashbacks, bank-specific offers, or
  no-cost EMI at checkout — creating offers via API and having Cashfree validate eligibility
  and apply the discount automatically. Triggers: offers, discount, cashback, bank offer,
  SBI offer, HDFC offer, no-cost EMI, no cost EMI, instant discount, BIN offer, issuer offer,
  POST /pg/offers, offer_id, offer_code, offer_status, offer_meta, offer_details, offer_type
  DISCOUNT CASHBACK DISCOUNT_AND_CASHBACK NO_COST_EMI, offer_validations, min_amount,
  max_allowed, payment_method card_bank_name card_network card_type, EMI offer, wallet offer,
  paylater offer, sale campaign, UPI cashback, payment_offers in webhook, applied offer.
  Pair with pg/apis (attach offer_id on Order Pay) and pg/webhooks (payment_offers payload).
---

# Cashfree Payment Gateway — Offers, Discounts & No-Cost EMI

> **References available:** This SKILL.md covers creating offers, attaching them to orders, and the "no-cost EMI" recipe. For the full `offer_validations.payment_method` shape across all method types (card / netbanking / upi / wallet / paylater / emi / all), per-language SDK code, the `payment_offers` webhook payload, and troubleshooting offer-not-applied scenarios — read `references/REFERENCE.md` in this directory.

---

## 1. Scope & Boundaries

### When to use this skill

- The merchant wants to run a **bank/BIN/issuer offer** — "10% off on HDFC credit cards", "₹100 cashback on UPI", "no-cost EMI on orders above ₹3000".
- The developer needs to **create offers via API** rather than manually in the Dashboard (so that campaigns can be scheduled, versioned, or tied to SKUs/categories programmatically).
- The developer is building **checkout UI that surfaces available offers** to the customer ("See all offers" drawer) and applies the best-eligible offer automatically.
- The question is about **no-cost EMI** — this is implemented as an `offer_type: "NO_COST_EMI"` offer on top of a card-EMI payment.

### When NOT to use this skill

- If the discount is **merchant-side only** (you deduct from your own cart total before creating the Cashfree order) — that's just a smaller `order_amount`. Offers are for discounts **Cashfree applies** at the payment step, which allows bank/card validation to happen at Cashfree's side.
- If the use case is **coupon codes redeemed on the merchant's site** — your cart logic can validate the coupon and pass a smaller `order_amount`. Offers API is specifically for BIN/issuer/network validations at payment time.
- If the merchant's need is **price-level promotion** (e.g. flash sale, SKU-level discount) — handle on your product catalogue; Cashfree Offers only conditions on payment-method attributes.
- If the question is about **EMI plans in general** (not no-cost) — use `pg/apis/references/REFERENCE.md` (Card EMI / Cardless EMI sections). EMI availability is orthogonal to offers.

---

## 2. Structural Overview

### Core Objects

| Object | Description |
|---|---|
| **Offer** | A campaign with a title, validity window, discount/cashback rules, and eligibility filters. Identified by `offer_id` (Cashfree) and `offer_code` (merchant-provided, customer-visible). |
| **Offer Type** | `DISCOUNT`, `CASHBACK`, `DISCOUNT_AND_CASHBACK`, or `NO_COST_EMI`. |
| **Validation** | Conditions that must hold for the offer to apply: minimum order amount, maximum discount cap, and a payment-method filter (bank, network, EMI tenure, etc.). |
| **Applied offer** | The offer that actually ran on a payment. Surfaces in `PAYMENT_SUCCESS_WEBHOOK` under `data.payment.payment_offers`. |

### Environments & auth

Same PG base URLs, same headers: `x-client-id`, `x-client-secret`, `x-api-version: 2025-01-01`.

### Endpoints

| Purpose | Endpoint |
|---|---|
| Create offer | `POST /pg/offers` |
| Fetch offer | `GET /pg/offers/{offer_id}` |
| List offers | `GET /pg/offers` |
| Attach to payment | Include `offer_id` on `POST /pg/orders/sessions` (Order Pay) |
| Webhook — applied offer | `PAYMENT_SUCCESS_WEBHOOK` with `data.payment.payment_offers[]` |

---

## 3. Core Workflow: Create Offer → Attach → Verify

### Step 1 — Create the offer

```
POST /pg/offers
```

```json
{
    "offer_meta": {
        "offer_title": "Flat 10% off on HDFC Credit Cards",
        "offer_description": "10% instant discount up to ₹500 on HDFC credit cards. Min order ₹1500.",
        "offer_code": "HDFC10APR",
        "offer_start_time": "2026-04-20T00:00:00+05:30",
        "offer_end_time":   "2026-04-30T23:59:59+05:30"
    },
    "offer_tnc": {
        "offer_tnc_type": "text",
        "offer_tnc_value": "Offer valid only on HDFC credit cards. Max discount ₹500 per transaction."
    },
    "offer_details": {
        "offer_type": "DISCOUNT",
        "discount_details": {
            "discount_type": "percentage",
            "discount_value": 10,
            "max_discount_amount": 500
        }
    },
    "offer_validations": {
        "min_amount": 1500,
        "max_allowed": 1000,
        "payment_method": {
            "card": {
                "type": "cc",
                "bank_name": "hdfc",
                "scheme_name": "visa"
            }
        }
    }
}
```

**Required:**

- `offer_meta.offer_title` (3–50 chars), `offer_description` (3–100), `offer_code` (1–45, unique), `offer_start_time`, `offer_end_time` (ISO-8601).
- `offer_tnc.offer_tnc_type` (`text` or `link`) + `offer_tnc_value` (≤ 100 chars — link to full T&Cs if `link`).
- `offer_details.offer_type` and the matching `discount_details` / `cashback_details`.
- `offer_validations.min_amount`, `max_allowed` (per-transaction cap), `payment_method` (exactly one filter; use `{"all":{}}` to match everything).

**Response:** returns the `offer_id` (UUID). Store it; you'll reference it at checkout.

```json
{
    "offer_id": "b1c2d3e4-5678-90ab-cdef-1234567890ab",
    "offer_status": "active",
    "offer_meta": { ... },
    "offer_tnc": { ... },
    "offer_details": { ... },
    "offer_validations": { ... }
}
```

### Step 2 — Surface eligible offers to the customer (optional)

Fetch `GET /pg/offers` and render the active ones on your checkout:

```javascript
const offers = await cashfree.PGFetchOffers();
const eligible = offers.data.filter(o =>
    o.offer_status === "active" &&
    order.order_amount >= o.offer_validations.min_amount &&
    matchesPaymentMethod(o, customer.selectedMethod)
);
```

Show the offer's `offer_title` and `offer_description` and let the customer "apply" the offer (or auto-pick the best).

### Step 3 — Attach the offer at payment

Include `offer_id` in the Order Pay call (S2S) or pass it to the web/mobile SDK when invoking checkout.

```json
// POST /pg/orders/sessions (S2S)
{
    "payment_session_id": "session_xxx",
    "payment_method": { "card": { "channel": "link", "card_number": "...", ... } },
    "offer_id": "b1c2d3e4-5678-90ab-cdef-1234567890ab"
}
```

If the offer's `payment_method` filter doesn't match the card the customer actually used (e.g. they used an Axis card with an HDFC offer), Cashfree **rejects** the transaction with an offer-ineligibility error at the payment step. It does not silently fall back to non-discount.

### Step 4 — Verify that the offer actually applied

On `PAYMENT_SUCCESS_WEBHOOK`, `data.payment.payment_offers[]` lists the offers that ran:

```json
"payment_offers": [
    {
        "offer_id": "b1c2d3e4-5678-90ab-cdef-1234567890ab",
        "offer_type": "DISCOUNT",
        "offer_meta": { "offer_title": "Flat 10% off on HDFC Credit Cards", "offer_code": "HDFC10APR" },
        "offer_redemption": {
            "redemption_status": "SUCCESS",
            "discount_amount": 150.00
        }
    }
]
```

Rules:

- **`redemption_status: "SUCCESS"`** — offer applied; settlement will net `order_amount − discount_amount`.
- **`FAILED`** — offer did not apply (eligibility mismatch despite being attached). The customer paid the full amount. Your UI should explain why (`offer_ineligibility_reason`).
- **Missing entirely** — no offer attached to this payment.

Do not fulfill as if an offer applied until you see `redemption_status: "SUCCESS"` in the webhook.

---

## 4. No-Cost EMI — The Recipe

No-cost EMI is **not** a separate payment method. It is the combination of:

1. A card-EMI or cardless-EMI payment method selected by the customer (see `pg/apis/references/REFERENCE.md` — Card EMI / Cardless EMI).
2. A Cashfree **offer** of `offer_type: "NO_COST_EMI"` that covers the interest portion.

### Step 1 — Create the offer

```json
{
    "offer_meta": {
        "offer_title": "No-Cost EMI on 3/6-month tenures",
        "offer_description": "No-Cost EMI available on HDFC, ICICI, Axis cards for 3 & 6 month tenures.",
        "offer_code": "NOCOSTAPR",
        "offer_start_time": "2026-04-20T00:00:00+05:30",
        "offer_end_time":   "2026-04-30T23:59:59+05:30"
    },
    "offer_tnc": { "offer_tnc_type": "text", "offer_tnc_value": "Applicable on orders ≥ ₹3000." },
    "offer_details": { "offer_type": "NO_COST_EMI" },
    "offer_validations": {
        "min_amount": 3000,
        "max_allowed": 5000,
        "payment_method": {
            "emi": {
                "type": "credit_card_emi",
                "issuer": "hdfc",
                "tenures": [3, 6]
            }
        }
    }
}
```

### Step 2 — Customer picks EMI + offer; Cashfree waives interest

At the EMI step of checkout, attach the `offer_id`. Cashfree applies the no-cost treatment: the customer pays `order_amount / tenure` per month, Cashfree retains the full `order_amount` from settlement, and the interest subsidy is deducted from the merchant.

Your cost: the interest component (typically 13-16% p.a. for card EMI) appears as an adjustment in settlement recon with a descriptive reason.

### Step 3 — Show it in the UI correctly

On the EMI options screen:

- "3 months: ₹3333/month (No-cost EMI — no interest)" ← show the no-cost tenure prominently
- "9 months: ₹1200/month (Interest 13% p.a. — total ₹10,800)" ← show non-covered tenures with interest

If you don't surface the distinction, customers often blame you later for being charged interest.

---

## 5. Security Constraints — Never Violate

- **Never expose `offer_id` to a customer who hasn't been authenticated.** Someone could enumerate offers to find better-discount codes intended for a different segment.
- **Always validate on the server** that the `offer_id` a client sent is in the eligible set for that customer (logged-in status, segment, past orders). Cashfree only validates payment-method eligibility; business eligibility is yours.
- **Never compute the discount yourself and send a pre-discounted `order_amount`.** Let Cashfree apply the offer, so the discount shows up in settlement recon as a tracked line item and on the customer's statement as an explicit bank offer.
- **Always wait for `redemption_status: "SUCCESS"` in the webhook** before treating the customer as having earned the cashback (for `CASHBACK` offers).

---

## 6. Testing in Sandbox

- Create a sandbox offer with `offer_code: "TEST10"`, `offer_type: "DISCOUNT"`, percentage 10%, min_amount ₹100.
- Create a sandbox order for ₹500 and attach the `offer_id`.
- Pay with a matching sandbox card; verify `PAYMENT_SUCCESS_WEBHOOK.data.payment.payment_offers[0].offer_redemption.discount_amount = 50`.
- Try attaching the same offer to a non-matching payment method; confirm rejection.
- For no-cost EMI: ensure your sandbox account has EMI enabled and use a test card with EMI support.

---

## 7. Quick Diagnostic

| Symptom | Likely cause | Fix |
|---|---|---|
| `offer_code_already_exists` | Reused code | Make `offer_code` unique per campaign (`HDFC10_V2`) |
| `offer_start_time` in past rejected | Validation | Use future ISO time |
| Offer created but never applies | `payment_method` filter mismatch | Verify customer's card BIN/bank vs filter |
| `offer_applied: FAILED` in webhook | Eligibility check failed at payment time | Inspect `offer_ineligibility_reason`; tighten UI to only show eligible offers |
| Customer picks no-cost EMI tenure but still charged interest | Offer not attached at payment | Attach `offer_id` at EMI checkout step, not just at offer-selection step |
| Discount missing from settlement | Offer attached but webhook showed FAILED | Refund customer the expected discount as goodwill; investigate eligibility |
| Offer visible in API list but not in Dashboard | Offer in different state or merchant view cache | `GET /pg/offers/{id}` is source of truth; refresh Dashboard |
| Multiple offers applying simultaneously | Passing multiple `offer_id`s | Only one offer per payment (unless stackable — confirm with Cashfree) |
| No-cost EMI shows interest on customer statement | Bank-side delay in interest reversal | Normal — bank charges interest upfront, Cashfree settles the reversal next cycle; disclose to customer |

---

## 8. Useful Links

- [Create Offer API](https://www.cashfree.com/docs/api-reference/payments/latest/offers/create)
- [EMI & Paylater methods](https://www.cashfree.com/docs/api-reference/payments/latest/payments/pay)
- [Affordability / EMI product](https://docs.cashfree.com/docs/affordability-emi)
- [Payment Offers webhook payload — pg/webhooks/references/REFERENCE.md](../webhooks/references/REFERENCE.md)
- [Settlement recon — how offer discounts appear](../../settlements-and-reconciliation/references/REFERENCE.md)
