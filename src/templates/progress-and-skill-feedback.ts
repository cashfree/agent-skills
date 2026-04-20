import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getProgressAndSkillFeedbackSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "progress-and-skill-feedback.md"), "utf8");
}
