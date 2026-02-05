---
name: Cashfree Subscriptions
description: Use this to see Subscriptions documentation and API references
---

# Cashfree Subscriptions Integration

## Overview
This skills file covers Cashfree Payments Subscriptions integration including backend APIs, frontend SDKs, and webhook handling for recurring payments.

## Backend Integration

### Step 1: Create a Plan
```bash
curl --request POST \
  --url https://sandbox.cashfree.com/pg/plans \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-01-01' \
  --header 'x-client-id: YOUR_CLIENT_ID' \
  --header 'x-client-secret: YOUR_CLIENT_SECRET' \
  --data '{
    "plan_id": "plan_premium",
    "plan_name": "Premium Plan",
    "plan_type": "PERIODIC",
    "plan_currency": "INR",
    "plan_max_amount": 1000,
    "plan_recurring_amount": 100,
    "plan_intervals": 1,
    "plan_interval_type": "MONTH"
  }'
```

### Step 2: Create a Subscription
```bash
curl --request POST \
  --url https://sandbox.cashfree.com/pg/subscriptions \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-01-01' \
  --header 'x-client-id: YOUR_CLIENT_ID' \
  --header 'x-client-secret: YOUR_CLIENT_SECRET' \
  --data '{
    "subscription_id": "sub_unique_id",
    "customer_details": {
      "customer_name": "John Doe",
      "customer_email": "john@example.com",
      "customer_phone": "9999999999"
    },
    "plan_details": {
      "plan_id": "plan_premium"
    },
    "authorization_details": {
      "authorization_amount": 1,
      "authorization_amount_refund": true
    },
    "subscription_meta": {
      "return_url": "https://yoursite.com/return",
      "notification_channel": ["EMAIL", "SMS"]
    },
    "subscription_expiry_time": "2028-12-24T14:15:22Z"
  }'
```

### Step 3: Get Subscription Status
```bash
curl --request GET \
  --url https://sandbox.cashfree.com/pg/subscriptions/{subscription_id} \
  --header 'x-api-version: 2025-01-01' \
  --header 'x-client-id: YOUR_CLIENT_ID' \
  --header 'x-client-secret: YOUR_CLIENT_SECRET'
```

### Step 4: Raise a Charge
```bash
curl --request POST \
  --url https://sandbox.cashfree.com/pg/subscriptions/pay \
  --header 'accept: application/json' \
  --header 'content-type: application/json' \
  --header 'x-api-version: 2025-01-01' \
  --header 'x-client-id: YOUR_CLIENT_ID' \
  --header 'x-client-secret: YOUR_CLIENT_SECRET' \
  --data '{
    "subscription_id": "sub_unique_id",
    "payment_id": "payment_001",
    "payment_type": "CHARGE",
    "payment_amount": 100,
    "payment_schedule_date": "2024-11-30T14:15:22Z"
  }'
```

## Frontend Integration (JavaScript)

### Initiate Subscription Checkout
```javascript
const cashfree = Cashfree({
  mode: "sandbox" // or "production"
});

document.getElementById("payButton").addEventListener("click", function() {
  cashfree.subscriptionsCheckout({
    subsSessionId: "subscription_session_id_from_backend",
    redirectTarget: "_blank"
  }).then(function(result) {
    if (result.error) {
      console.error(result.error.message);
    }
  });
});
```

## Webhook Handling

### Webhook Events
- `SUBSCRIPTION_STATUS_CHANGE` - Subscription status updates (ACTIVE, ON_HOLD, COMPLETED, etc.)
- `SUBSCRIPTION_AUTH_STATUS` - Authorization completion (success/failed)
- `SUBSCRIPTION_PAYMENT_SUCCESS` - Successful recurring payment
- `SUBSCRIPTION_PAYMENT_FAILED` - Failed payment
- `SUBSCRIPTION_PAYMENT_CANCELLED` - Cancelled payment
- `SUBSCRIPTION_REFUND_STATUS` - Refund status updates

### Sample Webhook Payload (SUBSCRIPTION_PAYMENT_SUCCESS)
```json
{
  "data": {
    "payment_id": "12345",
    "cf_payment_id": "67890",
    "subscription_id": "sub12345",
    "cf_subscription_id": "sub67890",
    "payment_amount": 200,
    "payment_status": "SUCCESS",
    "authorization_details": {
      "authorization_status": "ACTIVE",
      "payment_method": "upi"
    }
  },
  "event_time": "2024-07-20T11:16:10+05:30",
  "type": "SUBSCRIPTION_PAYMENT_SUCCESS"
}
```

### Webhook Signature Verification
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(timestamp, rawBody, signature, secretKey) {
  const signedPayload = timestamp + rawBody;
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(signedPayload)
    .digest('base64');
  
  return expectedSignature === signature;
}

// Usage in Express.js
app.post('/webhook', express.raw({type: 'application/json'}), (req, res) => {
  const timestamp = req.headers['x-webhook-timestamp'];
  const signature = req.headers['x-webhook-signature'];
  
  if (verifyWebhookSignature(timestamp, req.body.toString(), signature, CLIENT_SECRET)) {
    const event = JSON.parse(req.body);
    // Process webhook based on event.type
    res.status(200).send('OK');
  } else {
    res.status(401).send('Invalid signature');
  }
});
```

## Subscription Lifecycle States
- **INITIALISED** - Created, awaiting customer authorisation
- **BANK_APPROVAL_PENDING** - Customer authorised, bank confirmation pending
- **ACTIVE** - Ready for payment collection
- **ON_HOLD** - Paused due to failed payment
- **PAUSED** - Merchant paused the subscription
- **COMPLETED** - Subscription cycle completed
- **CANCELLED** - Merchant cancelled
- **CUSTOMER_CANCELLED** - Customer cancelled at bank

## Environment URLs
- **Sandbox**: `https://sandbox.cashfree.com`
- **Production**: `https://api.cashfree.com`

---

This covers the complete integration flow from the [Cashfree Hosted Checkout](/payments/subscription/hosted-checkout), [Subscription Webhooks](/api-reference/payments/previous/v2023-08-01/subscription/webhooks), and [Create Subscription](/payments/subscription/create) documentation pages.

```suggestions
(Subscription Introduction)[/payments/subscription/introduction]
(Cashfree Hosted Checkout)[/payments/subscription/hosted-checkout]
(Subscription Webhooks)[/api-reference/payments/previous/v2023-08-01/subscription/webhooks]
```