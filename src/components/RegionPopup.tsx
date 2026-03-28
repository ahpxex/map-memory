/**
 * Region Popup - contextual learning card for explore mode and feedback card for training mode.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { useAtom } from 'jotai'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  currentDatasetConfigAtom,
  datasetAtom,
  errorBookAtom,
  interactionModeAtom,
  languageAtom,
  nextQuestionAtom,
  popupDensityAtom,
  showLabelsAtom,
  trainingSessionAtom,
} from '../state/trainingAtoms'
import { selectedRegionIdForExploreAtom } from '../state/exploreAtoms'
import type { AppLanguage, PopupDensity, RegionFeature, TrainingSession, UserAnswer } from '../types/training'

const POPUP_WIDTH = 360
const POPUP_HEIGHT = 340
const VIEWPORT_PADDING = 20

function getPopupDensity(mode: PopupDensity, showLabels: boolean) {
  if (mode === 'adaptive') {
    return showLabels ? 'rich' : 'compact'
  }
  return mode
}

function getPopupText(language: AppLanguage) {
  if (language === 'en') {
    return {
      country: 'Country',
      region: 'Region',
      continent: 'Continent',
      capital: 'Capital',
      subregion: 'Subregion',
      neighbors: 'Neighbors',
      population: 'Population',
      formalName: 'Formal Name',
      province: 'Province',
      type: 'Type',
      parent: 'Parent',
      noNeighbors: 'No neighbor data',
      trainingFeedback: 'Training Feedback',
      correct: 'Correct',
      wrong: 'Wrong',
      yourAnswer: 'Your Answer',
      correctAnswer: 'Correct Answer',
      errorBook: 'Error Book',
      recorded: 'Recorded',
      notRecorded: 'Not Recorded',
      neighborCount: 'Neighbor Count',
      nextQuestion: 'Next',
    }
  }

  if (language === 'mixed') {
    return {
      country: '国家 / Country',
      region: '地区 / Region',
      continent: '洲别 / Continent',
      capital: '首都 / Capital',
      subregion: '次区域 / Subregion',
      neighbors: '邻接 / Neighbors',
      population: '人口 / Population',
      formalName: '正式名称 / Formal Name',
      province: '省份 / Province',
      type: '类型 / Type',
      parent: '上级 / Parent',
      noNeighbors: '暂无邻接信息 / No neighbor data',
      trainingFeedback: '训练反馈 / Training Feedback',
      correct: '回答正确 / Correct',
      wrong: '回答错误 / Wrong',
      yourAnswer: '你的答案 / Your Answer',
      correctAnswer: '正确答案 / Correct Answer',
      errorBook: '错题池 / Error Book',
      recorded: '已记录 / Recorded',
      notRecorded: '未记录 / Not Recorded',
      neighborCount: '邻接数量 / Neighbor Count',
      nextQuestion: '下一题 / Next',
    }
  }

  return {
    country: '国家',
    region: '地区',
    continent: '所属洲',
    capital: '首都',
    subregion: '次区域',
    neighbors: '邻接',
    population: '人口',
    formalName: '正式名称',
    province: '省份',
    type: '类型',
    parent: '上级',
    noNeighbors: '暂无邻接信息',
    trainingFeedback: '训练反馈',
    correct: '回答正确',
    wrong: '回答错误',
    yourAnswer: '你的答案',
    correctAnswer: '正确答案',
    errorBook: '错题池',
    recorded: '已记录',
    notRecorded: '未记录',
    neighborCount: '邻接数量',
    nextQuestion: '下一题',
  }
}

function getDisplayNames(language: AppLanguage, regionFeature: RegionFeature) {
  if (language === 'en') {
    return {
      title: regionFeature.labels.en,
      subtitle: regionFeature.labels.zh,
    }
  }

  if (language === 'mixed') {
    return {
      title: regionFeature.labels.mixed,
      subtitle: regionFeature.metadata.formalNameEn ?? null,
    }
  }

  return {
    title: regionFeature.labels.zh,
    subtitle: regionFeature.labels.en,
  }
}

function formatPopulation(value: number | null | undefined, language: AppLanguage) {
  if (!value) return 'Unknown'
  if (language === 'en') {
    return new Intl.NumberFormat('en-US').format(Math.round(value))
  }
  if (language === 'mixed') {
    return `${new Intl.NumberFormat('en-US').format(Math.round(value))} / ${formatPopulation(value, 'zh')}`
  }
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(1)} 亿`
  if (value >= 10_000) return `${Math.round(value / 10_000)} 万`
  return value.toLocaleString('zh-Hans-CN')
}

function formatAnswer(
  answer: UserAnswer,
  session: TrainingSession,
  featureMap: Map<string, RegionFeature>,
  language: AppLanguage,
) {
  switch (answer.type) {
    case 'map-click':
      return featureMap.get(answer.regionId)?.labels[language] ?? answer.regionId
    case 'choice':
      return session.options?.[answer.optionIndex]?.label ?? '未知选项'
    case 'boolean':
      return answer.value ? '是' : '否'
    case 'streak':
      return answer.regionIds.map((regionId) => featureMap.get(regionId)?.labels.zh ?? regionId).join('、')
    default:
      return '未知答案'
  }
}

function getPopupPosition(anchor: { x: number; y: number }) {
  const maxLeft = Math.max(VIEWPORT_PADDING, window.innerWidth - POPUP_WIDTH - VIEWPORT_PADDING)
  const maxTop = Math.max(VIEWPORT_PADDING, window.innerHeight - POPUP_HEIGHT - VIEWPORT_PADDING)
  const left = Math.min(Math.max(anchor.x + 16, VIEWPORT_PADDING), maxLeft)
  const top = Math.min(Math.max(anchor.y - POPUP_HEIGHT / 2, VIEWPORT_PADDING), maxTop)
  return { left, top }
}

function useRegionFeatureMap() {
  const config = useAtomValue(currentDatasetConfigAtom)
  const [featureMap, setFeatureMap] = useState<Map<string, RegionFeature>>(new Map())

  useEffect(() => {
    let cancelled = false
    config.loadRegionFeatureMap()
      .then((nextMap) => {
        if (!cancelled) {
          setFeatureMap(nextMap)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFeatureMap(new Map())
        }
      })

    return () => {
      cancelled = true
    }
  }, [config])

  return featureMap
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-stone-50 p-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-400">{label}</div>
      <div className="mt-1 text-sm font-medium text-stone-700">{value}</div>
    </div>
  )
}

function ExplorePopup() {
  const popupRef = useRef<HTMLDivElement | null>(null)
  const [popupState, setPopupState] = useAtom(selectedRegionIdForExploreAtom)
  const dataset = useAtomValue(datasetAtom)
  const language = useAtomValue(languageAtom)
  const popupDensity = useAtomValue(popupDensityAtom)
  const showLabels = useAtomValue(showLabelsAtom)
  const featureMap = useRegionFeatureMap()
  const text = getPopupText(language)

  const regionFeature = popupState ? featureMap.get(popupState.regionId) ?? null : null
  const effectiveDensity = getPopupDensity(popupDensity, showLabels)
  const displayNames = regionFeature ? getDisplayNames(language, regionFeature) : null
  const neighborLabels = useMemo(() => {
    if (!regionFeature) return []
    return regionFeature.neighbors
      .map((neighborId) => featureMap.get(neighborId)?.labels[language] ?? neighborId)
      .slice(0, 6)
  }, [featureMap, language, regionFeature])

  useEffect(() => {
    if (!popupState) return undefined

    function handlePointerDown(event: PointerEvent) {
      const popupElement = popupRef.current
      if (!popupElement) return
      if (event.target instanceof Node && popupElement.contains(event.target)) return
      setPopupState(null)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [popupState, setPopupState])

  if (!popupState || !regionFeature || !displayNames) return null

  const popupPosition = getPopupPosition(popupState.anchor)
  const aliases = regionFeature.aliases.filter((alias) => alias !== displayNames.title)

  return (
    <div
      ref={popupRef}
      className="pointer-events-auto fixed z-30 w-[22.5rem] rounded-3xl border border-stone-200/60 bg-white/95 p-5 shadow-xl backdrop-blur-xl"
      style={popupPosition}
    >
      <div className="mb-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-stone-400">
          {dataset === 'world' ? text.country : text.region}
        </div>
        <h3 className="mt-2 text-xl font-semibold text-stone-900">{displayNames.title}</h3>
        {displayNames.subtitle ? (
          <p className="mt-1 text-sm text-stone-500">{displayNames.subtitle}</p>
        ) : null}
      </div>

      {aliases.length > 0 && effectiveDensity === 'rich' ? (
        <div className="mb-4 flex flex-wrap gap-2">
          {aliases.slice(0, 4).map((alias) => (
            <span
              key={alias}
              className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1 text-xs text-stone-500"
            >
              {alias}
            </span>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 text-sm">
        {dataset === 'world' ? (
          <>
            <InfoCard label={text.continent} value={regionFeature.metadata.continent ?? 'Unknown'} />
            <InfoCard label={text.capital} value={regionFeature.metadata.capital ?? 'Unknown'} />
            <InfoCard label={text.subregion} value={regionFeature.metadata.subregion ?? 'Unknown'} />
            <InfoCard label={text.neighbors} value={`${regionFeature.metadata.neighborCount}`} />
            {effectiveDensity === 'rich' ? (
              <>
                <InfoCard label={text.population} value={formatPopulation(regionFeature.metadata.population, language)} />
                <InfoCard label={text.formalName} value={regionFeature.metadata.formalNameEn ?? 'Unknown'} />
              </>
            ) : null}
          </>
        ) : (
          <>
            <InfoCard label={text.province} value={regionFeature.metadata.parentNameZh ?? 'Unknown'} />
            <InfoCard label={text.type} value={regionFeature.metadata.level ?? 'Unknown'} />
            <InfoCard label={text.neighbors} value={`${regionFeature.metadata.neighborCount}`} />
            <InfoCard label={text.parent} value={regionFeature.metadata.parentNameEn ?? 'China'} />
          </>
        )}
      </div>

      {effectiveDensity === 'rich' ? (
        <div className="mt-4 rounded-2xl bg-stone-50 p-3">
          <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-stone-400">{text.neighbors}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {neighborLabels.length > 0 ? neighborLabels.map((name) => (
              <span
                key={name}
                className="rounded-full border border-stone-200 bg-white px-2.5 py-1 text-xs text-stone-600"
              >
                {name}
              </span>
            )) : (
              <span className="text-xs text-stone-500">{text.noNeighbors}</span>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function TrainingResultPopup() {
  const session = useAtomValue(trainingSessionAtom)
  const errorBook = useAtomValue(errorBookAtom)
  const popupDensity = useAtomValue(popupDensityAtom)
  const showLabels = useAtomValue(showLabelsAtom)
  const language = useAtomValue(languageAtom)
  const nextQuestion = useSetAtom(nextQuestionAtom)
  const featureMap = useRegionFeatureMap()
  const text = getPopupText(language)

  if (!session?.userAnswer) return null

  const effectiveDensity = getPopupDensity(popupDensity, showLabels)
  const isCorrect = session.status === 'correct'
  const promptFeature = featureMap.get(session.prompt.regionId) ?? null
  const correctAnswerText = formatAnswer(session.correctAnswer, session, featureMap, language)
  const userAnswerText = formatAnswer(session.userAnswer, session, featureMap, language)
  const isInErrorBook = errorBook.some((record) =>
    record.dataset === session.dataset &&
    record.skill === session.skill &&
    record.regionId === session.prompt.regionId,
  ) || session.status === 'wrong'

  return (
    <div className="pointer-events-auto fixed left-1/2 top-1/2 z-30 w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-3xl border border-stone-200/60 bg-white/95 p-6 shadow-xl backdrop-blur-xl">
      <div className="mb-4">
        <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-stone-400">{text.trainingFeedback}</div>
        <h3 className="mt-2 text-lg font-semibold text-stone-800">{session.prompt.content}</h3>
        {promptFeature && effectiveDensity === 'rich' ? (
          <p className="mt-1 text-sm text-stone-500">{promptFeature.labels.mixed}</p>
        ) : null}
      </div>

      <div
        className={`mb-4 rounded-2xl border px-4 py-3 ${
          isCorrect
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-rose-200 bg-rose-50 text-rose-900'
        }`}
      >
        <div className="flex items-center gap-2 text-base font-semibold">
          <span className="text-xl">{isCorrect ? '✓' : '✗'}</span>
          <span>{isCorrect ? text.correct : text.wrong}</span>
        </div>
      </div>

      <div className="mb-5 space-y-2 rounded-2xl bg-stone-50 p-4 text-sm text-stone-700">
        <div className="flex items-start justify-between gap-4">
          <span className="text-stone-400">{text.yourAnswer}</span>
          <span className="text-right font-medium">{userAnswerText}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span className="text-stone-400">{text.correctAnswer}</span>
          <span className="text-right font-medium">{correctAnswerText}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span className="text-stone-400">{text.errorBook}</span>
          <span className="text-right font-medium">{isInErrorBook ? text.recorded : text.notRecorded}</span>
        </div>
        {effectiveDensity === 'rich' && promptFeature ? (
          <div className="flex items-start justify-between gap-4">
            <span className="text-stone-400">{text.neighborCount}</span>
            <span className="text-right font-medium">{promptFeature.metadata.neighborCount}</span>
          </div>
        ) : null}
      </div>

      <button
        onClick={() => nextQuestion()}
        className="w-full rounded-full bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
        type="button"
      >
        {text.nextQuestion}
      </button>
    </div>
  )
}

export function RegionPopup() {
  const interactionMode = useAtomValue(interactionModeAtom)
  const trainingSession = useAtomValue(trainingSessionAtom)

  if (interactionMode === 'training' && trainingSession?.userAnswer) {
    return <TrainingResultPopup />
  }

  if (interactionMode === 'explore') {
    return <ExplorePopup />
  }

  return null
}
