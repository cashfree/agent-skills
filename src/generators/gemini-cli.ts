import path from 'path';
import { CASHFREE_MCP_CONFIG } from '../config.js';
import { ensureDir, writeJsonConfig, logCreated, logUpdated, getMcpServerConfig, writeTextFile } from './utils.js';
import { getCashfreeSkillTemplate } from '../templates/skills.js';

/**
 * Generate Gemini CLI MCP configuration
 * Creates .gemini/settings.json with MCP server config
 */
export async function generateGeminiCLI(projectPath: string): Promise<void> {
    const geminiDir = path.join(projectPath, '.gemini');
    const settingsPath = path.join(geminiDir, 'settings.json');

    await ensureDir(geminiDir);

    const config = {
        $schema: "https://raw.githubusercontent.com/google-gemini/gemini-cli/main/schemas/settings.schema.json",
        mcpServers: {
            [CASHFREE_MCP_CONFIG.name]: getMcpServerConfig(false)
        }
    };

    const isUpdate = await writeJsonConfig(settingsPath, config, 'mcpServers');
    isUpdate ? logUpdated('.gemini/settings.json') : logCreated('.gemini/settings.json');

    // Create skill file
    await createGeminiCliSkill(projectPath);
}

/**
 * Create a skill file for Gemini CLI
 */
async function createGeminiCliSkill(projectPath: string): Promise<void> {
    const skillsDir = path.join(projectPath, '.gemini', 'skills', 'cashfree');
    const skillPath = path.join(skillsDir, 'SKILL.md');

    await ensureDir(skillsDir);

    const created = await writeTextFile(skillPath, getCashfreeSkillTemplate());
    if (created) {
        logCreated('.gemini/skills/cashfree/SKILL.md');
    }
}
