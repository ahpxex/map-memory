/**
 * Map Memory - Training System v2
 * 
 * 完整的地图学习训练系统
 */

import { useEffect } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { MapCanvas } from './features/map/MapCanvasV2'
import { RegionPopup } from './components/RegionPopup'
import { EnhancedToolbar } from './components/EnhancedToolbar'
import { 
  persistenceReadyAtom,
  persistedTrainingDataAtom,
  replaceTrainingDataAtom,
} from './state/trainingAtoms'
import { 
  loadPersistedData, 
  savePersistedData, 
  createDefaultTrainingData,
} from './lib/storage'
import { createDefaultTrainingSettings } from './state/trainingAtoms'
import './index.css'

// 迁移旧数据
function migrateLegacyData(oldData: unknown): {
  settings: ReturnType<typeof createDefaultTrainingSettings>
  skillProgress: ReturnType<typeof createDefaultTrainingData>['progress']
  errorBook: ReturnType<typeof createDefaultTrainingData>['errorBook']
  weakItems: ReturnType<typeof createDefaultTrainingData>['weakItems']
  markedRegions: Record<string, string[]>
} | null {
  if (!oldData || typeof oldData !== 'object') return null
  
  const data = oldData as { 
    version?: number
    settings?: { 
      dataset?: string
      interactionMode?: string
      trainingMode?: string
      showLabels?: boolean
      language?: string
      scopeType?: string
      scopeValue?: string | null
      popupDensity?: string
      borderEmphasis?: string
      colorIntensity?: string
    }
    progress?: Record<string, Record<string, unknown>>
    markedRegions?: Record<string, string[]>
  }
  
  const settings = createDefaultTrainingSettings()
  
  if (data.settings) {
    settings.dataset = (data.settings.dataset as 'world' | 'china') ?? 'world'
    settings.interactionMode = (data.settings.interactionMode as 'explore' | 'training') ?? 'explore'
    settings.trainingMode = (data.settings.trainingMode as typeof settings.trainingMode) ?? 'name-to-location'
    settings.showLabels = data.settings.showLabels ?? false
    settings.language = (data.settings.language as 'zh' | 'en') ?? 'zh'
    settings.scopeType = (data.settings.scopeType as typeof settings.scopeType) ?? 'all'
    settings.scopeValue = data.settings.scopeValue ?? null
    settings.popupDensity = (data.settings.popupDensity as typeof settings.popupDensity) ?? settings.popupDensity
    settings.borderEmphasis = (data.settings.borderEmphasis as typeof settings.borderEmphasis) ?? settings.borderEmphasis
    settings.colorIntensity = (data.settings.colorIntensity as typeof settings.colorIntensity) ?? settings.colorIntensity
  }
  
  const skillProgress = createDefaultTrainingData().progress
  
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
        
        skillProgress[ds].location[regionId] = {
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
  
  return {
    settings,
    skillProgress,
    errorBook: [],
    weakItems: [],
    markedRegions: data.markedRegions ?? { world: [], china: [] },
  }
}

// Hydration Component
function HydrationBridge() {
  const replaceTrainingData = useSetAtom(replaceTrainingDataAtom)
  const setPersistenceReady = useSetAtom(persistenceReadyAtom)

  useEffect(() => {
    let cancelled = false

    // 立即使用默认设置，让 UI 先渲染
    const defaultData = createDefaultTrainingData()
    replaceTrainingData(defaultData)

    // 然后异步加载持久化数据
    loadPersistedData()
      .then(async (storedData) => {
        if (cancelled) return

        if (storedData) {
          replaceTrainingData(storedData)
        } else {
          const legacyData = localStorage.getItem('map-memory-storage')
          if (legacyData) {
            try {
              const parsed = JSON.parse(legacyData)
              const migrated = migrateLegacyData(parsed)
              if (migrated) {
                const nextData = {
                  ...defaultData,
                  settings: migrated.settings,
                  progress: migrated.skillProgress,
                  errorBook: migrated.errorBook,
                  weakItems: migrated.weakItems,
                  markedRegions: migrated.markedRegions,
                }
                replaceTrainingData(nextData)
                await savePersistedData(nextData)
              }
            } catch {
              // 忽略解析错误
            }
          }
        }
        setPersistenceReady(true)
      })
      .catch(() => {
        // 错误时使用默认设置
        if (!cancelled) {
          replaceTrainingData(defaultData)
          setPersistenceReady(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [replaceTrainingData, setPersistenceReady])

  return null
}

function PersistenceBridge() {
  const data = useAtomValue(persistedTrainingDataAtom)
  const persistenceReady = useAtomValue(persistenceReadyAtom)

  useEffect(() => {
    if (!persistenceReady) return undefined

    const timer = window.setTimeout(() => {
      void savePersistedData(data)
    }, 200)

    return () => window.clearTimeout(timer)
  }, [data, persistenceReady])

  return null
}

// Main App
function App() {
  return (
    <div className="relative h-svh w-full overflow-hidden bg-stone-100 text-stone-950">
      <HydrationBridge />
      <PersistenceBridge />
      
      {/* Map Canvas */}
      <MapCanvas />
      
      {/* Region Popup */}
      <RegionPopup />
      
      {/* Enhanced Toolbar */}
      <EnhancedToolbar />
    </div>
  )
}

export default App
