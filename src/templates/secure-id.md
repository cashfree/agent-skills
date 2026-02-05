---
name: Cashfree Secure ID
description: Use this to see Secure ID documentation and API references
---

# Cashfree Secure ID Integration

```markdown
# Cashfree Secure ID Integration Skills

## Overview
Cashfree Secure ID is a comprehensive identity verification and fraud prevention suite for the Indian market. It includes bank verification, PAN, GSTIN, Aadhaar, DigiLocker, Video KYC, and biometric verification.

## API Endpoints
- **Production**: https://api.cashfree.com/verification
- **Sandbox**: https://sandbox.cashfree.com/verification

## Authentication
All API requests require headers:
- `X-Client-Id`: Your client ID from Merchant Dashboard
- `X-Client-Secret`: Your secret key from Merchant Dashboard
- `X-Cf-Signature` (optional): Required if 2FA with public key is enabled

## Backend Integration

### 1. Bank Account Verification (Sync)
POST /bank-account/sync
```json
{
  "bank_account": "026291800001191",
  "ifsc": "YESB0000262",
  "name": "John Doe",
  "phone": "9999999999"
}
```

### 2. PAN Verification
POST /pan
```json
{
  "pan": "ABCPV1234D",
  "name": "John Doe"
}
```

### 3. GSTIN Verification
POST /gstin
```json
{
  "GSTIN": "29AAICP2912R1ZR",
  "business_name": "Business Name"
}
```

### 4. Name Match
POST /name-match
```json
{
  "verification_id": "ABC00123",
  "name_1": "JOHN DOE",
  "name_2": "JOHN DOE"
}
```

### 5. Face Match
POST /face-match (multipart/form-data)
- verification_id: string
- first_image: file
- second_image: file
- threshold: "0.75"

### 6. Generate KYC Link
POST /form
```json
{
  "name": "John Doe",
  "phone": "9999999999",
  "email": "test@cashfree.com",
  "template_name": "Aadhaar_verification",
  "link_expiry": "2025-06-01",
  "notification_types": ["sms"],
  "verification_id": "ABC00123"
}
```

## Webhook Configuration

### Setup
1. Log in to Merchant Dashboard > Developers > Webhooks (under Secure ID)
2. Add publicly accessible HTTPS webhook URL
3. Click "Test & Add Webhook"

### Webhook Events
- `KYC_LINK_ACTION_PERFORMED`: Verification performed via link
- `KYC_LINK_SUCCESS`: All verifications completed
- `KYC_LINK_EXPIRED`: Link expired
- `RPD_BANK_ACCOUNT_VERIFICATION_SUCCESS/FAILURE/EXPIRED`: Reverse penny drop events
- `E_SIGN_VERIFICATION_SUCCESS/FAILURE/EXPIRED`: E-sign events

### Webhook Signature Verification (MANDATORY)
Headers received:
- `x-webhook-signature`: HMAC-SHA256 signature
- `x-webhook-timestamp`: Unix timestamp

Verification process:
1. Concatenate: timestamp + rawBody
2. Generate HMAC-SHA256 with client secret
3. Base64 encode the hash
4. Compare with x-webhook-signature

### Node.js Signature Verification
```javascript
const crypto = require("crypto");

function verifyWebhookSignature(req) {
  const ts = req.headers["x-webhook-timestamp"];
  const rawBody = req.rawBody; // Must use raw body, not parsed JSON
  const secretKey = "<client-secret>";
  const signStr = ts + rawBody;
  const computed = crypto.createHmac("sha256", secretKey).update(signStr).digest("base64");
  return computed === req.headers["x-webhook-signature"];
}
```

### Python Signature Verification
```python
import base64, hashlib, hmac

def verify_signature(request):
    raw_body = request.data.decode('utf-8')
    timestamp = request.headers['x-webhook-timestamp']
    signature = request.headers['x-webhook-signature']
    
    sign_data = timestamp + raw_body
    computed = base64.b64encode(
        hmac.new(b"<client-secret>", sign_data.encode(), hashlib.sha256).digest()
    ).decode()
    return computed == signature
```

### IPs to Whitelist
Sandbox: 52.66.25.127, 15.206.45.168
Production: 52.66.101.190, 3.109.102.144, 18.60.134.245, 18.60.183.142
Port: 443 (HTTPS)

## Frontend Integration (DigiLocker React Native SDK)

### Installation
```bash
npm install @cashfreepayments/react-native-digilocker
# iOS: cd ios && pod install
```

### Setup
```jsx
import { DigiLockerProvider, useDigiLocker } from '@cashfreepayments/react-native-digilocker';

function App() {
  return (
    <DigiLockerProvider>
      {/* App content */}
    </DigiLockerProvider>
  );
}

// Usage
const { verify } = useDigiLocker();
verify(url, redirectUrl, {
  userFlow: 'signin',
  onSuccess: (data) => console.log(data),
  onError: (error) => console.error(error),
  onCancel: () => console.log('cancelled')
});
```

## Test Data (Sandbox Only)
- OTP for all requests: 111000
- Valid PAN: ABCPV1234D, AZJPG7110R
- Valid GSTIN: 29AAICP2912R1ZR
- Valid Bank Account: 026291800001191 (IFSC: YESB0000262)
- Valid Aadhaar: 655675523712

## Error Handling
All APIs return standard error structure:
```json
{
  "code": "error_code",
  "message": "Error description",
  "type": "validation_error"
}
```

Common HTTP status codes: 400 (validation), 401/403 (auth), 422 (unprocessable), 429 (rate limit), 500/502 (server)

## Rate Limits
- Standard APIs: 100 TPM
- Medium APIs (PAN Sync, DigiLocker): 200 TPM
- Bulk operations: 5 TPM

## Best Practices
1. Always verify webhook signatures before processing
2. Use raw request body for signature verification
3. Implement idempotency for webhook handlers (duplicates possible)
4. Route API calls through backend to avoid CORS errors
5. Store client secrets securely, never expose in frontend
6. Use oldest active client secret for webhook signature verification
```

This skills file covers the key Secure ID APIs, webhook setup, signature verification in multiple languages, frontend SDK integration, and test data. For more details, see:

```suggestions
(Getting Started with Secure ID)[/api-reference/vrs/getting-started]
(Webhook Signature Verification)[/api-reference/vrs/webhook-signature-verification]
(Test Data for Integration)[/api-reference/vrs/data-to-test-integration]
```