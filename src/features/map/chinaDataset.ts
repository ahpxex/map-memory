import type { FeatureCollection, Geometry } from 'geojson'
import type { RegionMeta } from '../../types/app'
import chinaMetadataJson from '../../data/china/china.metadata.json'

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

export async function loadChinaFeatureCollection() {
  const module = await import('../../data/china/china.geo.json')

  return module.default as FeatureCollection<Geometry, ChinaFeatureProperties>
}
