import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getMigrateFromJuspaySkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "migrate-from-juspay.md"), "utf8");
}

export function getMigrateFromJuspayReferenceTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "migrate-from-juspay-reference.md"), "utf8");
}
