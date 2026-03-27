/**
 * Region Popup - Updated for Training System v2
 */

import { useEffect, useRef } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import { atom, useAtom } from 'jotai'
import { 
  datasetAtom, 
  languageAtom, 
  trainingSessionAtom,
  nextQuestionAtom,
  interactionModeAtom,
  currentDatasetConfigAtom,
} from '../state/trainingAtoms'

// 用于探索模式的选中区域
const selectedRegionIdForExploreAtom = atom<string | null>(null)

export function RegionPopup() {
  const interactionMode = useAtomValue(interactionModeAtom)
  const trainingSession = useAtomValue(trainingSessionAtom)

  if (interactionMode === 'training' && trainingSession) {
    return <TrainingResultPopup />
  }

  return <ExplorePopup />
}

// 探索模式弹窗
function ExplorePopup() {
  const popupRef = useRef<HTMLDivElement | null>(null)
  const [selectedRegionId, setSelectedRegionId] = useAtom(selectedRegionIdForExploreAtom)
  const dataset = useAtomValue(datasetAtom)
  const language = useAtomValue(languageAtom)
  const config = useAtomValue(currentDatasetConfigAtom)
  
  const region = selectedRegionId ? config.regionById.get(selectedRegionId) : null
  
  if (!region) return null

  const title = language === 'en' ? region.nameEn : region.nameZh
  const subtitle = language === 'en' ? region.nameZh : region.nameEn

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const popupElement = popupRef.current
      if (!popupElement) return
      if (event.target instanceof Node && popupElement.contains(event.target)) return
      ;(setSelectedRegionId as (value: string | null) => void)(null)
    }

    document.addEventListener('pointerdown', handlePointerDown, true)
    return () => document.removeEventListener('pointerdown', handlePointerDown, true)
  }, [setSelectedRegionId])

  return (
    <div
      ref={popupRef}
      className="pointer-events-auto fixed bottom-32 left-4 z-30 w-80 rounded-2xl border border-stone-200/60 bg-white/95 p-4 shadow-lg backdrop-blur-xl"
    >
      <div className="mb-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-stone-400">
          Region Info
        </span>
        <h3 className="mt-1 text-xl font-semibold text-stone-900">{title}</h3>
        <p className="text-sm text-stone-500">{subtitle}</p>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-sm">
        {dataset === 'world' ? (
          <>
            <div className="rounded-lg bg-stone-50 p-2">
              <span className="text-xs text-stone-400">Continent</span>
              <p className="font-medium text-stone-700">{region.continent ?? 'Unknown'}</p>
            </div>
            <div className="rounded-lg bg-stone-50 p-2">
              <span className="text-xs text-stone-400">Subregion</span>
              <p className="font-medium text-stone-700">{region.subregion ?? 'Unknown'}</p>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-lg bg-stone-50 p-2">
              <span className="text-xs text-stone-400">Province</span>
              <p className="font-medium text-stone-700">{region.parentNameZh ?? 'Unknown'}</p>
            </div>
            <div className="rounded-lg bg-stone-50 p-2">
              <span className="text-xs text-stone-400">Level</span>
              <p className="font-medium text-stone-700">{region.level ?? 'Unknown'}</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// 训练结果弹窗
function TrainingResultPopup() {
  const session = useAtomValue(trainingSessionAtom)
  const nextQuestion = useSetAtom(nextQuestionAtom)
  
  if (!session) return null

  const { prompt, status, userAnswer } = session
  const hasAnswered = userAnswer !== null
  
  // 获取反馈文本
  let feedbackText = ''
  let feedbackClass = ''
  let feedbackIcon = ''
  
  if (status === 'correct') {
    feedbackText = '回答正确！'
    feedbackClass = 'bg-emerald-50 text-emerald-900'
    feedbackIcon = '✓'
  } else if (status === 'wrong') {
    feedbackText = '回答错误'
    feedbackClass = 'bg-rose-50 text-rose-900'
    feedbackIcon = '✗'
  }
  
  return (
    <div className="pointer-events-auto fixed left-1/2 top-1/2 z-30 w-96 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-stone-200/60 bg-white/95 p-6 shadow-xl backdrop-blur-xl">
      {/* 题目展示 */}
      <div className="mb-4">
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-stone-400">
          题目
        </span>
        <h3 className="mt-1 text-lg font-semibold text-stone-800">
          {prompt.content}
        </h3>
      </div>
      
      {/* 结果展示 */}
      {hasAnswered && (
        <div className={`mb-4 rounded-xl p-4 ${feedbackClass}`}>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{feedbackIcon}</span>
            <span className="font-semibold">{feedbackText}</span>
          </div>
        </div>
      )}
      
      {/* 操作按钮 */}
      <div className="flex gap-2">
        <button
          onClick={() => nextQuestion()}
          className="flex-1 rounded-full bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
        >
          {hasAnswered ? '下一题' : '跳过'}
        </button>
      </div>
    </div>
  )
}

export { selectedRegionIdForExploreAtom }
