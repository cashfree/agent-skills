import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getUpgradeAdvisorSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "upgrade-advisor/upgrade-advisor.md"), "utf8");
}
