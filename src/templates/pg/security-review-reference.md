---
name: Cashfree Payment Gateway - Security Review Reference
description: >
  Reference material for the Security Review skill. Read this for per-vulnerability
  detail: the insecure pattern, the secure fix as a diff, and the detection heuristic
  for each catalog item (1-18), plus the Mode B dependency-scanner commands, output
  parsing, and payment-path triage rules. Always read security-review/SKILL.md first
  for scope detection, the catalog, the output format, and the fix workflow.
---

# Cashfree Payment Gateway — Security Review Reference

> Same numbering as the catalog in `security-review/SKILL.md` §4. Each entry: **what it is**, **how to detect**, **insecure**, **secure**. Code is Node-first (`cashfree-pg`) because it is the most common stack; the heuristic and fix translate to other languages.

---

## Mode A — per-vulnerability detail

### 1. Trusting client-side payment status (Critical)
**Detect:** the order is marked paid from a value the browser/app sent (query param, POST body, SDK callback result) with no server call to Cashfree.
**Insecure:**
```js
app.get("/payment/return", (req, res) => {
  if (req.query.order_status === "PAID") fulfillOrder(req.query.order_id); // attacker sets ?order_status=PAID
});
```
**Secure:** re-verify server-side and trust only Cashfree's response.
```js
const resp = await cashfree.PGFetchOrder(orderId);
if (resp.data.order_status === "PAID") fulfillOrder(orderId);
```

### 2. `return_url` redirect treated as proof of payment (Critical)
**Detect:** fulfillment happens inside the `return_url` handler with no `PGFetchOrder` / webhook confirmation. The `return_url` is just a redirect; it fires even if payment failed or the user navigates there directly.
**Fix:** treat `return_url` as "show a status page", and gate fulfillment on `PGFetchOrder` (sync) or the verified webhook (async). Never both-less.

### 3. Amount / currency from the client (Critical)
**Detect:** `order_amount` is read from the request body / client and passed straight into `PGCreateOrder`.
**Insecure:** `order_amount: req.body.amount` — attacker pays ₹1 for a ₹10,000 cart.
**Secure:** compute the amount server-side from the cart/catalog; after payment, assert `resp.data.order_amount === expectedAmount` before fulfilling. Pin `order_currency` server-side too.

### 4. Webhook signature not verified (Critical)
**Detect:** a webhook/callback route that parses the body and acts on it with no signature check.
**Secure (Node SDK):**
```js
cashfree.PGVerifyWebhookSignature(req.headers["x-webhook-signature"], rawBody, req.headers["x-webhook-timestamp"]);
```
Reject (HTTP 401) on failure; never fulfill on an unverified webhook.

### 5. Signature verified on parsed/re-serialized JSON (High)
**Detect:** the handler uses `req.body` (already parsed by `express.json()`) for verification instead of the raw bytes. Re-serialising changes key order/whitespace and the HMAC will be computed over the wrong bytes (works by luck, fails silently, or tempts people to disable verification).
**Secure:** capture the raw body, e.g. `express.raw({ type: "application/json" })` or `express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } })`, and verify over `req.rawBody`.

### 6. Non-constant-time signature compare (Medium)
**Detect:** `signature === expected` or `==` on the HMAC. Prefer the SDK verifier; if comparing manually, use `crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b))` with a length guard.

### 7. No timestamp / replay protection (High)
**Detect:** `x-webhook-timestamp` is ignored. A captured valid webhook can be replayed. **Fix:** reject timestamps outside a small window (e.g. ±5 min) and/or dedupe on `cf_payment_id` / event id so a replay is a no-op.

### 8. `x-client-secret` in frontend/mobile (Critical)
**Detect:** the secret key or a raw `PGCreateOrder` call appears in browser JS, a mobile app, or any client bundle. The client must only ever receive the `payment_session_id`. **Fix:** move order creation to the backend; return only the session id to the client.

### 9. Hardcoded `PROD_` keys / secrets in VCS (Critical)
**Detect:** string literals matching `PROD_`/`TEST_` keys, or secrets in tracked files (`grep` the repo, check `.env` is git-ignored). **Fix:** move to env vars / a secrets manager; rotate any key that was committed (git history keeps it).

### 10. Secrets in logs (High)
**Detect:** `console.log`/logger calls that print request headers, the secret, the full order request, or card data. **Fix:** redact; never log `x-client-secret`, card fields, or full webhook payloads at info level.

### 11. Missing idempotency / reused `order_id` (High)
**Detect:** fulfillment is not guarded against the same order/webhook being processed twice (webhooks can be redelivered). **Fix:** make fulfillment idempotent — key on `order_id`/`cf_payment_id`, check "already fulfilled" before acting. Use a fresh unique `order_id` per attempt.

### 12. PCI hygiene — PAN/CVV/token stored or logged (Critical)
**Detect:** card number, CVV, expiry, or raw token/cryptogram written to a DB, log, or analytics event. **Fix:** never touch raw card data on your server — use Cashfree.js Elements / the SDK and token-vault. Store only Cashfree references (`cf_payment_id`, instrument id).

### 13. Missing HTTPS / no whitelisting (High)
**Detect:** `http://` return/notify URLs, or a webhook endpoint served over HTTP. **Fix:** HTTPS everywhere; whitelist the production domain/app in the dashboard (see `pg/go-live`).

### 14. Authorization gaps on refund / easy-split / payout (High)
**Detect:** a refund/payout endpoint that acts on an `order_id`/amount from the request without checking the caller owns that order (IDOR), or with no auth at all. **Fix:** authorize the caller against the order; validate the refund amount against the captured amount server-side.

### 15. Insecure deserialization of the webhook payload (Medium)
**Detect:** the raw webhook body is fed into an unsafe deserializer (e.g. Java native deserialization, `pickle`, `yaml.load`). **Fix:** parse as plain JSON into a known schema only.

### 16. Error handling leaks internals (Medium)
**Detect:** stack traces, SDK error objects, or secrets returned in the HTTP response. **Fix:** log server-side, return a generic error to the client.

### 17. SSRF via reflected `notify_url` / `return_url` (Medium)
**Detect:** these URLs are taken from client input and used by the server to make outbound requests, or set per-request from untrusted input. **Fix:** set them server-side from config / an allowlist.

### 18. Weak / guessable `order_id` (Medium)
**Detect:** sequential or predictable order ids (e.g. `"order_" + counter`). Predictable ids widen IDOR/enumeration. **Fix:** use a UUID or a cryptographically random id.

---

## Mode B — dependency scanner detail

### Running the scanner
Pick by lockfile present (see the matrix in the SKILL). Prefer the ecosystem-native tool; fall back to `osv-scanner` / `trivy fs .` which read lockfiles and query a live DB. Examples:
```bash
npm audit --json                               # Node
pip-audit -f json                              # Python
govulncheck ./...                              # Go (reachability-aware)
composer audit --format=json                   # PHP
dotnet list package --vulnerable --format json # .NET
osv-scanner --lockfile=<lockfile>              # any ecosystem
trivy fs .                                      # any ecosystem, filesystem scan
```

### Parsing and triage
- Parse the JSON; keep severity (CRITICAL/HIGH first).
- **Triage to the payment path:** keep advisories for packages used by payment-flow files — crypto/hashing, HTTP clients (the one calling Cashfree), signature/JWT libs, serialization/JSON. De-prioritise advisories in packages the payment flow never imports.
- For each kept advisory, report: package, installed version, fixed version, severity, and the one-line reason. Cite the advisory id from the scanner output — never from memory.

### Acting on findings
- Propose the minimum version bump that clears the advisory, as a diff on the manifest/lockfile.
- If the fix is a major bump that may break the build, say so and let the developer decide; do not auto-apply.
- Re-run the scanner after the bump to confirm it cleared.

### Graceful degradation
- No scanner installed: offer the one-line install, and in the meantime report §5.1 (Cashfree SDK staleness) plus the Mode A audit.
- No network: say the scanner needs network for the live DB; do not pretend a clean result.
