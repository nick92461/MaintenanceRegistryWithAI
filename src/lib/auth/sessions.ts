import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIES_NAME = "session_token";
const SESSION_IDLE_TIMEOUT_MS = 1000 * 60 * 60 * 12; // 12 hours


// helper function for inserting the session token and session expiration into a browser cookie
// httpOnly cookies are invisible to clients, which means sessions are protected from cross-site
// scripting attacks that try to read cookies to hijack sessions.
// since the cookie exists only on the local machine of the person who initiated the session
// they are essentially the only person who can attach that cookie to subsequent requests, satsifying
// continued session validation for every request. Since even the User themselves cannot see this cookie,
// tricking the User would not get a hacker this cookie, they would need to trick the Users browser with
// a CSRF attack. "sameSite: "lax"" handles that sort of attack by limiting when a request originating
// from a different site is allowed to attach the cookie. lax means: simple GET request like clicking
// a text link to a site on a machine thats already got a valid session = allowed to attach the cookie.
// more malicious requests that have dubious intent are rejected from attaching the cookie.
async function setSessionCookie(token: string, expiresAt: Date) {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIES_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiresAt,
        path: "/",
    });
}


// this is the first function that runs when a successful login is happens.
// it generates the session token (32 random bytes converted into a hexadecimal (64 ch) string)
// establishes the expiration time for the session
// deletes expired Session records that never got cleaned up, a housekeeping utility to keep the database tidy
// creates a new Session recrod in the database containing the token, userId, and expiration
// call the helper method to put the token in a browser cookie
export async function createSession(userId: string) {
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_IDLE_TIMEOUT_MS);

    await prisma.session.deleteMany({
		where: { expiresAt: { lt: new Date() } },
	});
    
    await prisma.session.create({
        data: { token, userId, expiresAt },
    });

    await setSessionCookie(token, expiresAt);
}


async function findValidSession(token: string) {
	const session = await prisma.session.findUnique({
		where: { token },
		include: {
			user: {
				select: {
					id: true,
					name: true,
					email: true,
					role: true,
					createdAt: true,
					deletedAt: true,
				},
			},
		},
	});

	

	if (!session || session.expiresAt < new Date()) {
		if (session) {
			await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
		}
		return null;
	}

	if (session.user.deletedAt) {
		await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
		return null;
	}

	

	return session;
}


export async function getCurrentUser() {
	const cookieStore = await cookies();
	const token = cookieStore.get(SESSION_COOKIES_NAME)?.value;

	if (!token) {
		return null;
	}

	const session = await findValidSession(token);

	return session?.user ?? null;
}

export async function getCurrentUserAndRenewSession() {
	const cookieStore = await cookies();
	const token = cookieStore.get(SESSION_COOKIES_NAME)?.value;

	if (!token) {
		return null;
	}

	const session = await findValidSession(token);

	if (!session) {
		return null;
	}

	const newExpiresAt = new Date(Date.now() + SESSION_IDLE_TIMEOUT_MS);
	await prisma.session.update({
		where: { token },
		data: { expiresAt: newExpiresAt },
	});
	await setSessionCookie(token, newExpiresAt);

	return session.user;
}


// this function is as it seems, it destroys a session upon completion. this function will called by a logout action
// first it gets the cookies from the browser, then it looks for token containing cookie by name and reads the token value
// if found, tells prisma to delete the DB Session record that matches that token (.catch is there in case the record was already deleted for some reason and prevents a crash)
export async function destroySession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIES_NAME)?.value;

    if (token) {
        await prisma.session.delete({ where: { token }  }).catch(() => {});
    }

    cookieStore.delete(SESSION_COOKIES_NAME);
}