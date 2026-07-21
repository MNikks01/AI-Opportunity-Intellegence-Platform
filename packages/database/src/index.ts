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
  countWatchlists,
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
  countAlerts,
  setAlertEnabled,
  deleteAlert,
  evaluateTrendForOrg,
  evaluateTrendAllOrgs,
  type TrendEvent,
} from "./alerts";
export { entityMomentumMatches, evaluateEntityAlertsAllOrgs } from "./entity-alerts";
export {
  listNotifications,
  unreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  listPendingEmailNotifications,
  markNotificationsEmailed,
  type PendingEmailNotification,
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
export {
  getPlan,
  getEntitlements,
  setPlan,
  getSubscription,
  applyStripeSubscription,
  type StripeSync,
} from "./subscription";
export {
  getOrCreateReferralCode,
  getReferralStats,
  applyReferralCode,
  type ReferralStats,
  type ApplyReferralResult,
} from "./referrals";
export {
  entitlementsFor,
  PLAN_ENTITLEMENTS,
  PLANS,
  type Plan,
  type Entitlements,
} from "@aioi/billing";
export {
  findApiKeyByHash,
  createApiKey,
  listApiKeys,
  revokeApiKey,
  touchApiKey,
  recordApiKeyUsage,
  getApiKeyUsageToday,
  getApiUsageHistory,
  utcDay,
} from "./apikeys";
export { exportOrgData, deleteOrg } from "./gdpr";
export { getSourceStats, type SourceStat } from "./source-stats";
export {
  CATEGORY_REGISTRY,
  seedCategories,
  listCategories,
  getCategoryByKey,
  type CategoryDef,
  type CategoryRecord,
} from "./taxonomy";
export {
  listSignalsForAnalysis,
  findAnalysisByContentHash,
  upsertSignalAnalysis,
  countAnalyzedSignals,
  type SignalForAnalysis,
  type CachedAnalysis,
  type SignalAnalysisInput,
} from "./signal-analysis";
export {
  searchSignalsHybrid,
  searchSignalsTextIds,
  searchSignalsSemanticIds,
  searchNews,
  listNews,
  getNewsItem,
  newsRegionStats,
  reembedSignals,
  rrf,
  type SignalSearchFilters,
  type SignalHit,
  type NewsSort,
  type NewsDetail,
  type RegionStat,
} from "./signal-search";
export {
  listModelCards,
  listModelsForEnrichment,
  upsertModelCard,
  type ModelCardView,
  type ModelCardFilters,
  type ModelToEnrich,
  type ModelCardInput,
} from "./model-cards";
export {
  newsTopicTargets,
  regionTopic,
  categoryTopic,
  modelTopic,
  evaluateSignalForOrg,
  evaluateSignalAllOrgs,
  type NewsSignalMatch,
} from "./news-alerts";
export {
  listTrendsQuadrant,
  QUADRANT_MIDPOINT,
  type QuadrantTrend,
  type Quadrant,
} from "./quadrant";
export { mineDemand, getTrendDemandHits } from "./demand";
export {
  FUNDING_SOURCE_KEY,
  getTrendFundingHits,
  listRecentFunding,
  type FundingEvent,
} from "./funding";
export { listTrendsForRescore, touchTrend, countScoredTrends } from "./rescore";
export { listTrendSlugs, getTrendSeo, getTrendOg, getEntitySeo } from "./seo";
export { subscribe, unsubscribe, listActiveSubscribers, countSubscribers } from "./newsletter";
export {
  listMembers,
  inviteMember,
  updateMemberRole,
  removeMember,
  canManageMembers,
  countMembers,
  ROLES,
  type Role,
  type Member,
} from "./members";
export { getOrgIntegration, setOrgIntegration, type OrgIntegration } from "./integrations";
export {
  recordTrendSnapshots,
  getTrendMomentumMap,
  type TrendMomentum,
  type MomentumState,
} from "./momentum";
export {
  TRACKED_ENTITY_TYPES,
  computeMomentum,
  recordEntitySnapshots,
  getEntityMomentumMap,
  listTrackedEntities,
  lookupTrackedEntity,
  type EntityMomentum,
  type TrackedEntity,
  type TrackedSort,
  type EntityLookup,
} from "./entity-momentum";
export {
  classifyGitHubEntity,
  supplyEntityFromSignal,
  syncSupplyEntities,
} from "./supply-entities";
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
  recordFailedIngestionRun,
  getLatestRuns,
  type RunResult,
  type LatestRun,
} from "./ingestion-runs";
export { $Enums, Prisma } from "@prisma/client";
