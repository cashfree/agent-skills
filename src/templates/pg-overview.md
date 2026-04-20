---
name: Payment Gateway Overview
description: Cashfree Payment Gateway overview and index of sub-skills — routes to the correct integration guide based on the developer's stack.
---

# Cashfree Payment Gateway

Use this skill to understand the Payment Gateway product and determine which sub-skill to read next.

## Sub-Skills

Read the sub-skill that matches what the developer is building:

| Developer's goal | Sub-skill to read |
|---|---|
| Integrate using backend SDK (Node.js, Python, Java, Go) | `backend-sdks/SKILL.md` |
| Integrate using direct REST/S2S API calls | `apis/SKILL.md` |
| Integrate into Android, iOS, React Native, Flutter, or Cordova apps | `mobile-sdks/SKILL.md` |
| Set up webhooks, handle payment events, verify signatures | `webhooks/SKILL.md` |

## Payment Gateway Overview

Cashfree Payment Gateway enables businesses to accept payments via multiple payment modes — UPI, Cards, Net Banking, Wallets, EMI, Pay Later, and more.

### Core Flow

1. **Create Order** (server-side) — Call the Create Order API from your backend
2. **Collect Payment** — Use Cashfree Checkout (web/mobile) or server-to-server APIs
3. **Confirm Payment** — Verify via webhooks or Get Order API

### Key Resources

- Payment Gateway Docs: https://www.cashfree.com/docs/payments
- API Reference: https://www.cashfree.com/docs/api-reference/payments/latest/overview
- SDK Downloads: https://www.cashfree.com/docs/payments/online/integrations
