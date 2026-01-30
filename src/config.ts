/**
 * MCP Server configuration for Cashfree Payments
 */
export const CASHFREE_MCP_CONFIG = {
    name: 'cashfree-payments',
    url: 'https://www.cashfree.com/docs/mcp',
    description: 'Cashfree Payments Developer Documentation',
    version: '1.0.0',
    transport: 'http' as const,
    tool: {
        name: 'SearchCashfreePaymentsDeveloper',
        description: 'Search across the Cashfree Payments Developer Documentation knowledge base to find relevant information, code examples, API references, and guides.',
        inputSchema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'A query to search the content with.'
                },
                version: {
                    type: 'string',
                    description: "Filter to specific version (e.g., 'v0.7')"
                },
                language: {
                    type: 'string',
                    description: "Filter to specific language code (e.g., 'zh', 'es'). Defaults to 'en'"
                },
                apiReferenceOnly: {
                    type: 'boolean',
                    description: 'Only return API reference docs'
                },
                codeOnly: {
                    type: 'boolean',
                    description: 'Only return code snippets'
                }
            },
            required: ['query']
        }
    }
};

/**
 * Supported frameworks
 */
export const FRAMEWORKS = [
    { name: 'Cursor', value: 'cursor' },
    { name: 'Claude Code', value: 'claude-code' },
    { name: 'OpenCode', value: 'opencode' },
    { name: 'VS Code Copilot', value: 'vscode-copilot' },
    { name: 'Gemini CLI', value: 'gemini-cli' },
    { name: 'Antigravity', value: 'antigravity' },
    { name: 'GitHub Copilot CLI', value: 'copilot-cli' },
    { name: 'OpenAI Codex CLI', value: 'codex' }
] as const;

export type Framework = typeof FRAMEWORKS[number]['value'];
