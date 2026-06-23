---
name: Cashfree SDK & API Changelog (Breaking Changes & Release Notes)
description: >
  Curated, source-verified changelog of Cashfree SDK releases and REST API version
  changes — what changed, whether it is breaking, what to fix in your code, what to
  test, and the backward-compatibility story per version. Use when someone asks
  "what changed in cashfree-pg X", "is upgrading the Cashfree SDK breaking",
  "Cashfree release notes / changelog", "x-api-version history", "which SDK version
  dropped the api-version argument", or before planning ANY Cashfree version upgrade.
  This is the data source the upgrade-advisor skill reads to build migration plans.
  Covers PG backend SDKs (Node/Python/Java/Go/PHP/.NET), the REST API version line,
  web (cashfree.js v3), mobile SDKs, Payouts, Verification/Secure ID, and Subscriptions.
---

# Cashfree SDK & API Changelog

> **Why this exists.** Cashfree has not historically published consolidated, machine-readable release notes. This skill is a **source-verified changelog** built from GitHub tags, language registries, and the `cashfree/docs` repo. Every entry is dated and carries a source URL so its claims are traceable and re-verifiable.

---

## 1. Scope & Boundaries

### When to use this skill
- Someone asks what changed between two SDK or API versions, or whether an upgrade is breaking.
- You are about to upgrade a Cashfree dependency (`cashfree-pg`, `cashfree_pg`, `github.com/cashfree/cashfree-pg/v6`, mobile SDKs, payout/verification SDKs) or bump `x-api-version`.
- The **upgrade-advisor** skill needs the per-version facts to build a migration plan.

### When NOT to use this skill
- *How to integrate* a feature for the first time → use the relevant product skill (`pg/backend-sdks`, `pg/apis`, etc.).
- Cross-vendor migration (Razorpay/Juspay/PayU → Cashfree) → use the `migrate-from-*` skills. This skill is **intra-Cashfree version migration** only.

### What "version" means here (two orthogonal axes)
A Cashfree integration has **two independently versioned things**:
1. **SDK version** — the library release (e.g. `cashfree-pg` 5.x → 6.x). Governs method signatures, constructor shape, min runtime.
2. **REST API version** — the `x-api-version` date string (e.g. `2023-08-01` → `2025-01-01`). Governs request/response shape, IDs, fields, endpoints.

You can bump one without the other. Always reason about both. See `references/pg-api-versions.md` for the API axis.

---

## 2. How to read an entry (the schema)

Every reference file uses the **same entry schema**, so the upgrade-advisor can parse it uniformly. Each versioned change is:

```markdown
### <Component> <version> — <release date>
- **Type:** Breaking | Feature | Fix | Deprecation | Security
- **Breaking?:** Yes/No — if Yes, exactly what breaks
- **What changed:** <concise description>
- **What to fix (your code):** <concrete action when upgrading INTO this version, or "Nothing">
- **What to test:** <checklist of things to re-verify>
- **Backward compat:** <min runtime · min API version · drop-in vs not>
- **Source:** <URL> — as-of <YYYY-MM-DD>
```

Each component also opens with a **version timeline table** — this is what the advisor walks to compute a multi-step upgrade (e.g. 4.0 → 6.0):

```markdown
| version | date | breaking? | headline |
```

**Rule of thumb for the advisor:** a migration from X→Y must surface **every** `Breaking? = Yes` row strictly between X and Y (exclusive of X, inclusive of Y), in order.

---

## 3. Reference map

| Axis / product | Reference file | Status |
|---|---|---|
| PG backend SDKs — Node, Python, Java, Go, PHP, .NET | `references/pg-backend-sdks.md` | ✅ |
| PG REST API `x-api-version` line | `references/pg-api-versions.md` | ✅ |
| PG web — cashfree.js v3, pg-react, pg-svelte | `references/pg-web-sdk.md` | ✅ |
| PG mobile — Android, iOS, Flutter, React Native, Cordova/Capacitor | `references/pg-mobile-sdks.md` | ✅ |
| Payouts SDKs + Payouts REST API | `references/payouts.md` | ✅ |
| Verification / Secure ID (VRS) SDKs + API | `references/verification-secure-id.md` | ✅ |
| Subscriptions (API + SDK methods) | `references/subscriptions.md` | ✅ |

---

## 4. Cross-cutting truths (read before trusting any single source)

These apply across all reference files:

1. **The GitHub "Releases" tab is incomplete.** For every PG SDK repo, the Releases page stops at a 5.x version, yet **git tags and the language registries go to 6.x**. Always trust **git tags + the published registry version** over the Releases tab.
2. **Registry version ≠ newest git tag, sometimes.** Python tags reach 6.0.5 but PyPI stops at 6.0.1; .NET tags reach 6.0.7 but **NuGet has no 6.x at all** (tops at 5.0.6). Always state both and flag the gap.
3. **`x-api-version` is per *call style*, not per language.** All current SDKs keep a static/legacy style that passes the version as the first argument. **Node, Python, Java, Go, and .NET** also offer a modern instance-constructor style that omits it (from the 5.0 line). **PHP documents only the version-first style.** Don't assume a language dropped the version arg just because another did. (Verified against live READMEs 2026-06-23.)
4. **`2026-01-01` is an SDK-internal default, not a published REST API version.** The current Node/Python/Go SDKs hardcode `x-api-version = 2026-01-01`, but the published REST API / OpenAPI / docs version switcher only goes up to `2025-01-01` (v5). Treat `2025-01-01` as the current *documented* API version; note `2026-01-01` as the SDK's forward-stamped default. See `references/pg-api-versions.md`.
5. **Everything is dated "as-of".** Registries move. An entry without a recent as-of date should be re-verified before being quoted as current.

