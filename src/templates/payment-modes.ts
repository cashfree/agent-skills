import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Payment Modes skill template
 */
export function getPaymentModesSkillTemplate(): string {
    const templatePath = path.join(__dirname, "payment-modes.md");
    return fs.readFileSync(templatePath, "utf8");
}
