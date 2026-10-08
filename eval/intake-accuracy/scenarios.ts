// The answer key. Every scenario states, for each checkpoint (the end of each supervisor message),
// exactly what the draft table should hold if the assistant faithfully records what the supervisor
// has actually said so far. Written before any chatbot run; see README.md for the rules.
//
//   draft  - derivable from what was said: must be drafted with this kind, quantity and location
//            (asking about it instead is allowed and counted as an unnecessary question)
//   ask    - underdetermined: must not be drafted with an invented value; must be asked about
//            (a faithful alternative representation listed in `alt` is also accepted)
//   skip   - already saved (or a restock/usage of a saved item): must not be drafted again
//   absent - retracted, hypothetical, or not inventory: must not be drafted

import type { RegistryKey } from "./registry";

export type Kind = "inventory" | "tool" | "either";
export type Matcher = { all: RegExp[]; not?: RegExp };
export type Loc = { re: RegExp; ex: string } | null; // null: the supervisor gave no location
export type Alt = { kind: Kind; names: Matcher; qty: number[]; loc: Loc; ex: string };

type Base = { id: string; note?: string };
// askOk: asking about this derivable item is reasonable (the system prompt tells the assistant to ask, or the
// question genuinely helps), so an ask here is not counted as an unnecessary question.
export type DraftItem = Base & { type: "draft"; kind: Kind; names: Matcher; qty: number[]; loc: Loc; ex: string; kw?: RegExp; alt?: Alt[]; askOk?: boolean };
// skipOk: treating the item as an already-saved record is also faithful, provided the reply says so.
export type AskItem = Base & { type: "ask"; names: Matcher; kw: RegExp; alt?: Alt[]; skipOk?: boolean };
export type SkipItem = Base & { type: "skip"; names: Matcher; loc: Loc };
export type AbsentItem = Base & { type: "absent"; names: Matcher };
export type Item = DraftItem | AskItem | SkipItem | AbsentItem;

export type Turn = { say: string; truth: Item[] };
export type Fluency = "precise" | "casual" | "spoken" | "terse" | "typos";
export type Scenario = {
    id: string;
    fluency: Fluency;
    tags: string[];
    registry: RegistryKey;
    mode: "demo" | "standard";
    reps: number;
    turns: Turn[];
};

// ---------- builders ----------

const m = (...all: RegExp[]): Matcher => ({ all });
const mn = (not: RegExp, ...all: RegExp[]): Matcher => ({ all, not });
const q = (qty: number | number[]): number[] => (Array.isArray(qty) ? qty : [qty]);

function D(id: string, kind: Kind, names: Matcher, qty: number | number[], loc: Loc, ex: string, x: { kw?: RegExp; alt?: Alt[]; note?: string; askOk?: boolean } = {}): DraftItem {
    return { id, type: "draft", kind, names, qty: q(qty), loc, ex, ...x };
}

function A(id: string, names: Matcher, kw: RegExp, x: { alt?: Alt[]; note?: string; skipOk?: boolean } = {}): AskItem {
    return { id, type: "ask", names, kw, ...x };
}

function S(id: string, names: Matcher, loc: Loc, note?: string): SkipItem {
    return { id, type: "skip", names, loc, note };
}

function X(id: string, names: Matcher, note?: string): AbsentItem {
    return { id, type: "absent", names, note };
}

function alt(kind: Kind, names: Matcher, qty: number | number[], loc: Loc, ex: string): Alt {
    return { kind, names, qty: q(qty), loc, ex };
}

type TurnSpec = [string, Item[]];

function sc(id: string, fluency: Fluency, tags: string[], registry: RegistryKey, turns: TurnSpec[], opts: { mode?: "demo" | "standard"; reps?: number } = {}): Scenario {
    return {
        id,
        fluency,
        tags,
        registry,
        mode: opts.mode ?? "demo",
        reps: opts.reps ?? 3,
        turns: turns.map(([say, truth]) => ({ say, truth })),
    };
}

const one = (id: string, fluency: Fluency, tags: string[], registry: RegistryKey, say: string, truth: Item[]) => sc(id, fluency, tags, registry, [[say, truth]]);

// ---------- locations ----------

const shop = (n: string, word: string): Loc => ({ re: new RegExp(`sh(op)?\\s*#?\\s*(${n}|${word})\\b`, "i"), ex: `Shop ${n}` });
const L = {
    shop1: shop("1", "one"),
    shop2: shop("2", "two"),
    shop3: shop("3", "three"),
    shop4: shop("4", "four"),
    shop5: shop("5", "five"),
    shopA: { re: /shop\s*a\b/i, ex: "Shop A" },
    shopB: { re: /shop\s*b\b/i, ex: "Shop B" },
    garage: { re: /gara(g|j)e/i, ex: "Garage" },
    paint: { re: /paint\s*room/i, ex: "Paint Room" },
    paintCloset: { re: /paint\s*closet/i, ex: "Paint Closet" },
    boiler: { re: /boiler/i, ex: "Boiler Room" },
    club: { re: /club\s*house/i, ex: "Clubhouse" },
    pool: { re: /pool\s*hous/i, ex: "Pool House" },
    leasing: { re: /leasing/i, ex: "Leasing Office" },
    shed: { re: /shed/i, ex: "Grounds Shed" },
    maint: { re: /maint/i, ex: "Maintenance Shop" },
    none: null,
} satisfies Record<string, Loc>;

// ---------- shared name matchers ----------

const AA = /(^|[^a-z])aa([^a-z]|$)|double\s*a/i;
const AAA = /aaa|triple\s*a/i;
const NINE_V = /(^|[^0-9])9\s*-?\s*v(olt)?\b|nine\s*-?\s*volt/i;
const WIRE_NUTS = /wire\s*nut|wire\s*connector|twist.?on/i;
const ZIP = /zip\s*-?\s*tie|cable\s*tie/i;
const GFCI = /gfci|gfi\b|ground\s*fault/i;
const TAPE_MEASURE = /tape\s*measure|measuring\s*tape/i;
const CAULK_TUBE = mn(/gun/i, /caulk|silicone/i);
const CAULK_GUN = m(/caulk/i, /gun/i);
const HACKSAW = mn(/blade/i, /hack\s*-?\s*saw/i);
const SHOVEL = /shovel/i;
const SAND = /sand\s*paper|sanding/i;

// ---------- scenarios ----------

export const SCENARIOS: Scenario[] = [
    // ===== Group A: a brand-new property, nothing saved yet =====
    one("A01", "precise", ["clean"], "empty", "Shop A: 150 wire nuts, 40 zip ties, 12 rolls of electrical tape, 2 hammer drills.", [
        D("wire-nuts", "inventory", m(WIRE_NUTS), 150, L.shopA, "Wire Nuts"),
        D("zip-ties", "inventory", m(ZIP), 40, L.shopA, "Zip Ties"),
        D("elec-tape", "inventory", m(/elec(trical|tric)?\s*tape/i), 12, L.shopA, "Electrical Tape"),
        D("hammer-drills", "tool", m(/hammer\s*drill/i), 2, L.shopA, "Hammer Drill"),
    ]),
    one("A02", "precise", ["arithmetic"], "empty", "Maintenance shop: 8 boxes of utility knife blades, 100 per box. 3 cases of contractor trash bags, 50 bags per case. 2 dozen pairs of work gloves.", [
        D("blades", "inventory", m(/blade/i), 800, L.maint, "Utility Knife Blades"),
        D("trash-bags", "inventory", m(/bag/i), 150, L.maint, "Contractor Trash Bags"),
        D("gloves", "either", m(/glove/i), 24, L.maint, "Work Gloves"),
    ]),
    one("A03", "casual", ["approximate", "a-couple"], "empty", "ok in the clubhouse closet we've got like 6 mops, 4 brooms, maybe 10 gallons of floor cleaner and a couple dust pans", [
        D("mops", "either", m(/\bmops?\b|mop\s*head/i), 6, L.club, "Mops"),
        D("brooms", "either", m(/broom/i), 4, L.club, "Brooms"),
        D("floor-cleaner", "inventory", m(/clean/i), 10, L.club, "Floor Cleaner (Gallon)"),
        D("dust-pans", "either", m(/dust\s*pan/i), 2, L.club, "Dust Pans"),
    ]),
    one("A04", "spoken", ["homophone", "self-correction"], "empty", "alright so the pool house has um four life rings and uh for pool skimmer nets and like twenty jugs of chlorine no wait twelve jugs of chlorine", [
        D("life-rings", "either", m(/life\s*ring|ring\s*buoy|life\s*buoy|life\s*preserver/i), 4, L.pool, "Life Rings"),
        D("skimmer-nets", "either", m(/skimmer|net/i), 4, L.pool, "Pool Skimmer Nets"),
        D("chlorine", "inventory", m(/chlorine/i), 12, L.pool, "Chlorine (Jug)"),
    ]),
    one("A05", "terse", ["clean"], "empty", "Shop B - 10 hammers, 6 tape measures, 2 levels, 1 stud finder", [
        D("hammers", "tool", m(/hammer/i), 10, L.shopB, "Hammer"),
        D("tape-measures", "either", m(TAPE_MEASURE), 6, L.shopB, "Tape Measure"),
        D("levels", "either", m(/level/i), 2, L.shopB, "Level"),
        D("stud-finder", "tool", m(/stud\s*finder/i), 1, L.shopB, "Stud Finder"),
    ]),
    one("A06", "typos", ["misspelling"], "empty", "in the garaje we have 3 wheelbarow, 20 bag of mulch and 2 rake", [
        D("wheelbarrows", "either", m(/wheel\s*barr?ow/i), 3, L.garage, "Wheelbarrow"),
        D("mulch", "inventory", m(/mulch/i), 20, L.garage, "Mulch (Bag)"),
        D("rakes", "either", m(/rake/i), 2, L.garage, "Rake"),
    ]),
    one("A07", "casual", ["retraction"], "empty", "Grounds shed: a chainsaw, no actually it's a pole saw, 2 leaf blowers, and 3 gas cans", [
        D("pole-saw", "tool", m(/pole\s*saw/i), 1, L.shed, "Pole Saw"),
        X("chainsaw", m(/chain\s*saw/i), "retracted in the same breath"),
        D("leaf-blowers", "tool", m(/blower/i), 2, L.shed, "Leaf Blower"),
        D("gas-cans", "either", m(/gas\s*can|fuel\s*can|gas\s*container/i), 3, L.shed, "Gas Can"),
    ]),
    one("A08", "casual", ["repeat-consistent"], "empty", "Shop B has 50 hose clamps, 30 pipe straps, and yeah the hose clamps, there's 50 of those.", [
        D("hose-clamps", "inventory", m(/hose\s*clamp/i), 50, L.shopB, "Hose Clamps", { note: "mentioned twice with the same number: 50, not 100" }),
        D("pipe-straps", "inventory", m(/strap/i), 30, L.shopB, "Pipe Straps"),
    ]),
    one("A09", "precise", ["repeat-additive"], "empty", "Shop B: 20 furnace filters 16x20x1 on the bottom shelf and another 10 of the 16x20x1 up top.", [
        D("filters-16x20", "inventory", m(/16\s*"?\s*x\s*20/i), 30, L.shopB, "16x20x1 Furnace Filters", { note: "'another 10' adds to the 20: 30 total" }),
    ]),
    one("A10", "casual", ["missing-pack-size"], "empty", "Shop A has 3 boxes of drywall screws and 2 boxes of deck screws.", [
        A("drywall-screws", m(/drywall|sheet\s*rock/i, /screw/i), /drywall|sheet\s*rock|screw/i, {
            alt: [alt("inventory", m(/drywall|sheet\s*rock/i, /screw/i, /box/i), 3, L.shopA, "Drywall Screws (Box)")],
            note: "screws per box unknown: ask, or record 3 boxes as boxes",
        }),
        A("deck-screws", m(/deck/i, /screw/i), /deck|screw/i, {
            alt: [alt("inventory", m(/deck/i, /screw/i, /box/i), 2, L.shopA, "Deck Screws (Box)")],
        }),
    ]),
    one("A11", "casual", ["range"], "empty", "Clubhouse: 30 or 40 light bulbs, the 60 watt kind, and 6 replacement ballasts", [
        A("bulbs", m(/bulb|lamp/i), /bulb|lamp|30|40/i, { note: "30 or 40 is a range, not a count" }),
        D("ballasts", "inventory", m(/ballast/i), 6, L.club, "Ballasts"),
    ]),
    one("A12", "casual", ["vague-quantity"], "empty", "Maintenance shop: a bunch of sandpaper, a few putty knives, and 12 tubes of caulk.", [
        A("sandpaper", m(SAND), SAND),
        A("putty-knives", m(/putty/i), /putty/i),
        D("caulk", "inventory", CAULK_TUBE, 12, L.maint, "Caulk (Tube)"),
    ]),
    one("A13", "casual", ["multi-location"], "empty", "In shop A there's 10 pry bars, and in the garage there's 3 snow shovels and 2 ice scrapers.", [
        D("pry-bars", "tool", m(/pry\s*bar|crow\s*bar/i), 10, L.shopA, "Pry Bar"),
        D("snow-shovels", "either", m(SHOVEL), 3, L.garage, "Snow Shovel"),
        D("ice-scrapers", "either", m(/scraper/i), 2, L.garage, "Ice Scraper"),
    ]),
    one("A14", "casual", ["location-change"], "empty", "Shop A: 5 caulk guns, 8 putty knives. The rest is in shop B: 12 paint brushes and 4 paint trays.", [
        D("caulk-guns", "tool", CAULK_GUN, 5, L.shopA, "Caulk Gun"),
        D("putty-knives", "either", m(/putty/i), 8, L.shopA, "Putty Knife"),
        D("brushes", "either", m(/brush/i), 12, L.shopB, "Paint Brushes"),
        D("trays", "either", m(/tray/i), 4, L.shopB, "Paint Trays"),
    ]),
    one("A15", "casual", ["arithmetic"], "empty", "Shop A has two and a half dozen air filters, the 20x25x1s, and half a dozen 14x20x1s.", [
        D("filters-20x25", "inventory", m(/20\s*"?\s*x\s*25/i), 30, L.shopA, "20x25x1 Air Filters"),
        D("filters-14x20", "inventory", m(/14\s*"?\s*x\s*20/i), 6, L.shopA, "14x20x1 Air Filters"),
    ]),
    one("A16", "precise", ["arithmetic"], "empty", "Shop B: 5 packs of AA batteries, 24 to a pack, and 3 packs of 9 volts, 4 per pack.", [
        D("aa", "inventory", m(AA), 120, L.shopB, "AA Batteries"),
        D("9v", "inventory", m(NINE_V), 12, L.shopB, "9V Batteries"),
    ]),
    one("A17", "precise", ["units"], "empty", "Shop B: one 250 foot roll of 12-2 romex and 2 boxes of 1/2 inch romex connectors, 25 per box.", [
        D("romex", "inventory", mn(/connector/i, /romex|12\s*[-/]\s*2|nm-?b|wire|cable/i), [1, 250], L.shopB, "12-2 Romex (250 ft Roll)", {
            note: "1 roll or 250 feet are both faithful",
        }),
        D("connectors", "inventory", m(/connector/i), 50, L.shopB, "1/2in Romex Connectors"),
    ]),
    one("A18", "spoken", ["self-correction"], "empty", "so in the boiler room we got uh six 20x20 filters wait no those are 20x25s six of those and uh a gallon of coil cleaner", [
        D("filters-20x25", "inventory", m(/20\s*"?\s*x\s*25/i), 6, L.boiler, "20x25 Filters"),
        X("filters-20x20", m(/20\s*"?\s*x\s*20/i), "corrected to 20x25"),
        D("coil-cleaner", "inventory", m(/coil/i), 1, L.boiler, "Coil Cleaner (Gallon)"),
    ]),
    one("A19", "terse", ["abbreviation"], "empty", "Shop A: 6 adj wrenches, 4 chan locks, 10 sds bits", [
        D("wrenches", "either", m(/wrench/i), 6, L.shopA, "Adjustable Wrench"),
        D("channel-locks", "either", m(/chan|tongue|groove|plier/i), 4, L.shopA, "Channel Lock Pliers"),
        D("sds-bits", "either", m(/sds|bit/i), 10, L.shopA, "SDS Bits"),
    ]),
    one("A20", "casual", ["a-couple"], "empty", "Grounds shed: 2 hedge trimmers, a couple of loppers, and 15 bags of grass seed", [
        D("hedge-trimmers", "tool", m(/hedge/i), 2, L.shed, "Hedge Trimmer"),
        D("loppers", "either", m(/lopper/i), 2, L.shed, "Loppers"),
        D("grass-seed", "inventory", m(/seed/i), 15, L.shed, "Grass Seed (Bag)"),
    ]),
    one("A21", "typos", ["non-native"], "empty", "Shop B have 12 lite bulb LED 4000k and 6 smoke detecter, also 20 battery 9volt for the smoke detecter", [
        D("bulbs-4000k", "inventory", m(/4000/i), 12, L.shopB, "4000K LED Bulbs"),
        D("smoke", "either", m(/smoke/i), 6, L.shopB, "Smoke Detectors"),
        D("9v", "inventory", m(NINE_V), 20, L.shopB, "9V Batteries"),
    ]),
    one("A22", "casual", ["approximate", "arithmetic"], "empty", "Paint closet: about 15 gallons of interior white, 5 gallons of exterior white, and roughly 2 dozen roller covers", [
        D("interior", "inventory", m(/interior/i), 15, L.paintCloset, "Interior White Paint (Gallon)"),
        D("exterior", "inventory", m(/exterior/i), 5, L.paintCloset, "Exterior White Paint (Gallon)", {
            alt: [alt("inventory", m(/exterior/i, /5\s*-?\s*gal|bucket|pail/i), 1, L.paintCloset, "Exterior White Paint (5 Gallon Bucket)")],
        }),
        D("roller-covers", "inventory", m(/roller/i), 24, L.paintCloset, "Roller Covers"),
    ]),
    one("A23", "casual", ["unresolved-conflict"], "empty", "Shop B: 12 smoke detectors, or maybe 15, I'd have to recount. Also 20 CO detectors.", [
        A("smoke", m(/smoke/i), /smoke|12|15/i, { note: "the supervisor said he is not sure" }),
        D("co", "either", m(/(^|[^a-z])co([^a-z]|$)|carbon\s*monoxide/i), 20, L.shopB, "CO Detectors"),
    ]),
    one("A24", "precise", ["tool-numbering"], "empty", "Shop A: 3 cordless drills, 2 impact drivers, and 1 circular saw", [
        D("drills", "tool", m(/drill/i), 3, L.shopA, "Cordless Drill"),
        D("impact", "tool", m(/impact/i), 2, L.shopA, "Impact Driver"),
        D("circular", "tool", m(/circular/i), 1, L.shopA, "Circular Saw"),
    ]),

    // ===== Group B: the property already has 75 saved records (see registry.ts) =====
    one("B01", "casual", ["saved-duplicate", "reworded"], "std", "Shop 1 has the 9 volt batteries and the 3000 kelvin bulbs, plus 100 fuses.", [
        S("9v", m(NINE_V), L.shop1),
        S("3000k", m(/3000/i), L.shop1),
        D("fuses", "inventory", m(/fuse/i), 100, L.shop1, "Fuses"),
    ]),
    one("B02", "casual", ["saved-duplicate", "synonym", "near-miss-item"], "std", "Shop 3 has sheetrock screws, the inch and five-eighths ones, and 200 drywall nails.", [
        S("drywall-screws", m(/drywall|sheet\s*rock/i, /screw/i), L.shop3),
        D("drywall-nails", "inventory", m(/nail/i), 200, L.shop3, "Drywall Nails"),
    ]),
    one("B03", "precise", ["same-item-new-location"], "std", "The clubhouse has 48 AA batteries and 24 AAA batteries.", [
        D("aa", "inventory", m(AA), 48, L.club, "AA Batteries"),
        D("aaa", "inventory", m(AAA), 24, L.club, "AAA Batteries"),
    ]),
    one("B04", "casual", ["additional-tools"], "std", "We just bought 2 more impact drivers for shop 1 and a new multimeter for shop 1 too.", [
        D("impact", "tool", m(/impact/i), 2, L.shop1, "Impact Driver"),
        D("multimeter", "tool", m(/multi\s*-?\s*meter/i), 1, L.shop1, "Multimeter"),
    ]),
    one("B05", "casual", ["saved-duplicate", "tools"], "std", "Shop 2 has 2 plungers and 2 pipe wrenches.", [
        S("plungers", m(/plunger/i), L.shop2, "exactly the 2 already on file"),
        S("pipe-wrenches", m(/pipe\s*wrench/i), L.shop2, "exactly the 2 already on file"),
    ]),
    one("B06", "casual", ["saved-overlap-count"], "std", "Shop 2 has 4 plungers.", [
        D("plungers", "tool", m(/plunger/i), 2, L.shop2, "Plunger", { note: "2 are on file in Shop 2, so 2 new; drafting 4 would duplicate" }),
    ]),
    one("B07", "casual", ["restock-out-of-scope"], "std", "We got 10 more boxes of the yellow wire nuts in shop 1.", [
        S("wire-nuts", m(WIRE_NUTS), L.shop1, "restock of a saved item; the chat can't add stock"),
    ]),
    one("B08", "casual", ["usage-out-of-scope"], "std", "We used up 5 of the furnace filters in the boiler room today, the 16x25s.", [
        S("filters-16x25", m(/filter/i), L.boiler, "usage of a saved item, nothing to draft"),
    ]),
    one("B09", "casual", ["not-inventory", "near-miss-item"], "std", "Shop Vac 2 in the garage is broken. Also the garage has 4 shop vac filters.", [
        S("shop-vac", mn(/filter|bag/i, /vac/i), L.garage, "a broken saved tool is not a new record"),
        D("vac-filters", "inventory", m(/filter/i), 4, L.garage, "Shop Vac Filters"),
    ]),
    one("B10", "casual", ["question-mixed-in"], "std", "Do we have any duct tape on file? Also add 20 hose clamps to shop 4.", [
        X("duct-tape", m(/duct/i), "a question, not inventory"),
        D("hose-clamps", "inventory", m(/hose\s*clamp/i), 20, L.shop4, "Hose Clamps"),
    ]),
    one("B11", "spoken", ["self-correction"], "std", "um shop four we got uh ten caulk guns no wait not ten six caulk guns and uh fifty paint stir sticks", [
        D("caulk-guns", "tool", CAULK_GUN, 6, L.shop4, "Caulk Gun"),
        D("stir-sticks", "inventory", m(/stir/i), 50, L.shop4, "Paint Stir Sticks"),
    ]),
    one("B12", "spoken", ["homophone"], "std", "shop five has to ladders and for buckets", [
        D("ladders", "tool", m(/ladder/i), 2, L.shop5, "Ladder"),
        D("buckets", "either", m(/bucket/i), 4, L.shop5, "Bucket"),
    ]),
    one("B13", "casual", ["location-carry", "near-miss-item"], "std", "Shop 4 has 12 hacksaw blades and 6 hacksaws. Oh and 30 paint can openers. And 2 shop lights.", [
        D("hacksaw-blades", "inventory", m(/blade/i), 12, L.shop4, "Hacksaw Blades"),
        D("hacksaws", "tool", HACKSAW, 6, L.shop4, "Hacksaw"),
        D("can-openers", "either", m(/opener|can\s*key/i), 30, L.shop4, "Paint Can Openers"),
        D("shop-lights", "either", m(/light|lamp/i), 2, L.shop4, "Shop Light"),
    ]),
    one("B14", "casual", ["restock-out-of-scope", "missing-type"], "std", "Boiler room has 24 more furnace filters.", [
        S("filters", m(/filter/i), L.boiler, "restock of saved filters (two sizes on file): draft nothing, or ask"),
    ]),
    one("B15", "terse", ["missing-type"], "std", "Shop 4 has 36 batteries.", [
        A("batteries", m(/batter/i), /batter|type|kind|size/i, { note: "battery type unknown" }),
    ]),
    one("B16", "casual", ["range"], "std", "Pool house: 30 or 40 chlorine tablets and 2 pool vacuums", [
        A("chlorine", m(/chlorine/i), /chlorine|30|40/i),
        D("pool-vacuums", "tool", m(/vac/i), 2, L.pool, "Pool Vacuum"),
    ]),
    one("B17", "typos", ["misspelling", "same-item-new-location"], "std", "shop 4 hav 15 paint brushs 2 inch and 10 roller cover 9 inch", [
        D("brushes", "either", m(/brush/i), 15, L.shop4, "2in Paint Brushes"),
        D("roller-covers", "inventory", m(/roller/i), 10, L.shop4, "9in Roller Covers"),
    ]),
    one("B18", "terse", ["restock-out-of-scope", "near-miss-item"], "std", "Paint Room: 6 more gallons primer, 4 gal exterior white, 10 stir sticks", [
        S("primer", m(/primer/i), L.paint, "restock of saved primer"),
        D("exterior", "inventory", m(/exterior/i), 4, L.paint, "Exterior White Paint (Gallon)"),
        D("stir-sticks", "inventory", m(/stir/i), 10, L.paint, "Stir Sticks"),
    ]),
    one("B19", "casual", ["self-correction", "arithmetic"], "std", "Shop 4: 40 cable ties, scratch that, 60 cable ties, and 8 boxes of staples for the staple gun, 1000 per box", [
        D("cable-ties", "inventory", m(ZIP), 60, L.shop4, "Cable Ties"),
        D("staples", "inventory", m(/staple/i), 8000, L.shop4, "Staples"),
    ]),
    one("B20", "precise", ["clean", "mixed-kinds"], "std", "Shop 5: 3 shovels, 3 rakes, 40 bags of mulch, and 2 wheelbarrows.", [
        D("shovels", "either", m(SHOVEL), 3, L.shop5, "Shovel"),
        D("rakes", "either", m(/rake/i), 3, L.shop5, "Rake"),
        D("mulch", "inventory", m(/mulch/i), 40, L.shop5, "Mulch (Bag)"),
        D("wheelbarrows", "either", m(/wheel\s*barr?ow/i), 2, L.shop5, "Wheelbarrow"),
    ]),
    one("B21", "casual", ["vague-quantity"], "std", "Leasing office: a handful of light bulbs and 2 fire extinguishers", [
        A("bulbs", m(/bulb|lamp/i), /bulb|lamp|handful/i),
        D("extinguishers", "either", m(/extinguisher/i), 2, L.leasing, "Fire Extinguisher"),
    ]),
    one("B22", "casual", ["number-words"], "std", "Shop 4 has a hundred and twenty five drywall anchors and two hundred wood shims", [
        D("anchors", "inventory", m(/anchor/i), 125, L.shop4, "Drywall Anchors"),
        D("shims", "inventory", m(/shim/i), 200, L.shop4, "Wood Shims"),
    ]),
    one("B23", "casual", ["arithmetic", "similar-items"], "std", "Shop 5: half a box of 3 inch deck screws, they come 100 to a box, and a full box of 2 inch ones, same 100 count", [
        D("screws-3in", "inventory", m(/(^|[^0-9/])3\s*-?\s*("|''|in\b|in\.|inch)/i, /screw/i), 50, L.shop5, "3in Deck Screws"),
        D("screws-2in", "inventory", m(/(^|[^0-9/])2\s*-?\s*("|''|in\b|in\.|inch)/i, /screw/i), 100, L.shop5, "2in Deck Screws"),
    ]),
    one("B24", "casual", ["restock-out-of-scope", "multi-location"], "std", "Shop 2 has 6 toilet seats, and the garage has 4 more bags of ice melt.", [
        D("toilet-seats", "either", m(/seat/i), 6, L.shop2, "Toilet Seats"),
        S("ice-melt", m(/ice\s*melt|salt/i), L.garage, "restock of saved ice melt"),
    ]),
    one("B25", "casual", ["additional-tools"], "std", "Shop 4 has its own cordless drill now, just one.", [
        D("drill", "tool", m(/drill/i), 1, L.shop4, "Cordless Drill"),
    ]),
    one("B26", "casual", ["reference-same"], "std", "Shop 4 has 10 GFCI outlets, and shop 5 has the same amount.", [
        D("gfci-4", "inventory", m(GFCI), 10, L.shop4, "GFCI Outlets"),
        D("gfci-5", "inventory", m(GFCI), 10, L.shop5, "GFCI Outlets"),
    ]),
    one("B27", "spoken", ["not-inventory", "filler"], "std", "ok let me think um the leasing office has uh you know the copier paper isn't ours so skip that but we do keep 6 light bulbs there the 60 watt ones and uh 2 plungers", [
        X("copier-paper", m(/paper/i), "explicitly not theirs"),
        D("bulbs-60w", "inventory", m(/60/i), 6, L.leasing, "60W Light Bulbs"),
        D("plungers", "tool", m(/plunger/i), 2, L.leasing, "Plunger"),
    ]),
    one("B28", "spoken", ["slang"], "std", "shop five has twelve gfi outlets and um twenty romex staples", [
        D("gfci", "inventory", m(GFCI), 12, L.shop5, "GFCI Outlets"),
        D("staples", "inventory", m(/staple/i), 20, L.shop5, "Romex Staples"),
    ]),
    one("B29", "casual", ["approximate"], "std", "Shop 4: a dozen or so pipe straps and 3 pipe cutters", [
        D("pipe-straps", "inventory", m(/strap/i), 12, L.shop4, "Pipe Straps"),
        D("pipe-cutters", "tool", m(/cutter/i), 3, L.shop4, "Pipe Cutter"),
    ]),
    one("B30", "casual", ["usage-out-of-scope", "near-miss-item"], "std", "We're out of trimmer line in the garage, and we have 3 new string trimmers there.", [
        S("trimmer-line", m(/line/i), L.garage, "running out of a saved item is not a new record"),
        D("string-trimmers", "tool", mn(/line/i, /trimmer|weed\s*eater|whacker/i), 3, L.garage, "String Trimmer"),
    ]),
    one("B31", "casual", ["repeat-consistent"], "std", "Shop 4: 20 toggle bolts, 15 molly bolts, and the toggle bolts are the 1/4 inch ones", [
        D("toggle", "inventory", m(/toggle/i), 20, L.shop4, "1/4in Toggle Bolts"),
        D("molly", "inventory", m(/molly/i), 15, L.shop4, "Molly Bolts"),
    ]),
    one("B32", "casual", ["similar-items"], "std", "Boiler room has 12 of the 14x25x1 filters too.", [
        D("filters-14x25", "inventory", m(/14\s*"?\s*x\s*25/i), 12, L.boiler, "14x25x1 Furnace Filters"),
    ]),
    one("B33", "spoken", ["number-words"], "std", "the shed has like forty two by fours and a dozen sheets of plywood", [
        D("2x4", "inventory", m(/2\s*x\s*4|two\s*-?\s*by\s*-?\s*four/i), 40, L.shed, "2x4 Lumber"),
        D("plywood", "inventory", m(/plywood/i), 12, L.shed, "Plywood Sheets"),
    ]),
    one("B34", "typos", ["misspelling"], "std", "Pool hous: 4 pool brush, 2 telescopic pole, 1 leaf skimer", [
        D("brushes", "either", m(/brush/i), 4, L.pool, "Pool Brush"),
        D("poles", "either", m(/pole/i), 2, L.pool, "Telescopic Pole"),
        D("skimmer", "either", m(/skim/i), 1, L.pool, "Leaf Skimmer"),
    ]),
    one("B35", "casual", ["a-couple", "same-item-new-location"], "std", "The clubhouse has a couple of plungers and a toilet auger.", [
        D("plungers", "tool", m(/plunger/i), 2, L.club, "Plunger"),
        D("toilet-auger", "tool", m(/auger|snake/i), 1, L.club, "Toilet Auger"),
    ]),
    one("B36", "casual", ["approximate"], "std", "Shop 5: roughly 200 assorted wood screws", [
        D("wood-screws", "inventory", m(/screw/i), 200, L.shop5, "Assorted Wood Screws"),
    ]),
    one("B37", "terse", ["abbreviation"], "std", "sh4 10 lvl 2ft, 5 spd sq", [
        D("levels", "either", m(/level|lvl/i), 10, L.shop4, "2ft Level"),
        D("speed-squares", "either", m(/squar|spd\s*sq/i), 5, L.shop4, "Speed Square"),
    ]),
    one("B38", "casual", ["question-mixed-in"], "std", "Hey, quick one before I start, do you need me to list stuff by location? Anyway shop 4 has 8 pairs of safety glasses", [
        D("safety-glasses", "either", m(/glass|goggle/i), 8, L.shop4, "Safety Glasses"),
    ]),
    one("B39", "precise", ["saved-duplicate"], "std", "Shop 2: 30 toilet flappers and 15 fill valves.", [
        S("flappers", m(/flapper/i), L.shop2),
        S("fill-valves", m(/fill\s*valve/i), L.shop2),
    ]),
    one("B40", "precise", ["saved-duplicate", "different-count"], "std", "Shop 2: 40 toilet flappers.", [
        S("flappers", m(/flapper/i), L.shop2, "saved with 30; the chat can't change saved quantities, so no new record"),
    ]),
    one("B41", "spoken", ["saved-duplicate", "restock-out-of-scope"], "std", "uh shop one we have the double a's the triple a's and um a new box of fifty nine volt batteries", [
        S("aa", m(AA), L.shop1),
        S("aaa", m(AAA), L.shop1),
        S("9v", m(NINE_V), L.shop1, "a new box of a saved item is a restock"),
    ]),
    one("B43", "casual", ["implied-count"], "std", "Shop 5 has 4 tool bags, each with a hammer and a tape measure in it", [
        D("tool-bags", "either", m(/bag/i), 4, L.shop5, "Tool Bag"),
        D("hammers", "tool", m(/hammer/i), 4, L.shop5, "Hammer"),
        D("tape-measures", "either", m(TAPE_MEASURE), 4, L.shop5, "Tape Measure"),
    ]),
    one("B44", "casual", ["arithmetic"], "std", "Shop 4: 2 boxes of 50 wire nuts plus 30 loose ones", [
        D("wire-nuts", "inventory", m(WIRE_NUTS), 130, L.shop4, "Wire Nuts"),
    ]),
    one("B45", "casual", ["hedged-existence"], "std", "Shop 5 might have a ladder, I'm not sure, but it definitely has 6 extension cords.", [
        X("ladder", m(/ladder/i), "the supervisor is not sure it exists"),
        D("extension-cords", "either", m(/cord/i), 6, L.shop5, "Extension Cords"),
    ]),
    one("B46", "terse", ["notation", "similar-items"], "std", "Shop 4: furnace filters 20x20x1 x 12, 16x25x1 x 6", [
        D("filters-20x20", "inventory", m(/20\s*"?\s*x\s*20/i), 12, L.shop4, "20x20x1 Furnace Filters"),
        D("filters-16x25", "inventory", m(/16\s*"?\s*x\s*25/i), 6, L.shop4, "16x25x1 Furnace Filters"),
    ]),
    one("B47", "terse", ["notation"], "std", "Shop 5: 10 ea 3/4\" pvc couplings, 10 ea 3/4\" pvc elbows", [
        D("couplings", "inventory", m(/coupl/i), 10, L.shop5, "3/4in PVC Couplings"),
        D("elbows", "inventory", m(/elbow/i), 10, L.shop5, "3/4in PVC Elbows"),
    ]),
    one("B48", "precise", ["clean"], "std", "Shop 2 (the plumbing shop): 5 sink strainers and 3 toilet seats", [
        D("strainers", "inventory", m(/strainer/i), 5, L.shop2, "Sink Strainers"),
        D("toilet-seats", "either", m(/seat/i), 3, L.shop2, "Toilet Seats"),
    ]),
    one("B49", "casual", ["similar-items"], "std", "Shop 1 also has 20 dimmer switches", [
        D("dimmers", "inventory", m(/dimmer/i), 20, L.shop1, "Dimmer Switches"),
    ]),
    one("B50", "casual", ["same-item-new-location", "reference-same"], "std", "The clubhouse has the same light bulbs as shop 1, the 3000K ones, 24 of them.", [
        D("bulbs-3000k", "inventory", m(/3000/i), 24, L.club, "3000K LED A19 Bulbs"),
    ]),
    one("B51", "casual", ["mixed-kinds"], "std", "Shop 4 has 10 flashlights and 20 D batteries for them", [
        D("flashlights", "either", m(/flash\s*light/i), 10, L.shop4, "Flashlight"),
        D("d-batteries", "inventory", m(/(^|[^a-z])d([^a-z]|$)|d\s*-?\s*cell/i, /batter/i), 20, L.shop4, "D Batteries"),
    ]),
    one("B52", "spoken", ["number-words"], "std", "shop four has fifteen hundred zip ties", [
        D("zip-ties", "inventory", m(ZIP), 1500, L.shop4, "Zip Ties"),
    ]),
    one("B54", "precise", ["arithmetic"], "std", "Shop 5: 2 cases of paper towels, 30 rolls a case, and 1 case of toilet paper, 96 rolls", [
        D("paper-towels", "inventory", m(/paper\s*towel/i), 60, L.shop5, "Paper Towels (Roll)"),
        D("toilet-paper", "inventory", m(/toilet\s*paper|tissue/i), 96, L.shop5, "Toilet Paper (Roll)"),
    ]),
    one("B55", "casual", ["retraction"], "std", "Shop 4: 6 hard hats, 10 safety vests, and 4 respirators. Actually forget the respirators, those went back.", [
        D("hard-hats", "either", m(/hard\s*hat|helmet/i), 6, L.shop4, "Hard Hats"),
        D("vests", "either", m(/vest/i), 10, L.shop4, "Safety Vests"),
        X("respirators", m(/respirator/i), "retracted"),
    ]),
    one("B56", "terse", ["no-location"], "std", "We have 12 more door stops.", [
        D("door-stops", "inventory", m(/door\s*stop/i), 12, L.none, "Door Stops", { note: "no location given: ask, or leave it blank; inventing one is inaccurate" }),
    ]),
    one("B57", "terse", ["no-location", "possible-saved-duplicate"], "std", "50 outlet covers and 10 light switches", [
        A("outlet-covers", m(/cover|plate/i), /cover|plate|where|location/i, { note: "no location, and both items are saved in Shop 1", skipOk: true }),
        A("switches", m(/switch/i), /switch|where|location/i, { skipOk: true }),
    ]),
    one("B58", "casual", ["saved-duplicate", "tools"], "std", "The garage has 2 leaf blowers, the pressure washer, and the snow blower, plus 3 new rakes.", [
        S("leaf-blowers", m(/leaf/i), L.garage),
        S("pressure-washer", m(/pressure/i), L.garage),
        S("snow-blower", m(/snow/i), L.garage),
        D("rakes", "either", m(/rake/i), 3, L.garage, "Rake"),
    ]),
    one("B59", "casual", ["saved-duplicate", "different-count"], "std", "Shop 3 has 10 pairs of work gloves", [
        S("gloves", m(/glove/i), L.shop3, "saved with 24; no new record"),
    ]),
    one("B61", "typos", ["misspelling", "same-item-new-location"], "std", "shop 5 has 3 pressure washer and 1 leef blower", [
        D("pressure-washers", "tool", m(/pressure/i), 3, L.shop5, "Pressure Washer"),
        D("leaf-blower", "tool", m(/blower/i), 1, L.shop5, "Leaf Blower"),
    ]),
    one("B62", "spoken", ["self-correction", "filler"], "std", "and then uh shop four has um six of the uh what are they called the little plastic wall anchors no not anchors the um outlet spacers yeah six outlet spacers", [
        D("spacers", "inventory", m(/spacer/i), 6, L.shop4, "Outlet Spacers"),
        X("anchors", m(/anchor/i), "corrected to outlet spacers"),
    ]),
    one("B63", "casual", ["arithmetic", "near-miss-item"], "std", "Shop 4 - 2 shop vacs (the big ridgid ones) + 4 boxes of shop vac bags, 3 per box", [
        D("shop-vacs", "tool", mn(/bag|filter/i, /vac/i), 2, L.shop4, "Shop Vac"),
        D("vac-bags", "inventory", m(/bag/i), 12, L.shop4, "Shop Vac Bags"),
    ]),

    // ===== Group M: multi-turn conversations (graded at the end of every message) =====
    sc("M01", "casual", ["multi-turn", "answer-question"], "std", [
        ["Shop 4 has some PVC cement.", [A("pvc-cement", m(/cement|glue/i), /cement|glue|how many/i)]],
        ["6 cans", [D("pvc-cement", "inventory", m(/cement|glue/i), 6, L.shop4, "PVC Cement")]],
    ]),
    sc("M02", "casual", ["multi-turn", "missing-pack-size"], "std", [
        ["Shop 4: 3 boxes of 1-1/4 inch drywall screws", [
            A("screws", m(/drywall|sheet\s*rock/i, /screw/i), /screw|box/i, {
                alt: [alt("inventory", m(/drywall|sheet\s*rock/i, /screw/i, /box/i), 3, L.shop4, "1-1/4in Drywall Screws (Box)")],
            }),
        ]],
        ["they're 100 per box", [
            D("screws", "inventory", m(/drywall|sheet\s*rock/i, /screw/i), 300, L.shop4, "1-1/4in Drywall Screws", {
                alt: [alt("inventory", m(/drywall|sheet\s*rock/i, /screw/i, /100/i), 3, L.shop4, "1-1/4in Drywall Screws (Box of 100)")],
            }),
        ]],
    ]),
    sc("M03", "casual", ["multi-turn", "correction"], "std", [
        ["Clubhouse: 12 light bulbs, 60 watt", [D("bulbs", "inventory", m(/bulb|lamp|light/i), 12, L.club, "60W Light Bulbs")]],
        ["actually make that 18", [D("bulbs", "inventory", m(/bulb|lamp|light/i), 18, L.club, "60W Light Bulbs")]],
    ]),
    sc("M04", "casual", ["multi-turn", "retraction"], "std", [
        ["Garage: 2 chainsaws and 1 pole saw", [
            D("chainsaws", "tool", m(/chain\s*saw/i), 2, L.garage, "Chainsaw"),
            D("pole-saw", "tool", m(/pole\s*saw/i), 1, L.garage, "Pole Saw"),
        ]],
        ["scratch the chainsaws, we sold them", [
            X("chainsaws", m(/chain\s*saw/i)),
            D("pole-saw", "tool", m(/pole\s*saw/i), 1, L.garage, "Pole Saw"),
        ]],
    ]),
    sc("M05", "casual", ["multi-turn", "move-location"], "std", [
        ["Shop 4: 6 adjustable wrenches", [D("wrenches", "either", m(/wrench/i), 6, L.shop4, "Adjustable Wrench")]],
        ["oops, those are in shop 5, not shop 4", [D("wrenches", "either", m(/wrench/i), 6, L.shop5, "Adjustable Wrench")]],
    ]),
    sc("M06", "casual", ["multi-turn", "partial-answers"], "std", [
        ["Shop 4: batteries, some caulk, and 40 hose clamps", [
            A("batteries", m(/batter/i), /batter/i),
            A("caulk", CAULK_TUBE, /caulk|silicone/i),
            D("hose-clamps", "inventory", m(/hose\s*clamp/i), 40, L.shop4, "Hose Clamps"),
        ]],
        ["the batteries are D cells, 24 of them", [
            D("batteries", "inventory", m(/batter/i), 24, L.shop4, "D Batteries"),
            A("caulk", CAULK_TUBE, /caulk|silicone/i),
            D("hose-clamps", "inventory", m(/hose\s*clamp/i), 40, L.shop4, "Hose Clamps"),
        ]],
        ["the caulk is 10 tubes of clear silicone", [
            D("batteries", "inventory", m(/batter/i), 24, L.shop4, "D Batteries"),
            D("caulk", "inventory", CAULK_TUBE, 10, L.shop4, "Clear Silicone Caulk"),
            D("hose-clamps", "inventory", m(/hose\s*clamp/i), 40, L.shop4, "Hose Clamps"),
        ]],
    ]),
    sc("M07", "casual", ["multi-turn", "additive-update", "missing-pack-size"], "std", [
        ["Pool house: 4 buckets of chlorine tablets", [
            A("chlorine", m(/chlorine/i), /chlorine|bucket|tablet/i, {
                alt: [alt("inventory", m(/chlorine/i, /bucket/i), 4, L.pool, "Chlorine Tablets (Bucket)")],
            }),
        ]],
        ["found 2 more buckets in the back", [
            A("chlorine", m(/chlorine/i), /chlorine|bucket|tablet/i, {
                alt: [alt("inventory", m(/chlorine/i, /bucket/i), 6, L.pool, "Chlorine Tablets (Bucket)")],
            }),
        ]],
    ]),
    sc("M08", "casual", ["multi-turn", "correction"], "std", [
        ["Shop 4: about 50 cable staples", [D("staples", "inventory", m(/staple/i), 50, L.shop4, "Cable Staples")]],
        ["actually I counted, it's 62", [D("staples", "inventory", m(/staple/i), 62, L.shop4, "Cable Staples")]],
    ]),
    sc("M09", "casual", ["multi-turn", "saved-overlap-count"], "std", [
        ["Shop 1 has 5 cordless drills.", [D("drills", "tool", m(/drill/i), 2, L.shop1, "Cordless Drill", { note: "3 on file in Shop 1, so 2 new" })]],
        ["no, those 3 are the old ones, plus 5 brand new ones", [D("drills", "tool", m(/drill/i), 5, L.shop1, "Cordless Drill")]],
    ]),
    sc("M10", "casual", ["multi-turn", "question-mixed-in"], "std", [
        ["Garage: 3 rakes", [D("rakes", "either", m(/rake/i), 3, L.garage, "Rake")]],
        ["what low stock level did you pick for those?", [D("rakes", "either", m(/rake/i), 3, L.garage, "Rake")]],
    ]),
    sc("M11", "casual", ["multi-turn", "reference-same"], "std", [
        ["Shop 4: 2 shovels and 10 contractor bags", [
            D("shovels-4", "either", m(SHOVEL), 2, L.shop4, "Shovel"),
            D("bags-4", "inventory", m(/bag/i), 10, L.shop4, "Contractor Bags"),
        ]],
        ["shop 5 has the exact same stuff", [
            D("shovels-4", "either", m(SHOVEL), 2, L.shop4, "Shovel"),
            D("bags-4", "inventory", m(/bag/i), 10, L.shop4, "Contractor Bags"),
            D("shovels-5", "either", m(SHOVEL), 2, L.shop5, "Shovel"),
            D("bags-5", "inventory", m(/bag/i), 10, L.shop5, "Contractor Bags"),
        ]],
    ]),
    sc("M12", "casual", ["multi-turn", "missing-pack-size"], "std", [
        ["Shop 4: 2 cases of 60 watt bulbs", [
            A("bulbs", m(/bulb|lamp|light/i), /bulb|case|lamp/i, {
                alt: [alt("inventory", m(/bulb|lamp|light/i, /case/i), 2, L.shop4, "60W Bulbs (Case)")],
            }),
        ]],
        ["24 per case", [
            D("bulbs", "inventory", m(/bulb|lamp|light/i), 48, L.shop4, "60W Bulbs", {
                alt: [alt("inventory", m(/bulb|lamp|light/i, /24/i), 2, L.shop4, "60W Bulbs (Case of 24)")],
            }),
        ]],
    ]),

    // ===== Group D: near the demo's "about 20 items per message" limit, under demo settings =====
    one("D01", "precise", ["long-list", "demo-limit"], "empty", "Shop A inventory: 10 hammers, 6 tape measures, 4 levels, 2 cordless drills, 2 impact drivers, 1 circular saw, 1 shop vac, 2 extension cords, 200 wire nuts, 50 zip ties, 20 duplex outlets, 10 GFCI outlets, 15 light switches, 30 outlet covers, 24 AA batteries, 12 9V batteries, 10 rolls of electrical tape, 6 tubes of caulk, 2 caulk guns, 4 boxes of drywall screws (100 per box)", [
        D("hammers", "tool", m(/hammer/i), 10, L.shopA, "Hammer"),
        D("tape-measures", "either", m(TAPE_MEASURE), 6, L.shopA, "Tape Measure"),
        D("levels", "either", m(/level/i), 4, L.shopA, "Level"),
        D("drills", "tool", m(/drill/i), 2, L.shopA, "Cordless Drill"),
        D("impact", "tool", m(/impact/i), 2, L.shopA, "Impact Driver"),
        D("circular", "tool", m(/circular/i), 1, L.shopA, "Circular Saw"),
        D("shop-vac", "tool", m(/vac/i), 1, L.shopA, "Shop Vac"),
        D("ext-cords", "either", m(/cord/i), 2, L.shopA, "Extension Cord"),
        D("wire-nuts", "inventory", m(WIRE_NUTS), 200, L.shopA, "Wire Nuts"),
        D("zip-ties", "inventory", m(ZIP), 50, L.shopA, "Zip Ties"),
        D("duplex", "inventory", mn(/gfci|gfi|cover|plate/i, /duplex|outlet|receptacle/i), 20, L.shopA, "Duplex Outlets"),
        D("gfci", "inventory", m(GFCI), 10, L.shopA, "GFCI Outlets"),
        D("switches", "inventory", m(/switch/i), 15, L.shopA, "Light Switches"),
        D("covers", "inventory", m(/cover|plate/i), 30, L.shopA, "Outlet Covers"),
        D("aa", "inventory", m(AA), 24, L.shopA, "AA Batteries"),
        D("9v", "inventory", m(NINE_V), 12, L.shopA, "9V Batteries"),
        D("elec-tape", "inventory", m(/elec(trical|tric)?\s*tape/i), 10, L.shopA, "Electrical Tape"),
        D("caulk", "inventory", CAULK_TUBE, 6, L.shopA, "Caulk"),
        D("caulk-guns", "tool", CAULK_GUN, 2, L.shopA, "Caulk Gun"),
        D("drywall-screws", "inventory", m(/drywall|sheet\s*rock/i, /screw/i), 400, L.shopA, "Drywall Screws"),
    ]),
    one("D02", "casual", ["long-list", "demo-limit", "multi-location"], "std", "ok big one. shop 4 has 8 hammers, 4 hacksaws, 30 hacksaw blades, 2 pipe cutters, 20 hose clamps and 6 cans of pvc cement. shop 5 has 3 shovels, 3 rakes, 2 wheelbarrows, 40 bags of mulch and 10 bags of grass seed. the clubhouse has 24 AA batteries, 12 light bulbs (60 watt), 2 plungers, 1 toilet auger, 4 mops, 4 brooms and 2 gallons of floor cleaner", [
        D("hammers", "tool", m(/hammer/i), 8, L.shop4, "Hammer"),
        D("hacksaws", "tool", HACKSAW, 4, L.shop4, "Hacksaw"),
        D("hacksaw-blades", "inventory", m(/blade/i), 30, L.shop4, "Hacksaw Blades"),
        D("pipe-cutters", "tool", m(/cutter/i), 2, L.shop4, "Pipe Cutter"),
        D("hose-clamps", "inventory", m(/hose\s*clamp/i), 20, L.shop4, "Hose Clamps"),
        D("pvc-cement", "inventory", m(/cement|glue/i), 6, L.shop4, "PVC Cement"),
        D("shovels", "either", m(SHOVEL), 3, L.shop5, "Shovel"),
        D("rakes", "either", m(/rake/i), 3, L.shop5, "Rake"),
        D("wheelbarrows", "either", m(/wheel\s*barr?ow/i), 2, L.shop5, "Wheelbarrow"),
        D("mulch", "inventory", m(/mulch/i), 40, L.shop5, "Mulch (Bag)"),
        D("grass-seed", "inventory", m(/seed/i), 10, L.shop5, "Grass Seed (Bag)"),
        D("aa", "inventory", m(AA), 24, L.club, "AA Batteries"),
        D("bulbs", "inventory", m(/bulb|lamp|light/i), 12, L.club, "60W Light Bulbs"),
        D("plungers", "tool", m(/plunger/i), 2, L.club, "Plunger"),
        D("toilet-auger", "tool", m(/auger|snake/i), 1, L.club, "Toilet Auger"),
        D("mops", "either", m(/\bmops?\b|mop\s*head/i), 4, L.club, "Mop"),
        D("brooms", "either", m(/broom/i), 4, L.club, "Broom"),
        D("floor-cleaner", "inventory", m(/clean/i), 2, L.club, "Floor Cleaner (Gallon)"),
    ]),

    // ===== Group L: long lists under the full app's settings (too long for the demo's 1,500-character cap) =====
    sc("L01", "spoken", ["long-list", "self-correction"], "empty", [[
        "ok shop a here we go we got 24 hammers no wait 4 hammers 6 tape measures 2 levels a 4 foot and a 2 foot so 2 levels 3 cordless drills 2 impact drivers 1 circular saw 1 reciprocating saw 50 wire nuts 3 rolls electrical tape 12 light switches 10 outlets 20 outlet covers 6 GFCI outlets 2 voltage testers 1 multimeter 15 utility knife blades 3 utility knives 40 zip ties 10 tubes of caulk 2 caulk guns 5 putty knives 1 box of drywall screws 100 count 50 drywall anchors 6 sheets of sandpaper 4 pairs of safety glasses 10 pairs of work gloves 2 shop vacs 1 hand truck and 3 extension cords",
        [
            D("hammers", "tool", m(/hammer/i), 4, L.shopA, "Hammer"),
            D("tape-measures", "either", m(TAPE_MEASURE), 6, L.shopA, "Tape Measure"),
            D("levels", "either", m(/level/i), 2, L.shopA, "Level"),
            D("drills", "tool", m(/drill/i), 3, L.shopA, "Cordless Drill"),
            D("impact", "tool", m(/impact/i), 2, L.shopA, "Impact Driver"),
            D("circular", "tool", m(/circular/i), 1, L.shopA, "Circular Saw"),
            D("recip", "tool", m(/recip|sawzall/i), 1, L.shopA, "Reciprocating Saw"),
            D("wire-nuts", "inventory", m(WIRE_NUTS), 50, L.shopA, "Wire Nuts"),
            D("elec-tape", "inventory", m(/elec(trical|tric)?\s*tape/i), 3, L.shopA, "Electrical Tape"),
            D("switches", "inventory", m(/switch/i), 12, L.shopA, "Light Switches"),
            D("outlets", "inventory", mn(/gfci|gfi|cover|plate/i, /outlet|receptacle/i), 10, L.shopA, "Outlets"),
            D("covers", "inventory", m(/cover|plate/i), 20, L.shopA, "Outlet Covers"),
            D("gfci", "inventory", m(GFCI), 6, L.shopA, "GFCI Outlets"),
            D("voltage-testers", "tool", m(/voltage|tester/i), 2, L.shopA, "Voltage Tester"),
            D("multimeter", "tool", m(/multi\s*-?\s*meter/i), 1, L.shopA, "Multimeter"),
            D("blades", "inventory", m(/blade/i), 15, L.shopA, "Utility Knife Blades"),
            D("utility-knives", "either", mn(/blade|putty/i, /knife|knives/i), 3, L.shopA, "Utility Knife"),
            D("zip-ties", "inventory", m(ZIP), 40, L.shopA, "Zip Ties"),
            D("caulk", "inventory", CAULK_TUBE, 10, L.shopA, "Caulk"),
            D("caulk-guns", "tool", CAULK_GUN, 2, L.shopA, "Caulk Gun"),
            D("putty-knives", "either", m(/putty/i), 5, L.shopA, "Putty Knife"),
            D("drywall-screws", "inventory", m(/drywall|sheet\s*rock/i, /screw/i), 100, L.shopA, "Drywall Screws"),
            D("anchors", "inventory", m(/anchor/i), 50, L.shopA, "Drywall Anchors"),
            D("sandpaper", "inventory", m(SAND), 6, L.shopA, "Sandpaper Sheets"),
            D("safety-glasses", "either", m(/glass|goggle/i), 4, L.shopA, "Safety Glasses"),
            D("gloves", "either", m(/glove/i), 10, L.shopA, "Work Gloves"),
            D("shop-vacs", "tool", m(/vac/i), 2, L.shopA, "Shop Vac"),
            D("hand-truck", "tool", m(/hand\s*truck|dolly/i), 1, L.shopA, "Hand Truck"),
            D("ext-cords", "either", m(/cord/i), 3, L.shopA, "Extension Cord"),
        ],
    ]], { mode: "standard", reps: 2 }),
    sc("L02", "casual", ["long-list", "multi-location", "saved-duplicate", "restock-out-of-scope"], "std", [[
        "Here's the rest of the stuff. Shop 4: 10 hammers, 8 tape measures, 4 hacksaws, 20 hacksaw blades, 6 putty knives, 3 caulk guns, 24 tubes of white caulk, 12 cans of black spray paint, 2 cordless drills, 1 shop vac. Shop 5: 40 PVC elbows 3/4 inch, 40 PVC couplings 3/4 inch, 6 cans of PVC cement, 10 hose clamps, 2 drain snakes, 4 plungers, 12 toilet flappers, 6 wax rings. Garage: the pressure washer, the 2 leaf blowers, 20 bags of mulch, 3 rakes, 2 snow shovels, 10 bags of ice melt (we already have some on file, these are extra), 1 new wheelbarrow. Shop 1: 50 more AA batteries (already on file I think), 10 dimmer switches, 6 motion sensor switches, 2 new voltage testers.",
        [
            D("hammers", "tool", m(/hammer/i), 10, L.shop4, "Hammer"),
            D("tape-measures", "either", m(TAPE_MEASURE), 8, L.shop4, "Tape Measure"),
            D("hacksaws", "tool", HACKSAW, 4, L.shop4, "Hacksaw"),
            D("hacksaw-blades", "inventory", m(/blade/i), 20, L.shop4, "Hacksaw Blades"),
            D("putty-knives", "either", m(/putty/i), 6, L.shop4, "Putty Knife"),
            D("caulk-guns", "tool", CAULK_GUN, 3, L.shop4, "Caulk Gun"),
            D("caulk", "inventory", CAULK_TUBE, 24, L.shop4, "White Caulk"),
            D("spray-paint", "inventory", m(/spray/i), 12, L.shop4, "Black Spray Paint"),
            D("drills", "tool", m(/drill/i), 2, L.shop4, "Cordless Drill"),
            D("shop-vac", "tool", m(/vac/i), 1, L.shop4, "Shop Vac"),
            D("elbows", "inventory", m(/elbow/i), 40, L.shop5, "3/4in PVC Elbows"),
            D("couplings", "inventory", m(/coupl/i), 40, L.shop5, "3/4in PVC Couplings"),
            D("pvc-cement", "inventory", m(/cement|glue/i), 6, L.shop5, "PVC Cement"),
            D("hose-clamps", "inventory", m(/hose\s*clamp/i), 10, L.shop5, "Hose Clamps"),
            D("drain-snakes", "tool", m(/snake|auger/i), 2, L.shop5, "Drain Snake"),
            D("plungers", "tool", m(/plunger/i), 4, L.shop5, "Plunger"),
            D("flappers", "inventory", m(/flapper/i), 12, L.shop5, "Toilet Flappers"),
            D("wax-rings", "inventory", m(/wax/i), 6, L.shop5, "Wax Rings"),
            S("pressure-washer", m(/pressure/i), L.garage),
            S("leaf-blowers", m(/leaf/i), L.garage),
            D("mulch", "inventory", m(/mulch/i), 20, L.garage, "Mulch (Bag)"),
            D("rakes", "either", m(/rake/i), 3, L.garage, "Rake"),
            D("snow-shovels", "either", m(SHOVEL), 2, L.garage, "Snow Shovel"),
            S("ice-melt", m(/ice\s*melt|salt/i), L.garage, "restock of a saved item"),
            D("wheelbarrow", "either", m(/wheel\s*barr?ow/i), 1, L.garage, "Wheelbarrow"),
            S("aa", m(AA), L.shop1, "restock of a saved item"),
            D("dimmers", "inventory", m(/dimmer/i), 10, L.shop1, "Dimmer Switches"),
            D("motion", "inventory", m(/motion|occupancy|sensor/i), 6, L.shop1, "Motion Sensor Switches"),
            D("voltage-testers", "tool", m(/voltage|tester/i), 2, L.shop1, "Voltage Tester"),
        ],
    ]], { mode: "standard", reps: 2 }),
    sc("L03", "terse", ["long-list", "multi-location", "similar-items"], "empty", [[
        "Shop A: 12 hammers, 6 tape meas, 4 levels, 10 screwdrivers flat, 10 screwdrivers phillips, 6 pliers needle nose, 6 pliers slip joint, 4 wire strippers, 2 hacksaws, 3 utility knives, 100 utility blades, 2 cordless drills, 2 impact drivers, 1 multimeter, 3 voltage testers. Shop B: 200 wire nuts, 50 zip ties 8in, 50 zip ties 14in, 20 duplex outlets, 10 gfci outlets, 30 switch plates, 30 outlet plates, 15 single pole switches, 5 3-way switches, 10 LED bulbs 60w, 10 LED bulbs 100w, 6 smoke detectors, 6 CO detectors, 24 AA, 24 AAA, 12 9V, 10 rolls elec tape, 4 rolls duct tape, 6 tubes caulk, 2 caulk guns, 5 gal interior paint, 3 gal primer, 10 roller covers, 10 brushes, 4 trays",
        [
            D("hammers", "tool", m(/hammer/i), 12, L.shopA, "Hammer"),
            D("tape-measures", "either", m(/tape\s*meas|measuring\s*tape/i), 6, L.shopA, "Tape Measure"),
            D("levels", "either", m(/level/i), 4, L.shopA, "Level"),
            D("flat", "either", m(/flat|slotted/i), 10, L.shopA, "Flathead Screwdriver"),
            D("phillips", "either", m(/phillips/i), 10, L.shopA, "Phillips Screwdriver"),
            D("needle-nose", "either", m(/needle/i), 6, L.shopA, "Needle Nose Pliers"),
            D("slip-joint", "either", m(/slip/i), 6, L.shopA, "Slip Joint Pliers"),
            D("strippers", "either", m(/strip/i), 4, L.shopA, "Wire Strippers"),
            D("hacksaws", "tool", m(/hack/i), 2, L.shopA, "Hacksaw"),
            D("utility-knives", "either", mn(/blade/i, /knife|knives/i), 3, L.shopA, "Utility Knife"),
            D("blades", "inventory", m(/blade/i), 100, L.shopA, "Utility Blades"),
            D("drills", "tool", m(/drill/i), 2, L.shopA, "Cordless Drill"),
            D("impact", "tool", m(/impact/i), 2, L.shopA, "Impact Driver"),
            D("multimeter", "tool", m(/multi\s*-?\s*meter/i), 1, L.shopA, "Multimeter"),
            D("voltage-testers", "tool", m(/voltage|tester/i), 3, L.shopA, "Voltage Tester"),
            D("wire-nuts", "inventory", m(WIRE_NUTS), 200, L.shopB, "Wire Nuts"),
            D("zip-8", "inventory", m(/(^|[^0-9])8\s*-?\s*("|in\b|in\.|inch)/i, /zip|tie/i), 50, L.shopB, "8in Zip Ties"),
            D("zip-14", "inventory", m(/14/i, /zip|tie/i), 50, L.shopB, "14in Zip Ties"),
            D("duplex", "inventory", m(/duplex/i), 20, L.shopB, "Duplex Outlets"),
            D("gfci", "inventory", m(GFCI), 10, L.shopB, "GFCI Outlets"),
            D("switch-plates", "inventory", m(/switch/i, /plate|cover/i), 30, L.shopB, "Switch Plates"),
            D("outlet-plates", "inventory", m(/outlet|receptacle/i, /plate|cover/i), 30, L.shopB, "Outlet Plates"),
            D("single-pole", "inventory", m(/single/i), 15, L.shopB, "Single Pole Switches"),
            D("3-way", "inventory", m(/3\s*-?\s*way|three\s*-?\s*way/i), 5, L.shopB, "3-Way Switches"),
            D("led-60", "inventory", m(/(^|[^0-9])60\s*-?\s*w/i), 10, L.shopB, "60W LED Bulbs"),
            D("led-100", "inventory", m(/100\s*-?\s*w/i), 10, L.shopB, "100W LED Bulbs"),
            D("smoke", "either", m(/smoke/i), 6, L.shopB, "Smoke Detectors"),
            D("co", "either", m(/(^|[^a-z])co([^a-z]|$)|carbon\s*monoxide/i), 6, L.shopB, "CO Detectors"),
            D("aa", "inventory", m(AA), 24, L.shopB, "AA Batteries"),
            D("aaa", "inventory", m(AAA), 24, L.shopB, "AAA Batteries"),
            D("9v", "inventory", m(NINE_V), 12, L.shopB, "9V Batteries"),
            D("elec-tape", "inventory", m(/elec/i), 10, L.shopB, "Electrical Tape"),
            D("duct-tape", "inventory", m(/duct/i), 4, L.shopB, "Duct Tape"),
            D("caulk", "inventory", CAULK_TUBE, 6, L.shopB, "Caulk"),
            D("caulk-guns", "tool", CAULK_GUN, 2, L.shopB, "Caulk Gun"),
            D("interior", "inventory", m(/interior/i), 5, L.shopB, "Interior Paint (Gallon)", {
                alt: [alt("inventory", m(/interior/i, /5\s*-?\s*gal|bucket|pail/i), 1, L.shopB, "Interior Paint (5 Gallon Bucket)")],
            }),
            D("primer", "inventory", m(/primer/i), 3, L.shopB, "Primer (Gallon)"),
            D("roller-covers", "inventory", m(/roller/i), 10, L.shopB, "Roller Covers"),
            D("brushes", "either", m(/brush/i), 10, L.shopB, "Paint Brushes"),
            D("trays", "either", m(/tray/i), 4, L.shopB, "Paint Trays"),
        ],
    ]], { mode: "standard", reps: 2 }),
];

// Derivable items where asking is still reasonable, so an ask isn't counted as unnecessary: the system
// prompt tells the assistant to ask before adding a tool whose name is already on file, a missing location
// is worth asking about, and a few quantities are hedged ("maybe 10 gallons") or unit-ambiguous.
const ASK_OK = new Set([
    "A03:floor-cleaner",
    "A17:romex",
    "B06:plungers",
    "B12:ladders",
    "B25:drill",
    "B27:plungers",
    "B35:plungers",
    "B35:toilet-auger",
    "B43:tool-bags",
    "B43:hammers",
    "B43:tape-measures",
    "B56:door-stops",
    "B61:pressure-washers",
    "B61:leaf-blower",
    "B63:shop-vacs",
    "M09:drills",
    // The blind audit judged these "a strict reader would ask" (missing size, rating or type):
    "A19:sds-bits",
    "B01:fuses",
    "B10:hose-clamps",
    "B44:wire-nuts",
    "B52:zip-ties",
    "D02:plungers",
    "D02:toilet-auger",
    "L02:drills",
    "L02:shop-vac",
    "L02:drain-snakes",
    "L02:plungers",
]);

export function isAskOk(scenarioId: string, item: DraftItem): boolean {
    return item.askOk === true || ASK_OK.has(`${scenarioId}:${item.id}`);
}
