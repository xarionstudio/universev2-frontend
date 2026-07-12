import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Attendance",
  description:
    "Realisasi kehadiran dari jadwal roster yang diunggah, dikelompokkan per data roster.",
};

export default function Page() {
  return <PageClient />;
}
