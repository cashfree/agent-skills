---
name: Cashfree Payment Gateway - Web SDK (cashfree.js v3)
description: >
  Use when integrating Cashfree Payments into a web frontend using the Cashfree.js v3 SDK —
  Drop-in checkout, Elements / Headless, redirect vs modal modes, SPA-friendly mounting.
  Triggers: cashfree.js, Cashfree JS SDK, Cashfree v3 SDK, Drop-in, Elements, headless payment,
  card Elements, cardNumber component, cardCvv, cardExpiry, cardHolder, savePaymentInstrument,
  cashfree.checkout, cashfree.create, cashfree.pay, paymentSessionId, redirectTarget, _self,
  _modal, _top, _blank, SPA checkout, React checkout, Vue checkout, Next.js checkout,
  3DS handling on web, saved cards UI, OneClick web checkout, embed payment form, custom styling,
  Cashfree Drop-in SDK, cashfree-dropjs, sdk.cashfree.com.
  Pair with pg/apis or pg/backend-sdks (to create orders) and pg/webhooks (to verify payments).
---

# Cashfree Payment Gateway — Web SDK (cashfree.js v3)

> **References available:** This SKILL.md covers the three checkout modes, SPA wiring, and the saved-cards / Elements patterns. For the full Elements component API (`cardNumber`, `cardCvv`, `cardExpiry`, `cardHolder`, `savePaymentInstrument`), event model, 3DS return handling, theming/styling, and per-framework integration patterns — read `references/REFERENCE.md` in this directory.

---

## 1. Scope & Boundaries

### When to use this skill

- The merchant is building a **web checkout** in a browser — React, Vue, Angular, Next.js, Svelte, plain JS, or server-rendered pages.
- The developer needs to pick between **Drop-in** (Cashfree-rendered payment UI in a modal/redirect), **Elements / Headless** (merchant-controlled UI with Cashfree handling card compliance), or **pure redirect** (send the customer to a Cashfree-hosted page and wait for them to come back).
- The developer is wiring 3DS challenges, saved-card selector, Apple/Google Pay on web, or any frontend payment step that runs in a browser.
- The developer is translating from a Razorpay `checkout.js` integration — see `migrate-from-razorpay/SKILL.md` for the option-by-option map, then return here for Cashfree-specific depth.

### When NOT to use this skill

- **Mobile apps** (Android native, iOS native, React Native, Flutter, Cordova) — use `pg/mobile-sdks/SKILL.md`. The web SDK does not run inside native mobile shells.
- **Backend-only S2S integration** — use `pg/apis/SKILL.md`. If you never render a browser, you do not need this SDK.
- **Payment Links** (hosted, share-a-URL flows) — use `pg/payment-links/SKILL.md`. Links are a zero-JS alternative to this SDK.
- **Cashfree Checkout JS v1/v2** — deprecated. This skill covers v3 (`sdk.cashfree.com/js/v3/cashfree.js`). If the codebase references v1/v2, migrate to v3 before extending.

---

## 2. Structural Overview

### The SDK in one line

```html
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
```

Creates a global `Cashfree` constructor. Initialize with a mode:

```javascript
const cashfree = Cashfree({ mode: "sandbox" });   // or "production"
```

### Three checkout modes — pick one

| Mode | What it looks like | When to pick |
|---|---|---|
| **Drop-in** (prebuilt UI) | Cashfree renders a full payment UI in a modal or redirect page. You pass `paymentSessionId` and a mode; Cashfree does the rest. | Fastest to ship. 80% of merchants. No PCI burden. |
| **Elements / Headless** | You build your own UI (input fields, buttons, layout) and mount Cashfree components (`cardNumber`, `cardCvv`, etc.) into your DOM. Cashfree handles card data compliance. | SPAs with strict design systems. OneClick / custom checkout. React/Vue apps wanting their own form layout. |
| **Pure redirect** | No JS — backend redirects the customer to the Cashfree-hosted page via `payment_session_id`'s payment URL. | Non-JS / legacy stacks; minimal-JS SSR apps. Typically implemented via Payment Links instead — see `pg/payment-links/SKILL.md`. |

### Decision matrix — choose the right SDK call before writing code

**Read the user's intent first.** The wrong call will silently ignore what you built.

| User says... | Use this call | Do NOT use |
|---|---|---|
| "popup / modal / Drop-in / open a Cashfree payment box" | `cashfree.checkout({ redirectTarget: "_modal" })` | `cashfree.pay()` |
| "inline form / custom card fields / Elements / my own design" | `cashfree.pay({ paymentMethod: cardNumber, paymentSessionId })` | `cashfree.checkout()` |
| "redirect to a Cashfree-hosted page" | `cashfree.checkout({ redirectTarget: "_self" })` | `cashfree.pay()` |
| "saved card / OneClick" | `cashfree.pay({ paymentMethod: { card: { instrument_id, channel: "link" } } })` | `cashfree.checkout()` |

> **NEVER mix Elements with `cashfree.checkout()`.** If you mount `cardNumber`, `cardCvv`, `cardExpiry`, `cardHolder` and then call `cashfree.checkout()`, you have opened a Drop-in modal that ignores the form the user just filled in. The two are mutually exclusive payment paths. The submit handler for an Elements form **must** call `cashfree.pay(...)`.

### Initialize the SDK ONCE — not per click

```javascript
// ✅ Module / page load — done once
const cashfree = Cashfree({ mode: "sandbox" });

// ❌ Inside a click handler — re-instantiates on every click,
//    breaks instance state, wastes memory.
button.addEventListener("click", () => {
    const cashfree = Cashfree({ mode: "sandbox" });   // do NOT do this
    cashfree.checkout({ paymentSessionId });
});
```

The `Cashfree({ mode })` instance is reusable across multiple checkouts. Create it once at module load (or first paint in SPAs), then call `.checkout()` / `.pay()` on it as needed.

### Nothing client-side needs a secret

Unlike some PGs, **nothing you send to the browser is an API credential**. The only token on the client is `payment_session_id` (short-lived, order-scoped). Your backend creates the order, passes the session id down, and the SDK authenticates against that.

---

## 3. Core Workflow: Drop-in

The default path for most merchants.

### Step 1 — Backend creates the order (same as any PG flow)

Your backend calls `POST /pg/orders` and returns `payment_session_id` + `order_id` to the frontend. See `pg/apis/SKILL.md` §3 or `pg/backend-sdks/SKILL.md` §4.

### Step 2 — Load the SDK and call `.checkout()`

```html
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
<script>
// Initialise ONCE at module load — never inside the click handler.
const cashfree = Cashfree({ mode: "sandbox" });

async function pay(paymentSessionId, orderId) {
    const result = await cashfree.checkout({
        paymentSessionId: paymentSessionId,
        redirectTarget: "_modal",                  // _modal | _self | _top | _blank
    });

    // ⚠️ The Promise has THREE terminal states — handle all of them.
    // Treating only `result.error` will misreport a closed modal as a failure.

    if (result.error) {
        // SDK / network error OR user dismissed the modal without paying.
        // This is NOT necessarily a payment failure — DO NOT toast "Payment failed".
        // Surface a neutral "Payment was not completed" and let the user retry.
        showToast("Payment was not completed.");
        return;
    }

    if (result.redirect) {
        // Page is navigating away (only fires for _self / _top, or in-app browsers).
        // Stop here — the return_url handler will pick up the flow on the way back.
        return;
    }

    if (result.paymentDetails) {
        // The user submitted a payment attempt. The attempt may have SUCCEEDED OR
        // FAILED at the bank — `result.paymentDetails` only proves they tried.
        // Always backend-verify before fulfilling.
        const verify = await fetch(`/verify/${orderId}`).then((r) => r.json());
        if (verify.status === "PAID") showThankYouPage();
        else showRetryUI(verify.status);
    }
}
</script>
```

**Summary of `cashfree.checkout({ redirectTarget: "_modal" })` resolution states:**

| Field on `result` | What it means | What to do |
|---|---|---|
| `result.error` is set | SDK error OR user closed the modal without paying | Show neutral "not completed", offer retry. **Do not** label as "payment failed" |
| `result.redirect === true` | Page is navigating to a Cashfree-hosted URL (`_self` / `_top` / in-app browser fallback) | Stop client-side flow — wait for `return_url` |
| `result.paymentDetails` is set | A payment attempt was submitted (may have approved OR failed at the bank) | Always backend-verify `GET /pg/orders/{order_id}` before fulfilling |

`redirectTarget` choices:

| Value | Behaviour |
|---|---|
| `"_modal"` | Opens an overlay on the current page; Promise resolves on close/complete |
| `"_self"` | Navigates the current tab to Cashfree's hosted checkout; returns via `return_url` on the order |
| `"_top"` | Navigates the top-level window (useful when your checkout is in an iframe) |
| `"_blank"` | Opens in a new tab (rare; most browsers will ad-block / popup-block) |

### Step 3 — Handle the return

For `_self` / `_top` modes, Cashfree redirects the browser to the order's `return_url` with `order_id` as a query param. Your return-URL handler **must** call your backend to re-verify (`GET /pg/orders/{order_id}`) — never trust any query-string success signal.

For `_modal`, the Promise resolution carries the terminal state. Still verify from the backend.

### Dead code cleanup — `_modal`-only apps

If your app uses `redirectTarget: "_modal"` exclusively, the `DOMContentLoaded` "check for `?order_id` in the URL" block is **unreachable** — Cashfree never navigates the browser in modal mode. Delete it. Keeping it around makes the file look like it supports two flows when it only supports one, and any future maintainer (or another AI agent) will waste cycles wiring against dead code.

```javascript
// ❌ Remove this if you only use redirectTarget: "_modal"
document.addEventListener("DOMContentLoaded", () => {
    const urlOrderId = new URLSearchParams(location.search).get("order_id");
    if (urlOrderId) verifyOrder(urlOrderId);
});
```

Keep it **only** if you use `_self` / `_top` somewhere in the same app.

### Step 4 — Backend verification (the rule for every mode)

```javascript
// Backend — GET /verify/:orderId
app.get("/verify/:orderId", async (req, res) => {
    const order = await cashfree.PGFetchOrder(req.params.orderId);
    if (order.data.order_status === "PAID") {
        await fulfillOrder(req.params.orderId);
        return res.json({ status: "PAID" });
    }
    res.json({ status: order.data.order_status });  // ACTIVE / EXPIRED / TERMINATED
});
```

This is identical to what `migrate-from-razorpay/SKILL.md` §4 shows — the **backend re-fetch** is Cashfree's equivalent of a signature-verified success callback.

---

## 4. Elements / Headless — Merchant-Controlled UI

Use when Drop-in's look doesn't match your design system, or you want a OneClick-style flow with a saved-cards selector you built.

### Mount Cashfree components into your DOM

```html
<form id="payment-form">
    <div id="card-holder"></div>
    <div id="card-number"></div>
    <div id="card-expiry"></div>
    <div id="card-cvv"></div>
    <label>
        <input type="checkbox" id="save-cb" />
        Save this card for later (RBI compliant tokenization)
    </label>
    <button type="submit" id="pay-btn" disabled>Pay</button>
</form>

<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
<script>
const cashfree = Cashfree({ mode: "sandbox" });

const style = { base: { fontSize: "16px", color: "#111" } };
const cardHolder = cashfree.create("cardHolder", { values: { placeholder: "Name" }, style });
const cardNumber = cashfree.create("cardNumber", { style });
const cardExpiry = cashfree.create("cardExpiry", { style });
const cardCvv    = cashfree.create("cardCvv",    { style });

cardHolder.mount("#card-holder");
cardNumber.mount("#card-number");
cardExpiry.mount("#card-expiry");
cardCvv.mount("#card-cvv");

// Enable the pay button when all components are complete.
const components = [cardHolder, cardNumber, cardExpiry, cardCvv];
const state = new Map();
components.forEach((c) => {
    c.on("change", (d) => {
        state.set(c, d.complete);
        document.getElementById("pay-btn").disabled = ![...state.values()].every(Boolean);
    });
});

document.getElementById("payment-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const save = document.getElementById("save-cb").checked;

    // ⚠️ For Elements you MUST call cashfree.pay() — NOT cashfree.checkout().
    // cashfree.checkout() opens a Drop-in modal and ignores the components you mounted.
    const result = await cashfree.pay({
        paymentMethod: cardNumber,                // pass any card component
        paymentSessionId: window.__paymentSessionId,
        savePaymentInstrument: save,              // RBI tokenization consent
    });

    // Same 3-state resolution as cashfree.checkout — handle all three.
    if (result.error) {
        showToast("Payment was not completed.");      // do NOT say "failed"
        return;
    }
    if (result.redirect) return;                      // 3DS redirect / in-app browser
    if (result.paymentDetails) {
        const v = await fetch(`/verify/${orderId}`).then((r) => r.json());
        if (v.status === "PAID") showThankYouPage();
    }
});
</script>
```

### Component catalog

| Component | Purpose |
|---|---|
| `cardHolder` | Name on card |
| `cardNumber` | Full card number input (PCI-safe iframe) |
| `cardExpiry` | MM/YY combined |
| `cardCvv` | 3–4 digit CVV (PCI-safe iframe) |
| `savePaymentInstrument` | Consent checkbox for tokenization |
| `paymentComponent` | Drop-in container (alternative to `cashfree.checkout`) |

Each component is an iframe Cashfree owns — card numbers and CVVs never touch your DOM, keeping you out of PCI scope.

Lifecycle methods: `.mount(selector)`, `.update(options)`, `.on("change", handler)`, `.on("ready", handler)`, `.isComplete()`.

---

## 5. Saved Cards UI (OneClick)

Combine Token Vault (`pg/token-vault/SKILL.md`) with the web SDK for a "pick a saved card" selector.

```javascript
// 1. Backend fetches saved instruments for the logged-in customer.
const savedCards = await backend.get(`/saved-cards?customer_id=${customerId}`);
// -> [{ instrument_id, instrument_display, card_network, card_bank_name }, ...]

// 2. Render your own radio-button list.
// 3. When user picks a saved card, call the SDK with the instrument_id path:

const result = await cashfree.pay({
    paymentSessionId: window.__paymentSessionId,
    paymentMethod: {
        card: {
            channel: "link",
            instrument_id: pickedInstrumentId,
            // card_cvv: collectedCvv    // if network requires
        },
    },
});
```

Cashfree handles 3DS challenges inside the SDK — your code waits on the `cashfree.pay()` Promise. Always verify on backend after resolution.

---

## 6. SPA Integration Notes

- **Load the script once.** If you lazy-load on the checkout route, guard against double-loading via a promise cache or a `if (window.Cashfree)` check.
- **Mount Elements after React has painted** — use `useEffect` (React), `onMounted` (Vue), `ngAfterViewInit` (Angular). Target a ref/id that exists in the DOM.
- **Unmount Elements on route change.** Cashfree components are iframes; stale mounts leak event listeners. Call `.destroy()` or overwrite the mount point on unmount.
- **Don't block on Cashfree in SSR.** The SDK is browser-only; wrap in a client-side boundary (`useEffect`, `ClientOnly` in Nuxt, `"use client"` in Next App Router).
- **Content Security Policy:** allow `https://sdk.cashfree.com` for `script-src`, `frame-src` for iframes, and `connect-src` for fetch/XHR. See REFERENCE §4 for the full CSP.

---

## 7. Security Constraints — Never Violate

- **Never trust a client-side `result` as proof of payment.** Always backend-verify via `GET /pg/orders/{order_id}` and fulfill only on `order_status === "PAID"`. This is the single most-violated rule in Cashfree web integrations.
- **Never send `x-client-secret` or `x-client-id` to the browser.** The only legitimate client-side payload is `payment_session_id`.
- **Never manually render raw `card_number` into your DOM.** Use Cashfree Elements so the card input stays inside a Cashfree-owned iframe. This keeps your merchant in SAQ-A PCI scope, not SAQ-D.
- **Always unmount components on route change** to avoid iframe leaks and stale event handlers.
- **Always set `mode: "sandbox"` vs `"production"` from a server-injected config.** Hardcoding mode means sandbox code will ship to prod and vice versa.

---

## 8. Testing in Sandbox

- Load `https://sdk.cashfree.com/js/v3/cashfree.js` with `mode: "sandbox"`.
- Create a sandbox order via backend (amount ≥ ₹1).
- Drop-in: test with test card `4111 1111 1111 1111`, expiry `12/29`, CVV `123`; or UPI `testsuccess@gocash`.
- Elements: mount each component, verify the `change` event fires, submit to `cashfree.pay`. 3DS in sandbox typically auto-approves.
- Verify `GET /pg/orders/{order_id}` returns `PAID` before marking the flow done.
- See `validation-and-testing/SKILL.md` for full test-data tables (success/failure/UPI VPAs, simulated 3DS challenges).

---

## 9. Quick Diagnostic

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cashfree is not defined` in console | Script tag missing or blocked | Include `<script src="https://sdk.cashfree.com/js/v3/cashfree.js">`; check CSP |
| Elements don't appear on mount | Mounted before DOM was ready, or wrong selector | Mount inside `useEffect` / `onMounted`; verify the target id exists |
| `cashfree.checkout()` returns `result.error: "session_expired"` | `payment_session_id` older than ~15 min | Create a fresh order on checkout entry; don't cache session id across page loads |
| `result.redirect: true` but browser didn't navigate | `_self` mode used inside an iframe | Use `_top` instead, or avoid iframes on checkout pages |
| 3DS modal white-screens | Parent page CSP blocks `frame-src: https://*.cashfree.com` | Add Cashfree hosts to CSP |
| Customer sees "Payment successful" in modal but backend never fulfilled | Client-side callback was trusted | Always fetch `/verify/:orderId` from backend; never fulfill on SDK result alone |
| SPA: mounting two checkout instances breaks the second | First instance not destroyed | Track instance in state, destroy on unmount, recreate per checkout |
| Saved-card flow asks for CVV every time | Network policy for that BIN | Add a CVV-only field; cannot skip without issuer support |
| Payment works in Chrome but not Safari | `SameSite=None; Secure` cookie not set, or ITP blocking | Serve checkout page over HTTPS; set cookies appropriately for cross-site context |
| `mode: "sandbox"` hit production endpoints | Backend uses production creds while frontend uses sandbox mode | Centralize env config; derive both from one source |

---

## 10. Useful Links

- [Cashfree Web Checkout v3](https://www.cashfree.com/docs/payments/online/web/checkout)
- [Cashfree Elements / Headless SDK](https://www.cashfree.com/docs/payments/online/element/sdks)
- [Cashfree Drop-in GitHub — cashfree-dropjs](https://github.com/cashfree/cashfree-dropjs)
- [Token Vault for saved-cards UX](../token-vault/SKILL.md)
- [Mobile SDK (the sibling skill)](../mobile-sdks/SKILL.md)
- [Backend order creation](../backend-sdks/SKILL.md)
