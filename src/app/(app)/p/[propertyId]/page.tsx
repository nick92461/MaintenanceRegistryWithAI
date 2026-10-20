import Link from "next/link";
import { LEAD_ROLES, STAFF_ROLES } from "@/lib/auth/propertyRole";
import { requirePageRole } from "@/lib/auth/pageAccess";
import { getPropertySummary, type AttentionItem } from "@/lib/data/propertySummary";
import { ArrowIcon, BarsIcon, BoxIcon, ChatIcon, WrenchIcon } from "@/components/layout/icons";

const ATTENTION_BADGES: Record<AttentionItem["kind"], { label: string; className: string }> = {
    overdue: { label: "Overdue", className: "badge badge-amber" },
    "low-stock": { label: "Low stock", className: "badge badge-red" },
    pending: { label: "Pending", className: "badge badge-slate" },
};

export default async function PropertyHomePage({ params }: { params: Promise<{ propertyId: string }> }) {
    const { propertyId } = await params;
    const access = await requirePageRole(propertyId, STAFF_ROLES);
    const isLead = LEAD_ROLES.includes(access.role);
    const summary = await getPropertySummary(access.property.id, isLead);
    const base = `/p/${propertyId}`;

    const cards = [
        { label: "Low stock", value: summary.lowStock, note: "items at or below their reorder level", badge: "Reorder", badgeClass: "badge-red", href: `${base}/inventory` },
        { label: "Overdue tools", value: summary.overdueTools, note: "past their due time", badge: "Follow up", badgeClass: "badge-amber", href: `${base}/tools` },
        { label: "Checked out", value: summary.checkedOut, note: `of ${summary.totalTools} tools are out`, badge: "In use", badgeClass: "badge-blue", href: `${base}/tools` },
        ...(isLead
            ? [{ label: "Pending approvals", value: summary.pendingApprovals, note: "people waiting to join this property", badge: "Review", badgeClass: "badge-slate", href: `${base}/users` }]
            : []),
    ];

    const actions = [
        { label: "Check out a tool", note: "Due back by 5:00 PM", href: `${base}/tools`, Icon: WrenchIcon },
        { label: "Adjust inventory", note: "Log what you used or restocked", href: `${base}/inventory`, Icon: BoxIcon },
        ...(isLead
            ? [
                  { label: "Add stock with the assistant", note: "Type or talk, then review the drafts", href: `${base}/assistant`, Icon: ChatIcon },
                  { label: "Run a usage report", note: "Tools or inventory, by month", href: `${base}/reports`, Icon: BarsIcon },
              ]
            : []),
    ];

    return (
        <div className="flex flex-col gap-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h1 className="page-title">{access.property.name}</h1>
                    <p className="page-sub">What needs attention at this property right now.</p>
                </div>
                {isLead && (
                    <Link href={`${base}/assistant`} className="btn btn-primary">
                        <ChatIcon className="h-4 w-4" />
                        Add stock with the assistant
                    </Link>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <Link key={card.label} href={card.href} className="card flex flex-col gap-2.5 p-5 transition-colors hover:border-line-strong hover:bg-white/60">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted">{card.label}</span>
                            <span className={`badge ${card.badgeClass}`}>{card.badge}</span>
                        </div>
                        <div className="font-mono text-4xl font-semibold leading-none">{card.value}</div>
                        <div className="text-[13px] text-muted">{card.note}</div>
                    </Link>
                ))}
            </div>

            <div className="flex flex-wrap items-start gap-5">
                <section className="card min-w-0 flex-[3_1_420px]">
                    <div className="flex items-center justify-between border-b border-line px-5 py-4">
                        <h2 className="text-base font-semibold">Needs attention</h2>
                        <span className="text-[13px] text-muted">{summary.attention.length} {summary.attention.length === 1 ? "item" : "items"}</span>
                    </div>

                    {summary.attention.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted">Nothing needs attention right now.</p>}

                    <ul>
                        {summary.attention.map((item, index) => (
                            <li key={`${item.kind}-${item.title}-${index}`} className="flex items-center gap-3.5 border-b border-line px-5 py-3.5 last:border-b-0">
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold">{item.title}</p>
                                    <p className="mt-0.5 text-[13px] text-muted">{item.detail}</p>
                                </div>
                                <span className={ATTENTION_BADGES[item.kind].className}>{ATTENTION_BADGES[item.kind].label}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                <section className="flex min-w-0 flex-[2_1_300px] flex-col gap-3">
                    <h2 className="text-base font-semibold">Quick actions</h2>
                    {actions.map(({ label, note, href, Icon }) => (
                        <Link key={label} href={href} className="card flex min-h-11 items-center gap-3.5 p-4 transition-colors hover:border-line-strong">
                            <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[10px] bg-accent-soft text-accent">
                                <Icon className="h-[18px] w-[18px]" />
                            </span>
                            <span className="flex-1">
                                <span className="block text-sm font-semibold">{label}</span>
                                <span className="block text-[13px] text-muted">{note}</span>
                            </span>
                            <ArrowIcon className="h-4 w-4 text-muted" />
                        </Link>
                    ))}
                </section>
            </div>
        </div>
    );
}
