---
name: Changelog — PG Mobile SDKs (Android, iOS, Flutter, RN, Cordova)
description: >
  Source-verified changelog for Cashfree's PG mobile SDKs, drawn primarily from the
  cashfree/docs per-platform changelog .mdx files (Cashfree's own dated notes) and
  corroborated against registries + repos. Read changelog/SKILL.md first for the schema.
  Consumed by the upgrade-advisor skill.
---

# Changelog — PG Mobile SDKs

> Read `../changelog.md` (SKILL.md) §2 for the entry schema. **As-of 2026-06-23.** **Primary source = `cashfree/docs` → `payments/developers/changelog/{android,ios,flutter,react-native,cordova}.mdx`** (Cashfree's own dated per-version notes), corroborated with Maven Central, pub.dev, npm, CocoaPods trunk, and the SDK repos.

> Convention: "Breaking?" is **Yes** only where the docs note an explicit deprecation/replacement or an enforced platform/min-OS bump. Platform/toolchain bumps (Android API level, Xcode, min iOS) are "drop-in at the call-site, breaking at build/host-config level."

> **The shared 1.x → 2.x break (all platforms): order token → `payment_session_id`.** Each platform's 2.0.0-era release replaced the legacy order-token session with a `payment_session_id`-based `CFSession`. This is the single cross-platform breaking migration.

---

## Android — `com.cashfree.pg:api`

`current: 2.5.0 via Maven Central (2026-06-17); source repo: none public (registry-only); docs changelog stops at 2.4.0`

| version | date | breaking? | headline |
|---|---|---|---|
| 2.5.0 | 2026-06-17 (Maven) | unknown | Published to Maven; **not yet in docs changelog** (no notes) |
| 2.4.0 | 2026-05-22 | **Yes** | Android 16 migration; UPI Intent app reordering |
| 2.3.3 | 2026-05-04 | No | Subscription Card Component (non-PCI) |
| 2.3.0 | 2026-03-11 | No | CRED card tokenisation |
| 2.2.9 | 2026-02-02 | No | Subscription payments (Card, eNACH, UPI Intent) |
| 2.2.8 | 2025-07-23 | **Yes** | Compatibility update to Android API level 35 |
| 2.2.0 | 2025-03-25 | No | PayFast in WebCheckout |
| 2.1.26 | 2025-02-12 | No | Subscription checkout support |
| 2.1.18 | 2024-07-19 | No | Card Component for non-PCI merchants |
| 2.0.6 | 2023-03-02 | No | Card tokenisation + saved cards for Drop |
| 2.0.0 | 2022-10-02 | **Yes** | UPI Intent bottom-sheet; **order token → Session ID**; WebCheckout mode |

(Intermediate QoS/fix releases — 2.1.x/2.2.x — omitted; all "No". See `android.mdx`.)

### Android 2.0.0 — 2022-10-02 (1.x→2.x boundary)
- **Breaking?:** Yes — token model changed. **What changed:** new UPI Intent bottom-sheet UI; **order token replaced with `payment_session_id`**; WebCheckout mode added. **What to fix:** build `CFSession` from `payment_session_id` (from Order-Create), not the legacy token. **What to test:** session build + UPI Intent + WebCheckout flows. **Backward compat:** not drop-in from 1.x. **Source:** `android.mdx` v.2.0.0 — as-of 2026-06-23

### Android 2.2.8 — 2025-07-23
- **Breaking?:** Yes (build floor). **What changed:** compatibility to **Android API level 35**. **What to fix:** bump `compileSdk`/`targetSdk` toolchain. **What to test:** build at API 35; flows on Android 15. **Backward compat:** drop-in at call-site; toolchain bump. **Source:** `android.mdx` v.2.2.8 — as-of 2026-06-23

### Android 2.4.0 — 2026-05-22
- **Breaking?:** Yes (build floor). **What changed:** **Android 16 migration**; UPI Intent app reordering. **What to fix:** update toolchain for Android 16; validate UPI Intent ordering if you depend on it. **What to test:** build/run on Android 16; UPI Intent app list. **Backward compat:** drop-in at call-site; platform migration. **Source:** `android.mdx` v.2.4.0 — as-of 2026-06-23

---

## iOS — `CashfreePG` (repo `core-ios-sdk`)

`current: 2.4.1 via CocoaPods/SPM (2026-06-16); newest git tag: ui-2.4.1; docs changelog stops at 2.4.0`
Repo carries **two tag families**: `ui-*` (the published `CashfreePG`/UI artifact, which the docs track) and `api-*` (core). SPM products: `CashfreePG` / `CashfreePGCoreSDK` / `CashfreePGUISDK`. Verified init at `ui-2.4.1`: `payment_session_id`, `order_id`, `CFENVIRONMENT`.

| version | date | breaking? | headline |
|---|---|---|---|
| 2.4.1 | 2026-06-16 | unknown | Published; **not in docs changelog** (no notes) |
| 2.4.0 | 2026-05-20 | No | Back-button on bank page |
| 2.2.0 | 2025-03-25 | **Yes** | PayFast in WebCheckout; framework built with **Xcode 16** |
| 2.1.0 | 2025-01-06 | **Yes** | Deprecation message for Drop Payments at init |
| 2.0.18 | 2024-09-23 | **Yes** | Min iOS → **12**, swift_version → **5.10**; new UPI apps |
| 2.0.4 | 2023-02-25 | No | WebCheckout payment mode added |
| 2.0.0 | 2022-11-25 | **Yes** | Deprecate `setOrderToken()`; add `payment_session_id`; headless OTP |
| 1.1.0 | 2022-04-07 | **Yes** | Single callback for all payment modes; 2FA in Element |
| 1.0.0 | 2022-03-28 | No | First beta |

### iOS 2.0.0 — 2022-11-25 (1.x→2.x boundary)
- **Breaking?:** Yes. **What changed:** **`setOrderToken()` deprecated** in `CFSession` builder; `payment_session_id` added; headless card OTP. **What to fix:** replace `setOrderToken(...)` with the `payment_session_id` session builder. **What to test:** session via `payment_session_id`; card headless OTP. **Backward compat:** not drop-in from 1.x. **Source:** `ios.mdx` v.2.0.0 — as-of 2026-06-23

### iOS 2.0.18 — 2024-09-23
- **Breaking?:** Yes (OS/Swift floor). **What changed:** min iOS **12**, swift_version **5.10**; amazonpay/whatsapp/cred. **What to fix:** deployment target ≥ iOS 12; Swift toolchain ≥ 5.10. **What to test:** build on bumped toolchain; new UPI app launches. **Backward compat:** drops < iOS 12. **Source:** `ios.mdx` v.2.0.18 — as-of 2026-06-23

### iOS 2.1.0 — 2025-01-06
- **Breaking?:** Yes (deprecation signal). **What changed:** deprecation message for **Drop Payments** at init. **What to fix:** plan migration off the deprecated Drop initializer. **What to test:** Drop still works but warns. **Backward compat:** drop-in (warning only); signals future removal. **Source:** `ios.mdx` v.2.1.0 — as-of 2026-06-23

### iOS 2.2.0 — 2025-03-25
- **Breaking?:** Yes (build floor). **What changed:** PayFast in WebCheckout; framework built with **Xcode 16**. **What to fix:** build with Xcode-16-compatible toolchain (older Xcode may fail to link the xcframework). **What to test:** build under Xcode 16; WebCheckout PayFast. **Backward compat:** drop-in at call-site; build-toolchain floor. **Source:** `ios.mdx` v.2.2.0 — as-of 2026-06-23

---

## Flutter — `flutter_cashfree_pg_sdk` (repo `flutter-cashfree-pg-sdk`)

`current: 2.4.0+52 via pub.dev (2026-05-22); newest git tag: 2.4.0+52; mismatch: no`
Verified init at `2.4.0+52`: `orderId`, `paymentSessionId`, `CFEnvironment`.

| version | date | breaking? | headline |
|---|---|---|---|
| 2.4.0+52 | 2026-05-22 | **Yes** | Android 16 migration; UPI Intent reorder; iOS FlutterImplicitEngineDelegate + bank back button |
| 2.3.2+49 | 2026-04-02 | No | Subscription Element API support |
| 2.2.9+47 | 2025-07-24 | **Yes** | Android compatibility → API level 35 |
| 2.2.3+41 | — | **Yes** | Deprecation message for Drop Payments at init |
| 2.1.1+31 | — | **Yes** | Fix namespace build issue with Android compileSdk 34 |
| 2.0.18+21 / 2.0.17+20 | — | **Yes** | Android compileSdk → 34 |
| 2.0.0+3 | — | **Yes** | Support for `payment_session_id` (token→session) |
| 0.0.1+1 | — | No | Initial release |

### Flutter 2.0.0+3 — token→session (1.x→2.x boundary)
- **Breaking?:** Yes. **What changed:** support for **`payment_session_id`**. **What to fix:** build `CFSession` from `paymentSessionId`, not the legacy token. **What to test:** session creation both platforms. **Backward compat:** not drop-in from 0.0.x/1.x. **Source:** `flutter.mdx` v2.0.0+3 — as-of 2026-06-23

### Flutter 2.0.17+20 / 2.1.1+31 (compileSdk 34), 2.2.9+47 (API 35), 2.4.0+52 (Android 16)
- **Breaking?:** Yes (Android build floors). **What changed:** compileSdk 34 (+ namespace fix at 2.1.1+31); API level 35; Android 16 migration (+ iOS `FlutterImplicitEngineDelegate`, additive). **What to fix:** bump host Android compileSdk/AGP/namespace accordingly; for 2.4.0+52 custom-engine iOS embeds, validate `FlutterImplicitEngineDelegate`. **What to test:** Android Gradle build at the relevant level; iOS engine-delegate embedding. **Backward compat:** drop-in at Dart call-site; raises Android toolchain floor. **Source:** `flutter.mdx` (those versions) — as-of 2026-06-23

---

## React Native — `react-native-cashfree-pg-sdk`

`current: 2.4.0 via npm (2026-05-21); newest git tag: v2.4.0; mismatch: no`
**Requires the peer package `cashfree-pg-api-contract`** for contract types. Verified init at `v2.4.0`: `new CFSession(paymentSessionId, orderId, CFEnvironment.PRODUCTION|SANDBOX)` + `CFPaymentGatewayService.doWebPayment(session)`.

| version | date | breaking? | headline |
|---|---|---|---|
| 2.4.0 | 2026-05-21 | **Yes** | Android 16 migration; UPI Intent reorder; iOS bank back button |
| 2.3.1 | 2026-05-05 | No | Subscription custom card component (non-PCI) |
| 2.3.0 | 2026-03-24 | No | Subscription payment support |
| 2.2.5 | 2025-07-25 | **Yes** | Android 15 compatibility; Expo compatibility |
| 2.2.0 | 2025-03-27 | No | PayFast in WebCheckout |
| 2.1.8 | 2024-01-22 | No | Headless UPI payment |
| 2.0.5 | 2023-03-30 | No | WebCheckout support |
| 2.0.1 | 2022-12-15 | **Yes** | Token → Session ID; `cashfree-pg-api-contract` → v2.0.0 |
| 1.0.0 | 2022-07-05 | No | Initial release |

### React Native 2.0.1 — 2022-12-15 (1.x→2.x boundary)
- **Breaking?:** Yes. **What changed:** **order token → Session ID**; `cashfree-pg-api-contract` bumped to **v2.0.0**. **What to fix:** migrate to `payment_session_id` `CFSession`; bump the `cashfree-pg-api-contract` peer to 2.x. **What to test:** session creation; `CFCallback`/`CFErrorResponse`. **Backward compat:** not drop-in from 1.x. **Source:** `react-native.mdx` v.2.0.1 — as-of 2026-06-23

### React Native 2.2.5 (Android 15/Expo), 2.4.0 (Android 16)
- **Breaking?:** Yes (Android build floors). **What to fix:** bump host Android toolchain (API 35 / Android 16); for Expo re-verify config/plugin after 2.2.5. **What to test:** Android builds; Expo prebuild; UPI Intent ordering. **Backward compat:** drop-in at JS call-site. **Source:** `react-native.mdx` v.2.2.5 / v.2.4.0 — as-of 2026-06-23

---

## Cordova / Capacitor

**Cordova:** `current: cordova-plugin-cashfree-pg 1.1.0 via npm (2026-05-26); newest git tag: v1.1.0; docs changelog stops at 1.0.12`
⚠️ The correct package is **`cordova-plugin-cashfree-pg`** — `cordova-plugin-cashfree` is a stale, unrelated 1.0.2 (2020). Do not use the latter.

| version | date | breaking? | headline |
|---|---|---|---|
| 1.1.0 | 2026-05-26 | unknown | Published; not in docs changelog (no notes) |
| 1.0.12 | 2026-03-03 | No | New iOS PSP UPI apps |
| 1.0.11 | 2025-08-04 | No | Subscription checkout support |
| 1.0.10 | 2025-08-01 | **Yes** | Android 15 migration |
| 1.0.8 | 2025-04-01 | No | PayFast in WebCheckout |

### Cordova 1.0.10 — 2025-08-01
- **Breaking?:** Yes (Android build floor). **What changed:** Android 15 migration. **What to fix:** bump host Cordova Android platform/toolchain for Android 15. **What to test:** Cordova Android build on Android 15. **Backward compat:** drop-in at JS call-site. **Source:** `cordova.mdx` v.1.0.10 — as-of 2026-06-23

**Capacitor:** `current: capacitor-plugin-cashfree-pg 0.1.0 via npm (2026-05-26); pre-1.0 / early-access`. No docs `.mdx` changelog page exists for Capacitor. Install alongside `cashfree-pg-api-contract`.

