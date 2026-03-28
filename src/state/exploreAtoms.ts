import { atom } from 'jotai'

export type ExplorePopupState = {
  regionId: string
  anchor: {
    x: number
    y: number
  }
}

const primitiveSelectedRegionIdForExploreAtom = atom<ExplorePopupState | null>(null) as ReturnType<typeof atom<ExplorePopupState | null>> & { write: unknown }

export const selectedRegionIdForExploreAtom = atom(
  (get) => get(primitiveSelectedRegionIdForExploreAtom),
  (_get, set, value: ExplorePopupState | null) => {
    set(primitiveSelectedRegionIdForExploreAtom, value)
  },
)
