import * as fs from "fs";
import * as path from "path";

declare const __dirname: string;

/**
 * Subscriptions skill template
 */
export function getSubscriptionsSkillTemplate(): string {
    const templatePath = path.join(__dirname, "subscriptions.md");
    return fs.readFileSync(templatePath, "utf8");
}
