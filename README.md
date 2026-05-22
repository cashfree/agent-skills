# Cashfree Agent Skills CLI

Add Cashfree Payments skills to your AI coding assistant projects — everything in one command.

## Quick Start

```bash
npx @cashfreepayments/agent-skills add skills
```

![Cashfree Payments](https://github.com/user-attachments/assets/a0a36020-7eee-4fda-9d6b-4002ea4991c6)

This will prompt you to select which AI coding assistants to configure.

## Usage

### Interactive Mode
```bash
npx @cashfreepayments/agent-skills add skills
```
You'll be prompted to select which AI assistants to configure.

### Specify Frameworks
```bash
npx @cashfreepayments/agent-skills add skills --frameworks cursor,claude-code,gemini-cli
```

### Custom Project Path
```bash
npx @cashfreepayments/agent-skills add skills --path /path/to/project
```

### Updating Existing Skills

If you've already installed skills in a project and a newer version of the package is published, you have two options:

**Option 1 — Re-run `add skills`.** It auto-detects the installed version, compares against the latest published version on npm, and updates in place if outdated. No prompt.
```bash
npx @cashfreepayments/agent-skills add skills
```

**Option 2 — Use the dedicated `update` command.** Force-rewrites every skill file with the latest templates. Auto-detects which frameworks you have installed in the project; no need to re-select.
```bash
npx @cashfreepayments/agent-skills update
```

Target specific frameworks:
```bash
npx @cashfreepayments/agent-skills update --frameworks cursor,claude-code
```

Each skill file embeds its version in the YAML frontmatter (`cashfree-skills-version: …`), so the CLI can tell exactly what's installed and what needs refreshing.

## What Gets Created

A single command creates all skill files + a manifest for each selected framework.

### Skills Directory Structure

Each skill is split into two files: **SKILL.md** (core happy path) and **references/REFERENCE.md** (advanced topics, full API reference, additional code examples). The AI reads SKILL.md first and pulls from REFERENCE.md only when deeper detail is needed.

```
cashfree-skills/
├── getting-started/
│   └── SKILL.md                     ← Setup, auth, environment config
├── eligible-payment-modes/
│   └── SKILL.md                     ← Check enabled payment modes for a merchant
├── pg/
│   ├── SKILL.md                     ← Payment Gateway overview & sub-skill index
│   ├── apis/
│   │   ├── SKILL.md                 ← S2S REST API integration (core flow)
│   │   └── references/REFERENCE.md  ← Full endpoint map, idempotency, edge cases
│   ├── backend-sdks/
│   │   ├── SKILL.md                 ← Backend SDK (Node.js, Python, Java, Go)
│   │   └── references/REFERENCE.md  ← Refunds, settlements, pre-auth, S2S, token vault, .NET TLS fix
│   ├── mobile-sdks/
│   │   ├── SKILL.md                 ← Mobile SDKs (Android, iOS, React Native, Flutter, Cordova)
│   │   └── references/REFERENCE.md  ← Per-platform payment status verification, all SDK options
│   ├── webhooks/
│   │   ├── SKILL.md                 ← Webhook setup, signature verification, event bifurcation
│   │   └── references/REFERENCE.md  ← Full webhook payload schemas for all event types
│   ├── go-live/
│   │   ├── SKILL.md                 ← Production checklist & go-live steps
│   │   └── references/REFERENCE.md  ← Advanced production config & compliance details
│   ├── refunds/
│   │   ├── SKILL.md                 ← Refunds lifecycle, INSTANT vs STANDARD, partial/multi-refunds
│   │   └── references/REFERENCE.md  ← Full schema, eligibility, per-language SDK code, troubleshooting
│   ├── disputes/
│   │   ├── SKILL.md                 ← Dispute lifecycle, accept/contest, evidence, SLAs
│   │   └── references/REFERENCE.md  ← 24 status values, reason codes, evidence limits, per-language code
│   ├── payment-links/
│   │   ├── SKILL.md                 ← Hosted payment URLs, partial payments, auto-reminders
│   │   └── references/REFERENCE.md  ← Full schema, PAYMENT_LINK_EVENT, per-language SDK code
│   ├── token-vault/
│   │   ├── SKILL.md                 ← RBI card tokenization, saved cards, CoF, cryptograms
│   │   └── references/REFERENCE.md  ← Instrument + cryptogram schemas, network behaviour
│   ├── web-sdk/
│   │   ├── SKILL.md                 ← Cashfree.js v3 — Drop-in, Elements, SPA wiring
│   │   └── references/REFERENCE.md  ← Full API, per-framework (React/Vue/Next/Angular), CSP
│   ├── easy-split/
│   │   ├── SKILL.md                 ← Marketplace splits, vendor management, static vs dynamic
│   │   └── references/REFERENCE.md  ← Vendor KYC schema, on-demand transfer, vendor recon
│   └── offers/
│       ├── SKILL.md                 ← Bank/BIN offers, discounts, cashback, no-cost EMI recipe
│       └── references/REFERENCE.md  ← payment_method filter variants, stacking rules, tenure table
├── secure-id/
│   ├── SKILL.md                     ← Bank account verification, PAN, GSTIN, DigiLocker
│   └── references/REFERENCE.md      ← All 39+ API endpoints, webhook payloads, frontend SDKs
├── subscriptions/
│   ├── SKILL.md                     ← Recurring payments, plans, mandates, charge lifecycle
│   └── references/REFERENCE.md      ← Cut-off timelines, mobile SDKs, full webhook payloads
├── cross-border/
│   ├── SKILL.md                     ← International payments & currency conversion (core flow)
│   └── references/REFERENCE.md      ← Verification parameters, order tags, full webhook payloads
├── payouts/
│   ├── SKILL.md                     ← Bulk payouts, disbursements, beneficiary management
│   └── references/REFERENCE.md      ← 2FA RSA setup, batch transfers, V1 APIs, all webhook payloads
├── settlements-and-reconciliation/
│   ├── SKILL.md                     ← Settlement cycle, recon APIs, UTR matching, finance ops
│   └── references/REFERENCE.md      ← Full recon row schema, event types, sample Python reconciler
├── auto-collect/
│   ├── SKILL.md                     ← Virtual bank accounts, static UPI VPAs, QR codes
│   └── references/REFERENCE.md      ← VBA schema, bank rails (Axis/ICICI/Yes), credit webhook
├── migrate-from-razorpay/
│   ├── SKILL.md                     ← Razorpay → Cashfree migration: concept map, 7-step cutover, code diffs
│   └── references/REFERENCE.md      ← Endpoint map, per-language SDK rewrites, webhook payload diff, RazorpayX → Payouts
├── migrate-from-juspay/
│   ├── SKILL.md                     ← Juspay → Cashfree migration: orchestrator exit, session/payment_session mapping, webhook/status rewrites
│   └── references/REFERENCE.md      ← Endpoint map, field diffs, mobile/mandate mapping, orchestrator feature checklist
├── validation-and-testing/
│   └── SKILL.md                     ← Post-integration validation & testing
└── common-mistakes/
    └── SKILL.md                     ← Debugging guide: signature mismatches, IP whitelisting, mobile SDK errors, rate limits, go-live checklist
```

### Framework-Specific Locations

| Framework | Skills Location | Manifest File |
|-----------|----------------|---------------|
| Claude Code | `.claude/skills/cashfree-skills/` | `CLAUDE.md` (project root) |
| Cursor | `.cursor/cashfree-skills/` | `.cursor/rules/cashfree.mdc` |
| OpenCode | `.opencode/skills/cashfree-skills/` | `AGENTS.md` (project root) |
| VS Code Copilot | `.github/skills/cashfree-skills/` | `.github/copilot-instructions.md` |
| Gemini CLI | `.gemini/skills/cashfree-skills/` | `GEMINI.md` (project root) |
| Antigravity | `.agent/skills/cashfree-skills/` | `AGENTS.md` (project root) |
| GitHub Copilot CLI | `.github/skills/cashfree-skills/` | `.github/copilot-instructions.md` |
| OpenAI Codex CLI | `.agents/skills/cashfree-skills/` | `AGENTS.md` (project root) |

### Manifest File

The manifest is auto-generated with framework-specific paths. It tells the AI assistant:
1. Always read `getting-started/SKILL.md` first for new users
2. A skill map routing user intents to the correct skill file
3. After any integration code, always read `validation-and-testing/SKILL.md`

For Cursor, the manifest uses `.mdc` format with frontmatter. For all other frameworks, it's plain markdown.

## How AI Assistants Use Skills

1. The AI reads the manifest to understand what skills are available
2. Based on the user's request, it reads the matching `SKILL.md` (core happy path)
3. If deeper detail is needed, it reads `references/REFERENCE.md` for that skill
4. Uses the guidance to provide accurate, product-specific code
5. After integration, reads the validation skill for testing steps

### Example Interactions

```
You: "I want to integrate Cashfree Payments"
AI: *reads manifest → getting-started/SKILL.md* → Walks through setup and API keys

You: "What payment modes can my merchant use?"
AI: *reads eligible-payment-modes/SKILL.md* → Shows how to check enabled methods

You: "Integrate Cashfree with my Express app"
AI: *reads pg/SKILL.md → pg/backend-sdks/SKILL.md* → Provides Node.js SDK setup

You: "How do I issue a refund or handle pre-authorization?"
AI: *reads pg/backend-sdks/references/REFERENCE.md* → Full refund/pre-auth API with code

You: "Add Cashfree to my Flutter app"
AI: *reads pg/SKILL.md → pg/mobile-sdks/SKILL.md* → Provides Flutter SDK integration

You: "How do I verify payment status from the mobile SDK callback?"
AI: *reads pg/mobile-sdks/references/REFERENCE.md* → Per-platform callback → backend verify flow

You: "Set up webhooks for payment confirmation"
AI: *reads pg/webhooks/SKILL.md* → Webhook handler with two-layer bifurcation by type + status

You: "My .NET app fails with SSL/TLS error when calling Cashfree"
AI: *reads pg/backend-sdks/references/REFERENCE.md* → .NET TLS 1.2 fix with ServicePointManager

You: "Set up recurring subscriptions"
AI: *reads subscriptions/SKILL.md → subscriptions/references/REFERENCE.md* → Plan/mandate/charge flow

You: "I'm done coding, what should I test?"
AI: *reads validation-and-testing/SKILL.md* → Provides validation checklist and test data

You: "Build a marketplace where each order splits 85% to vendor, 10% to logistics, 5% commission"
AI: *reads pg/easy-split/SKILL.md → references/REFERENCE.md* → Creates vendors, adds order_splits on POST /pg/orders, sets refund_splits on refunds

You: "Run a 10% HDFC credit card offer + no-cost EMI on 3/6 month tenures"
AI: *reads pg/offers/SKILL.md → references/REFERENCE.md* → Creates two offers (DISCOUNT + NO_COST_EMI), attaches offer_id at Order Pay, validates redemption_status

You: "Give each dealer a virtual bank account number for monthly invoice collection"
AI: *reads auto-collect/SKILL.md → references/REFERENCE.md* → POST /pg/vba with remitter lock, subscribes to VBA_CREDIT webhook, reconciles by virtual_account_id

You: "Send this customer a payment link for ₹5000, allow partial payments, expire in 7 days"
AI: *reads pg/payment-links/SKILL.md → references/REFERENCE.md* → POST /pg/links with link_partial_payments, wires PAYMENT_LINK_EVENT webhook

You: "Add save-card / OneClick checkout — RBI-compliant"
AI: *reads pg/token-vault/SKILL.md → references/REFERENCE.md* → save_instrument consent, INSTRUMENT_ACTIVE_WEBHOOK ingest, pay-with-instrument_id flow

You: "Integrate Cashfree into my Next.js app with a custom-styled card form"
AI: *reads pg/web-sdk/SKILL.md → references/REFERENCE.md* → Cashfree.js v3 Elements, mount cardNumber/Cvv/Expiry/Holder, backend re-verify

You: "Customer wants a partial refund on order 42 — issue ₹50 back, instant if possible"
AI: *reads pg/refunds/SKILL.md → pg/refunds/references/REFERENCE.md* → Creates refund via SDK, checks INSTANT eligibility, subscribes to REFUND_STATUS_WEBHOOK

You: "We got a chargeback on cf_payment_id 789 — help me respond"
AI: *reads pg/disputes/SKILL.md → pg/disputes/references/REFERENCE.md* → Fetches dispute, covers preferred_evidence categories, POSTs contest with evidence URLs before respond_by

You: "Match this UTR on our bank statement back to a Cashfree settlement"
AI: *reads settlements-and-reconciliation/SKILL.md → references/REFERENCE.md* → Calls GET /pg/settlements by UTR, walks recon events, reconciles fees/TDS

You: "Migrate my Express app from Razorpay to Cashfree"
AI: *reads migrate-from-razorpay/SKILL.md → migrate-from-razorpay/references/REFERENCE.md* → Maps keys/amounts/signatures, rewrites orders/checkout/webhook with Cashfree SDK, plans parallel-run cutover

You: "Replace Juspay Hypercheckout with Cashfree in my app"
AI: *reads migrate-from-juspay/SKILL.md → migrate-from-juspay/references/REFERENCE.md* → Maps sdk_payload/client_auth_token to payment_session_id, rewrites auth/webhooks/status handling, and calls out lost orchestration features early

You: "My Payout API keeps returning signature mismatch even though IP is whitelisted"
AI: *reads common-mistakes/SKILL.md* → Multiple account IP mismatch + dynamic IP explanation + fix

You: "Why isn't my webhook firing / payment not being fulfilled?"
AI: *reads common-mistakes/SKILL.md* → Diagnostic tree narrows to exact cause and fix
```
