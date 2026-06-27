import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getBbpsCouSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "bbps-cou.md"), "utf8");
}

export function getBbpsCouReferenceTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "bbps-cou-reference.md"), "utf8");
}