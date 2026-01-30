import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { CASHFREE_MCP_CONFIG } from '../config.js';

export interface GeneratorResult {
    success: boolean;
    files: string[];
    message?: string;
}

/**
 * Base generator utilities
 */
export async function ensureDir(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
}

export async function writeJsonConfig(
    filePath: string,
    config: Record<string, unknown>,
    mergeKey?: string
): Promise<boolean> {
    const isUpdate = await fs.pathExists(filePath);

    if (isUpdate && mergeKey) {
        const existingConfig = await fs.readJson(filePath);
        existingConfig[mergeKey] = {
            ...existingConfig[mergeKey],
            ...(config as Record<string, Record<string, unknown>>)[mergeKey]
        };
        await fs.writeJson(filePath, existingConfig, { spaces: 2 });
    } else {
        await fs.writeJson(filePath, config, { spaces: 2 });
    }

    return isUpdate;
}

export async function writeTextFile(
    filePath: string,
    content: string,
    overwrite = false
): Promise<boolean> {
    const exists = await fs.pathExists(filePath);
    if (exists && !overwrite) {
        return false;
    }
    await fs.writeFile(filePath, content);
    return !exists;
}

export function logCreated(file: string): void {
    console.log(chalk.green(`  Created ${file}`));
}

export function logUpdated(file: string): void {
    console.log(chalk.yellow(`  Updated ${file}`));
}

/**
 * Get standard MCP server config object
 */
export function getMcpServerConfig(includeType = true): Record<string, unknown> {
    const config: Record<string, unknown> = {
        url: CASHFREE_MCP_CONFIG.url
    };
    if (includeType) {
        config.type = CASHFREE_MCP_CONFIG.transport;
    }
    return config;
}
