import * as fs from "fs";
import * as path from "path";

declare const __dirname: string;

/**
 * Payment Gateway skill template
 */
export function getPGSkillTemplate(): string {
    const templatePath = path.join(__dirname, "pg.md");
    return fs.readFileSync(templatePath, "utf8");
}
