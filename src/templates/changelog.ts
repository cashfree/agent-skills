import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getChangelogSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "changelog/changelog.md"), "utf8");
}

export function getChangelogPgBackendSdksTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "changelog/references/pg-backend-sdks.md"), "utf8");
}

export function getChangelogPgApiVersionsTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "changelog/references/pg-api-versions.md"), "utf8");
}

export function getChangelogPgWebSdkTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "changelog/references/pg-web-sdk.md"), "utf8");
}

export function getChangelogPgMobileSdksTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "changelog/references/pg-mobile-sdks.md"), "utf8");
}

export function getChangelogPayoutsTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "changelog/references/payouts.md"), "utf8");
}

export function getChangelogVerificationSecureIdTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "changelog/references/verification-secure-id.md"), "utf8");
}

export function getChangelogSubscriptionsTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "changelog/references/subscriptions.md"), "utf8");
}
