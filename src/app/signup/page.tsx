import { connection } from "next/server";
import { redirect } from "next/navigation";
import SignupForm from "@/components/signup/SignupForm";
import Brand from "@/components/layout/Brand";
import { isDemoMode } from "@/lib/demo/demoMode";

export default async function SignupPage() {
    await connection();

    if (isDemoMode()) {
        redirect("/login");
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
            <Brand />
            <SignupForm />
        </main>
    );
}
