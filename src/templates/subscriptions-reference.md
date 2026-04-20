---
name: Cashfree Subscriptions - Reference
description: >
  Reference material for the Subscriptions skill. Read this when you need:
  full API reference (Fetch Plan/Subscription/Payment, Physical NACH, Refunds), cut-off timelines,
  complete webhook payloads, mobile SDKs (Android/iOS/Flutter/React Native), UPI Autopay intent apps,
  or eNACH eligibility rules. Always read subscriptions/SKILL.md first for the core flow.
---

# Cashfree Subscriptions — Reference

> This document is in `references/` — file name `REFERENCE.md`. Read `../SKILL.md` first for the core subscription flow.

---

## 1. Full API Reference — Plans

### Create Plan — Multi-language Examples

**Node.js:**
```javascript
const options = {
  method: 'POST',
  headers: {
    'accept': 'application/json',
    'content-type': 'application/json',
    'x-api-version': '2025-01-01',
    'x-client-id': 'YOUR_CLIENT_ID',
    'x-client-secret': 'YOUR_CLIENT_SECRET'
  },
  body: JSON.stringify({
    plan_id: 'plan_premium',
    plan_name: 'Premium Plan',
    plan_type: 'PERIODIC',
    plan_currency: 'INR',
    plan_max_amount: 1000,
    plan_recurring_amount: 100,
    plan_intervals: 1,
    plan_interval_type: 'MONTH'
  })
};
const response = await fetch('https://sandbox.cashfree.com/pg/plans', options);
```

**Python:**
```python
import requests

url = "https://sandbox.cashfree.com/pg/plans"
payload = {
    "plan_id": "plan_premium",
    "plan_name": "Premium Plan",
    "plan_type": "PERIODIC",
    "plan_currency": "INR",
    "plan_max_amount": 1000,
    "plan_recurring_amount": 100,
    "plan_intervals": 1,
    "plan_interval_type": "MONTH"
}
headers = {
    "accept": "application/json",
    "content-type": "application/json",
    "x-api-version": "2025-01-01",
    "x-client-id": "YOUR_CLIENT_ID",
    "x-client-secret": "YOUR_CLIENT_SECRET"
}
response = requests.post(url, json=payload, headers=headers)
```

**On-Demand Plan:**
```bash
curl --request POST \
  --url https://sandbox.cashfree.com/pg/plans \
  --header 'x-api-version: 2025-01-01' \
  --header 'x-client-id: YOUR_CLIENT_ID' \
  --header 'x-client-secret: YOUR_CLIENT_SECRET' \
  --header 'content-type: application/json' \
  --data '{
    "plan_id": "plan_ondemand",
    "plan_name": "On-Demand Plan",
    "plan_type": "ON_DEMAND",
    "plan_currency": "INR",
    "plan_max_amount": 5000
  }'
```

### Fetch Plan

`GET /pg/plans/{plan_id}`

---

## 2. Full API Reference — Subscriptions

- **Fetch Subscription:** `GET /pg/subscriptions/{subscription_id}`
- **Upload Physical NACH Form:** `POST /pg/subscriptions/{subscription_id}/upload` — Upload signature-based NACH registration forms
- **Get Payment Methods:** `GET /pg/subscriptions/{subscription_id}/payment-methods` — Fetch available payment methods for subscription creation
- **Generate Transaction Summary:** `GET /pg/subscriptions/{subscription_id}/transaction-summary` — Downloadable transaction summary report

---

## 3. Full API Reference — Payments

- **Fetch Payment:** `GET /pg/subscriptions/{subscription_id}/payments/{payment_id}`
- **Fetch Payments for Mandate:** `GET /pg/subscriptions/{subscription_id}/payments`
- **Manage Payment:** `POST /pg/subscriptions/{subscription_id}/payments/{payment_id}/manage` — Retry failed payments or cancel pending charges

---

## 4. Refunds

- **Create Refund:** `POST /pg/subscriptions/{subscription_id}/refunds`
- **Fetch Refund:** `GET /pg/subscriptions/{subscription_id}/refunds/{refund_id}`

---

## 5. Cut-off Timelines for Raising a Charge

| Charge Raised | Scheduled For | NACH | UPI Autopay | SI on Indian Cards | SI on Intl Cards |
|---|---|---|---|---|---|
| T: 00:00–06:59 | null | Raised on T | Not Allowed | Not Allowed | Raised on T |
| T: 07:00–11:59 | null | Raised on T+1 | Not Allowed | Not Allowed | Raised on T+1 |
| T: 00:00–06:59 | T | Raised on T | Not Allowed | Not Allowed | Raised on T |
| T: 07:00–11:59 | T | Not Allowed | Not Allowed | Not Allowed | Not Allowed |
| T: 00:00–20:59 | T+1 | Raised on T+1 | Raised on T+1 | Raised on T+1 | Raised on T+1 |
| T: 21:00–23:59 | T+1 | Raised on T+1 | Not Allowed | Not Allowed | Raised on T+1 |
| T: 00:00–23:59 | T+n (2–14) | Raised on T+n | Raised on T+n | Raised on T+n | Raised on T+n |
| T: 00:00–23:59 | T+15 | Not Allowed | Not Allowed | Not Allowed | Not Allowed |

---

## 6. Webhook Payload — SUBSCRIPTION_STATUS_CHANGED

```json
{
  "data": {
    "subscription_details": {
      "cf_subscription_id": "23639356",
      "subscription_id": "sub_unique_id",
      "subscription_status": "ACTIVE",
      "subscription_expiry_time": "2055-08-07T10:30:46",
      "next_schedule_date": null
    },
    "customer_details": {
      "customer_name": null,
      "customer_email": "john@dummy.com",
      "customer_phone": "9900000000"
    },
    "plan_details": {
      "plan_id": "plan_premium",
      "plan_name": "Premium Plan",
      "plan_type": "ON_DEMAND",
      "plan_max_amount": 399.00,
      "plan_currency": "INR"
    },
    "authorization_details": {
      "authorization_amount": 2.00,
      "authorization_amount_refund": false,
      "authorization_status": "PENDING",
      "payment_method": { "upi": { "channel": "link", "upi_id": "9910000000@ybl" } },
      "payment_group": "upi"
    },
    "payment_gateway_details": {
      "gateway_name": "CASHFREE",
      "gateway_subscription_id": "23639356",
      "gateway_plan_id": "plan_premium"
    }
  },
  "event_time": "...",
  "type": "SUBSCRIPTION_STATUS_CHANGED"
}
```

---

## 7. UPI Autopay Intent Apps

| App | Android | iOS |
|---|---|---|
| Paytm | Yes | Yes |
| GPay | Yes | Yes |
| PhonePe | Yes | Yes |
| AmazonPay | Yes | Yes |

---

## 8. eNACH Account Eligibility

- Only **individual accounts** (savings and current with single signatory) are supported
- Corporate current accounts with multiple signatories must use **Physical NACH**
- Authorization amount for eNACH is **zero (0)** — no charge during authorization

---

## 9. Mobile SDKs

### Android SDK

**Installation (Gradle):**
```groovy
implementation 'com.cashfree.pg:api:2.3.2'
```

**Android Manifest (required):**
```xml
<application>
  <meta-data
    android:name="cashfree_subscription_flow_enable"
    android:value="true"
    tools:replace="android:value"/>
</application>
```

**Kotlin:**
```kotlin
val cfSubsSession = CFSubscriptionSessionBuilder()
    .setEnvironment(CFSubscriptionSession.Environment.SANDBOX)
    .setSubscriptionSessionID(subscription_session_id)
    .setSubscriptionId(subscription_id)
    .build()

val cfTheme = CFWebCheckoutThemeBuilder()
    .setNavigationBarBackgroundColor("#6A3FD3")
    .build()

val cfSubscriptionPayment = CFSubscriptionCheckoutBuilder()
    .setSubscriptionSession(cfSubsSession)
    .setSubscriptionUITheme(cfTheme)
    .build()

CFPaymentGatewayService.getInstance().setSubscriptionCheckoutCallback(this)
CFPaymentGatewayService.getInstance().doPayment(this, cfSubscriptionPayment)

override fun onSubscriptionVerify(cfSubscriptionResponse: CFSubscriptionResponse) {
    Log.d("onSubscriptionVerify", "verifyPayment triggered")
}
override fun onSubscriptionFailure(cfErrorResponse: CFErrorResponse) {
    Log.e("onSubscriptionFailure", cfErrorResponse.message)
}
```

**Java:**
```java
CFSubscriptionSession cfSubsSession = new CFSubscriptionSession.CFSubscriptionSessionBuilder()
    .setEnvironment(CFSubscriptionSession.Environment.SANDBOX)
    .setSubscriptionSessionID(subscription_session_id)
    .setSubscriptionId(subscription_id)
    .build();

CFSubscriptionPayment cfSubscriptionPayment = new CFSubscriptionPayment.CFSubscriptionCheckoutBuilder()
    .setSubscriptionSession(cfSubsSession)
    .build();

CFPaymentGatewayService.getInstance().setSubscriptionCheckoutCallback(this);
CFPaymentGatewayService.getInstance().doPayment(this, cfSubscriptionPayment);
```

### iOS SDK

**Installation (CocoaPods):**
```ruby
pod 'CashfreePG', '2.3.2'
```

**Info.plist (for UPI intent):**
```xml
<key>LSApplicationQueriesSchemes</key>
<array>
  <string>phonepe</string><string>tez</string><string>paytmmp</string>
  <string>bhim</string><string>amazonpay</string><string>credpay</string>
</array>
```

**Swift:**
```swift
do {
    let session = try CFSubscriptionSession.CFSubscriptionSessionBuilder()
        .setEnvironment(CFENVIRONMENT.SANDBOX)
        .setSubscriptionId(subscription_id)
        .setSubscriptionSessionId(subscription_session_id)
        .build()
    let payment = try CFSubscriptionPayment.CFSubscriptionPaymentBuilder()
        .setSession(session).build()
    let pgService = CFPaymentGatewayService.getInstance()
    pgService.setCallback(self)
    try pgService.startSubscription(payment)
} catch let e { print("Error: \(e.localizedDescription)") }

extension ViewController: CFResponseDelegate {
    func onError(_ error: CFErrorResponse, order_id: String) { print("Error", order_id) }
    func verifyPayment(order_id: String) { print("Subscription verifyPayment", order_id) }
}
```

### Flutter SDK

**pubspec.yaml:**
```yaml
dependencies:
  flutter_cashfree_pg_sdk: 2.3.3+50
```

**Android Manifest (required):**
```xml
<meta-data android:name="cashfree_subscription_flow_enable" android:value="true" tools:replace="android:value"/>
```

**Dart:**
```dart
try {
    var subscriptionSession = CFSubscriptionSessionBuilder()
        .setEnvironment(CFEnvironment.SANDBOX)
        .setSubscriptionId(subscriptionId)
        .setSubscriptionSessionId(subscriptionSessionId)
        .build();

    var cfSubscriptionCheckout = CFSubscriptionPaymentBuilder()
        .setSession(subscriptionSession!)
        .build();

    cfPaymentGatewayService.doPayment(cfSubscriptionCheckout);
} on CFException catch (e) { print(e.message); }

void onSubscriptionVerify(String subscriptionId) {
    print("Verify Subscription ===> $subscriptionId");
}
void onSubscriptionFailure(CFErrorResponse errorResponse, String data) {
    print("Failure in subscription flow");
}
```

### React Native SDK

**Installation:**
```bash
npm install react-native-cashfree-pg-sdk
```

**Android Manifest (required):**
```xml
<meta-data android:name="cashfree_subscription_flow_enable" android:value="true" tools:replace="android:value"/>
```

**TypeScript:**
```javascript
import { CFEnvironment, CFSubscriptionSession } from 'cashfree-pg-api-contract';
import { CFErrorResponse, CFPaymentGatewayService } from 'react-native-cashfree-pg-sdk';

const session = new CFSubscriptionSession(
    'subscription_session_id',
    'subscription_id',
    CFEnvironment.SANDBOX
);

CFPaymentGatewayService.setCallback({
    onVerify(orderID: string): void { console.log('Verified:', orderID); },
    onError(error: CFErrorResponse, orderID: string): void { console.error('Error:', JSON.stringify(error)); },
});

CFPaymentGatewayService.doSubscriptionPayment(session);
```
