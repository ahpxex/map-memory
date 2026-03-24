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
  '../src/data/world/world.geo.json',
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

const raw = JSON.parse(await readFile(worldSourcePath, 'utf8'))

const selectedFeatures = raw.features.filter((feature) => {
  const properties = feature.properties ?? {}

  return (
    properties.ADMIN === properties.SOVEREIGNT &&
    !excludedNames.has(properties.NAME_EN)
  )
})

const metadata = {}
const outputFeatures = selectedFeatures.map((feature) => {
  const properties = feature.properties ?? {}
  const regionId = makeRegionId(properties)

  metadata[regionId] = {
    id: regionId,
    isoA2: properties.ISO_A2 && properties.ISO_A2 !== '-99' ? properties.ISO_A2 : null,
    isoA3: properties.ADM0_A3 ?? null,
    nameEn: properties.NAME_EN ?? properties.NAME ?? regionId,
    nameZh: properties.NAME_ZH ?? properties.NAME_EN ?? regionId,
    formalNameEn: properties.FORMAL_EN ?? properties.NAME_EN ?? regionId,
    continent: properties.CONTINENT ?? null,
    regionUn: properties.REGION_UN ?? null,
    subregion: properties.SUBREGION ?? null,
    population: properties.POP_EST ?? null,
    wikidataId: properties.WIKIDATAID ?? null,
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
