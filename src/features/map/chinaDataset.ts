import type { FeatureCollection, Geometry } from 'geojson'
import type { RegionFeature, RegionMeta } from '../../types/training'
import chinaMetadataJson from '../../data/china/china.metadata.json'
import { buildRegionFeatureMap } from './regionFeatures'

export const CHINA_MAP_KEY = 'map-memory-china'

type ChinaFeatureProperties = {
  name: string
  nameEn: string
  nameZh: string
  provinceAdcode: number
  provinceNameZh: string
}

export const chinaRegionMetadata =
  chinaMetadataJson as Record<string, RegionMeta>

export const chinaRegions = Object.values(chinaRegionMetadata).toSorted((left, right) =>
  left.nameZh.localeCompare(right.nameZh, 'zh-Hans-CN'),
)

export const chinaRegionIds = chinaRegions.map((region) => region.id)

export const chinaRegionById = new Map(chinaRegions.map((region) => [region.id, region]))

let chinaFeatureCollectionPromise: Promise<FeatureCollection<Geometry, ChinaFeatureProperties>> | null = null
let chinaRegionFeatureMapPromise: Promise<Map<string, RegionFeature>> | null = null

export async function loadChinaFeatureCollection() {
  if (!chinaFeatureCollectionPromise) {
    chinaFeatureCollectionPromise = fetch('/data/china/china.geo.json').then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load china map data: ${response.status}`)
      }
      return (await response.json()) as FeatureCollection<Geometry, ChinaFeatureProperties>
    })
  }

  return chinaFeatureCollectionPromise
}

export async function loadChinaRegionFeatureMap() {
  if (!chinaRegionFeatureMapPromise) {
    chinaRegionFeatureMapPromise = loadChinaFeatureCollection().then((featureCollection) =>
      buildRegionFeatureMap('china', featureCollection, chinaRegionById),
    )
  }

  return chinaRegionFeatureMapPromise
}
