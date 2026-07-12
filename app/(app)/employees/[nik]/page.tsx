import type { Metadata } from "next"
import { employees } from "@/lib/data/employees"
import PageClient from "./page-client"

type Props = { params: Promise<{ nik: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nik } = await params
  const emp = employees.find((e) => e.nik === nik)
  return {
    title: emp ? `${emp.name} — Detail Karyawan` : "Detail Karyawan",
    description: emp
      ? `Profil ${emp.name} (NIK ${nik}) — kepegawaian, SIMPER, medis, dan mess.`
      : "Detail karyawan — kepegawaian, SIMPER, medis, dan mess.",
  }
}

export default function Page(props: Props) {
  return <PageClient {...props} />
}
