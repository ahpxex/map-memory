import type { FeatureCollection, Geometry } from 'geojson'
import type { RegionMeta } from '../../types/app'
import worldMetadataJson from '../../data/world/world.metadata.json'

export const WORLD_MAP_KEY = 'map-memory-world'

type WorldFeatureProperties = {
  name: string
  nameEn: string
  nameZh: string
}

export const worldRegionMetadata =
  worldMetadataJson as Record<string, RegionMeta>

export const worldRegions = Object.values(worldRegionMetadata).toSorted((left, right) =>
  left.nameEn.localeCompare(right.nameEn),
)

export const worldRegionIds = worldRegions.map((region) => region.id)

export const worldRegionById = new Map(worldRegions.map((region) => [region.id, region]))

export async function loadWorldFeatureCollection() {
  const response = await fetch('/data/world/world.geo.json')

  if (!response.ok) {
    throw new Error(`Failed to load world map data: ${response.status}`)
  }

  return (await response.json()) as FeatureCollection<Geometry, WorldFeatureProperties>
}
