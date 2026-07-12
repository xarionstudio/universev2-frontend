/* Setting fleet — formasi: digger (leader) + unit OHT + lokasi kerja + bus default */
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
    loc: "PANEL EAST - ATAS SELATAN",
    bus: "B01",
    units: ["RD5001", "RD5002", "RD5003", "RD5004", "RD5005", "RD5006"],
    active: true,
  },
  {
    id: "fl2",
    digger: "EX7007",
    loc: "KASTURI TENGAH BAWAH",
    bus: "B02",
    units: ["RD5061", "RD5063", "RD5065", "RD5066"],
    active: true,
  },
  {
    id: "fl3",
    digger: "EX8001",
    loc: "KASTURI PUNCAK",
    bus: "B03",
    units: ["RD5091", "RD5092", "RD5093"],
    active: false,
  },
];
