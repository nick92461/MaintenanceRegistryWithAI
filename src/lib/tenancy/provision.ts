import type { PrismaClient } from "../../generated/prisma/client";
import { hashPassword } from "../auth/passwords";
import { generateJoinCode } from "./joinCode";
import { generateTempPassword } from "./tempPassword";

export type ProvisionInput = {
    companyName?: string;
    propertyName: string;
    adminName: string;
    adminEmail: string;
};

export type ProvisionResult = {
    companyName: string;
    propertyName: string;
    joinCode: string;
    adminEmail: string;
    tempPassword: string;
};

export function normalizeProvisionInput(input: ProvisionInput): Required<ProvisionInput> {
    const propertyName = input.propertyName.trim();
    const adminName = input.adminName.trim();
    const adminEmail = input.adminEmail.trim();
    const companyName = input.companyName?.trim() || propertyName;

    if (propertyName.length === 0 || adminName.length === 0 || adminEmail.length === 0) {
        throw new Error("Property name, admin name, and admin email are all required.");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
        throw new Error(`"${adminEmail}" doesn't look like an email address.`);
    }

    return { companyName, propertyName, adminName, adminEmail };
}

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

export async function provisionCompany(prisma: PrismaClient, input: ProvisionInput): Promise<ProvisionResult> {
    const clean = normalizeProvisionInput(input);
    const existing = await prisma.user.findUnique({ where: { email: clean.adminEmail }, select: { id: true } });

    if (existing) {
        throw new Error(`An account with ${clean.adminEmail} already exists.`);
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const joinCode = await createUniqueJoinCode(prisma);

    await prisma.$transaction(async (tx) => {
        const company = await tx.company.create({ data: { name: clean.companyName } });

        await tx.property.create({ data: { companyId: company.id, name: clean.propertyName, joinCode } });

        await tx.user.create({
            data: {
                companyId: company.id,
                name: clean.adminName,
                email: clean.adminEmail,
                passwordHash,
                isCompanyAdmin: true,
                mustChangePassword: true,
            }
        });
    });

    return {
        companyName: clean.companyName,
        propertyName: clean.propertyName,
        joinCode,
        adminEmail: clean.adminEmail,
        tempPassword
    };
}