#!/usr/bin/env node
import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import path from "path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
    FRAMEWORKS,
    PRODUCTS,
    type Framework,
    type Product,
} from "./config.js";
import {
    getPGApiSkillTemplate,
    getPGSdkSkillTemplate,
    getPGMobileSkillTemplate,
    getPGWebhooksSkillTemplate,
} from "./templates/pg.js";
import { getSecureIdSkillTemplate } from "./templates/secure-id.js";
import { getSubscriptionsSkillTemplate } from "./templates/subscriptions.js";
import { getCrossBorderSkillTemplate } from "./templates/crossBorder.js";
import { getPayoutsSkillTemplate } from "./templates/payouts.js";
import { createSkillFile } from "./generators/utils.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
    readFileSync(path.join(__dirname, "..", "package.json"), "utf-8"),
);

const program = new Command();

program
    .name("cashfree")
    .description("CLI to add Cashfree product skills to AI coding assistants")
    .version(pkg.version);

program
    .command("add")
    .argument(
        "<type>",
        "Type of product to add (pg, secure-id, subscriptions, cross-border, payouts)",
    )
    .description("Add Cashfree product skill configuration to your project")
    .option("-p, --path <path>", "Project path", process.cwd())
    .option(
        "-f, --frameworks <frameworks>",
        "Comma-separated list of frameworks",
    )
    .action(async (type, options) => {
        const validProducts: Product[] = [
            "pg",
            "secure-id",
            "subscriptions",
            "cross-border",
            "payouts",
        ];
        if (!validProducts.includes(type as Product)) {
            console.error(
                chalk.red(
                    `Error: Unknown product '${type}'. Valid options: pg, secure-id, subscriptions, cross-border, payouts`,
                ),
            );
            process.exit(1);
        }
        const product = type as Product;
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
                "  🎯 Agent Skills Setup - Add Product Knowledge to AI Assistants\n",
            ),
        );

        // Get the list of sub-skills to create for a product
        type SubSkill = { name: string; getTemplate: () => string };
        const getSubSkillsForProduct = (product: Product): SubSkill[] => {
            switch (product) {
                case "pg":
                    return [
                        { name: "pg/api", getTemplate: getPGApiSkillTemplate },
                        { name: "pg/sdk", getTemplate: getPGSdkSkillTemplate },
                        { name: "pg/mobile", getTemplate: getPGMobileSkillTemplate },
                        { name: "pg/webhooks", getTemplate: getPGWebhooksSkillTemplate },
                    ];
                case "secure-id":
                    return [{ name: "secure-id", getTemplate: getSecureIdSkillTemplate }];
                case "subscriptions":
                    return [{ name: "subscriptions", getTemplate: getSubscriptionsSkillTemplate }];
                case "cross-border":
                    return [{ name: "cross-border", getTemplate: getCrossBorderSkillTemplate }];
                case "payouts":
                    return [{ name: "payouts", getTemplate: getPayoutsSkillTemplate }];
                default:
                    throw new Error(
                        `No template found for product: ${product}`,
                    );
            }
        };

        const productName =
            PRODUCTS.find((p) => p.value === product)?.name || product;

        let selectedFrameworks: Framework[];

        if (options.frameworks) {
            // Use provided frameworks
            selectedFrameworks = options.frameworks
                .split(",")
                .map((f: string) => f.trim()) as Framework[];
        } else {
            // Interactive selection
            const answers = await inquirer.prompt([
                {
                    type: "checkbox",
                    name: "frameworks",
                    message: `Select AI coding assistants to configure for ${productName}:`,
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
        console.log(chalk.dim(`\nProject path: ${projectPath}`));
        console.log(chalk.dim(`Product: ${productName}\n`));

        // Generate configurations for each selected framework
        for (const framework of selectedFrameworks) {
            console.log(
                chalk.blue(
                    `\n📦 Configuring ${getFrameworkName(framework)}...`,
                ),
            );

            try {
                const baseDir = getFrameworkBaseDir(framework);
                for (const { name, getTemplate } of getSubSkillsForProduct(product)) {
                    await createSkillFile(projectPath, baseDir, name, getTemplate);
                }
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
                `\n✅ Cashfree ${productName} configuration complete!\n`,
            ),
        );
        console.log(
            chalk.dim(`The skill files have been created for ${productName}.`),
        );
        console.log(
            chalk.dim(
                "Use them to search for API references, code examples, and guides.\n",
            ),
        );
    });

function getFrameworkName(framework: Framework): string {
    const found = FRAMEWORKS.find((f) => f.value === framework);
    return found?.name || framework;
}

function getFrameworkBaseDir(framework: Framework): string {
    switch (framework) {
        case "cursor":
            return ".cursor";
        case "claude-code":
            return ".claude";
        case "opencode":
            return ".opencode";
        case "vscode-copilot":
            return ".github";
        case "gemini-cli":
            return ".gemini";
        case "antigravity":
            return ".agent";
        case "copilot-cli":
            return ".github";
        case "codex":
            return ".codex";
        default:
            return ".agent";
    }
}

// Graceful shutdown
function handleSignal(signal: string) {
    console.log(chalk.yellow(`\n\nReceived ${signal}. Exiting gracefully...`));
    process.exit(0);
}

process.on("SIGINT", () => handleSignal("SIGINT"));
process.on("SIGTERM", () => handleSignal("SIGTERM"));

program.parse();
