import { describe, it, expect } from "vitest";
import { Tool } from "./Tool";
import { ToolStatus } from "@/generated/prisma/enums";

function makeTool(status: ToolStatus = ToolStatus.AVAILABLE) {
	return new Tool("tool-1", "Cordless Drill", "Power Tools", "Shop 1", status, null);
}

describe("Tool", () => {
	it("returns the values passed into its constructor via inherited getters", () => {
		const tool = makeTool();

		expect(tool.getId()).toBe("tool-1");
		expect(tool.getName()).toBe("Cordless Drill");
		expect(tool.getCategory()).toBe("Power Tools");
		expect(tool.getLocation()).toBe("Shop 1");
		expect(tool.getStatus()).toBe(ToolStatus.AVAILABLE);
	});

	it("labels an available tool as Available", () => {
		const tool = makeTool(ToolStatus.AVAILABLE);
		expect(tool.getStatusLabel()).toBe("Available");
	});

	it("labels a checked-out tool as Checked Out", () => {
		const tool = makeTool(ToolStatus.CHECKED_OUT);
		expect(tool.getStatusLabel()).toBe("Checked Out");
	});

	it("labels a tool under maintenance as Under Maintenance", () => {
		const tool = makeTool(ToolStatus.MAINTENANCE);
		expect(tool.getStatusLabel()).toBe("Under Maintenance");
	});

	it("transitions an available tool to checked out", () => {
		const tool = makeTool(ToolStatus.AVAILABLE);
		tool.checkOut();
		expect(tool.getStatus()).toBe(ToolStatus.CHECKED_OUT);
	});

	it("refuses to check out a tool that is already checked out", () => {
		const tool = makeTool(ToolStatus.CHECKED_OUT);
		expect(() => tool.checkOut()).toThrow();
		expect(tool.getStatus()).toBe(ToolStatus.CHECKED_OUT);
	});

	it("refuses to check out a tool under maintenance", () => {
		const tool = makeTool(ToolStatus.MAINTENANCE);
		expect(() => tool.checkOut()).toThrow();
		expect(tool.getStatus()).toBe(ToolStatus.MAINTENANCE);
	});

	it("transitions a checked-out tool back to available on check in", () => {
		const tool = makeTool(ToolStatus.CHECKED_OUT);
		tool.checkIn();
		expect(tool.getStatus()).toBe(ToolStatus.AVAILABLE);
	});

	it("sets deletedAt when deleting an available tool", () => {
		const tool = makeTool(ToolStatus.AVAILABLE);
		expect(tool.getDeletedAt()).toBeNull();
		tool.delete();
		expect(tool.getDeletedAt()).toBeInstanceOf(Date);
	});

	it("refuses to delete a tool that is checked out", () => {
		const tool = makeTool(ToolStatus.CHECKED_OUT);
		expect(() => tool.delete()).toThrow();
		expect(tool.getDeletedAt()).toBeNull();
	});
});