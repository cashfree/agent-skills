import path from 'path';
import fs from 'fs-extra';
import { CASHFREE_MCP_CONFIG } from '../config.js';
import { ensureDir, logCreated, logUpdated, writeTextFile } from './utils.js';
import { getCashfreeSkillTemplate } from '../templates/skills.js';

/**
 * Generate OpenAI Codex CLI configuration
 * Creates .codex/config.toml with MCP server config (TOML format)
 */
export async function generateCodex(projectPath: string): Promise<void> {
    const codexDir = path.join(projectPath, '.codex');
    const configPath = path.join(codexDir, 'config.toml');

    await ensureDir(codexDir);

    // Codex uses TOML format for config
    const tomlConfig = `# Cashfree Payments MCP Server
[mcp_servers.${CASHFREE_MCP_CONFIG.name}]
url = "${CASHFREE_MCP_CONFIG.url}"
`;

    const isUpdate = await writeTomlConfig(configPath, tomlConfig);
    isUpdate ? logUpdated('.codex/config.toml') : logCreated('.codex/config.toml');

    // Create instructions file (AGENTS.md style)
    await createCodexSkill(projectPath);
}

/**
 * Write or merge TOML config
 */
async function writeTomlConfig(configPath: string, newContent: string): Promise<boolean> {
    const exists = await fs.pathExists(configPath);

    if (exists) {
        const existingContent = await fs.readFile(configPath, 'utf-8');
        // Check if cashfree config already exists
        if (existingContent.includes(`[mcp_servers.${CASHFREE_MCP_CONFIG.name}]`)) {
            return true; // Already configured
        }
        // Append to existing config
        await fs.appendFile(configPath, '\n' + newContent);
        return true;
    } else {
        await fs.writeFile(configPath, newContent);
        return false;
    }
}

/**
 * Create a skill file for GitHub Copilot CLI
 */
async function createCodexSkill(projectPath: string): Promise<void> {
    const skillsDir = path.join(projectPath, '.codex', 'skills', 'cashfree');
    const skillPath = path.join(skillsDir, 'SKILL.md');

    await ensureDir(skillsDir);

    const created = await writeTextFile(skillPath, getCashfreeSkillTemplate());
    if (created) {
        logCreated('.codex/skills/cashfree/SKILL.md');
    }
}
