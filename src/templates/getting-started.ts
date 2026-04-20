import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Getting Started skill template
 */
export function getGettingStartedSkillTemplate(): string {
    const templatePath = path.join(__dirname, "getting-started.md");
    return fs.readFileSync(templatePath, "utf8");
}
