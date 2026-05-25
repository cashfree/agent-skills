import { randomUUID } from "node:crypto";
import os from "node:os";
import type { Framework } from "./config.js";

export type SelectionMode = "interactive" | "flag";

export interface InstallTelemetryEvent {
    event: string;
    properties: Record<string, unknown>;
    timestamp: string;
}

export interface ProgressFeedbackTelemetryInput {
    cliVersion: string;
    flow: string;
    skillsUsed: string[];
    completedSteps: string[];
    pendingSteps: string[];
    llmFeedback: string;
    appId?: string;
}

export function deriveMerchantId(value: string): number {
    const trimmed = value.trim().replace(/^TEST/i, "");
    if (trimmed.length === 0) return 0;

    let merchantId = "";
    let left = 0;
    let right = trimmed.length - 1;

    while (left <= right) {
        const leftChar = trimmed[left];
        const rightChar = trimmed[right];
        if (!leftChar || !rightChar || !/\d/.test(leftChar) || leftChar !== rightChar) break;
        merchantId += leftChar;
        left++;
        right--;
    }

    return merchantId.length > 0 ? Number.parseInt(merchantId, 10) : 0;
}

interface BuildBaseEventInput {
    distinctId: string;
    cliVersion: string;
    selectionMode: SelectionMode;
    selectedFrameworks: Framework[];
}

const TELEMETRY_BASE_URL = "__TELEMETRY_BASE_URL__";

const EVENT_ENDPOINTS: Record<string, string> = {
    "agent_skills_install_started":               "/telemetry/agent-skills-install/started",
    "agent_skills_framework_selected":            "/telemetry/agent-skills-install/framework-selected",
    "agent_skills_framework_install_succeeded":   "/telemetry/agent-skills-install/framework-succeeded",
    "agent_skills_framework_install_failed":      "/telemetry/agent-skills-install/framework-failed",
    "agent_skills_install_completed":             "/telemetry/agent-skills-install/completed",
    "agent_skills_progress_feedback_submitted":   "/telemetry/agent-skills-progress-feedback",
};

export function createTelemetryDistinctId(): string {
    return randomUUID();
}

export function isTelemetryEnabled(): boolean {
    return TELEMETRY_BASE_URL.length > 0 && !TELEMETRY_BASE_URL.startsWith("__TELEMETRY_");
}

function buildSystemProperties(distinctId: string, cliVersion: string): Record<string, unknown> {
    return {
        distinct_id: distinctId,
        cli_version: cliVersion,
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        os_release: os.release(),
    };
}

export function createInstallStartedEvent(input: BuildBaseEventInput): InstallTelemetryEvent {
    return {
        event: "agent_skills_install_started",
        properties: {
            ...buildSystemProperties(input.distinctId, input.cliVersion),
            selection_mode: input.selectionMode,
            selected_frameworks: input.selectedFrameworks,
        },
        timestamp: new Date().toISOString(),
    };
}

export function createFrameworkSelectedEvents(input: BuildBaseEventInput): InstallTelemetryEvent[] {
    return input.selectedFrameworks.map((framework) => ({
        event: "agent_skills_framework_selected",
        properties: {
            ...buildSystemProperties(input.distinctId, input.cliVersion),
            framework,
        },
        timestamp: new Date().toISOString(),
    }));
}

export function createFrameworkSucceededEvent(
    input: BuildBaseEventInput,
    framework: Framework
): InstallTelemetryEvent {
    return {
        event: "agent_skills_framework_install_succeeded",
        properties: {
            ...buildSystemProperties(input.distinctId, input.cliVersion),
            framework,
        },
        timestamp: new Date().toISOString(),
    };
}

export function createFrameworkFailedEvent(
    input: BuildBaseEventInput,
    framework: Framework,
    error: unknown
): InstallTelemetryEvent {
    return {
        event: "agent_skills_framework_install_failed",
        properties: {
            ...buildSystemProperties(input.distinctId, input.cliVersion),
            framework,
            error_type: error instanceof Error ? error.name : "UnknownError",
        },
        timestamp: new Date().toISOString(),
    };
}

export function createInstallCompletedEvent(
    input: BuildBaseEventInput,
    succeededFrameworks: Framework[],
    failedFrameworks: Framework[]
): InstallTelemetryEvent {
    return {
        event: "agent_skills_install_completed",
        properties: {
            ...buildSystemProperties(input.distinctId, input.cliVersion),
            succeeded_frameworks: succeededFrameworks,
            failed_frameworks: failedFrameworks,
        },
        timestamp: new Date().toISOString(),
    };
}

export function createProgressFeedbackSubmittedEvent(
    input: ProgressFeedbackTelemetryInput
): InstallTelemetryEvent {
    const merchantId = input.appId ? deriveMerchantId(input.appId) : undefined;

    return {
        event: "agent_skills_progress_feedback_submitted",
        properties: {
            ...buildSystemProperties(randomUUID(), input.cliVersion),
            flow: input.flow,
            skills_used: input.skillsUsed,
            completed_steps: input.completedSteps,
            pending_steps: input.pendingSteps,
            llm_feedback: input.llmFeedback,
            ...(merchantId !== undefined && merchantId > 0 && { merchant_id: merchantId }),
            ...(input.appId && { app_id: input.appId }),
        },
        timestamp: new Date().toISOString(),
    };
}

function buildTelemetryUrl(base: string, endpoint: string): string {
    const trimmedBase = base.replace(/\/+$/, "");
    const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${trimmedBase}${normalizedEndpoint}`;
}

export async function sendTelemetryEvents(
    events: InstallTelemetryEvent[],
): Promise<void> {
    if (!events.length || !isTelemetryEnabled()) {
        return;
    }

    await Promise.allSettled(
        events.map(async (event) => {
            const endpoint = EVENT_ENDPOINTS[event.event];
            if (!endpoint) return;

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);

            try {
                await fetch(buildTelemetryUrl(TELEMETRY_BASE_URL, endpoint), {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(event.properties),
                    signal: controller.signal,
                });
            } catch {
                // Fail silently. Telemetry must never affect installs.
            } finally {
                clearTimeout(timeout);
            }
        })
    );
}
