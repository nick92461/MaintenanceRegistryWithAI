import { describe, it, expect, vi, beforeEach } from "vitest";

const findCompany = vi.fn();
const count = { tool: vi.fn(), inventoryItem: vi.fn(), checkout: vi.fn(), inventoryAdjustment: vi.fn() };

vi.mock("@/lib/prisma", () => ({
    prisma: {
        company: { findUnique: (...args: unknown[]) => findCompany(...args) },
        tool: { count: (...args: unknown[]) => count.tool(...args) },
        inventoryItem: { count: (...args: unknown[]) => count.inventoryItem(...args) },
        checkout: { count: (...args: unknown[]) => count.checkout(...args) },
        inventoryAdjustment: { count: (...args: unknown[]) => count.inventoryAdjustment(...args) },
    },
}));

const { DEMO_ROW_CAPS, demoRowCapMessage, hasOverlongDemoText } = await import("./rowCaps");

beforeEach(() => {
    findCompany.mockReset();
    findCompany.mockResolvedValue({ isDemo: true });
    Object.values(count).forEach((fn) => {
        fn.mockReset();
        fn.mockResolvedValue(0);
    });
    vi.stubEnv("DEMO_MODE", "true");
});

describe("demoRowCapMessage", () => {
    it("allows everything, without touching the database, when demo mode is off", async () => {
        vi.stubEnv("DEMO_MODE", "");

        expect(await demoRowCapMessage("c1", "tools", 10_000)).toBeNull();
        expect(findCompany).not.toHaveBeenCalled();
        expect(count.tool).not.toHaveBeenCalled();
    });

    it("allows everything for a company that isn't a demo sandbox", async () => {
        findCompany.mockResolvedValue({ isDemo: false });

        expect(await demoRowCapMessage("c1", "tools", 10_000)).toBeNull();
        expect(count.tool).not.toHaveBeenCalled();
    });

    it("allows a company that can't be found, since access was already checked", async () => {
        findCompany.mockResolvedValue(null);

        expect(await demoRowCapMessage("missing", "tools")).toBeNull();
    });

    it("allows an add that lands exactly on the cap and refuses one more", async () => {
        count.tool.mockResolvedValue(DEMO_ROW_CAPS.tools - 1);
        expect(await demoRowCapMessage("c1", "tools")).toBeNull();

        count.tool.mockResolvedValue(DEMO_ROW_CAPS.tools);
        expect(await demoRowCapMessage("c1", "tools")).toContain("100 tools");
    });

    it("counts a batch as a whole: refuses it if it would go over, even though room remains", async () => {
        count.inventoryItem.mockResolvedValue(90);

        expect(await demoRowCapMessage("c1", "inventoryItems", 10)).toBeNull();
        expect(await demoRowCapMessage("c1", "inventoryItems", 11)).toContain("100 inventory items");
    });

    it("counts the right table for each kind, scoped to the company", async () => {
        const where = { property: { companyId: "c1" } };

        await demoRowCapMessage("c1", "tools");
        await demoRowCapMessage("c1", "inventoryItems");
        await demoRowCapMessage("c1", "checkouts");
        await demoRowCapMessage("c1", "adjustments");

        expect(count.tool).toHaveBeenCalledWith({ where });
        expect(count.inventoryItem).toHaveBeenCalledWith({ where });
        expect(count.checkout).toHaveBeenCalledWith({ where });
        expect(count.inventoryAdjustment).toHaveBeenCalledWith({ where });
    });

    it("has a message for the history tables too", async () => {
        count.checkout.mockResolvedValue(DEMO_ROW_CAPS.checkouts);
        count.inventoryAdjustment.mockResolvedValue(DEMO_ROW_CAPS.adjustments);

        expect(await demoRowCapMessage("c1", "checkouts")).toContain("1000 checkouts");
        expect(await demoRowCapMessage("c1", "adjustments")).toContain("2500 quantity changes");
    });
});

describe("hasOverlongDemoText", () => {
    it("is false outside the demo, whatever the length", () => {
        vi.stubEnv("DEMO_MODE", "");

        expect(hasOverlongDemoText(["a".repeat(5000)])).toBe(false);
    });

    it("allows exactly the limit and refuses one more, for any value in the list", () => {
        expect(hasOverlongDemoText(["a".repeat(100), "ok"])).toBe(false);
        expect(hasOverlongDemoText(["ok", "a".repeat(101)])).toBe(true);
    });

    it("ignores values that aren't strings", () => {
        expect(hasOverlongDemoText([undefined, null, 12345, { length: 9999 }])).toBe(false);
    });

    it("uses the limit it's given", () => {
        expect(hasOverlongDemoText(["a".repeat(150)], 200)).toBe(false);
        expect(hasOverlongDemoText(["a".repeat(201)], 200)).toBe(true);
    });
});