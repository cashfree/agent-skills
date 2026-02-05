# Cashfree Agent Skills CLI

Add Cashfree Payments product-specific skills to your AI coding assistant projects.

## Quick Start

```bash
# Add Payment Gateway skills
npx @cashfreepayments/agent-skills add pg

# Add Secure ID skills
npx @cashfreepayments/agent-skills add secure-id

# Add Subscriptions skills
npx @cashfreepayments/agent-skills add subscriptions

# Add Cross Border skills
npx @cashfreepayments/agent-skills add cross-border

# Add Payouts skills
npx @cashfreepayments/agent-skills add payouts
```

This will prompt you to select which AI coding assistants to configure:
- **Cursor** - Creates `.cursor/skills/cashfree/<product>.md`
- **Claude Code** - Creates `.claude/skills/cashfree/<product>.md`
- **OpenCode** - Creates `.opencode/skills/cashfree/<product>.md`
- **VS Code Copilot** - Creates `.github/skills/cashfree/<product>.md`
- **Gemini CLI** - Creates `.gemini/skills/cashfree/<product>.md`
- **Antigravity** - Creates `.agent/skills/cashfree/<product>.md`
- **GitHub Copilot CLI** - Creates `.github/skills/cashfree/<product>.md`
- **OpenAI Codex CLI** - Creates `.codex/skills/cashfree/<product>.md`

## Products

### Payment Gateway (PG)
Payment gateway integration, order creation, refunds, payment links, and webhooks.

```bash
npx @cashfreepayments/agent-skills add pg
```

### Secure ID
Bank account verification, penny drop, UPI verification, and settlement reconciliation.

```bash
npx @cashfreepayments/agent-skills add secure-id
```

### Subscriptions
Recurring payments, subscription plans, authorization, and customer management.

```bash
npx @cashfreepayments/agent-skills add subscriptions
```

### Cross Border
International payments, currency conversion, and cross-border transactions.

```bash
npx @cashfreepayments/agent-skills add cross-border
```

### Payouts
Bulk payouts, vendor payments, and disbursement management.

```bash
npx @cashfreepayments/agent-skills add payouts
```

## Usage

### Interactive Mode
```bash
npx @cashfreepayments/agent-skills add pg
```
You'll be prompted to select which AI assistants to configure.

### Specify Frameworks
```bash
npx @cashfreepayments/agent-skills add pg --frameworks cursor,claude-code,gemini-cli
```

### Custom Project Path
```bash
npx @cashfreepayments/agent-skills add secure-id --path /path/to/project
```

### Add Multiple Products
```bash
npx @cashfreepayments/agent-skills add pg
npx @cashfreepayments/agent-skills add secure-id
npx @cashfreepayments/agent-skills add subscriptions
npx @cashfreepayments/agent-skills add cross-border
npx @cashfreepayments/agent-skills add payouts
```

## What Gets Created

For each product and framework combination, a skill file is created:

### Example: Gemini CLI + Payment Gateway
```
.gemini/skills/cashfree/pg.md
```

### Example: Cursor + All Products
```
.cursor/skills/cashfree/pg.md
.cursor/skills/cashfree/secure-id.md
.cursor/skills/cashfree/subscriptions.md
.cursor/skills/cashfree/cross-border.md
.cursor/skills/cashfree/payouts.md
```

## Skill Files

Each skill file contains:
- Product-specific documentation references
- Common API patterns and use cases
- Example queries for the AI assistant
- Best practices for integration

### Payment Gateway (pg.md)
Guides your AI assistant on:
- Creating orders and processing payments
- Handling refunds and settlements
- Payment links and QR codes
- Webhook integration

### secure-id (secure-id.md)
Guides your AI assistant on:
- Bank account verification APIs
- Penny drop verification
- UPI ID verification
- Transaction reconciliation

### Subscriptions (subscriptions.md)
Guides your AI assistant on:
- Creating subscription plans
- Managing recurring payments
- Subscription authorization flows
- Customer subscription lifecycle

### Cross Border (cross-border.md)
Guides your AI assistant on:
- International payment processing
- Currency conversion and rates
- Cross-border compliance
- Multi-currency transactions

### Payouts (payouts.md)
Guides your AI assistant on:
- Bulk payout processing
- Vendor payment management
- Disbursement APIs
- Payout status tracking

## Framework-Specific Locations

| Framework | Skill Location |
|-----------|----------------|
| Cursor | `.cursor/skills/cashfree/` |
| Claude Code | `.claude/skills/cashfree/` |
| OpenCode | `.opencode/skills/cashfree/` |
| VS Code Copilot | `.github/skills/cashfree/` |
| Gemini CLI | `.gemini/skills/cashfree/` |
| Antigravity | `.agent/skills/cashfree/` |
| GitHub Copilot CLI | `.github/skills/cashfree/` |
| OpenAI Codex CLI | `.codex/skills/cashfree/` |

## How AI Assistants Use Skills

When you ask your AI coding assistant about Cashfree integration:

1. The assistant reads the relevant skill file
2. Uses the guidance to understand your product context
3. Provides accurate, product-specific code examples
4. References correct API endpoints and parameters

### Example Interactions

**With PG skill:**
```
You: "How do I create a payment order?"
AI: *reads pg.md skill* → Provides order creation API code
```

**With secure-id skill:**
```
You: "Verify a bank account"
AI: *reads secure-id.md skill* → Provides bank verification API code
```

**With Subscriptions skill:**
```
You: "Set up a monthly subscription"
AI: *reads subscriptions.md skill* → Provides subscription plan creation code
```

**With Cross Border skill:**
```
You: "How do I process an international payment?"
AI: *reads cross-border.md skill* → Provides cross-border payment API code
```

**With Payouts skill:**
```
You: "How do I send bulk payouts?"
AI: *reads payouts.md skill* → Provides bulk payout API code
```

