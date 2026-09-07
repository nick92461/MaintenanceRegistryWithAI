import { AssetRecord } from "./AssetRecord";
import { ToolStatus } from "@/generated/prisma/enums";

export class Tool extends AssetRecord {
    private status: ToolStatus;
    
    constructor(
        id: string,
        name: string,
        category: string,
        location: string,
        status: ToolStatus,
    ) {
        super(id, name, category, location);
        this.status = status;
    }

    public getStatus(): ToolStatus {
        return this.status;
    }

    public checkOut(): void {
        if (this.status === ToolStatus.CHECKED_OUT) {
            throw new Error(`${this.name} is already checked out.`);
        }
        this.status = ToolStatus.CHECKED_OUT;
    }

    public checkIn(): void {
        this.status = ToolStatus.AVAILABLE;
    }

    public getStatusLabel(): string {
        switch (this.status) {
            case ToolStatus.AVAILABLE:
                return "Available";
            case ToolStatus.CHECKED_OUT:
                return "Checked Out";
            case ToolStatus.MAINTENANCE:
                return "Under Maintenance";
            default:
                return this.status;
        }
    }
}