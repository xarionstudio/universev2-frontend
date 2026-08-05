import { Suspense } from "react";
import type { Metadata } from "next";

import PageClient from "./page-client";

export const metadata: Metadata = {
  title: "Display Monitor",
  description:
    "Layar TV multi-fleet — memutar beberapa formasi bergantian, lengkap dengan bus jemputan dan leader excavator tiap fleet.",
};

export default function Page() {
  return (
    <Suspense>
      <PageClient />
    </Suspense>
  );
}
