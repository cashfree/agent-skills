import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getSettlementsSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "settlements-and-reconciliation.md"), "utf8");
}

export function getSettlementsReferenceTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "settlements-and-reconciliation-reference.md"), "utf8");
}
