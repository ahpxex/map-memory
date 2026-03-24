export type DatasetMode = 'world' | 'china'
export type InteractionMode = 'explore' | 'training'
export type TrainingMode = 'locate-from-name'
export type LanguageMode = 'zh' | 'en'
export type TrainingResult = 'idle' | 'correct' | 'wrong'

export type RegionMeta = {
  id: string
  isoA2: string | null
  isoA3: string | null
  nameEn: string
  nameZh: string
  formalNameEn: string
  continent: string | null
  regionUn: string | null
  subregion: string | null
  population: number | null
  wikidataId: string | null
}

export type RegionProgress = {
  attempts: number
  correct: number
  wrong: number
  lastSeenAt: string | null
  lastCorrectAt: string | null
}

export type ProgressByDataset = Record<DatasetMode, Record<string, RegionProgress>>

export type UserSettings = {
  dataset: DatasetMode
  interactionMode: InteractionMode
  trainingMode: TrainingMode
  language: LanguageMode
  showLabels: boolean
}

export type PersistedAppData = {
  version: 1
  settings: UserSettings
  progress: ProgressByDataset
}

export type PopupPosition = {
  x: number
  y: number
}

export type PopupState = PopupPosition & {
  kind: 'explore' | 'training'
  regionId: string
}

export type TrainingSession = {
  promptRegionId: string | null
  answeredRegionId: string | null
  result: TrainingResult
}

export type ExportSnapshot = {
  version: 1
  exportedAt: string
  data: PersistedAppData
}

export function createEmptyProgress(): ProgressByDataset {
  return {
    world: {},
    china: {},
  }
}

export function createDefaultPersistedData(): PersistedAppData {
  return {
    version: 1,
    settings: {
      dataset: 'world',
      interactionMode: 'training',
      trainingMode: 'locate-from-name',
      language: 'zh',
      showLabels: false,
    },
    progress: createEmptyProgress(),
  }
}

export function isPersistedAppData(value: unknown): value is PersistedAppData {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<PersistedAppData>

  return (
    candidate.version === 1 &&
    !!candidate.settings &&
    !!candidate.progress &&
    typeof candidate.settings.dataset === 'string' &&
    typeof candidate.settings.interactionMode === 'string' &&
    typeof candidate.settings.trainingMode === 'string' &&
    typeof candidate.settings.language === 'string' &&
    typeof candidate.settings.showLabels === 'boolean'
  )
}

export function isExportSnapshot(value: unknown): value is ExportSnapshot {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<ExportSnapshot>

  return (
    candidate.version === 1 &&
    typeof candidate.exportedAt === 'string' &&
    isPersistedAppData(candidate.data)
  )
}
