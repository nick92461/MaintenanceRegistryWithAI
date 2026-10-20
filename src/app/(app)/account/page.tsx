import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/sessions";
import AccountPasswordForm from "@/components/auth/AccountPasswordForm";

export default async function AccountPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
            <div>
                <h1 className="page-title">Account</h1>
                <p className="page-sub">{user.name} · {user.email}</p>
            </div>

            <AccountPasswordForm />
        </div>
    )
}
