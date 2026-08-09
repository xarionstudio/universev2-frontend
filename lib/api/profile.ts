/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/profile.ts
 * ────────────────────────────────────────────────────────────────────────── */

import { apiFetch } from "./client";
import type {
  AuthUser,
  PasswordUpdateRequest,
  ProfileUpdateRequest,
} from "./types";

export const profileApi = {
  /** Fetch current user profile */
  async getProfile(): Promise<AuthUser> {
    return apiFetch<AuthUser>("/profile", {
      method: "GET",
    });
  },

  /** Update user profile */
  async updateProfile(data: ProfileUpdateRequest): Promise<AuthUser> {
    return apiFetch<AuthUser>("/profile", {
      method: "PUT",
      body: data,
    });
  },

  /** Change password */
  async updatePassword(
    data: PasswordUpdateRequest
  ): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/profile/password", {
      method: "PUT",
      body: data,
    });
  },
};
