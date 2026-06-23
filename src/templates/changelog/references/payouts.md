---
name: Changelog — Payouts (SDKs + REST API)
description: >
  Source-verified changelog for Cashfree Payouts — the Payouts REST API version line
  (its own x-api-version, distinct from PG) and the per-language payout SDKs. Read
  changelog/SKILL.md first for the schema. Consumed by the upgrade-advisor skill.
---

# Changelog — Payouts

> Read `../changelog.md` (SKILL.md) §2 for the entry schema. **As-of 2026-06-23.** Sources: repos `cashfree-payout`, `cashfree-payout-sdk-{nodejs,python,java,php,dotnet}`; `cashfree/docs` (`payouts/payouts/change-log-payouts.mdx`, `openapi/payouts/*.yaml`); registry metadata (npm, PyPI, Maven Central, Packagist, NuGet).

> ⚠️ **The product changelog (`change-log-payouts.mdx`) is month-bucketed feature notes with NO version numbers and NO `x-api-version` dates** — it cannot date SDK or API releases. All dates below come from git tags + registry timestamps + OpenAPI specs.

---

## 1. Payouts REST API version line

Payouts v2 uses its own required `x-api-version` header (format `YYYY-MM-DD`), **independent of the PG API version line.**

| x-api-version | source | breaking? | headline |
|---|---|---|---|
| (v1 — no dated header) | `openapi/payouts/payoutsv1.yaml` (`info.version 3.0.0`) | n/a | Legacy Payouts v1 (`/payout/v1/*`), bearer-token auth, no `x-api-version` header |
| `2024-01-01` | `openapi/payouts/payoutsv2.yaml` + all SDK manifests | **Yes** (vs v1) | Payouts v2 — consolidated transfers + standardized beneficiary/error model |

Only **one dated `x-api-version` (`2024-01-01`)** exists for v2 (no later dated version found in any spec/SDK/doc). The OpenAPI `info.version` values (`payoutsv2.yaml`=`4`, `payoutsv1.yaml`=`3.0.0`) are spec-doc revisions, **not** wire `x-api-version` values.

### Payouts API `2024-01-01` (v2) — BREAKING vs v1
- **What changed:** v2 introduces dated `x-api-version` versioning, a consolidated transfers endpoint, richer beneficiary management (create/get/remove beneficiary v2), standardized request/response shapes, and standardized error codes. Base URLs `https://api.cashfree.com/payout` (prod) / `https://sandbox.cashfree.com/payout` (test).
- **What to fix (your code):** send `x-api-version: 2024-01-01` on every v2 call; migrate `/payout/v1/*` → v2 transfer/beneficiary endpoints; branch on the standardized error-code field, not v1 message strings.
- **What to test:** beneficiary create/get/remove; standard + batch transfer init; transfer-status fetch; webhook signature verification against `2024-01-01`.
- **Backward compat:** v1 (`/payout/v1/*`) remains a separate documented line; v2 is **not a drop-in** for v1 (different paths/payloads + required header).
- **Source:** `cashfree/docs` → `openapi/payouts/payoutsv2.yaml`, `api-reference/payouts/v2/payouts-api-v2-new.mdx` — as-of 2026-06-23

---

## 2. SDK usage pattern (verified at current tags)

All payout SDKs use **static/class-level credential config + a version-first method argument** (no instance-credential constructor): set `XClientId`/`XClientSecret` on the class, then pass `x_api_version`/`xApiVersion` (`"2024-01-01"`) as the **first argument** of each method (e.g. `PayoutInitiateTransfer(xApiVersion, xRequestId, request, …)`). This mirrors the PG SDKs' legacy style.

---

## 3. Per-language SDK timelines

> Most payout SDKs have a **single same-day 0.0.x release train** (Mar 2024); no breaking blocks apply within those. The exception is the **Java** SDK (see below).

### Node.js — npm `cashfree-payout`
`current: 0.0.14 (2024-03-13); newest git tag: 0.0.14; mismatch: no` — single published version; v2 client, `x-api-version 2024-01-01`. No breaking blocks.

### Python — PyPI `cashfree_payout`
`current: 0.0.13 (2024-03-11); newest git tag: 0.0.13; mismatch: no` — same-day 0.0.8→0.0.13 iterations; OpenAPI doc version `2024-01-01`; pydantic <2, urllib3 <2.1. No breaking blocks.

### PHP — Packagist `cashfree/cashfree-payout`
`current: 0.0.11 (2024-03-11); newest git tag: 0.0.11; mismatch: no` — static config `\Cashfree\Cashfree::$XClientId`, guzzle ^7.3. No breaking blocks.

### .NET — NuGet `cashfree_payout`
`current: 0.0.16 (2024-03-14); newest git tag: 0.0.16; mismatch: no` — `Cashfree` class, `xApiVersion "2024-01-01"`, multi-TFM (net47–net7.0). (0.0.14 tagged but not on NuGet.) No breaking blocks.

### Go — repo `cashfree-payout`
`current: not on a public registry (git-only); newest git tag: v0.0.3 (2024-02-26)` — OpenAPI-generated Go v2 client (`client.go`, `api_transfers_v2.go`, `api_beneficiary_v2.go`). Install via git path.

### Java — Maven Central `com.cashfree.payout.java:cashfree_payout`
`current: 2.0.2 via Maven Central (2025-01-22); newest git tag: 2.0.1; mismatch: YES (2.0.2 published without a matching tag)`

| version | date | breaking? | headline |
|---|---|---|---|
| 2.0.2 | 2025-01-22 (Maven) | — | Maven-only patch over 2.0.1 (no git tag); `Cashfree.java` removed |
| 2.0.1 | 2025-01-22 | **Yes** | Real Payout SDK: `CashfreePayout` class, `xApiVersion 2024-01-01` |
| 0.0.14 | 2024-03-11 | **Yes** | ⚠️ Artifact was actually the **PG SDK** (`Cashfree` class, `PGCreateOrder`, `2022-09-01`) |
| 0.0.3–0.0.12 | 2024-03-08→11 | — | Early tags (the mislabeled-PG-client line) |

#### Java Payout 2.0.1 — BREAKING (vs the mislabeled 0.0.x)
- **What changed:** the 0.0.x Java line was a **misconfiguration** — at tag 0.0.14 the README titled itself "Cashfree **PG** Java SDK", the public class was `Cashfree` with PG methods (`PGCreateOrder`/`PGFetchOrder`) and `xApiVersion = "2022-09-01"`. From **2.0.1** the SDK is correctly a Payout client: class renamed to **`CashfreePayout`**, `xApiVersion = "2024-01-01"`, payout methods (`PayoutInitiateTransfer`, `PayoutCreateBeneficiary`, …), each taking `xApiVersion` first. A later commit deleted the old `Cashfree.java`.
- **What to fix (your code):** replace `Cashfree` → `CashfreePayout` (`CashfreePayout.XClientId/…`, `new CashfreePayout()`); change `2022-09-01` → `2024-01-01`; replace PG-style calls with `Payout*` methods. Use dependency **2.0.2** (newest published) — note there is no 2.0.2 git tag.
- **What to test:** compile against the renamed class; `PayoutInitiateTransfer`/`PayoutCreateBeneficiary`/`PayoutFetchTransfer` against `2024-01-01`; okhttp3 4.10.0 resolves.
- **Backward compat:** hard break (class rename + version-string change; no shim). The 0.0.14 artifact is effectively the wrong SDK for Payouts.
- **Source:** `cashfree/cashfree-payout-sdk-java` README @2.0.2 vs @0.0.14 — as-of 2026-06-23

