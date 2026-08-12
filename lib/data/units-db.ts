/* Master unit UNIVERSE — diambil dari backend API GET /api/units/db.
   File ini hanya berisi tipe & helper mapping yang dipakai frontend. */

export type UnitDb = {
  uid: string;
  code: string;
  cat: string;
  cls: string;
  egi: string;
  product: string;
  active: boolean;
  standby: boolean;
  breakdown: boolean;
  loc: string;
  upd: string;
  by: string;
};

/* Dynamic master data from backend API */
let cachedEgiTypes: string[] | null = null;
let cachedEqClassDefs: [string, string][] | null = null;
let cachedUnitMakes: string[] | null = null;
let cachedPitLocations: { name: string; mining: boolean }[] | null = null;

/**
 * Fetch EGI types from backend API
 */
export async function fetchEgiTypes(): Promise<string[]> {
  if (cachedEgiTypes) return cachedEgiTypes;

  try {
    const { masterApi } = await import("@/lib/api/master");
    const data = await masterApi.getByCategory("egi");
    cachedEgiTypes = data.map((item) => item.code);
    return cachedEgiTypes;
  } catch (error) {
    console.warn("Failed to fetch EGI types from API:", error);
    return [];
  }
}

/**
 * Fetch equipment class definitions from backend API
 */
export async function fetchEqClassDefs(): Promise<[string, string][]> {
  if (cachedEqClassDefs) return cachedEqClassDefs;

  try {
    const { masterApi } = await import("@/lib/api/master");
    const data = await masterApi.getByCategory("eqclass");
    cachedEqClassDefs = data.map(
      (item) => [item.code, item.name] as [string, string]
    );
    return cachedEqClassDefs;
  } catch (error) {
    console.warn("Failed to fetch equipment classes from API:", error);
    return [];
  }
}

/**
 * Fetch unit makes from backend API
 */
export async function fetchUnitMakes(): Promise<string[]> {
  if (cachedUnitMakes) return cachedUnitMakes;

  try {
    const { masterApi } = await import("@/lib/api/master");
    const data = await masterApi.getByCategory("product");
    cachedUnitMakes = data.map((item) => item.code);
    return cachedUnitMakes;
  } catch (error) {
    console.warn("Failed to fetch unit makes from API:", error);
    return [];
  }
}

/**
 * Fetch pit locations from backend API
 */
export async function fetchPitLocations(): Promise<
  { name: string; mining: boolean }[]
> {
  if (cachedPitLocations) return cachedPitLocations;

  try {
    const { masterApi } = await import("@/lib/api/master");
    const data = await masterApi.getByCategory("area");
    cachedPitLocations = data.map((item) => ({
      name: item.name,
      mining: item.category === "mining",
    }));
    return cachedPitLocations;
  } catch (error) {
    console.warn("Failed to fetch pit locations from API:", error);
    return [];
  }
}

/* mapping model unit (kolom EGI) → Type EGI (grup kompetensi operator) */
export function typeOfEgi(egi: string): string {
  const e = (egi || "").toUpperCase();
  if (/^WT|- ?WT|SYM3256|FM260/.test(e)) return "WATER TRUCK";
  if (/^FT/.test(e)) return "FUEL TRUCK";
  if (/^ST|^CT|XTREM|WB4300/.test(e)) return "SUPPORT TRUCK";
  if (/^MH|- ?MH/.test(e)) return "MANHAUL";
  if (/F84G/.test(e)) return "BUS";
  if (/TRITON|PAJERO|COLDDIESEL|FE71/.test(e)) return "LIGHT VEHICLE";
  if (/785|777/.test(e)) return "HD 785 / 777";
  if (/465|773|TR60/.test(e)) return "HD 465 / 773";
  if (/R100E/.test(e)) return "VOLVO";
  if (/SKT130/.test(e)) return "SKT130";
  if (/SKT105/.test(e)) return "SKT105";
  if (/SYZ ?440|SYZ ?320/.test(e)) return "SANY SYZ 440";
  if (/2600/.test(e)) return "PC 2600";
  if (/2000/.test(e)) return "PC 2000";
  if (/1250/.test(e)) return "PC 1250";
  if (/1200/.test(e)) return "PC 1200";
  if (/6020/.test(e)) return "PC 6020";
  if (/870|SY750/.test(e)) return "PC 870";
  if (/470/.test(e)) return "PC 470";
  if (/ZX350|350|SY365/.test(e)) return "PC 350";
  if (/ZX2[01]0|PC ?200|200-LA|SY2[01]5|215/.test(e)) return "PC 200";
  if (/D375|D9/.test(e)) return "D9-375";
  if (/D155|D8T|D360/.test(e)) return "D8-155";
  if (/D6|D85|D260/.test(e)) return "D6-D85SS";
  if (/GD825|GD755|16GC|14M/.test(e)) return "GRADER";
  if (/P4[16]0/.test(e)) return "SCANIA P410";
  if (/DM30/.test(e)) return "DRILL";
  if (/BW ?2/.test(e)) return "COMPACTOR";
  return "SPARE";
}
