#!/usr/bin/env node
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const distFile = join(__dirname, "../dist/telemetry.js");

const baseUrl = process.env.CASHFREE_TELEMETRY_BASE_URL;

if (!baseUrl) {
    console.error("inject-telemetry: CASHFREE_TELEMETRY_BASE_URL is not set — refusing to publish without telemetry config.");
    process.exit(1);
}

let content = readFileSync(distFile, "utf8");
content = content.replace("__TELEMETRY_BASE_URL__", baseUrl);
writeFileSync(distFile, content, "utf8");

console.log("inject-telemetry: base URL injected successfully.");
