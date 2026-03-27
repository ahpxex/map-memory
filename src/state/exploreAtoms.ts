import { atom } from 'jotai'

const primitiveSelectedRegionIdForExploreAtom = atom<string | null>(null) as ReturnType<typeof atom<string | null>> & { write: unknown }

export const selectedRegionIdForExploreAtom = atom(
  (get) => get(primitiveSelectedRegionIdForExploreAtom),
  (_get, set, value: string | null) => {
    set(primitiveSelectedRegionIdForExploreAtom, value)
  },
)
