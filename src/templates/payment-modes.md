---
name: Payment Modes
description: How to check what payment modes are enabled for a merchant and configure them for your integration.
---

## Quick: fetch eligible payment methods

This API is the only source of truth for which payment methods are activated on a merchant account — do **not** guess from the dashboard or list features.

**When to run it:**
- The user explicitly asks "what payment modes are enabled?"
- You already have `CASHFREE_APP_ID` / `CASHFREE_SECRET_KEY` at hand (from the codebase, `.env`, or the user's message) AND you're about to design an integration that depends on what's enabled.
- An App ID the user shared during the integration-start step (`getting-started` → "Before You Start") counts as "at hand" — you still need the secret key alongside it to call this API.

**Do NOT block the conversation to ask the user for credentials just to run this check.** If keys aren't already available, proceed with the integration plan assuming the standard methods (cards / UPI / netbanking) and note that the assistant will verify once keys exist.

```bash
curl --request POST \
  --url https://sandbox.cashfree.com/pg/eligibility/payment_methods \
  --header 'Content-Type: application/json' \
  --header 'x-api-version: 2025-01-01' \
  --header 'x-client-id: <api-key>' \
  --header 'x-client-secret: <api-key>' \
  --data '
{
  "queries": {
    "amount": 100
  }
}
'
```

For **production**, replace the host with `https://api.cashfree.com`. Everything else (path, headers, body) is identical.

### What the response looks like

```json
{
  "entity": "eligibility",
  "data": [
    {
      "entity_type": "payment_methods",
      "entity_value": "upi",
      "eligibility": true,
      "entity_details": { "display_name": "UPI" }
    },
    {
      "entity_type": "payment_methods",
      "entity_value": "card",
      "eligibility": true,
      "entity_details": { "display_name": "Cards" }
    },
    {
      "entity_type": "payment_methods",
      "entity_value": "paylater",
      "eligibility": false
    }
  ]
}
```

Each row's `eligibility: true|false` tells you whether that method is enabled on the merchant account for the supplied `amount`. Filter `data[]` where `eligibility === true` to get the enabled list.

### Common variants

- **Per-order eligibility (after creating an order)** — pass an `order_id` in the body's `filters` to scope the result to that order's amount/currency/customer.
- **Card BIN eligibility** — use `queries.payment_methods = "card"` with `filters.card_bin` to check if a specific card BIN is supported and what schemes/networks apply.
- **PayLater / Cardless EMI offers** — these require the `customer_details.customer_phone` in the order/filters payload, since eligibility is phone-number-driven.

Full endpoint reference: https://www.cashfree.com/docs/api-reference/payments/latest/eligibility/get-eligible-payment-methods

---

## Reference: Payment Method Categories

Cashfree organises payment methods into six groups (these are the `entity_value` strings the API returns):

1. **Cards** (`card`) — Indian and International credit/debit cards + Apple Pay. Supports Visa, Mastercard, Rupay, American Express, Diners.
2. **UPI** (`upi`) — Intent, QR, and Collect flows. Flash UPI SDK for in-app payments. Recurring mandates supported. Note: UPI Collect for P2M is being deprecated per NPCI guidelines.
3. **Netbanking** (`netbanking`) — Available by default. Supports 70+ banks. Each bank has a specific bank code (e.g., HDFC = `3021`/`HDFCR`, SBI = `3044`/`SBINR`).
4. **Bank Transfers / Challans** (`banktransfer`) — IMPS, NEFT, RTGS via Virtual Bank Accounts. Default TTL is 5 days. Customer-specific fixed VBAs available.
5. **Wallets** (`app`) — FreeCharge, PayPal, MobiKwik, Ola Money, Airtel Money, Amazon Pay, PhonePe. Most activate automatically; PayPal requires self-activation.
6. **Paylaters & Cardless EMIs** (`paylater`, `cardlessemi`, `emi`) — Credit card EMI (HDFC, Axis, ICICI, Kotak, BOB, Standard Chartered, RBL, AU, Yes Bank, HSBC, Amex), Debit card EMI (HDFC only).

## Dashboard alternative (non-API)

If the user does not have API keys yet, point them to: **Merchant Dashboard → Settings > Payment Gateway > Payment Methods** to view enabled modes and request activation. Prefer the API path above whenever credentials are available.

## Restricting Payment Methods per Order (`payment_methods_filters`)

To control which methods appear at checkout for a specific order, pass `payment_methods_filters` in the **Create Order API**:

```json
{
  "payment_methods_filters": {
    "methods": {
      "action": "ALLOW",
      "values": ["credit_card", "debit_card", "prepaid_card", "credit_card_emi", "debit_card_emi"]
    },
    "filters": {
      "card_schemes": { "action": "ALLOW", "values": ["VISA"] },
      "card_issuing_bank": { "action": "ALLOW", "values": ["AXIS"] },
      "card_bins": { "action": "ALLOW", "values": ["451457"] },
      "card_suffix": { "action": "ALLOW", "values": ["1936"] },
      "card_emi_tenure": { "action": "ALLOW", "values": [3] }
    }
  }
}
```

### Eligibility Configuration Rules
- `action` field must always be `ALLOW`.
- Card schemes must be uppercase (e.g., `VISA`, `RUPAY`, `MASTERCARD`, `DINERS`, `AMEX`).
- EMI filters only apply when `credit_card_emi` or `debit_card_emi` is in `methods`.
- `card_emi_tenure` range: 3 to 36 months.
- If `payment_methods_filters` is omitted, all enabled payment methods are shown (default behaviour).

## Common Troubleshooting

- **"Payment mode not enabled for merchant"** — Method not activated on the account. Re-run the eligibility curl above; the entry's `eligibility` will be `false`. Activate via **Settings > Payment Gateway > Payment Methods** in the Merchant Dashboard.
- **Sandbox testing for Netbanking** — Use bank code `3333` for testing in sandbox mode.
- **401 / "authentication failed" on the eligibility call** — `x-client-id` / `x-client-secret` mismatch with the host. Sandbox keys only work against `sandbox.cashfree.com`; production keys only work against `api.cashfree.com`.

## Key Documentation Pages

- **Get Eligible Payment Methods API**: https://www.cashfree.com/docs/api-reference/payments/latest/eligibility/get-eligible-payment-methods
- **Payment Methods Overview**: https://www.cashfree.com/docs/payments/manage/payment-methods/overview
- **Payment Method Eligibility**: https://www.cashfree.com/docs/payments/manage/payment-method-eligibility
- **Cards**: https://www.cashfree.com/docs/payments/manage/payment-methods/credit-and-debit-cards/overview
- **UPI**: https://www.cashfree.com/docs/payments/manage/payment-methods/upi
- **Netbanking**: https://www.cashfree.com/docs/payments/manage/payment-methods/netbanking
- **Wallets**: https://www.cashfree.com/docs/payments/manage/payment-methods/wallets
- **Bank Transfers**: https://www.cashfree.com/docs/payments/manage/payment-methods/bank-transfers
- **Paylaters & Cardless EMIs**: https://www.cashfree.com/docs/payments/manage/payment-methods/paylaters-and-cardless-emis
