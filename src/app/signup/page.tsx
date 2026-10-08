import { connection } from "next/server";
import { redirect } from "next/navigation";
import SignupForm from "@/components/signup/SignupForm";
import { isDemoMode } from "@/lib/demo/demoMode";

export default async function SignupPage() {
    await connection();

    if (isDemoMode()) {
        redirect("/login");
    }

    return (
        <main className="flex min-h-screen items-center justify-center p-8">
            <SignupForm />
        </main>
    );
}