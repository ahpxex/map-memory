import type { FeatureCollection, Geometry, Position } from 'geojson'
import type { Dataset, RegionFeature, RegionMeta } from '../../types/training'
import { WORLD_CAPITALS } from './regionKnowledge'

type FeatureWithName = FeatureCollection<Geometry, { name: string }>

const SEGMENT_PRECISION = 5

function quantize(value: number) {
  return value.toFixed(SEGMENT_PRECISION)
}

function pointKey([x, y]: Position) {
  return `${quantize(x)}:${quantize(y)}`
}

function segmentKey(start: Position, end: Position) {
  const startKey = pointKey(start)
  const endKey = pointKey(end)
  return startKey < endKey ? `${startKey}|${endKey}` : `${endKey}|${startKey}`
}

function extractSegments(geometry: Geometry | null | undefined) {
  const segments: string[] = []
  if (!geometry) return segments

  const rings =
    geometry.type === 'Polygon'
      ? geometry.coordinates
      : geometry.type === 'MultiPolygon'
        ? geometry.coordinates.flat()
        : []

  for (const ring of rings) {
    for (let index = 1; index < ring.length; index += 1) {
      const start = ring[index - 1]
      const end = ring[index]
      segments.push(segmentKey(start, end))
    }
  }

  return segments
}

function buildNeighborMap(featureCollection: FeatureWithName) {
  const segmentOwners = new Map<string, Set<string>>()
  const neighbors = new Map<string, Set<string>>()

  for (const feature of featureCollection.features) {
    const regionId = feature.properties?.name
    if (!regionId) continue

    if (!neighbors.has(regionId)) {
      neighbors.set(regionId, new Set())
    }

    const uniqueSegments = new Set(extractSegments(feature.geometry))
    for (const segment of uniqueSegments) {
      const owners = segmentOwners.get(segment) ?? new Set<string>()
      owners.add(regionId)
      segmentOwners.set(segment, owners)
    }
  }

  for (const owners of segmentOwners.values()) {
    if (owners.size < 2) continue
    const ownerList = Array.from(owners)
    for (const owner of ownerList) {
      const ownerNeighbors = neighbors.get(owner) ?? new Set<string>()
      for (const candidate of ownerList) {
        if (candidate !== owner) {
          ownerNeighbors.add(candidate)
        }
      }
      neighbors.set(owner, ownerNeighbors)
    }
  }

  return neighbors
}

function formatMixedLabel(nameZh: string, nameEn: string) {
  return nameZh === nameEn ? nameZh : `${nameZh} / ${nameEn}`
}

function stripChinaSuffix(nameZh: string) {
  return nameZh
    .replace(/(维吾尔自治区|壮族自治区|回族自治区|自治区|特别行政区|自治州|地区|盟)$/u, '')
    .replace(/(省|市)$/u, '')
}

function unique(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value))))
}

function buildAliases(dataset: Dataset, region: RegionMeta) {
  if (dataset === 'china') {
    return unique([
      region.nameZh,
      stripChinaSuffix(region.nameZh),
      region.nameEn,
      region.parentNameZh,
      region.parentNameEn,
    ])
  }

  return unique([
    region.nameZh,
    region.nameEn,
    region.formalNameEn,
    region.isoA2 ?? undefined,
    region.isoA3 ?? undefined,
  ])
}

function buildParentId(dataset: Dataset, region: RegionMeta) {
  if (dataset === 'china') {
    if (!region.parentAdcode) return null
    if (region.parentAdcode === 100000) return 'country:cn'
    return `province:${region.parentAdcode}`
  }

  if (!region.continent) return null
  return `continent:${region.continent.toLowerCase().replace(/\s+/g, '-')}`
}

function buildCapital(dataset: Dataset, region: RegionMeta) {
  if (dataset === 'world') {
    return WORLD_CAPITALS[region.id] ?? null
  }
  return null
}

export function buildRegionFeatureMap(
  dataset: Dataset,
  featureCollection: FeatureCollection<Geometry, { name: string }>,
  regionById: Map<string, RegionMeta>,
) {
  const neighborMap = buildNeighborMap(featureCollection as FeatureWithName)
  const regionFeatures = new Map<string, RegionFeature>()

  for (const feature of featureCollection.features) {
    const regionId = feature.properties?.name
    if (!regionId) continue

    const region = regionById.get(regionId)
    if (!region) continue

    const neighbors = Array.from(neighborMap.get(regionId) ?? []).sort((left, right) => left.localeCompare(right))
    regionFeatures.set(regionId, {
      id: regionId,
      dataset,
      geometry: feature.geometry,
      labels: {
        zh: region.nameZh,
        en: region.nameEn,
        mixed: formatMixedLabel(region.nameZh, region.nameEn),
      },
      aliases: buildAliases(dataset, region),
      parentId: buildParentId(dataset, region),
      neighbors,
      metadata: {
        continent: region.continent ?? null,
        subregion: region.subregion ?? null,
        population: region.population ?? null,
        capital: buildCapital(dataset, region),
        level: region.level ?? null,
        parentNameZh: region.parentNameZh ?? null,
        parentNameEn: region.parentNameEn ?? null,
        formalNameEn: region.formalNameEn ?? null,
        neighborCount: neighbors.length,
      },
      region,
    })
  }

  return regionFeatures
}
