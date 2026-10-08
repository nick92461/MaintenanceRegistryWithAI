// The saved registry the assistant sees through list_records in "std" scenarios: a realistic
// property partway through setup. Scenarios that collide with these records do so on purpose.

export type SavedInventory = { name: string; category: string; location: string; quantity: number; reorderThreshold: number };
export type SavedTool = { name: string; category: string; location: string };

const inv = (name: string, category: string, location: string, quantity: number, reorderThreshold: number): SavedInventory => ({
    name,
    category,
    location,
    quantity,
    reorderThreshold,
});

const tool = (name: string, category: string, location: string): SavedTool => ({ name, category, location });

const byName = <T extends { name: string }>(rows: T[]): T[] => [...rows].sort((a, b) => a.name.localeCompare(b.name));

export const STD_INVENTORY: SavedInventory[] = byName([
    inv("AA Batteries", "Batteries", "Shop 1", 240, 48),
    inv("AAA Batteries", "Batteries", "Shop 1", 120, 24),
    inv("9V Batteries", "Batteries", "Shop 1", 36, 12),
    inv("3000K LED A19 Bulbs", "Lighting", "Shop 1", 60, 20),
    inv("5000K LED A19 Bulbs", "Lighting", "Shop 1", 40, 12),
    inv("4ft LED Tube Lights", "Lighting", "Shop 1", 24, 6),
    inv("Yellow Wire Nuts", "Electrical", "Shop 1", 300, 50),
    inv("Electrical Tape", "Electrical", "Shop 1", 18, 6),
    inv("Single-Pole Light Switches", "Electrical", "Shop 1", 25, 5),
    inv("GFCI Outlets", "Electrical", "Shop 1", 12, 4),
    inv("Duplex Outlets", "Electrical", "Shop 1", 40, 10),
    inv("Outlet Cover Plates", "Electrical", "Shop 1", 60, 15),
    inv("Smoke Detectors", "Safety", "Shop 1", 15, 5),
    inv("Toilet Flappers", "Plumbing", "Shop 2", 30, 8),
    inv("Toilet Fill Valves", "Plumbing", "Shop 2", 15, 5),
    inv("Wax Rings", "Plumbing", "Shop 2", 20, 6),
    inv("Moen 1225 Faucet Cartridges", "Plumbing", "Shop 2", 10, 3),
    inv("Teflon Tape", "Plumbing", "Shop 2", 24, 6),
    inv("3/8 x 20in Faucet Supply Lines", "Plumbing", "Shop 2", 18, 6),
    inv("1-1/2in P-Traps", "Plumbing", "Shop 2", 8, 3),
    inv("Plumber's Putty", "Plumbing", "Shop 2", 6, 2),
    inv("Drain Cleaner Gel", "Chemicals", "Shop 2", 12, 4),
    inv("Duct Tape", "Tape", "Shop 2", 18, 6),
    inv("Drywall Screws 1-5/8in", "Fasteners", "Shop 3", 2000, 500),
    inv("#8 x 2in Wood Screws", "Fasteners", "Shop 3", 800, 200),
    inv("Drywall Anchors", "Fasteners", "Shop 3", 400, 100),
    inv("Utility Knife Blades", "Cutting", "Shop 3", 100, 25),
    inv("8in Zip Ties", "Fasteners", "Shop 3", 500, 100),
    inv("White Siliconized Caulk", "Sealants", "Shop 3", 24, 8),
    inv("Spackle", "Drywall", "Shop 3", 10, 3),
    inv("120 Grit Sandpaper", "Abrasives", "Shop 3", 50, 15),
    inv("Work Gloves", "PPE", "Shop 3", 24, 8),
    inv("Safety Glasses", "PPE", "Shop 3", 12, 4),
    inv("N95 Dust Masks", "PPE", "Shop 3", 40, 10),
    inv("Interior Eggshell White Paint (Gallon)", "Paint", "Paint Room", 14, 4),
    inv("Flat White Ceiling Paint (Gallon)", "Paint", "Paint Room", 8, 3),
    inv("Primer (Gallon)", "Paint", "Paint Room", 6, 2),
    inv("9in Paint Roller Covers", "Painting Supplies", "Paint Room", 30, 10),
    inv("Painter's Tape", "Painting Supplies", "Paint Room", 20, 6),
    inv("Plastic Drop Cloths", "Painting Supplies", "Paint Room", 15, 5),
    inv("16x25x1 Furnace Filters", "HVAC", "Boiler Room", 48, 12),
    inv("20x20x1 Furnace Filters", "HVAC", "Boiler Room", 36, 12),
    inv("Condensate Pan Tablets", "HVAC", "Boiler Room", 50, 10),
    inv("Ice Melt (50 lb Bags)", "Grounds", "Garage", 20, 5),
    inv("55 Gallon Trash Bags", "Janitorial", "Garage", 200, 50),
    inv("2-Cycle Engine Oil", "Grounds", "Garage", 12, 4),
    inv("Trimmer Line", "Grounds", "Garage", 6, 2),
]);

export const STD_TOOLS: SavedTool[] = byName([
    tool("Cordless Drill 1", "Power Tools", "Shop 1"),
    tool("Cordless Drill 2", "Power Tools", "Shop 1"),
    tool("Cordless Drill 3", "Power Tools", "Shop 1"),
    tool("Impact Driver 1", "Power Tools", "Shop 1"),
    tool("Impact Driver 2", "Power Tools", "Shop 1"),
    tool("Multimeter", "Electrical Testers", "Shop 1"),
    tool("Voltage Tester 1", "Electrical Testers", "Shop 1"),
    tool("Voltage Tester 2", "Electrical Testers", "Shop 1"),
    tool("Drain Auger", "Plumbing Tools", "Shop 2"),
    tool("Toilet Auger", "Plumbing Tools", "Shop 2"),
    tool("Pipe Wrench 1", "Plumbing Tools", "Shop 2"),
    tool("Pipe Wrench 2", "Plumbing Tools", "Shop 2"),
    tool("Plunger 1", "Plumbing Tools", "Shop 2"),
    tool("Plunger 2", "Plumbing Tools", "Shop 2"),
    tool("Reciprocating Saw", "Power Tools", "Shop 3"),
    tool("Circular Saw", "Power Tools", "Shop 3"),
    tool("Stud Finder", "Hand Tools", "Shop 3"),
    tool("6ft Step Ladder 1", "Ladders", "Garage"),
    tool("6ft Step Ladder 2", "Ladders", "Garage"),
    tool("Extension Ladder", "Ladders", "Garage"),
    tool("Pressure Washer", "Grounds Equipment", "Garage"),
    tool("Leaf Blower 1", "Grounds Equipment", "Garage"),
    tool("Leaf Blower 2", "Grounds Equipment", "Garage"),
    tool("Snow Blower", "Grounds Equipment", "Garage"),
    tool("Shop Vac 1", "Cleaning Equipment", "Garage"),
    tool("Shop Vac 2", "Cleaning Equipment", "Garage"),
    tool("Carpet Extractor", "Cleaning Equipment", "Garage"),
    tool("Hand Truck", "Moving Equipment", "Garage"),
]);

export type RegistryKey = "std" | "empty";

export function getRegistry(key: RegistryKey): { inventory: SavedInventory[]; tools: SavedTool[] } {
    return key === "std" ? { inventory: STD_INVENTORY, tools: STD_TOOLS } : { inventory: [], tools: [] };
}
