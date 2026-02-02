# Cashfree Agent Skills CLI

Add Cashfree Payments product-specific skills to your AI coding assistant projects.

## Quick Start

```bash
# Add Payment Gateway skills
npx @cashfreepayments/agent-skills add pg

# Add Verification & Reconciliation skills
npx @cashfreepayments/agent-skills add vrs

# Add Subscriptions skills
npx @cashfreepayments/agent-skills add subscriptions
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

### Verification & Reconciliation (VRS)
Bank account verification, penny drop, UPI verification, and settlement reconciliation.

```bash
npx @cashfreepayments/agent-skills add vrs
```

### Subscriptions
Recurring payments, subscription plans, authorization, and customer management.

```bash
npx @cashfreepayments/agent-skills add subscriptions
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
npx @cashfreepayments/agent-skills add vrs --path /path/to/project
```

### Add Multiple Products
```bash
npx @cashfreepayments/agent-skills add pg
npx @cashfreepayments/agent-skills add vrs
npx @cashfreepayments/agent-skills add subscriptions
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
.cursor/skills/cashfree/vrs.md
.cursor/skills/cashfree/subscriptions.md
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

### VRS (vrs.md)
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

**With VRS skill:**
```
You: "Verify a bank account"
AI: *reads vrs.md skill* → Provides bank verification API code
```

**With Subscriptions skill:**
```
You: "Set up a monthly subscription"
AI: *reads subscriptions.md skill* → Provides subscription plan creation code
```

