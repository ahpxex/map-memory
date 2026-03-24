import type { FeatureCollection, Geometry } from 'geojson'
import type { RegionMeta } from '../../types/app'
import worldGeoJson from '../../data/world/world.geo.json'
import worldMetadataJson from '../../data/world/world.metadata.json'

export const WORLD_MAP_KEY = 'map-memory-world'

type WorldFeatureProperties = {
  name: string
  nameEn: string
  nameZh: string
}

export const worldFeatureCollection =
  worldGeoJson as FeatureCollection<Geometry, WorldFeatureProperties>

export const worldRegionMetadata =
  worldMetadataJson as Record<string, RegionMeta>

export const worldRegions = Object.values(worldRegionMetadata).toSorted((left, right) =>
  left.nameEn.localeCompare(right.nameEn),
)

export const worldRegionIds = worldRegions.map((region) => region.id)

export const worldRegionById = new Map(worldRegions.map((region) => [region.id, region]))
