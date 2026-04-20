import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * PG Overview skill template (index for PG sub-skills)
 */
export function getPGOverviewSkillTemplate(): string {
    const templatePath = path.join(__dirname, "pg-overview.md");
    return fs.readFileSync(templatePath, "utf8");
}
