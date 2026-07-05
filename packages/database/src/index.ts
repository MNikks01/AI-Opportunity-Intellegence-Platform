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
export { writeAuditLog, listAuditLogs, type AuditEntry } from "./audit";
export {
  generateDailyBrief,
  listBriefs,
  getBrief,
  markBriefOpened,
  type BriefContent,
  type BriefTrend,
} from "./briefs";
export { getPlan, getEntitlements, setPlan } from "./subscription";
export { $Enums, Prisma } from "@prisma/client";
