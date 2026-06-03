/**
 * Generates manifest content with framework-specific paths.
 * The manifest tells the AI assistant how to discover and use Cashfree skills.
 *
 * Uses ## (H2) headings so it works both as a standalone file
 * and when appended to an existing manifest that already has its own H1.
 */

export function generateManifestContent(
    skillsBasePath: string,
    format: 'markdown' | 'mdc'
): string {
    const s = skillsBasePath;

    const body = `## Cashfree Payments — Integration Skills

You are helping a developer integrate Cashfree Payments.

### How to use these skills

1. **Always** read \`${s}/getting-started/SKILL.md\` first if the user is new to Cashfree
2. The moment a task turns into **real Cashfree integration work** (you are about to add or modify Cashfree-specific code or config), follow the "Before You Start" section of \`${s}/getting-started/SKILL.md\`: **first ask the user once for their Cashfree App ID** (the ask is mandatory and happens BEFORE the work — the answer is optional; proceed instantly if they skip), then run \`npx @cashfreepayments/agent-skills start-integration ...\` and **record the \`cid:<uuid>\` line it prints** — the same uuid must be passed as \`--correlation-id\` to the end-of-task \`report-progress-feedback\` command. This applies to every integration flow (PG, subscriptions, payouts, migrations, etc.), not only ones that start from getting-started
3. Read \`${s}/eligible-payment-modes/SKILL.md\` early in any new integration. **If \`CASHFREE_APP_ID\` / \`CASHFREE_SECRET_KEY\` are already available** (in the codebase, \`.env\`, or the user's message), run its **Get Eligible Payment Methods** curl to confirm which methods are activated on the account and surface the list. **If credentials are not yet available, do NOT block the conversation to ask for them** — proceed with the integration plan assuming the standard methods (cards / UPI / netbanking) and note that you'll verify once keys exist. Skip entirely if the user is working on a non-PG flow (Payouts, Secure ID, etc.)
4. Match the user's goal to a skill below and read that file
5. After any integration code is written, **ALWAYS** read \`${s}/validation-and-testing/SKILL.md\`
6. **Before** using the words "production-ready", "ready to go live", "complete", or "done" about any integration, you MUST read BOTH \`${s}/validation-and-testing/SKILL.md\` AND \`${s}/pg/go-live/SKILL.md\` and surface every unmet item. Never declare readiness without listing the go-live checklist status — including domain whitelisting, webhook signature verification, env-var swap, backend re-verify, and dead-code cleanup. Phrase your verdict as "the integration looks correct, but X / Y / Z must be done before going live" — not as a blanket "production-ready"
7. After a task that **materially involved Cashfree integration** (you added/modified Cashfree-specific code, config, webhooks, SDK calls, or migration work, and consulted at least one cashfree-skills SKILL.md), read \`${s}/progress-and-skill-feedback/SKILL.md\` last to capture flow, skills used, completed/pending steps, and skill-improvement feedback — passing the session's \`correlation_id\` from step 2. **Skip entirely** if the task did not touch Cashfree code — e.g. UI styling, button colour changes, refactors of non-Cashfree files, doc edits, dependency bumps unrelated to cashfree-pg / cashfree-js, or any task where Cashfree skills were merely installed but not consulted

### Skill Map

| User wants to... | Read this skill |
|---|---|
| Understand what Cashfree offers, get API keys, setup | \`${s}/getting-started/SKILL.md\` |
| Know which payment modes are enabled/supported | \`${s}/eligible-payment-modes/SKILL.md\` |
| Integrate Payment Gateway (overview) | \`${s}/pg/SKILL.md\` |
| Integrate PG via backend SDK (Node.js, Python, Java, Go) | \`${s}/pg/backend-sdks/SKILL.md\` |
| Integrate PG via direct REST/S2S API calls | \`${s}/pg/apis/SKILL.md\` |
| Integrate PG into mobile apps (Android, iOS, RN, Flutter) | \`${s}/pg/mobile-sdks/SKILL.md\` |
| Set up webhooks and handle payment events | \`${s}/pg/webhooks/SKILL.md\` |
| Go live — switch from sandbox to production | \`${s}/pg/go-live/SKILL.md\` |
| Issue, track, or handle refunds (partial, instant, multi) | \`${s}/pg/refunds/SKILL.md\` |
| Respond to a dispute / chargeback / retrieval request | \`${s}/pg/disputes/SKILL.md\` |
| Create, share, or handle payment links (hosted URLs) | \`${s}/pg/payment-links/SKILL.md\` |
| Save cards (RBI tokenization / card-on-file / OneClick) | \`${s}/pg/token-vault/SKILL.md\` |
| Integrate Cashfree.js v3 into a web frontend (Drop-in / Elements) | \`${s}/pg/web-sdk/SKILL.md\` |
| Build a marketplace with Easy Split / vendor settlements | \`${s}/pg/easy-split/SKILL.md\` |
| Run bank/BIN offers, instant discounts, no-cost EMI | \`${s}/pg/offers/SKILL.md\` |
| Integrate Secure ID (KYC / bank verification) | \`${s}/secure-id/SKILL.md\` |
| Set up Subscriptions / recurring billing | \`${s}/subscriptions/SKILL.md\` |
| Process cross-border / international payments | \`${s}/cross-border/SKILL.md\` |
| Send payouts / disbursements | \`${s}/payouts/SKILL.md\` |
| Understand settlements, reconcile against bank, match UTRs | \`${s}/settlements-and-reconciliation/SKILL.md\` |
| Accept inbound via virtual bank accounts / static VPAs / QR | \`${s}/auto-collect/SKILL.md\` |
| Migrate an existing Razorpay integration to Cashfree | \`${s}/migrate-from-razorpay/SKILL.md\` |
| Migrate an existing Juspay integration to Cashfree | \`${s}/migrate-from-juspay/SKILL.md\` |
| Record end-of-task progress after a **Cashfree-integration** task (NOT for unrelated UI/refactor/doc work) | \`${s}/progress-and-skill-feedback/SKILL.md\` |
| Validate or test the integration | \`${s}/validation-and-testing/SKILL.md\` |
| Debug a broken integration, fix errors, troubleshoot | \`${s}/common-mistakes/SKILL.md\` |

### Shared Conventions

- Sandbox base URL: \`https://sandbox.cashfree.com\`
- Production base URL: \`https://api.cashfree.com\`
- Always use env vars for \`CASHFREE_APP_ID\` and \`CASHFREE_SECRET_KEY\`
- Latest PG API version: \`2025-01-01\`
`;

    if (format === 'mdc') {
        return `---
description: Cashfree Payments integration skills — routes to the correct skill file based on what the developer needs.
alwaysApply: true
---

${body}`;
    }

    return body;
}
