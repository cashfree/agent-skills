import fs from 'fs-extra';
import chalk from 'chalk';

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

export async function createSkillFile(
    projectPath: string,
    baseDir: string,
    productName: string,
    getTemplate: () => string
): Promise<void> {
    const path = await import('path');
    const skillsDir = path.join(projectPath, baseDir, 'skills', 'cashfree');
    const skillPath = path.join(skillsDir, `${productName}.md`);

    await ensureDir(skillsDir);

    const created = await writeTextFile(skillPath, getTemplate());
    if (created) {
        const relativePath = path.join(baseDir, 'skills', 'cashfree', `${productName}.md`);
        logCreated(relativePath);
    }
}
