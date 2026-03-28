import type { Dataset, RegionFeature, RegionMeta } from '../../types/training'
import {
  CHINA_MAP_KEY,
  chinaRegionById,
  chinaRegionIds,
  loadChinaFeatureCollection,
  loadChinaRegionFeatureMap,
} from './chinaDataset'
import {
  WORLD_MAP_KEY,
  loadWorldFeatureCollection,
  loadWorldRegionFeatureMap,
  worldRegionById,
  worldRegionIds,
} from './worldDataset'

export type DatasetConfig = {
  dataset: Dataset
  mapKey: string
  loadFeatureCollection: () => Promise<object>
  loadRegionFeatureMap: () => Promise<Map<string, RegionFeature>>
  regionIds: string[]
  regionById: Map<string, RegionMeta>
}

export const datasetConfigs: Record<Dataset, DatasetConfig> = {
  world: {
    dataset: 'world',
    mapKey: WORLD_MAP_KEY,
    loadFeatureCollection: loadWorldFeatureCollection as () => Promise<object>,
    loadRegionFeatureMap: loadWorldRegionFeatureMap,
    regionIds: worldRegionIds,
    regionById: worldRegionById,
  },
  china: {
    dataset: 'china',
    mapKey: CHINA_MAP_KEY,
    loadFeatureCollection: loadChinaFeatureCollection as () => Promise<object>,
    loadRegionFeatureMap: loadChinaRegionFeatureMap,
    regionIds: chinaRegionIds,
    regionById: chinaRegionById,
  },
}
