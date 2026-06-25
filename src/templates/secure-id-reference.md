---
name: Cashfree Secure ID - Reference
description: >
  Reference material for the Secure ID skill. Read this when you need:
  Java 2FA RSA signature, all 42 API endpoints, BAV status codes, name match results,
  complete webhook payloads, DigiLocker React Native SDK, Video KYC SDK, 1-Click Onboarding,
  or advanced services (Mobile 360, Account Aggregator, Geocoding).
  Always read secure-id/SKILL.md first for setup and common APIs.
---

# Cashfree Secure ID — Reference

> This document is in `references/` — file name `REFERENCE.md`. Read `../SKILL.md` first for setup, authentication, and core APIs.

---

## 1. 2FA — Java RSA Signature

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

---

## 2. BAV Status Values and Codes

### BAV Account Status Values

| Status | Description |
|---|---|
| `VALID` | Account successfully verified |
| `INVALID` | Account is invalid |
| `RECEIVED` | Request received, awaiting processing |
| `FAILED` | Transaction failed due to bank-side error |
| `REJECTED` | Transaction rejected |
| `PROCESSING` | Request being actively handled |
| `IN_PROCESS` | Validation actively ongoing |
| `CANCELLED` | Request terminated by user |
| `APPROVAL_PENDING` | Awaiting merchant approval |
| `PARTIALLY_APPROVED` | Some submitted data approved |
| `MANUALLY_REJECTED` | Explicitly reviewed and rejected |

### BAV Account Status Codes

| Status Code | Description |
|---|---|
| `ACCOUNT_IS_VALID` | Bank account successfully verified |
| `FRAUD_ACCOUNT` | Fraudulent activity detected — account and IFSC blocked |
| `FAILED_AT_BANK` | Transaction failed at bank's end |
| `NPCI_UNAVAILABLE` | NPCI service currently unavailable |
| `CONNECTION_TIMEOUT` | Timeout connecting to bank |
| `SOURCE_BANK_DECLINED` | Source bank declined the transaction |
| `BENE_BANK_DECLINED` | Beneficiary bank declined |
| `IMPS_MODE_FAIL` | Could not process through IMPS mode |
| `BENEFICIARY_BANK_OFFLINE` | Beneficiary bank offline |
| `INVALID_ACCOUNT_FAIL` | Invalid account details |
| `INVALID_IFSC_FAIL` | Invalid IFSC code |
| `NRE_ACCOUNT_FAIL` | NRE account not supported |
| `ACCOUNT_BLOCKED` | Account is blocked |
| `INSUFFICIENT_BALANCE` | Insufficient merchant balance |

### BAV Name Match Results

| Result | Description | Example Score |
|---|---|---|
| `DIRECT_MATCH` | Exact match | 100.00 |
| `GOOD_PARTIAL_MATCH` | Strong similarity, minor differences | 85.00 |
| `MODERATE_PARTIAL_MATCH` | Noticeable similarity, significant variations | 70.00 |
| `POOR_PARTIAL_MATCH` | Weak similarity | 38.00 |
| `NO_MATCH` | No recognisable similarity | 0.00 |

---

## 3. Name Match Score Results

**Endpoint:** `POST /name-match`

| Score | Reason | Example |
|---|---|---|
| 1.00 | `DIRECT_MATCH` | JOHN DOE vs JOHN DOE |
| 0.93 | `GOOD_PARTIAL_MATCH` | JOHN DOE vs JOHN DE |
| 0.77 | `MODERATE_PARTIAL_MATCH` | JOHN DOE vs JOHN |
| 0.53 | `POOR_PARTIAL_MATCH` | JOHN DOE vs J DO |
| 0.00 | `NO_MATCH` | JOHN DOE vs DO |

---

## 4. Additional API Reference

### Core Banking Services (cont.)

- **BAV Async (V2):** `POST /bank-account/async` — Async verification via webhook/polling
- **Bulk BAV (V2):** `POST /bank-account/bulk` — Up to 10,000 records
- **Get BAV Status (V2):** `GET /bank-account` — by `reference_id` or `user_id` (same endpoint returns single and bulk async results)
- **IFSC Verification:** `POST /ifsc` — Verify IFSC and retrieve bank branch details
- **Reverse Penny Drop (RPD):** `POST /reverse-penny-drop` — the account **holder** sends ₹1 **from** their own account via a UPI intent/QR/collect link (auto-refunded), and Cashfree returns the verified account details. This is the **opposite direction** to penny drop / BAV (where Cashfree deposits ₹1 *into* the account). Use RPD for **user self-verification during onboarding**, *not* for validating a beneficiary before payout — for that, use Bank Account Verification (`/bank-account/sync` or `/async`). Result is async (via the `RPD_BANK_ACCOUNT_VERIFICATION_*` webhook). Link valid **10 minutes**. There is no separate RPD-status endpoint — use the webhook.
- **UPI Penny Drop:** `POST /upi/penny-drop` — Send ₹1 to VPA, retrieve bank account info
- **Mobile Penny Drop:** `POST /mobile/penny-drop` — Send ₹1 to mobile, retrieve bank account info

### Identity Verification

- **PAN Lite:** `POST /pan-lite` — Validate PAN, returns unique identifier, name, DOB
- **PAN Advance (a.k.a. PAN 360):** `POST /pan/advance` — Comprehensive PAN + masked Aadhaar/email/mobile (~45% fill rate)
- **Verify PAN in Bulk:** `POST /pan/bulk`
- **Get PAN Status (single & bulk):** `GET /pan/{reference_id}`
- **Driving Licence:** `POST /driving-license` — Validity, type, issue date, expiry date

```bash
curl -X POST 'https://sandbox.cashfree.com/verification/driving-license' \
  -H 'X-Client-Id: <CLIENT_ID>' -H 'X-Client-Secret: <CLIENT_SECRET>' \
  -H 'x-api-version: 2024-12-01' \
  -H 'Content-Type: application/json' \
  -d '{ "dl_number": "KA0120198900984", "dob": "1994-08-05", "verification_id": "DL_001" }'
```

- **Passport:** `POST /passport` — Indian passports only (file number)
- **Voter ID:** `POST /voter-id` — EPIC number, constituency details
- **Vehicle RC:** `POST /vehicle-rc` — Vehicle registration certificate details

### Business Verification (KYB)

- **CIN Verification:** `POST /cin` — Incorporation date, director details, CIN status
- **Udyam Verification:** `POST /udyam` — Udyam reference number
- **Fetch GSTIN with PAN:** `POST /pan-gstin` — List of GSTINs for a PAN
- **Fetch Udyam with PAN:** `POST /pan-udyam` — List of Udyam numbers for a PAN

### OCR & Biometric

- **Face Liveness:** `POST /face-liveness` (multipart/form-data) — Check real human face, prevent spoofing
- **Face Match:** `POST /face-match` (multipart/form-data) — Compare two images or validate against ID
- **Name Match:** `POST /name-match` — Compare two names (see score table above)
- **Smart OCR:** `POST /bharat-ocr` (multipart/form-data) — Extract structured fields from PAN, Aadhaar, DL, Passport, Voter ID, Vehicle RC, Cancelled Cheque, Invoice. Includes fraud detection
- **Aadhaar Masking:** `POST /aadhaar-masking` (multipart/form-data) — Mask first 8 digits, disable QR

### Digital Onboarding

- **KYC Links — Generate:** `POST /form`
- **KYC Links — Static:** `POST /form/static-link`
- **KYC Links — Status:** via the `KYC_LINK_*` webhook (no dedicated status GET endpoint)
- **E-Sign — Upload Document:** `POST /esignature/document`
- **E-Sign — Create Request:** `POST /esignature`
- **E-Sign — Status:** via the `E_SIGN_VERIFICATION_*` webhook
- **Video KYC — Create User:** `POST /user`
- **Video KYC — Initiate:** `POST /vkyc`
- **Video KYC — Auth Token (to init the SDK):** `POST /oauth/token`
- **Video KYC — Status:** via the `VKYC_*` webhook
- **1-Click Onboarding — Data Availability:** `POST /user/data-availability`
- **1-Click Onboarding — Initiate OAuth:** `POST /oauth2/session`
- **1-Click Onboarding — Access Token:** `POST /oauth2/generate-token`
- **1-Click Onboarding — Fetch User Details:** `GET /oauth2/user-details`

### Advanced Services

- **Mobile 360 — Send OTP:** `POST /mobile360/otp/send`
- **Mobile 360 — Verify OTP:** `POST /mobile360/otp/verify` — Returns: personal details, bank account, UAN employment, PAN, credit score, risk intelligence, mobile intelligence
- **Advanced Employment:** `POST /advance-employment` — Employment details, joining/exit date, Aadhaar linkage
- **Account Aggregator — Request Consent:** `POST /aa/consent`
- **Account Aggregator — Request Financial Info:** `POST /aa/fi`
- **Account Aggregator — Consent / FI status:** via the `AA_CONSENT_VERIFICATION_*` webhook
- **Reverse Geocoding:** `POST /reverse-geocoding` — Coordinates to readable location
- **IP Verification:** `POST /ip` — IP address details for location-based authentication

---

## 5. DigiLocker Status Values

| Status | Description |
|---|---|
| `PENDING` | User hasn't completed verification |
| `AUTHENTICATED` | User logged in and gave consent |
| `EXPIRED` | Link expired before completion |
| `CONSENT_DENIED` | User rejected consent |

---

## 6. Webhook Payloads

### BAV Success

```json
{
  "signature": "signature",
  "event_type": "BANK_ACCOUNT_VERIFICATION_SUCCESS",
  "event_time": "2023-07-19 10:46:16",
  "version": "v2",
  "data": {
    "reference_id": 1294785793,
    "user_id": "123123",
    "name_at_bank": "John Doe",
    "amount_deposited": "1.04",
    "bank_name": "YES BANK",
    "utr": "404223241811",
    "name_match_score": "90.00",
    "name_match_result": "GOOD_PARTIAL_MATCH",
    "account_status": "VALID",
    "account_status_code": "ACCOUNT_IS_VALID"
  }
}
```

### BAV Rejected

```json
{
  "signature": "signature",
  "event_type": "BANK_ACCOUNT_VERIFICATION_REJECTED",
  "event_time": "2023-07-19 10:46:16",
  "version": "v2",
  "data": {
    "reference_id": 1294785793,
    "user_id": "123123",
    "account_status": "REJECTED",
    "account_status_code": "INSUFFICIENT_BALANCE"
  }
}
```

### DigiLocker Success

```json
{
  "event_type": "DIGILOCKER_VERIFICATION_SUCCESS",
  "event_time": "2006-01-02T15:04:05Z",
  "version": "v1",
  "data": {
    "user_details": { "name": "John Doe", "dob": "02-02-1995", "gender": "M", "eaadhaar": "Y", "mobile": "9999999999" },
    "status": "AUTHENTICATED",
    "document_requested": ["AADHAAR", "PAN", "DRIVING_LICENSE"],
    "document_consent": ["AADHAAR", "PAN", "DRIVING_LICENSE"],
    "document_consent_validity": "2025-09-30T07:10:00Z",
    "verification_id": "ABC00123",
    "reference_id": 12345
  }
}
```

### E-Sign Success

```json
{
  "event_type": "ESIGN_VERIFICATION_SUCCESS",
  "event_time": "2023-07-19 10:46:16",
  "version": "v1",
  "data": {
    "status": "SUCCESS",
    "reference_id": 32,
    "verification_id": "ABC00123",
    "document_id": 36,
    "signers": [
      { "name": "John Doe", "status": "SUCCESS", "is_notified": true }
    ],
    "signed_doc_url": "SIGNED_DOC_URL"
  }
}
```

### KYC Link Action Performed

```json
{
  "signature": "3YdAGMqBPDgWqy4zteRad/MoCmH59cm+93sogQWhOa8=",
  "event_type": "KYC_LINK_ACTION_PERFORMED",
  "event_time": "2024-02-15 16:53:15",
  "version": "v1",
  "data": {
    "name": "Test",
    "phone": "9999999999",
    "email": "test@cashfree.com",
    "verification_id": "testverificationid",
    "reference_id": 235461,
    "form_status": "RECEIVED",
    "verification_details": [
      { "reference_id": 234, "type": "OFFLINE_AADHAAR_VERIFICATION", "status": "SUCCESS" },
      { "reference_id": 0, "type": "PANDETAILS_VERIFICATION", "status": "RECEIVED" }
    ]
  }
}
```

### Video KYC Events

| Event | Description |
|---|---|
| `VKYC_USER_LINK_GENERATED` | VKYC link generated for user |
| `VKYC_USER_LINK_EXPIRED` | VKYC link expired |
| `VKYC_USER_AADHAAR_VERIFIED` | User's Aadhaar verified |
| `VKYC_USER_CALL_SCHEDULED` | VKYC call scheduled |
| `VKYC_USER_PRECHECK_FAILED` | Pre-verification checks failed |
| `VKYC_USER_CALL_QUEUED` | User waiting in queue for agent |
| `VKYC_USER_CALL_STARTED` | VKYC call started |
| `VKYC_USER_DROPOFF_FROM_CALL` | User dropped off |
| `VKYC_USER_CALL_COMPLETED` | VKYC call completed |
| `VKYC_AUDITOR_REVIEW_COMPLETED` | Auditor approved or rejected VKYC packet |

---

## 7. Frontend SDKs

### DigiLocker React Native SDK

```bash
npm install @cashfreepayments/react-native-digilocker
# iOS: cd ios && pod install
```

Requirements: Android SDK 19+, iOS deployment target 10.3+

```jsx
import { DigiLockerProvider, useDigiLocker } from '@cashfreepayments/react-native-digilocker';

function App() {
  return <DigiLockerProvider>{/* App content */}</DigiLockerProvider>;
}

const { verify } = useDigiLocker();

verify(url, redirectUrl, {
  userFlow: 'signin',  // or 'signup'
  onSuccess: (data) => console.log(data),
  onError: (error) => console.error(error),
  onCancel: () => console.log('cancelled')
});
```

### Video KYC SDK

**Web:**
```html
<!-- Production -->
<script src="https://vssdk-prod.cashfree.com/vkyc-sdk/prod/1.0.0/index.js"></script>
<!-- Sandbox -->
<script src="https://vssdk-prod.cashfree.com/vkyc-sdk/gamma/1.0.0/index.js"></script>
```

```javascript
const vkyc = CFVKYC({
  srcUrl: "https://forms.cashfree.com/verification/<shortCode>",
  oAuthToken: "<OAuth Token>",
  callback: (response) => console.log("VKYC Response:", response),
});
vkyc.closeSDK(); // Close programmatically
```

**Android:**
```kotlin
// settings.gradle.kts
repositories { maven { url = URI("https://maven.cashfree.com/release") } }

// build.gradle.kts
dependencies { implementation("com.cashfree.vrs:kyc-verification:1.0.4") }

val verificationService = CFVerificationService.Builder().setContext(this).build()
verificationService.setKycVerificationCallback(object : CFVerificationCallback {
    override fun onVerificationResponse(response: CFVerificationResponse) { /* handle */ }
    override fun onErrorResponse(error: CFErrorResponse) { /* handle */ }
    override fun onVKycCloseResponse(response: CFVKycCloseResponse) { /* handle */ }
})
verificationService.doVerification(kycUrl, token)
```

**iOS:**
```swift
// Add package: https://github.com/cashfree/KycVerificationSdk.git
// Requirements: iOS 13.0+, Swift 5.0+, Xcode 14.0+

let kycService = CFVerificationService.getInstance()
func onVerificationCompletion(verificationResponse: CFVerificationResponse) {
    if verificationResponse.status == "SUCCESS" {
        print("Verification successful")
    }
}
```

### 1-Click Onboarding

**Web:**
```html
<script src="https://vssdk-prod.cashfree.com/vsvault/prod/1.0.0/index.js"></script>
```

```javascript
const cf = CF1ClickOnboarding({
  sessionId: newId,
  successCb: (data) => console.log("Success:", data),
  errorCb: (error) => console.error("Error:", error),
  mode: "production"
});
cf.closeSDK();
```

**Android:**
```kotlin
dependencies { implementation("com.cashfree.vrs:kyc-verification:1.0.4") }

verificationService.set1ClickOnboardingCallback(object : CF1ClickOnboardingCallback {
    override fun onVerification(response: CF1ClickOnboardingResponse) { /* handle */ }
})
```
