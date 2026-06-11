import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getMigrateFromPayuSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "migrate-from-payu.md"), "utf8");
}

export function getMigrateFromPayuReferenceTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "migrate-from-payu-reference.md"), "utf8");
}
