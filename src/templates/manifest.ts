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
2. Match the user's goal to a skill below and read that file
3. After any integration code is written, **ALWAYS** read \`${s}/validation-and-testing/SKILL.md\`

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
