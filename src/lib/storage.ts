/**
 * Storage Module
 * 
 * 支持 Training System v2 的数据持久化
 */

import { openDB } from 'idb'
import type { 
  PersistedTrainingData,
  ExportTrainingSnapshot,
  TrainingSettings,
  Skill,
  AppLanguage,
  BorderEmphasis,
  ColorIntensity,
  PopupDensity,
} from '../types/training'

const DB_NAME = 'map-memory'
const STORE_NAME = 'app-v2'
const DATA_KEY = 'training-data'

const dbPromise = openDB(DB_NAME, 2, {
  upgrade(database) {
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME)
    }
    if (!database.objectStoreNames.contains('app')) {
      database.createObjectStore('app')
    }
  },
})

// 默认训练设置
function createDefaultTrainingSettings(): TrainingSettings {
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
    popupDensity: 'adaptive',
    borderEmphasis: 'soft',
    colorIntensity: 'normal',
  }
}

// 创建空技能进度 - 包含所有可能的 skill
function createEmptyDatasetSkillProgress(): Record<Skill, Record<string, { attempts: number; correct: number; wrong: number; lastSeenAt: string | null; lastCorrectAt: string | null; streak: number; masteryScore: number }>> {
  const emptySkill = {}
  return {
    location: emptySkill,
    shape_name: emptySkill,
    flag: emptySkill,
    capital: emptySkill,
    continent: emptySkill,
    subregion: emptySkill,
    neighbors: emptySkill,
    province_affiliation: emptySkill,
    province_children: emptySkill,
    provincial_capital: emptySkill,
  } as Record<Skill, Record<string, { attempts: number; correct: number; wrong: number; lastSeenAt: string | null; lastCorrectAt: string | null; streak: number; masteryScore: number }>>
}

// 创建默认数据
export function createDefaultTrainingData(): PersistedTrainingData {
  return {
    version: 4,
    settings: createDefaultTrainingSettings(),
    progress: {
      world: createEmptyDatasetSkillProgress(),
      china: createEmptyDatasetSkillProgress(),
    },
    errorBook: [],
    weakItems: [],
    markedRegions: {
      world: [],
      china: [],
    },
  }
}

// 从旧格式迁移
function migrateFromV2(oldData: unknown): PersistedTrainingData | null {
  if (!oldData || typeof oldData !== 'object') return null
  
  const data = oldData as {
    settings?: Record<string, unknown>
    progress?: Record<string, Record<string, unknown>>
    markedRegions?: Record<string, string[]>
  }
  
  const newData = createDefaultTrainingData()
  
  if (data.settings) {
    newData.settings = {
      ...newData.settings,
      dataset: (data.settings.dataset as 'world' | 'china') ?? 'world',
      interactionMode: (data.settings.interactionMode as 'explore' | 'training') ?? 'explore',
      trainingMode: (data.settings.trainingMode as TrainingSettings['trainingMode']) ?? 'name-to-location',
      language: normalizeLanguage(data.settings.language),
      showLabels: (data.settings.showLabels as boolean) ?? false,
      scopeType: (data.settings.scopeType as TrainingSettings['scopeType']) ?? 'all',
      scopeValue: (data.settings.scopeValue as string | null) ?? null,
      popupDensity: 'adaptive',
      borderEmphasis: 'soft',
      colorIntensity: 'normal',
    }
  }
  
  // 迁移进度数据
  if (data.progress) {
    for (const [dataset, regions] of Object.entries(data.progress)) {
      if (typeof regions !== 'object' || regions === null) continue
      if (!['world', 'china'].includes(dataset)) continue
      
      const ds = dataset as 'world' | 'china'
      
      for (const [regionId, progress] of Object.entries(regions)) {
        if (typeof progress !== 'object' || progress === null) continue
        const p = progress as {
          attempts?: number
          correct?: number
          wrong?: number
          lastSeenAt?: string
          lastCorrectAt?: string
        }
        
        // 迁移到 location skill
        newData.progress[ds].location[regionId] = {
          attempts: p.attempts ?? 0,
          correct: p.correct ?? 0,
          wrong: p.wrong ?? 0,
          lastSeenAt: p.lastSeenAt ?? null,
          lastCorrectAt: p.lastCorrectAt ?? null,
          streak: 0,
          masteryScore: p.attempts ? Math.round(((p.correct ?? 0) / p.attempts) * 100) : 0,
        }
      }
    }
  }
  
  if (data.markedRegions) {
    newData.markedRegions = {
      world: data.markedRegions.world ?? [],
      china: data.markedRegions.china ?? [],
    }
  }
  
  return newData
}

// 验证数据结构
export function normalizeTrainingData(value: unknown): PersistedTrainingData | null {
  if (!value || typeof value !== 'object') {
    return migrateFromV2(value)
  }
  
  const candidate = value as Partial<PersistedTrainingData>
  
  if (!candidate.settings || !candidate.progress) {
    const migrated = migrateFromV2(value)
    if (migrated) return migrated
    return null
  }
  
  if (candidate.version !== 3 && candidate.version !== 4) {
    const migrated = migrateFromV2(value)
    if (migrated) return migrated
    return null
  }

  return {
    ...candidate,
    version: 4,
    settings: normalizeTrainingSettings(candidate.settings),
  } as PersistedTrainingData
}

// 加载数据
export async function loadPersistedData(): Promise<PersistedTrainingData | undefined> {
  try {
    const database = await dbPromise
    
    const newData = await database.get(STORE_NAME, DATA_KEY) as PersistedTrainingData | undefined
    if (newData) {
      const normalized = normalizeTrainingData(newData)
      if (normalized) return normalized
    }
    
    const oldData = await database.get('app', 'persisted-data')
    if (oldData) {
      const migrated = migrateFromV2(oldData)
      if (migrated) {
        await database.put(STORE_NAME, migrated, DATA_KEY)
        return migrated
      }
    }
    
    return undefined
  } catch (error) {
    console.error('Failed to load persisted data:', error)
    return undefined
  }
}

// 保存数据
export async function savePersistedData(data: PersistedTrainingData): Promise<void> {
  try {
    const database = await dbPromise
    await database.put(STORE_NAME, data, DATA_KEY)
  } catch (error) {
    console.error('Failed to save persisted data:', error)
  }
}

// 创建导出快照
export function buildExportSnapshot(data: PersistedTrainingData): ExportTrainingSnapshot {
  return {
    version: 4,
    exportedAt: new Date().toISOString(),
    data,
  }
}

// 验证导入快照
export function normalizeExportSnapshot(value: unknown): ExportTrainingSnapshot | null {
  if (!value || typeof value !== 'object') return null
  
  const candidate = value as Partial<ExportTrainingSnapshot>
  if ((candidate.version !== 3 && candidate.version !== 4) || !candidate.exportedAt || !candidate.data) {
    return null
  }
  
  const normalizedData = normalizeTrainingData(candidate.data)
  if (!normalizedData) return null
  
  return {
    version: 4,
    exportedAt: candidate.exportedAt,
    data: normalizedData,
  }
}

// 下载快照
export function downloadSnapshot(filename: string, snapshot: ExportTrainingSnapshot) {
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  
  link.href = url
  link.download = filename
  link.click()
  
  URL.revokeObjectURL(url)
}

function normalizeLanguage(value: unknown): AppLanguage {
  return value === 'en' || value === 'mixed' ? value : 'zh'
}

function normalizePopupDensity(value: unknown): PopupDensity {
  return value === 'compact' || value === 'rich' ? value : 'adaptive'
}

function normalizeBorderEmphasis(value: unknown): BorderEmphasis {
  return value === 'strong' ? 'strong' : 'soft'
}

function normalizeColorIntensity(value: unknown): ColorIntensity {
  return value === 'soft' || value === 'vivid' ? value : 'normal'
}

function normalizeTrainingSettings(settings: unknown): TrainingSettings {
  const defaults = createDefaultTrainingSettings()
  if (!settings || typeof settings !== 'object') return defaults

  const candidate = settings as Partial<TrainingSettings>
  return {
    ...defaults,
    ...candidate,
    language: normalizeLanguage(candidate.language),
    popupDensity: normalizePopupDensity(candidate.popupDensity),
    borderEmphasis: normalizeBorderEmphasis(candidate.borderEmphasis),
    colorIntensity: normalizeColorIntensity(candidate.colorIntensity),
  }
}
