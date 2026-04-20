import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Common Mistakes & Pitfalls skill template
 */
export function getCommonMistakesSkillTemplate(): string {
    const templatePath = path.join(__dirname, "common-mistakes.md");
    return fs.readFileSync(templatePath, "utf8");
}
