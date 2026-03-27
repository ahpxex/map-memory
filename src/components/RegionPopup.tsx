/**
 * Region Popup - context for explore mode and answer feedback for training mode.
 */

import { useEffect, useRef } from 'react'
import { useAtom } from 'jotai'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  datasetAtom,
  languageAtom,
  trainingSessionAtom,
  nextQuestionAtom,
  interactionModeAtom,
  currentDatasetConfigAtom,
} from '../state/trainingAtoms'
import { selectedRegionIdForExploreAtom } from '../state/exploreAtoms'
import type { TrainingSession, UserAnswer } from '../types/training'

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

function ExplorePopup() {
  const popupRef = useRef<HTMLDivElement | null>(null)
  const [selectedRegionId, setSelectedRegionId] = useAtom(selectedRegionIdForExploreAtom)
  const dataset = useAtomValue(datasetAtom)
  const language = useAtomValue(languageAtom)
  const config = useAtomValue(currentDatasetConfigAtom)
  const region = selectedRegionId ? config.regionById.get(selectedRegionId) : null

  useEffect(() => {
    if (!selectedRegionId) return undefined

    function handlePointerDown(event: PointerEvent) {
      const popupElement = popupRef.current
      if (!popupElement) return
      if (event.target instanceof Node && popupElement.contains(event.target)) return
      setSelectedRegionId(null)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [selectedRegionId, setSelectedRegionId])

  if (!region) return null

  const title = language === 'en' ? region.nameEn : region.nameZh
  const subtitle = language === 'en' ? region.nameZh : region.nameEn

  return (
    <div
      ref={popupRef}
      className="pointer-events-auto fixed bottom-32 left-4 z-30 w-80 rounded-2xl border border-stone-200/60 bg-white/95 p-4 shadow-lg backdrop-blur-xl"
    >
      <div className="mb-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-stone-400">
          {dataset === 'world' ? 'Country' : 'Region'}
        </span>
        <h3 className="mt-1 text-xl font-semibold text-stone-900">{title}</h3>
        <p className="text-sm text-stone-500">{subtitle}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        {dataset === 'world' ? (
          <>
            <InfoCard label="Continent" value={region.continent ?? 'Unknown'} />
            <InfoCard label="Subregion" value={region.subregion ?? 'Unknown'} />
          </>
        ) : (
          <>
            <InfoCard label="Province" value={region.parentNameZh ?? 'Unknown'} />
            <InfoCard label="Level" value={region.level ?? 'Unknown'} />
          </>
        )}
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-stone-50 p-2">
      <span className="text-xs text-stone-400">{label}</span>
      <p className="font-medium text-stone-700">{value}</p>
    </div>
  )
}

function formatChoiceLabel(session: TrainingSession, optionIndex: number) {
  if (!session.options || optionIndex < 0) {
    return '未知选项'
  }
  return session.options[optionIndex]?.label ?? '未知选项'
}

function formatRegionAnswer(
  answer: UserAnswer,
  session: TrainingSession,
  regionById: Map<string, { nameZh: string; nameEn: string }>
) {
  switch (answer.type) {
    case 'map-click':
      return regionById.get(answer.regionId)?.nameZh ?? answer.regionId
    case 'choice':
      return formatChoiceLabel(session, answer.optionIndex)
    case 'boolean':
      return answer.value ? '是' : '否'
    case 'streak':
      return answer.regionIds
        .map((regionId) => regionById.get(regionId)?.nameZh ?? regionId)
        .join('、')
    default:
      return '未知答案'
  }
}

function TrainingResultPopup() {
  const session = useAtomValue(trainingSessionAtom)
  const config = useAtomValue(currentDatasetConfigAtom)
  const nextQuestion = useSetAtom(nextQuestionAtom)

  if (!session?.userAnswer) return null

  const isCorrect = session.status === 'correct'
  const correctAnswerText = formatRegionAnswer(session.correctAnswer, session, config.regionById)
  const userAnswerText = formatRegionAnswer(session.userAnswer, session, config.regionById)

  return (
    <div className="pointer-events-auto fixed left-1/2 top-1/2 z-30 w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-stone-200/60 bg-white/95 p-6 shadow-xl backdrop-blur-xl">
      <div className="mb-4">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-stone-400">
          训练结果
        </span>
        <h3 className="mt-1 text-lg font-semibold text-stone-800">
          {session.prompt.content}
        </h3>
      </div>

      <div
        className={`mb-4 rounded-xl border px-4 py-3 ${
          isCorrect
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-rose-200 bg-rose-50 text-rose-900'
        }`}
      >
        <div className="flex items-center gap-2 text-base font-semibold">
          <span className="text-xl">{isCorrect ? '✓' : '✗'}</span>
          <span>{isCorrect ? '回答正确' : '回答错误'}</span>
        </div>
      </div>

      <div className="mb-5 space-y-2 rounded-xl bg-stone-50 p-4 text-sm text-stone-700">
        <div className="flex items-start justify-between gap-4">
          <span className="text-stone-400">你的答案</span>
          <span className="text-right font-medium">{userAnswerText}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <span className="text-stone-400">正确答案</span>
          <span className="text-right font-medium">{correctAnswerText}</span>
        </div>
      </div>

      <button
        onClick={() => nextQuestion()}
        className="w-full rounded-full bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
      >
        下一题
      </button>
    </div>
  )
}
