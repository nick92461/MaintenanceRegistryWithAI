export class User {
    protected readonly id: string;
    protected deletedAt: Date | null;

    constructor(id: string, deletedAt: Date | null) {
        this.id = id;
        this.deletedAt = deletedAt;
    }

    public getId(): string {
        return this.id;
    }

    public delete(): void {
        this.deletedAt = new Date();
    }

    public getDeletedAt(): Date | null {
        return this.deletedAt;
    }
}