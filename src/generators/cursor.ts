import path from 'path';
import { CASHFREE_MCP_CONFIG } from '../config.js';
import { ensureDir, writeJsonConfig, logCreated, logUpdated, getMcpServerConfig, writeTextFile } from './utils.js';
import { getCashfreeSkillTemplate } from '../templates/skills.js';

/**
 * Generate Cursor MCP configuration
 * Creates .cursor/mcp.json in the project root
 */
export async function generateCursor(projectPath: string): Promise<void> {
    const cursorDir = path.join(projectPath, '.cursor');
    const mcpConfigPath = path.join(cursorDir, 'mcp.json');

    await ensureDir(cursorDir);

    const config = {
        mcpServers: {
            [CASHFREE_MCP_CONFIG.name]: getMcpServerConfig(false) // Cursor doesn't need type
        }
    };

    const isUpdate = await writeJsonConfig(mcpConfigPath, config, 'mcpServers');
    isUpdate ? logUpdated('.cursor/mcp.json') : logCreated('.cursor/mcp.json');

    // Create skill file
    await createCursorSkill(projectPath);
}

/**
 * Create a skill file for Cursor
 */
async function createCursorSkill(projectPath: string): Promise<void> {
    const skillsDir = path.join(projectPath, '.cursor', 'skills', 'cashfree');
    const skillPath = path.join(skillsDir, 'SKILL.md');

    await ensureDir(skillsDir);

    const created = await writeTextFile(skillPath, getCashfreeSkillTemplate());
    if (created) {
        logCreated('.cursor/skills/cashfree/SKILL.md');
    }
}
