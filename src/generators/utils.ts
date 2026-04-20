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

export function logSkipped(file: string): void {
    console.log(chalk.dim(`  Skipped ${file} (already exists)`));
}

/**
 * Creates a skill file at {projectPath}/{skillsBasePath}/{skillDir}/{fileName}
 * fileName defaults to 'SKILL.md'
 */
export async function createSkillFile(
    projectPath: string,
    skillsBasePath: string,
    skillDir: string,
    getTemplate: () => string,
    fileName = 'SKILL.md'
): Promise<void> {
    const path = await import('path');
    const skillPath = path.join(projectPath, skillsBasePath, skillDir, fileName);
    const relativePath = path.join(skillsBasePath, skillDir, fileName);

    await ensureDir(path.dirname(skillPath));

    const created = await writeTextFile(skillPath, getTemplate());
    if (created) {
        logCreated(relativePath);
    } else {
        logSkipped(relativePath);
    }
}

/**
 * Creates or appends the Cashfree manifest to the framework's manifest file.
 * If the file already contains Cashfree config, it skips.
 * If the file exists but has no Cashfree config, it appends.
 * If the file doesn't exist, it creates it.
 */
export async function createManifestFile(
    projectPath: string,
    manifestPath: string,
    content: string
): Promise<void> {
    const path = await import('path');
    const fullPath = path.join(projectPath, manifestPath);

    await ensureDir(path.dirname(fullPath));

    const exists = await fs.pathExists(fullPath);

    if (exists) {
        const existing = await fs.readFile(fullPath, 'utf8');
        if (existing.includes('Cashfree Payments')) {
            logSkipped(manifestPath + ' (Cashfree already configured)');
            return;
        }
        // Append Cashfree section to existing manifest with a separator
        await fs.appendFile(fullPath, '\n\n---\n\n' + content);
        logUpdated(manifestPath);
    } else {
        await fs.writeFile(fullPath, content);
        logCreated(manifestPath);
    }
}
