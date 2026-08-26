/* Titik masuk lapisan API.

   Endpoint diekspor sebagai namespace per modul, bukan diratakan, karena nama
   fungsinya bertabrakan antar modul — `listUsers`/`listRoles` masih unik,
   tapi `exportUsers` dan `exportMaster` akan terus bertambah dan cepat
   membingungkan. Dengan namespace, pemanggilnya terbaca sebagai
   `employeesApi.list(...)` dan asal datanya langsung jelas. */

export { ApiError, errorDetail, errorMessage, isApiError } from "./error";
export {
  api,
  apiBaseUrl,
  apiOrigin,
  assetUrl,
  buildQuery,
  refreshSession,
  request,
  requestBlob,
  setUnauthenticatedHandler,
} from "./client";
export {
  clearSession,
  getServerSession,
  getSession,
  getToken,
  patchUser,
  setSession,
  setToken,
  subscribe as subscribeSession,
  type StoredSession,
} from "./session-store";
export type * from "./types";

export * as authApi from "./endpoints/auth";
export * as profileApi from "./endpoints/profile";
export * as usersApi from "./endpoints/users";
export * as employeesApi from "./endpoints/employees";
export * as ftwApi from "./endpoints/ftw";
export * as rosterApi from "./endpoints/roster";
export * as fleetApi from "./endpoints/fleet";
export * as masterApi from "./endpoints/master";
export * as settingsApi from "./endpoints/settings";
export * as miscApi from "./endpoints/misc";
