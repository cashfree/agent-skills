---
name: Cashfree Payment Gateway - Backend SDK
description: Use this for backend SDK integration with Cashfree Payment Gateway (Node.js, Python, Java, Go)
---

# Cashfree Payment Gateway — Backend SDK Integration Skills

## Project Overview
This project integrates Cashfree Payment Gateway using **server-side (backend) SDKs**. The backend SDK handles: creating orders, processing payments (S2S), fetching order/payment status, initiating refunds, verifying webhooks, and managing settlements — all from your server without exposing credentials to the frontend.

**Integration Flow:**
1. **Install SDK** → 2. **Configure Credentials** → 3. **Create Order** → 4. **Process/Verify Payment** → 5. **Handle Webhooks** → 6. **Manage Refunds & Settlements**

---

## SDK Installation

### Node.js
```bash
npm install cashfree-pg
```

### Python
```bash
pip install cashfree-pg
```

### Java (Maven)
```xml
<dependency>
  <groupId>com.cashfree.pg</groupId>
  <artifactId>cashfree-pg</artifactId>
  <version>LATEST</version>
</dependency>
```

### Java (Gradle)
```groovy
implementation 'com.cashfree.pg:cashfree-pg:LATEST'
```

### Go
```bash
go get github.com/cashfree/cashfree-pg/v4
```

### PHP (Composer)
```bash
composer require cashfree/cashfree-pg
```

### .NET
```bash
dotnet add package cashfree_pg
```

---

## SDK Configuration

### Environments

| Environment | Base URL                          | SDK Constant                    |
| ----------- | --------------------------------- | ------------------------------- |
| Sandbox     | `https://sandbox.cashfree.com/pg` | `Cashfree.Environment.SANDBOX`  |
| Production  | `https://api.cashfree.com/pg`     | `Cashfree.Environment.PRODUCTION` |

### API Version
```
x-api-version: 2025-01-01
```
All SDK methods accept the API version as the first parameter. Use `"2025-01-01"` (latest).

### Authentication Setup

**Node.js:**
```javascript
const { Cashfree } = require("cashfree-pg");

Cashfree.XClientId = process.env.CASHFREE_APP_ID;
Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
Cashfree.XEnvironment = Cashfree.Environment.SANDBOX; // or Cashfree.Environment.PRODUCTION
```

**Python:**
```python
from cashfree_pg.api_client import Cashfree
from cashfree_pg.models import *

Cashfree.XClientId = "<app_id>"
Cashfree.XClientSecret = "<secret_key>"
Cashfree.XEnvironment = Cashfree.SANDBOX  # or Cashfree.PRODUCTION
```

**Java:**
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

### Security Rules
- Credentials are obtained from the **Merchant Dashboard**
- **NEVER** expose `x-client-secret` in frontend/client-side code
- Store credentials in environment variables or a secrets manager
- Whitelist your domain in Merchant Dashboard before going live

---

## API Reference — Orders

### 1. Create Order
**Endpoint:** `POST /orders`
Creates a payment order and returns `payment_session_id` for checkout.

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `order_id` | string | No | Unique order identifier (auto-generated if omitted) |
| `order_amount` | float | **Yes** | Payment amount (max 1,000,000) |
| `order_currency` | string | **Yes** | Currency code (e.g., `"INR"`) |
| `customer_details.customer_id` | string | **Yes** | Unique customer identifier |
| `customer_details.customer_phone` | string | **Yes** | Valid 10-digit Indian phone number |
| `customer_details.customer_email` | string | No | Customer email |
| `customer_details.customer_name` | string | No | Customer name |
| `order_meta.return_url` | string | No | Redirect URL after payment. Use `{order_id}` placeholder. |
| `order_meta.notify_url` | string | No | Webhook notification URL |
| `order_note` | string | No | Optional note |
| `order_tags` | object | No | Key-value metadata tags |
| `order_expiry_time` | string | No | ISO 8601 expiry timestamp |

#### Response Fields

| Field | Description |
|-------|-------------|
| `cf_order_id` | Cashfree's internal order ID |
| `order_id` | Your order ID |
| `order_status` | `"ACTIVE"` when created |
| `payment_session_id` | Session ID for frontend checkout |
| `order_expiry_time` | When the order expires |
| `payments.url` | URL to fetch payments for this order |

#### SDK Examples

**Node.js:**
```javascript
const { Cashfree } = require("cashfree-pg");

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
    },
    order_note: "Test order",
    order_tags: { source: "website" }
  };

  try {
    const response = await Cashfree.PGCreateOrder("2025-01-01", request);
    console.log("Order created:", response.data);
    // response.data.payment_session_id → send to frontend
    // response.data.order_id
    // response.data.order_status → "ACTIVE"
    return response.data;
  } catch (error) {
    console.error("Error:", error.response?.data);
  }
}
```

**Python:**
```python
from cashfree_pg.api_client import Cashfree
from cashfree_pg.models import CreateOrderRequest, CustomerDetails, OrderMeta

def create_order():
    request = CreateOrderRequest(
        order_amount=100.00,
        order_currency="INR",
        order_id="order_" + str(int(time.time())),
        customer_details=CustomerDetails(
            customer_id="customer_123",
            customer_phone="9999999999",
            customer_email="customer@example.com",
            customer_name="John Doe"
        ),
        order_meta=OrderMeta(
            return_url="https://yoursite.com/return/{order_id}",
            notify_url="https://yoursite.com/webhook"
        ),
        order_note="Test order",
        order_tags={"source": "website"}
    )

    try:
        response = Cashfree.PGCreateOrder("2025-01-01", request)
        # response.data.payment_session_id → send to frontend
        # response.data.order_status → "ACTIVE"
        return response.data
    except Exception as e:
        print(f"Error: {e}")
```

**Java:**
```java
import com.cashfree.*;
import com.cashfree.model.*;

public OrderEntity createOrder() throws Exception {
    CustomerDetails customerDetails = new CustomerDetails();
    customerDetails.setCustomerId("customer_123");
    customerDetails.setCustomerPhone("9999999999");
    customerDetails.setCustomerEmail("customer@example.com");
    customerDetails.setCustomerName("John Doe");

    OrderMeta orderMeta = new OrderMeta();
    orderMeta.setReturnUrl("https://yoursite.com/return/{order_id}");
    orderMeta.setNotifyUrl("https://yoursite.com/webhook");

    CreateOrderRequest request = new CreateOrderRequest();
    request.setOrderAmount(100.00);
    request.setOrderCurrency("INR");
    request.setOrderId("order_" + System.currentTimeMillis());
    request.setCustomerDetails(customerDetails);
    request.setOrderMeta(orderMeta);
    request.setOrderNote("Test order");

    Cashfree cashfree = new Cashfree();
    ApiResponse<OrderEntity> response = cashfree.PGCreateOrder(
        "2025-01-01", request, null, null, null
    );
    // response.getData().getPaymentSessionId() → send to frontend
    return response.getData();
}
```

**Go:**
```go
import (
    cashfree "github.com/cashfree/cashfree-pg/v4"
)

func createOrder() (*cashfree.OrderEntity, error) {
    xApiVersion := "2025-01-01"
    orderId := fmt.Sprintf("order_%d", time.Now().Unix())
    returnUrl := "https://yoursite.com/return/{order_id}"
    notifyUrl := "https://yoursite.com/webhook"

    request := cashfree.CreateOrderRequest{
        OrderAmount:   100.00,
        OrderCurrency: "INR",
        OrderId:       &orderId,
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
    if err != nil {
        return nil, err
    }
    // response.PaymentSessionId → send to frontend
    return response, nil
}
```

**PHP:**
```php
use Cashfree\Cashfree;
use Cashfree\Model\CreateOrderRequest;
use Cashfree\Model\CustomerDetails;
use Cashfree\Model\OrderMeta;

function createOrder() {
    $customerDetails = new CustomerDetails();
    $customerDetails->setCustomerId("customer_123");
    $customerDetails->setCustomerPhone("9999999999");
    $customerDetails->setCustomerEmail("customer@example.com");

    $orderMeta = new OrderMeta();
    $orderMeta->setReturnUrl("https://yoursite.com/return/{order_id}");
    $orderMeta->setNotifyUrl("https://yoursite.com/webhook");

    $request = new CreateOrderRequest();
    $request->setOrderAmount(100.00);
    $request->setOrderCurrency("INR");
    $request->setOrderId("order_" . time());
    $request->setCustomerDetails($customerDetails);
    $request->setOrderMeta($orderMeta);

    $cashfree = new Cashfree();
    $response = $cashfree->PGCreateOrder("2025-01-01", $request);
    // $response->getPaymentSessionId() → send to frontend
    return $response;
}
```

**.NET:**
```csharp
using cashfree_pg.Client;
using cashfree_pg.Model;

public async Task<OrderEntity> CreateOrder() {
    var customerDetails = new CustomerDetails(
        customerId: "customer_123",
        customerPhone: "9999999999",
        customerEmail: "customer@example.com",
        customerName: "John Doe"
    );

    var orderMeta = new OrderMeta(
        returnUrl: "https://yoursite.com/return/{order_id}",
        notifyUrl: "https://yoursite.com/webhook"
    );

    var request = new CreateOrderRequest(
        orderAmount: 100.00,
        orderCurrency: "INR",
        customerDetails: customerDetails,
        orderMeta: orderMeta
    );

    var response = await Cashfree.PGCreateOrder("2025-01-01", request);
    // response.Data.PaymentSessionId → send to frontend
    return response.Data;
}
```

---

### 2. Get Order (Fetch Order Status)
**Endpoint:** `GET /orders/{order_id}`
**CRITICAL:** Always verify payment status from backend before fulfilling orders.

#### Order Status Values

| Status | Description |
|--------|-------------|
| `PAID` | Payment completed successfully |
| `ACTIVE` | Order is active, awaiting payment |
| `EXPIRED` | Order has expired |

#### SDK Examples

**Node.js:**
```javascript
async function getOrder(orderId) {
  try {
    const response = await Cashfree.PGFetchOrder("2025-01-01", orderId);
    console.log("Order status:", response.data.order_status);
    // response.data.order_status: "PAID", "ACTIVE", "EXPIRED"
    return response.data;
  } catch (error) {
    console.error("Error:", error.response?.data);
  }
}
```

**Python:**
```python
def get_order(order_id):
    try:
        response = Cashfree.PGFetchOrder("2025-01-01", order_id)
        # response.data.order_status: "PAID", "ACTIVE", "EXPIRED"
        return response.data
    except Exception as e:
        print(f"Error: {e}")
```

**Java:**
```java
public OrderEntity getOrder(String orderId) throws Exception {
    Cashfree cashfree = new Cashfree();
    ApiResponse<OrderEntity> response = cashfree.PGFetchOrder(
        "2025-01-01", orderId, null, null, null
    );
    // response.getData().getOrderStatus(): "PAID", "ACTIVE", "EXPIRED"
    return response.getData();
}
```

**Go:**
```go
func getOrder(orderId string) (*cashfree.OrderEntity, error) {
    xApiVersion := "2025-01-01"
    response, _, err := cashfree.PGFetchOrder(&xApiVersion, &orderId, nil, nil, nil)
    // response.OrderStatus: "PAID", "ACTIVE", "EXPIRED"
    return response, err
}
```

**PHP:**
```php
function getOrder($orderId) {
    $cashfree = new Cashfree();
    $response = $cashfree->PGFetchOrder("2025-01-01", $orderId);
    // $response->getOrderStatus(): "PAID", "ACTIVE", "EXPIRED"
    return $response;
}
```

**.NET:**
```csharp
public async Task<OrderEntity> GetOrder(string orderId) {
    var response = await Cashfree.PGFetchOrder("2025-01-01", orderId);
    // response.Data.OrderStatus: "PAID", "ACTIVE", "EXPIRED"
    return response.Data;
}
```

---

### 3. Terminate Order
**Endpoint:** `PATCH /orders/{order_id}`
Terminates an active order so no further payments can be made.

**Node.js:**
```javascript
async function terminateOrder(orderId) {
  const request = { order_status: "TERMINATED" };
  const response = await Cashfree.PGTerminateOrder("2025-01-01", orderId, request);
  return response.data;
}
```

---

## API Reference — Payments

### 4. Get Payments for Order
**Endpoint:** `GET /orders/{order_id}/payments`
Fetches all payment attempts for an order.

#### Payment Status Values

| Status | Description |
|--------|-------------|
| `SUCCESS` | Payment completed successfully |
| `FAILED` | Payment failed |
| `PENDING` | Payment awaiting confirmation |
| `NOT_ATTEMPTED` | No payment attempt made |
| `USER_DROPPED` | User abandoned payment |

**Node.js:**
```javascript
async function getPaymentsForOrder(orderId) {
  const response = await Cashfree.PGOrderFetchPayments("2025-01-01", orderId);
  return response.data; // Array of payment objects
}
```

**Python:**
```python
def get_payments_for_order(order_id):
    response = Cashfree.PGOrderFetchPayments("2025-01-01", order_id)
    return response.data  # List of payment objects
```

**Java:**
```java
public List<PaymentEntity> getPaymentsForOrder(String orderId) throws Exception {
    Cashfree cashfree = new Cashfree();
    var response = cashfree.PGOrderFetchPayments("2025-01-01", orderId, null, null, null);
    return response.getData();
}
```

**Go:**
```go
func getPaymentsForOrder(orderId string) ([]cashfree.PaymentEntity, error) {
    xApiVersion := "2025-01-01"
    response, _, err := cashfree.PGOrderFetchPayments(&xApiVersion, &orderId, nil, nil, nil)
    return response, err
}
```

### 5. Get Payment by ID
**Endpoint:** `GET /orders/{order_id}/payments/{cf_payment_id}`

**Node.js:**
```javascript
async function getPaymentById(orderId, cfPaymentId) {
  const response = await Cashfree.PGOrderFetchPayment("2025-01-01", orderId, cfPaymentId);
  return response.data;
}
```

**Python:**
```python
def get_payment_by_id(order_id, cf_payment_id):
    response = Cashfree.PGOrderFetchPayment("2025-01-01", order_id, cf_payment_id)
    return response.data
```

### 6. Order Pay (S2S — Server-to-Server Payment)
**Endpoint:** `POST /orders/sessions`
Process payment directly from server. **Requires S2S flag enabled.** For plain card payments, PCI DSS compliance is required.

> **Note:** This API does NOT require authentication headers and can be called from client-side as well.

**Node.js:**
```javascript
async function orderPay(paymentSessionId, paymentMethod) {
  const request = {
    payment_session_id: paymentSessionId,
    payment_method: paymentMethod
    // Example UPI payment_method:
    // { upi: { channel: "collect", upi_id: "user@upi" } }
    // Example Card payment_method:
    // { card: { channel: "link", card_number: "4111...", card_expiry_mm: "12", card_expiry_yy: "25", card_cvv: "123", card_holder_name: "John" } }
  };
  const response = await Cashfree.PGPayOrder("2025-01-01", request);
  return response.data;
}
```

### 7. Preauthorization (Capture/Void)
**Endpoint:** `POST /orders/{order_id}/authorization`
Capture or void a pre-authorized payment.

**Node.js:**
```javascript
// Capture
async function capturePayment(orderId, amount) {
  const request = {
    action: "CAPTURE",
    amount: amount
  };
  const response = await Cashfree.PGAuthorizeOrder("2025-01-01", orderId, request);
  return response.data;
}

// Void
async function voidPayment(orderId) {
  const request = { action: "VOID" };
  const response = await Cashfree.PGAuthorizeOrder("2025-01-01", orderId, request);
  return response.data;
}
```

---

## API Reference — Refunds

### 8. Create Refund
**Endpoint:** `POST /orders/{order_id}/refunds`
Initiate a refund. Refunds can only be initiated within **6 months** of the original successful transaction.

#### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `refund_amount` | float | **Yes** | Amount to refund |
| `refund_id` | string | **Yes** | Unique refund identifier |
| `refund_note` | string | No | Reason for refund |
| `refund_speed` | string | No | `"STANDARD"` or `"INSTANT"` |

#### Refund Status Values

| Status | Description |
|--------|-------------|
| `SUCCESS` | Refund processed successfully |
| `PENDING` | Refund is being processed |
| `CANCELLED` | Refund was cancelled |
| `ONHOLD` | Refund is on hold |

**Node.js:**
```javascript
async function createRefund(orderId, refundAmount, refundId) {
  const request = {
    refund_amount: refundAmount,
    refund_id: refundId,
    refund_note: "Customer requested refund",
    refund_speed: "STANDARD"
  };
  const response = await Cashfree.PGOrderCreateRefund("2025-01-01", orderId, request);
  return response.data;
}
```

**Python:**
```python
from cashfree_pg.models import CreateRefundRequest

def create_refund(order_id, refund_amount, refund_id):
    request = CreateRefundRequest(
        refund_amount=refund_amount,
        refund_id=refund_id,
        refund_note="Customer requested refund",
        refund_speed="STANDARD"
    )
    response = Cashfree.PGOrderCreateRefund("2025-01-01", order_id, request)
    return response.data
```

**Java:**
```java
public RefundEntity createRefund(String orderId, double amount, String refundId) throws Exception {
    CreateRefundRequest request = new CreateRefundRequest();
    request.setRefundAmount(amount);
    request.setRefundId(refundId);
    request.setRefundNote("Customer requested refund");
    request.setRefundSpeed("STANDARD");

    Cashfree cashfree = new Cashfree();
    var response = cashfree.PGOrderCreateRefund("2025-01-01", orderId, request, null, null, null);
    return response.getData();
}
```

**Go:**
```go
func createRefund(orderId string, amount float64, refundId string) (*cashfree.RefundEntity, error) {
    xApiVersion := "2025-01-01"
    note := "Customer requested refund"
    speed := "STANDARD"
    request := cashfree.CreateRefundRequest{
        RefundAmount: amount,
        RefundId:     refundId,
        RefundNote:   &note,
        RefundSpeed:  &speed,
    }
    response, _, err := cashfree.PGOrderCreateRefund(&xApiVersion, &orderId, &request, nil, nil, nil)
    return response, err
}
```

### 9. Get Refund
**Endpoint:** `GET /orders/{order_id}/refunds/{refund_id}`

**Node.js:**
```javascript
async function getRefund(orderId, refundId) {
  const response = await Cashfree.PGOrderFetchRefund("2025-01-01", orderId, refundId);
  return response.data;
}
```

### 10. Get All Refunds for Order
**Endpoint:** `GET /orders/{order_id}/refunds`

**Node.js:**
```javascript
async function getRefundsForOrder(orderId) {
  const response = await Cashfree.PGOrderFetchRefunds("2025-01-01", orderId);
  return response.data; // Array of refund objects
}
```

---

## API Reference — Settlements

### 11. Get Settlements for Order
**Endpoint:** `GET /orders/{order_id}/settlements`

**Node.js:**
```javascript
async function getSettlementsForOrder(orderId) {
  const response = await Cashfree.PGOrderFetchSettlement("2025-01-01", orderId);
  return response.data;
}
```

### 12. Get All Settlements
**Endpoint:** `GET /settlements`
Fetch settlements by settlement ID, UTR, or date range.

**Node.js:**
```javascript
async function getSettlements(params) {
  const response = await Cashfree.PGFetchSettlements("2025-01-01", params);
  return response.data;
}
```

---

## API Reference — Payment Links

### 13. Create Payment Link
**Endpoint:** `POST /links`

**Node.js:**
```javascript
async function createPaymentLink() {
  const request = {
    link_id: "link_" + Date.now(),
    link_amount: 100.00,
    link_currency: "INR",
    link_purpose: "Payment for order",
    customer_details: {
      customer_phone: "9999999999"
    }
  };
  const response = await Cashfree.PGCreateLink("2025-01-01", request);
  // response.data.link_url → shareable payment link
  return response.data;
}
```

### 14. Fetch Payment Link
**Endpoint:** `GET /links/{link_id}`

### 15. Cancel Payment Link
**Endpoint:** `POST /links/{link_id}/cancel`

---

## API Reference — Token Vault (Saved Instruments)

### 16. Fetch All Saved Instruments
**Endpoint:** `GET /customers/{customer_id}/instruments`

**Node.js:**
```javascript
async function getSavedInstruments(customerId) {
  const response = await Cashfree.PGCustomerFetchInstruments("2025-01-01", customerId, "card");
  return response.data;
}
```

### 17. Fetch Single Saved Instrument
**Endpoint:** `GET /customers/{customer_id}/instruments/{instrument_id}`

### 18. Delete Saved Instrument
**Endpoint:** `DELETE /customers/{customer_id}/instruments/{instrument_id}`

### 19. Fetch Cryptogram
**Endpoint:** `GET /customers/{customer_id}/instruments/{instrument_id}/cryptogram`

---

## Webhook Integration

### Configure Webhooks
1. Go to **Payment Gateway Dashboard** → **Developers** → **Webhooks**
2. Click **Add Webhook URL**
3. Enter your webhook endpoint URL
4. Select events to subscribe

### Webhook Events

| Event | Description |
|-------|-------------|
| `PAYMENT_SUCCESS_WEBHOOK` | Payment completed successfully |
| `PAYMENT_FAILED_WEBHOOK` | Payment failed |
| `PAYMENT_USER_DROPPED_WEBHOOK` | User dropped off during payment |
| `REFUND_STATUS_WEBHOOK` | Refund status update |
| `SETTLEMENT_WEBHOOK` | Settlement processed |

### Webhook Headers

| Header | Description |
|--------|-------------|
| `x-webhook-signature` | HMAC-SHA256 signature for verification |
| `x-webhook-timestamp` | Timestamp when webhook was sent |
| `x-webhook-version` | API version used |
| `x-webhook-attempt` | Retry attempt number |
| `x-idempotency-key` | Unique key for idempotency |

### Payment Success Webhook Payload (v2025-01-01)
```json
{
  "data": {
    "order": {
      "order_id": "order_123",
      "order_amount": 100.0,
      "order_currency": "INR",
      "order_tags": null
    },
    "payment": {
      "cf_payment_id": "1453002795",
      "payment_status": "SUCCESS",
      "payment_amount": 100.0,
      "payment_currency": "INR",
      "payment_message": "00::Transaction success",
      "payment_time": "2025-01-15T12:20:29+05:30",
      "bank_reference": "234928698581",
      "auth_id": null,
      "payment_method": {
        "upi": {
          "channel": "collect",
          "upi_id": "user@upi"
        }
      },
      "payment_group": "upi",
      "payment_surcharge": {
        "payment_surcharge_service_charge": 0.36,
        "payment_surcharge_service_tax": 0.06
      }
    },
    "customer_details": {
      "customer_name": null,
      "customer_id": "customer_123",
      "customer_email": "test@gmail.com",
      "customer_phone": "9999999999"
    },
    "payment_gateway_details": {
      "gateway_name": "CASHFREE",
      "gateway_order_id": "1634766330",
      "gateway_payment_id": "1504280029",
      "gateway_settlement": "CASHFREE"
    }
  },
  "event_time": "2025-01-15T11:16:10+05:30",
  "type": "PAYMENT_SUCCESS_WEBHOOK"
}
```

### Refund Webhook Payload (v2025-01-01)
```json
{
  "data": {
    "refund": {
      "cf_refund_id": 11325632,
      "cf_payment_id": 789727431,
      "refund_id": "refund_order123",
      "order_id": "order_123",
      "refund_amount": 50.00,
      "refund_currency": "INR",
      "refund_type": "MERCHANT_INITIATED",
      "refund_arn": "205907014017",
      "refund_status": "SUCCESS",
      "status_description": "Refund processed successfully",
      "created_at": "2025-01-15T12:54:25+05:30",
      "processed_at": "2025-01-15T13:04:27+05:30",
      "refund_note": "Customer requested",
      "requested_speed": "STANDARD",
      "processed_speed": "STANDARD"
    }
  },
  "event_time": "2025-01-15T13:04:28+05:30",
  "type": "REFUND_STATUS_WEBHOOK"
}
```

### Signature Verification (REQUIRED)

**CRITICAL:** Always verify webhook signatures before processing. Never process unverified webhooks.

> **Important:** Ensure webhook payload is received as **raw text**. Converting to JSON can transform decimal values (e.g., `170.00` → `170`) causing signature mismatch.

**Verification Process:**
1. Extract `x-webhook-timestamp` from headers
2. Concatenate: `timestamp + rawBody`
3. Generate HMAC-SHA256 hash using your secret key
4. Base64-encode the hash
5. Compare with `x-webhook-signature` header

**Node.js (Express) — Using SDK:**
```javascript
const { Cashfree } = require("cashfree-pg");

app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
  try {
    Cashfree.PGVerifyWebhookSignature(
      req.headers["x-webhook-signature"],
      req.body.toString(), // raw body as string
      req.headers["x-webhook-timestamp"]
    );
    // Signature valid — process webhook
    const payload = JSON.parse(req.body);
    console.log("Event:", payload.type);
    res.status(200).send("OK");
  } catch (err) {
    console.log("Invalid signature:", err.message);
    res.status(400).send("Invalid signature");
  }
});
```

**Node.js (Express) — Manual:**
```javascript
const crypto = require("crypto");

function verifyWebhookSignature(req) {
  const timestamp = req.headers["x-webhook-timestamp"];
  const signature = req.headers["x-webhook-signature"];
  const rawBody = req.rawBody; // Must use raw body, not parsed JSON

  const signatureString = timestamp + rawBody;
  const computedSignature = crypto
    .createHmac("sha256", process.env.CASHFREE_SECRET_KEY)
    .update(signatureString)
    .digest("base64");

  return computedSignature === signature;
}
```

**Python (Flask):**
```python
import base64, hashlib, hmac, os

def verify_webhook_signature(request):
    raw_body = request.data.decode('utf-8')
    timestamp = request.headers['x-webhook-timestamp']
    signature = request.headers['x-webhook-signature']

    signature_data = timestamp + raw_body
    message = bytes(signature_data, 'utf-8')
    secret_key = bytes(os.environ['CASHFREE_SECRET_KEY'], 'utf-8')

    computed_signature = base64.b64encode(
        hmac.new(secret_key, message, digestmod=hashlib.sha256).digest()
    ).decode('utf-8')

    return computed_signature == signature
```

**Java:**
```java
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.util.Base64;

public boolean verifySignature(String timestamp, String rawBody, String signature, String secretKey) throws Exception {
    String data = timestamp + rawBody;
    Mac sha256_HMAC = Mac.getInstance("HmacSHA256");
    SecretKeySpec secret_key_spec = new SecretKeySpec(secretKey.getBytes(), "HmacSHA256");
    sha256_HMAC.init(secret_key_spec);
    String computedSignature = Base64.getEncoder().encodeToString(sha256_HMAC.doFinal(data.getBytes()));
    return computedSignature.equals(signature);
}
```

**Go:**
```go
import (
    "crypto/hmac"
    "crypto/sha256"
    "encoding/base64"
)

func VerifySignature(signature, timestamp, rawBody, secretKey string) bool {
    signatureString := timestamp + rawBody
    h := hmac.New(sha256.New, []byte(secretKey))
    h.Write([]byte(signatureString))
    computedSignature := base64.StdEncoding.EncodeToString(h.Sum(nil))
    return computedSignature == signature
}
```

**PHP:**
```php
function verifyWebhookSignature() {
    $rawBody = file_get_contents('php://input');
    $timestamp = getallheaders()['x-webhook-timestamp'];
    $signature = getallheaders()['x-webhook-signature'];

    $signatureString = $timestamp . $rawBody;
    $computedSignature = base64_encode(
        hash_hmac('sha256', $signatureString, $_ENV['CASHFREE_SECRET_KEY'], true)
    );

    return $computedSignature === $signature;
}
```

**.NET:**
```csharp
using System.Security.Cryptography;
using System.Text;

public bool VerifySignature(string timestamp, string rawBody, string signature, string secretKey) {
    string data = timestamp + rawBody;
    using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(secretKey));
    byte[] hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
    string computedSignature = Convert.ToBase64String(hash);
    return computedSignature == signature;
}
```

### Webhook Response Requirements
- Return **HTTP 200** to acknowledge receipt
- Cashfree retries on non-200 responses
- Implement **idempotency** using `x-idempotency-key` to handle duplicate deliveries
- Process webhooks asynchronously for long-running operations

### IPs to Whitelist

**Sandbox:**
- 52.66.25.127
- 15.206.45.168

**Production:**
- 52.66.101.190
- 3.109.102.144
- 18.60.134.245
- 18.60.183.142

**Port:** 443 (HTTPS only)

---

## Complete SDK Method Reference

| SDK Method | HTTP Endpoint | Description |
|------------|---------------|-------------|
| `PGCreateOrder` | `POST /orders` | Create a new order |
| `PGFetchOrder` | `GET /orders/{order_id}` | Get order details/status |
| `PGTerminateOrder` | `PATCH /orders/{order_id}` | Terminate an active order |
| `PGPayOrder` | `POST /orders/sessions` | Process payment (S2S) |
| `PGAuthorizeOrder` | `POST /orders/{order_id}/authorization` | Capture/void preauth |
| `PGOrderFetchPayments` | `GET /orders/{order_id}/payments` | Get all payments for order |
| `PGOrderFetchPayment` | `GET /orders/{order_id}/payments/{id}` | Get specific payment |
| `PGOrderCreateRefund` | `POST /orders/{order_id}/refunds` | Create refund |
| `PGOrderFetchRefund` | `GET /orders/{order_id}/refunds/{id}` | Get specific refund |
| `PGOrderFetchRefunds` | `GET /orders/{order_id}/refunds` | Get all refunds for order |
| `PGOrderFetchSettlement` | `GET /orders/{order_id}/settlements` | Get settlements for order |
| `PGFetchSettlements` | `GET /settlements` | Get all settlements |
| `PGCreateLink` | `POST /links` | Create payment link |
| `PGFetchLink` | `GET /links/{link_id}` | Fetch payment link |
| `PGCancelLink` | `POST /links/{link_id}/cancel` | Cancel payment link |
| `PGCustomerFetchInstruments` | `GET /customers/{id}/instruments` | Get saved instruments |
| `PGVerifyWebhookSignature` | — | Verify webhook signature |

---

## Error Handling

All SDK methods may throw errors. Always wrap calls in try-catch blocks.

### Common Error Structure
```json
{
  "message": "Error description",
  "code": "error_code",
  "type": "invalid_request_error | authentication_error | api_error",
  "status": 400
}
```

### Common Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `order_id_invalid` | Invalid order ID format | 400 |
| `order_not_found` | Order does not exist | 404 |
| `payment_not_found` | Payment does not exist | 404 |
| `version_missing` | API version header missing | 400 |
| `order_amount_invalid` | Amount exceeds max (1,000,000) | 400 |
| `authentication_error` | Invalid credentials | 401 |
| `bank_processing_failure` | Bank-side failure | 502 |

### Error Handling Pattern

**Node.js:**
```javascript
try {
  const response = await Cashfree.PGCreateOrder("2025-01-01", request);
  return response.data;
} catch (error) {
  if (error.response) {
    console.error("Status:", error.response.status);
    console.error("Error:", error.response.data);
    // error.response.data.message
    // error.response.data.code
    // error.response.data.type
  } else {
    console.error("Network error:", error.message);
  }
}
```

**Python:**
```python
try:
    response = Cashfree.PGCreateOrder("2025-01-01", request)
    return response.data
except Exception as e:
    print(f"Error: {e}")
    # Access error details from exception
```

**Java:**
```java
try {
    var response = cashfree.PGCreateOrder("2025-01-01", request, null, null, null);
    return response.getData();
} catch (ApiException e) {
    System.err.println("Status: " + e.getCode());
    System.err.println("Body: " + e.getResponseBody());
}
```

---

## Security Checklist

- [ ] Never expose `x-client-secret` in frontend/client-side code
- [ ] Store credentials in environment variables or secrets manager
- [ ] Always verify webhook signatures before processing
- [ ] Use **raw request body** for signature verification (not parsed JSON)
- [ ] Whitelist your domain in Merchant Dashboard
- [ ] Use HTTPS endpoints for webhooks
- [ ] Whitelist Cashfree IPs for webhook endpoints
- [ ] Always verify payment status from backend (`PGFetchOrder`) before fulfilling orders
- [ ] Implement idempotency for webhook handlers using `x-idempotency-key`
- [ ] Handle decimal precision in webhook payloads (e.g., `170.00` not `170`)
- [ ] Set appropriate timeouts for SDK HTTP calls
- [ ] Log all API responses for debugging and audit trails

---

## Testing

- Use **sandbox** environment for all development and testing
- Test cards and UPI IDs are available in Cashfree documentation
- Verify webhook delivery in **Dashboard** → **Developers** → **Webhooks**
- Use the simulation APIs to test various payment scenarios

---

## Useful Links

- [Cashfree Dev Studio](https://www.cashfree.com/devstudio)
- [GitHub SDKs](https://github.com/cashfree/)
- [API Reference — Overview](https://www.cashfree.com/docs/api-reference/payments/latest/overview)
- [SDK Downloads](https://www.cashfree.com/docs/tools-ai/sdk)
- [Postman Collections](https://www.cashfree.com/docs/api-reference/postman-collections)

