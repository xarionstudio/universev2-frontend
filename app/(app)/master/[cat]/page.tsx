import type { Metadata } from "next";

import { mdCatLabels, type MdCat } from "@/lib/data/master-data";

import PageClient from "./page-client";

type Props = { params: Promise<{ cat: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { cat } = await params;
  const label = mdCatLabels[cat as MdCat]?.id;
  return {
    title: label ?? "Master Data",
    description:
      "Data referensi dinamis — dipakai form unit, alokasi, dan kiosk display.",
  };
}

export default function Page() {
  return <PageClient />;
}
