---
name: Cashfree Payouts
description: Use this to see Payouts documentation and API references
---

# Cashfree Payouts Integration

## Overview
Cashfree Payouts enables instant fund transfers to bank accounts, UPI IDs, cards, and wallets. This is a **backend-only integration** - no frontend SDK is required.

---

## Environment Configuration

```
# Environment URLs
PRODUCTION_URL_V2=https://api.cashfree.com/payout
SANDBOX_URL_V2=https://sandbox.cashfree.com/payout
PRODUCTION_URL_V1=https://payout-api.cashfree.com
SANDBOX_URL_V1=https://payout-gamma.cashfree.com

# Required Headers
x-client-id: <YOUR_CLIENT_ID>
x-client-secret: <YOUR_CLIENT_SECRET>
x-api-version: 2024-01-01
```

---

## Authentication

### V1 API (Bearer Token)
Call `/payout/v1/authorize` to get a Bearer token (valid for 6 minutes):

```bash
curl -X POST 'https://payout-api.cashfree.com/payout/v1/authorize' \
  -H 'X-Client-Id: <CLIENT_ID>' \
  -H 'X-Client-Secret: <CLIENT_SECRET>'
```

**Response:**
```json
{
  "status": "SUCCESS",
  "message": "Token generated",
  "subCode": "200",
  "data": { "token": "eyJ0eXA...fWStg", "expiry": 1564130052 }
}
```

### V2 API (Direct Authentication)
Use `x-client-id` and `x-client-secret` headers directly - no token needed.

### 2FA Requirements
- **IP Whitelisting**: Whitelist up to 25 IPv4 addresses in Dashboard > Developers > Two-Factor Authentication
- **Public Key Signature**: If no static IP, generate signature using RSA encryption with `X-Cf-Signature` header

---

## Backend API Integration

### 1. Create Beneficiary (V2)

```bash
curl -X POST 'https://sandbox.cashfree.com/payout/beneficiary' \
  -H 'x-client-id: <CLIENT_ID>' \
  -H 'x-client-secret: <CLIENT_SECRET>' \
  -H 'x-api-version: 2024-01-01' \
  -H 'Content-Type: application/json' \
  -d '{
    "beneficiary_id": "JOHN18011343",
    "beneficiary_name": "John Doe",
    "beneficiary_instrument_details": {
      "bank_account_number": "00111122233",
      "bank_ifsc": "HDFC0000001",
      "vpa": "test@upi"
    },
    "beneficiary_contact_details": {
      "beneficiary_email": "johndoe@cashfree.com",
      "beneficiary_phone": "9876543210",
      "beneficiary_address": "177A Bleecker Street",
      "beneficiary_city": "Bangalore",
      "beneficiary_state": "Karnataka",
      "beneficiary_postal_code": "560001"
    }
  }'
```

### 2. Standard Transfer (V2)

```bash
curl -X POST 'https://sandbox.cashfree.com/payout/transfers' \
  -H 'x-client-id: <CLIENT_ID>' \
  -H 'x-client-secret: <CLIENT_SECRET>' \
  -H 'x-api-version: 2024-01-01' \
  -H 'Content-Type: application/json' \
  -d '{
    "beneficiary_id": "JOHN18011343",
    "amount": 100.00,
    "transfer_id": "TRANSFER_001",
    "transfer_mode": "banktransfer",
    "remarks": "Payout for order"
  }'
```

**Transfer Modes:** `banktransfer`, `upi`, `imps`, `neft`, `rtgs`, `paytm`, `amazonpay`

### 3. Direct Transfer (Without Pre-added Beneficiary)

```bash
curl -X POST 'https://payout-api.cashfree.com/payout/v1/directTransfer' \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
    "amount": 100,
    "transferId": "DIRECT_001",
    "transferMode": "banktransfer",
    "beneDetails": {
      "bankAccount": "00111122233",
      "ifsc": "HDFC0000001",
      "name": "John Doe",
      "phone": "9876543210",
      "email": "johndoe@cashfree.com",
      "address1": "Bangalore"
    }
  }'
```

### 4. Batch Transfer (V2)

```bash
curl -X POST 'https://sandbox.cashfree.com/payout/transfers/batch' \
  -H 'x-client-id: <CLIENT_ID>' \
  -H 'x-client-secret: <CLIENT_SECRET>' \
  -H 'x-api-version: 2024-01-01' \
  -H 'Content-Type: application/json' \
  -d '{
    "batch_transfer_id": "BATCH_001",
    "batch_format": "BANK_ACCOUNT",
    "delete_bene": 1,
    "batch": [
      {
        "transfer_id": "TXN_001",
        "amount": 100,
        "phone": "9876543210",
        "bank_account": "00111122233",
        "ifsc": "HDFC0000001",
        "email": "user1@email.com",
        "name": "User One"
      }
    ]
  }'
```

### 5. Get Transfer Status (V2)

```bash
curl -X GET 'https://sandbox.cashfree.com/payout/transfers/<transfer_id>' \
  -H 'x-client-id: <CLIENT_ID>' \
  -H 'x-client-secret: <CLIENT_SECRET>' \
  -H 'x-api-version: 2024-01-01'
```

### 6. Get Balance

```bash
curl -X GET 'https://payout-api.cashfree.com/payout/v1/getBalance' \
  -H 'Authorization: Bearer <TOKEN>'
```

---

## Webhook Integration

### Configure Webhooks
Dashboard > Payouts > Developers > Webhooks

### Webhook Events

| Event | Description |
|-------|-------------|
| `TRANSFER_SUCCESS` | Transfer completed, account debited |
| `TRANSFER_FAILED` | Transfer attempt failed |
| `TRANSFER_REVERSED` | Bank reversed the transfer |
| `TRANSFER_ACKNOWLEDGED` | Bank confirmed credit to beneficiary |
| `TRANSFER_REJECTED` | Cashfree rejected the transfer |
| `LOW_BALANCE_ALERT` | Account balance below threshold |
| `CREDIT_CONFIRMATION` | Balance credited to account |
| `BENEFICIARY_INCIDENT` | Service disruption for beneficiary bank |

### Sample Webhook Payload

```json
{
  "event": "TRANSFER_SUCCESS",
  "transferId": "TRANSFER_001",
  "referenceId": "123456",
  "utr": "P16111765023806",
  "acknowledged": 1,
  "eventTime": "2024-01-15T10:30:00Z",
  "signature": "base64_encoded_signature"
}
```

### Webhook Signature Verification

Verify using HMAC-SHA256 with your client secret:

```javascript
// Node.js
const crypto = require("crypto");

function verifyWebhook(req) {
  const timestamp = req.headers["x-webhook-timestamp"];
  const rawBody = req.rawBody; // Must use raw body, not parsed JSON
  const secretKey = "<client-secret>";
  
  const signStr = timestamp + rawBody;
  const computedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(signStr)
    .digest("base64");
  
  return computedSignature === req.headers["x-webhook-signature"];
}
```

```python
# Python
import base64
import hashlib
import hmac

def verify_webhook(request):
    raw_body = request.data.decode('utf-8')
    timestamp = request.headers['x-webhook-timestamp']
    signature = request.headers['x-webhook-signature']
    
    sign_data = timestamp + raw_body
    message = bytes(sign_data, 'utf-8')
    secret = bytes("<client-secret>", 'utf-8')
    
    computed = base64.b64encode(
        hmac.new(secret, message, digestmod=hashlib.sha256).digest()
    ).decode("utf-8")
    
    return computed == signature
```

```java
// Java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

public String verifySignature(HttpServletRequest request) throws Exception {
    String payload = request.getReader().lines().collect(Collectors.joining());
    String timestamp = request.getHeader("x-webhook-timestamp");
    String data = timestamp + payload;
    
    Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
    SecretKeySpec secretKey = new SecretKeySpec(
        "<client-secret>".getBytes(), "HmacSHA256"
    );
    sha256_HMAC.init(secretKey);
    
    return Base64.getEncoder().encodeToString(
        sha256_HMAC.doFinal(data.getBytes())
    );
}
```

### IPs to Whitelist (for receiving webhooks)

**Sandbox:** `52.66.25.127`, `15.206.45.168`  
**Production:** `52.66.101.190`, `3.109.102.144`, `18.60.134.245`, `18.60.183.142`  
**Port:** `443` (HTTPS)

---

## Transfer Status Codes

| Status | Description |
|--------|-------------|
| `SUCCESS` | Transfer completed |
| `PENDING` | Awaiting bank confirmation |
| `FAILED` | Transfer failed |
| `REVERSED` | Bank reversed the transfer |
| `REJECTED` | Rejected by Cashfree |

---

## Error Handling

| Code | Message | Action |
|------|---------|--------|
| 403 | IP not whitelisted | Whitelist IP in dashboard |
| 403 | Token is not valid | Regenerate auth token |
| 404 | Beneficiary does not exist | Add beneficiary first |
| 409 | Transfer Id already exists | Use unique transfer ID |
| 412 | Not enough available balance | Add funds to account |
| 422 | Invalid IFSC code | Verify bank details |

---

## Sample Integration Kits

- **Node.js**: https://github.com/cashfree/cashfree-payout-node
- **Python**: https://github.com/cashfree/cashfree-payout-python
- **Java**: https://github.com/cashfree/cashfree-payout-java
- **PHP**: https://github.com/cashfree/cashfree-payout-php

---

## Best Practices

1. Always verify webhook signatures before processing
2. Implement idempotency - webhooks may be delivered multiple times
3. Use unique `transfer_id` for each transaction
4. Store `reference_id` and `utr` for reconciliation
5. Handle `PENDING` status with polling or webhooks
6. Keep API credentials secure - never expose in frontend code

---

This skills file was created based on the Cashfree Payouts documentation. For more details, see:

```suggestions
(Payouts API Overview)[/api-reference/payouts/overview]
(Webhooks V2)[/api-reference/payouts/v2/webhooks/webhooks-v2]
(Standard Transfer Integration)[/payouts/payouts/integrations/standard-transfer]
```