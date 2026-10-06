import Link from "next/link";
import { Role } from "@/generated/prisma/enums";
import { LEAD_ROLES, STAFF_ROLES } from "@/lib/auth/propertyRole";
import { requirePageRole } from "@/lib/auth/pageAccess";

const TILES: { label: string, path: string, allowedRoles: Role[] }[] = [
    { label: "Tools", path: "tools", allowedRoles: STAFF_ROLES },
    { label: "Inventory", path: "inventory", allowedRoles: STAFF_ROLES },
    { label: "Users", path: "users", allowedRoles: LEAD_ROLES },
    { label: "Reports", path: "reports", allowedRoles: LEAD_ROLES },
    { label: "Onboarding Assistant", path: "assistant", allowedRoles: LEAD_ROLES },
];

export default async function PropertyHomePage({ params }: { params: Promise<{ propertyId: string }> }) {
    const { propertyId } = await params;
    const access = await requirePageRole(propertyId, STAFF_ROLES);

    return (
        <div className="flex flex-col gap-4 sm:mx-[100px] text-center sm:text-left max-w-[700px]">
            <h1 className="text-3xl font-display">Dashboard</h1>

            <ul className="grid grid-cols-2 gap-2 sm:flex sm:flex-col">
                {TILES.filter((tile) => tile.allowedRoles.includes(access.role)).map((tile) => (
                    <li key={tile.label}>
                        <Link
                            href={`/p/${propertyId}/${tile.path}`}
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
    );
}