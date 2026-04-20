---
name: Cashfree Web SDK (cashfree.js v3) — Reference
description: >
  Deep reference for Cashfree.js v3. Full API surface for cashfree.checkout, cashfree.create,
  cashfree.pay. Every Elements component (cardNumber, cardCvv, cardHolder, cardExpiry,
  savePaymentInstrument, paymentComponent) with options/events/styles. 3DS redirect handling,
  saved-card flow, per-framework wiring (React, Vue, Next.js, Angular), CSP, and troubleshooting
  for SPA + iframe edge cases. Read after Web SDK SKILL.md.
---

# Cashfree.js v3 — Reference

> Read `../SKILL.md` first for the three checkout modes, core workflow, and SPA essentials. This file is the API surface + per-framework source of truth.

---

## 1. Script & Initialization

```html
<script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
```

```javascript
const cashfree = Cashfree({ mode: "sandbox" });  // "sandbox" | "production"
```

Instantiate **once** per page load. Re-instantiating is harmless but wasteful. The returned object exposes:

| Method | Purpose |
|---|---|
| `cashfree.checkout(options)` | Drop-in checkout — Cashfree-rendered UI |
| `cashfree.create(componentType, options)` | Create an Element component (Headless) |
| `cashfree.pay(options)` | Submit a headless payment using mounted components |
| `cashfree.version` | SDK version string |

---

## 2. `cashfree.checkout(options)` — Drop-in

### Options

```typescript
type CheckoutOptions = {
    paymentSessionId: string;              // REQUIRED — from POST /pg/orders
    redirectTarget?: "_self" | "_modal" | "_top" | "_blank";  // default "_modal"
    returnUrl?: string;                    // overrides the order's return_url for this session only
    appearance?: {                         // optional branding
        width?: string;                    // e.g. "600px"
        height?: string;
    };
};
```

### Return shape

```typescript
type CheckoutResult = {
    error?: {
        code:    string;  // e.g. "session_expired", "user_cancelled"
        message: string;
    };
    redirect?: boolean;  // true for _self/_top (navigation in progress)
    paymentDetails?: {    // present on modal completion
        paymentMessage?: string;
    };
};
```

### Modal vs redirect lifecycles

| Mode | Promise resolves when… | What you do |
|---|---|---|
| `_modal` | Modal closes (success, failure, or user-dismissed) | Backend-verify; show result UI in-page |
| `_self` | Navigation starts (Promise may never "resolve" from your code's POV — the page unloads) | Handle in your return-URL route; backend-verify |
| `_top` | Same as `_self` but navigates the top window (use from within an iframe) | Return-URL route |
| `_blank` | Opens in a new tab; your Promise resolves immediately (tab is a detached flow) | Use sparingly — popup blockers are common |

---

## 3. `cashfree.create(componentType, options)` — Elements

### Component types

| Component | Mounts what |
|---|---|
| `"cardHolder"` | Name-on-card text input |
| `"cardNumber"` | Full card number (PCI-safe iframe) |
| `"cardExpiry"` | MM/YY combined |
| `"cardCvv"` | 3–4 digit CVV (PCI-safe iframe) |
| `"savePaymentInstrument"` | Consent checkbox for RBI tokenization |
| `"paymentComponent"` | Full Drop-in container (alternative to `cashfree.checkout`) |

### Common options

```typescript
type ComponentOptions = {
    values?: {
        placeholder?: string;
        default?: string;
    };
    style?: {
        base?:    Record<string, string>;  // default styles
        focus?:   Record<string, string>;  // on focus
        invalid?: Record<string, string>;  // invalid input
        complete?: Record<string, string>; // valid input
    };
    cvvLength?: 3 | 4;                     // for cardCvv — update on cardNumber change
    disabled?: boolean;
    // component-specific extras
};
```

### Instance methods

| Method | Purpose |
|---|---|
| `.mount(selector)` | Attach to a DOM element by CSS selector or element reference |
| `.update(options)` | Change options at runtime (useful for `cvvLength` after detecting card network) |
| `.on(event, handler)` | Listen for component events |
| `.isComplete()` | Boolean — is the component's data valid? |
| `.destroy()` | Detach from DOM and clean up |

### Events

| Event | Payload | When |
|---|---|---|
| `"ready"` | `{ }` | Component mounted and interactive |
| `"change"` | `{ complete: boolean, value?: { cvvLength?: number }, error?: { message } }` | User input changed |
| `"focus"` | `{ }` | Iframe focused |
| `"blur"` | `{ }` | Iframe blurred |
| `"error"` | `{ code, message }` | Internal error (rare) |

### Cross-component choreography

The `cardNumber` component emits `value.cvvLength` on card-network detection (3 for Visa/Mastercard/RuPay, 4 for Amex). Update the CVV component accordingly:

```javascript
cardNumber.on("change", (d) => {
    if (d.value?.cvvLength) cardCvv.update({ cvvLength: d.value.cvvLength });
});
```

---

## 4. `cashfree.pay(options)` — Headless Payment

Submits a payment using the mounted components (or a raw payment-method object for saved cards / UPI).

### Options

```typescript
type PayOptions = {
    paymentSessionId: string;
    paymentMethod: CashfreeComponent | { card?: {...}, upi?: {...}, netbanking?: {...} };
    savePaymentInstrument?: boolean;   // consent for tokenization
    returnUrl?: string;                 // for 3DS redirect fallback
};
```

Passing a component (e.g. `cardNumber`) tells the SDK "use all the card-related mounted components". Passing a raw object is for non-Element paths (saved card via `instrument_id`, UPI intent, etc.):

```javascript
// Saved card
await cashfree.pay({
    paymentSessionId,
    paymentMethod: { card: { channel: "link", instrument_id: "54de..." } },
});

// UPI collect
await cashfree.pay({
    paymentSessionId,
    paymentMethod: { upi: { channel: "collect", upi_id: "user@ybl" } },
});
```

### Return shape

```typescript
type PayResult = {
    error?: { code: string; message: string };
    redirect?: boolean;                         // navigating to 3DS or bank
    paymentDetails?: Record<string, unknown>;    // best-effort summary
};
```

### 3DS handling

If 3DS is required, `cashfree.pay()` may:

1. Open a 3DS challenge iframe (browser-managed).
2. Navigate away (`result.redirect: true`).
3. On return (via `returnUrl` / the order's `return_url`), the browser lands back on your page.

In **every** case, the authoritative answer is `GET /pg/orders/{order_id}` from the backend.

---

## 5. Saved-Card Flow (OneClick)

```javascript
// 1) Fetch list from your backend (which called PGCustomerFetchInstruments)
const cards = await fetch(`/api/saved-cards?customerId=${customerId}`).then(r => r.json());

// 2) Render radio selector (your UI).

// 3) On submit
const result = await cashfree.pay({
    paymentSessionId,
    paymentMethod: {
        card: {
            channel: "link",
            instrument_id: picked.instrument_id,
            // card_cvv: collectedCvv  // if required by BIN
        }
    }
});
```

See `pg/token-vault/SKILL.md` for backend list / fetch / delete semantics.

---

## 6. Per-Framework Wiring

### React

```tsx
import { useEffect, useRef, useState } from "react";

declare global { interface Window { Cashfree?: any; } }

export function CheckoutForm({ paymentSessionId, customerId }: Props) {
    const numberRef = useRef<HTMLDivElement>(null);
    const cvvRef    = useRef<HTMLDivElement>(null);
    const expiryRef = useRef<HTMLDivElement>(null);
    const holderRef = useRef<HTMLDivElement>(null);
    const cashfreeRef = useRef<any>(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const s = document.createElement("script");
        s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
        s.async = true;
        s.onload = () => {
            const cf = window.Cashfree!({ mode: process.env.NEXT_PUBLIC_CASHFREE_MODE });
            cashfreeRef.current = cf;
            const number = cf.create("cardNumber");
            const cvv    = cf.create("cardCvv");
            const expiry = cf.create("cardExpiry");
            const holder = cf.create("cardHolder");
            number.mount(numberRef.current);
            cvv.mount(cvvRef.current);
            expiry.mount(expiryRef.current);
            holder.mount(holderRef.current);
            number.on("change", (d: any) => d.value?.cvvLength && cvv.update({ cvvLength: d.value.cvvLength }));
            cashfreeRef.current.number = number;
            setReady(true);
        };
        document.head.appendChild(s);
        return () => {
            // destroy components on unmount
            cashfreeRef.current?.number?.destroy?.();
        };
    }, []);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await cashfreeRef.current.pay({
            paymentSessionId,
            paymentMethod: cashfreeRef.current.number,
        });
        if (res.error) return alert(res.error.message);
        const verify = await fetch(`/api/verify/${orderId}`).then(r => r.json());
        if (verify.status === "PAID") navigateToThanks();
    };

    return (
        <form onSubmit={onSubmit}>
            <div ref={holderRef} />
            <div ref={numberRef} />
            <div ref={expiryRef} />
            <div ref={cvvRef} />
            <button type="submit" disabled={!ready}>Pay</button>
        </form>
    );
}
```

### Vue 3 (Composition API)

```vue
<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";

const holder = ref(null);
const number = ref(null);
const expiry = ref(null);
const cvv    = ref(null);
let cashfree = null, numberComp = null;

onMounted(async () => {
    await loadScript("https://sdk.cashfree.com/js/v3/cashfree.js");
    cashfree = window.Cashfree({ mode: "sandbox" });
    numberComp = cashfree.create("cardNumber");
    numberComp.mount(number.value);
    cashfree.create("cardHolder").mount(holder.value);
    cashfree.create("cardExpiry").mount(expiry.value);
    cashfree.create("cardCvv").mount(cvv.value);
});

onBeforeUnmount(() => {
    numberComp?.destroy?.();
});

async function pay() {
    const res = await cashfree.pay({ paymentSessionId: props.paymentSessionId, paymentMethod: numberComp });
    if (res.error) return console.error(res.error);
    const r = await fetch(`/api/verify/${props.orderId}`).then(r => r.json());
    if (r.status === "PAID") emit("paid");
}
</script>
```

### Next.js (App Router)

Wrap the checkout component with `"use client"` and load the script on the route. Set `mode` from `process.env.NEXT_PUBLIC_CASHFREE_MODE` so the server and client agree. Never import the SDK at the top-level of a server component.

### Angular

Use `DomSanitizer` + `ViewChild` on divs; load the script in `AfterViewInit` via a service that promises once-per-app. Call `destroy()` in `ngOnDestroy`.

---

## 7. Content Security Policy (CSP)

Minimal additions to get cashfree.js v3 working:

```
script-src  'self' https://sdk.cashfree.com;
connect-src 'self' https://api.cashfree.com https://sandbox.cashfree.com https://*.cashfree.com;
frame-src   https://sdk.cashfree.com https://*.cashfree.com https://*.razorpay.com-like-not-needed;
img-src     'self' data: https://sdk.cashfree.com;
style-src   'self' 'unsafe-inline' https://sdk.cashfree.com;
```

3DS redirects may hit various issuer / acquirer hosts — some merchants widen `frame-src` to cover `https:` for the 3DS leg, then narrow it after measuring real domains in production logs.

---

## 8. Backend Re-Verify — The Contract

No matter what mode or flow:

```
[browser: cashfree.checkout/pay resolves] → [browser: call your /verify/:orderId] →
[server: cashfree.PGFetchOrder(orderId)] → [decide based on order_status]
```

Never fulfill on the client's result alone. This is the Cashfree equivalent of signature verification in other PGs — see `migrate-from-razorpay/SKILL.md` §4 for the "why".

---

## 9. Error Codes

| `code` | Meaning | Fix |
|---|---|---|
| `session_expired` | `payment_session_id` older than ~15 min | Create fresh order on checkout entry |
| `invalid_payment_session_id` | Malformed or wrong environment | Ensure SDK `mode` matches backend env |
| `user_cancelled` | Customer closed modal / tab | Treat as non-terminal; offer retry |
| `network_error` | Browser couldn't reach Cashfree | Retry with backoff; surface "try again" UI |
| `invalid_payment_method` | `cashfree.pay` called with wrong object | Pass a component or the right shape |
| `component_not_mounted` | `.pay` called before `.mount` completed | Wait for `"ready"` event before enabling pay button |
| `cvv_required` | Saved-card reuse requires CVV | Collect via `cardCvv` component |
| `3ds_failed` | Customer failed bank challenge | Retry or pick another method |

---

## 10. Troubleshooting (SPA + iframe edge cases)

| Issue | Cause | Resolution |
|---|---|---|
| Double-mount warning in React StrictMode | Effect runs twice in dev | Guard with a ref; idempotent mount |
| Components re-mount on every parent re-render | Creating components inside render body | Create inside `useEffect` with empty dep array |
| Iframe shows "Refused to display" in dev console | CSP `frame-src` missing | Add `https://*.cashfree.com` to frame-src |
| `cashfree is not defined` inside SSR handler | Imported SDK at server-side | Dynamic import + "use client" boundary |
| Modal flashes then closes | Another overlay library fighting z-index | Inspect z-index; Cashfree modal uses a very high value, ensure no parent has `overflow: hidden` clipping |
| 3DS opens then page navigates, backend never verifies | Return URL hit but handler not running verify | Route `/verify/:orderId` handler must re-fetch; don't read success from query string |
| Mixed sandbox/prod | Frontend mode != backend keys | Single env source of truth; block deploys that have mismatches |
| Cashfree v1/v2 script co-loaded with v3 | Legacy tags still in HTML | Remove `checkout.cashfree.com/v1/*` and `v2/*` tags |

---

## 11. See Also

- `pg/token-vault/SKILL.md` — saved-card flow backend + cryptogram details.
- `pg/apis/SKILL.md` — server-side Order creation (prerequisite).
- `pg/webhooks/SKILL.md` — second source-of-truth for payment state.
- `migrate-from-razorpay/SKILL.md` §5 — Razorpay Checkout JS → Cashfree.js mapping.
- `common-mistakes/SKILL.md` — general integration gotchas.
