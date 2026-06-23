---
name: Cashfree Upgrade Advisor (SDK & API Version Migration)
description: >
  Use to plan a Cashfree SDK or REST API version upgrade — e.g. "upgrade cashfree-pg
  from 4.x to 6.x", "we're on x-api-version 2022-09-01, move us to the latest",
  "is it safe to bump the Cashfree mobile SDK", "migrate our Cashfree integration to v5".
  Detects the current version from the project, reads the `changelog` skill, and produces
  a cumulative change summary, the breaking changes between the two versions, an ordered
  migration plan with code diffs, a test checklist, and backward-compatibility warnings —
  across BOTH axes (SDK version and x-api-version). This is intra-Cashfree version
  migration; for switching FROM another gateway use the migrate-from-* skills.
---

# Cashfree Upgrade Advisor

> **Reads the `changelog` skill as its data source.** This skill is the reasoning layer; `changelog/SKILL.md` + `changelog/references/*.md` are the facts. If the changelog data looks stale (check each entry's "as-of" date), re-verify it against the live registry before relying on a plan.

---

## 1. Scope & Boundaries

### Use this skill when
- The developer wants to upgrade a Cashfree dependency (`cashfree-pg`, `cashfree_pg`, `github.com/cashfree/cashfree-pg/v6`, the mobile SDKs, `cashfree-payout`, `cashfree-verification`, cashfree.js, etc.) from one version to another.
- The developer wants to move `x-api-version` (e.g. `2022-09-01` → `2025-01-01`).
- The developer asks "what will break if I upgrade", "is this bump safe", or "give me a migration plan from X to Y".

### Do NOT use this skill for
- First-time integration → use the product skill (`pg/backend-sdks`, `pg/web-sdk`, etc.).
- Switching **from another gateway** (Razorpay/Juspay/PayU) → use `migrate-from-*`.
- A factual "what changed in version Z" lookup with no upgrade intent → just read the `changelog` skill directly.

---

## 2. The two axes — always reason about both

A Cashfree integration is versioned on two **independent** axes. An upgrade request usually means one, but you must check the other:

| Axis | Example | Governs | Changelog source |
|---|---|---|---|
| **SDK version** | `cashfree-pg` 4.x → 6.x | method signatures, constructor shape, min runtime, import path | the per-product reference (e.g. `pg-backend-sdks.md`) |
| **REST API version** | `x-api-version` `2022-09-01` → `2025-01-01` | request/response shape, IDs, fields, endpoints | `pg-api-versions.md` (PG), or the product's API line (payouts/VRS have their own) |

Bumping the SDK does **not** automatically change `x-api-version` (and vice-versa). The current PG SDKs even ship a *default* `x-api-version` (`2026-01-01`) that is **ahead of the published REST version** (`2025-01-01`) — call this out.

---

## 3. Algorithm

### Step 1 — Identify the component + language
Map the dependency to its changelog reference file:

| Dependency / signal | Reference file |
|---|---|
| `cashfree-pg` (npm/PyPI), `com.cashfree.pg.java:cashfree_pg`, `github.com/cashfree/cashfree-pg`, `cashfree/cashfree-pg` (Packagist), `cashfree_pg` (NuGet) | `changelog/references/pg-backend-sdks.md` |
| `x-api-version` header / `XApiVersion` (PG) | `changelog/references/pg-api-versions.md` |
| `@cashfreepayments/cashfree-js`, `pg-react`, `pg-svelte`, `sdk.cashfree.com/js/v3` | `changelog/references/pg-web-sdk.md` |
| `com.cashfree.pg:api`, `CashfreePG`, `flutter_cashfree_pg_sdk`, `react-native-cashfree-pg-sdk`, `cordova-plugin-cashfree-pg`, `capacitor-plugin-cashfree-pg` | `changelog/references/pg-mobile-sdks.md` |
| `cashfree-payout` / `cashfree_payout` / payout SDKs | `changelog/references/payouts.md` |
| `cashfree-verification` / `cashfree_verification` / KYC SDKs | `changelog/references/verification-secure-id.md` |
| subscriptions / `subs*` methods / mandates | `changelog/references/subscriptions.md` |

### Step 2 — Detect the current version (don't ask if you can read it)
Read the project's manifest:

| Language / platform | File | What to read |
|---|---|---|
| Node | `package.json` | `dependencies["cashfree-pg"]` (resolve `package-lock.json` for the exact installed version) |
| Python | `requirements.txt` / `pyproject.toml` / `poetry.lock` | `cashfree-pg==` |
| Java | `pom.xml` / `build.gradle` | `<artifactId>cashfree_pg</artifactId>` version |
| Go | `go.mod` | `github.com/cashfree/cashfree-pg/vN vX.Y.Z` (note the `/vN` major suffix) |
| PHP | `composer.json` / `composer.lock` | `cashfree/cashfree-pg` |
| .NET | `*.csproj` / `packages.config` | `cashfree_pg` |
| Mobile | `build.gradle`, `Podfile`/`Package.swift`, `pubspec.yaml`, `package.json` | the SDK coordinate |
| API version | source code | the `x-api-version` string / `XApiVersion` setting passed to the SDK or sent on requests |

Also detect the **call style** in use (instance vs static/legacy version-first) — it determines what the migration touches. If you truly cannot find the current version, ask the user for it and the target.

### Step 3 — Confirm the target is real (re-verify, don't trust memory)
- The changelog has an "as-of" date. Before quoting "latest", re-check the registry (npm/PyPI/Maven Central/pkg.go.dev/Packagist/NuGet) directly — registries move and the changelog may lag.
- **Honor the registry-vs-tag traps the changelog flags.** E.g. **.NET `cashfree_pg` has no 6.x on NuGet** (tops at 5.0.6) and **Java verification 3.0.0 is not on Maven Central** — do not advise a target the user can't actually install. Surface the ceiling instead.

### Step 4 — Collect the breaking changes between current and target
From the chosen reference file's **version timeline table**, take every row with `breaking? = Yes` that lies **strictly after** the current version and **up to and including** the target. Pull each one's detail block. Do the same on the **API axis** if `x-api-version` is also changing.

### Step 5 — Synthesize the migration report (output format below)

---

## 4. Output format

Produce a single report:

```
## Upgrade plan: <component> <from> → <to>   (+ x-api-version <from> → <to> if applicable)

### Summary
<1–3 sentences: how many breaking steps, the headline risks, whether it's drop-in.>

### Breaking changes you must handle (in order)
1. <version> — <what changed> [Source]
2. ...
(If none: "No breaking changes between these versions — this is a safe bump.")

### Migration steps
1. Bump the dependency: <exact install/edit command>.
2. <code change per breaking step — show a before/after diff>.
3. Decide x-api-version: <pin recommendation + why>.
...

### Test checklist
- [ ] <union of the "What to test" items from every step>
- [ ] Backend re-verify still passes (PGFetchOrder/GET order → PAID)
- [ ] Webhook signature verification on the raw body
- [ ] <runtime/build floor check, e.g. PHP ≥ 8.1, Android API level>

### Backward-compatibility & runtime warnings
- <min runtime bumps, import-path changes, not-drop-in notes, registry ceilings>

### Gaps / unverified
- <anything the changelog marked undocumented — e.g. the v4→v5 API delta — that the user must validate themselves>
```

Rules:
- **Order matters.** Present breaking steps oldest→newest; a 4.x→6.x jump must walk through the 5.0.0 change, not skip to 6.x.
- **Show diffs, not prose,** for code changes — the user is going to edit real files.
- **Never invent a fix for an undocumented delta.** If the changelog says a step is undocumented (e.g. PG API v5 `2025-01-01`), say "validate against your own response contract" rather than fabricate field changes.
- **Carry provenance** — cite the changelog entry (which carries the upstream Source URL + as-of date).

---

## 5. Worked example — `cashfree-pg` (Node) 4.0.0 → 6.0.4

**Detected:** `package.json` → `cashfree-pg ^4.0.0`; calls use the static/legacy style (`Cashfree.PGCreateOrder("2023-08-01", …)`); `x-api-version 2023-08-01`.
**Target:** latest (`6.0.4`, npm).

**Breaking steps between 4.0.0 and 6.0.4** (from `pg-backend-sdks.md`):
1. **5.0.0** — instance client `new Cashfree(env, id, secret)`; calls drop the version arg.
2. **6.0.x** — major bump to the new spec; SDK default `x-api-version` becomes `2026-01-01`.

**Migration steps:**
1. `npm i cashfree-pg@^6` (currently resolves to 6.0.4).
2. Pick a call style and apply it consistently:
   ```diff
   - Cashfree.XClientId = process.env.CASHFREE_APP_ID;
   - Cashfree.XClientSecret = process.env.CASHFREE_SECRET_KEY;
   - const res = await Cashfree.PGCreateOrder("2023-08-01", request);
   + const cashfree = new Cashfree(CFEnvironment.PRODUCTION,
   +   process.env.CASHFREE_APP_ID, process.env.CASHFREE_SECRET_KEY);
   + const res = await cashfree.PGCreateOrder(request);
   ```
   (Or keep the legacy static style and pass `"2025-01-01"` first on **every** method — don't mix.)
3. **Decide `x-api-version`.** The v6 SDK defaults to `2026-01-01`, which is **ahead of the published REST version `2025-01-01`**. If your code depends on the documented v5 contract, pin it: `cashfree.XApiVersion = "2025-01-01"`.

**Test checklist:** order create/fetch → `PAID`; refund; webhook signature on raw body; every `PGxxx` you call (response models may have shifted at the major bump); the api-version actually sent on the wire.

**Backward compat / warnings:** not drop-in across the 5.0.0 boundary (constructor + call signature); Node engine not enforced by the SDK. **Gap:** the v4→v5 *REST API* delta (`2023-08-01` → `2025-01-01`) is undocumented by Cashfree — validate response shapes against your own contract; don't assume zero field changes.

---

## 6. Guardrails
- The plan is only as good as the changelog. Check "as-of" dates; re-verify against the live registry if an entry looks stale.
- Re-verify the target version on the actual registry before calling it "latest."
- Respect publication ceilings (.NET no 6.x on NuGet; Java VRS 3.0.0 not on Central; PyPI `cashfree-pg` tops at 6.0.1).
- Two axes — always state both, even if only one is changing.
- For undocumented deltas, prescribe **verification**, not a fabricated fix.
