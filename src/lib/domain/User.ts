import { Role } from "@/generated/prisma/enums";

export class User {
	protected readonly id: string;
	protected readonly role: Role;
    protected deletedAt: Date | null;

    constructor (
        id: string,
        role: Role,
        deletedAt: Date | null,
    ) {
        this.id = id;
        this.role = role;
        this.deletedAt = deletedAt;
    }

    public getId(): string {
        return this.id;
    }

    public getRole(): Role {
        return this.role;
    }

    public delete(): void {
        this.deletedAt = new Date();
    }

    public getDeletedAt(): Date | null {
        return this.deletedAt;
    }

}