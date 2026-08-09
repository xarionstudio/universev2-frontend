/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/employees.ts
 * ────────────────────────────────────────────────────────────────────────── */

import { apiFetch } from "./client";
import type { Competency, Employee, PagedData } from "./types";

export type EmployeeListParams = {
  page?: number;
  perPage?: number;
  search?: string;
  status?: string;
  dept?: string;
};

export const employeesApi = {
  /** Fetch paginated list of employees */
  async getEmployees(
    params?: EmployeeListParams
  ): Promise<PagedData<Employee>> {
    return apiFetch<PagedData<Employee>>("/employees", {
      method: "GET",
      params,
    });
  },

  /** Fetch a single employee by NIK */
  async getByNIK(nik: string): Promise<Employee> {
    return apiFetch<Employee>(`/employees/${nik}`, {
      method: "GET",
    });
  },

  /** Create a new employee */
  async create(data: Partial<Employee>): Promise<Employee> {
    return apiFetch<Employee>("/employees", {
      method: "POST",
      body: data,
    });
  },

  /** Update employee details by NIK */
  async update(nik: string, data: Partial<Employee>): Promise<Employee> {
    return apiFetch<Employee>(`/employees/${nik}`, {
      method: "PUT",
      body: data,
    });
  },

  /** Delete employee by NIK */
  async delete(nik: string): Promise<{ message: string }> {
    return apiFetch<{ message: string }>(`/employees/${nik}`, {
      method: "DELETE",
    });
  },

  /** Import employees from file */
  async import(formData: FormData): Promise<{ imported: number }> {
    return apiFetch<{ imported: number }>("/employees/import", {
      method: "POST",
      body: formData,
    });
  },

  /** Export employees file */
  async export(format: "xlsx" | "csv" = "xlsx"): Promise<Blob> {
    const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
    const res = await fetch(`${url}/employees/export?format=${format}`, {
      credentials: "include",
    });
    return res.blob();
  },

  /** Fetch competencies for an employee */
  async getCompetencies(nik: string): Promise<Competency[]> {
    return apiFetch<Competency[]>(`/employees/${nik}/competencies`, {
      method: "GET",
    });
  },

  /** Update competencies for an employee */
  async updateCompetencies(
    nik: string,
    komp: Competency[]
  ): Promise<Competency[]> {
    return apiFetch<Competency[]>(`/employees/${nik}/competencies`, {
      method: "PUT",
      body: { competencies: komp },
    });
  },

  /** Upload photo for employee */
  async uploadPhoto(nik: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append("photo", file);
    return apiFetch<{ url: string }>(`/employees/${nik}/photo`, {
      method: "POST",
      body: formData,
    });
  },
};
