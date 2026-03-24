import type { DatasetMode, RegionMeta } from '../../types/app'
import {
  CHINA_MAP_KEY,
  chinaRegionById,
  chinaRegionIds,
  loadChinaFeatureCollection,
} from './chinaDataset'
import {
  WORLD_MAP_KEY,
  loadWorldFeatureCollection,
  worldRegionById,
  worldRegionIds,
} from './worldDataset'

export type DatasetConfig = {
  dataset: DatasetMode
  mapKey: string
  loadFeatureCollection: () => Promise<object>
  regionIds: string[]
  regionById: Map<string, RegionMeta>
}

export const datasetConfigs: Record<DatasetMode, DatasetConfig> = {
  world: {
    dataset: 'world',
    mapKey: WORLD_MAP_KEY,
    loadFeatureCollection: loadWorldFeatureCollection as () => Promise<object>,
    regionIds: worldRegionIds,
    regionById: worldRegionById,
  },
  china: {
    dataset: 'china',
    mapKey: CHINA_MAP_KEY,
    loadFeatureCollection: loadChinaFeatureCollection as () => Promise<object>,
    regionIds: chinaRegionIds,
    regionById: chinaRegionById,
  },
}
