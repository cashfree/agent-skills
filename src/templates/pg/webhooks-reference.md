---
name: Cashfree Payment Gateway - Webhook Reference
description: >
  Reference material for the Webhooks skill. Read this when you need:
  full event payload structures (payment success, failed, refund, settlement, token vault),
  idempotency implementation, retry policy configuration, IP whitelisting, or troubleshooting.
  Always read webhooks/SKILL.md first for setup and signature verification.
---

# Cashfree Payment Gateway — Webhook Reference

> This document is in `references/` — file name `REFERENCE.md`. Read `../SKILL.md` first for webhook setup and signature verification.

---

## 1. Event Payload Structures

All payloads share the same outer shape:

```json
{
  "data": { /* event-specific data */ },
  "event_time": "2025-01-15T11:16:10+05:30",
  "type": "EVENT_TYPE_NAME"
}
```

### PAYMENT_SUCCESS_WEBHOOK

```json
{
  "data": {
    "order": {
      "order_id": "order_OFR_2",
      "order_amount": 2,
      "order_currency": "INR",
      "order_tags": null
    },
    "payment": {
      "cf_payment_id": "1453002795",
      "payment_status": "SUCCESS",
      "payment_amount": 1,
      "payment_currency": "INR",
      "payment_message": "00::Transaction success",
      "payment_time": "2025-01-15T12:20:29+05:30",
      "bank_reference": "234928698581",
      "auth_id": null,
      "payment_method": {
        "upi": {
          "channel": "collect",
          "upi_id": "user@ybl",
          "upi_instrument": "UPI_CREDIT_CARD",
          "upi_payer_ifsc": "SBI0025434",
          "upi_payer_account_number": "XXXXX0231"
        }
      },
      "payment_group": "upi",
      "international_payment": { "international": false },
      "payment_surcharge": {
        "payment_surcharge_service_charge": 0.36,
        "payment_surcharge_service_tax": 0.06
      }
    },
    "customer_details": {
      "customer_name": null,
      "customer_id": "7112AAA812234",
      "customer_email": "test@gmail.com",
      "customer_phone": "9908734801"
    },
    "payment_gateway_details": {
      "gateway_name": "CASHFREE",
      "gateway_order_id": "1634766330",
      "gateway_payment_id": "1504280029",
      "gateway_settlement": "CASHFREE",
      "gateway_status_code": null
    },
    "payment_offers": [
      {
        "offer_id": "0f05e1d0-fbf8-4c9c-a1f0-814c7b2abdba",
        "offer_type": "DISCOUNT",
        "offer_meta": { "offer_title": "50% off on UPI", "offer_code": "UPI50" },
        "offer_redemption": { "redemption_status": "SUCCESS", "discount_amount": 1 }
      }
    ]
  },
  "event_time": "2025-01-15T11:16:10+05:30",
  "type": "PAYMENT_SUCCESS_WEBHOOK"
}
```

### PAYMENT_FAILED_WEBHOOK / PAYMENT_USER_DROPPED_WEBHOOK

Same structure as `PAYMENT_SUCCESS_WEBHOOK` with:
- `PAYMENT_FAILED_WEBHOOK`: `payment_status: "FAILED"`
- `PAYMENT_USER_DROPPED_WEBHOOK`: `payment_status: "USER_DROPPED"`

---

### REFUND_STATUS_WEBHOOK

```json
{
  "data": {
    "refund": {
      "cf_refund_id": 11325632,
      "cf_payment_id": 789727431,
      "refund_id": "refund_sampleorder0413",
      "order_id": "sampleorder0413",
      "refund_amount": 2.00,
      "refund_currency": "INR",
      "entity": "Refund",
      "refund_type": "MERCHANT_INITIATED",
      "refund_arn": "205907014017",
      "refund_status": "SUCCESS",
      "status_description": "Refund processed successfully",
      "created_at": "2022-02-28T12:54:25+05:30",
      "processed_at": "2022-02-28T13:04:27+05:30",
      "refund_note": "Test",
      "refund_splits": [
        { "merchantVendorId": "sampleID12345", "amount": 1, "percentage": null }
      ],
      "requested_speed": "STANDARD",
      "processed_speed": "STANDARD",
      "service_charge": 0.00,
      "service_tax": 0.00
    }
  },
  "event_time": "2022-02-28T13:04:28+05:30",
  "type": "REFUND_STATUS_WEBHOOK"
}
```

---

### SETTLEMENT_SUCCESS / SETTLEMENT_INITIATED / SETTLEMENT_FAILED / SETTLEMENT_REVERSED

```json
{
  "data": {
    "settlement": {
      "adjustment": 0,
      "amount_settled": 97.94,
      "payment_amount": 100,
      "payment_from": "2025-02-14 12:00:00",
      "payment_till": "2025-02-14 12:15:00",
      "reason": null,
      "service_charge": 1.75,
      "service_tax": 0.31,
      "settled_on": "2025-02-14T12:35:19+05:30",
      "settlement_type": "STANDARD",
      "settlement_amount": 97.94,
      "settlement_id": 738,
      "settlement_initiated_on": "2025-02-14T12:35:17+05:30",
      "status": "SUCCESS",
      "utr": 1644822317781212,
      "settlement_charge": 0,
      "settlement_tax": 0
    }
  },
  "event_time": "2022-02-08T13:37:34+05:30",
  "type": "SETTLEMENT_SUCCESS"
}
```

---

### INSTRUMENT_ACTIVE_WEBHOOK / INSTRUMENT_FAILED_WEBHOOK

Token Vault — card tokenisation events.

```json
{
  "data": {
    "instrument": {
      "customer_id": "customer_123",
      "afa_reference": "xxxxx",
      "instrument_id": "54deabb4-ba45-4a60-9e6a-9c016fe7ab10",
      "instrument_type": "card",
      "instrument_uid": "4111XXXXXXXX1111",
      "instrument_display": "XXXX XXXX XXXX 1111",
      "instrument_status": "ACTIVE",
      "instrument_meta": {
        "card_network": "VISA",
        "card_bank_name": "HDFC",
        "card_country": "IN",
        "card_type": "CREDIT",
        "card_token_details": null
      }
    }
  },
  "event_time": "2025-01-15T11:16:10+05:30",
  "type": "INSTRUMENT_ACTIVE_WEBHOOK"
}
```

---

## 2. Processing Workflows

### Process Payment Success

1. Receive POST at webhook endpoint.
2. Read raw body — do NOT parse to JSON.
3. Verify signature with `PGVerifyWebhookSignature` or manual HMAC.
4. Check `x-idempotency-key` against processed keys store. Skip if duplicate.
5. Parse JSON. Confirm `type === "PAYMENT_SUCCESS_WEBHOOK"`.
6. **Verify via `GET /orders/{order_id}` from backend** — do NOT rely solely on webhook.
7. If `order_status === "PAID"`, fulfill the order.
8. Return HTTP 200.

### Process Refund

1–4: Same as payment success.
5. Confirm `type === "REFUND_STATUS_WEBHOOK"`.
6. Extract `data.refund.refund_id`, `data.refund.refund_status`.
7. Update refund records.
8. Return HTTP 200.

### Process Settlement

1–4: Same.
5. Confirm type is one of `SETTLEMENT_INITIATED`, `SETTLEMENT_SUCCESS`, `SETTLEMENT_FAILED`, `SETTLEMENT_REVERSED`.
6. Extract `data.settlement.settlement_id`, `data.settlement.status`, `data.settlement.utr`, `data.settlement.amount_settled`.
7. Update settlement records.
8. Return HTTP 200.

---

## 3. Idempotency Implementation

Cashfree practices **at-least-once delivery** — you may receive duplicates.

**v2025-01-01:** Use `x-idempotency-key` header. Unique hash per payload.

```javascript
// Node.js — idempotency check (Redis example)
app.post('/webhook', (req, res) => {
    const idempotencyKey = req.headers['x-idempotency-key'];

    if (await redis.get(`webhook:${idempotencyKey}`)) {
        return res.status(200).send("Already processed");
    }

    // Verify signature first...
    // Process webhook...

    await redis.setex(`webhook:${idempotencyKey}`, 86400, "1"); // expire after 24h
    res.status(200).send("OK");
});
```

**Older versions (no `x-idempotency-key`):** Use `cf_payment_id` + `type` as deduplication key.

---

## 4. Retry Policy Configuration

If your endpoint doesn't return HTTP 200, Cashfree retries.

| Policy | Description |
|---|---|
| **Default** | 3 retries at 2, 10, 30-minute intervals |
| **Fixed** | Set retries (max 10) + fixed interval |
| **Exponential** | Set retries, interval, multiplier. E.g., 5 retries, 15min, 2x → retries at 15, 17, 19, 23, 31 min |
| **Custom** | Set retries with custom intervals for each |

**To configure:**
1. Merchant Dashboard > Payment Gateway > Developers > Webhooks.
2. **NOTIFY_URL** (default, cannot edit) applies to `notify_url` in Create Order.
3. Custom URLs → click **Edit** for custom retry policy.

---

## 5. IP Whitelisting

Restrict your webhook endpoint to Cashfree IPs only.

| Environment | IPs |
|---|---|
| Sandbox | `52.66.25.127`, `15.206.45.168` |
| Production | `52.66.101.190`, `3.109.102.144`, `18.60.134.245`, `18.60.183.142` |

Port 443, HTTPS only. Monitor Cashfree docs for IP range updates.

---

## 6. Troubleshooting

| Issue | Likely Cause | Fix |
|---|---|---|
| Signature mismatch | Parsing JSON body before verification | Use raw request body (`req.rawBody`, `request.data`) |
| Signature mismatch | Decimal normalization (`170.00` → `170`) | Raw body only — no JSON round-trip |
| Webhook not received | Endpoint not publicly accessible | Test URL is reachable from internet; use ngrok for local dev |
| Webhook not received | Not configured in Dashboard | Check Dashboard > PG > Developers > Webhooks |
| HTTP 200 returned but retrying | Response took >50ms during test | Respond immediately, process async |
| Duplicate webhooks | At-least-once delivery | Implement `x-idempotency-key` deduplication |
| Unknown event type | Newer event types added | Implement a default handler; don't fail on unknown types |
