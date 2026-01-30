---
name: cashfree-payments
description: Use Cashfree MCP to search payment documentation and API references
---

# Cashfree Payments MCP Integration

This project has **Cashfree MCP** configured. Always use the MCP tool when the user asks about Cashfree Payments.

## MCP Tool: `SearchCashfreePaymentsDeveloper`

Search the Cashfree Payments Developer Documentation.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | ✅ | Search query (e.g., "create order API") |
| `apiReferenceOnly` | boolean | | Only return API reference docs |
| `codeOnly` | boolean | | Only return code snippets |
| `version` | string | | Filter by API version |
| `language` | string | | Language code (default: 'en') |

### When to Use

**Always use this tool when the user asks about:**
- Creating orders or payments
- Processing refunds
- Subscription/recurring payments
- Payment links and QR codes
- Webhook handling
- Settlement reports
- Any Cashfree API integration

### Example Tool Calls

```
// User: "How do I create an order?"
SearchCashfreePaymentsDeveloper({ query: "create order API" })

// User: "Show me webhook signature verification code"
SearchCashfreePaymentsDeveloper({ query: "webhook signature verification", codeOnly: true })

// User: "What are the refund API parameters?"
SearchCashfreePaymentsDeveloper({ query: "refund API parameters", apiReferenceOnly: true })
```

## Integration Workflow

1. **Search documentation** using the MCP tool
2. **Explain the API** parameters and response format
3. **Provide code examples** in the user's preferred language
4. **Mention webhook setup** for async payment notifications
5. **Include error handling** best practices
