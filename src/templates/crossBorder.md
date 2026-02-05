---
name: Cashfree Cross Border
description: Use this to see Cross Border documentation and API references
---

# Cashfree Cross Border - Collect from India Integration

## Overview
This integration enables foreign merchants (based outside India) to collect payments from Indian customers using Indian payment methods (UPI, Cards, Net Banking, etc.). Funds are settled to the merchant's overseas bank account.

## API Base URLs
- **Sandbox**: `https://sandbox.cashfree.com/`
- **Production**: `https://api.cashfree.com/`

## Authentication Headers
```
x-client-id: <your_client_id>
x-client-secret: <your_client_secret>
x-api-version: 2025-01-01
```

## Backend Integration

### 1. Create Order
**Endpoint**: `POST /pg/orders`

```javascript
// Node.js example
const createOrder = async (orderData) => {
  const response = await fetch('https://sandbox.cashfree.com/pg/orders', {
    method: 'POST',
    headers: {
      'x-client-id': process.env.CASHFREE_CLIENT_ID,
      'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
      'x-api-version': '2025-01-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      order_id: orderData.orderId,
      order_amount: orderData.amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: orderData.customerId,
        customer_email: orderData.email,
        customer_phone: orderData.phone
      },
      order_meta: {
        return_url: orderData.returnUrl,
        notify_url: orderData.webhookUrl
      }
    })
  });
  return response.json();
};
```

### 2. Upload Payment Verification Details
**Endpoint**: `POST /import/transactions/{cf_payment_id}/details`

Required for regulatory compliance. Upload documents after successful payment.

```javascript
const uploadVerificationDetails = async (cfPaymentId, details) => {
  const response = await fetch(
    `https://api.cashfree.com/import/transactions/${cfPaymentId}/details`,
    {
      method: 'POST',
      headers: {
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
        'x-api-version': '2025-01-01',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        goods_description: details.goodsDescription,
        invoice_number: details.invoiceNumber,
        importer_name: details.importerName,
        importer_address: details.importerAddress,
        country_of_origin: details.countryOfOrigin,
        // For Physical Goods:
        shipment_date: details.shipmentDate,
        port_of_loading: details.portOfLoading,
        awb_number: details.awbNumber,
        hs_code: details.hsCode
      })
    }
  );
  return response.json();
};
```

### 3. Get Payment Verification Status
**Endpoint**: `GET /import/transactions/{cf_payment_id}`

```javascript
const getVerificationStatus = async (cfPaymentId) => {
  const response = await fetch(
    `https://api.cashfree.com/import/transactions/${cfPaymentId}`,
    {
      headers: {
        'x-client-id': process.env.CASHFREE_CLIENT_ID,
        'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
        'x-api-version': '2025-01-01'
      }
    }
  );
  return response.json();
};
```

### 4. Get Settlement Details
**Endpoint**: `GET /import/settlements`

## Frontend Integration

### Cashfree JS SDK Checkout
```html
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>

<script>
const cashfree = Cashfree({ mode: "sandbox" }); // or "production"

function initiatePayment(paymentSessionId) {
  cashfree.checkout({
    paymentSessionId: paymentSessionId,
    redirectTarget: "_modal" // or "_self" for redirect
  }).then((result) => {
    if (result.error) {
      console.error("Payment error:", result.error.message);
    }
    if (result.paymentDetails) {
      console.log("Payment completed:", result.paymentDetails);
    }
  });
}
</script>
```

## Webhook Integration

### Configure Webhook Endpoint
Register your webhook URL in the Cashfree Dashboard under Developers > Webhooks.

### Webhook Events for Cross Border
1. **PAYMENT_VERIFICATION_UPDATE** - Payment verification status changes
2. **ICA_SETTLEMENT_UPDATE** - Settlement status updates

### Webhook Handler with Signature Verification

```javascript
// Node.js/Express webhook handler
const crypto = require('crypto');

app.post('/webhook/cashfree', express.raw({ type: 'application/json' }), (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const timestamp = req.headers['x-webhook-timestamp'];
  const rawBody = req.body.toString();
  
  // Verify signature
  const signedPayload = timestamp + rawBody;
  const expectedSignature = crypto
    .createHmac('sha256', process.env.CASHFREE_CLIENT_SECRET)
    .update(signedPayload)
    .digest('base64');
  
  if (signature !== expectedSignature) {
    return res.status(401).send('Invalid signature');
  }
  
  const payload = JSON.parse(rawBody);
  
  // Handle different webhook types
  switch (payload.type) {
    case 'PAYMENT_VERIFICATION_UPDATE':
      handleVerificationUpdate(payload.data);
      break;
    case 'ICA_SETTLEMENT_UPDATE':
      handleSettlementUpdate(payload.data);
      break;
    case 'PAYMENT_SUCCESS_WEBHOOK':
      handlePaymentSuccess(payload.data);
      break;
  }
  
  res.status(200).send('OK');
});

function handleVerificationUpdate(data) {
  // data contains: cf_payment_id, payment_status, payment_verification_status,
  // payment_verification_expiry, required_details[]
  console.log('Verification status:', data.payment_verification_status);
  // ACTION_REQUIRED, IN_REVIEW, VERIFIED, REJECTED
}

function handleSettlementUpdate(data) {
  // data contains: cf_ica_settlement_id, settlement_amount_inr,
  // settlement_foreign_currency_details, status, settlement_utr
  console.log('Settlement status:', data.status);
}
```

### Payment Verification Webhook Payload
```json
{
  "data": {
    "order_id": "order_123",
    "cf_payment_id": 5114910634577,
    "payment_status": "SUCCESS",
    "payment_verification_status": "ACTION_REQUIRED",
    "payment_verification_expiry": "2024-07-12T15:19:42+05:30",
    "required_details": [
      { "doc_name": "goods_description", "doc_type": "VALUE", "doc_status": "ACTION_REQUIRED" },
      { "doc_name": "invoice_file", "doc_type": "DOCUMENT", "doc_status": "IN_REVIEW" }
    ]
  },
  "event_time": "2024-07-12T13:39:42+05:30",
  "type": "PAYMENT_VERIFICATION_UPDATE"
}
```

### ICA Settlement Webhook Payload
```json
{
  "data": {
    "cf_ica_settlement_id": 12,
    "collection_amount_inr": 604854.0,
    "settlement_amount_inr": 243651.95,
    "settlement_foreign_currency_details": {
      "settlement_amount_fcy": null,
      "settlement_currency": "USD",
      "settlement_forex_rate": null
    },
    "status": "NOT_INITIATED"
  },
  "event_time": "2024-10-03T13:27:36+05:30",
  "type": "ICA_SETTLEMENT_UPDATE"
}
```

## Key APIs Summary
| API | Endpoint | Purpose |
|-----|----------|---------|
| Create Order | `POST /pg/orders` | Create payment order |
| Order Pay | `POST /pg/orders/{order_id}/pay` | Process payment |
| Get Payment | `GET /pg/orders/{order_id}/payments/{cf_payment_id}` | Verify payment status |
| Upload Verification | `POST /import/transactions/{cf_payment_id}/details` | Upload compliance docs |
| Get Verification | `GET /import/transactions/{cf_payment_id}` | Check verification status |
| Get Settlement | `GET /import/settlements` | Get settlement details |

## Important Notes
- Always verify webhook signatures before processing
- Upload verification documents promptly after successful payments
- Settlement happens in foreign currency to overseas bank account
- Settlements can be as fast as T+2 days

---

This skills file covers the Cross Border - Collect from India integration based on the [Overview](/payments/international-payments/collect-from-india/overview) and [Webhooks](/api-reference/payments/latest/international-payments/collect-from-india/import-webhooks) documentation.

```suggestions
(Collect from India Overview)[/payments/international-payments/collect-from-india/overview]
(Import Webhooks)[/api-reference/payments/latest/international-payments/collect-from-india/import-webhooks]
(API Overview)[/api-reference/payments/latest/international-payments/collect-from-india/overview]
```