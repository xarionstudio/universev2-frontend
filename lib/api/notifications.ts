/* ─────────────────────────────────────────────────────────────────────────────
 * lib/api/notifications.ts
 * ────────────────────────────────────────────────────────────────────────── */

import { apiFetch } from "./client";
import type { Notification } from "./types";

export const notificationsApi = {
  /** Fetch user notifications */
  async getNotifications(): Promise<Notification[]> {
    return apiFetch<Notification[]>("/notifications", {
      method: "GET",
    });
  },

  /** Mark notification as read */
  async markRead(id: number): Promise<Notification> {
    return apiFetch<Notification>(`/notifications/${id}/read`, {
      method: "PUT",
    });
  },

  /** Mark all notifications as read */
  async markAllRead(): Promise<{ message: string }> {
    return apiFetch<{ message: string }>("/notifications/read-all", {
      method: "PUT",
    });
  },
};
