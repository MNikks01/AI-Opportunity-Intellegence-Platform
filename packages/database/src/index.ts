/**
 * @aioi/database
 * Prisma client + data-access layer (Postgres + pgvector). The only place that talks to Prisma.
 */
export { prisma } from "./client";
export * from "./repositories";
export { withOrgContext } from "./rls";
export { bootstrapUser, type BootstrapInput, type BootstrapResult } from "./bootstrap";
export {
  NotFoundError,
  createWatchlist,
  listWatchlists,
  getWatchlist,
  renameWatchlist,
  deleteWatchlist,
  addWatchlistItem,
  removeWatchlistItem,
  listWatchlistItems,
} from "./watchlists";
export {
  alertMatches,
  createAlert,
  listAlerts,
  setAlertEnabled,
  deleteAlert,
  evaluateTrendForOrg,
  evaluateTrendAllOrgs,
  type TrendEvent,
} from "./alerts";
export {
  listNotifications,
  unreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "./notifications";
export { $Enums, Prisma } from "@prisma/client";
