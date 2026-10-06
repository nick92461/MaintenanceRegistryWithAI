import "dotenv/config";
import { parseArgs } from "node:util";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { provisionCompany } from "../src/lib/tenancy/provision";

const USAGE = `Creates a company, its first property, and an admin account with a random temporary password.

Usage:
  npx tsx prisma/createCompany.ts --property "The Oaks" --name "Pat Lee" --email "pat@oaks.com" [--company "Summit Residential"]

  --property  the first property's name
  --name      the admin's full name
  --email     the admin's email address (their login)
  --company   optional; defaults to the property name (a standalone property)`;

async function main() {
	const { values } = parseArgs({
		options: {
			company: { type: "string" },
			property: { type: "string" },
			name: { type: "string" },
			email: { type: "string" },
		},
	});

	if (!values.property || !values.name || !values.email) {
		console.error(USAGE);
		process.exit(1);
	}

	const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

	try {
		const result = await provisionCompany(prisma, {
			companyName: values.company,
			propertyName: values.property,
			adminName: values.name,
			adminEmail: values.email,
		});

		console.log("\nCreated.\n");
		console.log(`  Company:        ${result.companyName}`);
		console.log(`  Property:       ${result.propertyName}`);
		console.log(`  Join code:      ${result.joinCode}   (staff use this to sign up)`);
		console.log(`  Admin login:    ${result.adminEmail}`);
		console.log(`  Temp password:  ${result.tempPassword}`);
		console.log("\nThis password is shown only once and isn't stored anywhere in plain text.");
		console.log("The admin must choose a new password the first time they sign in.\n");
	} catch (error) {
		console.error(`\nNothing was created. ${error instanceof Error ? error.message : error}\n`);
		process.exitCode = 1;
	} finally {
		await prisma.$disconnect();
	}
}

main();