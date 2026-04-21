#!/usr/bin/env node
import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import path from "path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
    FRAMEWORKS,
    type Framework,
    getSkillsBasePath,
    getManifestConfig,
} from "./config.js";
import { getGettingStartedSkillTemplate } from "./templates/getting-started.js";
import { getPaymentModesSkillTemplate } from "./templates/payment-modes.js";
import { getPGOverviewSkillTemplate } from "./templates/pg-overview.js";
import {
    getPGApiSkillTemplate,
    getPGApiReferenceTemplate,
    getPGSdkSkillTemplate,
    getPGSdkReferenceTemplate,
    getPGMobileSkillTemplate,
    getPGMobileReferenceTemplate,
    getPGWebhooksSkillTemplate,
    getPGWebhooksReferenceTemplate,
    getPGGoLiveSkillTemplate,
    getPGGoLiveReferenceTemplate,
    getPGRefundsSkillTemplate,
    getPGRefundsReferenceTemplate,
    getPGDisputesSkillTemplate,
    getPGDisputesReferenceTemplate,
    getPGPaymentLinksSkillTemplate,
    getPGPaymentLinksReferenceTemplate,
    getPGTokenVaultSkillTemplate,
    getPGTokenVaultReferenceTemplate,
    getPGWebSdkSkillTemplate,
    getPGWebSdkReferenceTemplate,
    getPGEasySplitSkillTemplate,
    getPGEasySplitReferenceTemplate,
    getPGOffersSkillTemplate,
    getPGOffersReferenceTemplate,
} from "./templates/pg.js";
import { getSecureIdSkillTemplate, getSecureIdReferenceTemplate } from "./templates/secure-id.js";
import { getSubscriptionsSkillTemplate, getSubscriptionsReferenceTemplate } from "./templates/subscriptions.js";
import { getCrossBorderSkillTemplate, getCrossBorderReferenceTemplate } from "./templates/crossBorder.js";
import { getPayoutsSkillTemplate, getPayoutsReferenceTemplate } from "./templates/payouts.js";
import { getValidationAndTestingSkillTemplate } from "./templates/validation-and-testing.js";
import { getCommonMistakesSkillTemplate } from "./templates/common-mistakes.js";
import { getProgressAndSkillFeedbackSkillTemplate } from "./templates/progress-and-skill-feedback.js";
import {
    getMigrateFromRazorpaySkillTemplate,
    getMigrateFromRazorpayReferenceTemplate,
} from "./templates/migrate-from-razorpay.js";
import {
    getMigrateFromJuspaySkillTemplate,
    getMigrateFromJuspayReferenceTemplate,
} from "./templates/migrate-from-juspay.js";
import {
    getSettlementsSkillTemplate,
    getSettlementsReferenceTemplate,
} from "./templates/settlements-and-reconciliation.js";
import {
    getAutoCollectSkillTemplate,
    getAutoCollectReferenceTemplate,
} from "./templates/auto-collect.js";
import { generateManifestContent } from "./templates/manifest.js";
import { createSkillFile, createManifestFile } from "./generators/utils.js";
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

program
    .name("cashfree")
    .description("CLI to add Cashfree Payments skills to AI coding assistants")
    .version(pkg.version);

type Skill = { dir: string; fileName?: string; getTemplate: () => string };

/**
 * All skill files in order — each creates {dir}/SKILL.md:
 * 1. Getting Started (setup, auth, environment)
 * 2. Eligible Payment Modes (check what's enabled for the merchant)
 * 3. PG overview + sub-skills (APIs, SDKs, Mobile, Webhooks)
 * 4. Other products (Secure ID, Subscriptions, Cross Border, Payouts)
 * 5. Validation & Testing (post-integration checks)
 */
const ALL_SKILLS: Skill[] = [
    // --- Start: onboarding & setup ---
    { dir: "getting-started", getTemplate: getGettingStartedSkillTemplate },
    { dir: "eligible-payment-modes", getTemplate: getPaymentModesSkillTemplate },

    // --- Middle: product-specific skills ---
    { dir: "pg", getTemplate: getPGOverviewSkillTemplate },
    { dir: "pg/apis", getTemplate: getPGApiSkillTemplate },
    { dir: "pg/apis/references", fileName: "REFERENCE.md", getTemplate: getPGApiReferenceTemplate },
    { dir: "pg/backend-sdks", getTemplate: getPGSdkSkillTemplate },
    { dir: "pg/backend-sdks/references", fileName: "REFERENCE.md", getTemplate: getPGSdkReferenceTemplate },
    { dir: "pg/mobile-sdks", getTemplate: getPGMobileSkillTemplate },
    { dir: "pg/mobile-sdks/references", fileName: "REFERENCE.md", getTemplate: getPGMobileReferenceTemplate },
    { dir: "pg/webhooks", getTemplate: getPGWebhooksSkillTemplate },
    { dir: "pg/webhooks/references", fileName: "REFERENCE.md", getTemplate: getPGWebhooksReferenceTemplate },
    { dir: "pg/go-live", getTemplate: getPGGoLiveSkillTemplate },
    { dir: "pg/go-live/references", fileName: "REFERENCE.md", getTemplate: getPGGoLiveReferenceTemplate },
    { dir: "pg/refunds", getTemplate: getPGRefundsSkillTemplate },
    { dir: "pg/refunds/references", fileName: "REFERENCE.md", getTemplate: getPGRefundsReferenceTemplate },
    { dir: "pg/disputes", getTemplate: getPGDisputesSkillTemplate },
    { dir: "pg/disputes/references", fileName: "REFERENCE.md", getTemplate: getPGDisputesReferenceTemplate },
    { dir: "pg/payment-links", getTemplate: getPGPaymentLinksSkillTemplate },
    { dir: "pg/payment-links/references", fileName: "REFERENCE.md", getTemplate: getPGPaymentLinksReferenceTemplate },
    { dir: "pg/token-vault", getTemplate: getPGTokenVaultSkillTemplate },
    { dir: "pg/token-vault/references", fileName: "REFERENCE.md", getTemplate: getPGTokenVaultReferenceTemplate },
    { dir: "pg/web-sdk", getTemplate: getPGWebSdkSkillTemplate },
    { dir: "pg/web-sdk/references", fileName: "REFERENCE.md", getTemplate: getPGWebSdkReferenceTemplate },
    { dir: "pg/easy-split", getTemplate: getPGEasySplitSkillTemplate },
    { dir: "pg/easy-split/references", fileName: "REFERENCE.md", getTemplate: getPGEasySplitReferenceTemplate },
    { dir: "pg/offers", getTemplate: getPGOffersSkillTemplate },
    { dir: "pg/offers/references", fileName: "REFERENCE.md", getTemplate: getPGOffersReferenceTemplate },
    { dir: "secure-id", getTemplate: getSecureIdSkillTemplate },
    { dir: "secure-id/references", fileName: "REFERENCE.md", getTemplate: getSecureIdReferenceTemplate },
    { dir: "subscriptions", getTemplate: getSubscriptionsSkillTemplate },
    { dir: "subscriptions/references", fileName: "REFERENCE.md", getTemplate: getSubscriptionsReferenceTemplate },
    { dir: "cross-border", getTemplate: getCrossBorderSkillTemplate },
    { dir: "cross-border/references", fileName: "REFERENCE.md", getTemplate: getCrossBorderReferenceTemplate },
    { dir: "payouts", getTemplate: getPayoutsSkillTemplate },
    { dir: "payouts/references", fileName: "REFERENCE.md", getTemplate: getPayoutsReferenceTemplate },
    { dir: "settlements-and-reconciliation", getTemplate: getSettlementsSkillTemplate },
    { dir: "settlements-and-reconciliation/references", fileName: "REFERENCE.md", getTemplate: getSettlementsReferenceTemplate },
    { dir: "auto-collect", getTemplate: getAutoCollectSkillTemplate },
    { dir: "auto-collect/references", fileName: "REFERENCE.md", getTemplate: getAutoCollectReferenceTemplate },

    // --- Migration skills (switching from another PG) ---
    { dir: "migrate-from-razorpay", getTemplate: getMigrateFromRazorpaySkillTemplate },
    { dir: "migrate-from-razorpay/references", fileName: "REFERENCE.md", getTemplate: getMigrateFromRazorpayReferenceTemplate },
    { dir: "migrate-from-juspay", getTemplate: getMigrateFromJuspaySkillTemplate },
    { dir: "migrate-from-juspay/references", fileName: "REFERENCE.md", getTemplate: getMigrateFromJuspayReferenceTemplate },
    { dir: "progress-and-skill-feedback", getTemplate: getProgressAndSkillFeedbackSkillTemplate },

    // --- End: validation, testing & troubleshooting ---
    { dir: "validation-and-testing", getTemplate: getValidationAndTestingSkillTemplate },
    { dir: "common-mistakes", getTemplate: getCommonMistakesSkillTemplate },
];

function collectOptionValues(value: string, previous: string[]): string[] {
    previous.push(value);
    return previous;
}

program
    .command("add")
    .argument("<type>", "What to add (skills)")
    .description("Add all Cashfree Payments skill files to your project")
    .option("-p, --path <path>", "Project path", process.cwd())
    .option(
        "-f, --frameworks <frameworks>",
        "Comma-separated list of frameworks",
    )
    .action(async (_type, options) => {
        // Amazing branding banner
        console.log("\n");
        console.log(
            chalk.bold.hex("#10b981")(
                "   ██████╗ █████╗ ███████╗██╗  ██╗███████╗██████╗ ███████╗███████╗",
            ),
        );
        console.log(
            chalk.bold.hex("#10b981")(
                "  ██╔════╝██╔══██╗██╔════╝██║  ██║██╔════╝██╔══██╗██╔════╝██╔════╝",
            ),
        );
        console.log(
            chalk.bold.hex("#10b981")(
                "  ██║     ███████║███████╗███████║█████╗  ██████╔╝█████╗  █████╗  ",
            ),
        );
        console.log(
            chalk.bold.hex("#10b981")(
                "  ██║     ██╔══██║╚════██║██╔══██║██╔══╝  ██╔══██╗██╔══╝  ██╔══╝  ",
            ),
        );
        console.log(
            chalk.bold.hex("#10b981")(
                "  ╚██████╗██║  ██║███████║██║  ██║██║     ██║  ██║███████╗███████╗",
            ),
        );
        console.log(
            chalk.bold.hex("#10b981")(
                "   ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝",
            ),
        );
        console.log(
            chalk.bold.hex("#f59e0b")(
                "  ██████╗  █████╗ ██╗   ██╗███╗   ███╗███████╗███╗   ██╗████████╗███████╗",
            ),
        );
        console.log(
            chalk.bold.hex("#f59e0b")(
                "  ██╔══██╗██╔══██╗╚██╗ ██╔╝████╗ ████║██╔════╝████╗  ██║╚══██╔══╝██╔════╝",
            ),
        );
        console.log(
            chalk.bold.hex("#f59e0b")(
                "  ██████╔╝███████║ ╚████╔╝ ██╔████╔██║█████╗  ██╔██╗ ██║   ██║   ███████╗",
            ),
        );
        console.log(
            chalk.bold.hex("#f59e0b")(
                "  ██╔═══╝ ██╔══██║  ╚██╔╝  ██║╚██╔╝██║██╔══╝  ██║╚██╗██║   ██║   ╚════██║",
            ),
        );
        console.log(
            chalk.bold.hex("#f59e0b")(
                "  ██║     ██║  ██║   ██║   ██║ ╚═╝ ██║███████╗██║ ╚████║   ██║   ███████║",
            ),
        );
        console.log(
            chalk.bold.hex("#f59e0b")(
                "  ╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝",
            ),
        );
        console.log("\n");
        console.log(
            chalk.bold.cyan(
                "  🎯 Agent Skills Setup - Add Cashfree Payments Integration Knowledge to AI Assistants\n",
            ),
        );

        let selectedFrameworks: Framework[];

        if (options.frameworks) {
            selectedFrameworks = options.frameworks
                .split(",")
                .map((f: string) => f.trim()) as Framework[];
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
                    validate: (input: string[]) => {
                        if (input.length === 0) {
                            return "Please select at least one framework.";
                        }
                        return true;
                    },
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

            console.log(
                chalk.blue(`\n📦 Configuring ${frameworkName}...`),
            );
            console.log(
                chalk.dim(`   Skills: ${skillsBasePath}/`),
            );
            console.log(
                chalk.dim(`   Manifest: ${manifestConfig.path}`),
            );

            try {
                // 1. Create all skill files
                for (const { dir, fileName, getTemplate } of ALL_SKILLS) {
                    await createSkillFile(projectPath, skillsBasePath, dir, getTemplate, fileName);
                }

                // 2. Create manifest with dynamic paths for this framework
                const manifestContent = generateManifestContent(
                    skillsBasePath,
                    manifestConfig.format,
                );
                await createManifestFile(projectPath, manifestConfig.path, manifestContent);
                succeededFrameworks.push(framework);
                telemetryEvents.push(
                    createFrameworkSucceededEvent(telemetryContext, framework),
                );
            } catch (error) {
                failedFrameworks.push(framework);
                telemetryEvents.push(
                    createFrameworkFailedEvent(telemetryContext, framework, error),
                );
                console.log(
                    chalk.red(
                        `  Error: ${error instanceof Error ? error.message : "Unknown error"}`,
                    ),
                );
            }
        }

        telemetryEvents.push(
            createInstallCompletedEvent(
                telemetryContext,
                succeededFrameworks,
                failedFrameworks,
            ),
        );
        await sendTelemetryEvents(telemetryEvents);

        console.log(
            chalk.bold.green(
                "\n✅ Cashfree Payments skill configuration complete!\n",
            ),
        );
        console.log(chalk.dim("Skills installed:"));
        console.log(chalk.dim("  cashfree-skills/"));
        console.log(chalk.dim("  ├── getting-started/SKILL.md"));
        console.log(chalk.dim("  ├── eligible-payment-modes/SKILL.md"));
        console.log(chalk.dim("  ├── pg/"));
        console.log(chalk.dim("  │   ├── SKILL.md (overview)"));
        console.log(chalk.dim("  │   ├── apis/SKILL.md + references/SKILL.md"));
        console.log(chalk.dim("  │   ├── backend-sdks/SKILL.md + references/SKILL.md"));
        console.log(chalk.dim("  │   ├── mobile-sdks/SKILL.md + references/SKILL.md"));
        console.log(chalk.dim("  │   ├── webhooks/SKILL.md + references/REFERENCE.md"));
        console.log(chalk.dim("  │   ├── go-live/SKILL.md + references/REFERENCE.md"));
        console.log(chalk.dim("  │   ├── refunds/SKILL.md + references/REFERENCE.md"));
        console.log(chalk.dim("  │   ├── disputes/SKILL.md + references/REFERENCE.md"));
        console.log(chalk.dim("  │   ├── payment-links/SKILL.md + references/REFERENCE.md"));
        console.log(chalk.dim("  │   ├── token-vault/SKILL.md + references/REFERENCE.md"));
        console.log(chalk.dim("  │   ├── web-sdk/SKILL.md + references/REFERENCE.md"));
        console.log(chalk.dim("  │   ├── easy-split/SKILL.md + references/REFERENCE.md"));
        console.log(chalk.dim("  │   └── offers/SKILL.md + references/REFERENCE.md"));
        console.log(chalk.dim("  ├── secure-id/SKILL.md + references/REFERENCE.md"));
        console.log(chalk.dim("  ├── subscriptions/SKILL.md + references/REFERENCE.md"));
        console.log(chalk.dim("  ├── cross-border/SKILL.md + references/REFERENCE.md"));
        console.log(chalk.dim("  ├── payouts/SKILL.md + references/REFERENCE.md"));
        console.log(chalk.dim("  ├── settlements-and-reconciliation/SKILL.md + references/REFERENCE.md"));
        console.log(chalk.dim("  ├── auto-collect/SKILL.md + references/REFERENCE.md"));
        console.log(chalk.dim("  ├── migrate-from-razorpay/SKILL.md + references/REFERENCE.md"));
        console.log(chalk.dim("  ├── migrate-from-juspay/SKILL.md + references/REFERENCE.md"));
        console.log(chalk.dim("  ├── progress-and-skill-feedback/SKILL.md"));
        console.log(chalk.dim("  ├── validation-and-testing/SKILL.md"));
        console.log(chalk.dim("  └── common-mistakes/SKILL.md"));
        console.log(
            chalk.dim(
                "\nA manifest file has been created/updated to help your AI assistant discover these skills.\n",
            ),
        );
    });

program
    .command("report-progress-feedback")
    .description("Submit end-of-task progress and skill-improvement feedback telemetry")
    .requiredOption("--flow <flow>", "Integration flow or product area, e.g. pg, subscriptions, payouts")
    .option("--skill <skill>", "Skill used during the workflow. Repeat for multiple skills.", collectOptionValues, [])
    .option("--completed-step <step>", "Completed step. Repeat for multiple steps.", collectOptionValues, [])
    .option("--pending-step <step>", "Pending step. Repeat for multiple steps.", collectOptionValues, [])
    .requiredOption("--feedback <feedback>", "LLM's honest feedback on what could be improved in the skill(s)")
    .option("--silent", "Suppress JSON output")
    .action(async (options: {
        flow: string;
        skill: string[];
        completedStep: string[];
        pendingStep: string[];
        feedback: string;
        silent?: boolean;
    }) => {
        const payload: ProgressFeedbackTelemetryInput = {
            cliVersion: pkg.version,
            flow: options.flow.trim(),
            skillsUsed: options.skill.map((skill) => skill.trim()).filter(Boolean),
            completedSteps: options.completedStep.map((step) => step.trim()).filter(Boolean),
            pendingSteps: options.pendingStep.map((step) => step.trim()).filter(Boolean),
            llmFeedback: options.feedback.trim(),
        };

        if (!payload.flow) {
            console.error('Error: --flow is required and cannot be empty.');
            process.exitCode = 1;
            return;
        }

        if (!payload.llmFeedback) {
            console.error('Error: --feedback is required and cannot be empty.');
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
                flow: payload.flow,
                skills_used_count: payload.skillsUsed.length,
                completed_steps_count: payload.completedSteps.length,
                pending_steps_count: payload.pendingSteps.length,
            }));
        }
    });

function getFrameworkName(framework: Framework): string {
    const found = FRAMEWORKS.find((f) => f.value === framework);
    return found?.name || framework;
}

// Graceful shutdown
function handleSignal(signal: string) {
    console.log(chalk.yellow(`\n\nReceived ${signal}. Exiting gracefully...`));
    process.exit(0);
}

process.on("SIGINT", () => handleSignal("SIGINT"));
process.on("SIGTERM", () => handleSignal("SIGTERM"));

program.parse();
