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
 * Falls back to hardcoded values if API fails
 */
export async function fetchEgiTypes(): Promise<string[]> {
  if (cachedEgiTypes) return cachedEgiTypes;

  try {
    const { masterApi } = await import("@/lib/api/master");
    const data = await masterApi.getByCategory("egi");
    cachedEgiTypes = data.map((item) => item.code);
    return cachedEgiTypes;
  } catch (error) {
    console.warn("Failed to fetch EGI types from API, using fallback:", error);
    return getFallbackEgiTypes();
  }
}

/**
 * Fetch equipment class definitions from backend API
 * Falls back to hardcoded values if API fails
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
    console.warn(
      "Failed to fetch equipment classes from API, using fallback:",
      error
    );
    return getFallbackEqClassDefs();
  }
}

/**
 * Fetch unit makes from backend API
 * Falls back to hardcoded values if API fails
 */
export async function fetchUnitMakes(): Promise<string[]> {
  if (cachedUnitMakes) return cachedUnitMakes;

  try {
    const { masterApi } = await import("@/lib/api/master");
    const data = await masterApi.getByCategory("product");
    cachedUnitMakes = data.map((item) => item.code);
    return cachedUnitMakes;
  } catch (error) {
    console.warn("Failed to fetch unit makes from API, using fallback:", error);
    return getFallbackUnitMakes();
  }
}

/**
 * Fetch pit locations from backend API
 * Falls back to hardcoded values if API fails
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
    console.warn(
      "Failed to fetch pit locations from API, using fallback:",
      error
    );
    return getFallbackPitLocations();
  }
}

/* Fallback values - used when API is unavailable */
function getFallbackEgiTypes(): string[] {
  return [
    "BUS",
    "COMPACTOR",
    "D6-D85SS",
    "D8-155",
    "D9-375",
    "DRILL",
    "FUEL TRUCK",
    "GRADER",
    "HD 465 / 773",
    "HD 785 / 777",
    "LIGHT VEHICLE",
    "MANHAUL",
    "PC 1200",
    "PC 1250",
    "PC 200",
    "PC 2000",
    "PC 2600",
    "PC 350",
    "PC 470",
    "PC 6020",
    "PC 870",
    "SANY SYZ 440",
    "SCANIA P410",
    "SKT105",
    "SKT130",
    "SPARE",
    "SUPPORT TRUCK",
    "VOLVO",
    "WATER TRUCK",
    "SPARE",
  ];
}

function getFallbackEqClassDefs(): [string, string][] {
  return [
    ["AMB", "Ambulance"],
    ["BUS", "Bus Karyawan"],
    ["CM", "Compactor"],
    ["CT", "Crane Truck"],
    ["DR", "Drill Machine"],
    ["DZ", "Dozer"],
    ["EX", "Excavator"],
    ["FK", "Forklift"],
    ["FT", "Fuel Truck"],
    ["GD", "Grader"],
    ["HD", "Heavy Dump Truck (60–100 t)"],
    ["LB", "Lowboy"],
    ["LD", "Light Dump Truck (30–40 t)"],
    ["LT", "Light Truck"],
    ["LV", "Light Vehicle"],
    ["MH", "Manhaul"],
    ["PU", "Pompa Dewatering"],
    ["ST", "Service Truck"],
    ["TH", "Telehandler"],
    ["WE", "Wheel Excavator"],
    ["WF", "Waterfill Tower"],
    ["WT", "Water Truck"],
  ];
}

function getFallbackUnitMakes(): string[] {
  return [
    "BOMAG",
    "CATERPILLAR",
    "COATES HIRED",
    "DEICI",
    "DRAGFLO",
    "EBARA PUMP",
    "EPIROC",
    "FAW",
    "HINO",
    "HITACHI",
    "KOMATSU",
    "MANITOU",
    "MITSUBISHI",
    "MULTIFLO",
    "NIAGARA",
    "REL",
    "RENAULT",
    "SANY",
    "SCANIA",
    "SYKES",
    "TRUFLO",
    "VOLVO",
    "XCMG",
  ];
}

function getFallbackPitLocations(): { name: string; mining: boolean }[] {
  return [
    { name: "Panel East Puncak Utara", mining: true },
    { name: "Panel East Puncak Selatan", mining: true },
    { name: "Panel East Tengah", mining: true },
    { name: "Panel East Bawah", mining: true },
    { name: "Kasturi Puncak", mining: true },
    { name: "Kasturi Tengah", mining: true },
    { name: "Kasturi Bawah", mining: true },
    { name: "High Dump", mining: true },
    { name: "Low Wall", mining: true },
    { name: "Ambalat", mining: true },
    { name: "Mandalika", mining: true },
    { name: "Disposal T4", mining: true },
    { name: "CPP33", mining: false },
    { name: "Workshop", mining: false },
    { name: "Pondok Kontainer V Point", mining: false },
    { name: "Parkiran T6", mining: false },
    { name: "Parkitan Sebatik", mining: false },
    { name: "Parkiran Panel East", mining: false },
    { name: "Stock Room T6", mining: false },
    { name: "Readyline", mining: false },
    { name: "Bank Soil", mining: true },
    { name: "Parkiran Wash Bay", mining: false },
  ];
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

/* daftar Type EGI — hasil pemetaan seluruh unit sumber */
export const egiTypes = [
  "BUS",
  "COMPACTOR",
  "D6-D85SS",
  "D8-155",
  "D9-375",
  "DRILL",
  "FUEL TRUCK",
  "GRADER",
  "HD 465 / 773",
  "HD 785 / 777",
  "LIGHT VEHICLE",
  "MANHAUL",
  "PC 1200",
  "PC 1250",
  "PC 200",
  "PC 2000",
  "PC 2600",
  "PC 350",
  "PC 470",
  "PC 6020",
  "PC 870",
  "SANY SYZ 440",
  "SCANIA P410",
  "SKT105",
  "SKT130",
  "SPARE",
  "SUPPORT TRUCK",
  "VOLVO",
  "WATER TRUCK",
  "SPARE",
];

/* eq class yang benar-benar ada di data unit */
export const eqClassDefs: [string, string][] = [
  ["AMB", "Ambulance"],
  ["BUS", "Bus Karyawan"],
  ["CM", "Compactor"],
  ["CT", "Crane Truck"],
  ["DR", "Drill Machine"],
  ["DZ", "Dozer"],
  ["EX", "Excavator"],
  ["FK", "Forklift"],
  ["FT", "Fuel Truck"],
  ["GD", "Grader"],
  ["HD", "Heavy Dump Truck (60–100 t)"],
  ["LB", "Lowboy"],
  ["LD", "Light Dump Truck (30–40 t)"],
  ["LT", "Light Truck"],
  ["LV", "Light Vehicle"],
  ["MH", "Manhaul"],
  ["PU", "Pompa Dewatering"],
  ["ST", "Service Truck"],
  ["TH", "Telehandler"],
  ["WE", "Wheel Excavator"],
  ["WF", "Waterfill Tower"],
  ["WT", "Water Truck"],
];

/* merek/product yang benar-benar ada di data unit */
export const unitMakes = [
  "BOMAG",
  "CATERPILLAR",
  "COATES HIRED",
  "DEICI",
  "DRAGFLO",
  "EBARA PUMP",
  "EPIROC",
  "FAW",
  "HINO",
  "HITACHI",
  "KOMATSU",
  "MANITOU",
  "MITSUBISHI",
  "MULTIFLO",
  "NIAGARA",
  "REL",
  "RENAULT",
  "SANY",
  "SCANIA",
  "SYKES",
  "TRUFLO",
  "VOLVO",
  "XCMG",
];

/* lokasi pit/area kerja resmi site (dari sheet yang sama) */
export const pitLocations: { name: string; mining: boolean }[] = [
  { name: "Panel East Puncak Utara", mining: true },
  { name: "Panel East Puncak Selatan", mining: true },
  { name: "Panel East Tengah", mining: true },
  { name: "Panel East Bawah", mining: true },
  { name: "Kasturi Puncak", mining: true },
  { name: "Kasturi Tengah", mining: true },
  { name: "Kasturi Bawah", mining: true },
  { name: "High Dump", mining: true },
  { name: "Low Wall", mining: true },
  { name: "Ambalat", mining: true },
  { name: "Mandalika", mining: true },
  { name: "Disposal T4", mining: true },
  { name: "CPP33", mining: false },
  { name: "Workshop", mining: false },
  { name: "Pondok Kontainer V Point", mining: false },
  { name: "Parkiran T6", mining: false },
  { name: "Parkitan Sebatik", mining: false },
  { name: "Parkiran Panel East", mining: false },
  { name: "Stock Room T6", mining: false },
  { name: "Readyline", mining: false },
  { name: "Bank Soil", mining: true },
  { name: "Parkiran Wash Bay", mining: false },
];
