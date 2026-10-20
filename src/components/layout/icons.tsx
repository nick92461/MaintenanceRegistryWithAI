// Small stroke icons used across the app. All are decorative: the button or link around them carries the label.

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
    return (
        <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            {children}
        </svg>
    );
}

export const WrenchIcon = (p: IconProps) => (
    <Svg {...p}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z" /></Svg>
);

export const GridIcon = (p: IconProps) => (
    <Svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Svg>
);

export const BoxIcon = (p: IconProps) => (
    <Svg {...p}><path d="M21 8l-9-5-9 5v8l9 5 9-5z" /><path d="M3 8l9 5 9-5" /><path d="M12 13v8" /></Svg>
);

export const ChatIcon = (p: IconProps) => (
    <Svg {...p}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></Svg>
);

export const BarsIcon = (p: IconProps) => (
    <Svg {...p}><path d="M4 20V11" /><path d="M10 20V5" /><path d="M16 20v-6" /><path d="M21 20H3" /></Svg>
);

export const UsersIcon = (p: IconProps) => (
    <Svg {...p}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7" /><path d="M18 14.5a6.5 6.5 0 0 1 3.5 5.5" /></Svg>
);

export const BuildingIcon = (p: IconProps) => (
    <Svg {...p}><rect x="4" y="3" width="16" height="18" rx="1.5" /><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" /></Svg>
);

export const LogoutIcon = (p: IconProps) => (
    <Svg {...p}><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" /><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /></Svg>
);

export const SearchIcon = (p: IconProps) => (
    <Svg {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></Svg>
);

export const PlusIcon = (p: IconProps) => (
    <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>
);

export const MicIcon = (p: IconProps) => (
    <Svg {...p}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0" /><path d="M12 18v3" /></Svg>
);

export const SendIcon = (p: IconProps) => (
    <Svg {...p}><path d="M22 2L11 13" /><path d="M22 2l-7 20-4-9-9-4z" /></Svg>
);

export const CheckIcon = (p: IconProps) => (
    <Svg {...p}><path d="M5 12l5 5L20 7" /></Svg>
);

export const CloseIcon = (p: IconProps) => (
    <Svg {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>
);

export const ArrowIcon = (p: IconProps) => (
    <Svg {...p}><path d="M5 12h14M13 6l6 6-6 6" /></Svg>
);

export const ChevronDownIcon = (p: IconProps) => (
    <Svg {...p}><path d="M6 9l6 6 6-6" /></Svg>
);
