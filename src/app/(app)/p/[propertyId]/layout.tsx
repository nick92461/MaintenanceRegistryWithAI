import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { logout } from "@/lib/actions/auth";
import { getAccessibleProperties, getPropertyAccess } from "@/lib/auth/pageAccess";
import { LEAD_ROLES, STAFF_ROLES } from "@/lib/auth/propertyRole";
import Brand from "@/components/layout/Brand";
import SidebarNav, { type NavItem } from "@/components/layout/SidebarNav";
import PropertySwitcher from "@/components/layout/PropertySwitcher";
import { BuildingIcon, LogoutIcon } from "@/components/layout/icons";

const ROLE_LABELS: Record<Role, string> = {
    GUEST: "Guest",
    TECHNICIAN: "Technician",
    SUPERVISOR: "Supervisor",
    MANAGER: "Manager",
};

function initials(name: string): string {
    return name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join("");
}

export default async function PropertyLayout({ children, params }: { children: React.ReactNode, params: Promise<{ propertyId: string }>}) {
    const { propertyId } = await params;
    const access = await getPropertyAccess(propertyId);

    if (!access) {
        notFound();
    }

    if (access.role === Role.GUEST) {
        return (
            <div className="mx-auto flex max-w-md flex-col gap-3 p-8">
                <div className="card flex flex-col gap-3 p-6">
                    <h1 className="text-xl font-bold">{access.property.name}</h1>
                    <p className="text-muted">
                        Your access to this property is waiting for supervisor/manager approval.
                    </p>
                    <Link href="/dashboard" className="btn btn-secondary self-start">
                        Back to your properties
                    </Link>
                </div>
            </div>
        );
    }

    const isStaff = STAFF_ROLES.includes(access.role);
    const isLead = LEAD_ROLES.includes(access.role);

    const [properties, company, pendingApprovals] = await Promise.all([
        getAccessibleProperties(),
        prisma.company.findUnique({ where: { id: access.user.companyId }, select: { name: true } }),
        isLead ? prisma.propertyMembership.count({ where: { propertyId: access.property.id, role: Role.GUEST } }) : Promise.resolve(0),
    ]);

    const base = `/p/${propertyId}`;
    const items: NavItem[] = [
        { href: base, label: "Dashboard", icon: "grid" },
        ...(isStaff ? [
            { href: `${base}/tools`, label: "Tools", icon: "wrench" as const },
            { href: `${base}/inventory`, label: "Inventory", icon: "box" as const },
        ] : []),
        ...(isLead ? [
            { href: `${base}/assistant`, label: "Assistant", icon: "chat" as const },
            { href: `${base}/reports`, label: "Reports", icon: "bars" as const },
            { href: `${base}/users`, label: "Users", icon: "users" as const, badge: pendingApprovals },
        ] : []),
    ];

    return (
        <div className="flex min-h-screen flex-col lg:flex-row">
            <aside className="flex flex-col gap-4 bg-sidebar px-4 py-4 text-[#C9CED6] lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:shrink-0 lg:gap-7 lg:px-3.5 lg:py-5">
                <div className="px-2 pt-1">
                    <Link href={base} aria-label="Property dashboard">
                        <Brand subtitle={company?.name} onDark />
                    </Link>
                </div>

                <SidebarNav items={items} homeHref={base} />

                <div className="mt-auto hidden items-center gap-2.5 border-t border-[#2A313C] px-2 py-3 lg:flex">
                    <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#353D49] text-[13px] font-semibold text-white">
                        {initials(access.user.name)}
                    </div>
                    <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-white">{access.user.name}</div>
                        <div className="text-xs text-[#9AA3B1]">{access.user.isCompanyAdmin ? "Company admin" : ROLE_LABELS[access.role]}</div>
                    </div>
                </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-3 sm:px-8">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex min-h-11 items-center gap-3 rounded-xl border border-line px-3 py-1.5">
                            <BuildingIcon className="h-[18px] w-[18px] text-muted" />
                            <div className="leading-tight">
                                <p className="text-sm font-semibold">{access.property.name}</p>
                                <p className="text-xs text-muted">{ROLE_LABELS[access.role]}</p>
                            </div>
                        </div>
                        <PropertySwitcher properties={properties} currentId={propertyId} />
                    </div>

                    <div className="flex items-center gap-1">
                        <Link href="/dashboard" className="btn btn-sm text-muted hover:text-ink">All properties</Link>
                        <Link href="/account" className="btn btn-sm text-muted hover:text-ink">Account</Link>
                        <form action={logout}>
                            <button type="submit" className="btn btn-sm text-muted hover:text-ink">
                                <LogoutIcon className="h-4 w-4" />
                                Log out
                            </button>
                        </form>
                    </div>
                </header>

                <main className="mx-auto w-full max-w-6xl p-4 sm:p-8">{children}</main>
            </div>
        </div>
    );
}
