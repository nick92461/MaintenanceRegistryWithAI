import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/sessions";
import { getAccessibleProperties } from "@/lib/auth/pageAccess";
import { LEAD_ROLES } from "@/lib/auth/propertyRole";
import { getPropertyCounts } from "@/lib/data/portfolio";

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
        return <p className="text-gray-500">This company has no properties yet.</p>;
    }

    const counts = await getPropertyCounts(properties.map((property) => property.id));

    return (
        <div className="flex flex-col gap-4 sm:mx-[100px] max-w-[700px]">
            <h1 className="text-3xl font-display">Your properties</h1>

            <ul className="flex flex-col gap-2">
                {properties.map((property) => {
                    const stats = counts.get(property.id)!;

                    return (
                        <li key={property.id}>
                            <Link
                                href={`/p/${property.id}`}
                                className="flex flex-col gap-1 rounded-xl border p-3 hover:border-black"
                            >
                                <div className="flex items-center justify-between">
                                    <p className="font-body text-lg">{property.name}</p>
                                    <p className="text-sm text-gray-500">{property.role}</p>
                                </div>
                                <p className="text-sm text-gray-500">
                                    {stats.lowStock} low stock · {stats.overdueTools} overdue tools
                                    {LEAD_ROLES.includes(property.role) && ` · ${stats.pendingApprovals} pending approval`}
                                </p>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}