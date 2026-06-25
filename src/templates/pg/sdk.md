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
| **Java** | `com.cashfree.pg.java:cashfree_pg` (Maven Central) | Maven/Gradle (see Section 4) |
| **Go** | `github.com/cashfree/cashfree-pg/v6` | `go get github.com/cashfree/cashfree-pg/v6` |
| **PHP** | `cashfree/cashfree-pg` (Packagist) | `composer require cashfree/cashfree-pg` |
| **.NET** | `cashfree_pg` (NuGet) | `dotnet add package cashfree_pg` |

### API Environments

| Environment | SDK Constant |
|---|---|
| Sandbox | `CFEnvironment.SANDBOX` (Node.js) / `Cashfree.SANDBOX` (Python/Java) |
| Production | `CFEnvironment.PRODUCTION` (Node.js) / `Cashfree.PRODUCTION` (Python/Java) |

### API Version

**The current SDK majors (Node, Python v5+, Java v5+/6.x, Go v6, PHP v6, .NET v5) all use the same call style: build a client instance with credentials, then call methods WITHOUT a version argument.** The instance carries the version; you do not pass `x-api-version` per call.

- **Node:** `new Cashfree(CFEnvironment.SANDBOX, id, secret)` → `cashfree.PGCreateOrder(request)`
- **Python:** `Cashfree(XEnvironment=Cashfree.SANDBOX, XClientId=id, XClientSecret=secret)` → `cashfree.PGCreateOrder(request, None, None)`
- **Java:** `new Cashfree(Cashfree.SANDBOX, id, secret, null, null, null)` → `cashfree.PGCreateOrder(request, null, null, null)`
- **PHP:** `new \Cashfree\Cashfree(\Cashfree\Cashfree::$SANDBOX, id, secret, "", "", "", true)` → `$cashfree->PGCreateOrder($request)`
- **.NET:** `new Cashfree(Cashfree.SANDBOX, id, secret, null, null, null, null)` → `cashfree.PGCreateOrder(request, null, null, null)`

> **Legacy (pre-v5) style — do not use on current SDKs.** Older SDK majors set credentials statically (`Cashfree.XClientId = …`) and passed the API version as the **first positional argument of every method** (`cashfree.PGCreateOrder("2023-08-01", request, …)` / `$cashfree->PGCreateOrder($x_api_version, $request)`). Current-major method signatures do **not** accept that leading version argument — calling it that way will not compile. If you see version-first examples, they target an SDK below v5.

**Bundled default vs published version — pin if it matters.** The current SDK source hardcodes `x-api-version = "2026-01-01"` as its internal default. But the latest **published** REST API version is **`2025-01-01` (v5)** — `2026-01-01` is not in Cashfree's public docs / OpenAPI / version switcher. If your code depends on the documented v5 response contract, pin the version explicitly by setting the client's `XApiVersion` before making calls:

```javascript
// Node
const cashfree = new Cashfree(CFEnvironment.SANDBOX, id, secret);
cashfree.XApiVersion = "2025-01-01";   // pin to the published v5 contract
```

```java
// Java
Cashfree cashfree = new Cashfree(Cashfree.SANDBOX, id, secret, null, null, null);
cashfree.XApiVersion = "2025-01-01";   // public field, default "2026-01-01"
```

See the `changelog` skill → `references/pg-api-versions.md` for the full reconciliation.

---

## 3. SDK Initialization

Configure once at application startup. Store credentials in environment variables — **never hardcode**.

**Node.js (v6+):**
```javascript
import { Cashfree, CFEnvironment } from "cashfree-pg";

const cashfree = new Cashfree(
  CFEnvironment.SANDBOX, // or CFEnvironment.PRODUCTION
  process.env.CASHFREE_APP_ID,
  process.env.CASHFREE_SECRET_KEY
);
// XApiVersion defaults to "2026-01-01" — override only if you need an older API version.
```

**Python (v6+):**
```python
from cashfree_pg.api_client import Cashfree
from cashfree_pg.models import *

cashfree = Cashfree(
    XEnvironment=Cashfree.SANDBOX,  # or Cashfree.PRODUCTION
    XClientId="<app_id>",
    XClientSecret="<secret_key>",
)
```

**Java (Maven):**
```xml
<dependency>
  <groupId>com.cashfree.pg.java</groupId>
  <artifactId>cashfree_pg</artifactId>
  <version>6.0.2</version>
</dependency>
```
```java
import com.cashfree.pg.*;

Cashfree cashfree = new Cashfree(
    Cashfree.SANDBOX,            // or Cashfree.PRODUCTION
    "<app_id>",
    "<secret_key>",
    null, null, null             // partner api key, partner merchant id, client signature
);
// cashfree.XApiVersion defaults to "2026-01-01" — set to "2025-01-01" to pin the published v5 contract.
```

**Go (v6+):**
```go
import cashfreepg "github.com/cashfree/cashfree-pg/v6"

xClientId := "<app_id>"
xClientSecret := "<secret_key>"

cashfree := cashfreepg.Cashfree{
    XEnvironment:  cashfreepg.SANDBOX, // or cashfreepg.PRODUCTION
    XClientID:     &xClientId,
    XClientSecret: &xClientSecret,
}
```

**PHP:**
```php
$cashfree = new \Cashfree\Cashfree(
    \Cashfree\Cashfree::$SANDBOX,   // or \Cashfree\Cashfree::$PRODUCTION
    "<app_id>",
    "<secret_key>",
    "", "", "",                     // partner api key, partner merchant id, client signature
    true                            // enable error analytics
);
```

**.NET:**
```csharp
using cashfree_pg.Client;
using cashfree_pg.Model;

var cashfree = new Cashfree(
    Cashfree.SANDBOX,               // or Cashfree.PRODUCTION
    "<app_id>",
    "<secret_key>",
    null, null, null, null          // partner api key, partner merchant id, client signature, OAuth token
);
```

---

## 4. Core Workflow: Create Order → Checkout → Verify

### Step 1: Create Order

Call `PGCreateOrder`. Returns `payment_session_id` which your frontend/mobile app uses for checkout.

**Required fields:** `order_amount`, `order_currency`, `customer_details.customer_id`, `customer_details.customer_phone`

**About `return_url`** — keep it simple. Cashfree **automatically appends** `?order_id=ORDER_ID` (and `&order_token=…`) to whatever URL you pass. Use a static path and read the order id from query string on your handler:

```python
# Flask
@app.route('/return')
def handle_return():
    order_id = request.args.get('order_id')
    # ... call PGFetchOrder(order_id) and render based on order_status
```

Cashfree also supports a server-side substitution token `{order_id}` inside the URL (Cashfree's server replaces it before redirect). Two gotchas to flag:
- **Python f-strings:** `f"…/return/{order_id}"` will try to interpolate a local Python variable named `order_id`. If you actually want the literal Cashfree token, escape it: `f"…/return/{{order_id}}"`. Easier: use a non-f-string.
- **Flask path params:** if your route is `/return/<order_id>`, the literal string `{order_id}` will not match the path converter — the redirect lands on a 404 or your fallback route. Prefer the static `/return` + query-param pattern above.

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
      return_url: "https://yoursite.com/return",   // Cashfree appends ?order_id=ORDER_ID automatically
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
<summary>Python (v6+)</summary>

```python
from cashfree_pg.models.create_order_request import CreateOrderRequest
from cashfree_pg.models.customer_details import CustomerDetails
from cashfree_pg.models.order_meta import OrderMeta

def create_order():
    request = CreateOrderRequest(
        order_amount=100.00,
        order_currency="INR",
        order_id="order_" + str(int(time.time())),
        customer_details=CustomerDetails(
            customer_id="customer_123",
            customer_phone="9999999999",
            customer_email="customer@example.com",
        ),
        order_meta=OrderMeta(
            return_url="https://yoursite.com/return",  # Cashfree appends ?order_id=ORDER_ID automatically
            notify_url="https://yoursite.com/webhook",
        ),
    )
    response = cashfree.PGCreateOrder(request, None, None)
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
    orderMeta.setReturnUrl("https://yoursite.com/return");  // Cashfree appends ?order_id=ORDER_ID automatically
    orderMeta.setNotifyUrl("https://yoursite.com/webhook");

    CreateOrderRequest request = new CreateOrderRequest();
    request.setOrderAmount(100.00);
    request.setOrderCurrency("INR");
    request.setCustomerDetails(customerDetails);
    request.setOrderMeta(orderMeta);

    Cashfree cashfree = new Cashfree(Cashfree.SANDBOX, "<app_id>", "<secret_key>", null, null, null);
    ApiResponse<OrderEntity> response = cashfree.PGCreateOrder(request, null, null, null);
    return response.getData();
}
```
</details>

<details>
<summary>Go (v6+)</summary>

```go
func createOrder() (*cashfreepg.OrderEntity, error) {
    returnUrl := "https://yoursite.com/return"   // Cashfree appends ?order_id=ORDER_ID automatically
    notifyUrl := "https://yoursite.com/webhook"

    request := cashfreepg.CreateOrderRequest{
        OrderAmount:   100.00,
        OrderCurrency: "INR",
        CustomerDetails: cashfreepg.CustomerDetails{
            CustomerId:    "customer_123",
            CustomerPhone: "9999999999",
        },
        OrderMeta: &cashfreepg.OrderMeta{
            ReturnUrl: &returnUrl,
            NotifyUrl: &notifyUrl,
        },
    }
    response, _, err := cashfree.PGCreateOrder(&request, nil, nil, nil)
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

    $cashfree = new \Cashfree\Cashfree(\Cashfree\Cashfree::$SANDBOX, "<app_id>", "<secret_key>", "", "", "", true);
    return $cashfree->PGCreateOrder($request);
}
```
</details>

<details>
<summary>.NET</summary>

```csharp
public OrderEntity CreateOrder() {
    var customerDetails = new CustomerDetails(
        customerId: "customer_123",
        customerPhone: "9999999999"
    );
    var request = new CreateOrderRequest(
        orderAmount: 100.00,
        orderCurrency: "INR",
        customerDetails: customerDetails
    );
    var cashfree = new Cashfree(Cashfree.SANDBOX, "<app_id>", "<secret_key>", null, null, null, null);
    var response = cashfree.PGCreateOrder(request, null, null, null);
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
# Python (v6+)
response = cashfree.PGFetchOrder(order_id, None, None)
print(response.data.order_status)
```

```java
// Java
Cashfree cashfree = new Cashfree(Cashfree.SANDBOX, "<app_id>", "<secret_key>", null, null, null);
ApiResponse<OrderEntity> response = cashfree.PGFetchOrder(orderId, null, null, null);
System.out.println(response.getData().getOrderStatus());
```

```go
// Go (v6+)
response, _, err := cashfree.PGFetchOrder(orderId, nil, nil, nil)
fmt.Println(response.OrderStatus)
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
# Python (Flask) — v6+
@app.route('/webhook', methods=['POST'])
def webhook():
    cashfree = Cashfree(
        XEnvironment=Cashfree.SANDBOX,
        XClientId="<app_id>",
        XClientSecret="<secret_key>",
    )
    try:
        cashfree.PGVerifyWebhookSignature(
            request.headers['x-webhook-signature'],
            request.data.decode('utf-8'),
            request.headers['x-webhook-timestamp'],
        )
        return "OK", 200
    except Exception:
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
