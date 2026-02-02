/**
 * Payment Gateway skill template
 */
export function getPGSkillTemplate(): string {
    return `---
name: Cashfree Payment Gateway
description: Use Cashfree MCP to search payment gateway documentation and API references
---

# Cashfree Payment Gateway Integration

This project has **Cashfree Payment Gateway** configured. Use the MCP tool for PG-related queries.

## MCP Tool: cashfree-payments

Search the Cashfree Payment Gateway Developer Documentation.

### When to Use

**Always use this tool when the user asks about:**
- Creating orders or payments
- Processing refunds
- Payment gateway integration
- Payment links and QR codes
- Webhook handling
- Settlement reports
- Any Cashfree PG API integration

### Example Usage

\`\`\`
// User: "How do I create an order?"
({ query: "create order API" })

// User: "Show me refund API"
({ query: "refund API", apiReferenceOnly: true })
\`\`\`
`;
}
