/**
 * Training System Types
 * 
 * 根据 training-system-implementation.md 定义的全新训练系统类型
 */

// ============================================================================
// Dataset & Mode Types
// ============================================================================

export type Dataset = 'world' | 'china'
export type AppLanguage = 'zh' | 'en'
export type PopupDensity = 'adaptive' | 'compact' | 'rich'
export type BorderEmphasis = 'soft' | 'strong'
export type ColorIntensity = 'soft' | 'normal' | 'vivid'

// 世界地图题型
export type WorldTrainingMode =
  | 'name-to-location'      // 看名找图
  | 'shape-to-name'         // 看图选名
  | 'flag-to-location'      // 国旗找国家
  | 'name-to-flag'          // 国家找国旗
  | 'capital-to-location'   // 首都找国家
  | 'name-to-capital'       // 国家找首都
  | 'name-to-continent'     // 国家找大洲
  | 'name-to-subregion'     // 国家找次区域
  | 'neighbor-judge'        // 邻国判断
  | 'neighbor-streak'       // 邻国连击

// 中国地图题型
export type ChinaTrainingMode =
  | 'name-to-location'           // 看名找图
  | 'shape-to-name'              // 看图选名
  | 'city-to-province'           // 城市找所属省份
  | 'province-to-cities'         // 省份找下属城市
  | 'capital-province'           // 省会训练
  | 'province-neighbor-judge'    // 邻省判断

export type TrainingMode = WorldTrainingMode | ChinaTrainingMode

// 交互模式
export type InteractionMode = 'explore' | 'training'

// ============================================================================
// Scope Types
// ============================================================================

// 世界地图 Scope
export type WorldScopeType =
  | 'all'
  | 'continent'
  | 'microstates'
  | 'confusion-set'
  | 'wrong-only'
  | 'weak-only'

// 中国地图 Scope
export type ChinaScopeType =
  | 'all'
  | 'province'
  | 'same-province'
  | 'confusion-set'
  | 'wrong-only'
  | 'weak-only'

export type ScopeType = WorldScopeType | ChinaScopeType

// 大洲选项
export type Continent =
  | 'asia'
  | 'europe'
  | 'africa'
  | 'north-america'
  | 'south-america'
  | 'oceania'

// ============================================================================
// Skill Types
// ============================================================================

// 世界地图技能维度
export type WorldSkill =
  | 'location'
  | 'shape_name'
  | 'flag'
  | 'capital'
  | 'continent'
  | 'subregion'
  | 'neighbors'

// 中国地图技能维度
export type ChinaSkill =
  | 'location'
  | 'shape_name'
  | 'province_affiliation'
  | 'province_children'
  | 'provincial_capital'
  | 'neighbors'

export type Skill = WorldSkill | ChinaSkill

// ============================================================================
// Challenge Types
// ============================================================================

export type ChallengeMode =
  | 'normal'
  | 'exam'
  | 'timed'
  | 'streak'

export interface ChallengeConfig {
  mode: ChallengeMode
  examQuestionCount?: number
  timeLimit?: number
  targetStreak?: number
}

// ============================================================================
// Answer Types
// ============================================================================

export type AnswerType =
  | 'map-click'
  | 'choice'
  | 'boolean'
  | 'streak'

export type UserAnswer =
  | { type: 'map-click'; regionId: string }
  | { type: 'choice'; optionIndex: number }
  | { type: 'boolean'; value: boolean }
  | { type: 'streak'; regionIds: string[] }

// ============================================================================
// Region Meta (兼容原有数据)
// ============================================================================

export type RegionMeta = {
  id: string
  nameEn: string
  nameZh: string
  isoA2?: string | null
  isoA3?: string | null
  formalNameEn?: string | null
  continent?: string | null
  regionUn?: string | null
  subregion?: string | null
  population?: number | null
  wikidataId?: string | null
  adcode?: number | null
  level?: string | null
  parentAdcode?: number | null
  parentNameZh?: string | null
  parentNameEn?: string | null
  centroid?: number[] | null
  center?: number[] | null
  labelWeight?: number | null
}

export type RegionLabels = {
  zh: string
  en: string
}

export type RegionFeature = {
  id: string
  dataset: Dataset
  geometry: unknown
  labels: RegionLabels
  aliases: string[]
  parentId: string | null
  neighbors: string[]
  metadata: {
    continent?: string | null
    subregion?: string | null
    population?: number | null
    capital?: string | null
    level?: string | null
    parentNameZh?: string | null
    parentNameEn?: string | null
    formalNameEn?: string | null
    neighborCount: number
  }
  region: RegionMeta
}

// ============================================================================
// Training Session
// ============================================================================

export type TrainingResult = 'idle' | 'correct' | 'wrong' | 'partial'

export interface Prompt {
  type: 'text' | 'flag' | 'shape' | 'capital' | 'province'
  content: string
  regionId: string
  context?: {
    flagUrl?: string
    continent?: string
    subregion?: string
    capital?: string
  }
}

export interface ChoiceOption {
  id: string
  label: string
  flagUrl?: string
}

export interface StreakProgress {
  targetRegionId: string
  targetRegionIds: string[]
  completedIds: string[]
  currentWrongIds: string[]
}

export interface TrainingSession {
  dataset: Dataset
  mode: TrainingMode
  skill: Skill
  scopeType: ScopeType
  scopeValue: string | null
  prompt: Prompt
  options?: ChoiceOption[]
  correctAnswer: UserAnswer
  userAnswer: UserAnswer | null
  status: TrainingResult
  startedAt: string
  answeredAt: string | null
  streakProgress?: StreakProgress
}

// ============================================================================
// Progress Types (Skill-based)
// ============================================================================

export interface SkillProgress {
  attempts: number
  correct: number
  wrong: number
  lastSeenAt: string | null
  lastCorrectAt: string | null
  streak: number
  masteryScore: number
}

// 新结构: progress[dataset][skill][regionId]
export type ProgressBySkill = Record<string, SkillProgress>

// 每个 dataset 包含所有 skill（包括不适合的 skill）
export type DatasetSkillProgress = Partial<Record<Skill, ProgressBySkill>>
export type SkillProgressByDataset = Record<Dataset, DatasetSkillProgress>

// ============================================================================
// Mode Configuration
// ============================================================================

export interface ModeConfig {
  id: TrainingMode
  label: string
  labelEn: string
  dataset: Dataset[]
  skill: Skill
  answerType: AnswerType
  promptBuilder: (region: RegionMeta, options?: unknown) => Prompt
  optionBuilder?: (region: RegionMeta, allRegions: RegionMeta[]) => ChoiceOption[]
  evaluator: (userAnswer: UserAnswer, correctAnswer: UserAnswer) => boolean
  feedbackFormatter: (session: TrainingSession, region: RegionMeta) => string
}

export interface ScopeConfig {
  id: ScopeType
  label: string
  labelEn: string
  dataset: Dataset[]
  requiresValue: boolean
  filterFn: (regions: RegionMeta[], value?: string, context?: unknown) => RegionMeta[]
}

// ============================================================================
// Error Book & Weak Items
// ============================================================================

export interface ErrorRecord {
  id: string
  dataset: Dataset
  mode: TrainingMode
  skill: Skill
  regionId: string
  regionName: string
  userAnswer: UserAnswer
  correctAnswer: UserAnswer
  timestamp: string
}

export interface WeakItem {
  dataset: Dataset
  skill: Skill
  regionId: string
  masteryScore: number
  lastWrongAt: string
}

// ============================================================================
// Enhanced User Settings
// ============================================================================

export interface TrainingSettings {
  dataset: Dataset
  interactionMode: InteractionMode
  trainingMode: TrainingMode
  language: AppLanguage
  showLabels: boolean
  scopeType: ScopeType
  scopeValue: string | null
  challengeMode: ChallengeMode
  challengeConfig: ChallengeConfig
  popupDensity: PopupDensity
  borderEmphasis: BorderEmphasis
  colorIntensity: ColorIntensity
}

// ============================================================================
// Statistics
// ============================================================================

export interface SkillStats {
  skill: Skill
  totalAttempts: number
  correctCount: number
  wrongCount: number
  accuracy: number
  averageMastery: number
  masteredCount: number
  weakCount: number
}

export interface DatasetStats {
  dataset: Dataset
  totalRegions: number
  practicedRegions: number
  skillStats: SkillStats[]
  overallAccuracy: number
}

// ============================================================================
// Migration Types
// ============================================================================

export interface PersistedTrainingData {
  version: 3 | 4
  settings: TrainingSettings
  progress: SkillProgressByDataset
  errorBook: ErrorRecord[]
  weakItems: WeakItem[]
  markedRegions: Record<Dataset, string[]>
}

export interface ExportTrainingSnapshot {
  version: 3 | 4
  exportedAt: string
  data: PersistedTrainingData
}
