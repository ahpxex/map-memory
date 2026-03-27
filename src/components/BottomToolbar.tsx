import { startTransition, useDeferredValue, useEffect, useRef, useState } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { buildExportSnapshot, downloadSnapshot } from '../lib/storage'
import { t, type Language } from '../lib/i18n'
import { Tooltip } from './Tooltip'
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
import { normalizeExportSnapshot, normalizePersistedAppData } from '../types/app'

const journalTimeFormatter: Record<Language, Intl.DateTimeFormat> = {
  zh: new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }),
  en: new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }),
}

function formatPracticeTime(value: string | null, lang: Language) {
  if (!value) return lang === 'zh' ? '未记录' : 'Never'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return lang === 'zh' ? '未记录' : 'Never'
  return journalTimeFormatter[lang].format(date)
}

// Minimalist Icons - thin stroke, simple shapes
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

function MapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6z" />
      <path d="M9 3v15" />
      <path d="M15 6v15" />
    </svg>
  )
}

function CompassIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
    </svg>
  )
}

function GraduationIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  )
}

function TagIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M7 7h.01M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    </svg>
  )
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  )
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
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

  // Training prompt - minimalist floating pill
  const trainingBanner = interactionMode === 'training' && datasetImplemented && (
    <div className="pointer-events-auto mb-4 flex justify-center">
      <div className="group flex items-center gap-3 rounded-full border border-stone-200 bg-white/90 px-5 py-2.5 shadow-lg backdrop-blur-md transition-all hover:shadow-xl">
        <TargetIcon className="h-4 w-4 text-stone-400 group-hover:text-stone-600" />
        <div className="flex items-baseline gap-2">
          <span className="text-xs text-stone-400">
            {trainingMode === 'locate-from-name' ? t('find', language) : t('trainingPrompt', language)}
          </span>
          <span className="text-sm font-medium text-stone-800">
            {currentPromptRegion
              ? language === 'en' ? currentPromptRegion.nameEn : currentPromptRegion.nameZh
              : t('preparing', language)}
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center px-4 pb-6">
      {/* Training Prompt */}
      {trainingBanner}

      {/* Records Panel */}
      <div
        className={`pointer-events-auto w-full max-w-2xl transition-all duration-300 ease-out ${
          recordsPanelOpen
            ? 'mb-4 translate-y-0 opacity-100'
            : 'pointer-events-none mb-0 translate-y-4 opacity-0'
        }`}
      >
        <div className="rounded-2xl border border-stone-200/60 bg-white/85 p-4 shadow-lg backdrop-blur-xl">
          {/* Panel Header */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <HistoryIcon className="h-4 w-4 text-stone-400" />
              <div>
                <h3 className="text-sm font-medium text-stone-700">
                  {dataset === 'world' 
                    ? (language === 'zh' ? '世界国家' : 'World Countries')
                    : (language === 'zh' ? '中国地级市/州' : 'China Cities/Prefectures')
                  }
                </h3>
                <p className="text-[11px] text-stone-400">
                  {currentDatasetStats.practicedRegions} / {currentDatasetStats.totalRegions} · {currentDatasetStats.accuracy}%
                </p>
              </div>
            </div>
            <button
              onClick={() => setRecordsPanelOpen(false)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-stone-300 transition hover:bg-stone-100 hover:text-stone-500"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Records */}
          {deferredPracticeEntries.length > 0 ? (
            <div className="max-h-[min(40vh,20rem)] overflow-y-auto pr-1">
              <div className="space-y-1.5">
                {deferredPracticeEntries.map((entry) => {
                  const title = language === 'en' ? entry.nameEn : entry.nameZh
                  const subtitle = language === 'en' ? entry.nameZh : entry.nameEn
                  const parentName =
                    language === 'en'
                      ? entry.parentNameEn ?? entry.parentNameZh
                      : entry.parentNameZh ?? entry.parentNameEn

                  return (
                    <div
                      key={entry.regionId}
                      className="flex items-center justify-between rounded-xl border border-stone-100 bg-stone-50/40 px-3 py-2.5 transition hover:border-stone-200 hover:bg-stone-50/60"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-stone-700">{title}</span>
                          {parentName && (
                            <span className="shrink-0 text-xs text-stone-400">· {parentName}</span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-stone-400">
                          <span>{subtitle}</span>
                          <span>·</span>
                          <span>{formatPracticeTime(entry.lastSeenAt, language)}</span>
                        </div>
                      </div>
                      <div className="ml-3 flex items-center gap-2.5 text-xs">
                        <span className="text-stone-400">{entry.attempts}</span>
                        <span className={`font-medium ${
                          entry.accuracy >= 85 ? 'text-emerald-600' :
                          entry.accuracy >= 55 ? 'text-amber-600' :
                          'text-rose-500'
                        }`}>
                          {entry.accuracy}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-sm text-stone-400">{t('noRecords', language)}</p>
              <p className="mt-1 text-xs text-stone-300">{t('startPracticing', language)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Toolbar - Minimalist */}
      <div className="pointer-events-auto">
        <div className="flex items-center gap-1 rounded-full border border-stone-200/60 bg-white/80 px-2 py-1.5 shadow-lg backdrop-blur-xl">
          
          {/* Dataset */}
          <Tooltip content={t('world', language)}>
            <button
              onClick={() => setDataset('world')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                dataset === 'world'
                  ? 'bg-stone-800 text-white'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <GlobeIcon className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip content={t('china', language)}>
            <button
              onClick={() => setDataset('china')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                dataset === 'china'
                  ? 'bg-stone-800 text-white'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <MapIcon className="h-4 w-4" />
            </button>
          </Tooltip>

          <div className="mx-1 h-4 w-px bg-stone-200" />

          {/* Mode */}
          <Tooltip content={t('explore', language)}>
            <button
              onClick={() => setInteractionMode('explore')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                interactionMode === 'explore'
                  ? 'bg-stone-100 text-stone-800'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <CompassIcon className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip content={t('training', language)}>
            <button
              onClick={() => setInteractionMode('training')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                interactionMode === 'training'
                  ? 'bg-stone-800 text-white'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <GraduationIcon className="h-4 w-4" />
            </button>
          </Tooltip>

          <div className="mx-1 h-4 w-px bg-stone-200" />

          {/* Labels */}
          <Tooltip content={showLabels ? t('labelsOn', language) : t('labelsOff', language)}>
            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                showLabels
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <TagIcon className="h-4 w-4" />
            </button>
          </Tooltip>

          {/* Language */}
          <Tooltip content={language === 'zh' ? t('switchToEn', language) : t('switchToZh', language)}>
            <button
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
              className="flex h-8 items-center justify-center rounded-full px-2.5 text-xs font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
            >
              {language === 'zh' ? '中' : 'EN'}
            </button>
          </Tooltip>

          <div className="mx-1 h-4 w-px bg-stone-200" />

          {/* Stats - minimal */}
          <Tooltip content={`${t('practiced', language)} / ${t('accuracy', language)}`}>
            <div className="flex items-center gap-3 px-2 text-xs text-stone-500">
              <span>{currentDatasetStats.practicedRegions}/{currentDatasetStats.totalRegions}</span>
              <span className="text-stone-300">·</span>
              <span>{currentDatasetStats.accuracy}%</span>
            </div>
          </Tooltip>

          <div className="mx-1 h-4 w-px bg-stone-200" />

          {/* Records */}
          <Tooltip content={t('records', language)}>
            <button
              onClick={() => setRecordsPanelOpen(!recordsPanelOpen)}
              className={`flex h-8 items-center gap-1.5 rounded-full px-3 transition ${
                recordsPanelOpen
                  ? 'bg-stone-800 text-white'
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
              }`}
            >
              <HistoryIcon className="h-3.5 w-3.5" />
              <span className="text-xs">{t('records', language)}</span>
              {currentDatasetStats.practicedRegions > 0 && (
                <span className={`ml-0.5 text-[10px] ${recordsPanelOpen ? 'text-stone-300' : 'text-stone-400'}`}>
                  {currentDatasetStats.practicedRegions}
                </span>
              )}
            </button>
          </Tooltip>

          <div className="mx-1 h-4 w-px bg-stone-200" />

          {/* Data */}
          <Tooltip content={t('export', language)}>
            <button
              onClick={() => {
                const snapshot = buildExportSnapshot(persistedData)
                const filename = `map-memory-${snapshot.exportedAt.slice(0, 10)}.json`
                downloadSnapshot(filename, snapshot)
              }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition hover:text-stone-600"
            >
              <DownloadIcon className="h-4 w-4" />
            </button>
          </Tooltip>
          <Tooltip content={t('import', language)}>
            <button
              onClick={() => importInputRef.current?.click()}
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition hover:text-stone-600"
            >
              <UploadIcon className="h-4 w-4" />
            </button>
          </Tooltip>

          <input
            accept="application/json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return

              try {
                const text = await file.text()
                const parsed = JSON.parse(text)
                const importedData =
                  normalizeExportSnapshot(parsed)?.data ?? normalizePersistedAppData(parsed)

                if (!importedData) {
                  window.alert(t('importInvalidFile', language))
                  event.target.value = ''
                  return
                }

                const confirmed = window.confirm(
                  t('importReplaceWarning', language),
                )

                if (!confirmed) {
                  event.target.value = ''
                  return
                }

                startTransition(() => {
                  replacePersistedData(importedData)
                })
              } catch {
                window.alert(t('importFailed', language))
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
