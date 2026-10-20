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
            className="min-h-11 cursor-pointer rounded-xl border border-line-strong bg-white px-3 text-sm font-medium text-ink hover:bg-canvas"
        >
            {properties.map((property) => (
                <option key={property.id} value={property.id}>
                    {property.name}
                </option>
            ))}
        </select>
    );
}
