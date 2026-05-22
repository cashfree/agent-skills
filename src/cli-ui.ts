import chalk from "chalk";

const BANNER_TOP_LINES = [
    "   ██████╗ █████╗ ███████╗██╗  ██╗███████╗██████╗ ███████╗███████╗",
    "  ██╔════╝██╔══██╗██╔════╝██║  ██║██╔════╝██╔══██╗██╔════╝██╔════╝",
    "  ██║     ███████║███████╗███████║█████╗  ██████╔╝█████╗  █████╗  ",
    "  ██║     ██╔══██║╚════██║██╔══██║██╔══╝  ██╔══██╗██╔══╝  ██╔══╝  ",
    "  ╚██████╗██║  ██║███████║██║  ██║██║     ██║  ██║███████╗███████╗",
    "   ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝",
];

const BANNER_BOTTOM_LINES = [
    "  ██████╗  █████╗ ██╗   ██╗███╗   ███╗███████╗███╗   ██╗████████╗███████╗",
    "  ██╔══██╗██╔══██╗╚██╗ ██╔╝████╗ ████║██╔════╝████╗  ██║╚══██╔══╝██╔════╝",
    "  ██████╔╝███████║ ╚████╔╝ ██╔████╔██║█████╗  ██╔██╗ ██║   ██║   ███████╗",
    "  ██╔═══╝ ██╔══██║  ╚██╔╝  ██║╚██╔╝██║██╔══╝  ██║╚██╗██║   ██║   ╚════██║",
    "  ██║     ██║  ██║   ██║   ██║ ╚═╝ ██║███████╗██║ ╚████║   ██║   ███████║",
    "  ╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝",
];

export function printBanner(): void {
    console.log("\n");
    for (const line of BANNER_TOP_LINES) console.log(chalk.bold.hex("#10b981")(line));
    for (const line of BANNER_BOTTOM_LINES) console.log(chalk.bold.hex("#f59e0b")(line));
    console.log("\n");
    console.log(
        chalk.bold.cyan(
            "  🎯 Agent Skills Setup - Add Cashfree Payments Integration Knowledge to AI Assistants\n",
        ),
    );
}

const INSTALLED_TREE_LINES = [
    "  cashfree-skills/",
    "  ├── getting-started/SKILL.md",
    "  ├── eligible-payment-modes/SKILL.md",
    "  ├── pg/",
    "  │   ├── SKILL.md (overview)",
    "  │   ├── apis/SKILL.md + references/SKILL.md",
    "  │   ├── backend-sdks/SKILL.md + references/SKILL.md",
    "  │   ├── mobile-sdks/SKILL.md + references/SKILL.md",
    "  │   ├── webhooks/SKILL.md + references/REFERENCE.md",
    "  │   ├── go-live/SKILL.md + references/REFERENCE.md",
    "  │   ├── refunds/SKILL.md + references/REFERENCE.md",
    "  │   ├── disputes/SKILL.md + references/REFERENCE.md",
    "  │   ├── payment-links/SKILL.md + references/REFERENCE.md",
    "  │   ├── token-vault/SKILL.md + references/REFERENCE.md",
    "  │   ├── web-sdk/SKILL.md + references/REFERENCE.md",
    "  │   ├── easy-split/SKILL.md + references/REFERENCE.md",
    "  │   └── offers/SKILL.md + references/REFERENCE.md",
    "  ├── secure-id/SKILL.md + references/REFERENCE.md",
    "  ├── subscriptions/SKILL.md + references/REFERENCE.md",
    "  ├── cross-border/SKILL.md + references/REFERENCE.md",
    "  ├── payouts/SKILL.md + references/REFERENCE.md",
    "  ├── settlements-and-reconciliation/SKILL.md + references/REFERENCE.md",
    "  ├── auto-collect/SKILL.md + references/REFERENCE.md",
    "  ├── migrate-from-razorpay/SKILL.md + references/REFERENCE.md",
    "  ├── migrate-from-juspay/SKILL.md + references/REFERENCE.md",
    "  ├── progress-and-skill-feedback/SKILL.md",
    "  ├── validation-and-testing/SKILL.md",
    "  └── common-mistakes/SKILL.md",
];

export function printInstallSuccess(): void {
    console.log(chalk.bold.green("\n✅ Cashfree Payments skill configuration complete!\n"));
    console.log(chalk.dim("Skills installed:"));
    for (const line of INSTALLED_TREE_LINES) console.log(chalk.dim(line));
    console.log(
        chalk.dim("\nA manifest file has been created/updated to help your AI assistant discover these skills.\n"),
    );

    console.log(chalk.bold.cyan("👉 Try this in your AI assistant:"));
    console.log(chalk.white('   "Integrate Cashfree Payments into my project"\n'));
    console.log(
        chalk.hex("#fbbf24")("💡 ") +
            chalk.bold.hex("#fbbf24")("More example prompts & next steps: ") +
            chalk.bold.hex("#10b981")("npx @cashfreepayments/agent-skills help\n"),
    );
}

const HELP_SECTIONS: { title: string; prompts: string[] }[] = [
    {
        title: "Getting started",
        prompts: [
            "Integrate Cashfree Payments into my project",
            "What payment modes are enabled for my merchant account?",
        ],
    },
    {
        title: "Backend & SDK integration",
        prompts: [
            "Integrate Cashfree with my Express app using the Node SDK",
            "Add Cashfree to my Django backend",
        ],
    },
    {
        title: "Frontend & mobile",
        prompts: [
            "Add Cashfree checkout to my Next.js app with the Web SDK",
            "Integrate Cashfree into my Flutter app",
        ],
    },
    {
        title: "Migration & ops",
        prompts: [
            "Migrate my Express app from Razorpay to Cashfree",
            "Replace Juspay Hypercheckout with Cashfree in my app",
        ],
    },
    {
        title: "Debugging",
        prompts: [
            "My webhook isn't firing — help me debug",
            "I'm done coding — what should I test before going live?",
        ],
    },
];

export function printHelp(): void {
    console.log("\n" + chalk.bold.hex("#10b981")("Cashfree Agent Skills — what to do next") + "\n");
    console.log(
        chalk.dim(
            "Skills are installed in your project. Open your AI coding assistant\n" +
                "(Claude Code, Cursor, Copilot, Gemini CLI, etc.) and paste any of the\n" +
                "prompts below to put them to work.\n",
        ),
    );

    for (const { title, prompts } of HELP_SECTIONS) {
        console.log(chalk.bold.hex("#f59e0b")(`▸ ${title}`));
        for (const p of prompts) console.log(chalk.white(`  • "${p}"`));
        console.log("");
    }

    console.log(
        chalk.hex("#fbbf24")("💡 ") +
            chalk.bold.hex("#fbbf24")("Tip: ") +
            chalk.hex("#10b981")("skills are read on demand by your AI — ") +
            chalk.hex("#f59e0b")("just ask in natural language.\n"),
    );
    console.log(
        chalk.dim("Re-run installation any time: ") +
            chalk.bold("npx @cashfreepayments/agent-skills@latest add skills\n"),
    );
}
