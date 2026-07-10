import { getGettingStartedSkillTemplate } from "./templates/getting-started.js";
import { getPaymentModesSkillTemplate } from "./templates/payment-modes.js";
import { getPGOverviewSkillTemplate } from "./templates/pg-overview.js";
import {
    getPGApiSkillTemplate,
    getPGApiReferenceTemplate,
    getPGSdkSkillTemplate,
    getPGSdkReferenceTemplate,
    getPGMobileSkillTemplate,
    getPGMobileReferenceTemplate,
    getPGWebhooksSkillTemplate,
    getPGWebhooksReferenceTemplate,
    getPGGoLiveSkillTemplate,
    getPGGoLiveReferenceTemplate,
    getPGRefundsSkillTemplate,
    getPGRefundsReferenceTemplate,
    getPGDisputesSkillTemplate,
    getPGDisputesReferenceTemplate,
    getPGPaymentLinksSkillTemplate,
    getPGPaymentLinksReferenceTemplate,
    getPGTokenVaultSkillTemplate,
    getPGTokenVaultReferenceTemplate,
    getPGWebSdkSkillTemplate,
    getPGWebSdkReferenceTemplate,
    getPGEasySplitSkillTemplate,
    getPGEasySplitReferenceTemplate,
    getPGOffersSkillTemplate,
    getPGOffersReferenceTemplate,
} from "./templates/pg.js";
import { getSecureIdSkillTemplate, getSecureIdReferenceTemplate } from "./templates/secure-id.js";
import { getSubscriptionsSkillTemplate, getSubscriptionsReferenceTemplate } from "./templates/subscriptions.js";
import { getCrossBorderSkillTemplate, getCrossBorderReferenceTemplate } from "./templates/crossBorder.js";
import { getPayoutsSkillTemplate, getPayoutsReferenceTemplate } from "./templates/payouts.js";
import { getValidationAndTestingSkillTemplate } from "./templates/validation-and-testing.js";
import { getCommonMistakesSkillTemplate } from "./templates/common-mistakes.js";
import { getProgressAndSkillFeedbackSkillTemplate } from "./templates/progress-and-skill-feedback.js";
import {
    getMigrateFromRazorpaySkillTemplate,
    getMigrateFromRazorpayReferenceTemplate,
} from "./templates/migrate-from-razorpay.js";
import {
    getMigrateFromJuspaySkillTemplate,
    getMigrateFromJuspayReferenceTemplate,
} from "./templates/migrate-from-juspay.js";
import {
    getMigrateFromPayuSkillTemplate,
    getMigrateFromPayuReferenceTemplate,
} from "./templates/migrate-from-payu.js";
import {
    getSettlementsSkillTemplate,
    getSettlementsReferenceTemplate,
} from "./templates/settlements-and-reconciliation.js";
import {
    getAutoCollectSkillTemplate,
    getAutoCollectReferenceTemplate,
} from "./templates/auto-collect.js";
import {
    getBbpsCouSkillTemplate,
    getBbpsCouReferenceTemplate,
} from "./templates/bbps-cou.js";
import {
    getChangelogSkillTemplate,
    getChangelogPgBackendSdksTemplate,
    getChangelogPgApiVersionsTemplate,
    getChangelogPgWebSdkTemplate,
    getChangelogPgMobileSdksTemplate,
    getChangelogPayoutsTemplate,
    getChangelogVerificationSecureIdTemplate,
    getChangelogSubscriptionsTemplate,
} from "./templates/changelog.js";
import { getUpgradeAdvisorSkillTemplate } from "./templates/upgrade-advisor.js";

export type Skill = { dir: string; fileName?: string; getTemplate: () => string };

/**
 * All skill files in install order. Each entry creates `{dir}/{fileName ?? "SKILL.md"}`
 * under the framework's skills base path. Ordering matters only for the post-install
 * console output — directory creation is independent.
 */
export const ALL_SKILLS: Skill[] = [
    // --- Start: onboarding & setup ---
    { dir: "getting-started", getTemplate: getGettingStartedSkillTemplate },
    { dir: "eligible-payment-modes", getTemplate: getPaymentModesSkillTemplate },

    // --- Middle: product-specific skills ---
    { dir: "pg", getTemplate: getPGOverviewSkillTemplate },
    { dir: "pg/apis", getTemplate: getPGApiSkillTemplate },
    { dir: "pg/apis/references", fileName: "REFERENCE.md", getTemplate: getPGApiReferenceTemplate },
    { dir: "pg/backend-sdks", getTemplate: getPGSdkSkillTemplate },
    { dir: "pg/backend-sdks/references", fileName: "REFERENCE.md", getTemplate: getPGSdkReferenceTemplate },
    { dir: "pg/mobile-sdks", getTemplate: getPGMobileSkillTemplate },
    { dir: "pg/mobile-sdks/references", fileName: "REFERENCE.md", getTemplate: getPGMobileReferenceTemplate },
    { dir: "pg/webhooks", getTemplate: getPGWebhooksSkillTemplate },
    { dir: "pg/webhooks/references", fileName: "REFERENCE.md", getTemplate: getPGWebhooksReferenceTemplate },
    { dir: "pg/go-live", getTemplate: getPGGoLiveSkillTemplate },
    { dir: "pg/go-live/references", fileName: "REFERENCE.md", getTemplate: getPGGoLiveReferenceTemplate },
    { dir: "pg/refunds", getTemplate: getPGRefundsSkillTemplate },
    { dir: "pg/refunds/references", fileName: "REFERENCE.md", getTemplate: getPGRefundsReferenceTemplate },
    { dir: "pg/disputes", getTemplate: getPGDisputesSkillTemplate },
    { dir: "pg/disputes/references", fileName: "REFERENCE.md", getTemplate: getPGDisputesReferenceTemplate },
    { dir: "pg/payment-links", getTemplate: getPGPaymentLinksSkillTemplate },
    { dir: "pg/payment-links/references", fileName: "REFERENCE.md", getTemplate: getPGPaymentLinksReferenceTemplate },
    { dir: "pg/token-vault", getTemplate: getPGTokenVaultSkillTemplate },
    { dir: "pg/token-vault/references", fileName: "REFERENCE.md", getTemplate: getPGTokenVaultReferenceTemplate },
    { dir: "pg/web-sdk", getTemplate: getPGWebSdkSkillTemplate },
    { dir: "pg/web-sdk/references", fileName: "REFERENCE.md", getTemplate: getPGWebSdkReferenceTemplate },
    { dir: "pg/easy-split", getTemplate: getPGEasySplitSkillTemplate },
    { dir: "pg/easy-split/references", fileName: "REFERENCE.md", getTemplate: getPGEasySplitReferenceTemplate },
    { dir: "pg/offers", getTemplate: getPGOffersSkillTemplate },
    { dir: "pg/offers/references", fileName: "REFERENCE.md", getTemplate: getPGOffersReferenceTemplate },
    { dir: "secure-id", getTemplate: getSecureIdSkillTemplate },
    { dir: "secure-id/references", fileName: "REFERENCE.md", getTemplate: getSecureIdReferenceTemplate },
    { dir: "subscriptions", getTemplate: getSubscriptionsSkillTemplate },
    { dir: "subscriptions/references", fileName: "REFERENCE.md", getTemplate: getSubscriptionsReferenceTemplate },
    { dir: "cross-border", getTemplate: getCrossBorderSkillTemplate },
    { dir: "cross-border/references", fileName: "REFERENCE.md", getTemplate: getCrossBorderReferenceTemplate },
    { dir: "payouts", getTemplate: getPayoutsSkillTemplate },
    { dir: "payouts/references", fileName: "REFERENCE.md", getTemplate: getPayoutsReferenceTemplate },
    { dir: "settlements-and-reconciliation", getTemplate: getSettlementsSkillTemplate },
    { dir: "settlements-and-reconciliation/references", fileName: "REFERENCE.md", getTemplate: getSettlementsReferenceTemplate },
    { dir: "auto-collect", getTemplate: getAutoCollectSkillTemplate },
    { dir: "auto-collect/references", fileName: "REFERENCE.md", getTemplate: getAutoCollectReferenceTemplate },
    { dir: "bbps-cou", getTemplate: getBbpsCouSkillTemplate },
    { dir: "bbps-cou/references", fileName: "REFERENCE.md", getTemplate: getBbpsCouReferenceTemplate },

    // --- Migration skills (switching from another PG) ---
    { dir: "migrate-from-razorpay", getTemplate: getMigrateFromRazorpaySkillTemplate },
    { dir: "migrate-from-razorpay/references", fileName: "REFERENCE.md", getTemplate: getMigrateFromRazorpayReferenceTemplate },
    { dir: "migrate-from-juspay", getTemplate: getMigrateFromJuspaySkillTemplate },
    { dir: "migrate-from-juspay/references", fileName: "REFERENCE.md", getTemplate: getMigrateFromJuspayReferenceTemplate },
    { dir: "migrate-from-payu", getTemplate: getMigrateFromPayuSkillTemplate },
    { dir: "migrate-from-payu/references", fileName: "REFERENCE.md", getTemplate: getMigrateFromPayuReferenceTemplate },
    { dir: "progress-and-skill-feedback", getTemplate: getProgressAndSkillFeedbackSkillTemplate },

    // --- Version migration (intra-Cashfree SDK/API upgrades) ---
    { dir: "changelog", getTemplate: getChangelogSkillTemplate },
    { dir: "changelog/references", fileName: "pg-backend-sdks.md", getTemplate: getChangelogPgBackendSdksTemplate },
    { dir: "changelog/references", fileName: "pg-api-versions.md", getTemplate: getChangelogPgApiVersionsTemplate },
    { dir: "changelog/references", fileName: "pg-web-sdk.md", getTemplate: getChangelogPgWebSdkTemplate },
    { dir: "changelog/references", fileName: "pg-mobile-sdks.md", getTemplate: getChangelogPgMobileSdksTemplate },
    { dir: "changelog/references", fileName: "payouts.md", getTemplate: getChangelogPayoutsTemplate },
    { dir: "changelog/references", fileName: "verification-secure-id.md", getTemplate: getChangelogVerificationSecureIdTemplate },
    { dir: "changelog/references", fileName: "subscriptions.md", getTemplate: getChangelogSubscriptionsTemplate },
    { dir: "upgrade-advisor", getTemplate: getUpgradeAdvisorSkillTemplate },

    // --- End: validation, testing & troubleshooting ---
    { dir: "validation-and-testing", getTemplate: getValidationAndTestingSkillTemplate },
    { dir: "common-mistakes", getTemplate: getCommonMistakesSkillTemplate },
];
