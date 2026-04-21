#!/usr/bin/env node
/**
 * Replaces __POSTHOG_HOST__ and __POSTHOG_API_KEY__ placeholders in dist/
 * with values from CASHFREE_POSTHOG_HOST and CASHFREE_POSTHOG_API_KEY env vars.
 * Run after `tsc` during publish — never committed with real values.
 */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distFile = join(__dirname, "../dist/telemetry.js");

const host = process.env.CASHFREE_POSTHOG_HOST;
const apiKey = process.env.CASHFREE_POSTHOG_API_KEY;

if (!host || !apiKey) {
    console.error("inject-telemetry: CASHFREE_POSTHOG_HOST or CASHFREE_POSTHOG_API_KEY not set — skipping injection.");
    process.exit(0);
}

let content = readFileSync(distFile, "utf8");
content = content.replace("__POSTHOG_HOST__", host);
content = content.replace("__POSTHOG_API_KEY__", apiKey);
writeFileSync(distFile, content, "utf8");

console.log("inject-telemetry: placeholders replaced successfully.");
