import type { Metadata } from "next"
import { employees } from "@/lib/data/employees"
import PageClient from "./page-client"

type Props = { params: Promise<{ nik: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { nik } = await params
  const emp = employees.find((e) => e.nik === nik)
  return {
    title: emp ? `Edit Karyawan — ${emp.name}` : "Edit Karyawan",
    description: "Perbarui data kepegawaian, kompetensi SIMPER, medis, dan mess karyawan.",
  }
}

export default function Page(props: Props) {
  return <PageClient {...props} />
}
