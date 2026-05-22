---
name: Cashfree Payment Gateway - Mobile SDK Reference
description: >
  Reference material for the Mobile SDK skill. Read this when you need:
  iOS (Swift/Objective-C), Flutter (Dart), React Native (TypeScript), or Cordova (JavaScript)
  platform-specific installation and code, UPI Intent checkout per platform,
  or common mobile integration mistakes.
  Always read mobile-sdks/SKILL.md first for the integration architecture and Android example.
---

# Cashfree Payment Gateway — Mobile SDK Reference

> This document is in `references/` — file name `REFERENCE.md`. Read `../SKILL.md` first for the integration architecture and Android code.

---

## 1. Android — Full Reference

### Installation

```groovy
// build.gradle (app)
implementation 'com.cashfree.pg:api:2.3.2'
```

### Complete Sample (Java — Web Checkout)

```java
package com.cashfree.sdk_sample;

import android.os.Bundle;
import android.util.Log;
import androidx.appcompat.app.AppCompatActivity;
import com.cashfree.pg.api.CFPaymentGatewayService;
import com.cashfree.pg.core.api.CFSession;
import com.cashfree.pg.core.api.callback.CFCheckoutResponseCallback;
import com.cashfree.pg.core.api.exception.CFException;
import com.cashfree.pg.core.api.utils.CFErrorResponse;
import com.cashfree.pg.core.api.webcheckout.CFWebCheckoutPayment;

public class WebCheckoutActivity extends AppCompatActivity implements CFCheckoutResponseCallback {
    String orderID = "ORDER_ID";
    String paymentSessionID = "TOKEN";
    CFSession.Environment cfEnvironment = CFSession.Environment.PRODUCTION;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_checkout);
        try {
            CFPaymentGatewayService.getInstance().setCheckoutCallback(this);
            doWebCheckoutPayment();
        } catch (CFException e) {
            e.printStackTrace();
        }
    }

    private void doWebCheckoutPayment() throws CFException {
        CFSession cfSession = new CFSession.CFSessionBuilder()
            .setEnvironment(cfEnvironment)
            .setPaymentSessionID(paymentSessionID)
            .setOrderId(orderID)
            .build();

        CFWebCheckoutPayment cfWebCheckoutPayment = new CFWebCheckoutPayment.CFWebCheckoutPaymentBuilder()
            .setSession(cfSession)
            .build();

        CFPaymentGatewayService.getInstance().doPayment(this, cfWebCheckoutPayment);
    }

    @Override
    public void onPaymentVerify(String orderID) {
        Log.d("WebCheckout", "Verify payment: " + orderID);
    }

    @Override
    public void onPaymentFailure(CFErrorResponse cfErrorResponse, String orderID) {
        Log.e("WebCheckout", "Failed: " + cfErrorResponse.getMessage());
    }
}
```

### UPI Intent Checkout (Android — Kotlin)

```kotlin
// Theme (optional)
val cfTheme = CFIntentThemeBuilder()
    .setPrimaryTextColor("#000000")
    .setBackgroundColor("#FFFFFF")
    .build()

// Select specific UPI apps (optional — omit to show all)
val cfupiIntentCheckout = CFUPIIntentBuilder()
    .setOrder(Arrays.asList(CFUPIIntentCheckout.CFUPIApps.BHIM, CFUPIIntentCheckout.CFUPIApps.PHONEPE))
    // OR by package name:
    // .setOrderUsingPackageName(Arrays.asList("com.dreamplug.androidapp", "in.org.npci.upiapp"))
    .build()

val cfupiIntentCheckoutPayment = CFUPIIntentPaymentBuilder()
    .setSession(cfSession)
    .setCfUPIIntentCheckout(cfupiIntentCheckout)
    .setCfIntentTheme(cfTheme)
    .build()

CFPaymentGatewayService.getInstance().doPayment(this@YourActivity, cfupiIntentCheckoutPayment)
```

---

## 2. iOS — Full Reference

### Installation

**Swift Package Manager (Recommended):**
1. Xcode → **File > Add Package Dependencies**.
2. Enter: `https://github.com/cashfree/core-ios-sdk.git`
3. Select **Up to Next Major Version**.
4. Add `CashfreePG` product.

**CocoaPods:**
```ruby
pod 'CashfreePG', '2.3.2'
```
Then: `pod install`

### iOS Configuration (Required for UPI)

Add to `info.plist`:
```xml
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>amazonpay</string>
    <string>upi</string>
    <string>credpay</string>
    <string>bhim</string>
    <string>paytmmp</string>
    <string>phonepe</string>
    <string>tez</string>
    <string>navipay</string>
    <string>mobikwik</string>
    <string>myairtel</string>
    <string>popclubapp</string>
    <string>super</string>
    <string>kiwi</string>
    <string>simplypayupi</string>
    <string>whatsapp</string>
</array>
```

### Complete Sample (Swift — Web Checkout)

```swift
import CashfreeAnalyticsSDK
import CashfreePG
import CashfreePGCoreSDK
import CashfreePGUISDK

class ViewController: UIViewController, CFResponseDelegate {
    let pgService = CFPaymentGatewayService.getInstance()

    override func viewDidLoad() {
        super.viewDidLoad()
        pgService.setCallback(self) // Set callback in viewDidLoad
    }

    @IBAction func webCheckoutButtonTapped(_ sender: Any) {
        do {
            let session = try CFSession.CFSessionBuilder()
                .setPaymentSessionId(payment_session_id)
                .setOrderID(order_id)
                .setEnvironment(.SANDBOX) // or .PRODUCTION
                .build()
            let webCheckoutPayment = try CFWebCheckoutPayment.CFWebCheckoutPaymentBuilder()
                .setSession(session)
                .build()
            try pgService.doPayment(webCheckoutPayment, viewController: self)
        } catch let e {
            let err = e as! CashfreeError
            print(err.description)
        }
    }

    func onError(_ error: CFErrorResponse, order_id: String) {
        print("Error: \(error.message ?? "unknown")")
    }

    func verifyPayment(order_id: String) {
        print("Verify payment: \(order_id)")
        // Call your backend to verify via GET /orders/{order_id}
    }
}
```

### UPI Intent Checkout (iOS — Swift)

```swift
let upiIntentPayment = try CFUPIIntentCheckoutPayment.CFUPIIntentCheckoutPaymentBuilder()
    .setSession(session)
    .build()
try pgService.doPayment(upiIntentPayment, viewController: self)
```

---

## 3. Flutter — Full Reference

### Installation

```yaml
# pubspec.yaml
dependencies:
  flutter_cashfree_pg_sdk: 2.2.10+48
```

### iOS Configuration

Add same `LSApplicationQueriesSchemes` to iOS `info.plist` (see iOS section above).

### Complete Sample (Dart — Web Checkout)

```dart
class _MyAppState extends State<MyApp> {
  var cfPaymentGatewayService = CFPaymentGatewayService();

  @override
  void initState() {
    super.initState();
    cfPaymentGatewayService.setCallback(verifyPayment, onError);
  }

  void verifyPayment(String orderId) {
    print("Verify payment: $orderId");
    // Call your backend to verify
  }

  void onError(CFErrorResponse errorResponse, String orderId) {
    print(errorResponse.getMessage());
  }

  webCheckout() async {
    try {
      var session = CFSessionBuilder()
          .setEnvironment(CFEnvironment.SANDBOX)
          .setOrderId(orderId)
          .setPaymentSessionId(paymentSessionId)
          .build();

      var cfWebCheckout = CFWebCheckoutPaymentBuilder().setSession(session!).build();
      cfPaymentGatewayService.doPayment(cfWebCheckout);
    } on CFException catch (e) {
      print(e.message);
    }
  }
}
```

### UPI Intent Checkout (Flutter)

```dart
upiCheckout() async {
  try {
    var session = CFSessionBuilder()
        .setEnvironment(CFEnvironment.SANDBOX)
        .setOrderId(orderId)
        .setPaymentSessionId(paymentSessionId)
        .build();

    var cfUPIIntentCheckout = CFUPIIntentCheckoutPaymentBuilder()
        .setSession(session!)
        .build();
    cfPaymentGatewayService.doPayment(cfUPIIntentCheckout);
  } on CFException catch (e) {
    print(e.message);
  }
}
```

---

## 4. React Native — Full Reference

### Installation

```bash
npm install react-native-cashfree-pg-sdk
# or: yarn add react-native-cashfree-pg-sdk

# Expo:
npx expo install react-native-cashfree-pg-sdk
npx expo install expo-dev-client
npx expo prebuild  # mandatory — Expo Go is NOT supported
npx expo run:android  # or run:ios
```

### iOS Configuration

Add `LSApplicationQueriesSchemes` to `info.plist` (see iOS section above), then:
```bash
cd ios && pod install --repo-update
```

### Complete Sample (TypeScript — Web Checkout)

```typescript
import {
  CFEnvironment,
  CFSession,
  CFThemeBuilder,
  CFWebCheckoutPayment,
  CFPaymentGatewayService,
  CFErrorResponse,
} from 'react-native-cashfree-pg-sdk';

export default class App extends Component {
  componentDidMount() {
    CFPaymentGatewayService.setCallback({
      onVerify(orderID: string): void {
        console.log('Verify payment:', orderID);
        // Call backend to verify
      },
      onError(error: CFErrorResponse, orderID: string): void {
        console.log('Error:', JSON.stringify(error), 'OrderID:', orderID);
      },
    });
  }

  componentWillUnmount() {
    CFPaymentGatewayService.removeCallback();
  }

  async startWebCheckout() {
    try {
      const session = new CFSession('payment_session_id', 'order_id', CFEnvironment.SANDBOX);
      const payment = new CFWebCheckoutPayment(session);
      CFPaymentGatewayService.doWebPayment(payment);
    } catch (e: any) {
      console.log(e.message);
    }
  }
}
```

### UPI Intent Checkout (React Native)

```typescript
import {
  CFUPIIntentCheckoutPayment,
  CFThemeBuilder,
} from 'cashfree-pg-api-contract';

async startUPICheckout() {
  try {
    const session = new CFSession('payment_session_id', 'order_id', CFEnvironment.SANDBOX);
    const theme = new CFThemeBuilder()
      .setNavigationBarBackgroundColor('#E64A19')
      .setNavigationBarTextColor('#FFFFFF')
      .setPrimaryTextColor('#212121')
      .build();
    const upiPayment = new CFUPIIntentCheckoutPayment(session, theme);
    CFPaymentGatewayService.doUPIPayment(upiPayment);
  } catch (e: any) {
    console.log(e.message);
  }
}
```

---

## 5. Cordova / Capacitor — Full Reference

### Installation

**Cordova:**
```bash
npm install cordova-plugin-cashfree-pg
cordova plugin add cordova-plugin-cashfree-pg
```

**Ionic Cordova:**
```bash
ionic cordova plugin add cordova-plugin-cashfree-pg
```

**Capacitor / Ionic Capacitor:**
```bash
npm install cordova-plugin-cashfree-pg@capacitor
npm install @awesome-cordova-plugins/core
npm install @awesome-cordova-plugins/cashfree-pg
ionic cap sync
```

### iOS Configuration

Add same `LSApplicationQueriesSchemes` to `info.plist`, then: `cd ios && pod install --repo-update`

### Complete Sample (JavaScript — Web Checkout)

```javascript
document.addEventListener("deviceready", onDeviceReady, false);

function onDeviceReady() {
  const callbacks = {
    onVerify: function (result) {
      console.log("Verify payment:", result.orderID);
    },
    onError: function (error) {
      console.log("Error:", error.code, error.message, "OrderID:", error.orderID);
    },
  };
  CFPaymentGateway.setCallback(callbacks);

  document.getElementById("payButton").addEventListener("click", initiateWebPayment);
}

function initiateWebPayment() {
  CFPaymentGateway.doWebCheckoutPayment({
    theme: {
      navigationBarBackgroundColor: "#E64A19",
      navigationBarTextColor: "#FFFFFF",
    },
    session: {
      payment_session_id: "payment_session_id",
      orderID: "order_id",
      environment: "SANDBOX", // or "PRODUCTION"
    },
  });
}
```

### UPI Intent Checkout (Cordova)

```javascript
function initiateUPIPayment() {
  CFPaymentGateway.doUPIPayment({
    theme: {
      navigationBarBackgroundColor: "#E64A19",
      navigationBarTextColor: "#FFFFFF",
      buttonBackgroundColor: "#FFC107",
      primaryTextColor: "#212121",
    },
    session: {
      payment_session_id: "payment_session_id",
      orderID: "order_id",
      environment: "SANDBOX",
    },
  });
}
```

---

## 6. Payment Status Verification — Per Platform

After the SDK checkout completes, the mobile app receives a callback with the `order_id`. The app must pass this to **your backend**, which calls Cashfree to get the real status. Never trust the mobile callback alone.

### Flow

```
SDK fires onVerify(orderID)
    → Mobile app calls your backend: GET /api/verify?order_id=xxx
        → Your backend calls Cashfree: GET /pg/orders/{order_id}
            → Check order_status == "PAID"
                → Fulfill or reject
```

### Per-Platform: Callback → Backend Call

**Android (Kotlin):**
```kotlin
override fun onPaymentVerify(orderID: String) {
    // Call your backend
    yourApi.verifyOrder(orderID) { status ->
        if (status == "PAID") showSuccess() else showFailure()
    }
}
```

**Android (Java):**
```java
@Override
public void onPaymentVerify(String orderID) {
    // Call your backend endpoint with orderID
    yourApi.verifyOrder(orderID, new Callback() {
        public void onResult(String status) {
            if ("PAID".equals(status)) showSuccess(); else showFailure();
        }
    });
}
```

**iOS (Swift):**
```swift
func verifyPayment(order_id: String) {
    // Call your backend
    YourAPI.verifyOrder(orderId: order_id) { status in
        DispatchQueue.main.async {
            if status == "PAID" { self.showSuccess() } else { self.showFailure() }
        }
    }
}
```

**Flutter (Dart):**
```dart
void verifyPayment(String orderId) async {
  final status = await yourApi.verifyOrder(orderId);
  if (status == "PAID") {
    // show success
  } else {
    // show failure
  }
}
```

**React Native (TypeScript):**
```typescript
onVerify(orderID: string): void {
  fetch(`/api/verify?order_id=${orderID}`)
    .then(res => res.json())
    .then(data => {
      if (data.order_status === "PAID") { /* show success */ }
      else { /* show failure */ }
    });
}
```

**Cordova (JavaScript):**
```javascript
onVerify: function (result) {
  fetch('/api/verify?order_id=' + result.orderID)
    .then(res => res.json())
    .then(data => {
      if (data.order_status === "PAID") { /* success */ } else { /* failure */ }
    });
}
```

### Backend Endpoint — Fetch Order Status

Your backend endpoint calls `PGFetchOrder` (or `GET /orders/{order_id}`) and returns the status:

```javascript
// Node.js (cashfree-pg v5)
app.get('/api/verify', async (req, res) => {
  const response = await cashfree.PGFetchOrder(req.query.order_id);
  res.json({ order_status: response.data.order_status });
});
```

```python
# Python (Flask) — cashfree-pg v6+
@app.route('/api/verify')
def verify():
    response = cashfree.PGFetchOrder(request.args['order_id'], None, None)
    return jsonify({"order_status": response.data.order_status})
```

**Order status values:**

| `order_status` | Meaning |
|---|---|
| `PAID` | Payment completed — safe to fulfill |
| `ACTIVE` | Still awaiting payment |
| `EXPIRED` | No successful payment |

**Payment-level status** (more granular — use `PGOrderFetchPayments`):

| `payment_status` | Meaning |
|---|---|
| `SUCCESS` | Payment completed |
| `FAILED` | Payment failed |
| `PENDING` | Awaiting confirmation (late authorization) |
| `NOT_ATTEMPTED` | No attempt made |
| `USER_DROPPED` | User abandoned checkout |

---

## 7. Common Mistakes

| Mistake | Consequence | Fix |
|---|---|---|
| Setting callback AFTER `doPayment()` | Callback missed; no payment result | Always register callback BEFORE `doPayment()` |
| Wrong callback lifecycle method | Lost on activity/view restart | Android: `onCreate`, iOS: `viewDidLoad`, Flutter: `initState`, RN: `componentDidMount`, Cordova: `onDeviceReady` |
| Calling `POST /orders` from mobile app | Exposes `x-client-secret` in binary | Create orders from backend; send `payment_session_id` to app |
| Treating `onVerify` as payment confirmation | May fulfill failed payments | Verify via `GET /orders/{order_id}` from backend |
| Missing `LSApplicationQueriesSchemes` in iOS | No UPI apps shown in Intent checkout | Add all required URL schemes to `info.plist` |
| Not running `pod install` after dependency changes | Build fails with missing modules | `cd ios && pod install --repo-update` |
| Using Expo Go instead of dev client | Native modules not supported | `npx expo prebuild` + `npx expo run:android/ios` |
| Testing production from sideloaded APK | Cashfree Integrity blocks payment | Use Play Store Internal Testing track |
| Not removing RN callback in `componentWillUnmount` | Memory leak; stale callbacks | Call `CFPaymentGatewayService.removeCallback()` |
| Wrong Capacitor plugin version | Plugin incompatible | Use `cordova-plugin-cashfree-pg@capacitor` |
