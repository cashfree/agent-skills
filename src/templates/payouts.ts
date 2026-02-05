import * as fs from "fs";
import * as path from "path";

declare const __dirname: string;

/**
 * Payouts skill template
 */
export function getPayoutsSkillTemplate(): string {
    const templatePath = path.join(__dirname, "payouts.md");
    return fs.readFileSync(templatePath, "utf8");
}
