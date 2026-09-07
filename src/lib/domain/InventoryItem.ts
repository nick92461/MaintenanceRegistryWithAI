import { AssetRecord } from "./AssetRecord";

export class InventoryItem extends AssetRecord {
    private quantity: number;
    private readonly reorderThreshold: number;

    constructor(
        id: string,
        name: string,
        category: string,
        location: string,
        quantity: number,
        reorderThreshold: number,
    ) {
        super(id, name, category, location);
        this.quantity = quantity;
        this.reorderThreshold = reorderThreshold;
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
}