import { startTransition, useEffect, useRef } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  currentPromptRegionAtom,
  datasetAtom,
  dismissPopupAtom,
  languageAtom,
  popupStateAtom,
  selectedRegionAtom,
  startNextTrainingRoundAtom,
  trainingSessionAtom,
} from '../state/appAtoms'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function formatPopulation(value: number | null | undefined) {
  if (!value) {
    return 'Unknown'
  }

  return new Intl.NumberFormat('en-US').format(value)
}

export function RegionPopup() {
  const popupRef = useRef<HTMLDivElement | null>(null)
  const popupState = useAtomValue(popupStateAtom)
  const dataset = useAtomValue(datasetAtom)
  const language = useAtomValue(languageAtom)
  const selectedRegion = useAtomValue(selectedRegionAtom)
  const currentPromptRegion = useAtomValue(currentPromptRegionAtom)
  const trainingSession = useAtomValue(trainingSessionAtom)
  const dismissPopup = useSetAtom(dismissPopupAtom)
  const startNextTrainingRound = useSetAtom(startNextTrainingRoundAtom)

  useEffect(() => {
    if (!popupState || !selectedRegion) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      const popupElement = popupRef.current

      if (!popupElement) {
        return
      }

      if (event.target instanceof Node && popupElement.contains(event.target)) {
        return
      }

      dismissPopup()
    }

    document.addEventListener('pointerdown', handlePointerDown, true)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true)
    }
  }, [dismissPopup, popupState, selectedRegion])

  if (!popupState || !selectedRegion) {
    return null
  }

  const popupWidth = 336
  const popupHeight = popupState.kind === 'training' ? 250 : 280
  const left = clamp(popupState.x + 18, 16, window.innerWidth - popupWidth - 16)
  const top = clamp(popupState.y - popupHeight / 2, 16, window.innerHeight - popupHeight - 96)
  const title = language === 'en' ? selectedRegion.nameEn : selectedRegion.nameZh
  const subtitle = language === 'en' ? selectedRegion.nameZh : selectedRegion.nameEn
  const targetTitle = language === 'en' ? currentPromptRegion?.nameEn : currentPromptRegion?.nameZh

  return (
    <div
      className="fixed z-30 w-80 rounded-2xl border border-stone-200/60 bg-white/80 p-4 shadow-lg backdrop-blur-xl"
      ref={popupRef}
      style={{ left, top }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-stone-400">
            {popupState.kind === 'training' ? 'Training result' : 'Region overview'}
          </p>
          <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-stone-900">{title}</h3>
          <p className="mt-0.5 text-sm text-stone-500">{subtitle}</p>
        </div>

        <button
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
          onClick={() => dismissPopup()}
          type="button"
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4">
            <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {popupState.kind === 'explore' ? (
        dataset === 'world' ? (
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-stone-700">
            <div className="rounded-xl bg-stone-100/60 p-2.5">
              <dt className="text-[10px] uppercase tracking-[0.15em] text-stone-400">Continent</dt>
              <dd className="mt-1 font-medium text-stone-800">{selectedRegion.continent ?? 'Unknown'}</dd>
            </div>
            <div className="rounded-xl bg-stone-100/60 p-2.5">
              <dt className="text-[10px] uppercase tracking-[0.15em] text-stone-400">Subregion</dt>
              <dd className="mt-1 font-medium text-stone-800">{selectedRegion.subregion ?? 'Unknown'}</dd>
            </div>
            <div className="rounded-xl bg-stone-100/60 p-2.5">
              <dt className="text-[10px] uppercase tracking-[0.15em] text-stone-400">Population</dt>
              <dd className="mt-1 font-medium text-stone-800">{formatPopulation(selectedRegion.population)}</dd>
            </div>
            <div className="rounded-xl bg-stone-100/60 p-2.5">
              <dt className="text-[10px] uppercase tracking-[0.15em] text-stone-400">Formal name</dt>
              <dd className="mt-1 font-medium text-stone-800">{selectedRegion.formalNameEn ?? selectedRegion.nameEn}</dd>
            </div>
          </dl>
        ) : (
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm text-stone-700">
            <div className="rounded-xl bg-stone-100/60 p-2.5">
              <dt className="text-[10px] uppercase tracking-[0.15em] text-stone-400">Province</dt>
              <dd className="mt-1 font-medium text-stone-800">
                {language === 'en'
                  ? selectedRegion.parentNameEn ?? selectedRegion.parentNameZh ?? 'Unknown'
                  : selectedRegion.parentNameZh ?? selectedRegion.parentNameEn ?? 'Unknown'}
              </dd>
            </div>
            <div className="rounded-xl bg-stone-100/60 p-2.5">
              <dt className="text-[10px] uppercase tracking-[0.15em] text-stone-400">Level</dt>
              <dd className="mt-1 font-medium text-stone-800">{selectedRegion.level ?? 'Unknown'}</dd>
            </div>
            <div className="rounded-xl bg-stone-100/60 p-2.5">
              <dt className="text-[10px] uppercase tracking-[0.15em] text-stone-400">Adcode</dt>
              <dd className="mt-1 font-medium text-stone-800">{selectedRegion.adcode ?? 'Unknown'}</dd>
            </div>
            <div className="rounded-xl bg-stone-100/60 p-2.5">
              <dt className="text-[10px] uppercase tracking-[0.15em] text-stone-400">Center</dt>
              <dd className="mt-1 font-medium text-stone-800">
                {selectedRegion.center
                  ? `${selectedRegion.center[0].toFixed(2)}, ${selectedRegion.center[1].toFixed(2)}`
                  : 'Unknown'}
              </dd>
            </div>
          </dl>
        )
      ) : (
        <div className="mt-3 space-y-2">
          <div className="rounded-xl bg-stone-100/60 p-2.5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-stone-400">Target</p>
            <p className="mt-1 text-sm font-medium text-stone-800">{targetTitle}</p>
          </div>

          <div
            className={`rounded-xl p-2.5 ${
              trainingSession.result === 'correct'
                ? 'bg-emerald-50/80 text-emerald-900'
                : 'bg-rose-50/80 text-rose-900'
            }`}
          >
            <p className="text-[10px] uppercase tracking-[0.15em] opacity-70">Result</p>
            <p className="mt-1 text-sm font-semibold">
              {trainingSession.result === 'correct' ? 'Correct' : 'Wrong region'}
            </p>
            {trainingSession.result === 'wrong' ? (
              <p className="mt-1.5 text-xs leading-5">
                You clicked{' '}
                <span className="font-semibold">{title}</span>. The correct answer is{' '}
                <span className="font-semibold">{targetTitle}</span>.
              </p>
            ) : null}
          </div>

          <button
            className="w-full rounded-full bg-stone-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700"
            onClick={() => {
              startTransition(() => {
                startNextTrainingRound()
              })
            }}
            type="button"
          >
            Next question
          </button>
        </div>
      )}
    </div>
  )
}
