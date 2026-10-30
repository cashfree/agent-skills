import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getSecurityReviewSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "security-review/security-review.md"), "utf8");
}

export function getSecurityReviewReferenceTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "security-review/security-review-reference.md"), "utf8");
}
