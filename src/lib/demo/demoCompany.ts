import { randomBytes } from "crypto";
import type { PrismaClient } from "../../generated/prisma/client";
import { Role, ToolStatus } from "../../generated/prisma/enums";
import { generateJoinCode } from "../tenancy/joinCode";

export const DEMO_TTL_MS = 24 * 60 * 60 * 1000;
export const DEMO_EMAIL_DOMAIN = "demo.invalid";

// Not a real hash, so no password can ever match it. Demo accounts are entered
// through the "Try the demo" button, never through the login form.
export const UNUSABLE_PASSWORD_HASH = "!";

const HOUR_MS = 1000 * 60 * 60;
const DAY_MS = HOUR_MS * 24;
const HISTORY_DAYS = 180;

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]): T {
    return items[randomInt(0, items.length - 1)];
}

function pickWeighted<T>(items: T[], weights: number[]): T {
    const total = weights.reduce((sum, w) => sum + w, 0);
    let roll = Math.random() * total;

    for (let i = 0; i < items.length; i++) {
        roll -= weights[i];
        if (roll <= 0) return items[i];
    }

    return items[items.length - 1];
}

function shuffle<T>(items: T[]): T[] {
    const copy = [...items];

    for (let i = copy.length - 1; i > 0; i--) {
        const j = randomInt(0, i);
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy;
}

function randomDateBetween(start: Date, end: Date): Date {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Mirrors the real business rule: due at 5pm the same day, or 5pm the next day if
// the tool goes out after 5pm.
function getCheckoutDueDate(checkedOutAt: Date): Date {
    const due = new Date(checkedOutAt);

    due.setHours(17, 0, 0, 0);

    if (due.getTime() <= checkedOutAt.getTime()) {
        due.setDate(due.getDate() + 1);
    }

    return due;
}

const TOOLS = [
    { name: "Cordless Drill", category: "Power Tools", location: "Shop 1", weight: 10 },
    { name: "Impact Driver", category: "Power Tools", location: "Shop 1", weight: 9 },
    { name: "Circular Saw", category: "Power Tools", location: "Shop 2", weight: 5 },
    { name: "Reciprocating Saw", category: "Power Tools", location: "Shop 2", weight: 4 },
    { name: "Shop Vacuum", category: "Power Tools", location: "Shop 1", weight: 6 },
    { name: "Pressure Washer", category: "Power Tools", location: "Shop 2", weight: 5 },
    { name: "Pipe Wrench Set", category: "Plumbing", location: "Shop 1", weight: 4 },
    { name: "Drain Snake", category: "Plumbing", location: "Shop 2", weight: 3 },
    { name: "Voltage Tester", category: "Electrical", location: "Shop 1", weight: 5 },
    { name: "Wire Strippers", category: "Electrical", location: "Shop 1", weight: 3 },
    { name: "Ladder (6ft)", category: "Hand Tools", location: "Leasing Office", weight: 6 },
    { name: "Ladder (10ft)", category: "Hand Tools", location: "Shop 2", weight: 4 },
    { name: "Hand Truck", category: "Hand Tools", location: "Leasing Office", weight: 3 },
    { name: "Leaf Blower", category: "Landscaping", location: "Shop 2", weight: 3 },
    { name: "Hedge Trimmer", category: "Landscaping", location: "Shop 2", weight: 2 },
];

// low: true leaves that item at or under its reorder level, so low-stock badges show.
const INVENTORY_ITEMS = [
    { name: "AA Batteries", category: "Batteries", location: "Shop 1", startQty: 60, reorderThreshold: 20, anomaly: true },
    { name: "9V Batteries", category: "Batteries", location: "Shop 1", startQty: 30, reorderThreshold: 10, low: true },
    { name: "Wire Nuts (assorted)", category: "Electrical Supplies", location: "Shop 1", startQty: 150, reorderThreshold: 40 },
    { name: "Electrical Outlets", category: "Electrical Supplies", location: "Shop 1", startQty: 40, reorderThreshold: 15 },
    { name: "HVAC Filter 16x20", category: "HVAC", location: "Shop 2", startQty: 25, reorderThreshold: 10 },
    { name: "HVAC Filter 20x25", category: "HVAC", location: "Shop 2", startQty: 25, reorderThreshold: 10 },
    { name: "Caulk (tubes)", category: "Plumbing Supplies", location: "Shop 2", startQty: 35, reorderThreshold: 10, low: true },
    { name: "Pipe Fittings (assorted)", category: "Plumbing Supplies", location: "Shop 2", startQty: 80, reorderThreshold: 25 },
    { name: "Drywall Screws (box)", category: "Fasteners", location: "Shop 1", startQty: 50, reorderThreshold: 15 },
    { name: "Wood Screws (box)", category: "Fasteners", location: "Shop 1", startQty: 50, reorderThreshold: 15 },
    { name: "Zip Ties (pack)", category: "Fasteners", location: "Shop 1", startQty: 40, reorderThreshold: 12 },
    { name: "Paint - Interior White (gal)", category: "Paint Supplies", location: "Shop 2", startQty: 15, reorderThreshold: 5 },
    { name: "Furnace Filter Wipes", category: "Cleaning Supplies", location: "Leasing Office", startQty: 20, reorderThreshold: 8 },
    { name: "Disinfectant Spray", category: "Cleaning Supplies", location: "Leasing Office", startQty: 24, reorderThreshold: 8 },
];

type PropertyPlan = {
    key: "riverside" | "maple";
    name: string;
    toolCount: number;
    itemCount: number;
    checkoutCount: number;
    hasAnomaly: boolean;
};

const PROPERTY_PLANS: PropertyPlan[] = [
    { key: "riverside", name: "Riverside Commons", toolCount: TOOLS.length, itemCount: INVENTORY_ITEMS.length, checkoutCount: 110, hasAnomaly: true },
    { key: "maple", name: "Maple Heights", toolCount: 9, itemCount: 10, checkoutCount: 55, hasAnomaly: false },
];

type StaffPlan = {
    slug: string;
    name: string;
    admin?: boolean;
    memberships: { property: PropertyPlan["key"]; role: Role }[];
    checkoutWeight?: number;
};

// The visitor is the admin. Everyone else is here so the Users page, the pending
// approvals, the floating technician, and the reports have something to show.
const STAFF: StaffPlan[] = [
    { slug: "admin", name: "Demo Admin", admin: true, memberships: [] },
    { slug: "carlos", name: "Carlos Vega", memberships: [{ property: "riverside", role: Role.SUPERVISOR }] },
    { slug: "tanya", name: "Tanya Brooks", memberships: [{ property: "maple", role: Role.MANAGER }] },
    { slug: "mike", name: "Mike Turner", checkoutWeight: 5, memberships: [{ property: "riverside", role: Role.TECHNICIAN }] },
    {
        slug: "priya",
        name: "Priya Nair",
        checkoutWeight: 4,
        memberships: [
            { property: "riverside", role: Role.TECHNICIAN },
            { property: "maple", role: Role.TECHNICIAN },
        ],
    },
    { slug: "jordan", name: "Jordan Lee", checkoutWeight: 3, memberships: [{ property: "riverside", role: Role.TECHNICIAN }] },
    { slug: "dev", name: "Dev Patel", checkoutWeight: 3, memberships: [{ property: "maple", role: Role.TECHNICIAN }] },
    { slug: "alex", name: "Alex Kim", memberships: [{ property: "riverside", role: Role.GUEST }] },
    { slug: "sam", name: "Sam Ortiz", memberships: [{ property: "maple", role: Role.GUEST }] },
];

export type DemoCompanyResult = {
    companyId: string;
    adminUserId: string;
    propertyIds: string[];
};

async function createUniqueJoinCode(prisma: PrismaClient): Promise<string> {
    for (let attempt = 0; attempt < 10; attempt++) {
        const joinCode = generateJoinCode();
        const taken = await prisma.property.findUnique({ where: { joinCode }, select: { id: true } });

        if (!taken) {
            return joinCode;
        }
    }

    throw new Error("Could not generate an unused join code.");
}

// Builds one private sandbox: its own company, two properties, staff at several
// roles, and six months of history. All of it is created in one transaction, so a
// failure leaves nothing behind.
export async function createDemoCompany(prisma: PrismaClient, now: Date = new Date()): Promise<DemoCompanyResult> {
    const token = randomBytes(6).toString("hex");
    const joinCodes = [await createUniqueJoinCode(prisma), await createUniqueJoinCode(prisma)];
    const start = new Date(now.getTime() - HISTORY_DAYS * DAY_MS);
    const historyEnd = new Date(now.getTime() - 3 * DAY_MS);

    return prisma.$transaction(
        async (tx) => {
            const company = await tx.company.create({
                data: { name: "Summit Residential (Demo)", isDemo: true, expiresAt: new Date(now.getTime() + DEMO_TTL_MS) },
            });

            const properties: { id: string; plan: PropertyPlan }[] = [];

            for (const [index, plan] of PROPERTY_PLANS.entries()) {
                const row = await tx.property.create({
                    data: { companyId: company.id, name: plan.name, joinCode: joinCodes[index] },
                });

                properties.push({ id: row.id, plan });
            }

            const users = await tx.user.createManyAndReturn({
                data: STAFF.map((person) => ({
                    companyId: company.id,
                    name: person.name,
                    email: `demo-${token}-${person.slug}@${DEMO_EMAIL_DOMAIN}`,
                    passwordHash: UNUSABLE_PASSWORD_HASH,
                    isCompanyAdmin: person.admin === true,
                })),
                select: { id: true, email: true },
            });

            const userBySlug = new Map(STAFF.map((person) => [person.slug, users.find((u) => u.email.includes(`-${person.slug}@`))!.id]));
            const propertyId = (key: PropertyPlan["key"]) => properties.find((p) => p.plan.key === key)!.id;

            await tx.propertyMembership.createMany({
                data: STAFF.flatMap((person) =>
                    person.memberships.map((m) => ({ userId: userBySlug.get(person.slug)!, propertyId: propertyId(m.property), role: m.role })),
                ),
            });

            for (const { id, plan } of properties) {
                const members = STAFF.filter((person) => person.memberships.some((m) => m.property === plan.key));
                const techs = members.filter((person) => person.memberships.find((m) => m.property === plan.key)!.role === Role.TECHNICIAN);
                const leads = members.filter((person) => {
                    const role = person.memberships.find((m) => m.property === plan.key)!.role;

                    return role === Role.SUPERVISOR || role === Role.MANAGER;
                });
                const techIds = techs.map((person) => userBySlug.get(person.slug)!);
                const leadIds = leads.map((person) => userBySlug.get(person.slug)!);

                // ---- tools and their checkout history
                const tools = await tx.tool.createManyAndReturn({
                    data: TOOLS.slice(0, plan.toolCount).map((tool) => ({ propertyId: id, name: tool.name, category: tool.category, location: tool.location })),
                    select: { id: true, name: true },
                });
                const toolWeights = new Map(TOOLS.map((tool) => [tool.name, tool.weight]));

                const checkouts: {
                    propertyId: string;
                    toolId: string;
                    userId: string;
                    checkedOutAt: Date;
                    dueAt: Date;
                    returnedAt: Date | null;
                }[] = [];

                const jordanId = userBySlug.get("jordan")!;
                const pressureWasher = tools.find((tool) => tool.name === "Pressure Washer");

                // Jordan almost always returns the pressure washer late, so the usage
                // report has something worth noticing. Fixed counts keep it from depending on luck.
                if (plan.hasAnomaly && pressureWasher) {
                    for (let i = 0; i < 8; i++) {
                        const checkedOutAt = randomDateBetween(start, historyEnd);
                        const dueAt = getCheckoutDueDate(checkedOutAt);
                        const late = i < 7;

                        checkouts.push({
                            propertyId: id,
                            toolId: pressureWasher.id,
                            userId: jordanId,
                            checkedOutAt,
                            dueAt,
                            returnedAt: late ? new Date(dueAt.getTime() + randomInt(2, 30) * HOUR_MS) : randomDateBetween(checkedOutAt, dueAt),
                        });
                    }
                }

                for (let i = 0; i < plan.checkoutCount; i++) {
                    const tool = pickWeighted(tools, tools.map((t) => toolWeights.get(t.name) ?? 3));
                    const personId = pickWeighted(techIds, techs.map((p) => p.checkoutWeight ?? 3));

                    // The anomaly pair is written separately above, so chance can't dilute it.
                    if (plan.hasAnomaly && personId === jordanId && tool === pressureWasher) {
                        continue;
                    }

                    const checkedOutAt = randomDateBetween(start, historyEnd);
                    const dueAt = getCheckoutDueDate(checkedOutAt);
                    const late = Math.random() < 0.12;

                    checkouts.push({
                        propertyId: id,
                        toolId: tool.id,
                        userId: personId,
                        checkedOutAt,
                        dueAt,
                        returnedAt: late ? new Date(dueAt.getTime() + randomInt(2, 30) * HOUR_MS) : randomDateBetween(checkedOutAt, dueAt),
                    });
                }

                // One tool is under maintenance, and three are still out: the first just
                // went out today, and two are overdue.
                const maintenanceTool = tools.find((tool) => tool.name === "Drain Snake");
                const openTools = shuffle(tools.filter((tool) => tool !== maintenanceTool)).slice(0, 3);

                openTools.forEach((tool, index) => {
                    const checkedOutAt = index === 0 ? now : new Date(now.getTime() - randomInt(1, 3) * DAY_MS);

                    checkouts.push({
                        propertyId: id,
                        toolId: tool.id,
                        userId: pick(techIds),
                        checkedOutAt,
                        dueAt: getCheckoutDueDate(checkedOutAt),
                        returnedAt: null,
                    });
                });

                await tx.checkout.createMany({ data: checkouts });
                await tx.tool.updateMany({ where: { id: { in: openTools.map((tool) => tool.id) } }, data: { status: ToolStatus.CHECKED_OUT } });

                if (maintenanceTool) {
                    await tx.tool.update({ where: { id: maintenanceTool.id }, data: { status: ToolStatus.MAINTENANCE } });
                }

                // ---- inventory and its adjustment history
                const catalog = INVENTORY_ITEMS.slice(0, plan.itemCount);
                const adjustments: {
                    propertyId: string;
                    itemId: string;
                    userId: string;
                    changeAmount: number;
                    resultingQuantity: number;
                    note: string | null;
                    createdAt: Date;
                }[] = [];
                const finalQuantities: { id: string; quantity: number }[] = [];

                const items = await tx.inventoryItem.createManyAndReturn({
                    data: catalog.map((item) => ({
                        propertyId: id,
                        name: item.name,
                        category: item.category,
                        location: item.location,
                        quantity: item.startQty,
                        reorderThreshold: item.reorderThreshold,
                    })),
                    select: { id: true, name: true },
                });

                for (const item of catalog) {
                    const itemId = items.find((row) => row.name === item.name)!.id;
                    const anomaly = plan.hasAnomaly && item.anomaly === true;
                    const events: { date: Date; amount: number; userId: string; note: string | null }[] = [];

                    for (let cursor = new Date(start); cursor < now; cursor = new Date(cursor.getTime() + randomInt(20, 40) * DAY_MS)) {
                        events.push({
                            date: new Date(cursor),
                            amount: anomaly ? randomInt(80, 140) : randomInt(15, 40),
                            userId: pick(leadIds),
                            note: "Restock",
                        });
                    }

                    const usageCount = anomaly ? randomInt(70, 90) : randomInt(12, 24);

                    for (let i = 0; i < usageCount; i++) {
                        events.push({
                            date: randomDateBetween(start, now),
                            amount: anomaly ? -randomInt(4, 12) : -randomInt(1, 4),
                            userId: Math.random() < 0.85 ? pick(techIds) : pick(leadIds),
                            note: null,
                        });
                    }

                    events.sort((a, b) => a.date.getTime() - b.date.getTime());

                    let runningQty = item.startQty;

                    for (const event of events) {
                        // Usage never takes the count below zero.
                        const amount = runningQty + event.amount < 0 ? -runningQty : event.amount;

                        runningQty += amount;

                        if (amount === 0) continue;

                        adjustments.push({
                            propertyId: id,
                            itemId,
                            userId: event.userId,
                            changeAmount: amount,
                            resultingQuantity: runningQty,
                            note: event.note,
                            createdAt: event.date,
                        });
                    }

                    // A last usage event leaves the flagged items running low.
                    if (item.low && runningQty > item.reorderThreshold) {
                        const target = Math.max(0, item.reorderThreshold - randomInt(1, 3));

                        adjustments.push({
                            propertyId: id,
                            itemId,
                            userId: pick(techIds),
                            changeAmount: target - runningQty,
                            resultingQuantity: target,
                            note: null,
                            createdAt: new Date(now.getTime() - HOUR_MS),
                        });
                        runningQty = target;
                    }

                    finalQuantities.push({ id: itemId, quantity: runningQty });
                }

                await tx.inventoryAdjustment.createMany({ data: adjustments });

                for (const { id: itemId, quantity } of finalQuantities) {
                    await tx.inventoryItem.update({ where: { id: itemId }, data: { quantity } });
                }
            }

            return {
                companyId: company.id,
                adminUserId: userBySlug.get("admin")!,
                propertyIds: properties.map((p) => p.id),
            };
        },
        { timeout: 60_000, maxWait: 10_000 },
    );
}

// Removes a sandbox and everything in it. It refuses anything that isn't flagged as
// a demo, so a bug elsewhere can never delete a real company through this path.
export async function deleteDemoCompany(prisma: PrismaClient, companyId: string): Promise<void> {
    const company = await prisma.company.findUnique({ where: { id: companyId }, select: { isDemo: true } });

    if (!company) {
        return;
    }

    if (!company.isDemo) {
        throw new Error("Refusing to delete a company that isn't a demo.");
    }

    await prisma.$transaction([
        prisma.session.deleteMany({ where: { user: { companyId } } }),
        prisma.inventoryAdjustment.deleteMany({ where: { property: { companyId } } }),
        prisma.checkout.deleteMany({ where: { property: { companyId } } }),
        prisma.propertyMembership.deleteMany({ where: { property: { companyId } } }),
        prisma.inventoryItem.deleteMany({ where: { property: { companyId } } }),
        prisma.tool.deleteMany({ where: { property: { companyId } } }),
        prisma.user.deleteMany({ where: { companyId } }),
        prisma.property.deleteMany({ where: { companyId } }),
        prisma.company.delete({ where: { id: companyId } }),
    ]);
}

// Deletes sandboxes whose time is up, a few at a time so one call stays quick.
export async function purgeExpiredDemos(prisma: PrismaClient, now: Date = new Date(), limit = 25): Promise<number> {
    const expired = await prisma.company.findMany({
        where: { isDemo: true, expiresAt: { lt: now } },
        select: { id: true },
        orderBy: { expiresAt: "asc" },
        take: limit,
    });

    for (const company of expired) {
        await deleteDemoCompany(prisma, company.id);
    }

    return expired.length;
}

export async function countActiveDemos(prisma: PrismaClient, now: Date = new Date()): Promise<number> {
    return prisma.company.count({ where: { isDemo: true, expiresAt: { gte: now } } });
}