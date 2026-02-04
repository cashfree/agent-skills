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

/**
 * Supported Cashfree products
 */
export const PRODUCTS = [
    { name: 'Payment Gateway (PG)', value: 'pg' },
    { name: 'Secure ID', value: 'secure-id' },
    { name: 'Subscriptions', value: 'subscriptions' },
    { name: 'Cross Border', value: 'crossBorder' },
    { name: 'Payouts', value: 'payouts' },
    { name: 'Risk Shield', value: 'riskShield' }
] as const;

export type Product = typeof PRODUCTS[number]['value'];
