import { connection } from "next/server";
import LoginForm from "@/components/login/LoginForm";
import DemoButton from "@/components/login/DemoButton";
import { isDemoMode } from "@/lib/demo/demoMode";

export default async function LoginPage() {
    await connection();

    const demo = isDemoMode();

    return (
        <main className="flex min-h-screen items-center justify-center px-6 py-12">
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
        </main>
    );
}
