import * as fs from "fs";
import * as path from "path";

declare const __dirname: string;

/**
 * Secure ID System skill template
 */
export function getSecureIdSkillTemplate(): string {
    const templatePath = path.join(__dirname, "secure-id.md");
    return fs.readFileSync(templatePath, "utf8");
}