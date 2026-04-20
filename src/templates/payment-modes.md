---
name: Payment Modes
description: How to check what payment modes are enabled for a merchant and configure them for your integration.
---

## Key Documentation Pages

- **Payment Methods Overview**: https://www.cashfree.com/docs/payments/manage/payment-methods/overview
- **Payment Method Eligibility**: https://www.cashfree.com/docs/payments/manage/payment-method-eligibility
- **Cards**: https://www.cashfree.com/docs/payments/manage/payment-methods/credit-and-debit-cards/overview
- **UPI**: https://www.cashfree.com/docs/payments/manage/payment-methods/upi
- **Netbanking**: https://www.cashfree.com/docs/payments/manage/payment-methods/netbanking
- **Wallets**: https://www.cashfree.com/docs/payments/manage/payment-methods/wallets
- **Bank Transfers**: https://www.cashfree.com/docs/payments/manage/payment-methods/bank-transfers
- **Paylaters & Cardless EMIs**: https://www.cashfree.com/docs/payments/manage/payment-methods/paylaters-and-cardless-emis
- **Get Eligible Payment Methods API**: https://www.cashfree.com/docs/api-reference/payments/latest/eligibility/get-eligible-payment-methods

## Payment Method Categories

Cashfree organises payment methods into six groups:

1. **Cards** — Indian and International credit/debit cards + Apple Pay. Supports Visa, Mastercard, Rupay, American Express, Diners.
2. **UPI** — Intent, QR, and Collect flows. Flash UPI SDK for in-app payments. Recurring mandates supported. Note: UPI Collect for P2M is being deprecated per NPCI guidelines.
3. **Netbanking** — Available by default. Supports 70+ banks. Each bank has a specific bank code (e.g., HDFC = `3021`/`HDFCR`, SBI = `3044`/`SBINR`).
4. **Bank Transfers (Challans)** — IMPS, NEFT, RTGS via Virtual Bank Accounts. Default TTL is 5 days. Customer-specific fixed VBAs available.
5. **Wallets** — FreeCharge, PayPal, MobiKwik, Ola Money, Airtel Money, Amazon Pay, PhonePe. Most activate automatically; PayPal requires self-activation.
6. **Paylaters & Cardless EMIs** — Credit card EMI (HDFC, Axis, ICICI, Kotak, BOB, Standard Chartered, RBL, AU, Yes Bank, HSBC, Amex), Debit card EMI (HDFC only).

## How to Check Enabled Payment Modes

### Via Dashboard
Log in to the **Merchant Dashboard** → **Settings > Payment Gateway > Payment Methods** to view all enabled payment modes. You can also request activation of new payment modes directly from the dashboard.

### Via API
Use the **Get Eligible Payment Methods API** to programmatically check which payment methods are available for a given order or customer.

## Configuring Payment Methods for an Integration

### All methods share similar integration patterns
After integrating one payment method, adding another within the same family requires minimal changes.

### Restricting Payment Methods per Order (Payment Method Eligibility)
Use the `payment_methods_filters` parameter in the **Create Order API** to control which payment methods appear at checkout.

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

- **"Payment mode not enabled for merchant"** — The payment method being used is not activated on the merchant account. Go to **Settings > Payment Gateway > Payment Methods** in the Merchant Dashboard to check and request activation.
- **Sandbox testing for Netbanking** — Use bank code `3333` for testing in sandbox mode.
