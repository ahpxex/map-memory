import { atom } from 'jotai'
import { datasetConfigs } from '../features/map/datasets'
import type {
  DatasetMode,
  LanguageMode,
  MarkedRegionsByDataset,
  PersistedAppData,
  PracticeRecordEntry,
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

function createNextMarkedRegions(
  markedRegions: MarkedRegionsByDataset,
  dataset: DatasetMode,
  regionId: string,
  datasetRegionIds: string[],
) {
  const nextMarkedRegionIds = new Set(markedRegions[dataset])

  if (nextMarkedRegionIds.has(regionId)) {
    nextMarkedRegionIds.delete(regionId)
  } else {
    nextMarkedRegionIds.add(regionId)
  }

  return {
    ...markedRegions,
    [dataset]: datasetRegionIds.filter((currentRegionId) => nextMarkedRegionIds.has(currentRegionId)),
  }
}

function pickNextPrompt(
  dataset: DatasetMode,
  progressByDataset: ProgressByDataset,
) {
  const config = datasetConfigs[dataset]

  const ranked = config.regionIds
    .map((regionId) => {
      const progress = getRegionProgress(progressByDataset, dataset, regionId)
      const score =
        (progress.attempts === 0 ? 100 : 0) + progress.wrong * 8 - progress.correct * 2 - progress.attempts

      return { regionId, score }
    })
    .toSorted((left, right) => right.score - left.score)

  const candidatePool = ranked.slice(0, Math.min(ranked.length, 16))
  const randomIndex = Math.floor(Math.random() * candidatePool.length)

  return candidatePool[randomIndex]?.regionId ?? config.regionIds[0] ?? null
}

function recordTrainingAttempt(
  persistedData: PersistedAppData,
  dataset: DatasetMode,
  regionId: string,
  isCorrect: boolean,
): PersistedAppData {
  const current = getRegionProgress(persistedData.progress, dataset, regionId)
  const now = new Date().toISOString()

  return {
    ...persistedData,
    progress: {
      ...persistedData.progress,
      [dataset]: {
        ...persistedData.progress[dataset],
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

export const currentDatasetConfigAtom = atom((get) => datasetConfigs[get(datasetAtom)])

export const currentDatasetImplementedAtom = atom((get) => {
  const dataset = get(datasetAtom)
  const config = datasetConfigs[dataset]

  return config.regionIds.length > 0
})

export const selectedRegionAtom = atom((get) => {
  const selectedRegionId = get(selectedRegionIdAtom)
  const config = get(currentDatasetConfigAtom)

  return selectedRegionId ? config.regionById.get(selectedRegionId) ?? null : null
})

export const currentPromptRegionAtom = atom((get) => {
  const promptRegionId = get(trainingSessionAtom).promptRegionId
  const config = get(currentDatasetConfigAtom)

  return promptRegionId ? config.regionById.get(promptRegionId) ?? null : null
})

export const currentDatasetProgressAtom = atom((get) => {
  const dataset = get(datasetAtom)

  return get(persistedDataAtom).progress[dataset]
})

export const currentDatasetMarkedRegionIdsAtom = atom((get) => {
  const dataset = get(datasetAtom)

  return get(persistedDataAtom).markedRegions[dataset]
})

export const currentDatasetMarkedRegionIdSetAtom = atom(
  (get) => new Set(get(currentDatasetMarkedRegionIdsAtom)),
)

export const currentDatasetStatsAtom = atom((get) => {
  const progressMap = Object.values(get(currentDatasetProgressAtom))
  const totalRegions = get(currentDatasetConfigAtom).regionIds.length
  const practicedRegions = progressMap.filter((progress) => progress.attempts > 0).length
  const attempts = progressMap.reduce((sum, progress) => sum + progress.attempts, 0)
  const correct = progressMap.reduce((sum, progress) => sum + progress.correct, 0)

  return {
    totalRegions,
    practicedRegions,
    attempts,
    correct,
    accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
  }
})

export const currentDatasetPracticeEntriesAtom = atom((get) => {
  const dataset = get(datasetAtom)
  const progressMap = get(currentDatasetProgressAtom)
  const config = get(currentDatasetConfigAtom)

  return Object.entries(progressMap)
    .filter(([, progress]) => progress.attempts > 0)
    .map(([regionId, progress]) => {
      const region = config.regionById.get(regionId)

      if (!region) {
        return null
      }

      const attempts = progress.attempts
      const correct = progress.correct

      return {
        regionId,
        dataset,
        nameZh: region.nameZh,
        nameEn: region.nameEn,
        parentNameZh: region.parentNameZh ?? null,
        parentNameEn: region.parentNameEn ?? null,
        level: region.level ?? null,
        attempts,
        correct,
        wrong: progress.wrong,
        accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
        lastSeenAt: progress.lastSeenAt,
        lastCorrectAt: progress.lastCorrectAt,
      } satisfies PracticeRecordEntry
    })
    .filter((entry) => entry !== null)
    .toSorted((left, right) => {
      const rightSeenAt = right.lastSeenAt ? Date.parse(right.lastSeenAt) : 0
      const leftSeenAt = left.lastSeenAt ? Date.parse(left.lastSeenAt) : 0

      if (rightSeenAt !== leftSeenAt) {
        return rightSeenAt - leftSeenAt
      }

      if (right.attempts !== left.attempts) {
        return right.attempts - left.attempts
      }

      return right.accuracy - left.accuracy
    })
})

export const startNextTrainingRoundAtom = atom(null, (get, set) => {
  const dataset = get(datasetAtom)
  const promptRegionId = pickNextPrompt(dataset, get(persistedDataAtom).progress)

  set(trainingSessionAtom, {
    promptRegionId,
    answeredRegionId: null,
    result: 'idle',
  })
  set(selectedRegionIdAtom, null)
  set(popupStateAtom, null)
})

export const dismissPopupAtom = atom(null, (_get, set) => {
  set(selectedRegionIdAtom, null)
  set(popupStateAtom, null)
})

export const toggleMarkedRegionAtom = atom(null, (get, set, regionId: string) => {
  const dataset = get(datasetAtom)
  const datasetRegionIds = get(currentDatasetConfigAtom).regionIds
  const persistedData = get(persistedDataAtom)

  set(persistedDataAtom, {
    ...persistedData,
    markedRegions: createNextMarkedRegions(
      persistedData.markedRegions,
      dataset,
      regionId,
      datasetRegionIds,
    ),
  })
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
    const dataset = get(datasetAtom)
    const interactionMode = get(interactionModeAtom)

    set(selectedRegionIdAtom, regionId)

    if (interactionMode === 'explore') {
      set(popupStateAtom, createPopupState(regionId, position, 'explore'))
      return
    }

    const currentSession = get(trainingSessionAtom)
    const promptRegionId =
      currentSession.promptRegionId ?? pickNextPrompt(dataset, get(persistedDataAtom).progress)

    if (!promptRegionId) {
      return
    }

    const isCorrect = regionId === promptRegionId

    set(persistedDataAtom, recordTrainingAttempt(get(persistedDataAtom), dataset, promptRegionId, isCorrect))
    set(trainingSessionAtom, {
      promptRegionId,
      answeredRegionId: regionId,
      result: isCorrect ? 'correct' : 'wrong',
    })
    set(popupStateAtom, createPopupState(regionId, position, 'training'))
  },
)
