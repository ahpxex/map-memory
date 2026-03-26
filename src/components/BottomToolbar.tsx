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

function formatPracticeTime(value: string | null) {
  if (!value) return '未记录'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '未记录'
  return journalTimeFormatter.format(date).replace(',', ' ')
}

// Icons
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="1 6 1 22 8 18 16 22 21 18 21 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  )
}

function CompassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  )
}

function GraduationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  )
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  )
}

function TagOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
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
    if (interactionMode !== 'training') return
    if (!currentPromptRegion) {
      startTransition(() => {
        startNextTrainingRound()
      })
    }
  }, [currentPromptRegion, dataset, interactionMode, startNextTrainingRound])

  // Training prompt banner
  const trainingBanner = interactionMode === 'training' && datasetImplemented && (
    <div className="pointer-events-auto mb-3 flex justify-center">
      <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-amber-100 px-5 py-3 shadow-lg">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500 text-white">
          <CompassIcon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
            {trainingMode === 'locate-from-name' ? '找到指定区域' : '训练模式'}
          </p>
          <p className="text-sm font-semibold text-amber-900">
            {currentPromptRegion
              ? language === 'en' ? currentPromptRegion.nameEn : currentPromptRegion.nameZh
              : '准备中...'}
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center px-4 pb-5">
      {/* Training Prompt Banner */}
      {trainingBanner}

      {/* Records Panel */}
      <div
        className={`pointer-events-auto w-full max-w-5xl transition-all duration-300 ${
          recordsPanelOpen
            ? 'mb-4 translate-y-0 opacity-100'
            : 'pointer-events-none mb-0 translate-y-8 opacity-0'
        }`}
      >
        <div className="rounded-3xl border border-stone-200 bg-white/95 p-5 shadow-2xl backdrop-blur-xl">
          {/* Panel Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-stone-600">
                <HistoryIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-stone-900">
                  {dataset === 'world' ? '世界国家' : '中国地级市/州'}练习记录
                </h3>
                <p className="text-xs text-stone-500">
                  已练习 {currentDatasetStats.practicedRegions} / {currentDatasetStats.totalRegions} · 准确率 {currentDatasetStats.accuracy}%
                </p>
              </div>
            </div>
            <button
              onClick={() => setRecordsPanelOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Records Grid */}
          {deferredPracticeEntries.length > 0 ? (
            <div className="max-h-[min(50vh,28rem)] overflow-y-auto pr-1">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {deferredPracticeEntries.map((entry) => {
                  const title = language === 'en' ? entry.nameEn : entry.nameZh
                  const subtitle = language === 'en' ? entry.nameZh : entry.nameEn
                  const parentName =
                    language === 'en'
                      ? entry.parentNameEn ?? entry.parentNameZh
                      : entry.parentNameZh ?? entry.parentNameEn

                  const accuracyColor =
                    entry.accuracy >= 85 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' :
                    entry.accuracy >= 55 ? 'text-amber-600 bg-amber-50 border-amber-200' :
                    'text-rose-600 bg-rose-50 border-rose-200'

                  return (
                    <div
                      key={entry.regionId}
                      className="rounded-2xl border border-stone-100 bg-stone-50/80 p-4 transition hover:border-stone-200 hover:bg-stone-50"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h4 className="truncate text-sm font-semibold text-stone-900">{title}</h4>
                          <p className="truncate text-xs text-stone-500">{subtitle}</p>
                        </div>
                        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-bold ${accuracyColor}`}>
                          {entry.accuracy}%
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {parentName && (
                          <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-stone-500 shadow-sm">
                            {parentName}
                          </span>
                        )}
                        {entry.level && (
                          <span className="rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-stone-500 shadow-sm">
                            {entry.level}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <div className="rounded-xl bg-white p-2 text-center shadow-sm">
                          <p className="text-[10px] font-medium text-stone-400">练习</p>
                          <p className="text-sm font-semibold text-stone-700">{entry.attempts}</p>
                        </div>
                        <div className="rounded-xl bg-white p-2 text-center shadow-sm">
                          <p className="text-[10px] font-medium text-emerald-500">正确</p>
                          <p className="text-sm font-semibold text-emerald-600">{entry.correct}</p>
                        </div>
                        <div className="rounded-xl bg-white p-2 text-center shadow-sm">
                          <p className="text-[10px] font-medium text-rose-400">错误</p>
                          <p className="text-sm font-semibold text-rose-500">{entry.wrong}</p>
                        </div>
                      </div>

                      <p className="mt-2 text-[10px] text-stone-400">
                        最近练习 {formatPracticeTime(entry.lastSeenAt)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-stone-50 py-8 text-center">
              <HistoryIcon className="mx-auto h-8 w-8 text-stone-300" />
              <p className="mt-2 text-sm text-stone-500">还没有练习记录</p>
              <p className="text-xs text-stone-400">开始练习后，这里会显示你的进度</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Toolbar */}
      <div className="pointer-events-auto flex w-full max-w-6xl items-center justify-center">
        <div className="flex items-center gap-2 rounded-2xl border border-stone-200/80 bg-white/90 p-2 shadow-xl backdrop-blur-xl">
          
          {/* Dataset Selector */}
          <div className="flex items-center gap-1 rounded-xl bg-stone-100/80 p-1">
            <button
              onClick={() => setDataset('world')}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                dataset === 'world'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <GlobeIcon className="h-3.5 w-3.5" />
              世界
            </button>
            <button
              onClick={() => setDataset('china')}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                dataset === 'china'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              中国
            </button>
          </div>

          <div className="h-6 w-px bg-stone-200" />

          {/* Mode Selector */}
          <div className="flex items-center gap-1 rounded-xl bg-stone-100/80 p-1">
            <button
              onClick={() => setInteractionMode('explore')}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                interactionMode === 'explore'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <CompassIcon className="h-3.5 w-3.5" />
              探索
            </button>
            <button
              onClick={() => setInteractionMode('training')}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
                interactionMode === 'training'
                  ? 'bg-stone-900 text-white shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <GraduationIcon className="h-3.5 w-3.5" />
              训练
            </button>
          </div>

          <div className="h-6 w-px bg-stone-200" />

          {/* Labels Toggle */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
              showLabels
                ? 'bg-emerald-100 text-emerald-700'
                : 'text-stone-500 hover:bg-stone-100'
            }`}
          >
            {showLabels ? <TagIcon className="h-3.5 w-3.5" /> : <TagOffIcon className="h-3.5 w-3.5" />}
            标签
          </button>

          <div className="h-6 w-px bg-stone-200" />

          {/* Language Toggle */}
          <div className="flex items-center rounded-lg bg-stone-100/80 p-0.5">
            <button
              onClick={() => setLanguage('zh')}
              className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition ${
                language === 'zh'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              中
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition ${
                language === 'en'
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              EN
            </button>
          </div>

          <div className="h-6 w-px bg-stone-200" />

          {/* Stats */}
          <div className="flex items-center gap-3 px-2">
            <div className="flex items-center gap-1.5 text-xs">
              <CheckIcon className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-semibold text-stone-700">{currentDatasetStats.practicedRegions}</span>
              <span className="text-stone-400">/</span>
              <span className="text-stone-500">{currentDatasetStats.totalRegions}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-semibold text-stone-700">{currentDatasetStats.accuracy}%</span>
              <span className="text-stone-400">准确率</span>
            </div>
          </div>

          <div className="h-6 w-px bg-stone-200" />

          {/* Records Button */}
          <button
            onClick={() => setRecordsPanelOpen(!recordsPanelOpen)}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition ${
              recordsPanelOpen
                ? 'bg-stone-900 text-white'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            <HistoryIcon className="h-3.5 w-3.5" />
            记录
            {currentDatasetStats.practicedRegions > 0 && (
              <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-stone-200 px-1 text-[10px] font-bold text-stone-700">
                {currentDatasetStats.practicedRegions}
              </span>
            )}
          </button>

          <div className="h-6 w-px bg-stone-200" />

          {/* Data Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                const snapshot = buildExportSnapshot(persistedData)
                const filename = `map-memory-${snapshot.exportedAt.slice(0, 10)}.json`
                downloadSnapshot(filename, snapshot)
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
              title="导出数据"
            >
              <DownloadIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
              title="导入数据"
            >
              <UploadIcon className="h-4 w-4" />
            </button>
          </div>

          <input
            accept="application/json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return

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
                  '导入将替换当前的本地训练数据，是否继续？',
                )

                if (!confirmed) {
                  event.target.value = ''
                  return
                }

                startTransition(() => {
                  replacePersistedData(importedData)
                })
              } catch {
                window.alert('导入失败，文件格式无效。')
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
