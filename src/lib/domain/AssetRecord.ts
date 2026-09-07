export abstract class AssetRecord {
	protected readonly id: string;
	protected readonly name: string;
	protected readonly category: string;
	protected readonly location: string;

	constructor(id: string, name: string, category: string, location: string) {
		this.id = id;
		this.name = name;
		this.category = category;
		this.location = location;
	}

	public getId(): string {
		return this.id;
	}

	public getName(): string {
		return this.name;
	}

	public getCategory(): string {
		return this.category;
	}

	public getLocation(): string {
		return this.location;
	}

	public abstract getStatusLabel(): string;
}