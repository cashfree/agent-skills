/**
 * Subscriptions skill template
 */
export function getSubscriptionsSkillTemplate(): string {
    return `---
name: Cashfree Subscriptions
description: Use Cashfree MCP to search subscriptions and recurring payments documentation
---

# Cashfree Subscriptions

This project has **Cashfree Subscriptions** configured. Use the MCP tool for subscription-related queries.

## MCP Tool: cashfree-payments

Search the Cashfree Subscriptions Developer Documentation.

### When to Use

**Always use this tool when the user asks about:**
- Creating subscription plans
- Managing recurring payments
- Subscription authorization
- Subscription cancellation
- Subscription webhooks
- Customer subscription management
- Any Cashfree Subscriptions API integration

### Example Usage

\`\`\`
// User: "How do I create a subscription plan?"
({ query: "create subscription plan API" })

// User: "Show me subscription authorization"
({ query: "subscription authorization", apiReferenceOnly: true })
\`\`\`
`;
}
