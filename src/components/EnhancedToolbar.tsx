/**
 * Enhanced Toolbar - single global control surface aligned with the PRD.
 */

import { useEffect, useRef, useState } from 'react'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import {
  borderEmphasisAtom,
  colorIntensityAtom,
  currentDatasetConfigAtom,
  currentDatasetStatsAtom,
  datasetAtom,
  interactionModeAtom,
  languageAtom,
  nextQuestionAtom,
  persistedTrainingDataAtom,
  popupDensityAtom,
  replaceTrainingDataAtom,
  requestMapViewportResetAtom,
  scopeTypeAtom,
  scopeValueAtom,
  showLabelsAtom,
  submitAnswerAtom,
  trainingSessionAtom,
  trainingSubmodeAtom,
} from '../state/trainingAtoms'
import { buildExportSnapshot, createDefaultTrainingData, downloadSnapshot, normalizeExportSnapshot, savePersistedData } from '../lib/storage'
import { getScopesForDataset } from '../features/training/scopeConfigs'
import type { AppLanguage, BorderEmphasis, ChoiceOption, ColorIntensity, PopupDensity, ScopeType } from '../types/training'

const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  zh: '中',
  en: 'EN',
  mixed: '中英',
}

function getToolbarText(language: AppLanguage) {
  if (language === 'en') {
    return {
      noTraining: 'No questions available under the current scope.',
      tapMap: 'Click the map to answer',
      nextQuestion: 'Next',
      submode: 'Submode',
      scope: 'Scope',
      popup: 'Popup',
      border: 'Border',
      color: 'Color',
      reset: 'Reset View',
      export: 'Export Data',
      import: 'Import Data',
      clear: 'Clear Local Data',
      invalidImport: 'Import failed. Invalid file format.',
      invalidVersion: 'Import failed. Snapshot version is not supported.',
      confirmImport: 'Importing will replace the current local training data. Continue?',
      confirmClear: 'Clear the current local training data?',
      chooseContinent: 'Choose Continent',
      chooseProvince: 'Choose Province',
    }
  }

  if (language === 'mixed') {
    return {
      noTraining: '当前范围下暂无可训练题目 / No questions available',
      tapMap: '在地图上点击你的答案 / Click the map to answer',
      nextQuestion: '下一题 / Next',
      submode: '训练子模式 / Submode',
      scope: '练习范围 / Scope',
      popup: 'Popup',
      border: '边界 / Border',
      color: '色彩 / Color',
      reset: '重置视图 / Reset View',
      export: '导出训练数据 / Export Data',
      import: '导入训练数据 / Import Data',
      clear: '清空本地数据 / Clear Local Data',
      invalidImport: '导入失败，文件格式无效 / Import failed.',
      invalidVersion: '快照版本不兼容 / Snapshot version is not supported.',
      confirmImport: '导入将替换当前本地训练数据，是否继续？ / Replace local data?',
      confirmClear: '确定清空当前本地训练数据吗？ / Clear local data?',
      chooseContinent: '选择大洲 / Choose Continent',
      chooseProvince: '选择省份 / Choose Province',
    }
  }

  return {
    noTraining: '当前范围下暂无可训练题目，请调整范围后重试。',
    tapMap: '在地图上点击你的答案',
    nextQuestion: '下一题',
    submode: '训练子模式',
    scope: '练习范围',
    popup: 'Popup',
    border: '边界',
    color: '色彩',
    reset: '重置视图',
    export: '导出训练数据',
    import: '导入训练数据',
    clear: '清空本地数据',
    invalidImport: '导入失败，文件格式无效。',
    invalidVersion: '导入失败，快照版本不兼容。',
    confirmImport: '导入将替换当前本地训练数据，是否继续？',
    confirmClear: '确定清空当前本地训练数据吗？',
    chooseContinent: '选择大洲',
    chooseProvince: '选择省份',
  }
}

function getSubmodeOptions(language: AppLanguage) {
  if (language === 'en') {
    return [
      { id: 'name-to-location', label: 'Name to Map' },
      { id: 'shape-to-name', label: 'Map to Name' },
      { id: 'wrong-replay', label: 'Wrong Replay' },
    ]
  }
  if (language === 'mixed') {
    return [
      { id: 'name-to-location', label: '看名点图 / Name to Map' },
      { id: 'shape-to-name', label: '看图猜名 / Map to Name' },
      { id: 'wrong-replay', label: '错题回放 / Wrong Replay' },
    ]
  }
  return [
    { id: 'name-to-location', label: '看名点图' },
    { id: 'shape-to-name', label: '看图猜名' },
    { id: 'wrong-replay', label: '错题回放' },
  ]
}

function getPopupDensityOptions(language: AppLanguage): Array<{ id: PopupDensity; label: string }> {
  if (language === 'en') {
    return [
      { id: 'adaptive', label: 'Adaptive' },
      { id: 'compact', label: 'Compact' },
      { id: 'rich', label: 'Rich' },
    ]
  }
  if (language === 'mixed') {
    return [
      { id: 'adaptive', label: '自适应 / Adaptive' },
      { id: 'compact', label: '简洁 / Compact' },
      { id: 'rich', label: '详细 / Rich' },
    ]
  }
  return [
    { id: 'adaptive', label: '自适应' },
    { id: 'compact', label: '简洁' },
    { id: 'rich', label: '详细' },
  ]
}

function getBorderOptions(language: AppLanguage): Array<{ id: BorderEmphasis; label: string }> {
  if (language === 'en') {
    return [
      { id: 'soft', label: 'Soft' },
      { id: 'strong', label: 'Strong' },
    ]
  }
  if (language === 'mixed') {
    return [
      { id: 'soft', label: '柔和 / Soft' },
      { id: 'strong', label: '强调 / Strong' },
    ]
  }
  return [
    { id: 'soft', label: '柔和' },
    { id: 'strong', label: '强调' },
  ]
}

function getColorOptions(language: AppLanguage): Array<{ id: ColorIntensity; label: string }> {
  if (language === 'en') {
    return [
      { id: 'soft', label: 'Low' },
      { id: 'normal', label: 'Medium' },
      { id: 'vivid', label: 'High' },
    ]
  }
  if (language === 'mixed') {
    return [
      { id: 'soft', label: '低 / Low' },
      { id: 'normal', label: '中 / Medium' },
      { id: 'vivid', label: '高 / High' },
    ]
  }
  return [
    { id: 'soft', label: '低' },
    { id: 'normal', label: '中' },
    { id: 'vivid', label: '高' },
  ]
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

function getProvinceOptions(regionById: Map<string, { parentAdcode?: number | null; parentNameZh?: string | null; parentNameEn?: string | null }>) {
  return Array.from(
    new Map(
      Array.from(regionById.values())
        .filter((region) => region.parentAdcode && region.parentNameZh)
        .map((region) => [String(region.parentAdcode), {
          id: String(region.parentAdcode),
          label: region.parentNameZh ?? '未知省份',
          labelEn: region.parentNameEn ?? region.parentNameZh ?? 'Unknown Province',
        }]),
    ).values(),
  ).sort((left, right) => left.label.localeCompare(right.label, 'zh-Hans-CN'))
}

function Selector({
  label,
  value,
  options,
  onChange,
  widthClass = 'w-40',
}: {
  label: string
  value: string
  options: Array<{ id: string; label: string }>
  onChange: (value: string) => void
  widthClass?: string
}) {
  const [open, setOpen] = useState(false)
  const currentOption = options.find((option) => option.id === value)

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-stone-400">{label}</span>
      <div className="relative">
        <button
          className={`flex items-center justify-between gap-2 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 hover:bg-stone-200 ${widthClass}`}
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span>{currentOption?.label ?? '选择'}</span>
          {open ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
        </button>
        {open ? (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <div className={`absolute bottom-full left-0 z-50 mb-2 rounded-2xl border border-stone-200/70 bg-white/95 p-1 shadow-lg backdrop-blur-xl ${widthClass}`}>
              {options.map((option) => (
                <button
                  key={option.id}
                  className={`w-full rounded-xl px-3 py-2 text-left text-xs transition ${
                    option.id === value ? 'bg-stone-800 text-white' : 'text-stone-600 hover:bg-stone-100'
                  }`}
                  onClick={() => {
                    onChange(option.id)
                    setOpen(false)
                  }}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>
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
  const language = useAtomValue(languageAtom)
  const text = getToolbarText(language)

  if (!trainingSession) {
    return (
      <div className="pointer-events-auto mb-3 rounded-full border border-amber-200 bg-amber-50/90 px-4 py-2 text-sm text-amber-800 shadow-sm backdrop-blur-sm">
        {text.noTraining}
      </div>
    )
  }

  const hasAnswered = trainingSession.userAnswer !== null
  const answerType = trainingSession.correctAnswer.type

  return (
    <div className="pointer-events-auto mb-3 flex w-full max-w-4xl flex-col items-center gap-3 px-2">
      <div className="flex items-center gap-2 rounded-full border border-stone-200/60 bg-white/80 px-4 py-2 shadow-sm backdrop-blur-sm">
        <TargetIcon className="h-3.5 w-3.5 text-stone-400" />
        <span className="text-sm font-medium text-stone-700">{trainingSession.prompt.content}</span>
      </div>

      {!hasAnswered && answerType === 'map-click' ? (
        <div className="rounded-full bg-white/75 px-3 py-1.5 text-xs text-stone-500 shadow-sm backdrop-blur-sm">
          {text.tapMap}
        </div>
      ) : null}

      {!hasAnswered && answerType === 'choice' && trainingSession.options ? (
        <OptionButtons options={trainingSession.options} onSelect={(optionIndex) => submitAnswer({ type: 'choice', optionIndex })} />
      ) : null}

      {!hasAnswered && answerType === 'boolean' ? (
        <OptionButtons
          options={trainingSession.options ?? [{ id: 'true', label: '是' }, { id: 'false', label: '否' }]}
          onSelect={(optionIndex) => submitAnswer({ type: 'boolean', value: optionIndex === 0 })}
        />
      ) : null}

      {hasAnswered ? (
        <button
          onClick={() => nextQuestion()}
          className="rounded-full bg-stone-800 px-4 py-1.5 text-xs font-medium text-white hover:bg-stone-700"
          type="button"
        >
          {text.nextQuestion}
        </button>
      ) : null}
    </div>
  )
}

export function EnhancedToolbar() {
  const [dataset, setDataset] = useAtom(datasetAtom)
  const [interactionMode, setInteractionMode] = useAtom(interactionModeAtom)
  const [trainingSubmode, setTrainingSubmode] = useAtom(trainingSubmodeAtom)
  const [scopeType, setScopeType] = useAtom(scopeTypeAtom)
  const [scopeValue, setScopeValue] = useAtom(scopeValueAtom)
  const [language, setLanguage] = useAtom(languageAtom)
  const [showLabels, setShowLabels] = useAtom(showLabelsAtom)
  const [popupDensity, setPopupDensity] = useAtom(popupDensityAtom)
  const [borderEmphasis, setBorderEmphasis] = useAtom(borderEmphasisAtom)
  const [colorIntensity, setColorIntensity] = useAtom(colorIntensityAtom)

  const stats = useAtomValue(currentDatasetStatsAtom)
  const currentDatasetConfig = useAtomValue(currentDatasetConfigAtom)
  const persistedTrainingData = useAtomValue(persistedTrainingDataAtom)
  const allScopes = getScopesForDataset(dataset).map((scope) => ({
    id: scope.id,
    label: language === 'en' ? scope.labelEn : language === 'mixed' ? `${scope.label} / ${scope.labelEn}` : scope.label,
  }))
  const provinceOptions = getProvinceOptions(currentDatasetConfig.regionById)

  const replaceTrainingData = useSetAtom(replaceTrainingDataAtom)
  const requestViewportReset = useSetAtom(requestMapViewportResetAtom)

  const [expanded, setExpanded] = useState(false)
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const text = getToolbarText(language)
  const submodeOptions = getSubmodeOptions(language)
  const popupDensityOptions = getPopupDensityOptions(language)
  const borderOptions = getBorderOptions(language)
  const colorOptions = getColorOptions(language)

  useEffect(() => {
    if (scopeType === 'continent' || scopeType === 'province' || scopeType === 'same-province') return
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
      if (typeof parsed?.version === 'number' && parsed.version !== 3 && parsed.version !== 4) {
        window.alert(text.invalidVersion)
        return
      }
      const snapshot = normalizeExportSnapshot(parsed)
      if (!snapshot) {
        window.alert(text.invalidImport)
        return
      }

      const shouldContinue = window.confirm(text.confirmImport)

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
    const shouldContinue = window.confirm(text.confirmClear)

    if (!shouldContinue) return

    const defaultData = createDefaultTrainingData()
    replaceTrainingData(defaultData)
    await savePersistedData(defaultData)
  }

  function cycleLanguage() {
    const next = language === 'zh' ? 'en' : language === 'en' ? 'mixed' : 'zh'
    setLanguage(next)
  }

  const valueOptions = scopeType === 'continent'
    ? [{ id: '', label: text.chooseContinent }, ...[
      { id: 'asia', label: language === 'en' ? 'Asia' : language === 'mixed' ? '亚洲 / Asia' : '亚洲' },
      { id: 'europe', label: language === 'en' ? 'Europe' : language === 'mixed' ? '欧洲 / Europe' : '欧洲' },
      { id: 'africa', label: language === 'en' ? 'Africa' : language === 'mixed' ? '非洲 / Africa' : '非洲' },
      { id: 'north-america', label: language === 'en' ? 'North America' : language === 'mixed' ? '北美洲 / North America' : '北美洲' },
      { id: 'south-america', label: language === 'en' ? 'South America' : language === 'mixed' ? '南美洲 / South America' : '南美洲' },
      { id: 'oceania', label: language === 'en' ? 'Oceania' : language === 'mixed' ? '大洋洲 / Oceania' : '大洋洲' },
    ]]
    : scopeType === 'province' || scopeType === 'same-province'
      ? [{ id: '', label: text.chooseProvince }, ...provinceOptions.map((option) => ({
        id: option.id,
        label: language === 'en'
          ? option.labelEn
          : language === 'mixed'
            ? `${option.label} / ${option.labelEn}`
            : option.label,
      }))]
      : []

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex flex-col items-center px-4 pb-6">
      {interactionMode === 'training' ? <TrainingBanner /> : null}

      <div className="pointer-events-auto">
        <div className="flex flex-col gap-2 rounded-3xl border border-stone-200/60 bg-white/80 px-2 py-2 shadow-lg backdrop-blur-xl">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDataset('world')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                dataset === 'world' ? 'bg-stone-800 text-white' : 'text-stone-400 hover:text-stone-600'
              }`}
              title="世界"
              type="button"
            >
              <GlobeIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDataset('china')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                dataset === 'china' ? 'bg-stone-800 text-white' : 'text-stone-400 hover:text-stone-600'
              }`}
              title="中国"
              type="button"
            >
              <MapIcon className="h-4 w-4" />
            </button>

            <div className="mx-1 h-4 w-px bg-stone-200" />

            <button
              onClick={() => setInteractionMode('explore')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                interactionMode === 'explore' ? 'bg-stone-100 text-stone-800' : 'text-stone-400 hover:text-stone-600'
              }`}
              title="探索模式"
              type="button"
            >
              <CompassIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setInteractionMode('training')}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                interactionMode === 'training' ? 'bg-stone-800 text-white' : 'text-stone-400 hover:text-stone-600'
              }`}
              title="训练模式"
              type="button"
            >
              <GraduationIcon className="h-4 w-4" />
            </button>

            <div className="mx-1 h-4 w-px bg-stone-200" />

            <button
              onClick={() => setShowLabels(!showLabels)}
              className={`flex h-8 w-8 items-center justify-center rounded-full transition ${
                showLabels ? 'bg-emerald-50 text-emerald-600' : 'text-stone-400 hover:text-stone-600'
              }`}
              title="显示标签"
              type="button"
            >
              <TagIcon className="h-4 w-4" />
            </button>

            <button
              onClick={cycleLanguage}
              className="flex h-8 items-center justify-center rounded-full px-2.5 text-xs font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-700"
              type="button"
            >
              {LANGUAGE_LABELS[language]}
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

          {expanded ? (
            <>
              {interactionMode === 'training' ? (
                <div className="flex flex-wrap items-center gap-3 border-t border-stone-200/60 pt-2">
                  <Selector
                    label={text.submode}
                    value={trainingSubmode}
                    options={submodeOptions.map((option) => ({ id: option.id, label: option.label }))}
                    onChange={(value) => setTrainingSubmode(value as typeof trainingSubmode)}
                    widthClass="w-36"
                  />
                  <Selector
                    label={text.scope}
                    value={scopeType}
                    options={allScopes}
                    onChange={(value) => setScopeType(value as ScopeType)}
                    widthClass="w-36"
                  />
                  {valueOptions.length > 0 ? (
                    <select
                      name="training-scope-value"
                      value={scopeValue ?? ''}
                      onChange={(event) => setScopeValue(event.target.value || null)}
                      className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 outline-none hover:bg-stone-200"
                    >
                      {valueOptions.map((option) => (
                        <option key={option.id || 'empty'} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-3 border-t border-stone-200/60 pt-2">
                <Selector
                  label={text.popup}
                  value={popupDensity}
                  options={popupDensityOptions}
                  onChange={(value) => setPopupDensity(value as PopupDensity)}
                  widthClass="w-28"
                />
                <Selector
                  label={text.border}
                  value={borderEmphasis}
                  options={borderOptions}
                  onChange={(value) => setBorderEmphasis(value as BorderEmphasis)}
                  widthClass="w-24"
                />
                <Selector
                  label={text.color}
                  value={colorIntensity}
                  options={colorOptions}
                  onChange={(value) => setColorIntensity(value as ColorIntensity)}
                  widthClass="w-24"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 border-t border-stone-200/60 pt-2">
                <button
                  onClick={() => requestViewportReset()}
                  className="flex items-center gap-2 rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-200"
                  type="button"
                >
                  <RotateIcon className="h-3.5 w-3.5" />
                  <span>{text.reset}</span>
                </button>
                <button
                  onClick={() => handleExport()}
                  className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-200"
                  type="button"
                >
                  {text.export}
                </button>
                <button
                  onClick={() => importInputRef.current?.click()}
                  className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:bg-stone-200"
                  type="button"
                >
                  {text.import}
                </button>
                <button
                  onClick={() => void handleClearData()}
                  className="rounded-full bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-100"
                  type="button"
                >
                  {text.clear}
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
          ) : null}
        </div>
      </div>
    </div>
  )
}
