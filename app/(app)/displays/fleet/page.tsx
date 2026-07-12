import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Pengelolaan Display Fleet",
  description:
    "Pengelolaan TV kiosk status unit — konten, running text, dan status per display.",
};

export default function Page() {
  return <PageClient />;
}
