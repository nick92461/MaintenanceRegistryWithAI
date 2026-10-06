import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/sessions";
import AccountPasswordForm from "@/components/auth/AccountPasswordForm";

export default async function AccountPage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/login");
    }

    return (
        <div className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold">Account</h1>

            <div>
                <p className="font-medium">{user.name}</p>
                <p className="text-sm text-gray-500">{user.email}</p>
            </div>

            <AccountPasswordForm />
        </div>
    )
}