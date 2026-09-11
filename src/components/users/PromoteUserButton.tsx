"use client";

import { useState } from "react";
import { updateUserRole } from "@/lib/actions/users";
import { Role } from "@/generated/prisma/enums";


const ROLE_HIERARCHY = [Role.GUEST, Role.TECHNICIAN, Role.SUPERVISOR, Role.MANAGER];

function getPromotedRole(currentRole: Role): Role | null {
    const currentIndex = ROLE_HIERARCHY.indexOf(currentRole);

    if (currentIndex === -1 || currentIndex >= ROLE_HIERARCHY.length - 1) {
        return null;
    }

    return ROLE_HIERARCHY[currentIndex + 1];
}

export default function PromoteUserButton({ userId, currentRole }: { userId: string, currentRole: Role }) {
    const [isPending, setIsPending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const newRole = getPromotedRole(currentRole);

    if (!newRole) {
        return null;
    }

    

    async function handleClick() {
        setIsPending(true);
        setError(null);

        if(!newRole) {
            return;
        }

        const result = await updateUserRole(userId, newRole);

        if (result.error) {
            setError(result.error);
        }
        setIsPending(false);
    }

    return (
        <div className="flex flex-col items-end gap-1">
            <button
                onClick={handleClick}
                disabled={isPending}
                className="rounded bg-green-600 px-3 py-1 text-sm text-white disabled:opacity-50"
            >
                {isPending ? "Promoting..." : "Promote"}
            </button>
            {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
    );
}