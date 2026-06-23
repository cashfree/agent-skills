---
name: Changelog — PG Backend SDKs (Node, Python, Java, Go, PHP, .NET)
description: >
  Source-verified changelog for Cashfree's Payment Gateway backend server SDKs since
  4.0.0. Per-language version timelines, breaking changes, what-to-fix / what-to-test,
  and backward-compat. Read changelog/SKILL.md first for the entry schema and the
  cross-cutting truths. Consumed by the upgrade-advisor skill.
---

# Changelog — PG Backend SDKs

> Read `../changelog.md` (SKILL.md) §2 for the entry schema and §4 for cross-cutting truths. **All data as-of 2026-06-23**, gathered via `gh api` (GitHub tags/releases/contents) and the language registries (npm, PyPI, Maven Central, pkg.go.dev, Packagist, NuGet), cross-checked against registry web pages.

---

## 0. Cross-SDK summary

### Current versions (trust registry + tag, not the Releases tab)

| Lang | Registry | Latest **published** | Newest git tag | Mismatch |
|---|---|---|---|---|
| Node | npm `cashfree-pg` | **6.0.4** | 6.0.4 | No (but newest *GitHub Release* is only 5.1.3) |
| Python | PyPI `cashfree-pg` | **6.0.1** | 6.0.5 | **Yes** — 6.0.2–6.0.5 tagged, not on PyPI |
| Java | Maven Central `com.cashfree.pg.java:cashfree_pg` | **6.0.2** | 6.0.2 | No (search.maven.org solr is stale at 5.0.1 — use maven-metadata.xml) |
| Go | pkg.go.dev `github.com/cashfree/cashfree-pg/v6` | **v6.0.5** | v6.0.5 | No |
| PHP | Packagist `cashfree/cashfree-pg` | **6.0.5** | 6.0.5 | No (caveat: 6.0.1 published *later* with a broader PHP range — see PHP §) |
| .NET | NuGet `cashfree_pg` | **5.0.6** | 6.0.7 | **Yes (major)** — no 6.x on NuGet at all |

### The `x-api-version` argument — per *call style*, not per language

Every current SDK documents **two call styles** (verified from each repo's README at its current published tag):

- **Static / legacy style** — set credentials on the class, pass the version as the **first positional argument** of every method (`PGCreateOrder("2023-08-01", request, …)`). Available in **all** SDKs.
- **Instance style** — construct a client with credentials, then call methods **without** the version arg (the SDK uses its bundled default). Available in **Node, Python, Java, Go, .NET** (introduced in the 5.0 line). **PHP does not document an instance-credential constructor — version-first is its only style.**

| Lang | Instance style (omits version)? | Since | Static/legacy (version-first) still available? |
|---|---|---|---|
| Node | Yes — `new Cashfree(env,id,secret)` → `PGCreateOrder(request)` | 5.0.0 | Yes |
| Python | Yes — `Cashfree(XClientId=…)` → `PGCreateOrder(req, None, None)` | 5.0.x | Yes |
| Java | Yes — `new Cashfree(id,secret,…)` → `PGCreateOrder(request, …)` | 5.0.0 | Yes |
| Go | Yes — `PGCreateOrder(&request, …)` | v5.0.0 | Yes |
| .NET | Yes — `new Cashfree(env,id,secret,…)` → `PGCreateOrder(req, …)` | 5.0.0 | Yes |
| **PHP** | **No** — only `$cashfree->PGCreateOrder($x_api_version, $request)` | — | Yes (it's the only style) |

> ✅ Verified against live READMEs (2026-06-23). The instance style omits the version, so a no-version Python call is correct; **PHP documents only the version-first style.**

### Minimum runtime

| Lang | Min runtime | Source |
|---|---|---|
| Node | **Not declared** (no `engines` in package.json; effectively Node 14+ via `axios`) | package.json @ 6.0.4 |
| Python | **≥ 3.9** | setup.py `PYTHON_REQUIRES=">=3.9"` @ 6.0.5 |
| Java | **8 (1.8)** — unchanged 4.x→6.x | pom `<java.version>1.8</java.version>` @ 6.0.2 |
| Go | **1.18** | go.mod `go 1.18` @ v6.0.5 |
| PHP | **^8.1** (6.0.0 / 6.0.5); **^7.2 ‖ ^8.0** (6.0.1 and ≤ 5.x) | composer.json |
| .NET | netstandard2.0/2.1, .NET FW 4.7+, .NET 6.0 (published 5.0.6); +net8.0 in unpublished 6.0.7 | csproj |

### The 3.x → 4.0.0 boundary (all languages, 22 Jan 2024)

Every language's 4.0.0 carries the identical note *"SDK now supports our new version of APIs"* → the cut-over from the legacy PG API surface to the **new PG APIs** (default `x-api-version` moved `2022-09-01` → `2023-08-01`; new method names like `PGCreateOrder`, new models, new endpoint host). 4.0.0 is a **hard break vs 3.x** in every language.

---

## 1. Node SDK (`cashfree-pg`)

`current: 6.0.4 via npm; newest git tag: 6.0.4; mismatch: no (newest GitHub Release is only 5.1.3)`

| version | date | breaking? | headline |
|---|---|---|---|
| 6.0.4 | 2026-05-18 (npm) | **Yes** (major) | New API spec; major bump. Release notes absent on GitHub (tag-only). |
| 5.1.3 | 2026-04-22 | No | Patch over 5.1.x |
| 5.1.0 | 2025-10-08 (npm) | No | Feature bump (5.0.8 → 5.1.0); thin auto-notes |
| 5.0.7 | 2025 (first 5.x on npm) | **Yes** | New instance client; `x-api-version` dropped from method args |
| 4.2.0 | 2024-07-12 | No | Adds Subscription APIs + bug fixes |
| 4.0.10 | 2024-03-19 | No | Easy Split APIs + Order Termination API |
| 4.0.0 | 2024-01-22 | **Yes** | Cut-over to new PG APIs (3.x→4.x boundary) |
| 3.2.15 | 2024-02-05 | No | Last 3.x (legacy API surface) |

### Node `cashfree-pg` 5.0.0 — 2025 (first published as 5.0.7 on npm)
- **Type:** Breaking
- **Breaking?:** Yes — client construction and call signature both change.
- **What changed:** v4 used static config + version-first calls (`Cashfree.XClientId=…; Cashfree.PGCreateOrder("2023-08-01", request)`). v5 introduces `const cashfree = new Cashfree(Cashfree.SANDBOX, "<id>", "<secret>")` then `cashfree.PGCreateOrder(request)` — **`x-api-version` removed from the call**.
- **What to fix (your code):** Adopt the `new Cashfree(env, id, secret)` constructor; drop the api-version string from every `PGxxx(...)` call. (The legacy static style still appears in the README as an alternative, so old code that passes the version may keep compiling — verify against your pinned version.)
- **What to test:** order create/fetch, `PGVerifyWebhookSignature` on the raw body, and that the baked-in default api-version returns the field set you expect.
- **Backward compat:** min Node not enforced (no `engines`); min API version `2023-08-01`; **not drop-in** from v4.
- **Source:** https://github.com/cashfree/cashfree-pg-sdk-nodejs (README @ 5.0.7 vs 4.2.0) · https://www.npmjs.com/package/cashfree-pg — as-of 2026-06-23

### Node `cashfree-pg` 6.0.x — 2026-05 (npm 6.0.4)
- **Type:** Breaking (major)
- **Breaking?:** Yes (major bump to the new OpenAPI spec; SDK default `x-api-version` = `2026-01-01`). Detailed prose notes absent (tag-only release).
- **What changed:** Regenerated against the newest API spec; SDK ships `2026-01-01` as its internal default `x-api-version`.
- **What to fix (your code):** Bump `cashfree-pg` to `^6`; re-run your integration tests; confirm whether you want the SDK default `2026-01-01` or to pin `x-api-version` to the documented `2025-01-01`.
- **What to test:** all methods you call (response models may have shifted); webhook verification; the api-version actually sent on the wire.
- **Backward compat:** call signatures unchanged from v5 (still instance client, no version arg); behavior change is the spec/default version. Re-verify.
- **Source:** https://www.npmjs.com/package/cashfree-pg (6.0.4) — as-of 2026-06-23 *(release notes not published; bump verified, field-level delta unverified)*

### Node `cashfree-pg` 4.0.0 — 2024-01-22 (boundary)
- **Type:** Breaking
- **Breaking?:** Yes — new PG API endpoint set; new method names/models vs 3.x.
- **What changed:** Retargeted to the new PG APIs (`pg-new-apis-endpoint`).
- **What to fix (your code):** migrate 3.x method/model names to the new PG API methods; set `x-api-version: 2023-08-01`.
- **What to test:** full re-test — different API surface.
- **Backward compat:** min API version `2023-08-01`; not drop-in from 3.x.
- **Source:** https://github.com/cashfree/cashfree-pg-sdk-nodejs/releases/tag/4.0.0 — as-of 2026-06-23

---

## 2. Python SDK (`cashfree-pg`)

`current: 6.0.1 via PyPI; newest git tag: 6.0.5; mismatch: yes (6.0.2–6.0.5 tagged but not on PyPI; newest GitHub Release only 5.0.5)`

| version | date | breaking? | headline |
|---|---|---|---|
| 6.0.1 | 2026-05-18 (PyPI) | **Yes** (major) | New OpenAPI spec (`2026-01-01`); notes sparse |
| 6.0.0 | 2026-05-18 (PyPI) | **Yes** (major) | Major bump to new spec |
| 5.0.5 | 2026-01-21 (PyPI) | **Yes** | Instance constructor added; instance-style calls omit the version (legacy static style still passes it first) |
| 4.5.1 | 2025-10-31 | No | Feature bump; thin auto-notes |
| 4.2.0 | 2024-07-12 | No | Subscription APIs |
| 4.0.10 | 2024-03-19 | No | Easy Split + Order Termination |
| 4.0.0 | 2024-01-22 | **Yes** | Cut-over to new PG APIs (boundary) |
| 3.2.12 | 2024-01-29 | No | Last 3.x (legacy) |

### Python `cashfree-pg` 5.0.x — 2026-01-21 (PyPI 5.0.5)
- **Type:** Breaking (additive — new call style)
- **Breaking?:** Yes — adds the instance-constructor style.
- **What changed:** v4 used static class config (`Cashfree.XClientId=…`) + `Cashfree().PGCreateOrder(x_api_version, req, None, None)`. v5+ adds a configured instance: `cashfree = Cashfree(XEnvironment=…, XClientId=…, XClientSecret=…)` then `cashfree.PGCreateOrder(req, None, None)` — **instance-style calls omit the version**. The legacy static style (version as the first arg) still works at 6.x.
- **What to fix (your code):** pick one style. Modern: build a `Cashfree(...)` instance and drop the version arg. Legacy: keep static config and pass `x_api_version` first on **every** method. Don't mix the two.
- **What to test:** order create/fetch; that the instance carries credentials; webhook verification.
- **Backward compat:** Python ≥ 3.9; min API version `2023-08-01`; legacy static calls remain source-compatible (the instance constructor is additive).
- **Source:** https://github.com/cashfree/cashfree-pg-sdk-python (README @ 6.0.1 — both styles shown) · https://pypi.org/project/cashfree-pg/ — as-of 2026-06-23

### Python `cashfree-pg` 6.0.x — 2026-05-18 (PyPI 6.0.1)
- **Type:** Breaking (major)
- **Breaking?:** Yes — regenerated against the `2026-01-01` spec.
- **What changed:** new spec models; SDK default `x-api-version` = `2026-01-01`. `x_api_version` first-arg convention unchanged.
- **What to fix (your code):** bump to `cashfree-pg>=6,<7`; keep the `x_api_version` first arg; re-run tests; decide pin `2025-01-01` vs SDK default `2026-01-01`.
- **What to test:** model (de)serialization for every method you use; webhook verification.
- **Backward compat:** Python ≥ 3.9; call convention unchanged from 5.x. **PyPI tops at 6.0.1** — 6.0.2–6.0.5 are tagged but unpublished.
- **Source:** https://pypi.org/project/cashfree-pg/ (6.0.1) — as-of 2026-06-23 *(field-level delta unverified — notes sparse)*

### Python `cashfree-pg` 4.0.0 — 2024-01-22 (boundary)
- **Breaking?:** Yes — new PG APIs vs 3.x. **What to fix:** migrate method/model names; `x-api-version: 2023-08-01`. **What to test:** full re-test. **Backward compat:** not drop-in from 3.x. **Source:** https://github.com/cashfree/cashfree-pg-sdk-python/releases/tag/4.0.0 — as-of 2026-06-23

---

## 3. Java SDK (`com.cashfree.pg.java:cashfree_pg`)

`current: 6.0.2 via Maven Central; newest git tag: 6.0.2; mismatch: no (use maven-metadata.xml — search.maven.org solr is stale at 5.0.1; newest GitHub Release only 5.0.1)`

| version | date | breaking? | headline |
|---|---|---|---|
| 6.0.2 | 2026-05-26 (Maven) | **Yes** (major) | New API spec; major bump |
| 6.0.0/6.0.1 | 2026 (Maven) | **Yes** (major) | Major bump |
| 5.0.1 | 2025-12-18 | No | Patch over 5.0.0; thin auto-notes |
| 5.0.0 | ~2025-04-01 (Maven) | **Yes** | New `new Cashfree(id, secret, …)` instance; `x-api-version` dropped from args |
| 4.5.0 | 2025-02-25 | No | Feature bump |
| 4.2.4 | 2024-10-07 | No | Patch |
| 4.2.0 | 2024-07-12 | No | Subscription APIs |
| 4.0.1 | 2024-01-22 | **Yes** | Cut-over to new PG APIs (boundary) |
| 3.2.12 | 2024-01-29 | No | Last 3.x (legacy) |

### Java 5.0.0 — ~2025-04-01
- **Type:** Breaking
- **Breaking?:** Yes — credential setup + call signature change.
- **What changed:** v4: `Cashfree.XClientId=…; Cashfree cashfree = new Cashfree(); cashfree.PGCreateOrder(xApiVersion, request, …)` (version 1st arg). v5: `Cashfree cashfree = new Cashfree("<id>", "<secret>", null,null,null); cashfree.PGCreateOrder(request, null,null,null)` — **version removed**. (Legacy static style still documented as a fallback.)
- **What to fix (your code):** pass credentials into `new Cashfree(id, secret, …)`; remove the `xApiVersion` first argument from every call.
- **What to test:** `ApiResponse<OrderEntity>` order create/fetch; `ApiException` handling; default api-version behavior.
- **Backward compat:** Java 8 (unchanged); min API version `2023-08-01`; not drop-in.
- **Source:** https://github.com/cashfree/cashfree-pg-sdk-java (README @ 5.0.0 vs 4.2.4) · https://central.sonatype.com/artifact/com.cashfree.pg.java/cashfree_pg — as-of 2026-06-23

### Java 6.0.x — 2026-05-26 (Maven 6.0.2)
- **Breaking?:** Yes (major; new spec). **What to fix:** bump to `6.0.2`; re-test; decide api-version pin. **What to test:** all called methods; webhook verify. **Backward compat:** Java 8; call signature unchanged from 5.x. **Source:** https://central.sonatype.com/artifact/com.cashfree.pg.java/cashfree_pg — as-of 2026-06-23 *(field-level delta unverified)*

### Java 4.0.1 — 2024-01-22 (boundary)
- **Breaking?:** Yes — new PG APIs. **What to fix:** migrate from 3.x; `x-api-version: 2023-08-01`. **Backward compat:** Java 8; not drop-in from 3.x. **Source:** https://github.com/cashfree/cashfree-pg-sdk-java/releases/tag/4.0.1 — as-of 2026-06-23

---

## 4. Go SDK (`github.com/cashfree/cashfree-pg`)

`current: v6.0.5 via pkg.go.dev; newest git tag: v6.0.5; mismatch: no (newest GitHub Release only v5.1.0)`
Module-path note: v6 requires importing `github.com/cashfree/cashfree-pg/v6` (Go semantic-import-versioning).

| version | date | breaking? | headline |
|---|---|---|---|
| v6.0.5 | 2026-05-12 | **Yes** (major) | `/v6` module path; new spec |
| v6.0.0 | 2026 | **Yes** (major) | Major bump → `/v6` import path |
| v5.1.0 | 2026-02-20 | No | Feature bump; thin auto-notes |
| v5.0.6 | 2025-04-08 | No | Patch (5.0.1–5.0.6 same-day patch train) |
| v5.0.0 | 2025-04-07 | **Yes** | No-version call form; version no longer required as 1st arg |
| v4.3.10 | 2025-01-09 | No | Patch |
| v4.2.0 | 2024-07-12 | No | Subscription APIs |
| v4.0.1 | 2024-01-22 | **Yes** | Cut-over to new PG APIs (boundary) |
| v3.2.14 | 2024-02-01 | No | Last 3.x (legacy) |

### Go v5.0.0 — 2025-04-07
- **Type:** Breaking
- **Breaking?:** Yes — primary call form drops the version argument.
- **What changed:** v4 `cashfree.PGCreateOrder(&version, &request, nil, nil, nil)` (version pointer 1st arg). v5+ `cashfree.PGCreateOrder(&request, nil, nil, nil)`. The legacy form is still shown as an alternative in v5/v6 READMEs (appears overloaded/both-supported).
- **What to fix (your code):** drop the leading `&version` from calls.
- **What to test:** `(response, httpResponse, err)` order create/fetch; credential config via `cashfree.XClientId = &clientId`; error path.
- **Backward compat:** Go 1.18; min API version `2023-08-01`; not drop-in.
- **Source:** https://github.com/cashfree/cashfree-pg (README @ v5.0.0 vs v4.2.0) — as-of 2026-06-23

### Go v6.0.0 — 2026 (latest v6.0.5, 2026-05-12)
- **Type:** Breaking (major — **import path change**)
- **Breaking?:** Yes — module path becomes `/v6`.
- **What changed:** new spec; import path `github.com/cashfree/cashfree-pg/v6`.
- **What to fix (your code):** update the import to `…/cashfree-pg/v6` and bump `go.mod`; `go get github.com/cashfree/cashfree-pg/v6@v6.0.5`.
- **What to test:** compile (import path), all called methods, webhook verify.
- **Backward compat:** Go 1.18; call signature unchanged from v5; not drop-in (import path).
- **Source:** https://pkg.go.dev/github.com/cashfree/cashfree-pg/v6 — as-of 2026-06-23
- **Caveat:** the Go module proxy lists v5.1.4–v5.1.9 that are absent from the GitHub tag list (max v5.1.0) — possibly retracted/proxy artifacts; not in the timeline above. Follow-up needed.

### Go v4.0.1 — 2024-01-22 (boundary)
- **Breaking?:** Yes — new PG APIs. **What to fix:** migrate from 3.x; `x-api-version: 2023-08-01`. **Backward compat:** Go 1.18; not drop-in from 3.x. **Source:** https://github.com/cashfree/cashfree-pg/releases/tag/v4.0.1 — as-of 2026-06-23

---

## 5. PHP SDK (`cashfree/cashfree-pg`)

`current: 6.0.5 via Packagist; newest git tag: 6.0.5; mismatch: no (caveat below; newest GitHub Release = 6.0.1)`

> **Packagist resolution caveat:** 6.0.5 is the top semver, but **6.0.1 was published LATER (2026-05-19) than 6.0.5 (2026-05-18)** and carries a *broader* PHP constraint (`^7.2 ‖ ^8.0`), whereas 6.0.5 requires `^8.1`. `composer require cashfree/cashfree-pg:^6.0` resolves to **6.0.5** by default — which will fail to install on PHP < 8.1. Pin **6.0.1** if you need PHP 7.2–8.0.

| version | date | breaking? | headline |
|---|---|---|---|
| 6.0.5 | 2026-05-18 | **Yes** (major) | New spec; requires PHP ^8.1 |
| 6.0.1 | 2026-05-19 | **Yes** (major) | Same major; PHP `^7.2 ‖ ^8.0` build |
| 6.0.0 | 2026-05-18 | **Yes** (major) | Major bump; PHP ^8.1 |
| 5.0.3 | 2025-04-04 | No* | Major bump but **call signature unchanged**; thin auto-notes |
| 4.2.0 | 2024-07-12 | No | Subscription APIs |
| 4.0.10 | 2024-03-19 | No | Easy Split + Order Termination |
| 4.0.0 | 2024-01-22 | **Yes** | Cut-over to new PG APIs (boundary) |
| 3.2.12 | 2024-01-29 | No | Last 3.x (legacy) |

### PHP 6.0.x — 2026-05 (major, but NOT a call-signature change)
- **Type:** Breaking (runtime requirement)
- **Breaking?:** Yes — minimum PHP raised; **but the call signature is stable.**
- **What changed:** PHP **never adopted the `new Cashfree(env,id,secret)` instance pattern and never dropped `x_api_version`**. Across 4.x/5.x/6.x the usage is static config `\Cashfree\Cashfree::$XClientId = …` + `$cashfree->PGCreateOrder($x_api_version, $request)` — version stays the first positional arg. The 6.0.0/6.0.5 bump mainly **raises min PHP to ^8.1** and targets a new spec.
- **What to fix (your code):** bump your PHP runtime to 8.1+ for 6.0.0/6.0.5; **or** pin `6.0.1` to stay on PHP 7.2–8.0. Keep the `$x_api_version` first arg; update the version string as needed (`2022-09-01` → `2023-08-01`/`2025-01-01`).
- **What to test:** order create/fetch; `guzzlehttp/guzzle ^7.3` satisfied; webhook handling.
- **Backward compat:** PHP ^8.1 (6.0.0/6.0.5) or ^7.2‖^8.0 (6.0.1, ≤5.x); largely **drop-in at the call level** (signature stable); breaking only via PHP version.
- **Source:** https://github.com/cashfree/cashfree-pg-sdk-php (composer.json @ 6.0.5 vs 6.0.1) · https://packagist.org/packages/cashfree/cashfree-pg — as-of 2026-06-23
- **Docs bug:** the README at tag 6.0.5 contains copy-pasted *JavaScript* example syntax (`Cashfree.PGCreateOrder(request).then(...)`) — a documentation error, not the actual PHP API. The 6.0.1 and 5.0.3 READMEs show the correct PHP.

### PHP 4.0.0 — 2024-01-22 (boundary)
- **Breaking?:** Yes — new PG APIs. **What to fix:** migrate from 3.x. **Backward compat:** not drop-in from 3.x. **Source:** https://github.com/cashfree/cashfree-pg-sdk-php/releases/tag/4.0.0 — as-of 2026-06-23

---

## 6. .NET SDK (`cashfree_pg`)

`current: 5.0.6 via NuGet; newest git tag: 6.0.7; mismatch: YES (major) — there is NO 6.x on NuGet`

> **The biggest registry-vs-git divergence.** NuGet tops out at **5.0.6 (2025-04-08)**; git tags go to **6.0.7** (the 6.0.7 csproj sets `<Version>6.0.7</Version>`), but **nothing 6.x is published to NuGet** — `dotnet add package cashfree_pg` gets you 5.0.6.

| version | date | breaking? | headline |
|---|---|---|---|
| 6.0.7 | tagged only (not on NuGet) | **Yes** (major) | New spec; adds `net8.0`. **Unpublished on NuGet.** |
| 6.0.0–6.0.6 | tagged only | **Yes** (major) | Major bump; **unpublished on NuGet** |
| 5.0.6 | 2025-04-08 | No | **Latest on NuGet.** Patch over 5.x |
| 5.0.0 | 2025 | **Yes** | New `new Cashfree(env,id,secret,…)` instance; version dropped from args |
| 4.3.11 | 2025-01-17 | No | Patch |
| 4.2.0 | 2024-07-12 | No | Subscription APIs |
| 4.0.0 | 2024-01-22 | **Yes** | Cut-over to new PG APIs (boundary) |
| 3.2.12 | 2024-01-29 | No | Last 3.x (legacy) |

### .NET 5.0.0 — 2025
- **Type:** Breaking
- **Breaking?:** Yes — credential setup + call signature change.
- **What changed:** v4 `var cashfree = new Cashfree(); cashfree.PGCreateOrder("2022-09-01", request, null,null,null)` (version 1st arg, static creds). v5 `var cashfree = new Cashfree(Cashfree.SANDBOX, "<id>", "<secret>", null,null,null,null); cashfree.PGCreateOrder(request, null,null,null)` — **version removed**. Legacy static style still documented.
- **What to fix (your code):** use the `new Cashfree(env, id, secret, …)` constructor; remove the version first arg.
- **What to test:** order create/fetch; exception handling; default api-version; target-framework compatibility; **TLS 1.2+ on old .NET Framework** (see `pg/backend-sdks` skill).
- **Backward compat:** netstandard2.0/2.1, .NET FW 4.7+, .NET 6.0; min API version `2023-08-01`; not drop-in.
- **Source:** https://github.com/cashfree/cashfree-pg-sdk-dotnet (README @ 5.0.6 vs 4.2.0) · https://www.nuget.org/packages/cashfree_pg — as-of 2026-06-23

### .NET 6.0.x — tagged, **not on NuGet**
- **Breaking?:** Yes (major; adds net8.0 target) — **but not installable from NuGet as of 2026-06-23.** Do not advise upgrading to 6.x via NuGet until published. **Source:** https://github.com/cashfree/cashfree-pg-sdk-dotnet (csproj @ 6.0.7) — as-of 2026-06-23

### .NET 4.0.0 — 2024-01-22 (boundary)
- **Breaking?:** Yes — new PG APIs. **What to fix:** migrate from 3.x. **Backward compat:** not drop-in from 3.x. **Source:** https://github.com/cashfree/cashfree-pg-sdk-dotnet/releases/tag/4.0.0 — as-of 2026-06-23

