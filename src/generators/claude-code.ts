import fs from 'fs-extra';
import path from 'path';
import { CASHFREE_MCP_CONFIG } from '../config.js';
import { ensureDir, writeJsonConfig, writeTextFile, logCreated, logUpdated, getMcpServerConfig } from './utils.js';
import { getCashfreeSkillTemplate } from '../templates/skills.js';

/**
 * Generate Claude Code MCP configuration
 * Creates .mcp.json in the project root and skill file
 */
export async function generateClaudeCode(projectPath: string): Promise<void> {
    const mcpConfigPath = path.join(projectPath, '.mcp.json');

    const config = {
        mcpServers: {
            [CASHFREE_MCP_CONFIG.name]: getMcpServerConfig(true)
        }
    };

    const isUpdate = await writeJsonConfig(mcpConfigPath, config, 'mcpServers');
    isUpdate ? logUpdated('.mcp.json') : logCreated('.mcp.json');

    // Create skill file
    await createClaudeCodeSkill(projectPath);
}

/**
 * Create a skill file for Claude Code
 */
async function createClaudeCodeSkill(projectPath: string): Promise<void> {
    const skillsDir = path.join(projectPath, '.claude', 'skills', 'cashfree');
    const skillPath = path.join(skillsDir, 'SKILL.md');

    await ensureDir(skillsDir);

    const created = await writeTextFile(skillPath, getCashfreeSkillTemplate());
    if (created) {
        logCreated('.claude/skills/cashfree/SKILL.md');
    }
}
