import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function getPGApiSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/api.md"), "utf8");
}

export function getPGApiReferenceTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/api-reference.md"), "utf8");
}

export function getPGSdkSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/sdk.md"), "utf8");
}

export function getPGSdkReferenceTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/sdk-reference.md"), "utf8");
}

export function getPGMobileSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/mobile.md"), "utf8");
}

export function getPGMobileReferenceTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/mobile-reference.md"), "utf8");
}

export function getPGWebhooksSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/webhooks.md"), "utf8");
}

export function getPGWebhooksReferenceTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/webhooks-reference.md"), "utf8");
}

export function getPGGoLiveSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/go-live.md"), "utf8");
}

export function getPGGoLiveReferenceTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/go-live-reference.md"), "utf8");
}

export function getPGRefundsSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/refunds.md"), "utf8");
}

export function getPGRefundsReferenceTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/refunds-reference.md"), "utf8");
}

export function getPGDisputesSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/disputes.md"), "utf8");
}

export function getPGDisputesReferenceTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/disputes-reference.md"), "utf8");
}

export function getPGPaymentLinksSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/payment-links.md"), "utf8");
}

export function getPGPaymentLinksReferenceTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/payment-links-reference.md"), "utf8");
}

export function getPGTokenVaultSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/token-vault.md"), "utf8");
}

export function getPGTokenVaultReferenceTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/token-vault-reference.md"), "utf8");
}

export function getPGWebSdkSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/web-sdk.md"), "utf8");
}

export function getPGWebSdkReferenceTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/web-sdk-reference.md"), "utf8");
}

export function getPGEasySplitSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/easy-split.md"), "utf8");
}

export function getPGEasySplitReferenceTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/easy-split-reference.md"), "utf8");
}

export function getPGOffersSkillTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/offers.md"), "utf8");
}

export function getPGOffersReferenceTemplate(): string {
    return fs.readFileSync(path.join(__dirname, "pg/offers-reference.md"), "utf8");
}
