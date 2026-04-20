import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Cross Border skill template
 */
export function getCrossBorderSkillTemplate(): string {
    const templatePath = path.join(__dirname, "crossBorder.md");
    return fs.readFileSync(templatePath, "utf8");
}

export function getCrossBorderReferenceTemplate(): string {
    const templatePath = path.join(__dirname, "cross-border-reference.md");
    return fs.readFileSync(templatePath, "utf8");
}
