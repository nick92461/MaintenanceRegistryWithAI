import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Role, ToolStatus } from "../src/generated/prisma/enums";
import { hashPassword } from "../src/lib/auth/passwords";
import { generateJoinCode } from "../src/lib/tenancy/joinCode";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Password123!";
const HOUR_MS = 1000 * 60 * 60;
const DAY_MS = HOUR_MS * 24;
const NOW = new Date();
const START = new Date(NOW.getTime() - DAY_MS * 365 * 2);
// Past checkouts stop three days before today, so every one of them was returned
// in the past. The checkouts that are still open get added separately.
const HISTORY_END = new Date(NOW.getTime() - DAY_MS * 3);

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

type PropertySeed = {
	key: string;
	name: string;
	// The main demo property gets the full catalog plus the planted anomalies the
	// Reports page is meant to surface. Every other property gets a random subset.
	isMainDemo?: boolean;
};

type CompanySeed = {
	key: string;
	name: string;
	properties: PropertySeed[];
};

const COMPANIES: CompanySeed[] = [
	{
		key: "summit",
		name: "Summit Residential",
		properties: [
			{ key: "riverside", name: "Riverside Commons", isMainDemo: true },
			{ key: "maple", name: "Maple Heights" },
			{ key: "cedar", name: "Cedar Park Apartments" },
		],
	},
	{
		key: "harbor",
		name: "Harbor Point Management",
		properties: [
			{ key: "harborView", name: "Harbor View Lofts" },
			{ key: "bayside", name: "Bayside Terrace" },
		],
	},
	{
		// A standalone property: a "company of one" named after the property.
		key: "willows",
		name: "The Willows",
		properties: [{ key: "willows", name: "The Willows" }],
	},
];

type UserSeed = {
	name: string;
	email: string;
	company: string;
	isCompanyAdmin?: boolean;
	memberships: { property: string; role: Role }[];
	// How often this person checks out tools compared to other techs.
	checkoutWeight?: number;
};

// Jordan is the least busy tech overall, but almost always returns the pressure
// washer late. That pairing is what the tool usage report should expose.
const ANOMALY_TECH_EMAIL = "riverside.tech2@example.com";

const USERS: UserSeed[] = [
	// Summit Residential
	{ name: "Denise Ramirez", email: "summit.admin@example.com", company: "summit", isCompanyAdmin: true, memberships: [] },
	{
		name: "Marcus Bell",
		email: "summit.regional@example.com",
		company: "summit",
		memberships: [
			{ property: "riverside", role: Role.MANAGER },
			{ property: "maple", role: Role.MANAGER },
		],
	},
	{ name: "Tanya Brooks", email: "cedar.manager@example.com", company: "summit", memberships: [{ property: "cedar", role: Role.MANAGER }] },
	{ name: "Carlos Vega", email: "riverside.supervisor@example.com", company: "summit", memberships: [{ property: "riverside", role: Role.SUPERVISOR }] },
	{
		name: "Mike Turner",
		email: "riverside.tech@example.com",
		company: "summit",
		checkoutWeight: 5,
		memberships: [{ property: "riverside", role: Role.TECHNICIAN }],
	},
	{
		name: "Priya Nair",
		email: "floating.tech@example.com",
		company: "summit",
		checkoutWeight: 4,
		memberships: [
			{ property: "riverside", role: Role.TECHNICIAN },
			{ property: "maple", role: Role.TECHNICIAN },
		],
	},
	{
		name: "Jordan Lee",
		email: ANOMALY_TECH_EMAIL,
		company: "summit",
		checkoutWeight: 3,
		memberships: [{ property: "riverside", role: Role.TECHNICIAN }],
	},
	{
		name: "Sam Ortiz",
		email: "mixed.roles@example.com",
		company: "summit",
		memberships: [
			{ property: "maple", role: Role.SUPERVISOR },
			{ property: "cedar", role: Role.TECHNICIAN },
			{ property: "riverside", role: Role.GUEST },
		],
	},
	{ name: "Alex Kim", email: "pending.guest@example.com", company: "summit", memberships: [{ property: "riverside", role: Role.GUEST }] },

	// Harbor Point Management
	{ name: "Grace Liu", email: "harbor.admin@example.com", company: "harbor", isCompanyAdmin: true, memberships: [] },
	{ name: "Dev Patel", email: "harbor.tech@example.com", company: "harbor", memberships: [{ property: "harborView", role: Role.TECHNICIAN }] },

	// The Willows (standalone)
	{ name: "Rosa Delgado", email: "willows.admin@example.com", company: "willows", isCompanyAdmin: true, memberships: [] },
	{ name: "Ben Carter", email: "willows.tech@example.com", company: "willows", memberships: [{ property: "willows", role: Role.TECHNICIAN }] },
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

type SeededProperty = PropertySeed & { id: string; companyKey: string; joinCode: string };
type SeededUser = UserSeed & { id: string };
type SeededTool = { id: string; name: string; weight: number };
type PropertyStaff = { techs: SeededUser[]; restockers: SeededUser[] };

async function seedCompanies() {
	const companyIds = new Map<string, string>();
	const properties: SeededProperty[] = [];

	for (const company of COMPANIES) {
		const companyRow = await prisma.company.create({ data: { name: company.name } });
		companyIds.set(company.key, companyRow.id);

		for (const property of company.properties) {
			const propertyRow = await prisma.property.create({
				data: { companyId: companyRow.id, name: property.name, joinCode: generateJoinCode() },
			});

			properties.push({ ...property, id: propertyRow.id, companyKey: company.key, joinCode: propertyRow.joinCode });
		}
	}

	return { companyIds, properties };
}

async function seedUsers(companyIds: Map<string, string>, properties: SeededProperty[]) {
	const passwordHash = await hashPassword(DEMO_PASSWORD);
	const propertyIds = new Map(properties.map((property) => [property.key, property.id]));
	const users: SeededUser[] = [];

	for (const user of USERS) {
		const row = await prisma.user.create({
			data: {
				companyId: companyIds.get(user.company)!,
				name: user.name,
				email: user.email,
				passwordHash,
				isCompanyAdmin: user.isCompanyAdmin ?? false,
			},
		});

		if (user.memberships.length > 0) {
			await prisma.propertyMembership.createMany({
				data: user.memberships.map((membership) => ({
					userId: row.id,
					propertyId: propertyIds.get(membership.property)!,
					role: membership.role,
				})),
			});
		}

		users.push({ ...user, id: row.id });
	}

	return users;
}

function roleAt(user: SeededUser, propertyKey: string): Role | undefined {
	return user.memberships.find((membership) => membership.property === propertyKey)?.role;
}

function staffFor(property: SeededProperty, users: SeededUser[]): PropertyStaff {
	const techs = users.filter((user) => roleAt(user, property.key) === Role.TECHNICIAN);
	const leads = users.filter((user) => {
		const role = roleAt(user, property.key);
		return role === Role.SUPERVISOR || role === Role.MANAGER;
	});
	const admins = users.filter((user) => user.isCompanyAdmin && user.company === property.companyKey);

	// Supervisors and managers restock. A property with neither falls back to its company admin.
	return { techs, restockers: leads.length > 0 ? leads : admins };
}

async function seedTools(property: SeededProperty): Promise<SeededTool[]> {
	const catalog = property.isMainDemo ? TOOLS : TOOLS.filter(() => Math.random() < 0.75);
	const created: SeededTool[] = [];

	for (const tool of catalog) {
		const row = await prisma.tool.create({
			data: { propertyId: property.id, name: tool.name, category: tool.category, location: tool.location },
		});
		created.push({ id: row.id, name: row.name, weight: tool.weight });
	}

	return created;
}

async function seedCheckouts(property: SeededProperty, tools: SeededTool[], staff: PropertyStaff) {
	const people = staff.techs.length > 0 ? staff.techs : staff.restockers;

	if (tools.length === 0 || people.length === 0) {
		return;
	}

	const anomalyTech = property.isMainDemo ? people.find((user) => user.email === ANOMALY_TECH_EMAIL) : undefined;
	const anomalyTool = property.isMainDemo ? tools.find((tool) => tool.name === "Pressure Washer") : undefined;

	const rows: {
		propertyId: string;
		toolId: string;
		userId: string;
		checkedOutAt: Date;
		dueAt: Date;
		returnedAt: Date | null;
	}[] = [];

	const totalCheckouts = people.length * 150;

	for (let i = 0; i < totalCheckouts; i++) {
		const tool = pickWeighted(tools, tools.map((t) => t.weight));
		const user = pickWeighted(people, people.map((p) => p.checkoutWeight ?? 3));
		const checkedOutAt = randomDateBetween(START, HISTORY_END);
		const dueAt = getCheckoutDueDate(checkedOutAt);

		const isAnomalyPair = user === anomalyTech && tool === anomalyTool;
		const isLate = Math.random() < (isAnomalyPair ? 0.85 : 0.12);
		const returnedAt = isLate
			? new Date(dueAt.getTime() + randomInt(2, 30) * HOUR_MS)
			: randomDateBetween(checkedOutAt, dueAt);

		rows.push({ propertyId: property.id, toolId: tool.id, userId: user.id, checkedOutAt, dueAt, returnedAt });
	}

	// One tool is under maintenance and one is retired, so neither can be out right now.
	const maintenanceTool = tools.find((tool) => tool.name === "Drain Snake");
	const retiredTool = tools.find((tool) => tool.name === "Hedge Trimmer");
	const available = tools.filter((tool) => tool !== maintenanceTool && tool !== retiredTool);

	// Three tools are still checked out: the first one today (not due yet), the other two overdue.
	const openTools = shuffle(available).slice(0, 3);

	openTools.forEach((tool, index) => {
		const checkedOutAt = index === 0 ? NOW : new Date(NOW.getTime() - randomInt(1, 3) * DAY_MS);
		rows.push({
			propertyId: property.id,
			toolId: tool.id,
			userId: pick(people).id,
			checkedOutAt,
			dueAt: getCheckoutDueDate(checkedOutAt),
			returnedAt: null,
		});
	});

	await prisma.checkout.createMany({ data: rows });

	await prisma.tool.updateMany({
		where: { id: { in: openTools.map((tool) => tool.id) } },
		data: { status: ToolStatus.CHECKED_OUT },
	});

	if (maintenanceTool) {
		await prisma.tool.update({ where: { id: maintenanceTool.id }, data: { status: ToolStatus.MAINTENANCE } });
	}

	if (retiredTool) {
		await prisma.tool.update({ where: { id: retiredTool.id }, data: { deletedAt: NOW } });
	}
}

async function seedInventory(property: SeededProperty, staff: PropertyStaff) {
	if (staff.restockers.length === 0) {
		return;
	}

	const catalog = property.isMainDemo ? INVENTORY_ITEMS : INVENTORY_ITEMS.filter(() => Math.random() < 0.75);
	const usagePeople = staff.techs.length > 0 ? staff.techs : staff.restockers;

	for (const item of catalog) {
		const anomaly = property.isMainDemo && item.anomaly === true;

		const row = await prisma.inventoryItem.create({
			data: {
				propertyId: property.id,
				name: item.name,
				category: item.category,
				location: item.location,
				quantity: item.startQty,
				reorderThreshold: item.reorderThreshold,
			},
		});

		type Event = { date: Date; amount: number; userId: string; note?: string };
		const events: Event[] = [];

		// Restocks roughly every month.
		let cursor = new Date(START);
		while (cursor < NOW) {
			events.push({
				date: new Date(cursor),
				amount: anomaly ? randomInt(80, 140) : randomInt(15, 40),
				userId: pick(staff.restockers).id,
				note: "Restock",
			});
			cursor = new Date(cursor.getTime() + randomInt(20, 40) * DAY_MS);
		}

		// Usage, mostly by technicians.
		const usageEventCount = anomaly ? randomInt(180, 220) : randomInt(25, 55);
		for (let i = 0; i < usageEventCount; i++) {
			events.push({
				date: randomDateBetween(START, NOW),
				amount: anomaly ? -randomInt(4, 12) : -randomInt(1, 4),
				userId: Math.random() < 0.85 ? pick(usagePeople).id : pick(staff.restockers).id,
			});
		}

		events.sort((a, b) => a.date.getTime() - b.date.getTime());

		let runningQty = item.startQty;
		const rows: {
			propertyId: string;
			itemId: string;
			userId: string;
			changeAmount: number;
			resultingQuantity: number;
			note: string | null;
			createdAt: Date;
		}[] = [];

		for (const event of events) {
			// Usage can never push the count below zero.
			const amount = runningQty + event.amount < 0 ? -runningQty : event.amount;
			runningQty += amount;
			if (amount === 0) continue;

			rows.push({
				propertyId: property.id,
				itemId: row.id,
				userId: event.userId,
				changeAmount: amount,
				resultingQuantity: runningQty,
				note: event.note ?? null,
				createdAt: event.date,
			});
		}

		await prisma.inventoryAdjustment.createMany({ data: rows });

		// One discontinued item is soft-deleted, as in the original seed.
		await prisma.inventoryItem.update({
			where: { id: row.id },
			data: { quantity: runningQty, deletedAt: item.name === "Furnace Filter Wipes" ? NOW : null },
		});
	}
}

function printSummary(properties: SeededProperty[], users: SeededUser[]) {
	const propertyName = (key: string) => properties.find((property) => property.key === key)!.name;

	console.log(`\nDone. Every account uses the password: ${DEMO_PASSWORD}\n`);

	for (const company of COMPANIES) {
		console.log(company.name);

		for (const property of properties.filter((p) => p.companyKey === company.key)) {
			console.log(`  Property: ${property.name} (join code ${property.joinCode})`);
		}

		for (const user of users.filter((u) => u.company === company.key)) {
			const access = user.isCompanyAdmin
				? "company admin (every property)"
				: user.memberships.map((m) => `${m.role} at ${propertyName(m.property)}`).join(", ");
			console.log(`  ${user.email.padEnd(34)} ${access}`);
		}

		console.log("");
	}
}

async function main() {
	console.log("Seeding companies and properties...");
	const { companyIds, properties } = await seedCompanies();

	console.log("Seeding users and memberships...");
	const users = await seedUsers(companyIds, properties);

	for (const property of properties) {
		console.log(`Seeding ${property.name}...`);
		const staff = staffFor(property, users);
		const tools = await seedTools(property);
		await seedCheckouts(property, tools, staff);
		await seedInventory(property, staff);
	}

	printSummary(properties, users);
}

main()
	.catch((error) => {
		console.error(error);
		process.exit(1);
	})
	.finally(async () => {
		await prisma.$disconnect();
	});