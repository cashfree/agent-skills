import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getMigrateFromRazorpaySkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "migrate-from-razorpay.md"), "utf8");
}

export function getMigrateFromRazorpayReferenceTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "migrate-from-razorpay-reference.md"), "utf8");
}
