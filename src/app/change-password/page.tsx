import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/sessions";
import ChangePasswordForm from "@/components/auth/ChangePasswordForm";

export default async function ChangePasswordPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    if (!user.mustChangePassword) {
        redirect("/dashboard");
    }

    return (
        <main className="flex min-h-screen items-center justify-center p-8">
            <ChangePasswordForm />
        </main>
    );
}