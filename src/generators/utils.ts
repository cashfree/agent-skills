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

const VERSION_KEY = 'cashfree-skills-version';
const NPM_REGISTRY_URL =
    'https://registry.npmjs.org/@cashfreepayments/agent-skills/latest';

/**
 * Fetches the latest published version from the npm registry.
 * Returns null on network/parse errors or non-2xx responses so callers
 * can gracefully fall back to the locally bundled version.
 */
export async function fetchLatestPublishedVersion(): Promise<string | null> {
    try {
        const res = await fetch(NPM_REGISTRY_URL, {
            signal: AbortSignal.timeout(2500),
            headers: { accept: 'application/json' },
        });
        if (!res.ok) return null;
        const json = (await res.json()) as { version?: string };
        return json.version ?? null;
    } catch {
        return null;
    }
}

/**
 * Compares two semver-ish strings. Returns:
 *   -1 if a < b, 0 if equal, 1 if a > b.
 * Falls back to string compare for non-numeric segments.
 */
export function compareVersions(a: string, b: string): number {
    const pa = a.split('.').map((s) => parseInt(s, 10));
    const pb = b.split('.').map((s) => parseInt(s, 10));
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
        const x = pa[i] ?? 0;
        const y = pb[i] ?? 0;
        if (Number.isNaN(x) || Number.isNaN(y)) {
            if (a === b) return 0;
            return a < b ? -1 : 1;
        }
        if (x !== y) return x < y ? -1 : 1;
    }
    return 0;
}

/**
 * Injects (or updates) a `cashfree-skills-version: <v>` line inside the
 * leading YAML frontmatter of a skill template. If the template lacks
 * frontmatter, the version is prepended as one.
 */
export function injectVersionMarker(content: string, version: string): string {
    const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!fmMatch) {
        return `---\n${VERSION_KEY}: ${version}\n---\n\n${content}`;
    }
    const fm = fmMatch[1];
    const re = new RegExp(`^${VERSION_KEY}:.*$`, 'm');
    const updatedFm = re.test(fm)
        ? fm.replace(re, `${VERSION_KEY}: ${version}`)
        : `${fm}\n${VERSION_KEY}: ${version}`;
    return content.replace(fmMatch[0], `---\n${updatedFm}\n---`);
}

/**
 * Reads the embedded skill version from a skill file's frontmatter.
 * Returns null if the file doesn't exist or has no version marker.
 */
export async function readInstalledSkillVersion(filePath: string): Promise<string | null> {
    if (!(await fs.pathExists(filePath))) return null;
    const raw = await fs.readFile(filePath, 'utf8');
    const m = raw.match(new RegExp(`^${VERSION_KEY}:\\s*(\\S+)`, 'm'));
    return m ? m[1] : null;
}

/**
 * Creates a skill file at {projectPath}/{skillsBasePath}/{skillDir}/{fileName}
 * fileName defaults to 'SKILL.md'. Embeds the CLI version as a marker so
 * subsequent runs can detect outdated installs.
 */
export async function createSkillFile(
    projectPath: string,
    skillsBasePath: string,
    skillDir: string,
    getTemplate: () => string,
    fileName = 'SKILL.md',
    version?: string,
    overwrite = false
): Promise<void> {
    const path = await import('path');
    const skillPath = path.join(projectPath, skillsBasePath, skillDir, fileName);
    const relativePath = path.join(skillsBasePath, skillDir, fileName);

    await ensureDir(path.dirname(skillPath));

    const rendered = version ? injectVersionMarker(getTemplate(), version) : getTemplate();
    const existed = await fs.pathExists(skillPath);
    const created = await writeTextFile(skillPath, rendered, overwrite);
    if (created) {
        logCreated(relativePath);
    } else if (existed && overwrite) {
        logUpdated(relativePath);
    } else {
        logSkipped(relativePath);
    }
}

/**
 * Ensures the given path is listed in the project's .gitignore.
 * - Creates .gitignore if it doesn't exist.
 * - Appends the entry if missing; preserves all existing content otherwise.
 * - Idempotent: skips if the exact entry is already present.
 */
export async function ensureGitignoreEntry(
    projectPath: string,
    entry: string
): Promise<void> {
    const path = await import('path');
    const gitignorePath = path.join(projectPath, '.gitignore');
    const normalized = entry.replace(/^\/+/, '').replace(/\/+$/, '') + '/';

    const exists = await fs.pathExists(gitignorePath);

    if (!exists) {
        await fs.writeFile(gitignorePath, normalized + '\n');
        return;
    }

    const existing = await fs.readFile(gitignorePath, 'utf8');
    const lines = existing.split(/\r?\n/).map((l) => l.trim());
    const candidates = new Set([
        normalized,
        normalized.replace(/\/$/, ''),
        '/' + normalized,
        '/' + normalized.replace(/\/$/, ''),
    ]);
    if (lines.some((l) => candidates.has(l))) {
        return;
    }

    const needsLeadingNewline = existing.length > 0 && !existing.endsWith('\n');
    await fs.appendFile(gitignorePath, (needsLeadingNewline ? '\n' : '') + normalized + '\n');
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
