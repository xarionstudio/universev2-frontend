/* Setting fleet — formasi: digger (leader) + unit OHT (maks. 13) + lokasi kerja
   + bus default */
export const FLEET_MAX_UNITS = 13;

export type Fleet = {
  id: string;
  digger: string;
  loc: string;
  bus: string;
  units: string[];
  active: boolean;
};

export const initialFleets: Fleet[] = [
  {
    id: "fl1",
    digger: "EX7001",
    loc: "Panel East Puncak Selatan",
    bus: "UD-BU06",
    units: [
      "RD5001",
      "RD5002",
      "RD5003",
      "RD5004",
      "RD5005",
      "RD5006",
      "RD5011",
      "RD5013",
      "RD5014",
      "RD5015",
      "RD5017",
      "RD5022",
      "RD5029",
    ],
    active: true,
  },
  {
    id: "fl2",
    digger: "EX7007",
    loc: "Kasturi Tengah",
    bus: "UD-BU07",
    units: ["RD5061", "RD5063", "RD5065", "RD5066"],
    active: true,
  },
  {
    id: "fl3",
    digger: "EX8001",
    loc: "Kasturi Puncak",
    bus: "UD-BU08",
    units: ["RD5091", "RD5092", "RD5093"],
    active: false,
  },
];
