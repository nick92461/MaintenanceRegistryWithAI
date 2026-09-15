import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Role, ToolStatus } from "../src/generated/prisma/enums";
import { hashPassword } from "../src/lib/auth/passwords";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Password123!";
const TWO_YEARS_MS = 1000 * 60 * 60 * 24 * 365 * 2;
const NOW = new Date();
const START = new Date(NOW.getTime() - TWO_YEARS_MS);

const LOCATIONS = ["Shop 1", "Shop 2", "Leasing Office"];

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

function randomDateBetween(start: Date, end: Date): Date {
	return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Mirrors the real business rule in src/lib/actions/tools.ts: due at 5pm the
// same day, rolling to 5pm the next day if checkout happens after 5pm.
function getCheckoutDueDate(checkedOutAt: Date): Date {
	const due = new Date(checkedOutAt);
	due.setHours(17, 0, 0, 0);
	if (due.getTime() <= checkedOutAt.getTime()) {
		due.setDate(due.getDate() + 1);
	}
	return due;
}

const USERS = [
	{ name: "Denise Ramirez", email: "manager@example.com", role: Role.MANAGER },
	{ name: "Carlos Vega", email: "supervisor@example.com", role: Role.SUPERVISOR },
	{ name: "Mike Turner", email: "tech1@example.com", role: Role.TECHNICIAN },
	{ name: "Priya Nair", email: "tech2@example.com", role: Role.TECHNICIAN },
	{ name: "Jordan Lee", email: "tech3@example.com", role: Role.TECHNICIAN },
	{ name: "Alex Kim", email: "guest@example.com", role: Role.GUEST },
];

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

const INVENTORY_ITEMS = [
	{ name: "AA Batteries", category: "Batteries", location: "Shop 1", startQty: 60, reorderThreshold: 20, anomaly: true },
	{ name: "9V Batteries", category: "Batteries", location: "Shop 1", startQty: 30, reorderThreshold: 10 },
	{ name: "Wire Nuts (assorted)", category: "Electrical Supplies", location: "Shop 1", startQty: 150, reorderThreshold: 40 },
	{ name: "Electrical Outlets", category: "Electrical Supplies", location: "Shop 1", startQty: 40, reorderThreshold: 15 },
	{ name: "HVAC Filter 16x20", category: "HVAC", location: "Shop 2", startQty: 25, reorderThreshold: 10 },
	{ name: "HVAC Filter 20x25", category: "HVAC", location: "Shop 2", startQty: 25, reorderThreshold: 10 },
	{ name: "Caulk (tubes)", category: "Plumbing Supplies", location: "Shop 2", startQty: 35, reorderThreshold: 10 },
	{ name: "Pipe Fittings (assorted)", category: "Plumbing Supplies", location: "Shop 2", startQty: 80, reorderThreshold: 25 },
	{ name: "Drywall Screws (box)", category: "Fasteners", location: "Shop 1", startQty: 50, reorderThreshold: 15 },
	{ name: "Wood Screws (box)", category: "Fasteners", location: "Shop 1", startQty: 50, reorderThreshold: 15 },
	{ name: "Zip Ties (pack)", category: "Fasteners", location: "Shop 1", startQty: 40, reorderThreshold: 12 },
	{ name: "Paint - Interior White (gal)", category: "Paint Supplies", location: "Shop 2", startQty: 15, reorderThreshold: 5 },
	{ name: "Furnace Filter Wipes", category: "Cleaning Supplies", location: "Leasing Office", startQty: 20, reorderThreshold: 8 },
	{ name: "Disinfectant Spray", category: "Cleaning Supplies", location: "Leasing Office", startQty: 24, reorderThreshold: 8 },
];

async function seedUsers() {
	const passwordHash = await hashPassword(DEMO_PASSWORD);
	const created: Record<string, { id: string; role: Role }> = {};

	for (const user of USERS) {
		const row = await prisma.user.create({
			data: { name: user.name, email: user.email, passwordHash, role: user.role },
		});
		created[user.email] = { id: row.id, role: row.role };
	}

	return created;
}

async function seedTools() {
	const created: { id: string; name: string; weight: number }[] = [];

	for (const tool of TOOLS) {
		const row = await prisma.tool.create({
			data: { name: tool.name, category: tool.category, location: tool.location },
		});
		created.push({ id: row.id, name: row.name, weight: tool.weight });
	}

	return created;
}

async function seedInventoryItems() {
	const created: { id: string; name: string; startQty: number; anomaly: boolean }[] = [];

	for (const item of INVENTORY_ITEMS) {
		const row = await prisma.inventoryItem.create({
			data: {
				name: item.name,
				category: item.category,
				location: item.location,
				quantity: item.startQty,
				reorderThreshold: item.reorderThreshold,
			},
		});
		created.push({ id: row.id, name: row.name, startQty: item.startQty, anomaly: !!item.anomaly });
	}

	return created;
}

async function seedCheckouts(
	tools: { id: string; name: string; weight: number }[],
	techs: { id: string; email: string }[],
) {
	const jordan = techs.find((t) => t.email === "tech3@example.com")!;
	const pressureWasher = tools.find((t) => t.name === "Pressure Washer")!;
	const techWeights = [5, 4, 3]; // Mike busiest, Jordan least busy overall

	const checkoutRows: {
		toolId: string;
		userId: string;
		checkedOutAt: Date;
		dueAt: Date;
		returnedAt: Date | null;
	}[] = [];

	const totalCheckouts = 450;

	for (let i = 0; i < totalCheckouts; i++) {
		const tool = pickWeighted(tools, tools.map((t) => t.weight));
		const user = pickWeighted(techs, techWeights);
		const checkedOutAt = randomDateBetween(START, NOW);
		const dueAt = getCheckoutDueDate(checkedOutAt);

		const isAnomalyPair = user.id === jordan.id && tool.id === pressureWasher.id;
		const isLate = isAnomalyPair ? Math.random() < 0.85 : Math.random() < 0.12;

		const lateHours = isLate ? randomInt(2, 30) : -randomInt(0, 4);
		const returnedAt = new Date(dueAt.getTime() + lateHours * 60 * 60 * 1000);

		checkoutRows.push({ toolId: tool.id, userId: user.id, checkedOutAt, dueAt, returnedAt });
	}

	// Leave a handful of checkouts still open: two overdue, one not yet due.
	const openTools = pick(tools);
	const stillOpenIndexes = new Set<number>();
	while (stillOpenIndexes.size < 3) {
		stillOpenIndexes.add(randomInt(checkoutRows.length - 30, checkoutRows.length - 1));
	}

	let openCount = 0;
	const openToolIds: string[] = [];
	for (const index of stillOpenIndexes) {
		const row = checkoutRows[index];
		row.checkedOutAt = new Date(NOW.getTime() - randomInt(1, 4) * 24 * 60 * 60 * 1000);
		row.dueAt = getCheckoutDueDate(row.checkedOutAt);
		row.returnedAt = openCount === 0 ? new Date(NOW.getTime() + 2 * 24 * 60 * 60 * 1000) : null; // first one not yet due, keep returnedAt null too below
		row.returnedAt = null;
		openToolIds.push(row.toolId);
		openCount++;
	}

	await prisma.checkout.createMany({ data: checkoutRows });

	// Sync Tool.status for the tools left "currently checked out."
	await prisma.tool.updateMany({
		where: { id: { in: openToolIds } },
		data: { status: ToolStatus.CHECKED_OUT },
	});

	// One tool permanently under maintenance, with no checkout history.
	const maintenanceTool = tools.find((t) => !openToolIds.includes(t.id) && t.name === "Drain Snake");
	if (maintenanceTool) {
		await prisma.tool.update({ where: { id: maintenanceTool.id }, data: { status: ToolStatus.MAINTENANCE } });
	}

	// One soft-deleted tool, retired from the fleet.
	const retiredTool = tools.find((t) => !openToolIds.includes(t.id) && t.name === "Hedge Trimmer");
	if (retiredTool) {
		await prisma.tool.update({ where: { id: retiredTool.id }, data: { deletedAt: new Date() } });
	}
}

async function seedInventoryAdjustments(
	items: { id: string; name: string; startQty: number; anomaly: boolean }[],
	users: Record<string, { id: string; role: Role }>,
) {
	const technicianIds = Object.values(users)
		.filter((u) => u.role === Role.TECHNICIAN)
		.map((u) => u.id);
	const supervisorId = Object.values(users).find((u) => u.role === Role.SUPERVISOR)!.id;
	const managerId = Object.values(users).find((u) => u.role === Role.MANAGER)!.id;

	for (const item of items) {
		type Event = { date: Date; amount: number; userId: string; note?: string };
		const events: Event[] = [];

		// Monthly-ish restocks from Supervisor/Manager.
		let cursor = new Date(START);
		while (cursor < NOW) {
			events.push({
				date: new Date(cursor),
				amount: item.anomaly ? randomInt(80, 140) : randomInt(15, 40),
				userId: Math.random() < 0.7 ? supervisorId : managerId,
				note: "Restock",
			});
			cursor = new Date(cursor.getTime() + randomInt(20, 40) * 24 * 60 * 60 * 1000);
		}

		// Usage events from technicians (and occasionally Supervisor/Manager).
		const usageEventCount = item.anomaly ? randomInt(180, 220) : randomInt(25, 55);
		for (let i = 0; i < usageEventCount; i++) {
			const date = randomDateBetween(START, NOW);
			const amount = item.anomaly ? -randomInt(4, 12) : -randomInt(1, 4);
			const userId = Math.random() < 0.85 ? pick(technicianIds) : supervisorId;
			events.push({ date, amount, userId });
		}

		events.sort((a, b) => a.date.getTime() - b.date.getTime());

		let runningQty = item.startQty;
		const rows: {
			itemId: string;
			userId: string;
			changeAmount: number;
			resultingQuantity: number;
			note: string | null;
			createdAt: Date;
		}[] = [];

		for (const event of events) {
			let amount = event.amount;
			if (runningQty + amount < 0) {
				amount = -runningQty; // never let usage push a running total below zero
			}
			runningQty += amount;
			if (amount === 0) continue;

			rows.push({
				itemId: item.id,
				userId: event.userId,
				changeAmount: amount,
				resultingQuantity: runningQty,
				note: event.note ?? null,
				createdAt: event.date,
			});
		}

		await prisma.inventoryAdjustment.createMany({ data: rows });
		await prisma.inventoryItem.update({ where: { id: item.id }, data: { quantity: runningQty } });
	}

	// One soft-deleted inventory item, discontinued.
	const discontinued = items.find((i) => i.name === "Furnace Filter Wipes");
	if (discontinued) {
		await prisma.inventoryItem.update({ where: { id: discontinued.id }, data: { deletedAt: new Date() } });
	}
}

async function main() {
	console.log("Seeding users...");
	const users = await seedUsers();

	console.log("Seeding tools...");
	const tools = await seedTools();

	console.log("Seeding inventory items...");
	const items = await seedInventoryItems();

	console.log("Seeding two years of checkout history...");
	const techs = [
		{ id: users["tech1@example.com"].id, email: "tech1@example.com" },
		{ id: users["tech2@example.com"].id, email: "tech2@example.com" },
		{ id: users["tech3@example.com"].id, email: "tech3@example.com" },
	];
	await seedCheckouts(tools, techs);

	console.log("Seeding two years of inventory adjustments...");
	await seedInventoryAdjustments(items, users);

	console.log("\nDone. Demo accounts (all use the same password):\n");
	console.log(`  Password for every account: ${DEMO_PASSWORD}\n`);
	for (const user of USERS) {
		console.log(`  ${user.role.padEnd(11)} ${user.email}`);
	}
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});
