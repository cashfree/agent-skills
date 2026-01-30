import path from 'path';
import { CASHFREE_MCP_CONFIG } from '../config.js';
import { ensureDir, writeJsonConfig, logCreated, logUpdated, getMcpServerConfig, writeTextFile } from './utils.js';
import { getCashfreeSkillTemplate } from '../templates/skills.js';

/**
 * Generate VS Code Copilot MCP configuration
 * Creates .vscode/mcp.json
 */
export async function generateVSCodeCopilot(projectPath: string): Promise<void> {
    const vscodeDir = path.join(projectPath, '.vscode');
    const mcpConfigPath = path.join(vscodeDir, 'mcp.json');

    await ensureDir(vscodeDir);

    // VS Code uses 'servers' instead of 'mcpServers'
    const config = {
        servers: {
            [CASHFREE_MCP_CONFIG.name]: getMcpServerConfig(true)
        }
    };

    const isUpdate = await writeJsonConfig(mcpConfigPath, config, 'servers');
    isUpdate ? logUpdated('.vscode/mcp.json') : logCreated('.vscode/mcp.json');

    // Create skill file
    await createVsCodeCopilotSkill(projectPath);
}

/**
 * Create a skill file for VS Code Copilot
 */
async function createVsCodeCopilotSkill(projectPath: string): Promise<void> {
    const skillsDir = path.join(projectPath, '.github', 'skills', 'cashfree');
    const skillPath = path.join(skillsDir, 'SKILL.md');

    await ensureDir(skillsDir);

    const created = await writeTextFile(skillPath, getCashfreeSkillTemplate());
    if (created) {
        logCreated('.github/skills/cashfree/SKILL.md');
    }
}