import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/sessions";
import { Role } from "@/generated/prisma/enums";
import AssistantChat from "@/components/assistant/AssistantChat";

export default async function AssistantPage() {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
        return null;
    }

    if (currentUser.role !== Role.SUPERVISOR && currentUser.role !== Role.MANAGER) {
		redirect("/dashboard");
	}
    
    return (
        <div className="flex h-[70vh] max-w-[700px] flex-col gap-4 mx-auto">
            <h1 className="text-xl font-semibold">Assistant</h1>
            <div className="min-h-0 flex-1">
                <AssistantChat greeting="Hi! Tell me about the tools and supplies you have. Be specific when items are similar (like different color lightbulbs), and I'll ask if I have a question." />
            </div>
        </div>
    );
}