---
name: Changelog — PG REST API Version Line (x-api-version)
description: >
  Source-verified timeline of Cashfree's Payment Gateway REST API versions — the
  date-based x-api-version values (2021-05-21 → 2025-01-01) — with breaking changes,
  what-to-fix / what-to-test, and the 2025-01-01 vs 2026-01-01 reconciliation. Read
  changelog/SKILL.md first for the entry schema. Consumed by the upgrade-advisor skill.
---

# Changelog — PG REST API Version Line (`x-api-version`)

> Read `../changelog.md` (SKILL.md) §2 for the entry schema. **All data as-of 2026-06-23**, sourced from the `cashfree/docs` repo (`main`), the published OpenAPI specs in that repo, the public docs site, and the SDK source repos. Conflicts are called out, not smoothed over.

The REST API version is set per request via the `x-api-version: <DATE>` header. It is **independent of the SDK version** (see `pg-backend-sdks.md`).

---

## Timeline (newest → oldest)

| x-api-version | label | date | breaking? | headline |
|---|---|---|---|---|
| `2026-01-01` | — | unknown | **N/A — not a published API version** | SDK-internal default only (Node/Python/Go source). No docs, no OpenAPI spec, not in the version switcher. |
| `2025-01-01` | v5 | unknown | delta **undocumented** | Current/latest **published** REST version. Disputes, Utilities, Downtimes, Simulation, Easy-Split consolidated in the v5 OpenAPI; webhooks carry `x-idempotency-key`. No release-notes/migration doc for v4→v5. |
| `2023-08-01` | v4 | ~2024-01-23 | **Yes** | Cashfree IDs integer→string; `refund_` prefix dropped from `cf_refund_id`; payments/refunds/settlements URLs removed from order entity; `notify_url` dropped from Create Order; new Customer + Order Termination + SPOS APIs; new `x-deprecated-at` header. |
| `2022-09-01` | v3 | unknown | **Yes (vs v1/v2)** | The "new APIs" generation: JSON (not form-encoded), `payment_session_id` replaces `order_token`/`payment_link`, JS SDK v3 checkout, entity-based responses, offers/eligibility/BNPL/cardless-EMI, first-party SDKs. |
| `2022-01-01` | — | unknown | unverified | Listed as a prior version; no release-notes file in the repo. |
| `2021-05-21` | — | unknown | n/a (earliest) | Oldest listed `x-api-version`; no release-notes file. |

**Current/latest published:** `2025-01-01` (v5) — stated in `api-reference/payments/latest/overview.mdx`, the legacy overview pages, the public docs site, and the only `latest` OpenAPI spec (`openapi/payments/v2025-01-01.yaml`).

**Version switcher options** (public docs): `2025-01-01`, `2023-08-01`, `2022-09-01`, `2022-01-01`, `2021-05-21`.

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

## `2025-01-01` (v5) — current latest; breaking status NOT documented

- **Type:** Feature/consolidation (delta undocumented)
- **Breaking?:** Unknown — **no release-notes or migration doc exists for v4 (2023-08-01) → v5 (2025-01-01)** in `cashfree/docs` (no `latest/release-notes.mdx`; `/payments/online/changelog` is 404).
- **What changed (observable from the OpenAPI only):** the v5 surface consolidates **Disputes, Utilities, Downtimes, Simulation, Easy-Split** as first-class tag groups; webhooks carry `x-idempotency-key`. Exact field-level deltas vs v4 are unpublished.
- **What to fix / test / backward compat:** not documented — cannot state authoritatively. For new integrations, pin `x-api-version: 2025-01-01` (matches the OpenAPI default and the other local skill templates).
- **Source:** `cashfree/docs` → `api-reference/payments/latest/overview.mdx` ("The latest API version is **2025-01-01** (v5)…") · OpenAPI `openapi/payments/v2025-01-01.yaml` (`x-api-version` default `2025-01-01`, enum `["2025-01-01"]`) · `https://www.cashfree.com/docs/api-reference/payments/latest` — as-of 2026-06-23

---

## `2025-01-01` (published) vs `2026-01-01` (SDK default)

These are **two layers that are out of sync** — use the right one for the right purpose:

| Layer | Treats as current | Evidence |
|---|---|---|
| **Published REST API** (docs + OpenAPI + version switcher) | `2025-01-01` (v5) | `latest/overview.mdx`; only `latest` spec is `v2025-01-01.yaml`; public docs |
| **First-party SDK source** (Node, Python, Go) | `2026-01-01` (hardcoded default) | Go `configuration.go` `XApiVersion = "2026-01-01"`; Node `configuration.ts` ("OpenAPI document: 2026-01-01"); Python (only `2026-01-01` appears, not `2025-01-01`) |

- `2025-01-01` is the latest **published** REST version — use it for header values and curl examples.
- The current Node/Python/Go SDKs default `x-api-version` to `2026-01-01` internally.
- **`2026-01-01` is NOT a documented/published API version** — no docs folder, no OpenAPI spec, no release notes, absent from the version switcher. It exists only as the version the generated SDKs are stamped with; do not present it as a documented REST version. If you need the documented v5 contract, pin `2025-01-01` explicitly.

---

## Deprecation / sunset status

- `2022-09-01` and `2023-08-01` are filed under `api-reference/payments/previous/`; `2025-01-01` is `latest`. Both previous overview pages steer new integrations to `v2025-01-01`.
- The `2023-08-01` release added the **`x-deprecated-at` response header** — deprecation dates are delivered **at runtime per call**, not as a static published table.
- **No published sunset dates** were found for any version. `2021-05-21` and `2022-01-01` have no docs folders/specs (only listed by name), implying they are oldest/least-supported, but no formal sunset date is stated.

