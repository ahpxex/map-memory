/**
 * Training System Atoms
 * 
 * 基于 skill 维度的训练状态管理
 */

import { atom } from 'jotai'
import type {
  Dataset,
  TrainingMode,
  Skill,
  ScopeType,
  UserAnswer,
  TrainingSession,
  SkillProgress,
  ProgressBySkill,
  SkillProgressByDataset,
  ErrorRecord,
  PersistedTrainingData,
  WeakItem,
  TrainingSettings,
  ChallengeMode,
} from '../types/training'
import { getModeConfig, getSkillForMode } from '../features/training/modeConfigs'
import { getScopeConfig, filterRegionsByScope } from '../features/training/scopeConfigs'
import { datasetConfigs } from '../features/map/datasets'
import type { RegionMeta } from '../types/training'
import { generateQuestion } from '../features/training/generators/questionGenerator'

// ============================================================================
// Default Values
// ============================================================================

function createDefaultSkillProgress(): SkillProgress {
  return {
    attempts: 0,
    correct: 0,
    wrong: 0,
    lastSeenAt: null,
    lastCorrectAt: null,
    streak: 0,
    masteryScore: 0,
  }
}

function createEmptyDatasetSkillProgress(): Record<Skill, ProgressBySkill> {
  return {
    location: {},
    shape_name: {},
    flag: {},
    capital: {},
    continent: {},
    subregion: {},
    neighbors: {},
    province_affiliation: {},
    province_children: {},
    provincial_capital: {},
  } as Record<Skill, ProgressBySkill>
}

function createEmptySkillProgressByDataset(): SkillProgressByDataset {
  return {
    world: createEmptyDatasetSkillProgress(),
    china: createEmptyDatasetSkillProgress(),
  }
}

export function createDefaultTrainingSettings(): TrainingSettings {
  return {
    dataset: 'world',
    interactionMode: 'explore',
    trainingMode: 'name-to-location',
    language: 'zh',
    showLabels: false,
    scopeType: 'all',
    scopeValue: null,
    challengeMode: 'normal',
    challengeConfig: {
      mode: 'normal',
      examQuestionCount: 20,
      timeLimit: 300,
      targetStreak: 10,
    },
  }
}

// ============================================================================
// Core Atoms
// ============================================================================

export const trainingSettingsAtom = atom<TrainingSettings>(createDefaultTrainingSettings())
const primitiveTrainingSessionAtom = atom<TrainingSession | null>(null) as ReturnType<typeof atom<TrainingSession | null>> & { write: unknown }
export const trainingSessionAtom = atom(
  (get) => get(primitiveTrainingSessionAtom),
  (_get, set, session: TrainingSession | null) => {
    set(primitiveTrainingSessionAtom, session)
  }
)
export const skillProgressAtom = atom<SkillProgressByDataset>(createEmptySkillProgressByDataset())
export const errorBookAtom = atom<ErrorRecord[]>([])
export const weakItemsAtom = atom<WeakItem[]>([])
export const persistenceReadyAtom = atom(false)
export const mapViewportResetTokenAtom = atom(0)
export const requestMapViewportResetAtom = atom(null, (get, set) => {
  set(mapViewportResetTokenAtom, get(mapViewportResetTokenAtom) + 1)
})

export const replaceTrainingDataAtom = atom(null, (_get, set, data: PersistedTrainingData) => {
  set(trainingSettingsAtom, data.settings)
  set(skillProgressAtom, data.progress)
  set(errorBookAtom, data.errorBook)
  set(weakItemsAtom, data.weakItems)
  if (data.settings.interactionMode === 'training') {
    set(initTrainingSessionAtom)
    return
  }
  set(primitiveTrainingSessionAtom, null)
})

export const persistedTrainingDataAtom = atom<PersistedTrainingData>((get) => ({
  version: 3,
  settings: get(trainingSettingsAtom),
  progress: get(skillProgressAtom),
  errorBook: get(errorBookAtom),
  weakItems: get(weakItemsAtom),
  markedRegions: {
    world: [],
    china: [],
  },
}))

// ============================================================================
// Derived Atoms - Settings
// ============================================================================

export const datasetAtom = atom(
  (get) => get(trainingSettingsAtom).dataset,
  (get, set, dataset: Dataset) => {
    set(trainingSettingsAtom, (prev) => ({
      ...prev,
      dataset,
      scopeType: 'all',
      scopeValue: null,
      trainingMode: dataset === 'world' ? 'name-to-location' : 'name-to-location',
    }))
    if (get(interactionModeAtom) === 'training') {
      set(initTrainingSessionAtom)
      return
    }
    set(primitiveTrainingSessionAtom, null)
  }
)

export const interactionModeAtom = atom(
  (get) => get(trainingSettingsAtom).interactionMode,
  (_get, set, mode: 'explore' | 'training') => {
    set(trainingSettingsAtom, (prev) => ({ ...prev, interactionMode: mode }))
    if (mode === 'training') {
      set(initTrainingSessionAtom)
    } else {
      set(primitiveTrainingSessionAtom, null)
    }
  }
)

export const trainingModeAtom = atom(
  (get) => get(trainingSettingsAtom).trainingMode,
  (_get, set, mode: TrainingMode) => {
    set(trainingSettingsAtom, (prev) => ({ ...prev, trainingMode: mode }))
    set(initTrainingSessionAtom)
  }
)

export const languageAtom = atom(
  (get) => get(trainingSettingsAtom).language,
  (_get, set, lang: 'zh' | 'en') => {
    set(trainingSettingsAtom, (prev) => ({ ...prev, language: lang }))
  }
)

export const showLabelsAtom = atom(
  (get) => get(trainingSettingsAtom).showLabels,
  (_get, set, show: boolean) => {
    set(trainingSettingsAtom, (prev) => ({ ...prev, showLabels: show }))
  }
)

export const scopeTypeAtom = atom(
  (get) => get(trainingSettingsAtom).scopeType,
  (get, set, scope: ScopeType) => {
    const config = getScopeConfig(scope, get(datasetAtom))
    set(trainingSettingsAtom, (prev) => ({
      ...prev,
      scopeType: scope,
      scopeValue: config?.requiresValue ? prev.scopeValue : null,
    }))
    set(initTrainingSessionAtom)
  }
)

export const scopeValueAtom = atom(
  (get) => get(trainingSettingsAtom).scopeValue,
  (_get, set, value: string | null) => {
    set(trainingSettingsAtom, (prev) => ({ ...prev, scopeValue: value }))
    set(initTrainingSessionAtom)
  }
)

export const challengeModeAtom = atom(
  (get) => get(trainingSettingsAtom).challengeMode,
  (_get, set, mode: ChallengeMode) => {
    set(trainingSettingsAtom, (prev) => ({
      ...prev,
      challengeMode: mode,
      challengeConfig: { ...prev.challengeConfig, mode },
    }))
  }
)

// ============================================================================
// Derived Atoms - Data
// ============================================================================

export const currentDatasetConfigAtom = atom((get) => {
  const dataset = get(datasetAtom)
  return datasetConfigs[dataset]
})

export const availableRegionsAtom = atom((get) => {
  const config = get(currentDatasetConfigAtom)
  const settings = get(trainingSettingsAtom)
  const errorBook = get(errorBookAtom)
  const weakItems = get(weakItemsAtom)
  
  const allRegions = config.regionIds
    .map((id) => config.regionById.get(id))
    .filter((r): r is RegionMeta => r !== undefined)
  
  return filterRegionsByScope(
    allRegions,
    settings.scopeType,
    settings.scopeValue,
    settings.dataset,
    { errorBook, weakItems }
  )
})

export const currentModeConfigAtom = atom((get) => {
  const mode = get(trainingModeAtom)
  return getModeConfig(mode)
})

// ============================================================================
// Progress Atoms
// ============================================================================

export function getSkillProgress(
  progress: SkillProgressByDataset,
  dataset: Dataset,
  skill: Skill,
  regionId: string
): SkillProgress {
  return progress[dataset]?.[skill]?.[regionId] ?? createDefaultSkillProgress()
}

export const currentSkillAtom = atom((get) => {
  const mode = get(trainingModeAtom)
  return getSkillForMode(mode)
})

export const currentSkillProgressMapAtom = atom((get) => {
  const dataset = get(datasetAtom)
  const skill = get(currentSkillAtom)
  const progress = get(skillProgressAtom)
  
  return progress[dataset]?.[skill] ?? {}
})

// ============================================================================
// Training Session Management
// ============================================================================

function selectNextRegion(
  regions: RegionMeta[],
  progressMap: ProgressBySkill,
  errorBook: ErrorRecord[],
  weakItems: WeakItem[],
  skill: Skill,
  dataset: Dataset
): RegionMeta | null {
  if (regions.length === 0) return null
  
  const scored = regions.map((region) => {
    const progress = progressMap[region.id] ?? createDefaultSkillProgress()
    const hasError = errorBook.some((e) =>
      e.dataset === dataset && e.skill === skill && e.regionId === region.id
    )
    const isWeak = weakItems.some((w) =>
      w.dataset === dataset && w.skill === skill && w.regionId === region.id && w.masteryScore < 50
    )
    
    let score = 0
    if (progress.attempts === 0) score += 100
    if (hasError) score += 50
    if (isWeak) score += 30
    score += (100 - progress.masteryScore) * 0.5
    score += progress.wrong * 10
    
    if (progress.lastSeenAt) {
      const daysSince = (Date.now() - new Date(progress.lastSeenAt).getTime()) / (1000 * 60 * 60 * 24)
      score += Math.min(daysSince, 30)
    }
    
    score -= progress.streak * 5
    
    return { region, score }
  })
  
  scored.sort((a, b) => b.score - a.score)
  
  const poolSize = Math.min(scored.length, 16)
  const pool = scored.slice(0, poolSize)
  const randomIndex = Math.floor(Math.random() * pool.length)
  
  return pool[randomIndex]?.region ?? scored[0]?.region ?? null
}

export const initTrainingSessionAtom = atom(null, (get, set) => {
  const settings = get(trainingSettingsAtom)
  const modeConfig = get(currentModeConfigAtom)
  const progress = get(skillProgressAtom)
  const errorBook = get(errorBookAtom)
  const weakItems = get(weakItemsAtom)
  const regions = get(availableRegionsAtom)
  
  if (!modeConfig || regions.length === 0) {
    set(primitiveTrainingSessionAtom, null)
    return
  }
  
  const skill = modeConfig.skill!
  const progressMap = progress[settings.dataset]?.[skill] ?? {}
  
  const region = selectNextRegion(
    regions,
    progressMap,
    errorBook,
    weakItems,
    skill,
    settings.dataset
  )
  
  if (!region) {
    set(primitiveTrainingSessionAtom, null)
    return
  }
  
  // 使用 questionGenerator 生成题目
  const allRegions = get(currentDatasetConfigAtom).regionIds
    .map((id) => get(currentDatasetConfigAtom).regionById.get(id))
    .filter((r): r is RegionMeta => r !== undefined)
  
  const generated = generateQuestion(region, settings.trainingMode, settings.dataset, allRegions)
  
  if (!generated) {
    set(primitiveTrainingSessionAtom, null)
    return
  }
  
  const session: TrainingSession = {
    dataset: settings.dataset,
    mode: settings.trainingMode,
    skill: generated.skill,
    scopeType: settings.scopeType,
    scopeValue: settings.scopeValue,
    prompt: generated.prompt,
    options: generated.options,
    correctAnswer: generated.correctAnswer,
    userAnswer: null,
    status: 'idle',
    startedAt: new Date().toISOString(),
    answeredAt: null,
  }
  
  set(primitiveTrainingSessionAtom, session)
})

export const submitAnswerAtom = atom(null, (get, set, answer: UserAnswer) => {
  const session = get(trainingSessionAtom)
  if (!session || session.userAnswer) return
  
  const modeConfig = get(currentModeConfigAtom)
  if (!modeConfig) return
  
  const isCorrect = modeConfig.evaluator!(answer, session.correctAnswer)
  
  const updatedSession: TrainingSession = {
    ...session,
    userAnswer: answer,
    status: isCorrect ? 'correct' : 'wrong',
    answeredAt: new Date().toISOString(),
  }
  
  set(primitiveTrainingSessionAtom, updatedSession)
  set(updateProgressAtom, session.dataset, session.skill, session.prompt.regionId, isCorrect)
  
  if (!isCorrect) {
    set(addErrorRecordAtom, session, answer)
  }
})

export const updateProgressAtom = atom(null, (
  get, set,
  dataset: Dataset,
  skill: Skill,
  regionId: string,
  isCorrect: boolean
) => {
  const current = get(skillProgressAtom)[dataset]?.[skill]?.[regionId] ?? createDefaultSkillProgress()
  const now = new Date().toISOString()
  const newStreak = isCorrect ? current.streak + 1 : 0
  const totalAttempts = current.attempts + 1
  const correctCount = current.correct + (isCorrect ? 1 : 0)
  const accuracy = correctCount / totalAttempts
  const streakBonus = Math.min(newStreak * 5, 20)
  const practicePenalty = Math.min(totalAttempts * 0.5, 10)
  const newMastery = Math.round((accuracy * 60 + streakBonus - practicePenalty + 20) * 100) / 100
  const clampedMastery = Math.max(0, Math.min(100, newMastery))

  const updated: SkillProgress = {
    attempts: totalAttempts,
    correct: correctCount,
    wrong: current.wrong + (isCorrect ? 0 : 1),
    lastSeenAt: now,
    lastCorrectAt: isCorrect ? now : current.lastCorrectAt,
    streak: newStreak,
    masteryScore: clampedMastery,
  }

  set(skillProgressAtom, (prev) => {
    return {
      ...prev,
      [dataset]: {
        ...prev[dataset],
        [skill]: {
          ...prev[dataset][skill],
          [regionId]: updated,
        },
      },
    }
  })

  set(weakItemsAtom, (prev) => {
    const withoutCurrent = prev.filter((item) =>
      !(item.dataset === dataset && item.skill === skill && item.regionId === regionId)
    )
    if (updated.attempts === 0 || updated.masteryScore >= 50) {
      return withoutCurrent
    }

    const currentWeakItem = prev.find((item) =>
      item.dataset === dataset && item.skill === skill && item.regionId === regionId
    )

    return [
      {
        dataset,
        skill,
        regionId,
        masteryScore: updated.masteryScore,
        lastWrongAt: isCorrect ? currentWeakItem?.lastWrongAt ?? now : now,
      },
      ...withoutCurrent,
    ].slice(0, 1000)
  })
})

export const addErrorRecordAtom = atom(null, (
  get, set,
  session: TrainingSession,
  userAnswer: { type: 'map-click'; regionId: string }
) => {
  const config = get(currentDatasetConfigAtom)
  const region = config.regionById.get(session.prompt.regionId)
  if (!region) return
  
  const record: ErrorRecord = {
    id: crypto.randomUUID(),
    dataset: session.dataset,
    mode: session.mode,
    skill: session.skill,
    regionId: session.prompt.regionId,
    regionName: region.nameZh,
    userAnswer,
    correctAnswer: session.correctAnswer,
    timestamp: new Date().toISOString(),
  }
  
  set(errorBookAtom, (prev) => [record, ...prev].slice(0, 1000))
})

export const nextQuestionAtom = atom(null, (_get, set) => {
  set(initTrainingSessionAtom)
})

// ============================================================================
// Statistics Atoms
// ============================================================================

export const currentDatasetStatsAtom = atom((get) => {
  const dataset = get(datasetAtom)
  const config = get(currentDatasetConfigAtom)
  const skill = get(currentSkillAtom)
  const progress = get(skillProgressAtom)
  
  const skillProgress = progress[dataset]?.[skill] ?? {}
  const totalRegions = config.regionIds.length
  const practicedRegions = Object.values(skillProgress).filter((p) => p.attempts > 0).length
  
  const attempts = Object.values(skillProgress).reduce((sum, p) => sum + p.attempts, 0)
  const correct = Object.values(skillProgress).reduce((sum, p) => sum + p.correct, 0)
  
  return {
    totalRegions,
    practicedRegions,
    attempts,
    correct,
    accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
  }
})

export const allSkillsStatsAtom = atom((get) => {
  const dataset = get(datasetAtom)
  const progress = get(skillProgressAtom)
  
  const datasetProgress = progress[dataset] ?? {}
  
  return Object.entries(datasetProgress).map(([skill, skillProgress]) => {
    const entries = Object.values(skillProgress ?? {})
    const attempts = entries.reduce((sum, p) => sum + (p?.attempts ?? 0), 0)
    const correct = entries.reduce((sum, p) => sum + (p?.correct ?? 0), 0)
    
    return {
      skill: skill as Skill,
      totalAttempts: attempts,
      correctCount: correct,
      wrongCount: entries.reduce((sum, p) => sum + (p?.wrong ?? 0), 0),
      accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
      averageMastery: entries.length > 0
        ? Math.round(entries.reduce((sum, p) => sum + (p?.masteryScore ?? 0), 0) / entries.length)
        : 0,
      masteredCount: entries.filter((p) => (p?.masteryScore ?? 0) >= 80).length,
      weakCount: entries.filter((p) => (p?.masteryScore ?? 0) < 50 && (p?.attempts ?? 0) > 0).length,
    }
  })
})
