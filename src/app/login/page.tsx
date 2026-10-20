import { connection } from "next/server";
import LoginForm from "@/components/login/LoginForm";
import DemoButton from "@/components/login/DemoButton";
import Brand from "@/components/layout/Brand";
import { BuildingIcon, ChatIcon, MicIcon, WrenchIcon } from "@/components/layout/icons";
import { isDemoMode } from "@/lib/demo/demoMode";

const HIGHLIGHTS = [
    { Icon: MicIcon, title: "Talk or type your stock.", text: "An AI assistant drafts the records; nothing is saved until you confirm." },
    { Icon: WrenchIcon, title: "Tool checkout with due times.", text: "See who has what, and what's overdue." },
    { Icon: BuildingIcon, title: "Built for many properties.", text: "Each property's data stays separate, with roles per property." },
];

export default async function LoginPage() {
    await connection();

    const demo = isDemoMode();

    return (
        <main className="flex min-h-screen flex-col lg:flex-row">
            <section className="flex flex-col justify-between gap-12 bg-sidebar p-8 text-[#C9CED6] lg:w-1/2 lg:p-12">
                <Brand onDark />

                <div className="flex max-w-lg flex-col gap-7">
                    <h2 className="text-4xl font-bold leading-[1.15] tracking-tight text-white">Every tool and part, accounted for.</h2>
                    <p className="text-[17px] leading-relaxed">
                        Built by a maintenance tech for apartment maintenance teams: check tools in and out, know what&apos;s running low, and add stock by just describing it.
                    </p>
                    <ul className="flex flex-col gap-4">
                        {HIGHLIGHTS.map(({ Icon, title, text }) => (
                            <li key={title} className="flex items-start gap-3.5">
                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-raised text-orange-400">
                                    <Icon className="h-4 w-4" />
                                </span>
                                <span className="text-[15px] leading-normal">
                                    <strong className="font-semibold text-white">{title}</strong> {text}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="flex items-center gap-2 text-[13px] text-[#9AA3B1]">
                    <ChatIcon className="h-4 w-4" />
                    Built by Nicholas Bottorf
                </p>
            </section>

            <section className="flex flex-1 items-center justify-center px-6 py-12 lg:px-8">
                <div className="flex w-full max-w-md flex-col gap-6">
                    {demo && (
                        <>
                            <DemoButton />
                            <div className="flex items-center gap-3 text-[13px] text-muted">
                                <span className="h-px flex-1 bg-line" />
                                or sign in
                                <span className="h-px flex-1 bg-line" />
                            </div>
                        </>
                    )}
                    <LoginForm showSignup={!demo} />
                </div>
            </section>
        </main>
    );
}
