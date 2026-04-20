---
name: Cashfree Cross Border - Reference
description: >
  Reference material for the Cross Border skill. Read this when you need:
  full verification parameters table, Workflow C (submit via order_tags), Workflow D (subscription charges),
  Workflow E (sandbox testing with test values), or verification requirements by goods type.
  Always read cross-border/SKILL.md first for the core integration flow.
---

# Cashfree Cross Border — Reference

> This document is in `references/` — file name `REFERENCE.md`. Read `../SKILL.md` first for the core integration workflow.

---

## 1. Verification Parameters Reference

These are all fields for PA-CB compliance when uploading verification details via `POST /import/transactions/{cf_payment_id}/details`:

| Parameter | Field Key | Required For | Description |
|---|---|---|---|
| Buyer name | `importer_name` | All | Name of the customer availing the service |
| Goods description | `goods_description` | All | Description of the product or service sold |
| Invoice number | `imports_invoice_number` | All | Unique invoice number for the customer invoice |
| Address | `importer_address_line` | All | Complete address of the customer |
| Postal code | `importer_address_postal_code` | All | Postal code of the customer |
| Country of origin | `country_of_origin` | All | Country where goods/services originate |
| Invoice file | `invoice_file` | All | Invoice document (file upload) |
| HSN code | `hs_code` | Physical Goods, Digital Goods | Harmonized System of Nomenclature code as per DGFT |
| E-commerce order serial | `ecommerce_order_serial_number` | Physical Goods, Digital Goods | E-commerce order serial number |
| Shipment date | `shipment_date` | Physical Goods | Date of shipment (DD/MM/YYYY) |
| Port of loading | `port_of_loading` | Physical Goods | Port from which goods are shipped |
| AWB number | `awb_number` | Physical Goods | Air Waybill number for shipment tracking |
| Payer PAN | `importer_pan` | Conditional | Permanent Account Number of the payer |
| Payer date of birth | `importer_dob` | Conditional | Date of birth (DD-MM-YYYY format) |
| LRS TCS limit | `lrs_tcs_limit` | Conditional | Whether transaction breaches ₹10 lakh LRS limit. Values: `YES` or `NO` |
| LRS TCS declaration | `lrs_tcs_declaration` | Conditional | Whether LRS/TCS declaration was shown to customer. Values: `YES` or `NO` |

---

## 2. Workflow C: Submit Verification Details via Order Tags (At Order Creation)

Use when you already have all verification details at order creation time. Avoids a separate API call after payment.

Include verification details in the `order_tags` parameter when calling `POST /pg/orders`:

```json
{
  "order_id": "order_crossborder_003",
  "order_amount": 500.00,
  "order_currency": "INR",
  "customer_details": {
    "customer_id": "cust_456",
    "customer_phone": "9999999999"
  },
  "order_tags": {
    "imports_importer_name": "JOHN DOE INDUSTRIES",
    "imports_importer_address_postal_code": "533103",
    "imports_goods_description": "chocolates",
    "imports_invoice_number": "52300"
  }
}
```

After payment:
1. Monitor verification status via `GET /import/transactions/{cf_payment_id}` or `PAYMENT_VERIFICATION_UPDATE` webhook.
2. If additional documents are required (`ACTION_REQUIRED`), upload them via `POST /import/transactions/{cf_payment_id}/details`.

---

## 3. Workflow D: Submit Verification Details for Subscription Charges

For recurring cross-border payments via Cashfree Subscriptions, pass verification details in `payment_tags`:

```bash
curl --location 'https://api.cashfree.com/pg/subscriptions/pay' \
--header 'Content-Type: application/json' \
--header 'x-api-version: 2025-01-01' \
--header 'x-client-id: <your_client_id>' \
--header 'x-client-secret: <your_client_secret>' \
--data '{
    "subscription_id": "substest",
    "payment_id": "paymenttest",
    "payment_type": "CHARGE",
    "payment_amount": 1,
    "payment_schedule_date": "2025-07-12T10:00:00+05:30",
    "payment_tags": {
        "imports_goods_description": "chocolates",
        "imports_importer_address_postal_code": "560075",
        "imports_importer_name": "John Doe"
    }
}'
```

---

## 4. Workflow E: Sandbox Testing

### Test Values for Transaction Verification

In sandbox, use these predefined values that are automatically approved:

| Field | Test Value |
|---|---|
| `importer_name` | `John` |
| `importer_address` | `321 Elm Street, Suite 3, Los Angeles, CA 90401, USA` |
| `goods_description` | `This is a test product for test purpose` |
| `country_of_origin` | `USA` |
| `ecommerce_order_serial_number` | `123123` |
| `invoice_number` | `234234` |
| `hs_code` | `3456` |
| `shipment_date` | `01/01/2027` |
| `port_of_loading` | `Houston` |
| `importer_address_postal_code` | `560034` |

For file-type content (e.g., `invoice_file`), the sandbox approves **PDF files** and rejects other formats.

### Simulate Settlement

**Trigger settlement:**
```
POST /import/settlements/simulate
Headers: x-client-id, x-client-secret, x-api-version: 2025-01-01
```

This is asynchronous — settlement entries typically created within one second.

**Mark settlement as processed:**
```
POST /import/settlements/simulate/processed
Headers: x-client-id, x-client-secret, x-api-version: 2025-01-01
```

> The sandbox forex rate is notional and may differ from actual foreign exchange rates.

**Simulate a skipped settlement:**
1. Create a transaction.
2. Refund the transaction.
3. Trigger settlement using the API.
4. Settlement will be skipped (total collection amount < 0).

---

## 5. Verification Details by Use Case

### Digital Services
(e.g., SaaS, streaming, consulting)

| Parameter | Field Key | Required |
|---|---|---|
| Buyer name | `importer_name` | Yes |
| Goods description | `goods_description` | Yes |
| Invoice number | `imports_invoice_number` | Yes |
| Address | `importer_address_line` | Yes |
| Postal code | `importer_address_postal_code` | Yes |
| Country of origin | `country_of_origin` | Yes |
| Invoice file | `invoice_file` | Yes |

### Digital Goods
(e.g., software licenses, e-books, digital media)

All Digital Services fields, plus:

| Parameter | Field Key | Required |
|---|---|---|
| HSN code | `hs_code` | Yes |
| E-commerce order serial | `ecommerce_order_serial_number` | Yes |

### Physical Goods
(e.g., merchandise, electronics, food)

All Digital Goods fields, plus:

| Parameter | Field Key | Required |
|---|---|---|
| Shipment date | `shipment_date` | Yes |
| Port of loading | `port_of_loading` | Yes |
| AWB number | `awb_number` | Yes |

### Conditional Fields (All Use Cases)

| Parameter | Field Key | When Required |
|---|---|---|
| Payer PAN | `importer_pan` | When requested by Cashfree |
| Payer date of birth | `importer_dob` | When requested by Cashfree (DD-MM-YYYY) |
| LRS TCS limit | `lrs_tcs_limit` | When transaction may breach ₹10 lakh LRS limit |
| LRS TCS declaration | `lrs_tcs_declaration` | When LRS/TCS declaration is required |

---

## 6. Webhook Payloads

### PAYMENT_VERIFICATION_UPDATE Payload

```json
{
  "data": {
    "order_id": "e145c994-5899-4466-804d-b90c625b2c1b",
    "cf_payment_id": 5114910634577,
    "payment_status": "SUCCESS",
    "payment_verification_status": "ACTION_REQUIRED",
    "payment_verification_expiry": "2024-07-12T15:19:42+05:30",
    "remarks": null,
    "required_details": [
      { "doc_name": "goods_description", "doc_type": "VALUE", "doc_status": "ACTION_REQUIRED", "remarks": null },
      { "doc_name": "invoice_number", "doc_type": "VALUE", "doc_status": "IN_REVIEW", "remarks": null },
      { "doc_name": "invoice_file", "doc_type": "DOCUMENT", "doc_status": "IN_REVIEW", "remarks": null },
      { "doc_name": "hs_code", "doc_type": "VALUE", "doc_status": "IN_REVIEW", "remarks": null },
      { "doc_name": "shipment_date", "doc_type": "VALUE", "doc_status": "ACTION_REQUIRED", "remarks": null }
    ]
  },
  "event_time": "2024-07-12T13:39:42+05:30",
  "type": "PAYMENT_VERIFICATION_UPDATE"
}
```

### ICA_SETTLEMENT_UPDATE Payload

```json
{
  "data": {
    "cf_ica_settlement_id": 12,
    "adjustment_amount_inr": -347641.22,
    "collection_amount_inr": 604854.0,
    "service_tax_inr": 2068.59,
    "settlement_amount_inr": 243651.95,
    "settlement_charges_inr": 0.0,
    "settlement_foreign_currency_details": {
      "settlement_amount_fcy": null,
      "settlement_currency": "USD",
      "settlement_forex_rate": null
    },
    "settlement_tax_inr": 0.0,
    "settlement_utr": null,
    "status": "NOT_INITIATED"
  },
  "event_time": "2024-10-03T13:27:36+05:30",
  "type": "ICA_SETTLEMENT_UPDATE"
}
```
