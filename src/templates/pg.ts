import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getPGApiSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/api.md"), "utf8");
}

export function getPGSdkSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/sdk.md"), "utf8");
}

export function getPGMobileSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/mobile.md"), "utf8");
}

export function getPGWebhooksSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/webhooks.md"), "utf8");
}
