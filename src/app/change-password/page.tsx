import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/sessions";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";
import Brand from "@/components/layout/Brand";

export default async function ChangePasswordPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    if (!user.mustChangePassword) {
        redirect("/dashboard");
    }

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
            <Brand />
            <ChangePasswordForm />
        </main>
    );
}
