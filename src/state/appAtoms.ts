import { atom } from 'jotai'
import { worldRegionById, worldRegionIds } from '../features/map/worldDataset'
import type {
  DatasetMode,
  LanguageMode,
  PersistedAppData,
  PopupPosition,
  PopupState,
  ProgressByDataset,
  RegionProgress,
  TrainingSession,
  UserSettings,
} from '../types/app'
import { createDefaultPersistedData } from '../types/app'

const defaultPersistedData = createDefaultPersistedData()

function createIdleTrainingSession(): TrainingSession {
  return {
    promptRegionId: null,
    answeredRegionId: null,
    result: 'idle',
  }
}

function createEmptyRegionProgress(): RegionProgress {
  return {
    attempts: 0,
    correct: 0,
    wrong: 0,
    lastSeenAt: null,
    lastCorrectAt: null,
  }
}

function getRegionProgress(
  progressByDataset: ProgressByDataset,
  dataset: DatasetMode,
  regionId: string,
) {
  return progressByDataset[dataset][regionId] ?? createEmptyRegionProgress()
}

function cloneSettings(
  persistedData: PersistedAppData,
  nextSettings: Partial<UserSettings>,
): PersistedAppData {
  return {
    ...persistedData,
    settings: {
      ...persistedData.settings,
      ...nextSettings,
    },
  }
}

function pickNextWorldPrompt(progressByDataset: ProgressByDataset) {
  const ranked = worldRegionIds
    .map((regionId) => {
      const progress = getRegionProgress(progressByDataset, 'world', regionId)
      const score =
        (progress.attempts === 0 ? 100 : 0) + progress.wrong * 8 - progress.correct * 2 - progress.attempts

      return { regionId, score }
    })
    .toSorted((left, right) => right.score - left.score)

  const candidatePool = ranked.slice(0, Math.min(ranked.length, 12))
  const randomIndex = Math.floor(Math.random() * candidatePool.length)

  return candidatePool[randomIndex]?.regionId ?? worldRegionIds[0] ?? null
}

function recordTrainingAttempt(
  persistedData: PersistedAppData,
  regionId: string,
  isCorrect: boolean,
): PersistedAppData {
  const current = getRegionProgress(persistedData.progress, 'world', regionId)
  const now = new Date().toISOString()

  return {
    ...persistedData,
    progress: {
      ...persistedData.progress,
      world: {
        ...persistedData.progress.world,
        [regionId]: {
          attempts: current.attempts + 1,
          correct: current.correct + (isCorrect ? 1 : 0),
          wrong: current.wrong + (isCorrect ? 0 : 1),
          lastSeenAt: now,
          lastCorrectAt: isCorrect ? now : current.lastCorrectAt,
        },
      },
    },
  }
}

function createPopupState(regionId: string, position: PopupPosition, kind: PopupState['kind']): PopupState {
  return {
    regionId,
    kind,
    x: position.x,
    y: position.y,
  }
}

export const persistedDataAtom = atom<PersistedAppData>(defaultPersistedData)
export const hydratedAtom = atom(false)
export const selectedRegionIdAtom = atom<string | null>(null)
export const popupStateAtom = atom<PopupState | null>(null)
export const noticeAtom = atom<string | null>(null)
export const trainingSessionAtom = atom<TrainingSession>(createIdleTrainingSession())

export const datasetAtom = atom(
  (get) => get(persistedDataAtom).settings.dataset,
  (get, set, dataset: DatasetMode) => {
    set(persistedDataAtom, cloneSettings(get(persistedDataAtom), { dataset }))
    set(selectedRegionIdAtom, null)
    set(popupStateAtom, null)
    set(trainingSessionAtom, createIdleTrainingSession())

    if (dataset === 'china') {
      set(noticeAtom, '中国地级市/州数据聚合下一步接入，这一版先把世界模式打透。')
    }
  },
)

export const interactionModeAtom = atom(
  (get) => get(persistedDataAtom).settings.interactionMode,
  (get, set, interactionMode: UserSettings['interactionMode']) => {
    set(persistedDataAtom, cloneSettings(get(persistedDataAtom), { interactionMode }))
    set(selectedRegionIdAtom, null)
    set(popupStateAtom, null)
    set(trainingSessionAtom, createIdleTrainingSession())
  },
)

export const trainingModeAtom = atom(
  (get) => get(persistedDataAtom).settings.trainingMode,
  (get, set, trainingMode: UserSettings['trainingMode']) => {
    set(persistedDataAtom, cloneSettings(get(persistedDataAtom), { trainingMode }))
    set(selectedRegionIdAtom, null)
    set(popupStateAtom, null)
    set(trainingSessionAtom, createIdleTrainingSession())
  },
)

export const showLabelsAtom = atom(
  (get) => get(persistedDataAtom).settings.showLabels,
  (get, set, showLabels: boolean) => {
    set(persistedDataAtom, cloneSettings(get(persistedDataAtom), { showLabels }))
  },
)

export const languageAtom = atom(
  (get) => get(persistedDataAtom).settings.language,
  (get, set, language: LanguageMode) => {
    set(persistedDataAtom, cloneSettings(get(persistedDataAtom), { language }))
  },
)

export const currentDatasetImplementedAtom = atom((get) => get(datasetAtom) === 'world')

export const selectedRegionAtom = atom((get) => {
  const selectedRegionId = get(selectedRegionIdAtom)

  return selectedRegionId ? worldRegionById.get(selectedRegionId) ?? null : null
})

export const currentPromptRegionAtom = atom((get) => {
  const promptRegionId = get(trainingSessionAtom).promptRegionId

  return promptRegionId ? worldRegionById.get(promptRegionId) ?? null : null
})

export const startNextTrainingRoundAtom = atom(null, (get, set) => {
  if (get(datasetAtom) !== 'world') {
    return
  }

  const promptRegionId = pickNextWorldPrompt(get(persistedDataAtom).progress)

  set(trainingSessionAtom, {
    promptRegionId,
    answeredRegionId: null,
    result: 'idle',
  })
  set(selectedRegionIdAtom, null)
  set(popupStateAtom, null)
})

export const dismissPopupAtom = atom(null, (_get, set) => {
  set(popupStateAtom, null)
})

export const clearNoticeAtom = atom(null, (_get, set) => {
  set(noticeAtom, null)
})

export const replacePersistedDataAtom = atom(
  null,
  (_get, set, nextPersistedData: PersistedAppData) => {
    set(persistedDataAtom, nextPersistedData)
    set(selectedRegionIdAtom, null)
    set(popupStateAtom, null)
    set(trainingSessionAtom, createIdleTrainingSession())
    set(noticeAtom, '训练数据已导入，本地状态已替换。')
  },
)

export const handleRegionSelectionAtom = atom(
  null,
  (get, set, payload: { regionId: string; position: PopupPosition }) => {
    const { regionId, position } = payload

    if (get(datasetAtom) !== 'world') {
      set(noticeAtom, '中国地级市/州数据聚合下一步接入，这一版先把世界模式打透。')
      return
    }

    const interactionMode = get(interactionModeAtom)

    set(selectedRegionIdAtom, regionId)

    if (interactionMode === 'explore') {
      set(popupStateAtom, createPopupState(regionId, position, 'explore'))
      return
    }

    const currentSession = get(trainingSessionAtom)
    const promptRegionId =
      currentSession.promptRegionId ?? pickNextWorldPrompt(get(persistedDataAtom).progress)

    if (!promptRegionId) {
      return
    }

    const isCorrect = regionId === promptRegionId

    set(persistedDataAtom, recordTrainingAttempt(get(persistedDataAtom), promptRegionId, isCorrect))
    set(trainingSessionAtom, {
      promptRegionId,
      answeredRegionId: regionId,
      result: isCorrect ? 'correct' : 'wrong',
    })
    set(popupStateAtom, createPopupState(regionId, position, 'training'))
  },
)
