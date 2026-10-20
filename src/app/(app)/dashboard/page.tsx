import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/sessions";
import { getAccessibleProperties } from "@/lib/auth/pageAccess";
import { LEAD_ROLES } from "@/lib/auth/propertyRole";
import { getPropertyCounts } from "@/lib/data/portfolio";
import { ArrowIcon, BuildingIcon } from "@/components/layout/icons";

export default async function DashboardPage() {
    const user = await getCurrentUser();

    if (!user) {
        return null;
    }

    const properties = await getAccessibleProperties();

    if (properties.length === 1) {
        redirect(`/p/${properties[0].id}`);
    }

    if (properties.length === 0) {
        return <p className="mx-auto max-w-5xl p-6 text-muted">This company has no properties yet.</p>;
    }

    const counts = await getPropertyCounts(properties.map((property) => property.id));

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
            <div>
                <h1 className="page-title">Your properties</h1>
                <p className="page-sub">Pick a property to see its tools, inventory, and what needs attention.</p>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
                {properties.map((property) => {
                    const stats = counts.get(property.id)!;
                    const showPending = LEAD_ROLES.includes(property.role);

                    return (
                        <li key={property.id}>
                            <Link
                                href={`/p/${property.id}`}
                                className="card flex h-full flex-col gap-3.5 p-5 transition-colors hover:border-accent"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-accent">
                                        <BuildingIcon className="h-5 w-5" />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-base font-semibold">{property.name}</p>
                                        <p className="text-[13px] text-muted">{property.role}</p>
                                    </div>
                                    <ArrowIcon className="h-4 w-4 text-muted" />
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <span className={stats.lowStock > 0 ? "badge badge-red" : "badge badge-slate"}>{stats.lowStock} low stock</span>
                                    <span className={stats.overdueTools > 0 ? "badge badge-amber" : "badge badge-slate"}>{stats.overdueTools} overdue tools</span>
                                    {showPending && (
                                        <span className={stats.pendingApprovals > 0 ? "badge badge-blue" : "badge badge-slate"}>{stats.pendingApprovals} pending approval</span>
                                    )}
                                </div>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
