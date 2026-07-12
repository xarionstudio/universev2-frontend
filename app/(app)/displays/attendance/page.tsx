import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Pengelolaan Display Attendance",
  description:
    "Pengelolaan TV kiosk attendance, fit to work, dan fingerprint — konten, running text, dan status per display.",
};

export default function Page() {
  return <PageClient />;
}
