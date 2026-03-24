import { startTransition, useEffect, useRef } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { buildExportSnapshot, downloadSnapshot } from '../lib/storage'
import {
  currentDatasetImplementedAtom,
  currentDatasetStatsAtom,
  currentPromptRegionAtom,
  datasetAtom,
  interactionModeAtom,
  languageAtom,
  persistedDataAtom,
  replacePersistedDataAtom,
  showLabelsAtom,
  startNextTrainingRoundAtom,
  trainingModeAtom,
} from '../state/appAtoms'
import { isExportSnapshot, isPersistedAppData } from '../types/app'

function segmentedButtonClasses(isActive: boolean) {
  return `rounded-full px-3 py-2 text-xs font-semibold transition ${
    isActive
      ? 'bg-stone-950 text-stone-50 shadow-[0_10px_30px_rgba(16,24,14,0.18)]'
      : 'bg-white/80 text-stone-600 hover:bg-white'
  }`
}

export function BottomToolbar() {
  const [dataset, setDataset] = useAtom(datasetAtom)
  const [interactionMode, setInteractionMode] = useAtom(interactionModeAtom)
  const [trainingMode] = useAtom(trainingModeAtom)
  const [language, setLanguage] = useAtom(languageAtom)
  const [showLabels, setShowLabels] = useAtom(showLabelsAtom)
  const persistedData = useAtomValue(persistedDataAtom)
  const currentPromptRegion = useAtomValue(currentPromptRegionAtom)
  const datasetImplemented = useAtomValue(currentDatasetImplementedAtom)
  const currentDatasetStats = useAtomValue(currentDatasetStatsAtom)
  const startNextTrainingRound = useSetAtom(startNextTrainingRoundAtom)
  const replacePersistedData = useSetAtom(replacePersistedDataAtom)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (interactionMode !== 'training') {
      return
    }

    if (!currentPromptRegion) {
      startTransition(() => {
        startNextTrainingRound()
      })
    }
  }, [currentPromptRegion, dataset, interactionMode, startNextTrainingRound])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-center px-4">
      <div className="pointer-events-auto flex w-full max-w-6xl flex-wrap items-center justify-center gap-3 rounded-[28px] border border-stone-900/10 bg-white/82 px-4 py-3 shadow-[0_24px_90px_rgba(18,24,18,0.18)] backdrop-blur-xl">
        <div className="flex items-center gap-1 rounded-full bg-stone-100/90 p-1">
          <button
            className={segmentedButtonClasses(dataset === 'world')}
            onClick={() => setDataset('world')}
            type="button"
          >
            世界国家
          </button>
          <button
            className={segmentedButtonClasses(dataset === 'china')}
            onClick={() => setDataset('china')}
            type="button"
          >
            中国地级市/州
          </button>
        </div>

        <div className="flex items-center gap-1 rounded-full bg-stone-100/90 p-1">
          <button
            className={segmentedButtonClasses(interactionMode === 'explore')}
            onClick={() => setInteractionMode('explore')}
            type="button"
          >
            探索
          </button>
          <button
            className={segmentedButtonClasses(interactionMode === 'training')}
            onClick={() => setInteractionMode('training')}
            type="button"
          >
            训练
          </button>
        </div>

        <button
          className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
            showLabels
              ? 'bg-emerald-700 text-emerald-50'
              : 'bg-stone-100/90 text-stone-600 hover:bg-white'
          }`}
          onClick={() => setShowLabels(!showLabels)}
          type="button"
        >
          {showLabels ? 'Labels on' : 'Labels off'}
        </button>

        <div className="flex items-center gap-1 rounded-full bg-stone-100/90 p-1">
          <button
            className={segmentedButtonClasses(language === 'zh')}
            onClick={() => setLanguage('zh')}
            type="button"
          >
            中文
          </button>
          <button
            className={segmentedButtonClasses(language === 'en')}
            onClick={() => setLanguage('en')}
            type="button"
          >
            EN
          </button>
        </div>

        {interactionMode === 'training' && datasetImplemented ? (
          <div className="rounded-full bg-amber-100 px-4 py-2 text-xs font-semibold text-amber-900">
            {trainingMode === 'locate-from-name' && currentPromptRegion
              ? `${
                  language === 'en' ? 'Find' : '找到'
                }: ${language === 'en' ? currentPromptRegion.nameEn : currentPromptRegion.nameZh}`
              : '训练问题生成中'}
          </div>
        ) : null}

        <div className="rounded-full bg-stone-100/90 px-4 py-2 text-xs font-semibold text-stone-700">
          {currentDatasetStats.practicedRegions}/{currentDatasetStats.totalRegions} practiced
          · {currentDatasetStats.accuracy}% accuracy
        </div>

        <div className="flex items-center gap-2">
          <button
            className="rounded-full bg-stone-950 px-4 py-2 text-xs font-semibold text-stone-50 transition hover:-translate-y-0.5 hover:bg-stone-800"
            onClick={() => {
              const snapshot = buildExportSnapshot(persistedData)
              const filename = `map-memory-${snapshot.exportedAt.slice(0, 10)}.json`
              downloadSnapshot(filename, snapshot)
            }}
            type="button"
          >
            导出数据
          </button>

          <button
            className="rounded-full bg-white px-4 py-2 text-xs font-semibold text-stone-700 transition hover:-translate-y-0.5 hover:bg-stone-50"
            onClick={() => importInputRef.current?.click()}
            type="button"
          >
            导入数据
          </button>

          <input
            accept="application/json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0]

              if (!file) {
                return
              }

              try {
                const text = await file.text()
                const parsed = JSON.parse(text)
                const importedData = isExportSnapshot(parsed)
                  ? parsed.data
                  : isPersistedAppData(parsed)
                    ? parsed
                    : null

                if (!importedData) {
                  window.alert('This file is not a valid map-memory export.')
                  event.target.value = ''
                  return
                }

                const confirmed = window.confirm(
                  'Importing will replace the current local training data. Continue?',
                )

                if (!confirmed) {
                  event.target.value = ''
                  return
                }

                startTransition(() => {
                  replacePersistedData(importedData)
                })
              } catch {
                window.alert('Import failed. The selected file is not valid JSON.')
                event.target.value = ''
                return
              }
              event.target.value = ''
            }}
            ref={importInputRef}
            type="file"
          />
        </div>
      </div>
    </div>
  )
}
