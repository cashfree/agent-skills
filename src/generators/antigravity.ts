import path from 'path';
import { CASHFREE_MCP_CONFIG } from '../config.js';
import { ensureDir, writeJsonConfig, logCreated, logUpdated, getMcpServerConfig, writeTextFile } from './utils.js';
import { getCashfreeSkillTemplate } from '../templates/skills.js';

/**
 * Generate Antigravity (Gemini Code) MCP configuration
 * Creates .gemini/mcp.json and skills
 */
export async function generateAntigravity(projectPath: string): Promise<void> {
    const antigravityDir = path.join(projectPath, '.vscode');
    const mcpConfigPath = path.join(antigravityDir, 'mcp.json');

    await ensureDir(antigravityDir);

    // Antigravity uses 'servers' like VS Code Copilot
    const config = {
        servers: {
            [CASHFREE_MCP_CONFIG.name]: getMcpServerConfig(true)
        },
        inputs: []
    };

    const isUpdate = await writeJsonConfig(mcpConfigPath, config, 'servers');
    isUpdate ? logUpdated('.vscode/mcp.json') : logCreated('.vscode/mcp.json');

    // Create skill file
    await createAntigravitySkill(projectPath);
}

/**
 * Create a skill file for Antigravity
 */
async function createAntigravitySkill(projectPath: string): Promise<void> {
    const skillsDir = path.join(projectPath, '.agent', 'skills', 'cashfree');
    const skillPath = path.join(skillsDir, 'SKILL.md');

    await ensureDir(skillsDir);

    const created = await writeTextFile(skillPath, getCashfreeSkillTemplate());
    if (created) {
        logCreated('.agent/skills/cashfree/SKILL.md');
    }
}
