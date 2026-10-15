---
name: Changelog — PG REST API Version Line (x-api-version)
description: >
  Source-verified timeline of Cashfree's Payment Gateway REST API versions — the
  date-based x-api-version values (2021-05-21 → 2026-01-01) — with breaking changes,
  what-to-fix / what-to-test, and the 2026-01-01 vs 2025-01-01 reconciliation. Read
  changelog/SKILL.md first for the entry schema. Consumed by the upgrade-advisor skill.
---

# Changelog — PG REST API Version Line (`x-api-version`)

> Read `../changelog.md` (SKILL.md) §2 for the entry schema. **Base data as-of 2026-06-23**; the version-line status was **re-verified against the live docs on 2026-10-16** (`2026-01-01` is now the published latest). Sourced from the `cashfree/docs` repo (`main`), the published OpenAPI specs in that repo, the public docs site, and the SDK source repos. Conflicts are called out, not smoothed over.

The REST API version is set per request via the `x-api-version: <DATE>` header. It is **independent of the SDK version** (see `pg-backend-sdks.md`).

---

## Timeline (newest → oldest)

| x-api-version | label | date | breaking? | headline |
|---|---|---|---|---|
| `2026-01-01` | v6 | ~2026 | **Yes** | Current/latest **published** REST version (docs confirm "Cashfree API v2026-01-01 is now available"). New: Order Pay Authorise-Only, controlled subscription payments, `par` field, device-context headers, `offer_filters`, `upi_app_priority`, settlement-status filter, Partner/PA-Partner auth. Breaking response changes: Get Settlements by Order ID nested object, Get All Settlements paginated, Get Order Extended `offer`→`offers`, `bbps` removed from Create Order, Create Subscription body restructured. SDK v6 default. |
| `2025-01-01` | v5 | unknown | delta **undocumented** | **Previous** published REST version. Disputes, Utilities, Downtimes, Simulation, Easy-Split consolidated in the v5 OpenAPI; webhooks carry `x-idempotency-key`. No release-notes/migration doc for v4→v5. |
| `2023-08-01` | v4 | ~2024-01-23 | **Yes** | Cashfree IDs integer→string; `refund_` prefix dropped from `cf_refund_id`; payments/refunds/settlements URLs removed from order entity; `notify_url` dropped from Create Order; new Customer + Order Termination + SPOS APIs; new `x-deprecated-at` header. |
| `2022-09-01` | v3 | unknown | **Yes (vs v1/v2)** | The "new APIs" generation: JSON (not form-encoded), `payment_session_id` replaces `order_token`/`payment_link`, JS SDK v3 checkout, entity-based responses, offers/eligibility/BNPL/cardless-EMI, first-party SDKs. |
| `2022-01-01` | — | unknown | unverified | Listed as a prior version; no release-notes file in the repo. |
| `2021-05-21` | — | unknown | n/a (earliest) | Oldest listed `x-api-version`; no release-notes file. |

**Current/latest published:** `2026-01-01` (v6) — the live docs state "Cashfree API v2026-01-01 is now available"; the Create Order page's current `x-api-version` is `2026-01-01`, with `2025-01-01` listed as the previous version. (Base data as-of 2026-06-23 treated `2025-01-01` as latest; re-verified 2026-10-16.)

**Version switcher options** (public docs): `2026-01-01`, `2025-01-01`, `2023-08-01`, `2022-09-01`, `2022-01-01`, `2021-05-21`.

---

## `2023-08-01` (v4) — BREAKING

- **Type:** Breaking
- **Breaking?:** Yes — ID types and order-entity shape change.
- **What changed:**
  - **Cashfree IDs are now strings** (`cf_order_id`, `cf_payment_id`, `cf_refund_id`, `cf_link_id`, `cf_settlement_id`, `cf_terminal_id`, …) — previously integers.
  - **`cf_refund_id` loses its `refund_` prefix** — old `"refund_41805719"` → new `"41805719"`.
  - **Order entity slimmed** — `payments`, `refunds`, `settlements` URL objects removed from the order response.
  - `customer_uid` added under `customer_details` (via the new Create Customer API).
  - `order_status` gains `TERMINATED` and `TERMINATION_REQUESTED`.
  - **`notify_url` no longer supported in Create Order** — configure webhooks from the dashboard instead.
  - New response header **`x-deprecated-at`** (deprecation date for the version you're calling).
  - **New APIs:** Order Termination (`PATCH /orders/{order_id}`), Customer management (`POST /customers`), SPOS/terminal, disputes.
- **What to fix (your code):**
  - Send `x-api-version: 2023-08-01`.
  - Treat all `cf_*` IDs as **strings** in models, DB columns, comparisons (stop parsing to int).
  - Remove any code assuming the `refund_` prefix on `cf_refund_id`.
  - Stop reading `payments`/`refunds`/`settlements` URLs off the order entity — call the dedicated endpoints.
  - Remove `notify_url` from Create Order payloads; move webhook config to the dashboard.
  - Handle the two new `order_status` values.
- **What to test:**
  - ID round-tripping as strings end-to-end (create → fetch → webhook → reconciliation).
  - Refund-ID matching against stored records (prefix change).
  - Webhook delivery now that `notify_url` is ignored.
  - Order-status state machine with `TERMINATED` / `TERMINATION_REQUESTED`.
- **Backward compat:** breaking; old callers keep old behavior only by keeping the old `x-api-version`. New types/shape apply only when you send `2023-08-01`.
- **Source:** `cashfree/docs` → `api-reference/payments/previous/v2023-08-01/release-notes.mdx` · `payments/migration/overview.mdx` · legacy changelog `https://cashfree-checkoutcartimages-prod.cashfree.com/pgnextgenapi-changelog.html` (single dated entry **2024-01-23**) · OpenAPI `openapi/payments/v2023-08-01.yaml` — as-of 2026-06-23

---

## `2022-09-01` (v3) — BREAKING (the "new APIs" generation)

- **Type:** Breaking
- **Breaking?:** Yes vs V1/V2.
- **What changed:**
  - The v2/v3 → "new APIs" cutover. Merchants on **V1/V2 must migrate**; merchants already on V3 only have the smaller v3→v4 delta.
  - **`payment_session_id` replaces `order_token` and `payment_link`** in the Create Order response — you can no longer redirect to checkout from the API alone; you must use **JS SDK v3**.
  - **New Order Pay API** takes `payment_session_id` (not `order_token`).
  - **JSON payloads** replace form-encoded data; **entity-based responses**.
  - New payment methods: BNPL, Cardless EMI, wider card-EMI banks; **offer suite** + **customer eligibility** APIs.
  - New first-party SDKs (Go/Java/Node/PHP/C#/Python), all using `payment_session_id`.
  - **Domain/app-package whitelisting** required for checkout.
- **What to fix (your code):**
  - Set `x-api-version: 2022-09-01`.
  - Replace all `order_token`/`payment_link` usage with `payment_session_id` + JS SDK v3 checkout.
  - Switch Order Pay to send `payment_session_id`.
  - Convert request bodies form-encoded → JSON; adapt response parsing to entity shapes.
  - Submit domain/app-package whitelisting before go-live.
- **What to test:** full checkout via `payment_session_id` + JS SDK (redirect + component flows); JSON request/response on every endpoint; whitelisting enforcement.
- **Backward compat:** breaking vs V1/V2.
- **Source:** `cashfree/docs` → `payments/migration/migration.mdx` · `payments/migration/overview.mdx` · `api-reference/payments/previous/v2022-09-01/overview.mdx` · OpenAPI `openapi/payments/v2022-09-01.yaml` — as-of 2026-06-23

> **Note:** the SDK **4.0.0** line aligned to the **`2023-08-01`** surface (the migration guide's SDK examples pass `"2023-08-01"`) — i.e. the **v3 → v4** transition, not `2022-09-01`.

---

## `2026-01-01` (v6) — current latest; BREAKING vs v5

- **Type:** Feature + breaking response-schema changes
- **Breaking?:** Yes — several response schemas differ from `2025-01-01`. Code that reads the previous response structure will break after upgrading.
- **What changed (from the live overview):**
  - **New endpoint:** Order Pay Authorise-Only (authorise a card payment without immediate capture; requires the `AUTHORIZE_ONLY` flag on the merchant account).
  - **Controlled subscription payments:** two-step flow for UPI Autopay and card mandates (pre-debit notification then trigger debit; eNACH/PNACH not supported).
  - **New fields/headers:** device-context headers on Order Pay and Get Eligible Payment Methods; `offer_filters` and `upi_app_priority` on Create Order; settlement-status filter on Get All Settlements; subscription support on Create Payment Link; `par` field for card payments.
  - **Auth:** Partner and PA-Partner authentication now works on more endpoints (incl. Collect-from-India import settlement APIs).
  - **Breaking response changes:** Get Settlements by Order ID returns a nested object; Get All Settlements returns a paginated list; Mark Order for Settlement returns HTTP 200 (was 202) with a body; Get Order Extended changes `offer` → `offers` array.
  - **Removed:** `bbps` on Create Order.
  - **Subscriptions:** Create Subscription uses a restructured body and adds `subscription_tags` and `subscription_payment_splits`. (`customer_bank_account_holder_name` is retained — still in the v6 schema, mandatory for TPV; the overview's "removed" note is contradicted by the live schema, verified 2026-10-16.)
- **What to fix (your code):** send `x-api-version: 2026-01-01` (or rely on the v6 SDK default); update settlement, order-extended, and subscription response parsing; drop `bbps` from Create Order; handle the new HTTP 200 on Mark Order for Settlement.
- **What to test:** every settlement read, Get Order Extended `offers`, subscription create/manage, webhook payloads (updated examples in v6).
- **Backward compat:** pin `x-api-version: 2025-01-01` to stay on the previous contract until you migrate.
- **Source:** `https://www.cashfree.com/docs/api-reference/payments/overview` ("Cashfree API v2026-01-01 is now available") · `https://www.cashfree.com/docs/api-reference/payments/latest/orders/create` (current version `2026-01-01`) — re-verified 2026-10-16

---

## `2025-01-01` (v5) — previous published version; breaking status vs v4 NOT documented

- **Type:** Feature/consolidation (delta vs v4 undocumented)
- **Breaking?:** Unknown — **no release-notes or migration doc exists for v4 (2023-08-01) → v5 (2025-01-01)** in `cashfree/docs` (no `latest/release-notes.mdx`; `/payments/online/changelog` is 404).
- **What changed (observable from the OpenAPI only):** the v5 surface consolidates **Disputes, Utilities, Downtimes, Simulation, Easy-Split** as first-class tag groups; webhooks carry `x-idempotency-key`. Exact field-level deltas vs v4 are unpublished.
- **What to fix / test / backward compat:** not documented — cannot state authoritatively. Still a valid pin for integrations that want the pre-`2026-01-01` contract.
- **Source:** `cashfree/docs` → `api-reference/payments/previous/v2025-01-01/overview.mdx` · OpenAPI `openapi/payments/v2025-01-01.yaml` · `https://www.cashfree.com/docs/api-reference/payments/previous/v2025-01-01` — as-of 2026-06-23 (now filed under `previous/`)

---

## `2026-01-01` (published latest) vs `2025-01-01` (previous)

As of 2026-10-16 the published REST API and the v6 SDK default **agree** — both are `2026-01-01`. (This replaces the earlier out-of-sync state where the docs were still on `2025-01-01` while SDKs had already stamped `2026-01-01`.)

| Layer | Treats as current | Evidence |
|---|---|---|
| **Published REST API** (docs + version switcher) | `2026-01-01` (v6) | overview "v2026-01-01 is now available"; Create Order page current version `2026-01-01`; `2025-01-01` filed under `previous/` |
| **First-party SDK source** (Node, Python, Go, PHP, etc.) | `2026-01-01` (hardcoded default) | Go `configuration.go` `XApiVersion = "2026-01-01"`; Node `configuration.ts` ("OpenAPI document: 2026-01-01"); PHP `Cashfree.php` `public $XApiVersion = "2026-01-01"` |

- `2026-01-01` is the latest **published** REST version — use it for header values and curl examples.
- The current v6 SDKs default `x-api-version` to `2026-01-01`, which now matches the docs.
- **Docs caveat:** some pages (e.g. Pay Order, Authentication) still show `2025-01-01` defaults in their examples — send `x-api-version` explicitly if you need certainty.
- If you depend on the previous v5 contract, pin `2025-01-01` explicitly until you migrate (see the breaking changes above).

---

## Deprecation / sunset status

- `2022-09-01`, `2023-08-01`, and now `2025-01-01` are filed under `api-reference/payments/previous/`; `2026-01-01` is `latest`. Previous overview pages steer new integrations to the latest version.
- The `2023-08-01` release added the **`x-deprecated-at` response header** — deprecation dates are delivered **at runtime per call**, not as a static published table.
- **No published sunset dates** were found for any version. `2021-05-21` and `2022-01-01` have no docs folders/specs (only listed by name), implying they are oldest/least-supported, but no formal sunset date is stated.

