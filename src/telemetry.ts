import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
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
}

interface BuildBaseEventInput {
    distinctId: string;
    cliVersion: string;
    selectionMode: SelectionMode;
    selectedFrameworks: Framework[];
}

const DEFAULT_POSTHOG_HOST = "__POSTHOG_HOST__";
const DEFAULT_POSTHOG_API_KEY = "__POSTHOG_API_KEY__";
const WORKER_PAYLOAD_ENV = "CASHFREE_POSTHOG_BATCH_PAYLOAD";
const WORKER_HOST_ENV = "CASHFREE_POSTHOG_WORKER_HOST";
const WORKER_CODE = `
const payload = process.env.${WORKER_PAYLOAD_ENV};
const host = process.env.${WORKER_HOST_ENV};

if (!payload || !host) {
  process.exit(0);
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 1500);

try {
  await fetch(new URL("/batch/", host).toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: payload,
    signal: controller.signal,
  });
} catch {
  // Fail silently. Telemetry must never affect installs.
} finally {
  clearTimeout(timeout);
}
`;

export function createTelemetryDistinctId(): string {
    return randomUUID();
}

export function isTelemetryEnabled(): boolean {
    return Boolean(
        DEFAULT_POSTHOG_API_KEY &&
        DEFAULT_POSTHOG_HOST &&
        DEFAULT_POSTHOG_API_KEY !== "__POSTHOG_API_KEY__" &&
        DEFAULT_POSTHOG_HOST !== "__POSTHOG_HOST__"
    );
}

function buildBaseProperties({
    distinctId,
    cliVersion,
    selectionMode,
    selectedFrameworks,
}: BuildBaseEventInput): Record<string, unknown> {
    return {
        distinct_id: distinctId,
        $process_person_profile: false,
        cli_version: cliVersion,
        selection_mode: selectionMode,
        selected_frameworks: selectedFrameworks,
        selected_framework_count: selectedFrameworks.length,
        node_version: process.version,
        platform: process.platform,
        arch: process.arch,
        os_release: os.release(),
    };
}

export function createInstallStartedEvent(input: BuildBaseEventInput): InstallTelemetryEvent {
    return {
        event: "agent_skills_install_started",
        properties: buildBaseProperties(input),
        timestamp: new Date().toISOString(),
    };
}

export function createFrameworkSelectedEvents(input: BuildBaseEventInput): InstallTelemetryEvent[] {
    return input.selectedFrameworks.map((framework) => ({
        event: "agent_skills_framework_selected",
        properties: {
            ...buildBaseProperties(input),
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
            ...buildBaseProperties(input),
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
            ...buildBaseProperties(input),
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
            ...buildBaseProperties(input),
            succeeded_frameworks: succeededFrameworks,
            succeeded_framework_count: succeededFrameworks.length,
            failed_frameworks: failedFrameworks,
            failed_framework_count: failedFrameworks.length,
        },
        timestamp: new Date().toISOString(),
    };
}

export function createProgressFeedbackSubmittedEvent(
    input: ProgressFeedbackTelemetryInput
): InstallTelemetryEvent {
    return {
        event: "agent_skills_progress_feedback_submitted",
        properties: {
            distinct_id: randomUUID(),
            $process_person_profile: false,
            cli_version: input.cliVersion,
            flow: input.flow,
            skills_used: input.skillsUsed,
            skills_used_count: input.skillsUsed.length,
            completed_steps: input.completedSteps,
            completed_steps_count: input.completedSteps.length,
            pending_steps: input.pendingSteps,
            pending_steps_count: input.pendingSteps.length,
            llm_feedback: input.llmFeedback,
            llm_feedback_length: input.llmFeedback.length,
            node_version: process.version,
            platform: process.platform,
            arch: process.arch,
            os_release: os.release(),
        },
        timestamp: new Date().toISOString(),
    };
}

export function sendTelemetryEventsInBackground(
    events: InstallTelemetryEvent[],
    env: NodeJS.ProcessEnv = process.env
): void {
    if (!events.length || !isTelemetryEnabled()) {
        return;
    }

    if (!DEFAULT_POSTHOG_API_KEY) {
        return;
    }

    const payload = JSON.stringify({
        api_key: DEFAULT_POSTHOG_API_KEY,
        historical_migration: false,
        batch: events.map((event) => ({
            event: event.event,
            properties: event.properties,
            timestamp: event.timestamp,
        })),
    });

    const child = spawn(
        process.execPath,
        ["--input-type=module", "-e", WORKER_CODE],
        {
            detached: true,
            stdio: "ignore",
            env: {
                ...env,
                [WORKER_PAYLOAD_ENV]: payload,
                [WORKER_HOST_ENV]: DEFAULT_POSTHOG_HOST,
            },
        }
    );

    child.unref();
}
