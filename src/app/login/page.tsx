import { connection } from "next/server";
import LoginForm from "@/components/login/LoginForm";
import DemoButton from "@/components/login/DemoButton";
import { isDemoMode } from "@/lib/demo/demoMode";

export default async function LoginPage() {
    await connection();

    const demo = isDemoMode();

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
            {demo && <DemoButton />}
            <LoginForm showSignup={!demo} />
        </main>
    );
}