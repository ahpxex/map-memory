export type DatasetMode = 'world' | 'china'
export type InteractionMode = 'explore' | 'training'
export type TrainingMode = 'locate-from-name'
export type LanguageMode = 'zh' | 'en'
export type TrainingResult = 'idle' | 'correct' | 'wrong'

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

export type RegionProgress = {
  attempts: number
  correct: number
  wrong: number
  lastSeenAt: string | null
  lastCorrectAt: string | null
}

export type ProgressByDataset = Record<DatasetMode, Record<string, RegionProgress>>
export type MarkedRegionsByDataset = Record<DatasetMode, string[]>

export type PracticeRecordEntry = {
  regionId: string
  dataset: DatasetMode
  nameZh: string
  nameEn: string
  parentNameZh?: string | null
  parentNameEn?: string | null
  level?: string | null
  attempts: number
  correct: number
  wrong: number
  accuracy: number
  lastSeenAt: string | null
  lastCorrectAt: string | null
}

export type UserSettings = {
  dataset: DatasetMode
  interactionMode: InteractionMode
  trainingMode: TrainingMode
  language: LanguageMode
  showLabels: boolean
}

export type PersistedAppData = {
  version: 2
  settings: UserSettings
  progress: ProgressByDataset
  markedRegions: MarkedRegionsByDataset
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
  version: 2
  exportedAt: string
  data: PersistedAppData
}

export function createEmptyProgress(): ProgressByDataset {
  return {
    world: {},
    china: {},
  }
}

export function createEmptyMarkedRegions(): MarkedRegionsByDataset {
  return {
    world: [],
    china: [],
  }
}

export function createDefaultPersistedData(): PersistedAppData {
  return {
    version: 2,
    settings: {
      dataset: 'world',
      interactionMode: 'training',
      trainingMode: 'locate-from-name',
      language: 'zh',
      showLabels: false,
    },
    progress: createEmptyProgress(),
    markedRegions: createEmptyMarkedRegions(),
  }
}

function normalizeMarkedRegionList(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return Array.from(new Set(value.filter((regionId): regionId is string => typeof regionId === 'string')))
}

function hasValidSettings(candidate: Partial<PersistedAppData>) {
  return (
    !!candidate.settings &&
    !!candidate.progress &&
    typeof candidate.settings.dataset === 'string' &&
    typeof candidate.settings.interactionMode === 'string' &&
    typeof candidate.settings.trainingMode === 'string' &&
    typeof candidate.settings.language === 'string' &&
    typeof candidate.settings.showLabels === 'boolean'
  )
}

export function normalizePersistedAppData(value: unknown): PersistedAppData | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<PersistedAppData> & {
    version?: number
    markedRegions?: Partial<MarkedRegionsByDataset>
  }

  if (!hasValidSettings(candidate)) {
    return null
  }

  const settings = candidate.settings as UserSettings
  const progress = candidate.progress as ProgressByDataset

  return {
    version: 2,
    settings,
    progress,
    markedRegions: {
      world: normalizeMarkedRegionList(candidate.markedRegions?.world),
      china: normalizeMarkedRegionList(candidate.markedRegions?.china),
    },
  }
}

export function isPersistedAppData(value: unknown): value is PersistedAppData {
  return normalizePersistedAppData(value) !== null
}

export function normalizeExportSnapshot(value: unknown): ExportSnapshot | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<ExportSnapshot>
  const normalizedData = normalizePersistedAppData(candidate.data)

  if (!normalizedData || typeof candidate.exportedAt !== 'string') {
    return null
  }

  return {
    version: 2,
    exportedAt: candidate.exportedAt,
    data: normalizedData,
  }
}

export function isExportSnapshot(value: unknown): value is ExportSnapshot {
  return normalizeExportSnapshot(value) !== null
}
