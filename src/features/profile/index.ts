/**
 * Profile feature — the Mind Archive.
 *
 * The player's personal record: the instrument reading their mastery, the
 * evidence of the decisions that produced it, the discoveries they found, and
 * their own words. Not an account page — `/settings` owns preferences and data
 * controls, and none of that furniture belongs in here.
 *
 * Read-only with respect to progression, exactly like the observatory it embeds.
 * The one thing this feature derives is descriptive: tempo, calibration and
 * difficulty spread, all confined to `lib/evidence.ts` and covered by tests.
 *
 * Also owns the **Cognitive Twin** (Phase 8.4) — a model of how this player
 * decides, inferred server-side from their own recorded decisions. The client
 * holds no thresholds, no scoring and no eligibility logic; it renders typed
 * facts the database computed. The prediction card and verdict are exported
 * here because the game loop shows them, but the Twin belongs to the Archive.
 */

export { MindArchiveScreen } from './components/mind-archive-screen'
export { TwinPredictionCard } from './components/twin-prediction'
export { TwinVerdictCard } from './components/twin-verdict'
export { fetchTwinState, requestTwinPrediction, twinVerdictSchema } from './api/twin-service'
export {
  MIN_ACCURACY_SAMPLE,
  catchesFrom,
  describeEvidence,
  describePattern,
  describePrediction,
  describePredictionEvidence,
  describeTwinStatus,
  describeVerdict,
  summariseTwinAccuracy,
  type TwinAccuracy,
  type TwinVerdictCopy,
} from './lib/twin'
export {
  MIN_CALIBRATION_SAMPLE,
  formatDeliberation,
  formatFamilyMastery,
  formatShare,
  masteryDistribution,
  standingsByFamily,
  strongestKnown,
  summariseCalibration,
  summariseDecisions,
  type CalibrationSummary,
  type DecisionSummary,
  type DifficultyBand,
  type FamilyStanding,
} from './lib/evidence'
export type {
  ArchiveCalibrationPoint,
  ArchiveDecision,
  ArchiveDiscovery,
  ArchiveLoad,
  ArchiveRecord,
  ArchiveReflection,
  CognitiveTwinSlot,
  TwinContextKind,
  TwinPattern,
  TwinPrediction,
  TwinPredictionRequest,
  TwinResolvedPrediction,
  TwinVerdict,
} from './types'
