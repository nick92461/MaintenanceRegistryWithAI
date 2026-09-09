import { AssetRecord } from "./AssetRecord";

export class InventoryItem extends AssetRecord {
    private quantity: number;
    private readonly reorderThreshold: number;
    private deletedAt: Date | null;

    constructor(
        id: string,
        name: string,
        category: string,
        location: string,
        quantity: number,
        reorderThreshold: number,
        deletedAt: Date | null,
    ) {
        super(id, name, category, location);
        this.quantity = quantity;
        this.reorderThreshold = reorderThreshold;
        this.deletedAt = deletedAt;
    }

    public getQuantity(): number {
        return this.quantity;
    }

    public adjustQuantity(amount: number): number {
        const newQuantity = this.quantity + amount;

        if (newQuantity < 0) {
            throw new Error(`Cannot reduce ${this.name} below zero.`);
        }

        this.quantity = newQuantity;
        return this.quantity;
    }

    public isLowStock(): boolean {
        return this.quantity <= this.reorderThreshold;
    }

    public getStatusLabel(): string {
        return this.isLowStock() ? "Low Stock" : "In Stock";
    }

    public delete(): void {
    
        this.deletedAt = new Date();
    }
    
    public getDeletedAt(): Date | null {
        return this.deletedAt;
    }
}