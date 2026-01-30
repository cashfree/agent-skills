import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import path from 'path';
import { FRAMEWORKS, type Framework } from './config.js';
import {
    generateCursor,
    generateClaudeCode,
    generateOpenCode,
    generateVSCodeCopilot,
    generateGeminiCLI,
    generateAntigravity,
    generateCopilotCLI,
    generateCodex
} from './generators/index.js';

const program = new Command();

program
    .name('cashfree')
    .description('CLI to add Cashfree MCP configurations to AI coding assistants')
    .version('1.0.0');

program
    .command('add')
    .argument('<type>', 'Type of configuration to add (must be "agent-skills")')
    .description('Add Cashfree Agent Skills configuration to your project')
    .option('-p, --path <path>', 'Project path', process.cwd())
    .option('-f, --frameworks <frameworks>', 'Comma-separated list of frameworks')
    .action(async (type, options) => {
        if (type !== 'agent-skills') {
            console.error(chalk.red(`Error: Unknown type '${type}'. Only 'agent-skills' is supported.`));
            process.exit(1);
        }
        // Amazing branding banner
        console.log('\n');
        console.log(chalk.bold.hex('#10b981')('   ██████╗ █████╗ ███████╗██╗  ██╗███████╗██████╗ ███████╗███████╗'));
        console.log(chalk.bold.hex('#10b981')('  ██╔════╝██╔══██╗██╔════╝██║  ██║██╔════╝██╔══██╗██╔════╝██╔════╝'));
        console.log(chalk.bold.hex('#10b981')('  ██║     ███████║███████╗███████║█████╗  ██████╔╝█████╗  █████╗  '));
        console.log(chalk.bold.hex('#10b981')('  ██║     ██╔══██║╚════██║██╔══██║██╔══╝  ██╔══██╗██╔══╝  ██╔══╝  '));
        console.log(chalk.bold.hex('#10b981')('  ╚██████╗██║  ██║███████║██║  ██║██║     ██║  ██║███████╗███████╗'));
        console.log(chalk.bold.hex('#10b981')('   ╚═════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝  ╚═╝╚══════╝╚══════╝'));
        console.log(chalk.bold.hex('#f59e0b')('  ██████╗  █████╗ ██╗   ██╗███╗   ███╗███████╗███╗   ██╗████████╗███████╗'));
        console.log(chalk.bold.hex('#f59e0b')('  ██╔══██╗██╔══██╗╚██╗ ██╔╝████╗ ████║██╔════╝████╗  ██║╚══██╔══╝██╔════╝'));
        console.log(chalk.bold.hex('#f59e0b')('  ██████╔╝███████║ ╚████╔╝ ██╔████╔██║█████╗  ██╔██╗ ██║   ██║   ███████╗'));
        console.log(chalk.bold.hex('#f59e0b')('  ██╔═══╝ ██╔══██║  ╚██╔╝  ██║╚██╔╝██║██╔══╝  ██║╚██╗██║   ██║   ╚════██║'));
        console.log(chalk.bold.hex('#f59e0b')('  ██║     ██║  ██║   ██║   ██║ ╚═╝ ██║███████╗██║ ╚████║   ██║   ███████║'));
        console.log(chalk.bold.hex('#f59e0b')('  ╚═╝     ╚═╝  ╚═╝   ╚═╝   ╚═╝     ╚═╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚══════╝'));
        console.log('\n');
        console.log(chalk.bold.cyan('  🔧 MCP Setup - Configure AI Coding Assistants\n'));

        let selectedFrameworks: Framework[];

        if (options.frameworks) {
            // Use provided frameworks
            selectedFrameworks = options.frameworks.split(',').map((f: string) => f.trim()) as Framework[];
        } else {
            // Interactive selection
            const answers = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'frameworks',
                    message: 'Select the AI coding assistants to configure:',
                    choices: FRAMEWORKS.map(f => ({
                        name: f.name,
                        value: f.value,
                        checked: false
                    })),
                    validate: (input: string[]) => {
                        if (input.length === 0) {
                            return 'Please select at least one framework.';
                        }
                        return true;
                    },
                    pageSize: 10
                }
            ]);
            selectedFrameworks = answers.frameworks;
        }

        const projectPath = path.resolve(options.path);
        console.log(chalk.dim(`\nProject path: ${projectPath}\n`));

        // Generate configurations for each selected framework
        for (const framework of selectedFrameworks) {
            console.log(chalk.blue(`\n📦 Configuring ${getFrameworkName(framework)}...`));

            try {
                switch (framework) {
                    case 'cursor':
                        await generateCursor(projectPath);
                        break;
                    case 'claude-code':
                        await generateClaudeCode(projectPath);
                        break;
                    case 'opencode':
                        await generateOpenCode(projectPath);
                        break;
                    case 'vscode-copilot':
                        await generateVSCodeCopilot(projectPath);
                        break;
                    case 'gemini-cli':
                        await generateGeminiCLI(projectPath);
                        break;
                    case 'antigravity':
                        await generateAntigravity(projectPath);
                        break;
                    case 'copilot-cli':
                        await generateCopilotCLI(projectPath);
                        break;
                    case 'codex':
                        await generateCodex(projectPath);
                        break;
                }
            } catch (error) {
                console.log(chalk.red(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`));
            }
        }

        console.log(chalk.bold.green('\n✅ Cashfree MCP configuration complete!\n'));
        console.log(chalk.dim('The MCP server provides access to Cashfree Payments documentation.'));
        console.log(chalk.dim('Use it to search for API references, code examples, and guides.\n'));
    });

function getFrameworkName(framework: Framework): string {
    const found = FRAMEWORKS.find(f => f.value === framework);
    return found?.name || framework;
}

// Graceful shutdown
function handleSignal(signal: string) {
    console.log(chalk.yellow(`\n\nReceived ${signal}. Exiting gracefully...`));
    process.exit(0);
}

process.on('SIGINT', () => handleSignal('SIGINT'));
process.on('SIGTERM', () => handleSignal('SIGTERM'));

program.parse();