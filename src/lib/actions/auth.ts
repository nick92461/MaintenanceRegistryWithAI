"use server";

import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";
import { createSession, destroySession } from "@/lib/auth/sessions";
import { redirect } from "next/navigation";

export type AuthActionState = {
    error?: string;
    success?: boolean;
};


export async function createAccount(prevState: unknown, formData: FormData):
Promise<AuthActionState> {
    const name = formData.get("name");
    const email = formData.get("email");
    const password = formData.get("password");

    if (typeof name !== "string" || typeof email !== "string" || typeof password !== "string") {
        return { error: "Missing required fields" };
    }

    if (name.trim().length === 0 || email.trim().length === 0) {
        return { error: "Missing required fields" }
    }

    if (password.length < 8) {
		return { error: "Password must be at least 8 characters" };
	}

	const existingUser = await prisma.user.findUnique({ where: { email } });

	if (existingUser) {
		return { error: "An account with that email already exists" };
	}

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
        data: { name, email, passwordHash },
    });

    await createSession(user.id);

    redirect("/pending-approval");
}

export async function login(prevState: AuthActionState, formData: FormData):
Promise<AuthActionState> {
    const email = formData.get("email");
    const password = formData.get("password");

    if (typeof email !== "string" || typeof password !== "string") {
        return { error: "Invalid email or password" };
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if(!user) {
        return { error: "Invalid email or password" };
    }

    const isValid = await verifyPassword(password, user.passwordHash);

    if (!isValid) {
        return { error: "Invalid email or password" };
    }

    await createSession(user.id);

    if (user.role === "GUEST") {
        redirect("/pending-approval");
    }

    redirect("/dashboard")
}

export async function logout() {
    await destroySession();
}
