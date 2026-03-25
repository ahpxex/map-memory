import { useAtomValue } from 'jotai'
import { MapCanvas } from '../features/map/MapCanvas'
import { RegionPopup } from '../components/RegionPopup'
import { datasetAtom } from '../state/appAtoms'

export function MapStage() {
  const dataset = useAtomValue(datasetAtom)

  return (
    <>
      <MapCanvas key={dataset} />
      <RegionPopup />
    </>
  )
}
