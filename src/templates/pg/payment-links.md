---
name: Cashfree Payment Gateway - Payment Links
description: >
  Use when a merchant wants to collect a payment without an integrated checkout — by generating
  and sharing a hosted payment URL (SMS, email, WhatsApp, QR). Triggers: payment link, create
  payment link, shareable link, rzp.io style link, link_url, link_id, PGCreateLink, PGFetchLink,
  PGCancelLink, POST /pg/links, cancel payment link, partial payment link, auto reminder,
  link expiry, link QR code, link_qrcode, SMS link, email link, WhatsApp link, invoice link,
  B2B invoice, freelancer collection, dunning, rent collection via link, fee collection,
  link_partial_payments, link_minimum_partial_amount, link_auto_reminders, link_notify,
  link_meta, PAYMENT_LINK_EVENT, link paid webhook, link expired, link cancelled.
  Pair with pg/webhooks (for PAYMENT_LINK_EVENT) and pg/refunds (refunding a link payment).
---

# Cashfree Payment Gateway — Payment Links

> **References available:** This SKILL.md covers creating, cancelling, and handling links end-to-end for the 80% case. For the full field schema including `link_meta`, order_splits on links, enable_invoice, link QR code handling, per-language SDK code, rate limits, and troubleshooting expired-link and partial-payment edge cases — read `references/REFERENCE.md` in this directory.

---

## 1. Scope & Boundaries

### When to use this skill

- The merchant needs to **collect a payment without building a checkout** — SMB, tuition, freelancers, B2B invoices, event tickets, rent, dealer collections. Everything where an integrated JS SDK is overkill.
- The developer needs to **programmatically create, fetch, cancel, and list payments under a link**, and wire the `PAYMENT_LINK_EVENT` webhook to update their CRM / invoicing / accounting system.
- The merchant wants **partial payments** (customer pays in installments on the same link) or **auto-reminders** (Cashfree sends SMS/email nudges until paid).
- The use case is **one-off or ad-hoc collection** rather than a high-volume checkout. For high-volume checkouts, use `pg/SKILL.md` → `pg/apis/SKILL.md` / `pg/backend-sdks/SKILL.md` / `pg/web-sdk/SKILL.md`.

### When NOT to use this skill

- If the merchant has an integrated website/app checkout — use the PG skills directly. Payment Links are a separate product with a different UX.
- If the use case is **recurring billing / mandates** — use `subscriptions/SKILL.md`. A payment link is a one-shot link; it does not store a mandate.
- If the use case is **bulk disbursement** (paying out to many vendors) — that's `payouts/SKILL.md`.
- If the question is **"how do I refund a link payment"** — create the link, let the customer pay, then use `pg/refunds/SKILL.md` against the underlying `order_id` that the link generated.

---

## 2. Structural Overview

### Core Objects

| Object | Description |
|---|---|
| **Payment Link** | A hosted, shareable URL that lets a customer pay without a merchant-built checkout. Identified by your `link_id` (merchant-provided, unique) and Cashfree's internal `cf_link_id`. |
| **link_url** | The actual URL you share with the customer. Redirects them to a Cashfree-hosted checkout. |
| **link_qrcode** | Base64-encoded PNG of a QR pointing to `link_url`. Useful for counter-side / offline collection. |
| **Underlying Order(s)** | When a customer pays, Cashfree creates regular PG orders under the link. Fetched via `GET /pg/links/{link_id}/orders`. |

### Environments & auth

Same as the rest of the PG API:

| Environment | Base URL |
|---|---|
| Sandbox | `https://sandbox.cashfree.com/pg` |
| Production | `https://api.cashfree.com/pg` |

Headers on every call: `x-client-id`, `x-client-secret`, `x-api-version: 2025-01-01`, `Content-Type: application/json`.

### Endpoints

| Purpose | Endpoint | SDK method |
|---|---|---|
| Create payment link | `POST /pg/links` | `PGCreateLink` |
| Fetch link details | `GET /pg/links/{link_id}` | `PGFetchLink` |
| Cancel link | `POST /pg/links/{link_id}/cancel` | `PGCancelLink` |
| List payments under link | `GET /pg/links/{link_id}/orders` | `PGLinkFetchOrders` |

Webhook: `PAYMENT_LINK_EVENT` (fires on every link state transition).

### Link Statuses

| `link_status` | Meaning |
|---|---|
| `ACTIVE` | Link is live and accepting payments |
| `PAID` | Fully paid (no partial-payments, or `link_amount_paid == link_amount`) |
| `PARTIALLY_PAID` | `link_partial_payments: true` and at least one instalment has been paid, but `link_amount_paid < link_amount` |
| `EXPIRED` | `link_expiry_time` passed without full payment |
| `CANCELLED` | Merchant cancelled the link via API or Dashboard |

`PAID` and `CANCELLED` and `EXPIRED` are terminal — link cannot be paid further.

---

## 3. Core Workflow: Create → Share → Handle Webhook

### Step 1 — Create the link

```
POST /pg/links
Headers: x-client-id, x-client-secret, x-api-version: 2025-01-01, Content-Type: application/json
```

```json
{
    "link_id": "invoice_4402_2026",
    "link_amount": 5000.00,
    "link_currency": "INR",
    "link_purpose": "Invoice 4402 — consulting retainer April 2026",
    "customer_details": {
        "customer_phone": "9999999999",
        "customer_email": "client@acme.com",
        "customer_name": "Acme Corp"
    },
    "link_expiry_time": "2026-04-30T23:59:59+05:30",
    "link_auto_reminders": true,
    "link_notify": { "send_sms": true, "send_email": true },
    "link_meta": {
        "return_url":  "https://app.example.com/invoice/{link_id}/thanks",
        "notify_url":  "https://app.example.com/webhook/cashfree",
        "upi_intent":  "true",
        "payment_methods": "cc,dc,upi,nb"
    },
    "link_notes": { "invoice_id": "4402", "project": "retainer" }
}
```

**Required:** `link_amount` (rupees, decimal), `link_currency`, `link_purpose` (max 500 chars), `customer_details.customer_phone`.

**Optional but high-value:** `link_id` (merchant-provided — if omitted, Cashfree generates one; prefer merchant-generated for idempotency), `link_expiry_time` (default 30 days), `link_auto_reminders`, `link_notify` (`send_sms` / `send_email`), `link_partial_payments` + `link_minimum_partial_amount`, `link_notes` (up to 5 key/value pairs).

**Response — extract and share `link_url`:**

```json
{
    "cf_link_id": 55566677,
    "link_id": "invoice_4402_2026",
    "link_url": "https://payments.cashfree.com/links/abcXYZ123",
    "link_qrcode": "iVBORw0KGgoAAAANS...base64PNG...",
    "link_status": "ACTIVE",
    "link_amount": 5000.00,
    "link_amount_paid": 0.00,
    "link_currency": "INR",
    "link_purpose": "Invoice 4402 — consulting retainer April 2026",
    "link_expiry_time": "2026-04-30T23:59:59+05:30",
    "link_created_at": "2026-04-19T10:00:00+05:30",
    "customer_details": { ... },
    "link_meta": { ... },
    "link_notify": { "send_sms": true, "send_email": true },
    "link_auto_reminders": true
}
```

Share `link_url` via your own channel, or let Cashfree notify the customer by setting `link_notify.send_sms`/`send_email` to `true`. **SMS notifications fire only in production, not sandbox.**

### Step 2 — Handle `PAYMENT_LINK_EVENT`

Subscribe in Dashboard → PG → Developers → Webhooks. The event fires on every status transition (`ACTIVE → PAID`, `→ PARTIALLY_PAID`, `→ EXPIRED`, `→ CANCELLED`).

```javascript
// Node.js — already did raw-body + HMAC verify (see pg/webhooks/SKILL.md)
if (event.type === "PAYMENT_LINK_EVENT") {
    const link = event.data.link;
    await db.paymentLinks.upsert({
        cf_link_id: link.cf_link_id,
        link_id: link.link_id,
        link_status: link.link_status,
        link_amount: link.link_amount,
        link_amount_paid: link.link_amount_paid,
        link_url: link.link_url,
    });

    if (link.link_status === "PAID") {
        await closeInvoice(link.link_notes?.invoice_id);
    } else if (link.link_status === "PARTIALLY_PAID") {
        await notifyFinance("Partial payment received on link " + link.link_id);
    } else if (link.link_status === "EXPIRED" || link.link_status === "CANCELLED") {
        await markInvoiceOpen(link.link_notes?.invoice_id);
    }
}
```

### Step 3 — Fetch on-demand

```
GET /pg/links/{link_id}
```

Returns the full link object (same shape as create response), with current `link_status` and `link_amount_paid`. Use this for a "is this link paid?" button in the merchant UI, or as a sanity check before emailing a reminder.

### Step 4 — Cancel before payment (if needed)

```
POST /pg/links/{link_id}/cancel
```

Only possible while `link_status` is `ACTIVE` or `PARTIALLY_PAID`. After cancellation, no further payment can be collected on this link. Payments already made are **not** auto-refunded — issue refunds via `pg/refunds/SKILL.md` on each underlying order.

### Step 5 — Inspect underlying orders (for reconciliation)

```
GET /pg/links/{link_id}/orders
```

Returns every PG order created by the link. Each order carries its own `order_id`, `cf_payment_id`, `order_status`, and `order_amount`. Use these to refund, fetch, or dispute individual payments — all the regular PG endpoints apply.

---

## 4. Partial Payments

Set `link_partial_payments: true` and optionally `link_minimum_partial_amount`. The customer can pay the link multiple times until `link_amount_paid == link_amount`, at which point status flips to `PAID`.

Accounting view: each partial payment is a distinct PG order with its own `order_id`. The link's `link_amount_paid` is the cumulative sum across all underlying `order_status: "PAID"` orders.

Use cases: tuition paid in two halves, B2B invoice with advance + balance, rent paid across the first two weeks of a month.

Webhook cadence:

| Transition | Webhook fires |
|---|---|
| First partial payment lands | `PAYMENT_LINK_EVENT` with `link_status: "PARTIALLY_PAID"` |
| Subsequent partial | `PAYMENT_LINK_EVENT` again with updated `link_amount_paid` |
| Final payment completes it | `PAYMENT_LINK_EVENT` with `link_status: "PAID"` |

Each underlying order also fires its own `PAYMENT_SUCCESS_WEBHOOK`, so your handler needs to bifurcate by `type` — see `pg/webhooks/SKILL.md`.

---

## 5. Auto-Reminders

With `link_auto_reminders: true`, Cashfree sends SMS/email nudges (per `link_notify`) at defined intervals before `link_expiry_time`. Frequency is managed by Cashfree — typically 1 day before expiry for short-dated links, plus mid-cycle for longer ones.

- Auto-reminders **stop** once `link_status` is not `ACTIVE` / `PARTIALLY_PAID`.
- They are **disabled in sandbox** for SMS (email still sends). Don't verify reminder behaviour in sandbox alone.
- Merchants can disable the `NOTIFY_URL` reminder channel in Dashboard → Payment Links → Settings.

---

## 6. Security Constraints — Never Violate

- **Never rely on `link_url` alone as proof of payment.** Just because the customer clicked the link doesn't mean they paid. Always wait for `PAYMENT_LINK_EVENT` with `link_status: "PAID"`, and verify by re-fetching the link (`GET /pg/links/{link_id}`) before closing an invoice or shipping goods.
- **Never send `x-client-secret` to the client.** Nothing about payment links requires client-side auth — link creation is a pure backend concern.
- **Never hard-code `link_id`s** without a uniqueness guarantee. Reusing a `link_id` returns `409 link_already_exists`. Derive from your internal invoice id + optional version suffix (`invoice_4402_v1`).
- **Always verify webhook signatures** with the raw body + `x-webhook-timestamp`. See `pg/webhooks/SKILL.md` — identical across all Cashfree events.

---

## 7. Testing in Sandbox

- Create a sandbox link with a small amount (`link_amount: 2.00`) to avoid fee noise.
- Hit `link_url` in a browser and pay with a sandbox UPI VPA (`testsuccess@gocash`) or test card (`4111 1111 1111 1111`).
- Watch the Dashboard → Payment Links → your link → transitions `ACTIVE → PAID`.
- Batch-resend the `PAYMENT_LINK_EVENT` from Dashboard → Webhooks → Logs to verify your handler is idempotent.
- SMS is disabled in sandbox; test notifications only in production with tiny amounts.

---

## 8. Quick Diagnostic

| Symptom | Likely cause | Fix |
|---|---|---|
| `409 link_already_exists` on create | Reused `link_id` | Use a fresh unique id (append `_v2`) or fetch the existing link |
| `400 link_amount_invalid` | Amount ≤ 0 or > 1,000,000 | Clamp to (0, 1_000_000]; for larger, contact Cashfree |
| Customer says they paid but webhook shows `PARTIALLY_PAID` | Partial payment enabled and only part of the amount was sent | Re-fetch via `GET /pg/links/{link_id}`; close only on `PAID` |
| Link expired before payment | `link_expiry_time` defaulted to 30 days or merchant set too short | Create a fresh link with a longer expiry; old link cannot be revived |
| `link_url` returns "link invalid" | Typo in URL or link was cancelled | Always copy from the response, never construct manually |
| SMS reminder didn't fire in sandbox | SMS is disabled in sandbox | Verify in production with a throwaway `customer_phone` |
| Refund needed on a link payment | Refund the underlying PG order, not the link | See `pg/refunds/SKILL.md`; use the `order_id` from `GET /pg/links/{link_id}/orders` |
| Link `PAID` but invoice not closed | Webhook handler not running or returning non-200 | Check Dashboard → Webhooks → Logs; Batch Resend when fixed |
| `x-idempotency-key` on create returned a stale link | Old idempotency replay | Key the idempotency by a versioned link_id, not a random UUID |

---

## 9. Useful Links

- [Create Payment Link API](https://www.cashfree.com/docs/api-reference/payments/latest/payment-links/create)
- [Payment Links product](https://www.cashfree.com/payment-links/)
- [Payment Links in Merchant Dashboard](https://merchant.cashfree.com/merchants/pg/payment-links)
- [Webhook signature verification](../webhooks/SKILL.md)
- [Refund a link-paid order](../refunds/SKILL.md)
