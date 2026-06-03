#!/usr/bin/env node
import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import path from "path";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
    FRAMEWORKS,
    type Framework,
    getSkillsBasePath,
    getManifestConfig,
} from "./config.js";
import { generateManifestContent } from "./templates/manifest.js";
import { createManifestFile, ensureGitignoreEntry } from "./generators/utils.js";
import {
    autoUpgradeIfStale,
    detectInstalledState,
    installSkillsForFramework,
} from "./install.js";
import {
    collectOptionValues,
    findSimilar,
    getFrameworkName,
    VALID_ADD_TYPES,
} from "./cli-utils.js";
import { printBanner, printHelp, printInstallSuccess } from "./cli-ui.js";
import {
    createFrameworkFailedEvent,
    createFrameworkSelectedEvents,
    createFrameworkSucceededEvent,
    createInstallCompletedEvent,
    createInstallStartedEvent,
    createProgressFeedbackSubmittedEvent,
    createTelemetryDistinctId,
    isTelemetryEnabled,
    sendTelemetryEvents,
    type InstallTelemetryEvent,
    type ProgressFeedbackTelemetryInput,
    type SelectionMode,
} from "./telemetry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
    readFileSync(path.join(__dirname, "..", "package.json"), "utf-8"),
);

const program = new Command();
program.showSuggestionAfterError(true);
program.showHelpAfterError("(run with --help for available commands)");

program
    .name("cashfree")
    .description("CLI to add Cashfree Payments skills to AI coding assistants")
    .version(pkg.version);

program
    .command("add")
    .argument("<type>", "What to add (skills)")
    .description("Add all Cashfree Payments skill files to your project")
    .option("-p, --path <path>", "Project path", process.cwd())
    .option("-f, --frameworks <frameworks>", "Comma-separated list of frameworks")
    .action(async (type, options) => {
        if (!VALID_ADD_TYPES.includes(type as (typeof VALID_ADD_TYPES)[number])) {
            console.error(chalk.red(`\n❌ Unknown type '${type}'.`));
            const suggestion = findSimilar(type, VALID_ADD_TYPES);
            if (suggestion) {
                console.error(
                    chalk.yellow(`   Did you mean: `) +
                        chalk.bold.green(`npx @cashfreepayments/agent-skills@latest add ${suggestion}`) +
                        chalk.yellow(`?`),
                );
            }
            console.error(chalk.dim(`\nValid types: ${VALID_ADD_TYPES.join(", ")}`));
            console.error(chalk.dim(`Example:     npx @cashfreepayments/agent-skills@latest add skills\n`));
            process.exit(1);
        }

        await autoUpgradeIfStale(pkg.version);
        printBanner();

        let selectedFrameworks: Framework[];

        if (options.frameworks) {
            const validValues = FRAMEWORKS.map((f) => f.value);
            const requested = options.frameworks
                .split(",")
                .map((f: string) => f.trim())
                .filter(Boolean);
            const invalid = requested.filter((f: string) => !validValues.includes(f as Framework));

            if (invalid.length > 0) {
                console.log(chalk.red(`\n❌ Invalid framework name(s): ${invalid.join(", ")}\n`));
                console.log(chalk.yellow("Valid frameworks:"));
                for (const f of FRAMEWORKS) {
                    console.log(chalk.dim(`  • ${f.value.padEnd(18)} (${f.name})`));
                }
                console.log("");
                process.exit(1);
            }
            selectedFrameworks = requested as Framework[];
        } else {
            const answers = await inquirer.prompt([
                {
                    type: "checkbox",
                    name: "frameworks",
                    message: "Select AI coding assistants to configure:",
                    choices: FRAMEWORKS.map((f) => ({
                        name: f.name,
                        value: f.value,
                        checked: false,
                    })),
                    validate: (input: string[]) =>
                        input.length === 0 ? "Please select at least one framework." : true,
                    pageSize: 10,
                },
            ]);
            selectedFrameworks = answers.frameworks;
        }

        const projectPath = path.resolve(options.path);
        const telemetryDistinctId = createTelemetryDistinctId();
        const selectionMode: SelectionMode = options.frameworks ? "flag" : "interactive";
        const telemetryContext = {
            distinctId: telemetryDistinctId,
            cliVersion: pkg.version,
            selectionMode,
            selectedFrameworks,
        };
        const telemetryEvents: InstallTelemetryEvent[] = [
            createInstallStartedEvent(telemetryContext),
            ...createFrameworkSelectedEvents(telemetryContext),
        ];
        const succeededFrameworks: Framework[] = [];
        const failedFrameworks: Framework[] = [];

        console.log(chalk.dim(`\nProject path: ${projectPath}\n`));

        for (const framework of selectedFrameworks) {
            const frameworkName = getFrameworkName(framework);
            const skillsBasePath = getSkillsBasePath(framework);
            const manifestConfig = getManifestConfig(framework);

            console.log(chalk.blue(`\n📦 Configuring ${frameworkName}...`));
            console.log(chalk.dim(`   Skills: ${skillsBasePath}/`));
            console.log(chalk.dim(`   Manifest: ${manifestConfig.path}`));

            try {
                const installed = await detectInstalledState(projectPath, skillsBasePath);
                let overwrite = false;
                let skipFiles = false;

                if (installed.state === "versioned" && installed.version === pkg.version) {
                    console.log(chalk.green(`   ✓ Skills already up to date (v${pkg.version})`));
                    skipFiles = true;
                } else if (installed.state === "versioned") {
                    console.log(
                        chalk.yellow(`   ⬆ Updating skills v${installed.version} → v${pkg.version}`),
                    );
                    overwrite = true;
                } else if (installed.state === "legacy") {
                    console.log(chalk.yellow(`   ⬆ Updating legacy skills install → v${pkg.version}`));
                    overwrite = true;
                }

                if (!skipFiles) {
                    await installSkillsForFramework(framework, projectPath, pkg.version, overwrite);
                } else {
                    const manifestContent = generateManifestContent(skillsBasePath, manifestConfig.format);
                    await createManifestFile(projectPath, manifestConfig.path, manifestContent);
                    await ensureGitignoreEntry(projectPath, skillsBasePath);
                }

                succeededFrameworks.push(framework);
                telemetryEvents.push(createFrameworkSucceededEvent(telemetryContext, framework));
            } catch (error) {
                failedFrameworks.push(framework);
                telemetryEvents.push(createFrameworkFailedEvent(telemetryContext, framework, error));
                console.log(
                    chalk.red(`  Error: ${error instanceof Error ? error.message : "Unknown error"}`),
                );
            }
        }

        telemetryEvents.push(
            createInstallCompletedEvent(telemetryContext, succeededFrameworks, failedFrameworks),
        );
        await sendTelemetryEvents(telemetryEvents);

        printInstallSuccess();
    });

program
    .command("update")
    .description("Force-update all installed Cashfree skill files to the latest version")
    .option("-p, --path <path>", "Project path", process.cwd())
    .option("-f, --frameworks <frameworks>", "Comma-separated frameworks to update (defaults to auto-detect)")
    .action(async (options) => {
        await autoUpgradeIfStale(pkg.version);

        const projectPath = path.resolve(options.path);

        let targetFrameworks: Framework[];
        if (options.frameworks) {
            const validValues = FRAMEWORKS.map((f) => f.value);
            const requested = options.frameworks
                .split(",")
                .map((f: string) => f.trim())
                .filter(Boolean);
            const invalid = requested.filter((f: string) => !validValues.includes(f as Framework));
            if (invalid.length > 0) {
                console.log(chalk.red(`\n❌ Invalid framework name(s): ${invalid.join(", ")}\n`));
                process.exit(1);
            }
            targetFrameworks = requested as Framework[];
        } else {
            const detected: Framework[] = [];
            for (const f of FRAMEWORKS) {
                const s = await detectInstalledState(projectPath, getSkillsBasePath(f.value));
                if (s.state !== "absent") detected.push(f.value);
            }
            if (detected.length === 0) {
                console.log(chalk.yellow("\nNo installed Cashfree skills detected in this project."));
                console.log(chalk.dim("Run `npx @cashfreepayments/agent-skills add skills` first.\n"));
                return;
            }
            targetFrameworks = detected;
        }

        console.log(chalk.bold.cyan(`\n⚡ Updating Cashfree skills to v${pkg.version}\n`));
        console.log(chalk.dim(`Project path: ${projectPath}\n`));

        for (const framework of targetFrameworks) {
            const frameworkName = getFrameworkName(framework);
            const skillsBasePath = getSkillsBasePath(framework);
            console.log(chalk.blue(`\n📦 ${frameworkName}`));
            console.log(chalk.dim(`   Skills: ${skillsBasePath}/`));

            const installed = await detectInstalledState(projectPath, skillsBasePath);
            if (installed.state === "versioned" && installed.version === pkg.version) {
                console.log(chalk.green(`   ✓ Already up to date (v${pkg.version})`));
                continue;
            }
            if (installed.state === "versioned") {
                console.log(chalk.yellow(`   v${installed.version} → v${pkg.version}`));
            } else if (installed.state === "legacy") {
                console.log(chalk.yellow(`   legacy install → v${pkg.version}`));
            }

            try {
                await installSkillsForFramework(framework, projectPath, pkg.version, true);
            } catch (error) {
                console.log(
                    chalk.red(`  Error: ${error instanceof Error ? error.message : "Unknown error"}`),
                );
            }
        }

        console.log(chalk.bold.green(`\n✅ Update complete.\n`));
    });

program
    .command("help")
    .description("Show example prompts to give your AI assistant after installation")
    .action(() => printHelp());

program
    .command("start-integration")
    .description("Report the start of a Cashfree integration session and mint its correlation ID for timing metrics")
    .requiredOption("--flow <flow>", "Integration flow or product area, e.g. pg, subscriptions, payouts")
    .requiredOption("--framework <framework>", "LLM framework/identity starting this integration (e.g. claude-code, opencode)")
    .option("--correlation-id <id>", "Correlation ID for this integration session. Minted and printed if omitted.")
    .option("--app-id <appId>", "Cashfree App ID (x-client-id), if already known")
    .option("--skill <skill>", "Skill that triggered the integration. Repeat for multiple skills.", collectOptionValues, [])
    .action(async (options: {
        flow: string;
        framework: string;
        correlationId?: string;
        appId?: string;
        skill: string[];
    }) => {
        const validFrameworks = FRAMEWORKS.map((f) => f.value);
        const framework = options.framework.trim().toLowerCase();
        if (!validFrameworks.includes(framework as any)) {
            console.error(`Error: --framework must be one of: ${validFrameworks.join(", ")}`);
            process.exitCode = 1;
            return;
        }

        const flow = options.flow.trim();
        if (!flow) {
            console.error('Error: --flow is required and cannot be empty.');
            process.exitCode = 1;
            return;
        }

        const correlationId = options.correlationId?.trim() || randomUUID();
        const appId = options.appId?.trim() || undefined;

        const payload: ProgressFeedbackTelemetryInput = {
            cliVersion: pkg.version,
            flow,
            skillsUsed: options.skill.map((s) => s.trim()).filter(Boolean),
            completedSteps: [],
            pendingSteps: [],
            llmFeedback: `integration started [Framework: ${framework}] [cid:${correlationId}]`,
            appId,
        };

        const event = createProgressFeedbackSubmittedEvent(payload);
        await sendTelemetryEvents([event]);

        console.log(JSON.stringify({
            ok: true,
            submitted: isTelemetryEnabled(),
            event: event.event,
            correlation_id: correlationId,
            flow,
            app_id_captured: Boolean(appId),
        }));
    });

program
    .command("report-progress-feedback")
    .description("Submit end-of-task progress and skill-improvement feedback telemetry")
    .requiredOption("--flow <flow>", "Integration flow or product area, e.g. pg, subscriptions, payouts")
    .option("--skill <skill>", "Skill used during the workflow. Repeat for multiple skills.", collectOptionValues, [])
    .option("--completed-step <step>", "Completed step. Repeat for multiple steps.", collectOptionValues, [])
    .option("--pending-step <step>", "Pending step. Repeat for multiple steps.", collectOptionValues, [])
    .requiredOption("--feedback <feedback>", "LLM's honest feedback on what could be improved in the skill(s)")
    .requiredOption("--framework <framework>", "LLM framework/identity submitting this feedback (e.g. claude-code, opencode)")
    .option("--app-id <appId>", "Cashfree App ID (x-client-id) seen in the integration, if available")
    .option("--correlation-id <id>", "Correlation ID minted at integration start (start-integration). Required for timing metrics; auto-generated with an 'auto-' prefix only as a legacy fallback.")
    .option("--silent", "Suppress JSON output")
    .action(async (options: {
        flow: string;
        skill: string[];
        completedStep: string[];
        pendingStep: string[];
        feedback: string;
        framework: string;
        appId?: string;
        correlationId?: string;
        silent?: boolean;
    }) => {
        const validFrameworks = FRAMEWORKS.map((f) => f.value);
        const framework = options.framework.trim().toLowerCase();
        if (!validFrameworks.includes(framework as any)) {
            console.error(`Error: --framework must be one of: ${validFrameworks.join(", ")}`);
            process.exitCode = 1;
            return;
        }

        const trimmedFeedback = options.feedback.trim();
        if (!trimmedFeedback) {
            console.error('Error: --feedback is required and cannot be empty.');
            process.exitCode = 1;
            return;
        }

        // The correlation ID pairs this end-of-task report with its start-integration
        // event so integration duration can be computed. Skills always pass it; the
        // 'auto-' fallback only exists so pre-correlation installs keep reporting.
        const correlationId = options.correlationId?.trim() || `auto-${randomUUID()}`;

        const payload: ProgressFeedbackTelemetryInput = {
            cliVersion: pkg.version,
            flow: options.flow.trim(),
            skillsUsed: options.skill.map((s) => s.trim()).filter(Boolean),
            completedSteps: options.completedStep.map((s) => s.trim()).filter(Boolean),
            pendingSteps: options.pendingStep.map((s) => s.trim()).filter(Boolean),
            llmFeedback: `${trimmedFeedback} [Framework: ${framework}] [cid:${correlationId}]`,
            appId: options.appId?.trim(),
        };

        if (!payload.flow) {
            console.error('Error: --flow is required and cannot be empty.');
            process.exitCode = 1;
            return;
        }

        if (!payload.skillsUsed.length) {
            console.error('Error: at least one --skill value is required.');
            process.exitCode = 1;
            return;
        }

        const event = createProgressFeedbackSubmittedEvent(payload);
        await sendTelemetryEvents([event]);

        if (!options.silent) {
            console.log(JSON.stringify({
                ok: true,
                submitted: isTelemetryEnabled(),
                event: event.event,
                correlation_id: correlationId,
                flow: payload.flow,
                skills_used_count: payload.skillsUsed.length,
                completed_steps_count: payload.completedSteps.length,
                pending_steps_count: payload.pendingSteps.length,
            }));
        }
    });

function handleSignal(signal: string) {
    console.log(chalk.yellow(`\n\nReceived ${signal}. Exiting gracefully...`));
    process.exit(0);
}

process.on("SIGINT", () => handleSignal("SIGINT"));
process.on("SIGTERM", () => handleSignal("SIGTERM"));

/**
 * Pre-parse argv to catch the case where a user invokes a typo of an "add" type
 * directly at the top level (e.g. `cashfree skils` or `cashfree skills`).
 * Commander's built-in suggestion only matches top-level command names, not
 * positional argument values — so we hint with the full corrected form.
 */
function suggestForUnknownTopLevel(): void {
    const firstArg = process.argv[2];
    if (!firstArg || firstArg.startsWith("-")) return;
    const knownCommands = program.commands.map((c) => c.name());
    if (knownCommands.includes(firstArg)) return;

    const closeToType = findSimilar(firstArg, VALID_ADD_TYPES, 2);
    if (closeToType) {
        console.error(chalk.red(`\n❌ Unknown command '${firstArg}'.`));
        console.error(
            chalk.yellow(`   Did you mean: `) +
                chalk.bold.green(`npx @cashfreepayments/agent-skills@latest add ${closeToType}`) +
                chalk.yellow(`?`),
        );
        console.error(chalk.dim(`\n(run with --help for available commands)\n`));
        process.exit(1);
    }
}

suggestForUnknownTopLevel();
program.parse();
