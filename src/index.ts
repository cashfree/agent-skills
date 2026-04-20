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

    // --- End: validation, testing & troubleshooting ---
    { dir: "validation-and-testing", getTemplate: getValidationAndTestingSkillTemplate },
    { dir: "common-mistakes", getTemplate: getCommonMistakesSkillTemplate },
];

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
            } catch (error) {
                console.log(
                    chalk.red(
                        `  Error: ${error instanceof Error ? error.message : "Unknown error"}`,
                    ),
                );
            }
        }

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
        console.log(chalk.dim("  ├── validation-and-testing/SKILL.md"));
        console.log(chalk.dim("  └── common-mistakes/SKILL.md"));
        console.log(
            chalk.dim(
                "\nA manifest file has been created/updated to help your AI assistant discover these skills.\n",
            ),
        );
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
