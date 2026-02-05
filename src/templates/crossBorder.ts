import * as fs from "fs";
import * as path from "path";

declare const __dirname: string;

/**
 * Cross Border skill template
 */
export function getCrossBorderSkillTemplate(): string {
    const templatePath = path.join(__dirname, "crossBorder.md");
    return fs.readFileSync(templatePath, "utf8");
}
