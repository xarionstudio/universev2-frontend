"use client"

import * as React from "react"
import { EmployeeForm } from "../../_components/employee-form"

export default function EmployeeEditPage({
  params,
}: {
  params: Promise<{ nik: string }>
}) {
  const { nik } = React.use(params)
  return <EmployeeForm nik={nik} />
}
