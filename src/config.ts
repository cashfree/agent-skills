/**
 * Supported frameworks
 */
export const FRAMEWORKS = [
    { name: 'Cursor', value: 'cursor' },
    { name: 'Claude Code', value: 'claude-code' },
    { name: 'Codex', value: 'codex' },
    { name: 'OpenCode', value: 'opencode' },
    { name: 'VS Code Copilot', value: 'vscode-copilot' },
    { name: 'Gemini CLI', value: 'gemini-cli' },
    { name: 'Antigravity', value: 'antigravity' },
    { name: 'GitHub Copilot CLI', value: 'copilot-cli' }
] as const;

export type Framework = typeof FRAMEWORKS[number]['value'];

/**
 * Returns the path (from project root) to the cashfree-skills directory.
 * Based on each framework's official skills convention.
 */
export function getSkillsBasePath(framework: Framework): string {
    switch (framework) {
        case "claude-code":     return ".claude/skills/cashfree-skills";
        case "cursor":          return ".cursor/cashfree-skills";
        case "opencode":        return ".opencode/skills/cashfree-skills";
        case "vscode-copilot":  return ".github/skills/cashfree-skills";
        case "copilot-cli":     return ".github/skills/cashfree-skills";
        case "gemini-cli":      return ".gemini/skills/cashfree-skills";
        case "codex":           return ".agents/skills/cashfree-skills";
        case "antigravity":     return ".agent/skills/cashfree-skills";
        default:                return ".agent/skills/cashfree-skills";
    }
}

/**
 * Returns the manifest file path (from project root) and format.
 * Based on each framework's official manifest convention.
 */
export function getManifestConfig(framework: Framework): { path: string; format: 'markdown' | 'mdc' } {
    switch (framework) {
        case "claude-code":     return { path: "CLAUDE.md", format: "markdown" };
        case "cursor":          return { path: ".cursor/rules/cashfree.mdc", format: "mdc" };
        case "opencode":        return { path: "AGENTS.md", format: "markdown" };
        case "vscode-copilot":  return { path: ".github/copilot-instructions.md", format: "markdown" };
        case "copilot-cli":     return { path: ".github/copilot-instructions.md", format: "markdown" };
        case "gemini-cli":      return { path: "GEMINI.md", format: "markdown" };
        case "codex":           return { path: "AGENTS.md", format: "markdown" };
        case "antigravity":     return { path: "AGENTS.md", format: "markdown" };
        default:                return { path: "AGENTS.md", format: "markdown" };
    }
}
