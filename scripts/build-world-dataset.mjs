import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const worldSourcePath = path.resolve(
  __dirname,
  '../src/data/world/world-source.geo.json',
)
const worldOutputPath = path.resolve(
  __dirname,
  '../public/data/world/world.geo.json',
)
const metadataOutputPath = path.resolve(
  __dirname,
  '../src/data/world/world.metadata.json',
)

const excludedNames = new Set([
  'Antarctica',
  'Somaliland',
  'Turkish Republic of Northern Cyprus',
])

const regionOverrides = {
  cn: {
    nameZh: '中国',
  },
}

function toMultiPolygonCoordinates(geometry) {
  if (!geometry) {
    return []
  }

  if (geometry.type === 'Polygon') {
    return [geometry.coordinates]
  }

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates
  }

  return []
}

function mergeFeatureGeometry(baseFeature, appendedFeature) {
  return {
    ...baseFeature,
    geometry: {
      type: 'MultiPolygon',
      coordinates: [
        ...toMultiPolygonCoordinates(baseFeature.geometry),
        ...toMultiPolygonCoordinates(appendedFeature.geometry),
      ],
    },
  }
}

function makeRegionId(properties) {
  const iso2 = properties.ISO_A2

  if (iso2 && iso2 !== '-99') {
    return iso2.toLowerCase()
  }

  return String(properties.ADM0_A3 || properties.NAME_EN)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function visitCoordinates(coordinates, visit) {
  if (!Array.isArray(coordinates)) {
    return
  }

  if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
    visit(coordinates[0], coordinates[1])
    return
  }

  for (const child of coordinates) {
    visitCoordinates(child, visit)
  }
}

function computeLabelWeight(geometry) {
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY

  visitCoordinates(geometry?.coordinates, (x, y) => {
    minX = Math.min(minX, x)
    minY = Math.min(minY, y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, y)
  })

  if (!Number.isFinite(minX) || !Number.isFinite(minY)) {
    return 0
  }

  return Number(((maxX - minX) * (maxY - minY)).toFixed(4))
}

const raw = JSON.parse(await readFile(worldSourcePath, 'utf8'))

const filteredFeatures = raw.features.filter((feature) => {
  const properties = feature.properties ?? {}

  return (
    properties.ADMIN === properties.SOVEREIGNT &&
    !excludedNames.has(properties.NAME_EN)
  )
})

const taiwanFeature = filteredFeatures.find(
  (feature) => makeRegionId(feature.properties ?? {}) === 'cn-tw',
)

const selectedFeatures = filteredFeatures
  .filter((feature) => makeRegionId(feature.properties ?? {}) !== 'cn-tw')
  .map((feature) => {
    if (makeRegionId(feature.properties ?? {}) !== 'cn' || !taiwanFeature) {
      return feature
    }

    return mergeFeatureGeometry(feature, taiwanFeature)
  })

const metadata = {}
const outputFeatures = selectedFeatures.map((feature) => {
  const properties = feature.properties ?? {}
  const regionId = makeRegionId(properties)
  const overrides = regionOverrides[regionId] ?? {}

  metadata[regionId] = {
    id: regionId,
    isoA2: properties.ISO_A2 && properties.ISO_A2 !== '-99' ? properties.ISO_A2 : null,
    isoA3: properties.ADM0_A3 ?? null,
    nameEn: properties.NAME_EN ?? properties.NAME ?? regionId,
    nameZh: overrides.nameZh ?? properties.NAME_ZH ?? properties.NAME_EN ?? regionId,
    formalNameEn: properties.FORMAL_EN ?? properties.NAME_EN ?? regionId,
    continent: properties.CONTINENT ?? null,
    regionUn: properties.REGION_UN ?? null,
    subregion: properties.SUBREGION ?? null,
    population: properties.POP_EST ?? null,
    wikidataId: properties.WIKIDATAID ?? null,
    labelWeight: computeLabelWeight(feature.geometry),
  }

  return {
    type: feature.type,
    id: regionId,
    properties: {
      name: regionId,
      nameEn: metadata[regionId].nameEn,
      nameZh: metadata[regionId].nameZh,
    },
    geometry: feature.geometry,
  }
})

await mkdir(path.dirname(worldOutputPath), { recursive: true })

await writeFile(
  worldOutputPath,
  JSON.stringify(
    {
      type: 'FeatureCollection',
      features: outputFeatures,
    },
    null,
    2,
  ),
)

await writeFile(metadataOutputPath, JSON.stringify(metadata, null, 2))

console.log(
  JSON.stringify(
    {
      sourceFeatures: raw.features.length,
      selectedFeatures: outputFeatures.length,
      outputGeoJson: worldOutputPath,
      outputMetadata: metadataOutputPath,
    },
    null,
    2,
  ),
)
