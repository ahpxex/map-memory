import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { buildExportSnapshot, downloadSnapshot } from '../lib/storage'
import {
  currentDatasetImplementedAtom,
  currentDatasetPracticeEntriesAtom,
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

const journalTimeFormatter = new Intl.DateTimeFormat('zh-CN', {
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
})

function segmentedButtonClasses(isActive: boolean) {
  return `rounded-full px-3 py-2 text-xs font-semibold transition ${
    isActive
      ? 'bg-stone-950 text-stone-50 shadow-[0_10px_30px_rgba(16,24,14,0.18)]'
      : 'bg-white/80 text-stone-600 hover:bg-white'
  }`
}

function recordToneClasses(accuracy: number) {
  if (accuracy >= 85) {
    return 'bg-emerald-100 text-emerald-900'
  }

  if (accuracy >= 55) {
    return 'bg-amber-100 text-amber-900'
  }

  return 'bg-rose-100 text-rose-900'
}

function formatPracticeTime(value: string | null) {
  if (!value) {
    return '未记录'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '未记录'
  }

  return journalTimeFormatter.format(date).replace(',', ' ')
}

export function BottomToolbar() {
  const [recordsPanelOpen, setRecordsPanelOpen] = useState(false)
  const [dataset, setDataset] = useAtom(datasetAtom)
  const [interactionMode, setInteractionMode] = useAtom(interactionModeAtom)
  const [trainingMode] = useAtom(trainingModeAtom)
  const [language, setLanguage] = useAtom(languageAtom)
  const [showLabels, setShowLabels] = useAtom(showLabelsAtom)
  const persistedData = useAtomValue(persistedDataAtom)
  const currentPromptRegion = useAtomValue(currentPromptRegionAtom)
  const datasetImplemented = useAtomValue(currentDatasetImplementedAtom)
  const practiceEntries = useAtomValue(currentDatasetPracticeEntriesAtom)
  const currentDatasetStats = useAtomValue(currentDatasetStatsAtom)
  const startNextTrainingRound = useSetAtom(startNextTrainingRoundAtom)
  const replacePersistedData = useSetAtom(replacePersistedDataAtom)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const deferredPracticeEntries = useDeferredValue(practiceEntries)

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
      <div className="relative w-full max-w-6xl">
        <div
          className={`absolute inset-x-0 bottom-full mb-3 flex justify-center transition-all duration-200 ${
            recordsPanelOpen
              ? 'pointer-events-auto translate-y-0 opacity-100'
              : 'pointer-events-none translate-y-4 opacity-0'
          }`}
        >
          <section className="w-full max-w-5xl rounded-[32px] border border-stone-900/10 bg-white/92 p-4 shadow-[0_26px_90px_rgba(18,24,18,0.2)] backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-stone-500">
                  Practice Records
                </p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-stone-950">
                  {dataset === 'world' ? '世界国家练习记录' : '中国地级市/州练习记录'}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-stone-600">
                <div className="rounded-full bg-stone-100 px-3 py-2">
                  已练习 {currentDatasetStats.practicedRegions} / {currentDatasetStats.totalRegions}
                </div>
                <div className="rounded-full bg-stone-100 px-3 py-2">
                  总准确率 {currentDatasetStats.accuracy}%
                </div>
              </div>
            </div>

            {deferredPracticeEntries.length > 0 ? (
              <div className="mt-4 max-h-[min(52svh,30rem)] overflow-y-auto pr-1">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {deferredPracticeEntries.map((entry) => {
                    const title = language === 'en' ? entry.nameEn : entry.nameZh
                    const subtitle = language === 'en' ? entry.nameZh : entry.nameEn
                    const parentName =
                      language === 'en'
                        ? entry.parentNameEn ?? entry.parentNameZh
                        : entry.parentNameZh ?? entry.parentNameEn

                    return (
                      <article
                        className="rounded-[24px] border border-stone-900/10 bg-stone-50/90 p-4"
                        key={entry.regionId}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-base font-semibold tracking-tight text-stone-950">
                              {title}
                            </h4>
                            <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
                          </div>

                          <div
                            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold ${recordToneClasses(
                              entry.accuracy,
                            )}`}
                          >
                            {entry.accuracy}%
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-stone-500">
                          {parentName ? (
                            <span className="rounded-full bg-white px-2.5 py-1">
                              {parentName}
                            </span>
                          ) : null}
                          {entry.level ? (
                            <span className="rounded-full bg-white px-2.5 py-1">
                              {entry.level}
                            </span>
                          ) : null}
                        </div>

                        <dl className="mt-4 grid grid-cols-3 gap-2 text-sm text-stone-700">
                          <div className="rounded-2xl bg-white px-3 py-2">
                            <dt className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                              Attempts
                            </dt>
                            <dd className="mt-1 font-semibold text-stone-950">{entry.attempts}</dd>
                          </div>
                          <div className="rounded-2xl bg-white px-3 py-2">
                            <dt className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                              Correct
                            </dt>
                            <dd className="mt-1 font-semibold text-stone-950">{entry.correct}</dd>
                          </div>
                          <div className="rounded-2xl bg-white px-3 py-2">
                            <dt className="text-[11px] uppercase tracking-[0.16em] text-stone-500">
                              Wrong
                            </dt>
                            <dd className="mt-1 font-semibold text-stone-950">{entry.wrong}</dd>
                          </div>
                        </dl>

                        <p className="mt-3 text-xs text-stone-500">
                          最近练习 {formatPracticeTime(entry.lastSeenAt)}
                        </p>
                      </article>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-[24px] bg-stone-50 px-4 py-5 text-sm text-stone-500">
                这个数据集还没有练习记录。先做几道题，再回来回看。
              </div>
            )}
          </section>
        </div>

        <div className="pointer-events-auto flex w-full flex-wrap items-center justify-center gap-3 rounded-[28px] border border-stone-900/10 bg-white/82 px-4 py-3 shadow-[0_24px_90px_rgba(18,24,18,0.18)] backdrop-blur-xl">
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

        <button
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
            recordsPanelOpen
              ? 'bg-stone-950 text-stone-50 shadow-[0_10px_30px_rgba(16,24,14,0.18)]'
              : 'bg-stone-100/90 text-stone-700 hover:bg-white'
          }`}
          onClick={() => setRecordsPanelOpen((currentValue) => !currentValue)}
          type="button"
        >
          {recordsPanelOpen ? '收起记录' : `练习记录 ${currentDatasetStats.practicedRegions}`}
        </button>

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
    </div>
  )
}
