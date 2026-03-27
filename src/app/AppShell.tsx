import { Suspense, lazy, startTransition, useEffect } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { BottomToolbar } from '../components/BottomToolbar'
import { loadPersistedData, savePersistedData } from '../lib/storage'
import {
  clearNoticeAtom,
  currentDatasetImplementedAtom,
  datasetAtom,
  hydratedAtom,
  interactionModeAtom,
  noticeAtom,
  persistedDataAtom,
  startNextTrainingRoundAtom,
  trainingSessionAtom,
} from '../state/appAtoms'
import { createDefaultPersistedData, isPersistedAppData } from '../types/app'

const LazyMapStage = lazy(async () => ({
  default: (await import('./MapStage')).MapStage,
}))

function HydrationBridge() {
  const persistedData = useAtomValue(persistedDataAtom)
  const hydrated = useAtomValue(hydratedAtom)
  const setPersistedData = useSetAtom(persistedDataAtom)
  const setHydrated = useSetAtom(hydratedAtom)

  useEffect(() => {
    let cancelled = false

    loadPersistedData()
      .then((storedData) => {
        if (cancelled) {
          return
        }

        setPersistedData(
          storedData && isPersistedAppData(storedData)
            ? storedData
            : createDefaultPersistedData(),
        )
        setHydrated(true)
      })
      .catch(() => {
        if (cancelled) {
          return
        }

        setPersistedData(createDefaultPersistedData())
        setHydrated(true)
      })

    return () => {
      cancelled = true
    }
  }, [setHydrated, setPersistedData])

  useEffect(() => {
    if (!hydrated) {
      return
    }

    const timer = window.setTimeout(() => {
      void savePersistedData(persistedData)
    }, 120)

    return () => {
      window.clearTimeout(timer)
    }
  }, [hydrated, persistedData])

  return null
}

export function AppShell() {
  const hydrated = useAtomValue(hydratedAtom)
  const dataset = useAtomValue(datasetAtom)
  const interactionMode = useAtomValue(interactionModeAtom)
  const trainingSession = useAtomValue(trainingSessionAtom)
  const currentDatasetImplemented = useAtomValue(currentDatasetImplementedAtom)
  const notice = useAtomValue(noticeAtom)
  const startNextTrainingRound = useSetAtom(startNextTrainingRoundAtom)
  const clearNotice = useSetAtom(clearNoticeAtom)

  useEffect(() => {
    if (!hydrated) {
      return
    }

    if (
      currentDatasetImplemented &&
      interactionMode === 'training' &&
      !trainingSession.promptRegionId
    ) {
      startTransition(() => {
        startNextTrainingRound()
      })
    }
  }, [
    currentDatasetImplemented,
    dataset,
    hydrated,
    interactionMode,
    startNextTrainingRound,
    trainingSession.promptRegionId,
  ])

  useEffect(() => {
    if (!notice) {
      return
    }

    const timer = window.setTimeout(() => {
      clearNotice()
    }, 2400)

    return () => {
      window.clearTimeout(timer)
    }
  }, [clearNotice, notice])

  return (
    <div className="relative h-svh w-full overflow-hidden bg-stone-100 text-stone-950">
      <HydrationBridge />

      <Suspense
        fallback={
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-stone-100/50 backdrop-blur-sm">
            <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-stone-600 shadow-md">
              Loading map…
            </div>
          </div>
        }
      >
        <LazyMapStage />
      </Suspense>
      <BottomToolbar />

      {!hydrated ? (
        <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-stone-100/50 backdrop-blur-sm">
          <div className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-stone-600 shadow-md">
            Loading data…
          </div>
        </div>
      ) : null}

      {notice ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-30 -translate-x-1/2">
          <div className="rounded-full border border-stone-200/60 bg-white/85 px-3.5 py-1.5 text-sm font-medium text-stone-600 shadow-md backdrop-blur-md">
            {notice}
          </div>
        </div>
      ) : null}
    </div>
  )
}
