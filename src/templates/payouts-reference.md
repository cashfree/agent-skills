---
name: Cashfree Payouts - Reference
description: >
  Reference material for the Payouts skill. Read this when you need:
  2FA RSA signature generation, V1 legacy APIs, batch transfer details, key status codes,
  all webhook payloads (V2 and V1), or Python webhook signature verification.
  Always read payouts/SKILL.md first for the core integration flow.
---

# Cashfree Payouts — Reference

> This document is in `references/` — file name `REFERENCE.md`. Read `../SKILL.md` first for setup and core workflow.

---

## 1. Two-Factor Authentication — RSA Signature (Dynamic IP)

If you don't have a static IP, encrypt `clientId.timestamp` with your RSA public key and pass it as `X-Cf-Signature`.

**PHP:**
```php
public static function getSignature() {
    $clientId = "<your clientId here>";
    $publicKey = openssl_pkey_get_public(file_get_contents("/path/to/public_key.pem"));
    $encodedData = $clientId . "." . strtotime("now");
    openssl_public_encrypt($encodedData, $encrypted, $publicKey, OPENSSL_PKCS1_OAEP_PADDING);
    return base64_encode($encrypted);
}
```

**Java:**
```java
private static String generateEncryptedSignature(String clientIdWithEpochTimestamp) {
    byte[] keyBytes = Files.readAllBytes(new File("/path/to/public_key.pem").toPath());
    String publicKeyContent = new String(keyBytes)
        .replaceAll("[\\t\\n\\r]", "")
        .replace("-----BEGIN PUBLIC KEY-----", "")
        .replace("-----END PUBLIC KEY-----", "");
    KeyFactory kf = KeyFactory.getInstance("RSA");
    X509EncodedKeySpec keySpecX509 = new X509EncodedKeySpec(Base64.getDecoder().decode(publicKeyContent));
    RSAPublicKey pubKey = (RSAPublicKey) kf.generatePublic(keySpecX509);
    final Cipher cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-1AndMGF1Padding");
    cipher.init(Cipher.ENCRYPT_MODE, pubKey);
    return Base64.getEncoder().encodeToString(cipher.doFinal(clientIdWithEpochTimestamp.getBytes()));
}
```

**Node.js:**
```javascript
const { Payouts } = require("cashfree-sdk");

const payoutsInstance = new Payouts({
    env: "TEST",
    clientId: "<CLIENT_ID>",
    clientSecret: "<CLIENT_SECRET>",
    pathToPublicKey: "/path/to/your/public/key/file.pem",
});
```

**Python:**
```python
from cashfree_sdk.payouts import Payouts
Payouts.init("<client_id>", "<client_secret>", "PROD", public_key=b'public key')
```

---

## 2. V1 API Authentication (Legacy)

Call `/payout/v1/authorize` to get a Bearer token (valid for **6 minutes**):

```bash
curl -X POST 'https://payout-api.cashfree.com/payout/v1/authorize' \
  -H 'X-Client-Id: <CLIENT_ID>' \
  -H 'X-Client-Secret: <CLIENT_SECRET>'
```

Response: `{ "data": { "token": "eyJ0eXA...", "expiry": 1564130052 } }`

Use in subsequent V1 requests: `Authorization: Bearer <token>`

V1 base URLs: Production `https://payout-api.cashfree.com` | Sandbox `https://payout-gamma.cashfree.com`

---

## 3. Beneficiary Error Codes

| HTTP Status | Error Code | Description |
|---|---|---|
| 201 | — | Beneficiary created successfully |
| 400 | `beneficiary_id_invalid` | Invalid characters in beneficiary_id |
| 400 | `bank_ifsc_invalid` | Invalid IFSC code |
| 400 | `bank_account_number_invalid` | Non-alphanumeric account number |
| 409 | `beneficiary_id_already_exists` | Duplicate beneficiary_id |
| 409 | `beneficiary_already_exists` | Duplicate bank_account + IFSC combination |
| 422 | `bank_account_number_same_as_source` | Account matches source account |
| 422 | `vba_beneficiary_not_allowed` | Virtual bank account not allowed |

---

## 4. Batch Transfer (V2)

Transfer money to multiple beneficiaries in a single API call.

| Format | Description |
|---|---|
| `BENEFICIARY_ID` | Use pre-added beneficiary IDs |
| `BANK_ACCOUNT` | Pass bank account details directly |

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
      },
      {
        "transfer_id": "TXN_002",
        "amount": 200,
        "phone": "9876543211",
        "bank_account": "00111122234",
        "ifsc": "ICIC0000009",
        "email": "user2@email.com",
        "name": "User Two"
      }
    ]
  }'
```

**When you receive a 5XX response, do NOT initiate another transaction.** Check status using Get Batch Transfer Status first.

**Get Batch Transfer Status:** `GET /payout/transfers/batch/<batch_transfer_id>`

---

## 5. V1 Legacy APIs

### Direct Transfer (V1)

Transfer directly without pre-adding a beneficiary. **This API will be retired soon — migrate to Transfers V2.**

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

### Card Payout (V1)

```bash
curl -X POST 'https://payout-api.cashfree.com/payout/v1/cardPay' \
  -H 'Authorization: Bearer <TOKEN>' \
  -H 'Content-Type: application/json' \
  -d '{
    "amount": 100,
    "transferId": "CARD_001",
    "token": "4895379990484220",
    "name": "John Doe",
    "cardType": "credit",
    "networkType": "visa"
  }'
```

### Get Balance (V1)

```bash
curl -X GET 'https://payout-api.cashfree.com/payout/v1/getBalance' \
  -H 'Authorization: Bearer <TOKEN>'
```

---

## 6. Key Status Codes

| Status Code | Description |
|---|---|
| `SENT_TO_BANK` | Sent to partner bank, awaiting confirmation |
| `COMPLETED` | Funds credited to end beneficiary (acknowledged) |
| `SENT_TO_BENEFICIARY` | Debited from source, waiting for beneficiary bank credit |
| `IMPS_MODE_FAIL` | Beneficiary doesn't support IMPS — try NEFT |
| `BENE_BANK_DECLINED` | Beneficiary bank declined |
| `INSUFFICIENT_BALANCE` | Low balance in Cashfree Wallet/Bank Account |
| `INVALID_BENE_ACCOUNT_OR_IFSC` | Invalid account or IFSC |
| `INVALID_BENE_VPA` | Invalid UPI VPA |
| `ACCOUNT_BLOCKED` | Beneficiary account is blocked |
| `BENE_BLACKLISTED` | Beneficiary blacklisted by Risk team |
| `VELOCITY_CHECK_FAILED` | Transfer count/amount breached limits |
| `SCHEDULED_FOR_NEXT_WORKINGDAY` | NEFT/RTGS scheduled for next working day |

**Acknowledged parameter:**
- `acknowledged = 1`: Beneficiary bank confirmed credit to end user
- `acknowledged = 0`: Only debit successful, credit pending — wait for `TRANSFER_ACKNOWLEDGED` webhook

---

## 7. V2 Webhook Payloads

**TRANSFER_ACKNOWLEDGED:**
```json
{
  "data": {
    "transfer_id": "JUNOB2018",
    "cf_transfer_id": "123456",
    "status": "SUCCESS",
    "status_code": "COMPLETED",
    "beneficiary_details": {
      "beneficiary_id": "JOHN18011",
      "beneficiary_instrument_details": {
        "bank_account_number": "7766671501729",
        "bank_ifsc": "SBIN0000003"
      }
    },
    "transfer_amount": 1,
    "transfer_service_charge": 1,
    "transfer_service_tax": 0.18,
    "transfer_mode": "BANK",
    "transfer_utr": "TESTR92023012200543116",
    "fundsource_id": "CASHFREE_1"
  },
  "event_time": "2024-07-25T17:43:37",
  "type": "TRANSFER_ACKNOWLEDGED"
}
```

**TRANSFER_SUCCESS:**
```json
{
  "data": {
    "transfer_id": "JUNOB2018",
    "cf_transfer_id": "123456",
    "status": "SUCCESS",
    "status_code": "SENT_TO_BENEFICIARY",
    "beneficiary_details": { "beneficiary_id": "JOHN18011" },
    "transfer_amount": 1,
    "transfer_mode": "BANK",
    "transfer_utr": "TESTR92023012200543116"
  },
  "event_time": "2024-07-25T17:43:37",
  "type": "TRANSFER_SUCCESS"
}
```

**TRANSFER_FAILED:**
```json
{
  "data": {
    "transfer_id": "JUNOB2018",
    "status": "FAILED",
    "status_code": "IMPS_MODE_FAIL",
    "status_description": "The beneficiary account does not support IMPS transfers.",
    "transfer_amount": 1,
    "transfer_mode": "BANK"
  },
  "event_time": "2024-07-25T17:43:37",
  "type": "TRANSFER_FAILED"
}
```

**TRANSFER_REVERSED:**
```json
{
  "data": {
    "transfer_id": "JUNOB2018",
    "status": "REVERSED",
    "status_code": "INVALID_ACCOUNT_FAIL",
    "transfer_amount": 1,
    "transfer_mode": "BANK"
  },
  "event_time": "2024-07-25T17:43:37",
  "type": "TRANSFER_REVERSED"
}
```

**TRANSFER_REJECTED:**
```json
{
  "data": {
    "transfer_id": "JUNOB2018",
    "status": "REJECTED",
    "status_code": "INVALID_MODE_FOR_PYID",
    "transfer_amount": 1,
    "transfer_mode": "BANK"
  },
  "event_time": "2024-07-25T17:43:37",
  "type": "TRANSFER_REJECTED"
}
```

**BULK_TRANSFER_REJECTED:**
```json
{
  "data": {
    "batch_transfer_id": "test_batch_transfer_id",
    "cf_batch_transfer_id": "123456",
    "status": "REJECTED"
  },
  "event_time": "2024-07-25T17:43:37",
  "type": "BULK_TRANSFER_REJECTED"
}
```

---

## 8. V1 Webhook Payloads (Legacy)

**TRANSFER_SUCCESS (V1):**
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

**TRANSFER_FAILED (V1):**
```json
{
  "event": "TRANSFER_FAILED",
  "transferId": "TRANSFER_001",
  "referenceId": "123456",
  "reason": "Beneficiary bank declined",
  "signature": "base64_encoded_signature"
}
```

**TRANSFER_REVERSED (V1):**
```json
{
  "event": "TRANSFER_REVERSED",
  "transferId": "TRANSFER_001",
  "reason": "Invalid account",
  "signature": "base64_encoded_signature"
}
```

**CREDIT_CONFIRMATION (V1):**
```json
{
  "event": "CREDIT_CONFIRMATION",
  "ledgerBalance": 50000,
  "amount": 10000,
  "utr": "UTR123456",
  "signature": "base64_encoded_signature"
}
```

**LOW_BALANCE_ALERT (V1):**
```json
{
  "event": "LOW_BALANCE_ALERT",
  "currentBalance": 500,
  "alertTime": "2024-01-15T10:30:00Z",
  "signature": "base64_encoded_signature"
}
```

---

## 9. Webhook Signature Verification — Python

```python
import base64, hashlib, hmac

def verify_payout_webhook(request):
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
