---
name: Cashfree Payment Gateway - Mobile SDK Integration
description: >
  Use when integrating Cashfree Payments into a mobile app.
  Triggers: integrate Cashfree Payments in mobile, integrate Cashfree with Android app,
  integrate Cashfree with iOS app, integrate Cashfree in React Native, integrate Cashfree Flutter,
  add Cashfree Payments to mobile, Android payment integration, iOS payment SDK,
  React Native checkout, Flutter payments, Cordova payment gateway, Kotlin payment gateway,
  Swift payment SDK, Expo payments, in-app checkout, Cashfree Android SDK, Cashfree iOS SDK,
  react-native-cashfree-pg-sdk, flutter_cashfree_pg_sdk, CashfreePG CocoaPods, Gradle Cashfree.
  Use instead of the backend SDK skill when the integration target is a mobile app.
---

# Cashfree Payment Gateway – Mobile App SDK Integration

> **References available:** This SKILL.md covers the integration architecture and Android as the canonical example. For iOS, Flutter, React Native, and Cordova full platform code, UPI Intent checkout per platform, and troubleshooting — read `references/REFERENCE.md` in this directory.

---

## 1. Scope & Boundaries

### When to use this skill

- Integrating Cashfree Payment Gateway into a **mobile application** — Android, iOS, React Native, Flutter, or Cordova/Capacitor.
- Needs guidance on SDK installation, session creation, checkout invocation, or callback handling.
- Backend creates orders; the mobile app uses `payment_session_id` to drive checkout.

### When NOT to use this skill

- Web-only integration → use Web Checkout JS or S2S REST API skill.
- Server-to-server payment without any SDK UI → use the S2S REST API skill.
- Backend SDK usage only (Node.js, Python, Java, Go) → use the Backend SDK skill.
- Payouts, Subscriptions, Token Vault standalone, Secure ID → separate skills.

---

## 2. Integration Architecture

All Cashfree mobile SDK integrations follow a **3-step flow**:

```
1. Create Order (your backend server)
       ↓
2. Open Checkout (mobile SDK on device)
       ↓
3. Confirm Payment (your backend server + webhooks)
```

- **Step 1**: Always server-side. Backend calls `POST /orders`, receives `payment_session_id`.
- **Step 2**: Always client-side. Mobile SDK uses `payment_session_id` to open checkout.
- **Step 3**: Always server-side. Backend verifies via `GET /orders/{order_id}` + webhooks.

### Core Objects

| Object | Description |
|---|---|
| **Order** | Created server-side via `POST /orders`. Returns `payment_session_id`. |
| **CFSession** | SDK session object. Wraps `payment_session_id`, `order_id`, environment. Built per platform. |
| **CFWebCheckoutPayment** | SDK checkout object for full payment page (all methods). |
| **CFUPIIntentCheckoutPayment** | SDK checkout object for native UPI app selection. |
| **onVerify callback** | Payment likely succeeded — must verify from backend. |
| **onError callback** | Payment failed or errored. |

### Supported Platforms

| Platform | Package | Latest SDK |
|---|---|---|
| **Android** | `com.cashfree.pg:api` (Maven) | `2.3.2` (Android SDK 19+) |
| **iOS** | `CashfreePG` (SPM / CocoaPods) | `2.3.2` (iOS 11+) |
| **Flutter** | `flutter_cashfree_pg_sdk` (pub.dev) | `2.2.10+48` |
| **React Native** | `react-native-cashfree-pg-sdk` (npm) | `2.2.6` |
| **Cordova** | `cordova-plugin-cashfree-pg` (npm) | `1.0.12` |

### Checkout Flow Types

| Flow | Description | Use Case |
|---|---|---|
| **Web Checkout** | WebView-based page with all payment methods (cards, UPI, NB, wallets, EMI, paylater) | Default choice |
| **UPI Intent** | Native screen showing installed UPI apps | Native UPI-only experience |

---

## 3. Core Workflow: Web Checkout

### Step 1: Create Order (Backend)

```
POST /orders
Headers: x-client-id, x-client-secret, x-api-version: 2025-01-01
```

```json
{
  "order_amount": 100.00,
  "order_currency": "INR",
  "customer_details": {
    "customer_id": "customer_123",
    "customer_phone": "9999999999"
  },
  "order_meta": {
    "return_url": "https://yoursite.com/return?order_id=order_123"
  }
}
```

Response: extract `payment_session_id` and `order_id`, send to your mobile app.

### Step 2: Open Checkout (Android — Kotlin)

```kotlin
// Install: implementation 'com.cashfree.pg:api:2.3.2' in build.gradle

// Set callback in onCreate (BEFORE doPayment)
CFPaymentGatewayService.getInstance().setCheckoutCallback(this)

// Create session + initiate checkout
val cfSession = CFSessionBuilder()
    .setEnvironment(CFSession.Environment.SANDBOX) // or .PRODUCTION
    .setPaymentSessionID(paymentSessionId)
    .setOrderId(orderId)
    .build()

val cfWebCheckoutPayment = CFWebCheckoutPaymentBuilder()
    .setSession(cfSession)
    .build()

CFPaymentGatewayService.getInstance().doPayment(this@YourActivity, cfWebCheckoutPayment)
```

```kotlin
// Implement CFCheckoutResponseCallback in your Activity
override fun onPaymentVerify(orderID: String) {
    // Verify from backend — don't fulfill here
}

override fun onPaymentFailure(cfErrorResponse: CFErrorResponse, orderID: String) {
    // Handle failure
}
```

> For iOS, Flutter, React Native, and Cordova — see `REFERENCE.md`.

### Step 3: Handle Callback

Two callbacks:
- **`onVerify(orderID)`** — Payment likely succeeded. MUST verify from backend before fulfilling.
- **`onError(errorResponse, orderID)`** — Payment failed. Display appropriate message.

**CRITICAL:** `onVerify` does NOT guarantee success. Always verify server-side.

### Step 4: Verify Payment (Backend — MANDATORY)

When the SDK fires `onVerify`/`verifyPayment`, the mobile app must call **your backend**, which then fetches the real order status from Cashfree. Never fulfill based on the mobile callback alone.

**Callback names per platform:**

| Platform | Success callback | Failure callback |
|---|---|---|
| Android (Kotlin/Java) | `onPaymentVerify(orderID: String)` | `onPaymentFailure(error, orderID)` |
| iOS (Swift) | `verifyPayment(order_id: String)` | `onError(error, order_id)` |
| Flutter | `verifyPayment(String orderId)` | `onError(CFErrorResponse, String)` |
| React Native | `onVerify(orderID: string)` | `onError(error, orderID)` |
| Cordova | `onVerify(result.orderID)` | `onError(error.orderID)` |

**Your backend then calls `GET /orders/{order_id}` (or SDK equivalent):**

```javascript
// Node.js backend (cashfree-pg v5)
const response = await cashfree.PGFetchOrder(orderId);
const status = response.data.order_status; // "PAID" | "ACTIVE" | "EXPIRED"
```

```python
# Python backend (cashfree-pg v6+)
response = cashfree.PGFetchOrder(order_id, None, None)
status = response.data.order_status
```

```java
// Java backend
ApiResponse<OrderEntity> response = cashfree.PGFetchOrder("2025-01-01", orderId, null, null, null);
String status = response.getData().getOrderStatus(); // "PAID"
```

```go
// Go backend (cashfree-pg v6+)
response, _, err := cashfree.PGFetchOrder(orderId, nil, nil, nil)
```

| `order_status` | Meaning |
|---|---|
| `PAID` | Safe to fulfill |
| `ACTIVE` | Still awaiting payment |
| `EXPIRED` | No successful payment |

> For granular payment-level status (`SUCCESS`, `FAILED`, `PENDING`, `USER_DROPPED`) — use `PGOrderFetchPayments(orderId)`. See `references/REFERENCE.md`.

### Step 5: Process Webhooks

Configure `notify_url` in Create Order. Verify webhook signatures before processing. See the Webhooks skill.

---

## 4. Decision Rules

- **Want all payment methods** → Web Checkout (`CFWebCheckoutPayment`).
- **Want native UPI app selection** → UPI Intent (`CFUPIIntentCheckoutPayment`). See `REFERENCE.md`.
- **Android native** → `com.cashfree.pg:api` via Gradle.
- **iOS native** → `CashfreePG` via SPM or CocoaPods.
- **Flutter** → `flutter_cashfree_pg_sdk` via pub.dev.
- **React Native / Expo** → `react-native-cashfree-pg-sdk`. For Expo: run `npx expo prebuild` (Expo Go is NOT supported).
- **Cordova / Ionic** → `cordova-plugin-cashfree-pg`.
- **Capacitor / Ionic Capacitor** → `cordova-plugin-cashfree-pg@capacitor`.

**Callback registration timing:**
- Android → `onCreate()`
- iOS → `viewDidLoad()`
- Flutter → `initState()`
- React Native → `componentDidMount()` (remove in `componentWillUnmount()`)
- Cordova → `onDeviceReady()`

---

## 5. Security Constraints — Never Violate

- **Never expose `x-client-secret` in mobile app code.** SDK authenticates via `payment_session_id`.
- **Never call `POST /orders` from the mobile app.** Create orders server-side only.
- **Never fulfill based on `onVerify` callback alone.** Always verify via `GET /orders/{order_id}` from backend.
- **Never skip webhook signature verification.**

> **Read `references/REFERENCE.md` for:** iOS (Swift/Objective-C), Flutter (Dart), React Native (TypeScript), Cordova (JavaScript) full installation and code, UPI Intent checkout per platform, and common mistakes table.
