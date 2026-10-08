import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const purgeExpiredDemos = vi.fn();

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/demo/demoCompany", () => ({ purgeExpiredDemos: (...args: unknown[]) => purgeExpiredDemos(...args) }));

const { GET } = await import("./route");

const SECRET = "a-long-random-secret-value";
const call = (authorization?: string) =>
    GET(new NextRequest("http://localhost/api/demo/cleanup", { headers: authorization ? { authorization } : {} }));

beforeEach(() => {
    purgeExpiredDemos.mockReset();
    purgeExpiredDemos.mockResolvedValue(0);
    vi.stubEnv("DEMO_MODE", "true");
    vi.stubEnv("CRON_SECRET", SECRET);
});

describe("GET /api/demo/cleanup", () => {
    it("does nothing outside demo mode, even with the right secret", async () => {
        vi.stubEnv("DEMO_MODE", "");

        expect((await call(`Bearer ${SECRET}`)).status).toBe(404);
        expect(purgeExpiredDemos).not.toHaveBeenCalled();
    });

    it("rejects a missing or wrong secret without touching the database", async () => {
        expect((await call()).status).toBe(401);
        expect((await call("Bearer wrong-wrong-wrong-wrong")).status).toBe(401);
        expect(purgeExpiredDemos).not.toHaveBeenCalled();
    });

    it("rejects everything when no secret is configured", async () => {
        vi.stubEnv("CRON_SECRET", "");

        expect((await call("Bearer ")).status).toBe(401);
        expect(purgeExpiredDemos).not.toHaveBeenCalled();
    });

    it("purges in batches until a batch comes back short, and reports the total", async () => {
        purgeExpiredDemos.mockResolvedValueOnce(25).mockResolvedValueOnce(25).mockResolvedValueOnce(3);

        const res = await call(`Bearer ${SECRET}`);

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ purged: 53 });
        expect(purgeExpiredDemos).toHaveBeenCalledTimes(3);
    });

    it("reports zero when nothing has expired", async () => {
        const res = await call(`Bearer ${SECRET}`);

        expect(await res.json()).toEqual({ purged: 0 });
        expect(purgeExpiredDemos).toHaveBeenCalledTimes(1);
    });
});