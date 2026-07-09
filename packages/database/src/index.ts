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
  getOrCreatePrimaryWatchlist,
  listWatchedTargetIds,
  removeWatchlistItemByTarget,
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
export { findApiKeyByHash, createApiKey, listApiKeys, revokeApiKey } from "./apikeys";
export { exportOrgData, deleteOrg } from "./gdpr";
export { getSourceStats, type SourceStat } from "./source-stats";
export {
  listTrendsQuadrant,
  QUADRANT_MIDPOINT,
  type QuadrantTrend,
  type Quadrant,
} from "./quadrant";
export { mineDemand, getTrendDemandHits } from "./demand";
export {
  recordTrendSnapshots,
  getTrendMomentumMap,
  type TrendMomentum,
  type MomentumState,
} from "./momentum";
export {
  upsertEntity,
  linkTrendEntity,
  listEntities,
  getEntityById,
  listTrendsForEntity,
  getTrendEntities,
  getRelatedTrends,
  listTrendsForEntityExtraction,
  type EntityType,
  type EntityListItem,
  type EntityTrend,
  type RelatedTrend,
} from "./entities";
export {
  recordIngestionRun,
  getLatestRuns,
  type RunResult,
  type LatestRun,
} from "./ingestion-runs";
export { $Enums, Prisma } from "@prisma/client";
