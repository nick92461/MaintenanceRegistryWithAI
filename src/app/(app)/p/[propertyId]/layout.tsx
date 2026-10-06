import Link from "next/link";
import { notFound } from "next/navigation";
import { Role } from "@/generated/prisma/enums";
import { getAccessibleProperties, getPropertyAccess } from "@/lib/auth/pageAccess";
import PropertySwitcher from "@/components/layout/PropertySwitcher";

export default async function PropertyLayout({ children, params }: { children: React.ReactNode, params: Promise<{ propertyId: string }>}) {
    const { propertyId } = await params;
    const access = await getPropertyAccess(propertyId);

    if (!access) {
        notFound();
    }

    if (access.role === Role.GUEST) {
        return (
            <div className="flex max-w-md flex-col gap-2">
                <h1 className="text-xl font-semibold">{access.property.name}</h1>
                <p className="text-gray-600">
                    Your access to this property is waiting for supervisor/manager approval.
                </p>
                <Link href="/dashboard" className="text-sm text-blue-600 underline">
                    Back to your properties
                </Link>
            </div>
        );
    }

    const properties = await getAccessibleProperties();

    return (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <div>
                <p className="text-lg font-semibold">{access.property.name}</p>
                <p className="text-sm text-gray-500">{access.role}</p>
            </div>

            <div className="flex items-center gap-3">
                <PropertySwitcher properties={properties} currentId={propertyId} />
                <Link href={`/p/${propertyId}`} className="text-sm text-blue-600 underline">
                    Property home
                </Link>
            </div>

            {children}
        </div>
    );
}