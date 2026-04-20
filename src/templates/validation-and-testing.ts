import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Validation and Testing skill template
 */
export function getValidationAndTestingSkillTemplate(): string {
    const templatePath = path.join(__dirname, "validation-and-testing.md");
    return fs.readFileSync(templatePath, "utf8");
}
