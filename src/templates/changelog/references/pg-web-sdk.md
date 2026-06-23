---
name: Changelog — PG Web / JS SDKs (cashfree.js v3, pg-react, pg-svelte)
description: >
  Source-verified changelog for Cashfree's PG browser/JS SDKs — cashfree.js (the
  /js/v3/ browser SDK + npm @cashfreepayments/cashfree-js), pg-react, pg-svelte.
  Read changelog/SKILL.md first for the entry schema. Consumed by the upgrade-advisor skill.
---

# Changelog — PG Web / JS SDKs

> Read `../changelog.md` (SKILL.md) §2 for the entry schema. **As-of 2026-06-23.** Sources: `gh api` (tags/releases/commits), the npm registry JSON API, the served `https://sdk.cashfree.com/js/v3/cashfree.js`, and the `cashfree/docs` repo.

> **Read this first — "v3" is not a semver.** The `v3` in `https://sdk.cashfree.com/js/v3/cashfree.js` denotes the **API version line (2022-09-01)** the SDK pairs with, **not** the JS file's version. The actual artifact ships as npm **`@cashfreepayments/cashfree-js` 1.0.x**. The CDN exposes only the `/js/v3/` path and always serves the latest of the v3 line — **there is no pinnable sub-version on the CDN** (docs `payments/online/element/overview.mdx`).

---

## cashfree-js (browser SDK + npm ESM)

`current: 1.0.7 via npm (@cashfreepayments/cashfree-js, latest); newest git tag: none (repo has no tags/releases); CDN /js/v3/ serves latest of the v3 line (unversioned)`

Repo `cashfree/cashfree-js` has **no git tags or GitHub releases**; the versions below are dated from npm publish history.

| version | date (npm) | breaking? | headline |
|---|---|---|---|
| 1.0.7 | 2026-03-26 | No | Retry logic on load/network failure; timeout tuning (dist-only) |
| 1.0.6 | 2026-01-30 | No | Packaging/formatting refresh |
| 1.0.5 | 2024-07-02 | No | v3 JS descriptions/metadata |
| 1.0.2 | 2023-03-17 | No | Add ESM build |
| 1.0.1 | 2023-03-17 | No | Package rename to `@cashfreepayments/cashfree-js` |
| 1.0.0 | 2023-03-17 | No | First publish |

**No breaking change exists within the v3 / 1.0.x line.** Public surface is stable: `load`, `create`, `pay`, `checkout`, `subscriptionsCheckout`. Source: `registry.npmjs.org/@cashfreepayments/cashfree-js` + repo commits — as-of 2026-06-23.

### cashfree.js v1/v2 → v3 — BREAKING (the one real web transition)

- **Type:** Breaking (platform transition; tied to API `2022-09-01`)
- **Breaking?:** Yes — legacy web checkout is deprecated.
- **What changed:** Legacy V1/V2 web checkout (JS from `checkout.cashfree.com`) used `order_token`/`payment_link` and let you redirect to checkout straight from the API. V3 (`2022-09-01`) **removed that** — Create Order now returns **`payment_session_id`**, and you **must** use `cashfree.js` (`sdk.cashfree.com/js/v3/`) to start checkout. All `cf_*` IDs also became **strings** (see `pg-api-versions.md`).
- **What to fix (your code):** Replace any `checkout.cashfree.com` script with `<script src="https://sdk.cashfree.com/js/v3/cashfree.js">` (or `npm i @cashfreepayments/cashfree-js`); stop reading `order_token`/`payment_link`, read **`payment_session_id`**; init `const cashfree = await load({ mode })` then `cashfree.checkout({ paymentSessionId, redirectTarget })`; treat `cf_*` IDs as strings.
- **What to test:** Order create returns `payment_session_id`; checkout for each `redirectTarget` (`_self`/`_blank`/`_top` redirect, `_modal`/inline DOM); the `checkout()` promise resolves for `_modal`/inline; string `cf_*` IDs round-trip.
- **Backward compat:** Not backward compatible. V1/V2 merchants must migrate; V3 (2022-09-01) merchants are already on the current model.
- **Source:** `cashfree/docs` → `payments/migration/overview.mdx`, `payments/migration/migration.mdx`; method shapes in `payments/online/web/redirect.mdx` and `payments/online/element/sdks.mdx` — as-of 2026-06-23

> **Verified V3 method shapes** (read from docs, not inferred): `load({ mode })` → `cashfree`; hosted: `cashfree.checkout({ paymentSessionId, redirectTarget })`; headless/Elements: `cashfree.create("cardNumber"|"cardCvv"|"cardHolder"|"cardExpiry"|"savePaymentInstrument", opts)` then `cashfree.pay({…})`; subscriptions: `subscriptionsCheckout` (present in the served bundle).

---

## pg-react (React components over the JS SDK)

`current: 1.0.3 via npm (@cashfreepayments/pg-react); newest git tag: v1.0.3; mismatch: no`

Repo `cashfree/pg-react` (created 2025-05-14). Depends on `@cashfreepayments/cashfree-js ^1.0.5`; **peers `react`/`react-dom ^19.1.0`** (React 19 required), `@reduxjs/toolkit`, `react-redux`. Provides `<Cashfree>` + `CardNumber`/`CardHolder`/`CardExpiry`/`CardCVV`/`SaveInstrument` with an `onComplete` callback.

| version | date | breaking? | headline |
|---|---|---|---|
| 1.0.3 | 2025-05-20 | No | Latest published; same deps as 1.0.1 |
| 1.0.1 | 2025-05-20 | No | First npm publish |

No breaking changes (deps + component API identical across published versions). `1.0.0`/`1.0.2` exist as git tags/releases but are not reachable as npm `latest`. **Host requirement:** React 19. Source: `gh api repos/cashfree/pg-react/{tags,releases}` + `registry.npmjs.org/@cashfreepayments/pg-react` — as-of 2026-06-23.

---

## pg-svelte (Svelte components over the JS SDK)

`current: 1.0.5 via npm (@cashfreepayments/pg-svelte); newest git tag: v1.0.5; mismatch: no`

Repo `cashfree/pg-svelte` (created 2025-04-03). Depends on `@cashfreepayments/cashfree-js ^1.0.5`; **peer `svelte ^5.0.0`** (Svelte 5 required). API: `<Cashfree bind:this {mode} on:complete>` + element components; pay via `component.pay({ paymentSessionId, redirectTarget, redirect })` → `{ error?, redirect?, paymentDetails? }`.

| version | date | breaking? | headline |
|---|---|---|---|
| 1.0.5 | 2025-05-21 | No | Latest published; same deps/peers as 1.0.4 |
| 1.0.4 | 2025-04-17 | No | First npm publish |

No breaking changes (deps/peers identical between published versions). `1.0.0`–`1.0.3` exist only as git tags. **Host requirement:** Svelte 5. Source: `gh api repos/cashfree/pg-svelte/{tags,releases}` + `registry.npmjs.org/@cashfreepayments/pg-svelte` — as-of 2026-06-23.

