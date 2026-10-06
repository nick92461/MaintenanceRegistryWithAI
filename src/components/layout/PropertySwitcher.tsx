"use client";

import { usePathname, useRouter } from "next/navigation";

export default function PropertySwitcher({ properties, currentId }: { properties: {id: string, name: string }[], currentId: string }) {
    const router = useRouter();
    const pathname = usePathname();

    if (properties.length < 2) {
        return null;
    }

    function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
        router.push(pathname.replace(`/p/${currentId}`, `/p/${e.target.value}`));
    }

    return (
        <select
            value={currentId}
            onChange={handleChange}
            aria-label="Switch property"
            className="rounded border px-2 py-1 text-sm"
        >
            {properties.map((property) => (
                <option key={property.id} value={property.id}>
                    {property.name}
                </option>
            ))}
        </select>
    );
}