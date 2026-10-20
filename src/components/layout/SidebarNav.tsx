"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarsIcon, BoxIcon, ChatIcon, GridIcon, UsersIcon, WrenchIcon } from "./icons";

export type NavIconName = "grid" | "wrench" | "box" | "chat" | "bars" | "users";

export type NavItem = {
    href: string;
    label: string;
    icon: NavIconName;
    badge?: number;
};

const ICONS = {
    grid: GridIcon,
    wrench: WrenchIcon,
    box: BoxIcon,
    chat: ChatIcon,
    bars: BarsIcon,
    users: UsersIcon,
};

export default function SidebarNav({ items, homeHref }: { items: NavItem[]; homeHref: string }) {
    const pathname = usePathname();

    return (
        <nav aria-label="Main" className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {items.map((item) => {
                const Icon = ICONS[item.icon];
                const isActive = item.href === homeHref ? pathname === homeHref : pathname.startsWith(item.href);

                return (
                    <Link
                        key={item.href}
                        href={item.href}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                            isActive ? "bg-sidebar-raised font-medium text-white" : "text-[#C9CED6] hover:bg-sidebar-raised/60 hover:text-white"
                        }`}
                    >
                        <Icon className="h-[18px] w-[18px]" />
                        {item.label}
                        {item.badge ? (
                            <span className="ml-auto rounded-full bg-accent px-2 text-xs font-semibold text-white">{item.badge}</span>
                        ) : null}
                    </Link>
                );
            })}
        </nav>
    );
}
