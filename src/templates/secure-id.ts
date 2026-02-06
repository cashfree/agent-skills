import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Secure ID System skill template
 */
export function getSecureIdSkillTemplate(): string {
    const templatePath = path.join(__dirname, "secure-id.md");
    return fs.readFileSync(templatePath, "utf8");
}
