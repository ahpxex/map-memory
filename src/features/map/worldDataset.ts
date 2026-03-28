import type { FeatureCollection, Geometry } from 'geojson'
import type { RegionFeature, RegionMeta } from '../../types/training'
import worldMetadataJson from '../../data/world/world.metadata.json'
import { buildRegionFeatureMap } from './regionFeatures'

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

let worldFeatureCollectionPromise: Promise<FeatureCollection<Geometry, WorldFeatureProperties>> | null = null
let worldRegionFeatureMapPromise: Promise<Map<string, RegionFeature>> | null = null

export async function loadWorldFeatureCollection() {
  if (!worldFeatureCollectionPromise) {
    worldFeatureCollectionPromise = fetch('/data/world/world.geo.json').then(async (response) => {
      if (!response.ok) {
        throw new Error(`Failed to load world map data: ${response.status}`)
      }
      return (await response.json()) as FeatureCollection<Geometry, WorldFeatureProperties>
    })
  }

  return worldFeatureCollectionPromise
}

export async function loadWorldRegionFeatureMap() {
  if (!worldRegionFeatureMapPromise) {
    worldRegionFeatureMapPromise = loadWorldFeatureCollection().then((featureCollection) =>
      buildRegionFeatureMap('world', featureCollection, worldRegionById),
    )
  }

  return worldRegionFeatureMapPromise
}
