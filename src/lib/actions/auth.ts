"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "../auth/passwords";
import { getCurrentUserAndRenewSession, createSession, destroySession } from "../auth/sessions";
import { isRateLimited, recordRateLimitHit } from "../auth/rateLimit";
import { Role } from "@/generated/prisma/enums";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const JOIN_CODE_ATTEMPT_LIMIT = 10;
const JOIN_CODE_WINDOW_MS = 15 * 60 * 1000;

export type AuthActionState = {
    error?: string;
    success?: boolean;
};

async function getClientAddress(): Promise<string> {
    const forwarded = (await headers()).get("x-forwarded-for");

    return forwarded?.split(",")[0].trim() || "unknown";
}

export async function createAccount(prevState: unknown, formData: FormData): Promise<AuthActionState> {
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");
    const joinCode = formData.get("joinCode");

    if (
        typeof name !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string" ||
        typeof joinCode !== "string"
    ) {
        return { error: "Missing required fields" };
    }

    if (name.trim().length === 0 || email.trim().length === 0 || joinCode.trim().length === 0) {
        return { error: "Missing required fields" };
    }

    if (password.length < 8) {
        return { error: "Password must be at least 8 characters" };
    }

    const attemptKey = `join-code:${await getClientAddress()}`;

    if (await isRateLimited(attemptKey, JOIN_CODE_ATTEMPT_LIMIT, JOIN_CODE_WINDOW_MS)) {
        return { error: "Too many attempts. Please try again later." };
    }

    const property = await prisma.property.findUnique({
        where: {joinCode: joinCode.trim().toUpperCase() },
        select: { id: true, companyId: true },
    });

    if (!property) {
        await recordRateLimitHit(attemptKey, JOIN_CODE_WINDOW_MS);

        return { error: "That join code isn't valid." };
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });

    if (existingUser) {
        return { error: "An account with that email already exists." };
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
        data: {
            companyId: property.companyId,
            name,
            email,
            passwordHash,
            memberships: { create: { propertyId: property.id, role: Role.GUEST } },
        },
    });

    await createSession(user.id);

    redirect("/pending-approval");
}

export async function login(prevState: AuthActionState, formData: FormData): Promise<AuthActionState> {
    const email = formData.get("email");
    const password = formData.get("password");

    if (typeof email !== "string" || typeof password !== "string") {
        return { error: "Invalid email or password" };
    }

    const user = await prisma.user.findUnique({
        where: { email },
        include: { memberships: { select: { role: true } } },
    });

    if (!user) {
        return { error: "Invalid email or password" };
    }

    if (user.deletedAt) {
        return { error: "Invalid email or password" };
    }

    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
        return { error: "Invalid email or password" };
    }

    await createSession(user.id);

    if (user.mustChangePassword) {
        redirect("/change-password");
    }

    const hasAccess = user.isCompanyAdmin || user.memberships.some((m) => m.role !== Role.GUEST);

    if (!hasAccess) {
        redirect("/pending-approval");
    }

    redirect("/dashboard");
}

export async function changePassword(prevState: unknown, formData: FormData): Promise<AuthActionState> {
    const user = await getCurrentUserAndRenewSession();

    if (!user) {
        return { error: "You must be logged in." };
    }

    if (!user.mustChangePassword) {
        return { error: "Your password doesn't need to be changed." };
    }

    const newPassword = formData.get("newPassword");
    const confirmPassword = formData.get("confirmPassword");

    if (typeof newPassword !== "string" || typeof confirmPassword !== "string") {
        return { error: "Missing required fields" };
    }

    if (newPassword.length < 8) {
        return { error: "Password must be at least 8 characters." };
    }

    if (newPassword !== confirmPassword) {
        return { error: "Passwords do not match." };
    }

    const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });

    if (!row) {
        return { error: "You must be logged in." };
    }

    if (await verifyPassword(newPassword, row.passwordHash)) {
        return { error: "Choose a password different from the temporary one." };
    }

    const passwordHash = await hashPassword(newPassword);

    //End any session including any that used the old password then start a new one
    await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false } }),
        prisma.session.deleteMany({ where: { userId: user.id } })
    ]);

    await createSession(user.id);

    redirect("/dashboard");
}

export async function logout() {
    await destroySession();
}