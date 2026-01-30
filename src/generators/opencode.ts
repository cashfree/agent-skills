import path from 'path';
import { CASHFREE_MCP_CONFIG } from '../config.js';
import { ensureDir, writeJsonConfig, logCreated, logUpdated, writeTextFile } from './utils.js';
import { getCashfreeSkillTemplate } from '../templates/skills.js';

/**
 * Generate OpenCode MCP configuration
 * Creates or updates opencode.json with MCP server config
 */
export async function generateOpenCode(projectPath: string): Promise<void> {
    const configPath = path.join(projectPath, 'opencode.json');

    const config = {
        $schema: "https://opencode.ai/config.json",
        mcp: {
            [CASHFREE_MCP_CONFIG.name]: {
                type: 'http',
                url: CASHFREE_MCP_CONFIG.url
            }
        }
    };

    const isUpdate = await writeJsonConfig(configPath, config, 'mcp');
    isUpdate ? logUpdated('opencode.json') : logCreated('opencode.json');

    // Create skill file
    await createOpenCodeSkill(projectPath);
}

/**
 * Create a skill file for OpenCode
 */
async function createOpenCodeSkill(projectPath: string): Promise<void> {
    const skillsDir = path.join(projectPath, '.opencode', 'skills', 'cashfree');
    const skillPath = path.join(skillsDir, 'SKILL.md');

    await ensureDir(skillsDir);

    const created = await writeTextFile(skillPath, getCashfreeSkillTemplate());
    if (created) {
        logCreated('.opencode/skills/cashfree/SKILL.md');
    }
}