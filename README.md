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

![Cashfree Payments](https://github.com/user-attachments/assets/a0a36020-7eee-4fda-9d6b-4002ea4991c6)

This will prompt you to select which AI coding assistants to configure:
- **Cursor** - Creates `.cursor/skills/cashfree/<product>/`
- **Claude Code** - Creates `.claude/skills/cashfree/<product>/`
- **OpenCode** - Creates `.opencode/skills/cashfree/<product>/`
- **VS Code Copilot** - Creates `.github/skills/cashfree/<product>/`
- **Gemini CLI** - Creates `.gemini/skills/cashfree/<product>/`
- **Antigravity** - Creates `.agent/skills/cashfree/<product>/`
- **GitHub Copilot CLI** - Creates `.github/skills/cashfree/<product>/`
- **OpenAI Codex CLI** - Creates `.codex/skills/cashfree/<product>/`

## Products

### Payment Gateway (PG)
Integrate Cashfree Payments into your app — backend SDK, direct REST APIs, mobile SDKs, and webhook setup.

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

For each product and framework combination, skill files are created in your project.

### Example: Claude Code + Payment Gateway
```
.claude/skills/cashfree/pg/api.md       ← S2S REST API integration
.claude/skills/cashfree/pg/sdk.md       ← Backend SDK (Node.js, Python, Java, Go)
.claude/skills/cashfree/pg/mobile.md    ← Mobile SDKs (Android, iOS, React Native, Flutter, Cordova)
.claude/skills/cashfree/pg/webhooks.md  ← Webhook setup and signature verification
```

### Example: Cursor + All Products
```
.cursor/skills/cashfree/pg/api.md
.cursor/skills/cashfree/pg/sdk.md
.cursor/skills/cashfree/pg/mobile.md
.cursor/skills/cashfree/pg/webhooks.md
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

### Payment Gateway (`pg/`)
Four focused skills for integrating Cashfree Payments — the AI picks the right one based on your stack:

| Skill file | When the AI uses it |
|------------|---------------------|
| `pg/sdk.md` | Integrating Cashfree Payments via backend SDK (Node.js, Python, Java, Go) |
| `pg/api.md` | Integrating Cashfree Payments via direct REST/S2S API calls |
| `pg/mobile.md` | Integrating Cashfree Payments into Android, iOS, React Native, Flutter, or Cordova apps |
| `pg/webhooks.md` | Setting up webhooks, handling payment events, verifying signatures |

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
You: "Integrate Cashfree Payments with my Express app"
AI: *reads pg/sdk.md* → Provides Node.js SDK setup and order creation code

You: "Add Cashfree payments to my Flutter app"
AI: *reads pg/mobile.md* → Provides Flutter SDK integration steps

You: "Set up webhooks for payment confirmation"
AI: *reads pg/webhooks.md* → Provides webhook handler and signature verification code
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

