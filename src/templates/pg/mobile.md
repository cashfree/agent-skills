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

# Cashfree Payment Gateway – Mobile App SDK Integration Skills

## Project Overview
This project integrates Cashfree Payment Gateway into mobile applications using native and cross-platform SDKs. The integration follows a 3-step flow across all platforms:
1. **Create Order** (backend/server-side) → 2. **Open Checkout** (client-side SDK) → 3. **Confirm Payment** (backend verification + webhooks)

Supported SDKs: **Android**, **iOS**, **React Native**, **Flutter**, **Cordova/Capacitor**

---

## API Configuration

### Environments

| Environment | Base URL |
|-------------|----------|
| Sandbox | `https://sandbox.cashfree.com/pg` |
| Production | `https://api.cashfree.com/pg` |

### Required Headers (Server-Side Only)
```
x-client-id: <Your App ID>
x-client-secret: <Your Secret Key>
x-api-version: 2025-01-01
Content-Type: application/json
```

### Authentication
- Credentials are obtained from the Merchant Dashboard.
- **NEVER** expose `x-client-secret` in mobile app code.
- Create orders through your server — don't call the Create Order API directly from the mobile application.
- Whitelist your domain in the Merchant Dashboard before going live.

---

## SDK Versions & Platform Requirements

| Platform | Package / Dependency | Min Version | Latest SDK |
|----------|---------------------|-------------|------------|
| **Android** | `com.cashfree.pg:api` (Maven Central) | Android SDK 19+ | `2.3.2` |
| **iOS** | `CashfreePG` (SPM / CocoaPods) | iOS 11+ | `2.3.2` |
| **Flutter** | `flutter_cashfree_pg_sdk` (pub.dev) | Android SDK 19+ / iOS 11+ | `2.2.10+48` |
| **React Native** | `react-native-cashfree-pg-sdk` (npm) | Android SDK 19+ / iOS 10.3+ | `2.2.6` |
| **Cordova** | `cordova-plugin-cashfree-pg` (npm) | Android SDK 19+ / iOS 11+ | `1.0.12` |

---

## Step 1: Create an Order (Server-Side — All Platforms)

**Endpoint:** `POST /orders`

This step is identical for all mobile SDKs. You must create the order from your backend server. The response provides `payment_session_id` and `order_id` needed by the mobile SDK.

### Request Body
```json
{
  "order_amount": 1.0,
  "order_currency": "INR",
  "customer_details": {
    "customer_id": "customer_123",
    "customer_phone": "9999999999",
    "customer_email": "customer@example.com",
    "customer_name": "John Doe"
  },
  "order_meta": {
    "return_url": "https://yoursite.com/return?order_id=order_123"
  },
  "order_note": ""
}
```

### Response
```json
{
  "cf_order_id": 2149460581,
  "order_id": "order_123",
  "order_status": "ACTIVE",
  "payment_session_id": "session_xxx...",
  "order_expiry_time": "2023-09-09T18:02:46+05:30"
}
```

### Backend SDK Examples

**Node.js:**
```javascript
import { Cashfree, CFEnvironment } from "cashfree-pg";

const cashfree = new Cashfree(
  CFEnvironment.PRODUCTION,
  "{Client ID}",
  "{Client Secret Key}"
);

function createOrder() {
  var request = {
    order_amount: "1",
    order_currency: "INR",
    customer_details: {
      customer_id: "node_sdk_test",
      customer_name: "",
      customer_email: "example@gmail.com",
      customer_phone: "9999999999",
    },
    order_meta: {
      return_url: "https://test.cashfree.com/pgappsdemos/return.php?order_id=order_123",
    },
    order_note: "",
  };

  cashfree
    .PGCreateOrder(request)
    .then((response) => {
      console.log(response.data);
    })
    .catch((error) => {
      console.error("Error setting up order request:", error.response.data);
    });
}
```

**Python:**
```python
from cashfree_pg.models.create_order_request import CreateOrderRequest
from cashfree_pg.api_client import Cashfree
from cashfree_pg.models.customer_details import CustomerDetails

Cashfree.XClientId = "<app_id>"
Cashfree.XClientSecret = "<secret_key>"
Cashfree.XEnvironment = Cashfree.XSandbox
x_api_version = "2023-08-01"

def create_order():
    customerDetails = CustomerDetails(customer_id="123", customer_phone="9999999999")
    createOrderRequest = CreateOrderRequest(order_amount=1, order_currency="INR", customer_details=customerDetails)
    try:
        api_response = Cashfree().PGCreateOrder(x_api_version, createOrderRequest, None, None)
        print(api_response.data)
    except Exception as e:
        print(e)
```

**Java:**
```java
import com.cashfree.*;

Cashfree.XClientId = "<app_id>";
Cashfree.XClientSecret = "<secret_key>";
Cashfree.XEnvironment = Cashfree.SANDBOX;

static void createOrder() {
  CustomerDetails customerDetails = new CustomerDetails();
  customerDetails.setCustomerId("123");
  customerDetails.setCustomerPhone("9999999999");

  CreateOrderRequest request = new CreateOrderRequest();
  request.setOrderAmount(1.0);
  request.setOrderCurrency("INR");
  request.setCustomerDetails(customerDetails);
  try {
    Cashfree cashfree = new Cashfree();
    ApiResponse<OrderEntity> response = cashfree.PGCreateOrder("2023-08-01", request, null, null, null);
    System.out.println(response.getData().getOrderId());
  } catch (ApiException e) {
    throw new RuntimeException(e);
  }
}
```

**Go:**
```go
import cashfree "github.com/cashfree/cashfree-pg/v3"

func createOrder() {
  clientId := "<app_id>"
  clientSecret := "<secret_key>"
  cashfree.XClientId = &clientId
  cashfree.XClientSecret = &clientSecret
  cashfree.XEnvironment = cashfree.SANDBOX

  request := cashfree.CreateOrderRequest{
    OrderAmount: 1,
    CustomerDetails: cashfree.CustomerDetails{
      CustomerId:    "1",
      CustomerPhone: "9999999999",
    },
    OrderCurrency: "INR",
  }
  version := "2023-08-01"
  response, httpResponse, err := cashfree.PGCreateOrder(&version, &request, nil, nil, nil)
  if err != nil {
    fmt.Println(err.Error())
  } else {
    fmt.Println(httpResponse.StatusCode)
    fmt.Println(response)
  }
}
```

**cURL:**
```bash
curl --location 'https://sandbox.cashfree.com/pg/orders' \
--header 'X-Client-Secret: {{clientKey}}' \
--header 'X-Client-Id: {{clientId}}' \
--header 'x-api-version: 2025-01-01' \
--header 'Content-Type: application/json' \
--header 'Accept: application/json' \
--data-raw '{
  "order_amount": 10.10,
  "order_currency": "INR",
  "customer_details": {
    "customer_id": "USER123",
    "customer_name": "joe",
    "customer_email": "joe.s@cashfree.com",
    "customer_phone": "+919876543210"
  },
  "order_meta": {
    "return_url": "https://yoursite.com/return?order_id=order_123"
  }
}'
```

---

## Step 2: Open Checkout (Client-Side — Per Platform)

All SDKs offer two checkout flows:
- **Web Checkout** — WebView-based, full payment page with all payment methods
- **UPI Intent Checkout** — Native screen showing installed UPI apps for direct payment

---

### Android Integration

#### 2.1 Install SDK
```groovy
// build.gradle (app)
implementation 'com.cashfree.pg:api:2.3.2'
```

#### 2.2 Create Session

**Java:**
```java
CFSession cfSession = new CFSession.CFSessionBuilder()
    .setEnvironment(CFSession.Environment.SANDBOX)
    .setPaymentSessionID("paymentSessionID")
    .setOrderId("orderID")
    .build();
```

**Kotlin:**
```kotlin
val cfSession = CFSessionBuilder()
    .setEnvironment(CFSession.Environment.SANDBOX)
    .setPaymentSessionID("paymentSessionID")
    .setOrderId("orderID")
    .build()
```

#### 2.3a Web Checkout Flow

**Customise Theme (Optional):**

Java:
```java
CFWebCheckoutTheme cfTheme = new CFWebCheckoutTheme.CFWebCheckoutThemeBuilder()
    .setNavigationBarBackgroundColor("#6A3FD3")
    .setNavigationBarTextColor("#FFFFFF")
    .build();
```

Kotlin:
```kotlin
val cfTheme = CFWebCheckoutThemeBuilder()
    .setNavigationBarBackgroundColor("#000000")
    .setNavigationBarTextColor("#FFFFFF")
    .build()
```

**Create Payment Object & Initiate:**

Java:
```java
CFWebCheckoutPayment cfWebCheckoutPayment = new CFWebCheckoutPayment.CFWebCheckoutPaymentBuilder()
    .setSession(cfSession)
    .setCFWebCheckoutUITheme(cfTheme)
    .build();

CFPaymentGatewayService.getInstance().doPayment(YourActivity.this, cfWebCheckoutPayment);
```

Kotlin:
```kotlin
val cfWebCheckoutPayment = CFWebCheckoutPaymentBuilder()
    .setSession(cfSession)
    .setCFWebCheckoutUITheme(cfTheme)
    .build()

CFPaymentGatewayService.getInstance().doPayment(this@YourActivity, cfWebCheckoutPayment)
```

#### 2.3b UPI Intent Checkout Flow

**Customise Theme (Optional):**

Java:
```java
CFIntentTheme cfTheme = new CFIntentTheme.CFIntentThemeBuilder()
    .setPrimaryTextColor("#000000")
    .setBackgroundColor("#FFFFFF")
    .build();
```

Kotlin:
```kotlin
val cfTheme = CFIntentThemeBuilder()
    .setPrimaryTextColor("#000000")
    .setBackgroundColor("#FFFFFF")
    .build()
```

**Create Payment Object & Initiate:**

Java:
```java
CFUPIIntentCheckout cfupiIntentCheckout = new CFUPIIntentCheckout.CFUPIIntentBuilder()
    .setOrder(Arrays.asList(CFUPIIntentCheckout.CFUPIApps.BHIM, CFUPIIntentCheckout.CFUPIApps.PHONEPE))
    // OR use package names:
    // .setOrderUsingPackageName(Arrays.asList("com.dreamplug.androidapp", "in.org.npci.upiapp"))
    .build();

CFUPIIntentCheckoutPayment cfupiIntentCheckoutPayment = new CFUPIIntentCheckoutPayment.CFUPIIntentPaymentBuilder()
    .setSession(cfSession)
    .setCfUPIIntentCheckout(cfupiIntentCheckout)
    .setCfIntentTheme(cfTheme)
    .build();

CFPaymentGatewayService.getInstance().doPayment(YourActivity.this, cfupiIntentCheckoutPayment);
```

Kotlin:
```kotlin
val cfupiIntentCheckout = CFUPIIntentBuilder()
    .setOrder(Arrays.asList(CFUPIIntentCheckout.CFUPIApps.BHIM, CFUPIIntentCheckout.CFUPIApps.PHONEPE))
    .build()

val cfupiIntentCheckoutPayment = CFUPIIntentPaymentBuilder()
    .setSession(cfSession)
    .setCfUPIIntentCheckout(cfupiIntentCheckout)
    .setCfIntentTheme(cfTheme)
    .build()

CFPaymentGatewayService.getInstance().doPayment(this@YourActivity, cfupiIntentCheckoutPayment)
```

#### 2.4 Set Up Payment Callback

**IMPORTANT:** Set the callback in `onCreate()` — this also handles activity restart cases.

**Java:**
```java
public class YourActivity extends AppCompatActivity implements CFCheckoutResponseCallback {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_checkout);
        try {
            CFPaymentGatewayService.getInstance().setCheckoutCallback(this);
        } catch (CFException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onPaymentVerify(String orderID) {
        // Verify payment status from your backend
    }

    @Override
    public void onPaymentFailure(CFErrorResponse cfErrorResponse, String orderID) {
        // Handle payment failure
    }
}
```

**Kotlin:**
```kotlin
class YourActivity : AppCompatActivity(), CFCheckoutResponseCallback {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_checkout)
        try {
            CFPaymentGatewayService.getInstance().setCheckoutCallback(this)
        } catch (e: CFException) {
            e.printStackTrace()
        }
    }

    override fun onPaymentVerify(orderID: String) {
        Log.d("onPaymentVerify", "verifyPayment triggered")
    }

    override fun onPaymentFailure(cfErrorResponse: CFErrorResponse, orderID: String) {
        Log.e("onPaymentFailure $orderID", cfErrorResponse.message)
    }
}
```

#### Android Complete Sample (Web Checkout — Java)
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
        Log.d("WebCheckout", "Verify payment for: " + orderID);
    }

    @Override
    public void onPaymentFailure(CFErrorResponse cfErrorResponse, String orderID) {
        Log.e("WebCheckout", "Payment failed: " + cfErrorResponse.getMessage());
    }
}
```

---

### iOS Integration

#### 2.1 Install SDK

**Swift Package Manager (Recommended):**
1. Open project in Xcode
2. Go to **File > Add Package Dependencies**
3. Enter: `https://github.com/cashfree/core-ios-sdk.git`
4. Select version rule: **Up to Next Major Version**
5. Choose products:
   - `CashfreePG` — Complete SDK (recommended)
   - `CashfreePGCoreSDK` — Core payment processing
   - `CashfreePGUISDK` — UI components
   - `CashfreeAnalyticsSDK` — Analytics
   - `CFNetworkSDK` — Networking

**CocoaPods:**
```ruby
pod 'CashfreePG', '2.3.2'
```
Then run `pod install`.

#### iOS Configuration (Required for UPI Payments)
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

#### 2.2 Create Session

**Swift:**
```swift
do {
    let session = try CFSession.CFSessionBuilder()
        .setOrderID(order_id)
        .setPaymentSessionId(payment_session_id)
        .setEnvironment(.SANDBOX) // or .PRODUCTION
        .build()
} catch let e {
    let error = e as! CashfreeError
    print(error.localizedDescription)
}
```

**Objective-C:**
```objc
@try {
    CFSessionBuilder* sessionBuilder = [[CFSessionBuilder alloc] init];
    sessionBuilder = [sessionBuilder setPaymentSessionId:paymentSessionId];
    sessionBuilder = [sessionBuilder setOrderID:orderId];
    sessionBuilder = [sessionBuilder setEnvironment:CFENVIRONMENTPRODUCTION];
    CFSession* session = [sessionBuilder buildAndReturnError:nil];
} @catch (NSException *exception) {
    NSLog(@"%@", exception);
}
```

#### 2.3 Create Payment Object & Initiate

**Swift:**
```swift
let webCheckoutPayment = try CFWebCheckoutPayment.CFWebCheckoutPaymentBuilder()
    .setSession(session)
    .build()

try pgService.doPayment(webCheckoutPayment, viewController: self)
```

**Objective-C:**
```objc
@try {
    CFWebCheckoutPaymentBuilder* web = [[CFWebCheckoutPaymentBuilder alloc] init];
    web = [web setSession:session];
    CFWebCheckoutPayment* webPayment = [web buildAndReturnError:nil];
} @catch (NSException *exception) {
    NSLog(@"%@", exception);
}
```

#### 2.4 Set Up Payment Callback

**IMPORTANT:** Set the callback in `viewDidLoad`.

**Swift:**
```swift
import CashfreePG
import CashfreePGCoreSDK
import CashfreePGUISDK
import CashfreeAnalyticsSDK

class ViewController: UIViewController, CFResponseDelegate {

    let pgService = CFPaymentGatewayService.getInstance()

    override func viewDidLoad() {
        super.viewDidLoad()
        pgService.setCallback(self)
    }

    func onError(_ error: CFErrorResponse, order_id: String) {
        // Handle payment failure
        print("Error: \(error.message ?? "unknown")")
    }

    func verifyPayment(order_id: String) {
        // Verify payment status from your backend
        print("Verify payment for: \(order_id)")
    }
}
```

#### iOS Complete Sample (Swift)
```swift
import CashfreeAnalyticsSDK
import CashfreePG
import CashfreePGCoreSDK
import CashfreePGUISDK

class ViewController: UIViewController, CFResponseDelegate {

    let pgService = CFPaymentGatewayService.getInstance()

    override func viewDidLoad() {
        super.viewDidLoad()
        pgService.setCallback(self)
    }

    @IBAction func webCheckoutButtonTapped(_ sender: Any) {
        do {
            let session = try CFSession.CFSessionBuilder()
                .setPaymentSessionId(payment_session_id)
                .setOrderID(order_id)
                .setEnvironment(.SANDBOX)
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
        print("Error: \(error.status ?? "ERROR") - \(error.message ?? "unknown")")
    }

    func verifyPayment(order_id: String) {
        print("Verify payment for: \(order_id)")
    }
}
```

---

### Flutter Integration

#### 2.1 Install SDK
```yaml
# pubspec.yaml
dependencies:
  flutter_cashfree_pg_sdk: 2.2.10+48
```

#### iOS Configuration
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
</array>
```

#### 2.2 Create Session
```dart
CFSession? createSession() {
  try {
    var session = CFSessionBuilder()
        .setEnvironment(CFEnvironment.SANDBOX)
        .setOrderId(orderId)
        .setPaymentSessionId(paymentSessionId)
        .build();
    return session;
  } on CFException catch (e) {
    print(e.message);
  }
  return null;
}
```

#### 2.3 Create Payment Object & Initiate
```dart
var cfWebCheckout = CFWebCheckoutPaymentBuilder()
    .setSession(session!)
    .build();

cfPaymentGatewayService.doPayment(cfWebCheckout);
```

#### 2.4 Set Up Payment Callback
```dart
var cfPaymentGatewayService = CFPaymentGatewayService();

@override
void initState() {
  super.initState();
  cfPaymentGatewayService.setCallback(verifyPayment, onError);
}

void verifyPayment(String orderId) {
  print("Verify Payment for: $orderId");
}

void onError(CFErrorResponse errorResponse, String orderId) {
  print(errorResponse.getMessage());
  print("Error while making payment");
}
```

#### Flutter Complete Sample
```dart
class _MyAppState extends State<MyApp> {

  var cfPaymentGatewayService = CFPaymentGatewayService();

  @override
  void initState() {
    super.initState();
    cfPaymentGatewayService.setCallback(verifyPayment, onError);
  }

  void verifyPayment(String orderId) {
    print("Verify Payment");
  }

  void onError(CFErrorResponse errorResponse, String orderId) {
    print(errorResponse.getMessage());
    print("Error while making payment");
  }

  webCheckout() async {
    try {
      var session = createSession();
      var cfWebCheckout = CFWebCheckoutPaymentBuilder().setSession(session!).build();
      cfPaymentGatewayService.doPayment(cfWebCheckout);
    } on CFException catch (e) {
      print(e.message);
    }
  }

  CFSession? createSession() {
    try {
      var session = CFSessionBuilder()
          .setEnvironment(CFEnvironment.SANDBOX)
          .setOrderId(orderId)
          .setPaymentSessionId(paymentSessionId)
          .build();
      return session;
    } on CFException catch (e) {
      print(e.message);
    }
    return null;
  }
}
```

---

### React Native Integration

#### 2.1 Install SDK

**npm:**
```bash
npm install react-native-cashfree-pg-sdk
```

**Yarn:**
```bash
yarn add react-native-cashfree-pg-sdk
```

**Expo:**
```bash
npx expo install react-native-cashfree-pg-sdk
npx expo install expo-dev-client
npx expo prebuild  # mandatory for expo
npx expo run:android
npx expo run:ios
```

#### iOS Configuration
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
</array>
```

Then run:
```bash
cd ios
pod install --repo-update
```

#### 2.2 Create Session
```typescript
import {
  CFEnvironment,
  CFSession,
} from 'cashfree-pg-api-contract';

try {
  const session = new CFSession(
    'payment_session_id',
    'order_id',
    CFEnvironment.SANDBOX
  );
} catch (e: any) {
  console.log(e.message);
}
```

#### 2.3a Web Checkout Flow
```typescript
async _startWebCheckout() {
  try {
    const session = new CFSession(
      'payment_session_id',
      'order_id',
      CFEnvironment.SANDBOX
    );
    CFPaymentGatewayService.doWebPayment(session);
  } catch (e: any) {
    console.log(e.message);
  }
}
```

#### 2.3b UPI Intent Checkout Flow
```typescript
import {
  CFThemeBuilder,
  CFUPIIntentCheckoutPayment,
} from 'cashfree-pg-api-contract';

async _startUPICheckout() {
  try {
    const session = new CFSession(
      'payment_session_id',
      'order_id',
      CFEnvironment.SANDBOX
    );
    const theme = new CFThemeBuilder()
      .setNavigationBarBackgroundColor('#E64A19') // iOS
      .setNavigationBarTextColor('#FFFFFF')       // iOS
      .setButtonBackgroundColor('#FFC107')        // iOS
      .setButtonTextColor('#FFFFFF')              // iOS
      .setPrimaryTextColor('#212121')
      .setSecondaryTextColor('#757575')           // iOS
      .build();
    const upiPayment = new CFUPIIntentCheckoutPayment(session, theme);
    CFPaymentGatewayService.doUPIPayment(upiPayment);
  } catch (e: any) {
    console.log(e.message);
  }
}
```

#### 2.4 Set Up Payment Callback

**IMPORTANT:** Set callback in `componentDidMount` and remove in `componentWillUnmount`. Always call `setCallback` before `doPayment`.

```typescript
import {
  CFErrorResponse,
  CFPaymentGatewayService,
} from 'react-native-cashfree-pg-sdk';

export default class App extends Component {
  constructor() {
    super();
  }

  componentDidMount() {
    CFPaymentGatewayService.setCallback({
      onVerify(orderID: string): void {
        console.log('orderId is: ' + orderID);
      },
      onError(error: CFErrorResponse, orderID: string): void {
        console.log('exception is: ' + JSON.stringify(error) + '\norderId is: ' + orderID);
      },
    });
  }

  componentWillUnmount() {
    CFPaymentGatewayService.removeCallback();
  }
}
```

---

### Cordova / Capacitor Integration

#### 2.1 Install SDK

**Cordova:**
```bash
npm install cordova-plugin-cashfree-pg
# or
npm install cordova-plugin-cashfree-pg@latest

# Add Plugin
cordova plugin add cordova-plugin-cashfree-pg

# With Ionic Cordova
ionic cordova plugin add cordova-plugin-cashfree-pg
```

**Capacitor:**
```bash
npm install cordova-plugin-cashfree-pg@capacitor

# Ionic Capacitor setup
npm install @awesome-cordova-plugins/core
npm install @awesome-cordova-plugins/cashfree-pg
ionic cap sync
```

#### iOS Configuration
Add to `info.plist`:
```xml
<key>LSApplicationQueriesSchemes</key>
<array>
    <string>tez</string>
    <string>phonepe</string>
    <string>paytmmp</string>
    <string>credpay</string>
    <string>bhim</string>
    <string>amazonpay</string>
    <string>upi</string>
    <string>navipay</string>
    <string>mobikwik</string>
    <string>myairtel</string>
    <string>popclubapp</string>
    <string>super</string>
    <string>kiwi</string>
</array>
```

Then run:
```bash
cd ios
pod install --repo-update
```

#### 2.2 Create Session
```javascript
let session = {
  payment_session_id: "payment_session_id",
  orderID: "order_id",
  environment: "SANDBOX", // "SANDBOX" or "PRODUCTION"
};
```

#### 2.3a Web Checkout Flow
```javascript
let webCheckoutPaymentObject = {
  theme: {
    navigationBarBackgroundColor: "#E64A19",
    navigationBarTextColor: "#FFFFFF",
  },
  session: {
    payment_session_id: "payment_session_id",
    orderID: "order_id",
    environment: "SANDBOX",
  },
};

function initiateWebPayment() {
  CFPaymentGateway.doWebCheckoutPayment(webCheckoutPaymentObject);
}
```

#### 2.3b UPI Intent Checkout Flow
```javascript
let upiIntentCheckoutPaymentObject = {
  theme: {
    navigationBarBackgroundColor: "#E64A19", // iOS
    navigationBarTextColor: "#FFFFFF",       // iOS
    buttonBackgroundColor: "#FFC107",        // iOS
    buttonTextColor: "#FFFFFF",              // iOS
    primaryTextColor: "#212121",
    secondaryTextColor: "#757575",           // iOS
  },
  session: {
    payment_session_id: "payment_session_id",
    orderID: "order_id",
    environment: "SANDBOX",
  },
};

function initiateUPIPayment() {
  CFPaymentGateway.doUPIPayment(upiIntentCheckoutPaymentObject);
}
```

#### 2.4 Set Up Payment Callback

**IMPORTANT:** Always call `setCallback` before calling `doPayment`.

```javascript
document.addEventListener("deviceready", onDeviceReady, false);

function onDeviceReady() {
  const callbacks = {
    onVerify: function (result) {
      let details = {
        orderID: result.orderID,
      };
      console.log(details);
    },
    onError: function (error) {
      let errorObj = {
        orderID: error.orderID,
        status: error.status,
        code: error.code,
        type: error.type,
        message: error.message,
      };
      console.log(errorObj);
    },
  };
  CFPaymentGateway.setCallback(callbacks);
}
```

#### Cordova Complete Sample
```javascript
document.addEventListener("deviceready", onDeviceReady, false);

function onDeviceReady() {
  console.log("Running cordova-" + cordova.platformId + "@" + cordova.version);
  let webElement = document.getElementById("onWeb");
  webElement.addEventListener("click", (e) => initiateWebPayment());

  const callbacks = {
    onVerify: function (result) {
      console.log({ orderID: result.orderID });
    },
    onError: function (error) {
      console.log({
        orderID: error.orderID,
        status: error.status,
        code: error.code,
        type: error.type,
        message: error.message,
      });
    },
  };
  CFPaymentGateway.setCallback(callbacks);
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
      environment: "SANDBOX",
    },
  });
}
```

---

## Step 3: Confirm Payment (Server-Side — All Platforms)

**IMPORTANT:** Always verify the order status from your backend before delivering goods/services. An order is successful when `order_status` is `PAID`.

**Endpoint:** `GET /orders/{order_id}`

**Node.js:**
```javascript
cashfree
  .PGFetchOrder("<order_id>")
  .then((response) => {
    console.log("Order fetched successfully:", response.data);
    // Check response.data.order_status: "PAID", "ACTIVE", "EXPIRED"
  })
  .catch((error) => {
    console.error("Error:", error.response.data.message);
  });
```

**Python:**
```python
try:
    api_response = Cashfree().PGFetchOrder(x_api_version, "<order_id>", None)
    print(api_response.data)
except Exception as e:
    print(e)
```

**Java:**
```java
try {
    Cashfree cashfree = new Cashfree();
    ApiResponse<OrderEntity> responseFetchOrder = cashfree.PGFetchOrder("2023-08-01", "<order_id>", null, null, null);
    System.out.println(response.getData().getOrderId());
} catch (ApiException e) {
    throw new RuntimeException(e);
}
```

**Go:**
```go
version := "2023-08-01"
response, httpResponse, err := cashfree.PGFetchOrder(&version, "<order_id>", nil, nil, nil)
if err != nil {
    fmt.Println(err.Error())
} else {
    fmt.Println(httpResponse.StatusCode)
    fmt.Println(response)
}
```

**cURL:**
```bash
curl --request GET \
     --url https://sandbox.cashfree.com/pg/orders/{order_id} \
     --header 'accept: application/json' \
     --header 'x-api-version: 2025-01-01' \
     --header 'x-client-id: YOUR_APP_ID' \
     --header 'x-client-secret: YOUR_SECRET_KEY'
```

---

## Webhook Integration

### Webhook Events

| Event | Description |
|-------|-------------|
| `PAYMENT_SUCCESS_WEBHOOK` | Payment completed successfully |
| `PAYMENT_FAILED_WEBHOOK` | Payment failed |
| `PAYMENT_USER_DROPPED_WEBHOOK` | User dropped off during payment |
| `REFUND_STATUS_WEBHOOK` | Refund status update |
| `SETTLEMENT_WEBHOOK` | Settlement processed |

### Webhook Signature Verification (REQUIRED)

Always verify webhook signatures before processing. Use the SDK method or manual HMAC-SHA256 verification.

**Node.js (Using SDK):**
```javascript
const { Cashfree } = require("cashfree-pg");

try {
  Cashfree.PGVerifyWebhookSignature(
    req.headers["x-webhook-signature"],
    req.rawBody,
    req.headers["x-webhook-timestamp"]
  );
} catch (err) {
  console.log("Invalid signature:", err.message);
}
```

### IPs to Whitelist

**Sandbox:** `52.66.25.127`, `15.206.45.168`

**Production:** `52.66.101.190`, `3.109.102.144`, `18.60.134.245`, `18.60.183.142`

**Port:** 443 (HTTPS only)

---

## Payment Status Values

| Status | Description |
|--------|-------------|
| `SUCCESS` | Payment completed successfully |
| `FAILED` | Payment failed |
| `PENDING` | Payment awaiting confirmation |
| `NOT_ATTEMPTED` | No payment attempt made |
| `USER_DROPPED` | User abandoned payment |
| `FLAGGED` | Risk identified with the transaction |
| `CANCELLED` | Success response received post time-to-live; amount reversed |
| `VOID` | Transaction amount not captured (pre-auth/UPI mandates) |

---

## SDK Error Codes (Common Across Platforms)

| Error Code | Message |
|------------|---------|
| `MISSING_CALLBACK` | The callback is missing in the request |
| `ORDER_ID_MISSING` | The "order_id" is missing in the request |
| `SESSION_OBJECT_MISSING` | The "session" is missing in the request |
| `PAYMENT_OBJECT_MISSING` | The "payment" is missing in the request |
| `ENVIRONMENT_MISSING` | The "environment" is missing in the request |
| `ORDER_TOKEN_MISSING` | The "order_token" is missing in the request |
| `INVALID_WEB_DATA` | The URL seems to be corrupt. Please reinstantiate the order |
| `CARD_NUMBER_MISSING` | The "card_number" is missing in the request |
| `CARD_EXPIRY_MONTH_MISSING` | The "card_expiry_mm" is missing in the request |
| `CARD_EXPIRY_YEAR_MISSING` | The "card_expiry_yy" is missing in the request |
| `CARD_CVV_MISSING` | The "card_cvv" is missing in the request |
| `UPI_ID_MISSING` | The "upi_id" is missing in the request |
| `INVALID_UPI_APP_ID_SENT` | The id sent is invalid |
| `CARD_EMI_TENURE_MISSING` | The "emi_tenure" is missing or invalid |
| `WALLET_OBJECT_MISSING` | The CFWallet object is missing in the request |
| `NETBANKING_OBJECT_MISSING` | The CFNetbanking object is missing in the request |
| `UPI_OBJECT_MISSING` | The CFUPI object is missing in the request |
| `CARD_OBJECT_MISSING` | The CFCard object is missing in the request |

---

## Cashfree Integrity (Production App Testing)

When testing in **Production**, apps installed from sources other than the Play Store will be blocked by Cashfree's integrity check:

```json
{
  "message": "com.google.android.packageinstaller is not a trusted source. App should be installed from play store or another whitelisted app store.",
  "code": "installer_package_not_approved",
  "type": "feature_not_enabled"
}
```

**Affected SDKs:** Android, React Native, Flutter, Cordova, Ionic, Capacitor

**Note:** In Sandbox, integrity checks always pass.

### How to Test in Production
1. Upload your app bundle/APK to the **Play Store Internal Testing** track.
2. Create a tester email list in Play Console > Internal Testing > Testers tab.
3. Share the invitation link with testers.
4. Testers accept the invitation and download the app from the Play Store.
5. Ensure the Android device has **Developer Mode** enabled.

---

## Security Checklist

- [ ] Never expose secret key in mobile app code
- [ ] Always create orders from your backend server
- [ ] Always verify webhook signatures before processing
- [ ] Always verify payment status from backend (GET /orders) before fulfilling orders
- [ ] Whitelist your domain in Merchant Dashboard
- [ ] Use HTTPS endpoints for webhooks
- [ ] Whitelist Cashfree IPs for webhook endpoints
- [ ] Implement idempotency for webhook handlers
- [ ] Ensure app complies with Cashfree Integrity standards for production
- [ ] Add `LSApplicationQueriesSchemes` to iOS `info.plist` for UPI support
- [ ] Set callbacks in `onCreate` (Android) / `viewDidLoad` (iOS) / `initState` (Flutter) / `componentDidMount` (React Native) / `onDeviceReady` (Cordova)

---

## Testing

- Use **Sandbox** environment for development and testing
- Test cards and UPI IDs available in Cashfree documentation
- Verify webhook delivery in **Dashboard > Developers > Webhooks**
- For production testing on Android, use Play Store Internal Testing track

---

## Useful Links

- [Android Integration](https://www.cashfree.com/docs/payments/online/mobile/android)
- [iOS Integration](https://www.cashfree.com/docs/payments/online/mobile/ios)
- [Flutter Integration](https://www.cashfree.com/docs/payments/online/mobile/flutter)
- [React Native Integration](https://www.cashfree.com/docs/payments/online/mobile/react-native)
- [Cordova Integration](https://www.cashfree.com/docs/payments/online/mobile/cordova)
- [Integrity Prod Testing](https://www.cashfree.com/docs/payments/online/mobile/misc/cashfree_integrity_prod_testing)
- [Integration FAQs](https://www.cashfree.com/docs/payments/online/mobile/integration-faqs)
- [Cashfree Dev Studio](https://www.cashfree.com/devstudio)
- [GitHub SDKs](https://github.com/cashfree/)
- [Flutter SDK on pub.dev](https://pub.dev/packages/flutter_cashfree_pg_sdk)
- [React Native SDK on npm](https://www.npmjs.com/package/react-native-cashfree-pg-sdk)
- [Cordova SDK on npm](https://www.npmjs.com/package/cordova-plugin-cashfree-pg)

