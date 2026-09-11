import { getCurrentUser } from "@/lib/auth/sessions";
import { Role } from "@/generated/prisma/enums";
import Link from "next/link";

const DASHBOARD_TILES: { label: string; href: string; allowedRoles: Role[] }[] = [
    { label: "Tools", href: "/tools", allowedRoles: [Role.TECHNICIAN, Role.SUPERVISOR, Role.MANAGER] },
    { label: "Inventory", href: "/inventory", allowedRoles: [Role.TECHNICIAN, Role.SUPERVISOR, Role.MANAGER] },
    { label: "Users", href: "/users", allowedRoles: [Role.SUPERVISOR, Role.MANAGER] },
    { label: "Reports", href: "/reports", allowedRoles: [Role.SUPERVISOR, Role.MANAGER] },
];

export default async function DashboardPage() {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return null;
    }

    return (
        <div className="flex flex-col gap-4 sm:mx-[100px] text-center sm:text-left max-w-[700px]">
                <h1 className="text-3xl font-display">Dashboard</h1>

                <ul className="grid grid-cols-2 gap-2 sm:flex sm:flex-col">
                    {DASHBOARD_TILES.map((tile) => (
                        <li
                            key={tile.label}
                        >
                            <Link
                                href={tile.href}
                                className="flex items-center justify-center rounded-xl border p-3 aspect-square sm:aspect-auto sm:justify-between sm:max-w-[700px] hover:border-black sm:hover:translate-x-5 hover:translate-x-2 transition hover:text-background hover:bg-foreground"
                            >
                                <div>
                                    <p className="font-body text-lg xs:text-2xl sm:text-lg">{tile.label}</p>
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
        </div>
    )
}
