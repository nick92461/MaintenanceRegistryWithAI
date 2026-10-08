// Per-case context for the runner. Cases run concurrently, so the stubbed data layer reads which registry,
// settings and property to use from here rather than from module-level state.

import { AsyncLocalStorage } from "node:async_hooks";
import type { RegistryKey } from "./registry";

export type CallRecord = {
    request: { system?: unknown; messages?: unknown[]; max_tokens?: number } | null;
    status: number;
    model?: string;
    stopReason?: string;
    content?: unknown[];
    usage?: { input_tokens: number; output_tokens: number };
    ms: number;
};

export type EvalStore = {
    registry: RegistryKey;
    demo: boolean;
    propertyId: string;
    companyId: string;
    calls: CallRecord[];
};

export const evalContext = new AsyncLocalStorage<EvalStore>();
