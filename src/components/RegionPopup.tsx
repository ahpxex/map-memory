import { startTransition } from 'react'
import { useAtomValue, useSetAtom } from 'jotai'
import {
  datasetAtom,
  dismissPopupAtom,
  interactionModeAtom,
  languageAtom,
  popupStateAtom,
  selectedRegionAtom,
  startNextTrainingRoundAtom,
  trainingSessionAtom,
  currentPromptRegionAtom,
} from '../state/appAtoms'
import { worldRegionById } from '../features/map/worldDataset'

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function formatPopulation(value: number | null) {
  if (!value) {
    return 'Unknown'
  }

  return new Intl.NumberFormat('en-US').format(value)
}

export function RegionPopup() {
  const popupState = useAtomValue(popupStateAtom)
  const dataset = useAtomValue(datasetAtom)
  const interactionMode = useAtomValue(interactionModeAtom)
  const language = useAtomValue(languageAtom)
  const selectedRegion = useAtomValue(selectedRegionAtom)
  const currentPromptRegion = useAtomValue(currentPromptRegionAtom)
  const trainingSession = useAtomValue(trainingSessionAtom)
  const dismissPopup = useSetAtom(dismissPopupAtom)
  const startNextTrainingRound = useSetAtom(startNextTrainingRoundAtom)

  if (!popupState || dataset !== 'world') {
    return null
  }

  const activeRegion = worldRegionById.get(popupState.regionId) ?? selectedRegion

  if (!activeRegion) {
    return null
  }

  const popupWidth = 320
  const popupHeight = interactionMode === 'training' ? 240 : 260
  const left = clamp(popupState.x + 18, 16, window.innerWidth - popupWidth - 16)
  const top = clamp(popupState.y - popupHeight / 2, 16, window.innerHeight - popupHeight - 96)
  const title = language === 'en' ? activeRegion.nameEn : activeRegion.nameZh
  const subtitle = language === 'en' ? activeRegion.nameZh : activeRegion.nameEn

  return (
    <div
      className="fixed z-30 w-80 rounded-[28px] border border-stone-900/10 bg-white/88 p-4 shadow-[0_30px_90px_rgba(20,26,18,0.18)] backdrop-blur-xl"
      style={{ left, top }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-stone-500">
            {popupState.kind === 'training' ? 'Training result' : 'Region overview'}
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-stone-950">
            {title}
          </h3>
          <p className="mt-1 text-sm text-stone-600">{subtitle}</p>
        </div>

        <button
          className="rounded-full border border-stone-900/10 px-3 py-1.5 text-xs font-medium text-stone-600 transition hover:border-stone-900/20 hover:bg-stone-100"
          onClick={() => dismissPopup()}
          type="button"
        >
          Close
        </button>
      </div>

      {popupState.kind === 'explore' ? (
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-stone-700">
          <div className="rounded-2xl bg-stone-100/80 p-3">
            <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Continent</dt>
            <dd className="mt-2 font-medium text-stone-900">{activeRegion.continent ?? 'Unknown'}</dd>
          </div>
          <div className="rounded-2xl bg-stone-100/80 p-3">
            <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Subregion</dt>
            <dd className="mt-2 font-medium text-stone-900">{activeRegion.subregion ?? 'Unknown'}</dd>
          </div>
          <div className="rounded-2xl bg-stone-100/80 p-3">
            <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Population</dt>
            <dd className="mt-2 font-medium text-stone-900">{formatPopulation(activeRegion.population)}</dd>
          </div>
          <div className="rounded-2xl bg-stone-100/80 p-3">
            <dt className="text-xs uppercase tracking-[0.18em] text-stone-500">Formal name</dt>
            <dd className="mt-2 font-medium text-stone-900">{activeRegion.formalNameEn}</dd>
          </div>
        </dl>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl bg-stone-100/85 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-stone-500">Target</p>
            <p className="mt-2 text-base font-medium text-stone-950">
              {language === 'en' ? currentPromptRegion?.nameEn : currentPromptRegion?.nameZh}
            </p>
          </div>

          <div
            className={`rounded-2xl p-3 ${
              trainingSession.result === 'correct'
                ? 'bg-emerald-100 text-emerald-950'
                : 'bg-rose-100 text-rose-950'
            }`}
          >
            <p className="text-xs uppercase tracking-[0.18em] opacity-70">Result</p>
            <p className="mt-2 text-base font-semibold">
              {trainingSession.result === 'correct' ? 'Correct' : 'Wrong region'}
            </p>
            {trainingSession.result === 'wrong' ? (
              <p className="mt-2 text-sm leading-6">
                You clicked{' '}
                <span className="font-semibold">
                  {language === 'en' ? activeRegion.nameEn : activeRegion.nameZh}
                </span>
                . The correct answer is{' '}
                <span className="font-semibold">
                  {language === 'en' ? currentPromptRegion?.nameEn : currentPromptRegion?.nameZh}
                </span>
                .
              </p>
            ) : null}
          </div>

          <button
            className="w-full rounded-full bg-stone-950 px-4 py-3 text-sm font-semibold text-stone-50 transition hover:-translate-y-0.5 hover:bg-stone-800"
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
