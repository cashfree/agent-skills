# Cashfree Agent Skills

Add Cashfree Payments MCP (Model Context Protocol) and skills configuration to your AI coding assistant projects.

## Quick Start

```bash
npx @cashfreepayments/agent-skills add agent-skills
```

This will prompt you to select which AI coding assistants to configure:
- **Cursor** - Creates `.cursor/mcp.json` and skills
- **Claude Code** - Creates `.mcp.json` and skills
- **OpenCode** - Creates `opencode.json` and skills
- **VS Code Copilot** - Creates `.vscode/mcp.json` (shared with Antigravity)
- **Gemini CLI** - Creates `.gemini/settings.json` and skills
- **Antigravity** - Creates `.vscode/mcp.json` and `.agent` skills
- **GitHub Copilot CLI** - Creates `.github/mcp.json` and skills
- **OpenAI Codex CLI** - Creates `.codex/config.toml` and skills

## Usage

### Interactive Mode
```bash
npx @cashfreepayments/agent-skills add agent-skills
```

### Specify Frameworks
```bash
npx @cashfreepayments/agent-skills add agent-skills --frameworks cursor,claude-code,vscode-copilot
```

### Custom Project Path
```bash
npx @cashfreepayments/agent-skills add agent-skills --path /path/to/project
```

## What Gets Created

### Cursor (`.cursor/mcp.json`)
```json
{
  "mcpServers": {
    "cashfree-payments": {
      "url": "https://www.cashfree.com/docs/mcp"
    }
  }
}
```

### Claude Code (`.mcp.json`)
```json
{
  "mcpServers": {
    "cashfree-payments": {
      "type": "http",
      "url": "https://www.cashfree.com/docs/mcp"
    }
  }
}
```

### VS Code Copilot & Antigravity (`.vscode/mcp.json`)
```json
{
  "servers": {
    "cashfree-payments": {
      "type": "http",
      "url": "https://www.cashfree.com/docs/mcp"
    }
  }
}
```

### GitHub Copilot CLI (`.github/mcp.json`)
```json
{
  "servers": {
    "cashfree-payments": {
      "type": "http",
      "url": "https://www.cashfree.com/docs/mcp"
    }
  }
}
```

### Gemini CLI (`.gemini/settings.json`)
```json
{
  "mcpServers": {
    "cashfree-payments": {
      "url": "https://www.cashfree.com/docs/mcp"
    }
  }
}
```

### OpenAI Codex CLI (`.codex/config.toml`)
```toml
# Cashfree Payments MCP Server
[mcp_servers.cashfree-payments]
url = "https://www.cashfree.com/docs/mcp"
```

### OpenCode (`opencode.json`)
```json
{
  "mcp": {
    "cashfree-payments": {
      "type": "http",
      "url": "https://www.cashfree.com/docs/mcp"
    }
  }
}
```

## Claude Code Plugin

For Claude Code users, you can also install the Cashfree plugin directly:

```bash
# Add the marketplace
/plugin marketplace add cashfree/agent-skills

# Install the plugin
/plugin install cashfree-payments@cashfreepayments-marketplace
```

Or test locally:
```bash
claude --plugin-dir ./cashfree-plugin
```

## MCP Server Capabilities

The Cashfree Payments MCP server provides:

**Tool: `SearchCashfreePaymentsDeveloper`**

Search across Cashfree Payments Developer Documentation for:
- API references and parameters
- Code examples and integration guides
- Webhooks and callback handling
- Error codes and troubleshooting

### Tool Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | ✅ | Search query |
| `version` | string | | API version filter |
| `language` | string | | Language code (default: 'en') |
| `apiReferenceOnly` | boolean | | Only API reference docs |
| `codeOnly` | boolean | | Only code snippets |

