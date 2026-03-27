/**
 * Enhanced Toolbar - global controls and training actions.
 */

import { useEffect, useRef, useState } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  datasetAtom,
  interactionModeAtom,
  trainingModeAtom,
  scopeTypeAtom,
  scopeValueAtom,
  languageAtom,
  showLabelsAtom,
  nextQuestionAtom,
  currentDatasetStatsAtom,
  trainingSessionAtom,
  submitAnswerAtom,
  currentDatasetConfigAtom,
  requestMapViewportResetAtom,
  persistedTrainingDataAtom,
  replaceTrainingDataAtom,
} from '../state/trainingAtoms'
import { getModesForDataset } from '../features/training/modeConfigs'
import { CONTINENT_OPTIONS, getScopesForDataset } from '../features/training/scopeConfigs'
import { buildExportSnapshot, createDefaultTrainingData, downloadSnapshot, normalizeExportSnapshot, savePersistedData } from '../lib/storage'
import type { ChoiceOption, Dataset, TrainingMode, ScopeType } from '../types/training'

const VISIBLE_MODES_BY_DATASET: Record<Dataset, TrainingMode[]> = {
  world: ['name-to-location', 'shape-to-name'],
  china: ['name-to-location', 'shape-to-name'],
}

const VISIBLE_SCOPES_BY_DATASET: Record<Dataset, ScopeType[]> = {
  world: ['all', 'continent', 'wrong-only'],
  china: ['all', 'province', 'wrong-only'],
}

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

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M18 15l-6-6-6 6" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function RotateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M3 12a9 9 0 1 0 3-6.708" />
      <path d="M3 4v4h4" />
    </svg>
  )
}

function getVisibleModes(dataset: Dataset) {
  const allowedModes = new Set(VISIBLE_MODES_BY_DATASET[dataset])
  return getModesForDataset(dataset).filter((mode) => allowedModes.has(mode.id as TrainingMode))
}

function getVisibleScopes(dataset: Dataset) {
  const allowedScopes = new Set(VISIBLE_SCOPES_BY_DATASET[dataset])
  return getScopesForDataset(dataset).filter((scope) => allowedScopes.has(scope.id as ScopeType))
}

function getProvinceOptions(regionById: Map<string, { parentAdcode?: number | null; parentNameZh?: string | null }>) {
  return Array.from(
    new Map(
      Array.from(regionById.values())
        .filter((region) => region.parentAdcode && region.parentNameZh)
        .map((region) => [String(region.parentAdcode), { id: String(region.parentAdcode), label: region.parentNameZh ?? '未知省份' }]),
    ).values(),
  ).sort((left, right) => left.label.localeCompare(right.label, 'zh-Hans-CN'))
}

function ModeSelector({
  currentMode,
  modes,
  onChange,
}: {
  currentMode: TrainingMode
  modes: ReturnType<typeof getVisibleModes>
  onChange: (mode: TrainingMode) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const currentConfig = modes.find((mode) => mode.id === currentMode)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200"
        type="button"
      >
        <TargetIcon className="h-3.5 w-3.5" />
        <span>{currentConfig?.label ?? '选择题型'}</span>
        {isOpen ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-xl border border-stone-200/60 bg-white/95 p-1 shadow-lg backdrop-blur-xl">
            {modes.map((mode) => (
              <button
                key={mode.id}
                onClick={() => {
                  onChange(mode.id as TrainingMode)
                  setIsOpen(false)
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                  currentMode === mode.id
                    ? 'bg-stone-800 text-white'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
                type="button"
              >
                {mode.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ScopeSelector({
  dataset,
  currentScope,
  scopeValue,
  onChange,
  onValueChange,
  provinceOptions,
}: {
  dataset: Dataset
  currentScope: ScopeType
  scopeValue: string | null
  onChange: (scope: ScopeType) => void
  onValueChange: (value: string | null) => void
  provinceOptions: { id: string; label: string }[]
}) {
  const [isOpen, setIsOpen] = useState(false)
  const scopes = getVisibleScopes(dataset)
  const currentConfig = scopes.find((scope) => scope.id === currentScope)
  const valueOptions = currentScope === 'continent' ? CONTINENT_OPTIONS : provinceOptions

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <button
          onClick={() => setIsOpen((value) => !value)}
          className="flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200"
          type="button"
        >
          <span>{currentConfig?.label ?? '全部'}</span>
          {isOpen ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <div className="absolute bottom-full left-0 z-50 mb-2 w-40 rounded-xl border border-stone-200/60 bg-white/95 p-1 shadow-lg backdrop-blur-xl">
              {scopes.map((scope) => (
                <button
                  key={scope.id}
                  onClick={() => {
                    onChange(scope.id as ScopeType)
                    setIsOpen(false)
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-xs transition ${
                    currentScope === scope.id
                      ? 'bg-stone-800 text-white'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                  type="button"
                >
                  {scope.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {currentConfig?.requiresValue && (
        <select
          name="training-scope-value"
          value={scopeValue ?? ''}
          onChange={(event) => onValueChange(event.target.value || null)}
          className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 outline-none hover:bg-stone-200"
        >
          <option value="">{currentScope === 'continent' ? '选择大洲' : '选择省份'}</option>
          {valueOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}

function OptionButtons({
  options,
  onSelect,
}: {
  options: ChoiceOption[]
  onSelect: (optionIndex: number) => void
}) {
  return (
    <div className="grid w-full max-w-3xl grid-cols-1 gap-2 sm:grid-cols-2">
      {options.map((option, index) => (
        <button
          key={`${option.id}-${index}`}
          onClick={() => onSelect(index)}
          className="rounded-2xl border border-stone-200/70 bg-white/85 px-4 py-3 text-left text-sm font-medium text-stone-700 shadow-sm backdrop-blur-sm transition hover:border-stone-300 hover:bg-white"
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function TrainingBanner() {
  const trainingSession = useAtomValue(trainingSessionAtom)
  const nextQuestion = useSetAtom(nextQuestionAtom)
  const submitAnswer = useSetAtom(submitAnswerAtom)

  if (!trainingSession) {
    return (
      <div className="pointer-events-auto mb-3 rounded-full border border-amber-200 bg-amber-50/90 px-4 py-2 text-sm text-amber-800 shadow-sm backdrop-blur-sm">
        当前范围下暂无可训练题目，请调整范围后重试。
      </div>
    )
  }

  const hasAnswered = trainingSession.userAnswer !== null
  const answerType = trainingSession.correctAnswer.type

  return (
    <div className="pointer-events-auto mb-3 flex w-full max-w-4xl flex-col items-center gap-3 px-2">
      <div className="flex items-center gap-2 rounded-full border border-stone-200/60 bg-white/80 px-4 py-2 shadow-sm backdrop-blur-sm">
        <TargetIcon className="h-3.5 w-3.5 text-stone-400" />
        <span className="text-sm font-medium text-stone-700">
          {trainingSession.prompt.content}
        </span>
      </div>

      {!hasAnswered && answerType === 'map-click' && (
        <div className="rounded-full bg-white/75 px-3 py-1.5 text-xs text-stone-500 shadow-sm backdrop-blur-sm">
          在地图上点击你的答案
        </div>
      )}

      {!hasAnswered && answerType === 'choice' && trainingSession.options && (
        <OptionButtons
          options={trainingSession.options}
          onSelect={(optionIndex) => submitAnswer({ type: 'choice', optionIndex })}
        />
      )}

      {!hasAnswered && answerType === 'boolean' && (
        <OptionButtons
          options={trainingSession.options ?? [
            { id: 'true', label: '是' },
            { id: 'false', label: '否' },
          ]}
          onSelect={(optionIndex) => submitAnswer({ type: 'boolean', value: optionIndex === 0 })}
        />
      )}

      {hasAnswered && (
        <button
          onClick={() => nextQuestion()}
          className="rounded-full bg-stone-800 px-4 py-1.5 text-xs font-medium text-white hover:bg-stone-700"
          type="button"
        >
          下一题
        </button>
      )}
    </div>
  )
}

export function EnhancedToolbar() {
  const [dataset, setDataset] = useAtom(datasetAtom)
  const [interactionMode, setInteractionMode] = useAtom(interactionModeAtom)
  const [trainingMode, setTrainingMode] = useAtom(trainingModeAtom)
  const [scopeType, setScopeType] = useAtom(scopeTypeAtom)
  const [scopeValue, setScopeValue] = useAtom(scopeValueAtom)
  const [language, setLanguage] = useAtom(languageAtom)
  const [showLabels, setShowLabels] = useAtom(showLabelsAtom)

  const stats = useAtomValue(currentDatasetStatsAtom)
  const currentDatasetConfig = useAtomValue(currentDatasetConfigAtom)
  const persistedTrainingData = useAtomValue(persistedTrainingDataAtom)

  const replaceTrainingData = useSetAtom(replaceTrainingDataAtom)
  const requestViewportReset = useSetAtom(requestMapViewportResetAtom)

  const [expanded, setExpanded] = useState(false)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const visibleModes = getVisibleModes(dataset)
  const visibleScopes = getVisibleScopes(dataset)
  const provinceOptions = getProvinceOptions(currentDatasetConfig.regionById)

  useEffect(() => {
    if (visibleModes.some((mode) => mode.id === trainingMode)) return
    const fallbackMode = visibleModes[0]?.id as TrainingMode | undefined
    if (fallbackMode) {
      setTrainingMode(fallbackMode)
    }
  }, [setTrainingMode, trainingMode, visibleModes])

  useEffect(() => {
    if (visibleScopes.some((scope) => scope.id === scopeType)) return
    setScopeType('all')
  }, [scopeType, setScopeType, visibleScopes])

  useEffect(() => {
    if (scopeType === 'continent' || scopeType === 'province') return
    if (scopeValue !== null) {
      setScopeValue(null)
    }
  }, [scopeType, scopeValue, setScopeValue])

  async function handleExport() {
    const snapshot = buildExportSnapshot(persistedTrainingData)
    const filename = `map-memory-${persistedTrainingData.settings.dataset}-${new Date().toISOString().slice(0, 10)}.json`
    downloadSnapshot(filename, snapshot)
  }

  async function handleImport(file: File | null) {
    if (!file) return

    try {
      const parsed = JSON.parse(await file.text())
      const snapshot = normalizeExportSnapshot(parsed)

      if (!snapshot) {
        window.alert(language === 'zh' ? '导入失败，文件格式无效。' : 'Import failed. Invalid file format.')
        return
      }

      const shouldContinue = window.confirm(
        language === 'zh'
          ? '导入将替换当前本地训练数据，是否继续？'
          : 'Importing will replace the current local training data. Continue?',
      )

      if (!shouldContinue) return

      replaceTrainingData(snapshot.data)
      await savePersistedData(snapshot.data)
    } finally {
      if (importInputRef.current) {
        importInputRef.current.value = ''
      }
    }
  }

  async function handleClearData() {
    const shouldContinue = window.confirm(
      language === 'zh'
        ? '确定清空当前本地训练数据吗？'
        : 'Clear the current local training data?',
    )

    if (!shouldContinue) return

    const defaultData = createDefaultTrainingData()
    replaceTrainingData(defaultData)
    await savePersistedData(defaultData)
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center px-4 pb-6">
      {interactionMode === 'training' && <TrainingBanner />}

      <div className="pointer-events-auto">
        <div className="flex flex-col gap-2 rounded-2xl border border-stone-200/60 bg-white/80 px-2 py-2 shadow-lg backdrop-blur-xl">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDataset('world')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                dataset === 'world'
                  ? 'bg-stone-800 text-white'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
              title={language === 'zh' ? '世界' : 'World'}
              type="button"
            >
              <GlobeIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDataset('china')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                dataset === 'china'
                  ? 'bg-stone-800 text-white'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
              title={language === 'zh' ? '中国' : 'China'}
              type="button"
            >
              <MapIcon className="h-4 w-4" />
            </button>

            <div className="mx-1 h-4 w-px bg-stone-200" />

            <button
              onClick={() => setInteractionMode('explore')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                interactionMode === 'explore'
                  ? 'bg-stone-100 text-stone-800'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
              title={language === 'zh' ? '探索模式' : 'Explore'}
              type="button"
            >
              <CompassIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setInteractionMode('training')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                interactionMode === 'training'
                  ? 'bg-stone-800 text-white'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
              title={language === 'zh' ? '训练模式' : 'Training'}
              type="button"
            >
              <GraduationIcon className="h-4 w-4" />
            </button>

            <div className="mx-1 h-4 w-px bg-stone-200" />

            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                showLabels
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'text-stone-400 hover:text-stone-600'
              }`}
              title={language === 'zh' ? '显示标签' : 'Show labels'}
              type="button"
            >
              <TagIcon className="h-4 w-4" />
            </button>

            <button
              onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
              className="flex h-8 items-center justify-center rounded-full px-2.5 text-xs font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
              type="button"
            >
              {language === 'zh' ? '中' : 'EN'}
            </button>

            <div className="mx-1 h-4 w-px bg-stone-200" />

            <div className="flex items-center gap-3 px-2 text-xs text-stone-500">
              <span>{stats.practicedRegions}/{stats.totalRegions}</span>
              <span className="text-stone-300">·</span>
              <span>{stats.accuracy}%</span>
            </div>

            <div className="mx-1 h-4 w-px bg-stone-200" />

            <button
              onClick={() => setExpanded((value) => !value)}
              className="flex h-8 w-8 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
              type="button"
            >
              {expanded ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronUpIcon className="h-4 w-4" />}
            </button>
          </div>

          {expanded && (
            <>
              <div className="flex flex-wrap items-center gap-2 border-t border-stone-200/60 pt-2">
                <span className="text-xs text-stone-400">题型:</span>
                <ModeSelector currentMode={trainingMode} modes={visibleModes} onChange={setTrainingMode} />

                <span className="ml-2 text-xs text-stone-400">范围:</span>
                <ScopeSelector
                  dataset={dataset}
                  currentScope={scopeType}
                  scopeValue={scopeValue}
                  onChange={setScopeType}
                  onValueChange={setScopeValue}
                  provinceOptions={provinceOptions}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-stone-200/60 pt-2">
                <button
                  onClick={() => requestViewportReset()}
                  className="flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-200"
                  type="button"
                >
                  <RotateIcon className="h-3.5 w-3.5" />
                  <span>{language === 'zh' ? '重置视图' : 'Reset View'}</span>
                </button>

                <button
                  onClick={() => handleExport()}
                  className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-200"
                  type="button"
                >
                  {language === 'zh' ? '导出训练数据' : 'Export Data'}
                </button>

                <button
                  onClick={() => importInputRef.current?.click()}
                  className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-200"
                  type="button"
                >
                  {language === 'zh' ? '导入训练数据' : 'Import Data'}
                </button>

                <button
                  onClick={() => void handleClearData()}
                  className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                  type="button"
                >
                  {language === 'zh' ? '清空本地数据' : 'Clear Local Data'}
                </button>

                <input
                  ref={importInputRef}
                  accept="application/json"
                  className="hidden"
                  name="training-import-file"
                  onChange={(event) => {
                    const [file] = Array.from(event.target.files ?? [])
                    void handleImport(file ?? null)
                  }}
                  type="file"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
