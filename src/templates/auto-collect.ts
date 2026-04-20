import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getAutoCollectSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "auto-collect.md"), "utf8");
}

export function getAutoCollectReferenceTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "auto-collect-reference.md"), "utf8");
}
