---
name: Cashfree Payment Gateway - Security Review
description: >
  Use to audit AND fix security vulnerabilities in a Cashfree **payment-flow**
  integration — e.g. "security review my Cashfree integration", "is my payment flow
  secure", "check my webhook verification", "am I verifying payments correctly",
  "scan my payment dependencies", "find vulnerabilities in my checkout code".
  Scoped to payment-flow code only (order create/verify, webhooks, refunds, secrets,
  SDK/dependency posture) — NOT whole-codebase linting. Two modes: (A) integration
  security audit of how Cashfree was wired (client-trusted status, amount tampering,
  weak webhook verification, exposed secrets, PCI hygiene, authorization), and
  (B) dependency + version posture that flags a stale/deprecated Cashfree SDK or API
  version and shells out to live vulnerability scanners for companion packages.
  For a version upgrade plan use upgrade-advisor; for go-live steps use pg/go-live.
---

# Cashfree Payment Gateway — Security Review

> Finds and fixes security issues in the **payment flow only**. This is an auditor: it reads the merchant's integration code, reports vulnerabilities with `file:line` and a concrete exploit, and proposes fixes as diffs. Deep per-vulnerability detail (insecure vs secure code, detection heuristics, scanner commands) lives in `references/REFERENCE.md`.

---

## 1. Scope & boundaries

### Use this skill when
- The developer asks for a security review / audit of their Cashfree payment integration.
- The developer wants to know if their payment flow (order create, verify, webhooks, refunds) is secure.
- The developer wants their payment-related dependencies checked for known vulnerabilities.
- You just wrote or changed payment-flow code and want a security pass before go-live.

### Do NOT use this skill for
- Whole-codebase or general security linting unrelated to payments — stay in the payment flow.
- A version upgrade plan → `upgrade-advisor`.
- Sandbox-to-production steps → `pg/go-live`.
- Generic "what changed" lookups → `changelog`.

### The golden rule
Audit **only** the Cashfree payment flow and its immediate data flow. Do not wander into unrelated application code, and never flood the developer with findings outside the payment path.

**Report-only for anything out of scope.** If, while reading the payment flow, you happen to notice a serious issue in non-payment code (a SQL injection in a search route, an IDOR on a profile endpoint, etc.), you may list it once as an **out-of-scope FYI** — but do **not** fix it, refactor it, or touch that file. Changing non-payment code is out of this skill's mandate; only fix it if the developer explicitly asks in a separate go-ahead.

---

## 2. Two modes (run both unless the developer scopes it)

- **Mode A — Integration security audit (§4).** Logic/semantic vulnerabilities in how Cashfree was wired. These never go stale.
- **Mode B — Dependency & version posture (§5).** Stale/deprecated Cashfree SDK or API version, plus companion packages checked against live vulnerability databases via a shell-out scanner.

---

## 3. Scope detection — find the payment flow first

Before auditing, locate the payment touchpoints. Audit those files plus the code that feeds them (the amount handler, the verify step). Prefer the knowledge graph or grep over reading the whole repo.

Signals to grep for:
- Imports: `cashfree-pg`, `cashfree_pg`, `@cashfreepayments/cashfree-js`, `github.com/cashfree/cashfree-pg`, any mobile SDK coordinate.
- SDK/API calls: `PGCreateOrder`, `PGFetchOrder`, `PGOrderFetchPayments`, `/pg/orders`, `/pg/orders/{id}`, refund/settlement calls.
- Session + redirect: `payment_session_id`, `return_url`, `notify_url`.
- Webhook routes: handlers that read `x-webhook-signature` / `x-webhook-timestamp`, or a route named `webhook`/`callback`.
- Secrets: `x-client-secret`, `CASHFREE_SECRET_KEY`, `XClientSecret`.

If you find no Cashfree payment code, say so and stop — there is nothing in scope to audit.

---

## 4. Mode A — Integration security audit

Walk this catalog against the detected code. For each hit, record `file:line`, severity, and a one-line exploit. Full insecure/secure diffs and detection heuristics are in `references/REFERENCE.md` (same numbering).

| # | Vulnerability | Severity |
|---|---|---|
| 1 | Trusting client-side payment status instead of server-side re-verify (`PGFetchOrder` / GET order) | Critical |
| 2 | Treating the `return_url` redirect as proof of payment | Critical |
| 3 | Amount or currency taken from the client and not recomputed/verified server-side | Critical |
| 4 | Webhook signature not verified at all | Critical |
| 5 | Signature verified on parsed/re-serialized JSON rather than the **raw** request body | High |
| 6 | Signature compared with a non-constant-time string compare | Medium |
| 7 | No webhook timestamp / replay protection | High |
| 8 | `x-client-secret` exposed in frontend or mobile code | Critical |
| 9 | Hardcoded `PROD_` keys or secrets committed to version control | Critical |
| 10 | Secrets written to logs | High |
| 11 | Missing idempotency — duplicate capture or reused `order_id` | High |
| 12 | PCI hygiene — logging or storing PAN, CVV, or raw token data | Critical |
| 13 | Missing HTTPS or no domain/app whitelisting | High |
| 14 | Authorization gaps on refund / easy-split / payout (IDOR on `order_id`, refund without an auth check) | High |
| 15 | Insecure deserialization of the webhook payload | Medium |
| 16 | Error handling that leaks stack traces or secrets to the client | Medium |
| 17 | SSRF risk via reflected `notify_url` / `return_url` | Medium |
| 18 | Weak or guessable `order_id` generation | Medium |

The top of the catalog (1–4, 8–9, 12) is where real payment fraud happens. Prioritise those.

---

## 5. Mode B — Dependency & version posture (shell-out)

### 5.1 Cashfree SDK staleness (no external tool needed)
Detect the installed Cashfree SDK/API version exactly as `upgrade-advisor` §Step 2 does (read `package.json` / `pom.xml` / `go.mod` / `requirements.txt` / `composer.json` / `.csproj`, and the `x-api-version` in code). Flag:
- A version well behind the current published major (hand off to `upgrade-advisor` for the actual plan).
- A runtime below the minimum-runtime floor in `changelog/references/pg-backend-sdks.md` (e.g. old .NET Framework without TLS 1.2).
- A deprecated `x-api-version` — the API returns an `x-deprecated-at` header at runtime; surface it.

### 5.2 Companion packages — shell out to a live scanner
Do **not** recite CVEs from memory. Run the ecosystem's own advisory tool so the data is current, then triage to packages in the payment path (crypto, HTTP client, signature/JWT, serialization).

| Ecosystem | Primary command | Fallback |
|---|---|---|
| Node / npm | `npm audit --json` | `osv-scanner --lockfile=package-lock.json` |
| Python | `pip-audit -f json` | `osv-scanner --lockfile=requirements.txt` |
| Java / Maven | `mvn org.owasp:dependency-check-maven:check` or `trivy fs .` | `osv-scanner` |
| Go | `govulncheck ./...` | `osv-scanner --lockfile=go.mod` |
| PHP | `composer audit --format=json` | `osv-scanner --lockfile=composer.lock` |
| .NET | `dotnet list package --vulnerable --format json` | `osv-scanner` |
| Any / mixed | `osv-scanner` (OSV.dev) | `trivy fs .` |

Rules:
- Cite only scanner output — never a CVE ID from memory.
- **Triage hard to the payment path.** Classify each advisory into: (a) **actionable** — the package is imported/reachable from payment-flow code (crypto, HTTP client that calls Cashfree, signature/JWT, serialization of payment data); (b) **noise** — the advisory is in a framework/library feature the payment flow never uses (e.g. an unused Spring/Flask/Express sub-component, a transitive dep no payment code reaches). Act only on (a). List (b) at most as a one-line FYI count ("N further advisories outside the payment path"), and never bump or change deps just to clear noise. Prefer a reachability-aware scanner (`govulncheck`, `osv-scanner --call-analysis`) to decide this when available.
- Degrade gracefully: if no scanner is installed or there is no network, say so and fall back to §5.1 plus the Mode A audit instead of failing the run. Offer the one-line install (e.g. `go install golang.org/x/vuln/cmd/govulncheck@latest`, `pip install pip-audit`, `brew install osv-scanner`).

---

## 6. Output format

Produce one report, findings ranked most-severe first:

```
## Payment-flow security review

### Findings (N)
1. [Critical] <title> — <file:line>
   Exploit: <one concrete sentence: input/state → wrong outcome>
   Fix: <what to change, 1 line> (diff below)
2. ...
(If none: "No payment-flow vulnerabilities found in the audited files: <list>.")

### Dependency posture
- Cashfree SDK: <name> <version> — <current / stale / below runtime floor / deprecated api-version>
- Scanner: <tool run> — <N actionable advisories in payment-path packages, or "clean", or "not run: reason"> (<M further advisories outside the payment path — not actioned>)

### Secret rotation (include whenever a secret was found committed)
- <secret> was committed to the repo. Removing it from the code does NOT remove it from git history — **rotate it in the Cashfree dashboard** and move the new value to env/secrets. (Omit this section only if no committed secret was found.)

### Out of scope (reported, not fixed)
- <non-payment issue — file:line — severity> — outside the payment flow; left untouched. Fix on request.
(Omit this section if nothing out-of-scope was noticed.)

### Suggested fixes
<one diff block per payment-flow finding the developer accepts>
```

Rules:
- Every finding needs `file:line` and a concrete exploit scenario. No vague "this might be insecure".
- Show fixes as diffs, not prose.

---

## 7. Fix workflow

1. Report first. Do not edit until the developer picks what to fix.
2. Apply accepted fixes as minimal diffs **scoped to the payment flow only**. Never edit non-payment files — out-of-scope findings stay report-only unless the developer explicitly asks for them in a separate go-ahead.
3. Dependency fixes: propose the version bump or safer alternative for **actionable** (payment-path) advisories; apply only on confirmation (a bump can break the build). Do not bump deps to clear out-of-path noise.
4. If any secret was found committed, **always** surface the rotation reminder — deleting it from source does not purge git history, so the live key must be rotated.
5. After fixing, read `validation-and-testing/SKILL.md` and re-verify. Do not call the integration "secure" or "production-ready" without listing exactly what was checked and what remains.

---

## 8. Guardrails

- Payment-flow scope only — never expand into whole-codebase linting. Non-payment findings are **report-only**; do not edit files outside the payment flow without an explicit go-ahead.
- Never fabricate CVE IDs; for dependency issues cite live scanner output only, and act only on advisories reachable from the payment path (the rest is a one-line FYI, not a fix).
- Whenever a secret was found committed, always include the rotation reminder — removing it from code leaves it in git history.
- Destructive or auto-applied fixes are gated behind explicit confirmation.
- Re-verify after every fix; report honestly what passed and what did not.
- This skill reduces risk; it is not a compliance certification. Say so if asked whether the integration is "PCI compliant".
