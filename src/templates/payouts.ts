import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Payouts skill template
 */
export function getPayoutsSkillTemplate(): string {
    const templatePath = path.join(__dirname, "payouts.md");
    return fs.readFileSync(templatePath, "utf8");
}
