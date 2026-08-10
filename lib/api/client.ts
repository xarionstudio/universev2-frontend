/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/client.ts
 *
 * Core fetch wrapper for Backend API integration.
 * Supports httpOnly cookies (credentials: "include") and structured responses.
 * ────────────────────────────────────────────────────────────────────────── */

import type { ApiResponse } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export type FetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
};

export async function apiFetch<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { body, params, headers: customHeaders, ...customOptions } = options;

  // Build Query String
  let url = endpoint.startsWith("http")
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const isFormData =
    typeof FormData !== "undefined" && body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
    ...((customHeaders as Record<string, string>) || {}),
  };

  const response = await fetch(url, {
    ...customOptions,
    headers,
    credentials: "include", // Enable httpOnly cookie transmission
    body: isFormData
      ? (body as FormData)
      : body
        ? JSON.stringify(body)
        : undefined,
  });

  // Handle Session Expiration / 401 Unauthorized
  if (response.status === 401 && !endpoint.includes("/auth/login")) {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("universe-auth-user");
        localStorage.removeItem("universe-auth-perms");
      } catch {}
      const path = window.location.pathname;
      if (path !== "/login" && path !== "/register") {
        window.location.href = "/login";
      }
    }
  }

  // Handle No Content
  if (response.status === 24) {
    return {} as T;
  }

  let jsonResponse: ApiResponse<T> | null = null;
  try {
    jsonResponse = await response.json();
  } catch {
    // Non-JSON response or parse error
    if (!response.ok) {
      throw new ApiError(
        `HTTP Error ${response.status}: ${response.statusText}`,
        response.status
      );
    }
  }

  if (!response.ok) {
    const errorMessage =
      jsonResponse?.message || `Request failed with status ${response.status}`;
    throw new ApiError(errorMessage, response.status, jsonResponse);
  }

  if (jsonResponse && typeof jsonResponse.success === "boolean") {
    if (!jsonResponse.success) {
      throw new ApiError(
        jsonResponse.message || "Operation failed",
        response.status,
        jsonResponse
      );
    }
    return jsonResponse.data;
  }

  return jsonResponse as T;
}

export function apiUploadWithProgress<T>(
  endpoint: string,
  formData: FormData,
  onProgress: (pct: number) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

    xhr.open("POST", url);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      let jsonResponse: ApiResponse<T> | null = null;
      try {
        jsonResponse = JSON.parse(xhr.responseText);
      } catch {}

      if (xhr.status === 401 && !endpoint.includes("/auth/login")) {
        if (typeof window !== "undefined") {
          try {
            localStorage.removeItem("universe-auth-user");
            localStorage.removeItem("universe-auth-perms");
          } catch {}
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
      }

      if (xhr.status < 200 || xhr.status >= 300) {
        const msg =
          jsonResponse?.message || `Request failed with status ${xhr.status}`;
        return reject(new ApiError(msg, xhr.status, jsonResponse));
      }

      if (jsonResponse && typeof jsonResponse.success === "boolean") {
        if (!jsonResponse.success) {
          return reject(
            new ApiError(
              jsonResponse.message || "Operation failed",
              xhr.status,
              jsonResponse
            )
          );
        }
        return resolve(jsonResponse.data);
      }

      return resolve(jsonResponse as T);
    };

    xhr.onerror = () => {
      reject(new ApiError("Network error during file upload", 0));
    };

    xhr.send(formData);
  });
}
