---
name: Changelog — Subscriptions (Recurring Payments / Mandates)
description: >
  Source-verified changelog for Cashfree Subscriptions — the new mandate-based
  Subscriptions API (part of the PG x-api-version line), the legacy Subscriptions v1
  API, and the SDK subs* methods. Read changelog/SKILL.md first for the schema.
  Consumed by the upgrade-advisor skill.
---

# Changelog — Subscriptions

> Read `../changelog.md` (SKILL.md) §2 for the entry schema. **As-of 2026-06-23.** Sources: `cashfree/docs` (OpenAPI specs + API-reference `.mdx`), the PG SDK source/releases, and the `android-subscription-sdk` sample. Every version/endpoint/method claim was checked against a spec, source file, or release note.

## How Subscriptions is versioned (read first — there are TWO products)

1. **New mandate-based Subscriptions API — part of the PG REST `x-api-version` line (NOT a separate version line).** Lives in the same PG OpenAPI specs as Orders/Payments. Paths (`/subscriptions`, `/plans`, `/subscriptions/{id}/payments`, `/subscriptions/{id}/refunds`, `/subscriptions/pay/...`) sit under base **`https://api.cashfree.com/pg`** and are versioned by the shared **`x-api-version`** date header (`2023-08-01` → `2025-01-01`). There is no independent "Subscriptions API version" number. (Verified: `/subscriptions` + `/plans` present in `openapi/payments/v2023-08-01.yaml` and `v2025-01-01.yaml`; absent from `v2022-09-01.yaml`.)
2. **Legacy "Subscriptions v1" — a genuinely separate, older API.** Different host/path: `https://api.cashfree.com/api/v2/subscriptions/...` (`https://test.cashfree.com` for test). OpenAPI `openapi/subscriptions/subscriptionsv1.yml`, title "Cashfree Subscription API". Independent of the PG `x-api-version`. Filed under docs `.../previous/subscriptionsv1/` (superseded).
3. **SDKs.** PG backend SDKs added the subscription method family (`subs*`) in **4.2.0**; they are thin wrappers (API version passed as the first arg in the legacy style). The mobile `android-subscription-sdk` sample uses a different artifact, `com.cashfree.subscription:coresdk:0.0.1` (web-checkout wrapper: `CFSubscriptionPaymentService.doPayment(url)`), unrelated to the PG SDKs.

---

## A. PG REST `x-api-version` line (governs the new Subscriptions API surface)

| x-api-version | date | breaking? | headline |
|---|---|---|---|
| `2022-09-01` (and earlier) | — | — | No new-style Subscriptions API; `/subscriptions` & `/plans` absent |
| `2023-08-01` | (version id) | **Yes** (new surface) | New mandate-based Subscriptions API under `/pg` (subscriptions, plans, payments, refunds) |
| `2025-01-01` (v5, latest) | (version id) | No (additive) | Adds 6 "controlled" pre-debit notify+execute endpoints for UPI mandates |

### API `2023-08-01` — new mandate-based Subscriptions API (BREAKING vs legacy v1)
- **Breaking?:** Yes (new surface; migration off legacy v1).
- **What changed:** RESTful Subscriptions under PG base `/pg`, `x-api-version: 2023-08-01`. Endpoints: `POST/GET /subscriptions`, `GET/POST /subscriptions/{id}`, `POST /subscriptions/{id}/manage` (CANCEL/PAUSE/ACTIVATE/CHANGE_PLAN), `GET/POST /plans`, `GET /plans/{id}`, `/subscriptions/{id}/payments[...]`, `/subscriptions/{id}/refunds[...]`, `POST /subscriptions/pay`, `/subscriptions/eligibility/payment_methods`. Distinct from legacy v1 (`/api/v2/subscriptions`, host without `/pg`).
- **What to fix (your code):** if migrating off legacy v1, change host/path from `api.cashfree.com/api/v2/subscriptions/...` to `api.cashfree.com/pg` + the new resource paths; send `x-api-version: 2023-08-01` + `x-client-id`/`x-client-secret`; move from v1 verb endpoints (activate/pause/cancel/charge) to the resource + `/manage` model; map plan creation to `POST /plans`.
- **What to test:** create plan → create subscription (mandate auth) → fetch → raise payment (`/subscriptions/pay`) → manage (pause/activate/cancel) → fetch payments/refunds; verify the post-auth redirection payload; sandbox first.
- **Backward compat:** additive at PG-API level (no PG endpoints removed); **not a drop-in** for legacy v1 (different host/paths/model — treat as a migration). Legacy v1 still documented under `.../previous/subscriptionsv1/`.
- **Source:** `cashfree/docs` → `openapi/payments/v2023-08-01.yaml`, `api-reference/payments/previous/v2023-08-01/subscription` — as-of 2026-06-23

### API `2025-01-01` — controlled pre-debit notify + execute (NON-breaking, UPI only)
- **Breaking?:** No — purely additive.
- **What changed:** 6 new endpoints vs `2023-08-01` (nothing removed): `POST /subscriptions/pay/controlled/notify-mandate`, `POST /subscriptions/pay/controlled/execute-mandate`, and four `GET .../controlled/notifications|executions[/{id}]`. Implements the RBI pre-debit-notification-then-charge flow. **UPI mandates only** (docs: eNACH/PNACH not supported; card "planned for a future release").
- **What to fix (your code):** optional. To adopt: send `x-api-version: 2025-01-01`, call notify-mandate, then execute-mandate after the compliance window; poll status via the new GETs. Existing `2023-08-01` integrations need no change.
- **What to test:** for UPI-mandate subs: notify → wait window → execute → confirm status; confirm the non-controlled `/subscriptions/pay` path is unchanged; confirm eNACH/PNACH/card aren't routed through controlled endpoints.
- **Backward compat:** fully backward compatible — additive endpoints; no removals/signature changes on existing subscription endpoints between `2023-08-01` and `2025-01-01`.
- **Source:** `cashfree/docs` → `openapi/payments/v2025-01-01.yaml`; `api-reference/payments/latest/subscription/payment/create-controlled-notification.mdx` — as-of 2026-06-23

---

## B. PG backend SDK subscription methods

| version | date | breaking? | headline |
|---|---|---|---|
| 4.2.0 | 2024-07-12 | No (additive) | "SDK now supports Subscription APIs" — adds the `subs*` method family (default `x-api-version` 2023-08-01) |
| 5.1.3 (latest Node) | 2026-04-22 | No (for subs) | Same 11 `subs*` methods, unchanged; SDK documented `x-api-version` now 2025-01-01 |

### SDK 4.2.0 — PG SDKs gain subscription methods
- **Breaking?:** No (additive). **What changed:** added the `subs*` family (Node `api.ts` @4.2.0, 11 methods): `subsCreatePlan`, `subsFetchPlan`, `subsCreateSubscription`, `subsFetchSubscription`, `subsManageSubscription`, `subsCreatePayment`, `subsFetchSubscriptionPayment`, `subsFetchSubscriptionPayments`, `subsManageSubscriptionPayment`, `subsCreateRefund`, `subsFetchSubscriptionRefund` (+ helpers `subscriptionDocumentUpload`, `subscriptionEligibility`). Note the naming is `subs*`, **not** `PGCreateSubscription`. **What to fix:** upgrade SDK ≥ 4.2.0; call `subs*`, passing the API version as the first arg in the legacy style. **What to test:** plan/subscription/payment/refund flows against sandbox. **Backward compat:** additive; the `subs*` set is **identical 4.2.0 → 5.1.3** (no renames/removals), so subscription code survives the 4.x→5.x bump — only the `x-api-version` you pass changed default. **Source:** `cashfree/cashfree-pg-sdk-nodejs` release 4.2.0 + `api.ts` @4.2.0/5.1.3 — as-of 2026-06-23

