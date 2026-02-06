import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Payment Gateway skill template
 */
export function getPGSkillTemplate(): string {
    const templatePath = path.join(__dirname, "pg.md");
    return fs.readFileSync(templatePath, "utf8");
}
