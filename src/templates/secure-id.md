---
name: Cashfree Secure ID — Identity Verification & KYC
description: >
  Use when integrating Cashfree Secure ID for identity verification, KYC, document authentication, and fraud prevention.
  Triggers: Cashfree Secure ID, identity verification, KYC verification, PAN verification, Aadhaar verification,
  bank account verification, BAV, GSTIN verification, DigiLocker, Video KYC, face match, face liveness,
  name match, Smart OCR, e-sign, reverse penny drop, UPI penny drop, mobile penny drop, IFSC verification,
  driving licence verification, passport verification, voter ID verification, CIN verification, vehicle RC,
  Aadhaar masking, KYC link, 1-click onboarding, Mobile 360, account aggregator, geocoding, reverse geocoding,
  IP verification, Udyam verification, PAN 360, PAN Lite, bulk PAN verification, bulk BAV, webhook signature
  verification Secure ID, Cashfree verification API, verification SDK, advanced employment, PAN to GSTIN,
  PAN to Udyam, static KYC link, face spoofing detection, document OCR, biometric verification.
---

# Cashfree Secure ID — Identity Verification & KYC

> **References available:** This SKILL.md covers setup, authentication, and the most common verification APIs. For all 42 API endpoints, complete webhook payloads, BAV/name match status codes, Video KYC SDK, 1-Click Onboarding, DigiLocker React Native SDK, and advanced services — read `references/REFERENCE.md` in this directory.

---

## 1. Overview

Cashfree Secure ID is a comprehensive identity verification and fraud prevention suite. RESTful APIs for real-time identity verification, document authentication, biometric checks, and digital onboarding — all with sub-second response times.

**This is primarily a backend integration** — API calls should be routed through your server. Frontend SDKs are available for DigiLocker (React Native), Video KYC (Web, Android, iOS), and 1-Click Onboarding (Web, Android, iOS).

**Product Categories:**
1. **Core Banking Services**: Bank Account Verification (Sync/Async/Bulk), IFSC, Reverse Penny Drop, UPI Penny Drop, Mobile Penny Drop
2. **Identity Verification**: PAN (Verify/Lite/360/Bulk), Aadhaar (via DigiLocker), Driving Licence, Passport, Voter ID
3. **Business Verification (KYB)**: GSTIN, CIN, Udyam, PAN to GSTIN, PAN to Udyam
4. **OCR & Biometric**: Smart OCR, Face Liveness, Face Match, Name Match, Aadhaar Masking
5. **Digital Onboarding**: KYC Links, 1-Click Onboarding, DigiLocker, E-Sign, Video KYC
6. **Advanced Services**: Mobile 360, Advanced Employment, Account Aggregator, Geocoding, Reverse Geocoding, IP Verification

---

## 2. Environment Configuration

| Environment | Base URL |
|---|---|
| Production | `https://api.cashfree.com/verification` |
| Sandbox | `https://sandbox.cashfree.com/verification` |

### Required Headers

```
X-Client-Id: <YOUR_CLIENT_ID>
X-Client-Secret: <YOUR_CLIENT_SECRET>
Content-Type: application/json
```

### Optional Headers

```
X-Cf-Signature: <RSA_ENCRYPTED_SIGNATURE>  (required if 2FA with public key is enabled)
```

---

## 3. Authentication

### Direct Authentication

Use `X-Client-Id` and `X-Client-Secret` headers directly with every API request.

```bash
curl -X POST 'https://sandbox.cashfree.com/verification/pan' \
  -H 'X-Client-Id: <CLIENT_ID>' \
  -H 'X-Client-Secret: <CLIENT_SECRET>' \
  -H 'Content-Type: application/json' \
  -d '{ "pan": "ABCPV1234D" }'
```

### Generate API Keys

1. Log in to your **Secure ID Dashboard** → click **Developers**
2. Click **API Keys** → **Generate API Keys**
3. Download and securely store the keys

- Maximum of **10 API keys** can be generated
- Production keys require **OTP authentication**
- **Never share keys** — they are confidential

---

## 4. Two-Factor Authentication (2FA)

### Option 1: IP Whitelisting

1. **Secure ID Dashboard** → **Developers** → **Two-Factor Authentication**
2. Choose **IP Whitelist** from the dropdown
3. Click **Add IP Address** and enter your IPv4 address

- Only **IPv4** is supported (not IPv6)
- Whitelist up to **25 IP addresses**
- Only the **production** environment requires IP whitelisting

### Option 2: Public Key Signature (Dynamic IP)

Encrypt `clientId.timestamp` using RSA with the public key downloaded from Dashboard. Pass in `X-Cf-Signature` header. Signature is valid for **5 minutes**.

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

> For Java RSA signature code — see `references/REFERENCE.md`.

---

## 5. Core API Examples

### Bank Account Verification — Sync

**Endpoint:** `POST /bank-account/sync`

Real-time validation. Returns instant results.

```bash
curl -X POST 'https://sandbox.cashfree.com/verification/bank-account/sync' \
  -H 'X-Client-Id: <CLIENT_ID>' \
  -H 'X-Client-Secret: <CLIENT_SECRET>' \
  -H 'Content-Type: application/json' \
  -d '{
    "bank_account": "026291800001191",
    "ifsc": "YESB0000262",
    "name": "John Doe",
    "phone": "9999999999"
  }'
```

> Cashfree does not support verification of Deutsche Bank and Paytm Payments Bank accounts. IMPS verifies only the first 5 characters of the IFSC code.

### PAN Verification

**Endpoint:** `POST /pan`

Check PAN existence. Returns registered name and PAN type.

```bash
curl -X POST 'https://sandbox.cashfree.com/verification/pan' \
  -H 'X-Client-Id: <CLIENT_ID>' \
  -H 'X-Client-Secret: <CLIENT_SECRET>' \
  -H 'Content-Type: application/json' \
  -d '{
    "pan": "ABCPV1234D",
    "name": "John Doe",
    "verification_id": "PAN_001"
  }'
```

> The name returned may differ from the physical PAN card — it returns the registered name from the Income Tax Department's records.

### GSTIN Verification

**Endpoint:** `POST /gstin`

Verify GSTIN and retrieve business registration details.

```bash
curl -X POST 'https://sandbox.cashfree.com/verification/gstin' \
  -H 'X-Client-Id: <CLIENT_ID>' \
  -H 'X-Client-Secret: <CLIENT_SECRET>' \
  -H 'Content-Type: application/json' \
  -d '{
    "GSTIN": "29AAICP2912R1ZR",
    "business_name": "Business Name",
    "verification_id": "GSTIN_001"
  }'
```

---

## 6. DigiLocker Integration Flow

1. **Verify Account** (`POST /digilocker/verify-account`) — Check if Aadhaar/mobile is linked with DigiLocker
2. **Create URL** (`POST /digilocker/url`) — Generate time-sensitive consent URL (valid **10 minutes**)
3. **Redirect** — User logs in with Aadhaar/mobile, enters OTP, approves consent
4. **Get Status** (`GET /digilocker/status`) — Check verification status
5. **Get Document** (`GET /digilocker/document`) — Fetch verified documents (Aadhaar, PAN, DL)

> DigiLocker flow in Sandbox requires **real Aadhaar numbers** — mock details are not supported.

---

## 7. Webhook Integration

### Configure

1. **Merchant Dashboard** → **Developers** → **Webhooks** (under the Secure ID card)
2. Click **Add Webhook URL**
3. Enter your HTTPS webhook endpoint
4. Click **Test & Add Webhook**

### Events by Service

| Service | Events |
|---|---|
| **Bank Account Verification** | `BANK_ACCOUNT_VERIFICATION_SUCCESS`, `BANK_ACCOUNT_VERIFICATION_REJECTED`, `BANK_ACCOUNT_VERIFICATION_FAILED` |
| **Reverse Penny Drop** | `RPD_BANK_ACCOUNT_VERIFICATION_SUCCESS`, `RPD_BANK_ACCOUNT_VERIFICATION_FAILURE`, `RPD_BANK_ACCOUNT_VERIFICATION_EXPIRED` |
| **DigiLocker** | `DIGILOCKER_VERIFICATION_SUCCESS`, `DIGILOCKER_VERIFICATION_LINK_EXPIRED`, `DIGILOCKER_VERIFICATION_CONSENT_DENIED`, `DIGILOCKER_VERIFICATION_FAILURE` |
| **E-Sign** | `E_SIGN_VERIFICATION_SUCCESS`, `E_SIGN_VERIFICATION_FAILURE`, `E_SIGN_VERIFICATION_EXPIRED` |
| **KYC Links** | `KYC_LINK_ACTION_PERFORMED`, `KYC_LINK_SUCCESS`, `KYC_LINK_EXPIRED` |
| **Video KYC** | `VKYC_USER_LINK_GENERATED`, `VKYC_USER_CALL_COMPLETED`, `VKYC_AUDITOR_REVIEW_COMPLETED` (and more) |
| **Account Aggregator** | `AA_CONSENT_VERIFICATION_SUCCESS`, `AA_CONSENT_VERIFICATION_REVOKED`, `AA_CONSENT_VERIFICATION_REJECTED`, `AA_CONSENT_VERIFICATION_EXPIRED` |

### Webhook Signature Verification

```javascript
// Node.js — HMAC-SHA256 signature verification
const crypto = require('crypto');

function verifySecureIdWebhook(req) {
  const rawBody = req.body.toString();
  const timestamp = req.headers['x-webhook-timestamp'];
  const signature = req.headers['x-webhook-signature'];

  const computed = crypto
    .createHmac('sha256', process.env.CASHFREE_CLIENT_SECRET)
    .update(timestamp + rawBody)
    .digest('base64');

  return computed === signature;
}
```

---

## 8. Security — Never Violate

- **Never call Secure ID APIs from frontend code.** Route through your backend only.
- **Never expose `X-Client-Secret`** in client-side code or version control.
- **Always verify webhook signatures** before processing.
- **Store credentials in environment variables**, never hardcoded.

> **Read `references/REFERENCE.md` for:** Java 2FA RSA code, all 42 API endpoints, BAV status codes/values/name match results, all webhook payloads, DigiLocker React Native SDK, Video KYC SDK (Web/Android/iOS), 1-Click Onboarding, and advanced services.
