/**
 * Verification & Reconciliation System skill template
 */
export function getVRSSkillTemplate(): string {
    return `---
name: Cashfree VRS
description: Use Cashfree MCP to search verification and reconciliation documentation
---

# Cashfree Verification & Reconciliation System

This project has **Cashfree VRS** configured. Use the MCP tool for VRS-related queries.

## MCP Tool: cashfree-payments

Search the Cashfree VRS Developer Documentation.

### When to Use

**Always use this tool when the user asks about:**
- Bank account verification
- Penny drop verification
- UPI verification
- Settlement reconciliation
- Transaction verification
- Any Cashfree VRS API integration

### Example Usage

\`\`\`
// User: "How do I verify a bank account?"
({ query: "bank account verification API" })

// User: "Show me UPI verification"
({ query: "UPI verification", apiReferenceOnly: true })
\`\`\`
`;
}
