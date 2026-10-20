"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions/auth";
import Brand from "./Brand";
import { LogoutIcon } from "./icons";

// The slim bar for pages outside a property (portfolio dashboard, account). Property pages have their own sidebar shell.
export default function AppTopBar({ userName, isCompanyAdmin }: { userName: string; isCompanyAdmin: boolean }) {
    const pathname = usePathname();

    if (pathname.startsWith("/p/")) {
        return null;
    }

    return (
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line bg-white px-6 py-3">
            <Link href="/dashboard" aria-label="Maintenance Registry home">
                <Brand />
            </Link>

            <div className="flex flex-wrap items-center gap-2">
                <div className="mr-2 text-right leading-tight">
                    <p className="text-sm font-semibold">{userName}</p>
                    {isCompanyAdmin && <p className="text-xs text-muted">Company admin</p>}
                </div>
                <Link href="/dashboard" className="btn btn-secondary btn-sm">Properties</Link>
                <Link href="/account" className="btn btn-secondary btn-sm">Account</Link>
                <form action={logout}>
                    <button type="submit" className="btn btn-sm text-muted hover:text-ink">
                        <LogoutIcon className="h-4 w-4" />
                        Log out
                    </button>
                </form>
            </div>
        </header>
    );
}
