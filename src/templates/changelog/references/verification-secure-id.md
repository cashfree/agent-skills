---
name: Changelog — Verification / Secure ID (VRS SDKs + API)
description: >
  Source-verified changelog for Cashfree Verification / Secure ID (KYC, bank/identity
  verification) — the VRS REST API version line (its own x-api-version, distinct from PG),
  the server SDKs, and the mobile KYC SDKs. Read changelog/SKILL.md first for the schema.
  Consumed by the upgrade-advisor skill.
---

# Changelog — Verification / Secure ID (VRS)

> Read `../changelog.md` (SKILL.md) §2 for the entry schema. **As-of 2026-06-23.** Sources: repos `cashfree-verification-sdk-{java,nodejs,php,python}`, `cashfree-kyc-verification-sdk-{android,ios}`, `KycVerificationSdk`, `react-native-digilocker`; registries (npm, PyPI, Maven Central, Cashfree Maven, Packagist, CocoaPods); `cashfree/docs` (`openapi/vrs/*.yaml`, `api-reference/vrs/**`). "Verification / Secure ID" is a **distinct product from PG**, with its own SDKs and its own `x-api-version`.

---

## VRS REST API version line (`x-api-version`)

The Verification API uses its own `x-api-version`, **separate from PG**. There is **NO published, dated VRS API version timeline** in `cashfree/docs` — the only version evidence is the OpenAPI specs.

| x-api-version | status | where used | notes |
|---|---|---|---|
| `2024-12-01` | current / required default | most VRS v2 endpoints | `required: true`, `default: '2024-12-01'` in `openapi/vrs/vrsv2.yaml` |
| `2022-10-26` | optional / legacy | PAN endpoints only | `required: false`; "use any date after 2022-09-12" for aadhaar-seeding status |

**URL-path versions (distinct from `x-api-version`):**
- **VRS v1** — Bank Account Verification only. Host `https://payout-api.cashfree.com`, e.g. `GET /payout/v1.2/validation/bankDetails`.
- **VRS v2** — full current suite. Host `https://api.cashfree.com/verification` (sandbox `https://sandbox.cashfree.com/verification`), e.g. `POST /bank-account/sync`.

### VRS API v1 → v2 — BREAKING (path-version migration)
- **What changed:** v1 Bank Account Verification Sync (V1.2) is being retired for v2 BAV Sync. Doc: "This API will be retired soon. Please plan to migrate to the latest version, Bank Account Verification Sync V2." Migration also changes **host** (`payout-api.cashfree.com` → `api.cashfree.com/verification`) and **path** (`/payout/v1.2/validation/bankDetails` → `/bank-account/sync`).
- **What to fix (your code):** repoint base host; switch to v2 endpoint path + request/response shapes; adopt the v2 `x-api-version` header (`2024-12-01`).
- **What to test:** v2 BAV sync + async happy path; error responses; webhook signature on the new host.
- **Backward compat:** v1 still live but explicitly slated for retirement; no dual-write guarantee documented.
- **Source:** `cashfree/docs` → `api-reference/vrs/v1/bank-account-verification/bank-verification-sync-v12.mdx`, `openapi/vrs/vrsv1.yaml`, `openapi/vrs/vrsv2.yaml` — as-of 2026-06-23

> Cross-SDK gotcha: README example `x_api_version` values differ per SDK (Python `2022-09-01`, Java 3.0.0 `2024-01-01`, Node 4.x `2024-12-01`) — older ones are **stale examples**, not separate API versions. The VRS current default is `2024-12-01`; set it explicitly regardless of SDK.

---

## Server SDKs

### Java — Maven Central `com.cashfree.verification.java:cashfree_verification`
`current: 2.0.10 via Maven Central; newest git tag: 3.0.0; mismatch: YES — 3.0.0 is NOT on Maven Central` (`maven-metadata.xml` lists only up to 2.0.10; `pom.xml@3.0.0` declares 3.0.0 but the artifact was never published).

| version | date | breaking? | headline |
|---|---|---|---|
| 3.0.0 | 2025-06-26 (git) | **Yes** | Init class `Cashfree` → `CashfreeVrs`; instance usage. **Git-only; not on Maven Central.** |
| 2.0.10 | 2024-12-21 | No | **Latest on Maven Central** |
| 2.0.1 | 2024-12-18 | unconfirmed | First 2.x on Central |
| 1.0.3 | 2024-03-12 | No | Last 1.x on Central; README mislabeled "PG SDK"; init `Cashfree` static |

#### Java VRS 3.0.0 — BREAKING (not on Maven Central)
- **What changed:** init moved from static `Cashfree.X*` to `CashfreeVrs.X*` + instance `new CashfreeVrs()`; README corrected from "PG SDK" wording. **What to fix:** rename `Cashfree.*` → `CashfreeVrs.*`; `new CashfreeVrs()`; pass `xApiVersion`. **What to test:** re-init + one verification call compiles/runs in sandbox. **Backward compat:** source-breaking rename; **3.0.0 not retrievable from Maven Central** — Central users are capped at 2.0.10. **Source:** `cashfree-verification-sdk-java` README/pom @3.0.0; Maven `maven-metadata.xml` — as-of 2026-06-23

### Node.js — npm `cashfree-verification`
`current: 4.0.1; newest git tag: 4.0.1; mismatch: no`

| version | date | breaking? | headline |
|---|---|---|---|
| 4.0.1 | 2025-10-31 | No | Patch over 4.0.0 |
| 4.0.0 | 2025-10-29 | **Yes** | README init adds `Cashfree.XApiVersion = "2024-12-01"` |
| 3.0.0 | 2025-07-27 | unconfirmed | Major; init unchanged |
| 2.0.0 | 2024-11-08 | unconfirmed | Major; init unchanged |
| 1.0.0 | 2024-02-27 | n/a | Initial; class `Cashfree` |

#### Node VRS 4.0.0 — BREAKING (behavioral)
- **What changed:** README config now sets `Cashfree.XApiVersion = "2024-12-01"` (absent in v1–v3), aligning the SDK default with the current VRS API version. Exported class stays `Cashfree`; source is OpenAPI-generator output. **What to fix:** set `Cashfree.XApiVersion` explicitly (recommend `"2024-12-01"`); confirm your endpoints exist under that version. **What to test:** init + one call; verify the `x-api-version` header sent. **Backward compat:** no class/method rename; risk is behavioral for callers who relied on the old implicit version. **Source:** `cashfree-verification-sdk-nodejs` README @4.0.0 vs @3.0.0 — as-of 2026-06-23

### PHP — Packagist `cashfree/cashfree-verification`
`current: 3.0.1; newest git tag: 3.0.1; mismatch: no`

| version | date | breaking? | headline |
|---|---|---|---|
| 3.0.1 | 2025-07-14 | No | Latest patch |
| 3.0.0 | 2024-11-08 | unconfirmed | Major; init stays `CashfreeVrs` |
| 2.0.0 | 2024-10-15 | **Yes** | Init class `\Cashfree\Cashfree` → `\Cashfree\CashfreeVrs` |
| 1.0.0 | 2024-03-13 | n/a | Initial; class `\Cashfree\Cashfree` |

#### PHP VRS 2.0.0 — BREAKING
- **What changed:** static config class renamed `\Cashfree\Cashfree::$X*` → `\Cashfree\CashfreeVrs::$X*` (incl. `::$SANDBOX`); client `new \Cashfree\CashfreeVrs()`. **What to fix:** replace all `\Cashfree\Cashfree` → `\Cashfree\CashfreeVrs`. **What to test:** init + one call (e.g. `VrsVoterIdVerification`). **Backward compat:** source-breaking rename; no alias. **Source:** `cashfree-verification-sdk-php` README @2.0.0 vs @1.0.1 — as-of 2026-06-23

### Python — PyPI `cashfree-verification` (import `cashfree_verification`)
`current: 3.0.0; newest git tag: 3.0.0; mismatch: no`

| version | date | breaking? | headline |
|---|---|---|---|
| 3.0.0 | 2025-07-27 | unconfirmed | Major; README init unchanged |
| 2.0.0 | 2024-11-08 | unconfirmed | Major; README init unchanged |
| 1.0.3 | 2024-03-12 | No | Patch; config `Cashfree.X*`, `x_api_version = "2022-09-01"` |

No confirmed breaking block: across v1→v3 the README config, package layout, and OpenAPI doc version (`2023-12-18`) are unchanged — majors appear to be codegen/packaging revisions. **2.0.0/3.0.0 breaking status could not be confirmed from README/manifest** — pin and diff before upgrading.

---

## Mobile KYC SDKs

### iOS — CocoaPods `KycVerificationSdk` (repo `cashfree-kyc-verification-sdk-ios`)
`current: 1.0.2 via CocoaPods (2025-04-15); newest git tag: 1.0.2; mismatch: no` — binary `KycVerificationSdk.xcframework`; `platform :ios "16.4"`, `swift_version 5.9`. Init: `CFVerificationService.Builder()…build()` + `set1ClickOnboardingCallback(...)`. No per-version release notes (breaking status of 1.0.0→1.0.2 unconfirmed). Note: repo README is mistitled "...Android SDK" but content/podspec is iOS.

### Android — Cashfree Maven `com.cashfree.vrs:kyc-verification`
`current: 1.0.4 via Cashfree Maven (https://maven.cashfree.com/release, 2025-05-19); source repo untagged; mismatch: N/A`. Versions on Cashfree Maven: 1.0.1, 1.0.4. Init: `CashfreeKycSdk.initialize(...)` + `CashfreeKycSdk.startKycVerification(...)`, minSdk 21.
> ⚠️ **Artifact↔source ambiguity:** the published coordinate is `com.cashfree.vrs:kyc-verification`, but the source repo `cashfree-kyc-verification-sdk-android` has no tags/releases and its README documents a different, non-resolving coordinate (`com.cashfree.kyc:sdk`). The published artifact can't be definitively tied to a repo commit.

### `KycVerificationSdk` (repo `cashfree/KycVerificationSdk`) — iOS SPM
Separate SPM-based artifact sharing the name with the CocoaPods pod (tags 1.0.0–1.0.4, ~2025-05; iOS 13.0+, Swift 5.0+). Treat as the SPM distribution channel for the iOS KYC flow; no release notes (breaking status unconfirmed).

### `react-native-digilocker` — npm `@cashfreepayments/react-native-digilocker`
`current: 0.1.4 (2025-08-27); repo untagged`. **A component, not a standalone KYC SDK** — a WebView wrapper for the **DigiLocker** step within the Secure ID / 1-Click onboarding flow (peer deps `react-native` + `react-native-webview`). Pre-1.0; no breaking blocks documented.

