import { WrenchIcon } from "./icons";

export default function Brand({ subtitle, onDark = false }: { subtitle?: string; onDark?: boolean }) {
    return (
        <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-accent text-white">
                <WrenchIcon className="h-5 w-5" />
            </div>
            <div>
                <div className={`text-[15px] font-semibold leading-tight ${onDark ? "text-white" : "text-ink"}`}>Maintenance Registry</div>
                {subtitle && <div className={`text-xs ${onDark ? "text-[#9AA3B1]" : "text-muted"}`}>{subtitle}</div>}
            </div>
        </div>
    );
}
