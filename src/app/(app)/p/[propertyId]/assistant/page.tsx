import { LEAD_ROLES } from "@/lib/auth/propertyRole";
import { requirePageRole } from "@/lib/auth/pageAccess";
import AssistantChat from "@/components/assistant/AssistantChat";

export default async function AssistantPage({ params }: { params: Promise<{ propertyId: string }> }) {
    const { propertyId } = await params;
    const access = await requirePageRole(propertyId, LEAD_ROLES);

    return (
        <div className="flex max-w-[700px] flex-col gap-4 mx-auto">
            <h1 className="text-xl font-semibold">Assistant</h1>
            <AssistantChat propertyId={access.property.id} context="inventory-intake" greeting="Hi! Tell me about the tools and supplies you have. I suggest starting with one location at a time, like 'shop 1', and tell me everything that's in that location before moving on to another location. Be specific when items are similar (like different color lightbulbs), and I'll ask if I have a question. I am limited to 100 items per prompt." />
        </div>
    );
}