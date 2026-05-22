import path from "node:path";
import chalk from "chalk";
import { getSkillsBasePath, getManifestConfig, type Framework } from "./config.js";
import { generateManifestContent } from "./templates/manifest.js";
import {
    compareVersions,
    createManifestFile,
    createSkillFile,
    ensureGitignoreEntry,
    fetchLatestPublishedVersion,
    readInstalledSkillVersion,
} from "./generators/utils.js";
import { ALL_SKILLS } from "./skills.js";

export type InstalledState =
    | { state: "absent" }
    | { state: "legacy" }
    | { state: "versioned"; version: string };

/**
 * Inspects an existing installation by probing getting-started/SKILL.md.
 * Distinguishes three states:
 *   - { state: "absent" }            → nothing installed yet
 *   - { state: "legacy" }            → file exists, no version marker (pre-versioning install)
 *   - { state: "versioned", version} → file exists with an embedded version
 */
export async function detectInstalledState(
    projectPath: string,
    skillsBasePath: string,
): Promise<InstalledState> {
    const fs = await import("fs-extra");
    const probe = path.join(projectPath, skillsBasePath, "getting-started", "SKILL.md");
    if (!(await fs.default.pathExists(probe))) return { state: "absent" };
    const version = await readInstalledSkillVersion(probe);
    return version ? { state: "versioned", version } : { state: "legacy" };
}

/**
 * If a newer version is published on npm, transparently re-launches the
 * CLI via `npx @cashfreepayments/agent-skills@<latest>` with the same
 * arguments. The current process exits when the child exits, so callers
 * after this should not run when an upgrade happens. The recursion is
 * guarded by an env var so the upgraded child doesn't re-check.
 */
export async function autoUpgradeIfStale(cliVersion: string): Promise<void> {
    if (process.env.CASHFREE_SKILLS_UPGRADED === "1") return;
    const latest = await fetchLatestPublishedVersion();
    if (!latest || compareVersions(latest, cliVersion) <= 0) return;

    console.log(
        chalk.yellow(
            `\n⬆ Newer version on npm (v${cliVersion} → v${latest}); upgrading and re-running...`,
        ),
    );

    const { spawn } = await import("node:child_process");
    await new Promise<void>((resolve) => {
        const child = spawn(
            "npx",
            ["-y", `@cashfreepayments/agent-skills@${latest}`, ...process.argv.slice(2)],
            {
                stdio: "inherit",
                env: { ...process.env, CASHFREE_SKILLS_UPGRADED: "1" },
                shell: process.platform === "win32",
            },
        );
        child.on("exit", (code) => process.exit(code ?? 0));
        child.on("error", () => {
            console.log(
                chalk.dim("   Failed to spawn npx; continuing with the locally installed version."),
            );
            resolve();
        });
    });
}

export async function installSkillsForFramework(
    framework: Framework,
    projectPath: string,
    cliVersion: string,
    overwrite: boolean,
): Promise<void> {
    const skillsBasePath = getSkillsBasePath(framework);
    const manifestConfig = getManifestConfig(framework);

    for (const { dir, fileName, getTemplate } of ALL_SKILLS) {
        await createSkillFile(
            projectPath,
            skillsBasePath,
            dir,
            getTemplate,
            fileName,
            cliVersion,
            overwrite,
        );
    }

    const manifestContent = generateManifestContent(skillsBasePath, manifestConfig.format);
    await createManifestFile(projectPath, manifestConfig.path, manifestContent);
    await ensureGitignoreEntry(projectPath, skillsBasePath);
}
