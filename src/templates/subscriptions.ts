import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Subscriptions skill template
 */
export function getSubscriptionsSkillTemplate(): string {
    const templatePath = path.join(__dirname, "subscriptions.md");
    return fs.readFileSync(templatePath, "utf8");
}
