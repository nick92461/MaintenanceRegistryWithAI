"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "../auth/passwords";
import { getCurrentUserAndRenewSession, createSession, destroySession } from "../auth/sessions";
import { clearRateLimit, isRateLimited, recordRateLimitHit } from "../auth/rateLimit";
import { checkNewPassword } from "../auth/passwordRules";
import { Role } from "@/generated/prisma/enums";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const JOIN_CODE_ATTEMPT_LIMIT = 10;
const JOIN_CODE_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_EMAIL_ATTEMPT_LIMIT = 10;
const LOGIN_ADDRESS_ATTEMPT_LIMIT = 30;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const PASSWORD_CHANGE_ATTEMPT_LIMIT = 5;
const PASSWORD_CHANGE_WINDOW_MS = 15 * 60 * 1000;

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
    
    const emailKey = `login-email:${email.trim().toLowerCase().slice(0, 200)}`;
    const addressKey = `login-address:${await getClientAddress()}`;

    if (
        (await isRateLimited(emailKey, LOGIN_EMAIL_ATTEMPT_LIMIT, LOGIN_WINDOW_MS)) ||
        (await isRateLimited(addressKey, LOGIN_ADDRESS_ATTEMPT_LIMIT, LOGIN_WINDOW_MS))
    ) {
        return { error: "Too many attempts. Please try again later." };
    }

    async function failLogin(): Promise<AuthActionState> {
        await recordRateLimitHit(emailKey, LOGIN_WINDOW_MS);
        await recordRateLimitHit(addressKey, LOGIN_WINDOW_MS);

        return { error: "Invalid email or password" };
    }

    const user = await prisma.user.findUnique({
        where: { email },
        include: { memberships: { select: { role: true } } },
    });

    if (!user) {
        return failLogin();
    }

    if (user.deletedAt) {
        return failLogin();
    }

    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
        return failLogin();
    }

    await clearRateLimit(emailKey);
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

    const problem = checkNewPassword(newPassword, confirmPassword);

    if (problem) {
        return { error: problem };
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

export async function changeOwnPassword(prevState: unknown, formData: FormData): Promise<AuthActionState> {
    const user = await getCurrentUserAndRenewSession();

    if (!user) {
        return { error: "You must be logged in" };
    }

    const currentPassword = formData.get("currentPassword");
    const newPassword = formData.get("newPassword");
    const confirmPassword = formData.get("confirmPassword");

    if (
        typeof currentPassword !== "string" ||
        typeof newPassword !== "string" ||
        typeof confirmPassword !== "string"
    ) {
        return { error: "Missing required fields" };
    }

    //without this, a hijacked session could be used to guess the current password
    const attemptKey = `password-change:${user.id}`;


    if (await isRateLimited(attemptKey, PASSWORD_CHANGE_ATTEMPT_LIMIT, PASSWORD_CHANGE_WINDOW_MS)) {
        return { error: "Too many attempts. Please try again later" };
    }

    const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });

    if (!row) {
        return { error: "You must be logged in" };
    }

    if (!(await verifyPassword(currentPassword, row.passwordHash))) {
        await recordRateLimitHit(attemptKey, PASSWORD_CHANGE_WINDOW_MS);

        return { error: "Your current password is incorrect" };
    }

    const problem = checkNewPassword(newPassword, confirmPassword);

    if (problem) {
        return { error: problem };
    }

    if (newPassword === currentPassword) {
        return { error: "Choose a password different from your current one" };
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { passwordHash, mustChangePassword: false } }),
        prisma.session.deleteMany({ where: {userId: user.id } })
    ]);

    await clearRateLimit(attemptKey);
    await createSession(user.id);

    return { success: true };
}

export async function logout() {
    await destroySession();
}