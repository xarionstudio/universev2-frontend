/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/auth.ts
 *
 * Authentication API Service
 * ────────────────────────────────────────────────────────────────────────── */

import { apiFetch } from "./client";
import type {
  AuthUser,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
} from "./types";

export const authApi = {
  /** Log in user with email & password. Sets httpOnly cookie on backend. */
  async login(payload: LoginRequest): Promise<LoginResponse> {
    return apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: payload,
    });
  },

  /** Register a new user account. */
  async register(payload: RegisterRequest): Promise<AuthUser> {
    return apiFetch<AuthUser>("/auth/register", {
      method: "POST",
      body: payload,
    });
  },

  /** Refresh JWT session token using httpOnly cookie or Authorization header. */
  async refreshToken(): Promise<LoginResponse> {
    return apiFetch<LoginResponse>("/auth/refresh", {
      method: "POST",
    });
  },

  /** Log out user and clear httpOnly cookie on backend. */
  async logout(): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/auth/logout", {
      method: "POST",
    });
  },

  /** Get profile of the currently logged-in user. */
  async getProfile(): Promise<AuthUser> {
    return apiFetch<AuthUser>("/profile", {
      method: "GET",
    });
  },
};
