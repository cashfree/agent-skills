import path from 'path';
import { CASHFREE_MCP_CONFIG } from '../config.js';
import { ensureDir, writeJsonConfig, logCreated, logUpdated, getMcpServerConfig, writeTextFile } from './utils.js';
import { getCashfreeSkillTemplate } from '../templates/skills.js';

/**
 * Generate GitHub Copilot CLI configuration
 * Creates .github/copilot/mcp.json
 */
export async function generateCopilotCLI(projectPath: string): Promise<void> {
    const copilotDir = path.join(projectPath, '.github');
    const mcpConfigPath = path.join(copilotDir, 'mcp.json');

    await ensureDir(copilotDir);

    const config = {
        servers: {
            [CASHFREE_MCP_CONFIG.name]: getMcpServerConfig(true)
        }
    };

    const isUpdate = await writeJsonConfig(mcpConfigPath, config, 'servers');
    isUpdate ? logUpdated('.github/copilot/mcp.json') : logCreated('.github/mcp.json');

    // Create skill file
    await createCopilotCliSkill(projectPath);
}

/**
 * Create a skill file for GitHub Copilot CLI
 */
async function createCopilotCliSkill(projectPath: string): Promise<void> {
    const skillsDir = path.join(projectPath, '.github', 'skills', 'cashfree');
    const skillPath = path.join(skillsDir, 'SKILL.md');

    await ensureDir(skillsDir);

    const created = await writeTextFile(skillPath, getCashfreeSkillTemplate());
    if (created) {
        logCreated('.github/skills/cashfree/SKILL.md');
    }
}
