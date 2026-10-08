export function isDemoMode(): boolean {
    return process.env.DEMO_MODE === "true";
}

export const DEMO_START_LIMIT = 10;
export const DEMO_START_WINDOW_MS = 60 * 60 * 1000;

export function getMaxActiveDemos(): number {
    const configured = Number(process.env.DEMO_MAX_ACTIVE);

    return Number.isInteger(configured) && configured > 0 ? configured : 100;
}