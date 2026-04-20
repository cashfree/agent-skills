---
name: Cashfree Payment Gateway - Backend SDK Integration
description: >
  Use when integrating Cashfree Payments with a backend app using the official SDK.
  Triggers: integrate Cashfree Payments, integrate Cashfree with my app, add Cashfree Payments,
  Cashfree Node.js SDK, cashfree-pg npm, Cashfree Python SDK, Cashfree Java SDK, Cashfree Go SDK,
  add payments to Express, Next.js payment gateway, NestJS checkout, integrate Cashfree in Node,
  accept payments in Python, Django payments, Flask checkout, FastAPI payment gateway,
  Spring Boot payments, Go payment integration, install Cashfree SDK, npm install cashfree,
  pip install cashfree, PGCreateOrder, Cashfree SDK setup, initialise Cashfree.
  Prefer over the S2S API skill when using Node.js, Python, Java, or Go.
---

# Cashfree Payment Gateway — Backend SDK Integration

> **References available:** This SKILL.md covers installation, initialization, and the core accept-payment flow. For the complete SDK method map, refunds, settlements, payment links, pre-authorization, token vault, and S2S payment — read `references/REFERENCE.md` in this directory.

---

## 1. Scope & Boundaries

### When to use this skill

- The developer is integrating Cashfree Payment Gateway using an **official server-side SDK** — Node.js, Python, Java, Go, PHP, or .NET.
- The developer needs SDK installation, credential configuration, or specific SDK method calls (`PGCreateOrder`, `PGFetchOrder`, `PGVerifyWebhookSignature`, etc.).
- The developer is building the **backend portion** — creating orders, verifying payment status, processing refunds, handling webhooks.

### When NOT to use this skill

- Raw HTTP/REST calls without SDK (cURL, `fetch`, `axios`) → use the S2S REST API skill.
- Mobile app integration (Android, iOS, Flutter, React Native) → use the Mobile SDK skill.
- Cashfree Checkout JS / Drop-in on web frontend → use the Web Checkout skill.
- Payouts, Subscriptions, Token Vault standalone, Verification Suite, Secure ID → separate skills.

---

## 2. Supported SDKs

| Language | Package | Install Command |
|---|---|---|
| **Node.js** | `cashfree-pg` (npm) | `npm install cashfree-pg` |
| **Python** | `cashfree-pg` (PyPI) | `pip install cashfree-pg` |
| **Java** | `com.cashfree.pg:cashfree-pg` (Maven Central) | Maven/Gradle (see Section 4) |
| **Go** | `github.com/cashfree/cashfree-pg/v4` | `go get github.com/cashfree/cashfree-pg/v4` |
| **PHP** | `cashfree/cashfree-pg` (Packagist) | `composer require cashfree/cashfree-pg` |
| **.NET** | `cashfree_pg` (NuGet) | `dotnet add package cashfree_pg` |

### API Environments

| Environment | SDK Constant |
|---|---|
| Sandbox | `CFEnvironment.SANDBOX` (Node.js) / `Cashfree.SANDBOX` (Python/Java) |
| Production | `CFEnvironment.PRODUCTION` (Node.js) / `Cashfree.PRODUCTION` (Python/Java) |

### API Version

Set `cashfree.XApiVersion = "2025-01-01"` once after initialization (Node.js v5). Other language SDKs pass version as the first parameter.

---

## 3. SDK Initialization

Configure once at application startup. Store credentials in environment variables — **never hardcode**.

**Node.js (v5+):**
```javascript
import { Cashfree, CFEnvironment } from "cashfree-pg";

const cashfree = new Cashfree(
  CFEnvironment.SANDBOX, // or CFEnvironment.PRODUCTION
  process.env.CASHFREE_APP_ID,
  process.env.CASHFREE_SECRET_KEY
);
```

**Python:**
```python
from cashfree_pg.api_client import Cashfree
from cashfree_pg.models import *

Cashfree.XClientId = "<app_id>"
Cashfree.XClientSecret = "<secret_key>"
Cashfree.XEnvironment = Cashfree.SANDBOX  # or Cashfree.PRODUCTION
```

**Java (Maven):**
```xml
<dependency>
  <groupId>com.cashfree.pg</groupId>
  <artifactId>cashfree-pg</artifactId>
  <version>LATEST</version>
</dependency>
```
```java
import com.cashfree.*;

Cashfree.XClientId = "<app_id>";
Cashfree.XClientSecret = "<secret_key>";
Cashfree.XEnvironment = Cashfree.SANDBOX; // or Cashfree.PRODUCTION
```

**Go:**
```go
import cashfree "github.com/cashfree/cashfree-pg/v4"

clientId := "<app_id>"
clientSecret := "<secret_key>"
cashfree.XClientId = &clientId
cashfree.XClientSecret = &clientSecret
cashfree.XEnvironment = cashfree.SANDBOX // or cashfree.PRODUCTION
```

**PHP:**
```php
use Cashfree\Cashfree;

Cashfree::$XClientId = "<app_id>";
Cashfree::$XClientSecret = "<secret_key>";
Cashfree::$XEnvironment = Cashfree::$SANDBOX; // or Cashfree::$PRODUCTION
```

**.NET:**
```csharp
using cashfree_pg.Client;
using cashfree_pg.Model;

Cashfree.XClientId = "<app_id>";
Cashfree.XClientSecret = "<secret_key>";
Cashfree.XEnvironment = Cashfree.SANDBOX; // or Cashfree.PRODUCTION
```

---

## 4. Core Workflow: Create Order → Checkout → Verify

### Step 1: Create Order

Call `PGCreateOrder`. Returns `payment_session_id` which your frontend/mobile app uses for checkout.

**Required fields:** `order_amount`, `order_currency`, `customer_details.customer_id`, `customer_details.customer_phone`

<details>
<summary>Node.js</summary>

```javascript
async function createOrder() {
  const request = {
    order_amount: 100.00,
    order_currency: "INR",
    order_id: "order_" + Date.now(),
    customer_details: {
      customer_id: "customer_123",
      customer_phone: "9999999999",
      customer_email: "customer@example.com",
      customer_name: "John Doe"
    },
    order_meta: {
      return_url: "https://yoursite.com/return/{order_id}",
      notify_url: "https://yoursite.com/webhook"
    }
  };
  try {
    const response = await cashfree.PGCreateOrder(request);
    return response.data; // response.data.payment_session_id → send to frontend
  } catch (error) {
    console.error("Error:", error.response?.data);
  }
}
```
</details>

<details>
<summary>Python</summary>

```python
from cashfree_pg.models import CreateOrderRequest, CustomerDetails, OrderMeta

def create_order():
    request = CreateOrderRequest(
        order_amount=100.00,
        order_currency="INR",
        order_id="order_" + str(int(time.time())),
        customer_details=CustomerDetails(
            customer_id="customer_123",
            customer_phone="9999999999",
            customer_email="customer@example.com"
        ),
        order_meta=OrderMeta(
            return_url="https://yoursite.com/return/{order_id}",
            notify_url="https://yoursite.com/webhook"
        )
    )
    response = Cashfree.PGCreateOrder("2025-01-01", request)
    return response.data
```
</details>

<details>
<summary>Java</summary>

```java
import com.cashfree.*;
import com.cashfree.model.*;

public OrderEntity createOrder() throws Exception {
    CustomerDetails customerDetails = new CustomerDetails();
    customerDetails.setCustomerId("customer_123");
    customerDetails.setCustomerPhone("9999999999");

    OrderMeta orderMeta = new OrderMeta();
    orderMeta.setReturnUrl("https://yoursite.com/return/{order_id}");
    orderMeta.setNotifyUrl("https://yoursite.com/webhook");

    CreateOrderRequest request = new CreateOrderRequest();
    request.setOrderAmount(100.00);
    request.setOrderCurrency("INR");
    request.setCustomerDetails(customerDetails);
    request.setOrderMeta(orderMeta);

    Cashfree cashfree = new Cashfree();
    ApiResponse<OrderEntity> response = cashfree.PGCreateOrder("2025-01-01", request, null, null, null);
    return response.getData();
}
```
</details>

<details>
<summary>Go</summary>

```go
func createOrder() (*cashfree.OrderEntity, error) {
    xApiVersion := "2025-01-01"
    returnUrl := "https://yoursite.com/return/{order_id}"
    notifyUrl := "https://yoursite.com/webhook"

    request := cashfree.CreateOrderRequest{
        OrderAmount:   100.00,
        OrderCurrency: "INR",
        CustomerDetails: cashfree.CustomerDetails{
            CustomerId:    "customer_123",
            CustomerPhone: "9999999999",
        },
        OrderMeta: &cashfree.OrderMeta{
            ReturnUrl: &returnUrl,
            NotifyUrl: &notifyUrl,
        },
    }
    response, _, err := cashfree.PGCreateOrder(&xApiVersion, &request, nil, nil, nil)
    return response, err
}
```
</details>

<details>
<summary>PHP</summary>

```php
function createOrder() {
    $customerDetails = new CustomerDetails();
    $customerDetails->setCustomerId("customer_123");
    $customerDetails->setCustomerPhone("9999999999");

    $request = new CreateOrderRequest();
    $request->setOrderAmount(100.00);
    $request->setOrderCurrency("INR");
    $request->setCustomerDetails($customerDetails);

    $cashfree = new Cashfree();
    return $cashfree->PGCreateOrder("2025-01-01", $request);
}
```
</details>

<details>
<summary>.NET</summary>

```csharp
public async Task<OrderEntity> CreateOrder() {
    var customerDetails = new CustomerDetails(
        customerId: "customer_123",
        customerPhone: "9999999999"
    );
    var request = new CreateOrderRequest(
        orderAmount: 100.00,
        orderCurrency: "INR",
        customerDetails: customerDetails
    );
    var response = await Cashfree.PGCreateOrder("2025-01-01", request);
    return response.Data;
}
```
</details>

### Step 2: Frontend/Mobile Checkout

Your frontend or mobile app uses `payment_session_id` to open Cashfree Checkout. Handled by the Web Checkout JS skill or Mobile SDK skill.

### Step 3: Verify Payment (MANDATORY)

After checkout, always verify from your backend before fulfilling.

Call `PGFetchOrder`:

| Status | Meaning |
|---|---|
| `PAID` | Payment completed — safe to fulfill |
| `ACTIVE` | Still awaiting payment |
| `EXPIRED` | Expired with no successful payment |

```javascript
// Node.js
const response = await cashfree.PGFetchOrder(orderId);
console.log(response.data.order_status); // "PAID"
```

```python
# Python
response = Cashfree.PGFetchOrder("2025-01-01", order_id)
print(response.data.order_status)
```

```java
// Java
Cashfree cashfree = new Cashfree();
ApiResponse<OrderEntity> response = cashfree.PGFetchOrder("2025-01-01", orderId, null, null, null);
System.out.println(response.getData().getOrderStatus());
```

```go
// Go
xApiVersion := "2025-01-01"
response, _, err := cashfree.PGFetchOrder(&xApiVersion, &orderId, nil, nil, nil)
```

### Step 4: Process Webhooks

Cashfree sends async notifications to your configured endpoint.

**CRITICAL:** Always verify webhook signatures. Use the raw request body, NOT parsed JSON.

**SDK verification (recommended):**

```javascript
// Node.js (Express)
app.post('/webhook', express.raw({ type: "application/json" }), (req, res) => {
  try {
    cashfree.PGVerifyWebhookSignature(
      req.headers["x-webhook-signature"],
      req.body.toString(),
      req.headers["x-webhook-timestamp"]
    );
    const payload = JSON.parse(req.body);
    // Process payload.type: PAYMENT_SUCCESS_WEBHOOK, etc.
    res.status(200).send("OK");
  } catch (err) {
    res.status(400).send("Invalid signature");
  }
});
```

```python
# Python (Flask)
@app.route('/webhook', methods=['POST'])
def webhook():
    cashfree = Cashfree()
    cashfree.XClientId = "<app_id>"
    cashfree.XClientSecret = "<secret_key>"
    try:
        cashfree.PGVerifyWebhookSignature(
            request.headers['x-webhook-signature'],
            request.data.decode('utf-8'),
            request.headers['x-webhook-timestamp']
        )
        return "OK", 200
    except:
        return "Invalid signature", 400
```

**Requirements:** Return HTTP 200. Use `x-idempotency-key` for deduplication. Process async for long-running operations.

---

## 5. Security Constraints — Never Violate

- **Never expose `x-client-secret` in frontend/client-side code.**
- **Never fulfill an order based solely on frontend callbacks.** Always call `PGFetchOrder` from your backend.
- **Never process a webhook without verifying its signature.**
- **Always use the raw request body for webhook verification.** Parsing JSON can change `170.00` → `170`, breaking the signature.
- **Store credentials in environment variables**, never hardcoded.

---

## 6. Testing

- Use Sandbox environment for all development.
- Test credentials available in Dashboard > Developers > API Keys (Sandbox).
- Test cards and UPI IDs in the validation-and-testing skill.

> **Read `references/REFERENCE.md` for:** complete SDK method map, refunds (`PGOrderCreateRefund`), payment links (`PGCreateLink`), settlements (`PGFetchSettlements`), pre-authorization (`PGAuthorizeOrder`), token vault (`PGCustomerFetchInstruments`), S2S payment (`PGPayOrder`), and error handling patterns.
