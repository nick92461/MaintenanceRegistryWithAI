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


// this function is for any part of the app that need to know who is currently logged in
// first it gets browser cookies and looks for the cookie called "session_token" (originally applied via the shared const SESSION_COOKIES_NAME ion the createSession method)
// if no such cookie exists token is assigned undefined and null is returned to the caller.
// otherwise, it then has the session token, and it looks for the Session record row matching that token as well as the related User row via the relation defined in the schema
// and attaches it as a nested user property. this is what actually amkes you get all the user data the caller needs rather than just the raw Session fields.
// then, if no session exists at all (bad/forged token) or if it exists but has expired, retrun null
// Next is the sliding expiration. in practice every time an action is done, it will need to run getCurrentUser to know who is running that action.
// That means everytime an action is done, it will run this function, we can take advantage of that by creating a new expiration date every time an action is
// committed on a valid session, and replacing expiresAt with newExpiresAt. Effectively this means all successful actions by a user resets the 12 hour expiration clock on the session.
// Since the cookie holds expiration value, you need to run setSessionCookie again to update the cookie. 
// finally it returns session.user. session.user is an object. "const session ... " performed a query that pulled the token field from the corresponding Session record
// and select fields from the corresponding User. return session.user; essentially means "build an object out of the user data we pulled from that Session record, nothing else, and return it to the caller"
export async function getCurrentUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIES_NAME)?.value;

    if (!token) {
        return null;
    }

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