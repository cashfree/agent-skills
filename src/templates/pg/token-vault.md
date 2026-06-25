---
name: Cashfree Payment Gateway - Token Vault (RBI Card Tokenization)
description: >
  Use when a merchant wants saved-card / OneClick / remember-me checkout using RBI-compliant
  network tokenization (Visa/Mastercard/RuPay). Triggers: save card, saved card, tokenize card,
  RBI tokenization, card-on-file, CoF, network token, remember card, OneClick checkout,
  express checkout, instrument_id, card token, PGCustomerFetchInstruments, PGCustomerFetchInstrument,
  PGCustomerDeleteInstrument, PGCustomerInstrumentsFetchCryptogram, cryptogram, INSTRUMENT_ACTIVE_WEBHOOK,
  INSTRUMENT_FAILED_WEBHOOK, token vault, save_instrument flag, PAN storage illegal, RBI mandate,
  delete saved card, pay with saved card, CoF charging.
  Pair with pg/apis or pg/backend-sdks (pay-with-token flow) and pg/webhooks (instrument events).
---

# Cashfree Payment Gateway — Token Vault (RBI Card Tokenization)

> **References available:** This SKILL.md covers the tokenization consent flow, saved-card list/fetch/delete, paying with a saved instrument, and the INSTRUMENT webhooks. For the full cryptogram schema, CoF charging endpoint fields, per-language SDK code, network-specific behaviour, and the legal/compliance background — read `references/REFERENCE.md` in this directory.

---

## 1. Scope & Boundaries

### When to use this skill

- The merchant wants to offer **saved-card / OneClick / express checkout** — customer enters card once, subsequent payments pre-fill.
- The merchant is building **subscription / recurring charges** and needs network tokens for future debits (also see `subscriptions/SKILL.md` for the mandate side).
- The developer needs to **list, fetch, or delete saved instruments** on behalf of a customer (e.g. a "Saved cards" settings page, a GDPR deletion request).
- The developer is wiring **`INSTRUMENT_ACTIVE_WEBHOOK` / `INSTRUMENT_FAILED_WEBHOOK`** — fired after the asynchronous network-tokenization completes.
- The project is charging a **card-on-file (CoF)** transaction — paying with a saved `instrument_id` + cryptogram.

### When NOT to use this skill

- If the merchant is **storing raw PAN / card numbers themselves** — **stop immediately**. Raw PAN storage has been illegal for Indian merchants (RBI mandate, effective 2022). Use token vault; never your own DB.
- If the use case is **UPI AutoPay or eMandate** — that's `subscriptions/SKILL.md`, not token vault (those are mandate flows, not card tokens).
- If the use case is **one-off guest checkout with no save** — no token vault needed; the regular PG flows (`pg/apis/SKILL.md`) are sufficient.
- If the merchant is a non-Indian entity processing international cards — RBI tokenization applies to Indian-issued cards; internationals have different frameworks (PCI token vault, Visa VTS, Mastercard MDES directly).

### The legal backdrop (read this once)

Since October 2022, the Reserve Bank of India prohibits merchants and payment aggregators from storing raw card data (PAN, CVV, expiry) except by card networks and issuers. Merchants must use **network tokens** — issued by Visa / Mastercard / RuPay — which are PAN-less references that can be used for repeat transactions. Cashfree's Token Vault is the interface: you ask Cashfree to tokenize at payment time, Cashfree obtains the network token, you later reference it by `instrument_id`.

---

## 2. Structural Overview

### Core Objects

| Object | Description |
|---|---|
| **Instrument** | A saved payment method (primarily cards; wallets may appear). Identified by Cashfree's `instrument_id` and owned by a `customer_id`. `instrument_status` is `ACTIVE` / `INACTIVE` on the API (a deleted instrument becomes `INACTIVE`); the webhook reports `ACTIVE` / `FAILED`. |
| **Cryptogram** | A one-time, dynamic code tied to a network token. Required for each CoF transaction — the card network generates it when Cashfree asks. Expires quickly (seconds to minutes). |
| **Token Requestor ID (TRID)** | The network's identifier for Cashfree-as-tokenizer. Surfaces in the cryptogram response; rarely needed at the merchant layer. |
| **`card_token_details`** | An object on `instrument_meta` (API fetch responses): `{ par, expiry_month, expiry_year }` — the PAR and token expiry. (In the INSTRUMENT webhooks this is sent as `null`; the PAR arrives as `card_par` instead.) |
| **Consent** | Customer opt-in to save the instrument. Captured at payment time via the `save_instrument` flag. Required by RBI. |

### Environments & auth

Same as the rest of the PG API:

| Environment | Base URL |
|---|---|
| Sandbox | `https://sandbox.cashfree.com/pg` |
| Production | `https://api.cashfree.com/pg` |

Headers: `x-client-id`, `x-client-secret`, `x-api-version: 2025-01-01`, `Content-Type: application/json`.

### Endpoints

| Purpose | Endpoint | SDK method |
|---|---|---|
| List saved instruments for a customer | `GET /pg/customers/{customer_id}/instruments?instrument_type=card` | `PGCustomerFetchInstruments` |
| Fetch one instrument | `GET /pg/customers/{customer_id}/instruments/{instrument_id}` | `PGCustomerFetchInstrument` |
| Delete an instrument | `DELETE /pg/customers/{customer_id}/instruments/{instrument_id}` | `PGCustomerDeleteInstrument` |
| Fetch cryptogram for CoF charge | `GET /pg/customers/{customer_id}/instruments/{instrument_id}/cryptogram` | `PGCustomerInstrumentsFetchCryptogram` |
| Pay with saved instrument | `POST /pg/orders/sessions` with `payment_method.card.instrument_id` | `PGPayOrder` |

Webhook events:

| `type` | Meaning |
|---|---|
| `INSTRUMENT_ACTIVE_WEBHOOK` | Network tokenization completed successfully — instrument is now usable for CoF |
| `INSTRUMENT_FAILED_WEBHOOK` | Tokenization failed (issuer rejected, network unavailable) |

---

## 3. Core Workflow

### Step 1 — Capture consent at the first payment

On the first payment (where the customer enters card details normally), set `save_instrument: true` in the Order Pay call. Cashfree exposes a "Save this card for future payments" checkbox on Drop-in / Checkout UIs that drives this flag.

```javascript
// Node.js — S2S, or equivalent via web SDK
const result = await cashfree.PGPayOrder({
    payment_session_id: paymentSessionId,
    payment_method: {
        card: {
            channel: "link",
            card_number: "4111111111111111",
            card_expiry_mm: "12",
            card_expiry_yy: "29",
            card_cvv: "123",
            card_holder_name: "Jane Doe",
            save_instrument: true              // ← consent flag
        }
    }
});
```

After the payment succeeds, Cashfree begins **asynchronous** network tokenization. The instrument is **not immediately usable** — wait for the `INSTRUMENT_ACTIVE_WEBHOOK`.

### Step 2 — Handle the INSTRUMENT webhook

```javascript
if (event.type === "INSTRUMENT_ACTIVE_WEBHOOK") {
    const i = event.data.instrument;
    await db.savedCards.upsert({
        customer_id: i.customer_id,
        instrument_id: i.instrument_id,
        instrument_uid: i.instrument_uid,          // 64-char hash, e.g. "680cd71715...ec42660" — NOT a PAN
        instrument_display: i.instrument_display,   // masked last 4: "XXXXXXXXXXXX6854"
        instrument_type: i.instrument_type,         // "card"
        instrument_status: i.instrument_status,     // webhook: "ACTIVE" | "FAILED"
        card_network: i.instrument_meta?.card_network,  // lowercase: visa | mastercard | rupay | amex | diners
        card_bank_name: i.instrument_meta?.card_bank_name,
        card_type: i.instrument_meta?.card_type,         // webhook short form: credit | debit | prepaid
    });
} else if (event.type === "INSTRUMENT_FAILED_WEBHOOK") {
    const i = event.data.instrument;
    await db.savedCards.markFailed(i.instrument_id);
    // Tell the customer their card couldn't be saved; ask them to re-enter next time.
}
```

Signature verification is identical to all Cashfree webhooks — raw body + `x-webhook-timestamp`, HMAC-SHA256, base64.

### Step 3 — Surface saved cards to the customer

```
GET /pg/customers/{customer_id}/instruments?instrument_type=card
```

Response is an array of instruments. Render them as selectable cards on your checkout UI. **Never** store or display raw PAN — use `instrument_display` (masked) only.

```javascript
const cards = await cashfree.PGCustomerFetchInstruments(customerId, "card");
// cards.data → [{ instrument_id, instrument_display, instrument_meta: { card_network, card_bank_name, ... }, ... }]
```

### Step 4 — Pay with a saved instrument

When the customer picks a saved card, create an order as usual (`POST /pg/orders`), then call Order Pay referencing the `instrument_id` instead of raw card details. CVV is optional; network policy may require it on first CoF reuse.

```javascript
await cashfree.PGPayOrder({
    payment_session_id: paymentSessionId,
    payment_method: {
        card: {
            channel: "link",
            instrument_id: "54deabb4-ba45-4a60-9e6a-9c016fe7ab10"
            // card_cvv: "123"  // include if your CoF policy requires
        }
    }
});
```

The rest is the standard PG flow — 3DS where applicable, webhook-driven verification, `GET /pg/orders/{order_id}` to confirm `PAID`.

### Step 5 — Customer-initiated delete

Expose a "remove saved card" action. RBI and good hygiene both mandate this.

```
DELETE /pg/customers/{customer_id}/instruments/{instrument_id}
```

After deletion, the `instrument_id` becomes unusable. Refunds on **prior** transactions that used this instrument still work — they refund to the underlying card via the network, not through the token.

---

## 4. Advanced: Direct CoF Charging with Cryptogram

For merchants who need to charge a customer **without any checkout interaction** (e.g., subscription renewals, pre-authorized tolls) and where the underlying mandate is in place, fetch a cryptogram and send it to the Order Pay API.

```
GET /pg/customers/{customer_id}/instruments/{instrument_id}/cryptogram
```

Response:

```json
{
    "instrument_id": "54deabb4-ba45-4a60-9e6a-9c016fe7ab10",
    "token_requestor_id": "5004xxxxxxxx",
    "card_number": "4111XXXXXXXXXXXX",
    "card_expiry_mm": "12",
    "card_expiry_yy": "29",
    "cryptogram": "AgAAAAAAAAAAA...",
    "card_display": "1111"
}
```

Use it immediately — cryptograms are one-time and expire in seconds to minutes. Most merchants do not need this endpoint; prefer the `instrument_id`-only flow (Step 4) unless you're building a true headless recurring charge outside the `subscriptions/` product.

---

## 5. Security Constraints — Never Violate

- **Never store raw PAN anywhere** — not in your DB, not in logs, not in analytics, not in error reports. Token vault is the only lawful option for Indian merchants.
- **Never send a card number to the client after the first payment.** Use `instrument_id` for saved-card re-use. Use `instrument_display` for the masked display string.
- **Always capture explicit consent.** The `save_instrument` flag must reflect a customer-initiated action (checkbox tick, explicit "save" button). Pre-ticking the box violates RBI consent rules.
- **Always expose a delete flow.** Customers must be able to remove saved cards. Fulfilling a deletion promptly is both RBI and GDPR / DPDP policy.
- **Never cache a cryptogram.** Use it once, on the immediate charge request, and discard it.
- **Tokenization is async.** Do not treat a successful first payment as a ready-to-reuse save. Wait for `INSTRUMENT_ACTIVE_WEBHOOK` before exposing the card in the saved-cards list.

---

## 6. Testing in Sandbox

- Pay with test card `4111 1111 1111 1111` and `save_instrument: true`.
- Within seconds, expect an `INSTRUMENT_ACTIVE_WEBHOOK` for the resulting `customer_id`.
- `GET /pg/customers/{customer_id}/instruments?instrument_type=card` should return the saved instrument.
- Create a fresh order and pay with `instrument_id` to validate the full CoF loop.
- Delete via `DELETE`, then re-list to confirm disappearance.
- For `INSTRUMENT_FAILED_WEBHOOK`, use a card number designated by Cashfree's test-data docs for failed tokenization (see `validation-and-testing/SKILL.md`).

---

## 7. Quick Diagnostic

| Symptom | Likely cause | Fix |
|---|---|---|
| `instrument_status: "FAILED"` on webhook | Issuer declined tokenization (new card, BIN issue, network outage) | Tell customer to re-enter next time; log the reason |
| Saved card list empty immediately after payment | Tokenization is async | Wait for `INSTRUMENT_ACTIVE_WEBHOOK` before exposing |
| CoF payment returns 400 `instrument_id_invalid` | Wrong instrument_id, wrong customer_id, or instrument deleted | Re-fetch list; verify ownership |
| CoF payment returns 400 `cvv_required` | Network requires CVV on this reuse | Collect CVV via a CVV-only UI (no full card re-entry) |
| 3DS flow triggers on a saved-card charge | Network challenge — normal, especially for first reuse | Handle the same `action: "link"` / `action: "post"` logic as a first-time card |
| Customer claims they never consented | `save_instrument` was set implicitly by your UI | Audit consent capture; surface an explicit checkbox |
| Delete API returns 404 | Wrong `customer_id`/`instrument_id` or already deleted | Re-fetch list to confirm state |
| Cryptogram request succeeds but payment fails `cryptogram_expired` | Cryptogram unused for too long | Fetch + pay atomically; don't cache |
| Instrument still shows ACTIVE after delete | Cache stale | Always `GET` list fresh after mutation; don't rely on local state |
| Saved card from sandbox not in production | Separate namespaces | Re-save in production; sandbox and production instruments don't cross over |

---

## 8. Useful Links

- [Fetch Cryptogram API](https://www.cashfree.com/docs/api-reference/payments/latest/token-vault/fetch-cryptogram)
- [Token Vault (Card Tokenization) product](https://www.cashfree.com/card-tokenization/)
- [Save Instrument at Payment Time — Order Pay API](https://www.cashfree.com/docs/api-reference/payments/latest/payments/pay)
- [INSTRUMENT webhook payloads — pg/webhooks/references/REFERENCE.md](../webhooks/references/REFERENCE.md)
- [RBI Tokenization Guidelines](https://www.rbi.org.in/Scripts/NotificationUser.aspx?Id=12211)
