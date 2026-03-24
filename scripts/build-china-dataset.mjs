import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pinyin } from 'pinyin-pro'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const chinaSourcePath = path.resolve(
  __dirname,
  '../src/data/china/china-provinces-source.geo.json',
)
const provinceSourceDir = path.resolve(__dirname, '../src/data/china/provinces')
const chinaPublicOutputPath = path.resolve(__dirname, '../public/data/china/china.geo.json')
const metadataOutputPath = path.resolve(
  __dirname,
  '../src/data/china/china.metadata.json',
)

const specialProvinceFallbacks = new Set([
  110000, // Beijing
  120000, // Tianjin
  310000, // Shanghai
  500000, // Chongqing
  710000, // Taiwan
  810000, // Hong Kong
  820000, // Macau
])

const specialEnglishNames = new Map([
  [110000, 'Beijing'],
  [120000, 'Tianjin'],
  [310000, 'Shanghai'],
  [500000, 'Chongqing'],
  [710000, 'Taiwan'],
  [810000, 'Hong Kong'],
  [820000, 'Macau'],
])

function toPinyinName(name) {
  return pinyin(name, { toneType: 'none', type: 'array' })
    .map((syllable) =>
      syllable ? syllable[0].toUpperCase() + syllable.slice(1) : syllable,
    )
    .join(' ')
}

function makeRegionId(adcode) {
  return `cn-${adcode}`
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

const provinceCollection = JSON.parse(await readFile(chinaSourcePath, 'utf8'))
const metadata = {}
const outputFeatures = []

for (const provinceFeature of provinceCollection.features) {
  const provinceProps = provinceFeature.properties ?? {}
  const provinceAdcode = Number(provinceProps.adcode)
  const provinceNameZh = provinceProps.name

  if (!Number.isFinite(provinceAdcode) || !provinceNameZh) {
    continue
  }

  const provinceNameEn =
    specialEnglishNames.get(provinceAdcode) ?? toPinyinName(provinceNameZh)

  if (specialProvinceFallbacks.has(provinceAdcode)) {
    const regionId = makeRegionId(provinceAdcode)

    metadata[regionId] = {
      id: regionId,
      adcode: provinceAdcode,
      level: 'special',
      nameZh: provinceNameZh,
      nameEn: provinceNameEn,
      parentAdcode: 100000,
      parentNameZh: '中国',
      parentNameEn: 'China',
      centroid: provinceProps.centroid ?? provinceProps.center ?? null,
      center: provinceProps.center ?? null,
      labelWeight: computeLabelWeight(provinceFeature.geometry),
    }

    outputFeatures.push({
      type: provinceFeature.type,
      id: regionId,
      properties: {
        name: regionId,
        nameZh: provinceNameZh,
        nameEn: provinceNameEn,
        provinceAdcode,
        provinceNameZh,
      },
      geometry: provinceFeature.geometry,
    })

    continue
  }

  const provinceSourcePath = path.join(provinceSourceDir, `${provinceAdcode}.json`)
  const provinceChildCollection = JSON.parse(await readFile(provinceSourcePath, 'utf8'))

  for (const childFeature of provinceChildCollection.features) {
    const childProps = childFeature.properties ?? {}

    if (childProps.level !== 'city') {
      continue
    }

    const adcode = Number(childProps.adcode)
    const nameZh = childProps.name
    const nameEn = toPinyinName(nameZh)
    const regionId = makeRegionId(adcode)

    metadata[regionId] = {
      id: regionId,
      adcode,
      level: 'city',
      nameZh,
      nameEn,
      parentAdcode: provinceAdcode,
      parentNameZh: provinceNameZh,
      parentNameEn: provinceNameEn,
      centroid: childProps.centroid ?? childProps.center ?? null,
      center: childProps.center ?? null,
      labelWeight: computeLabelWeight(childFeature.geometry),
    }

    outputFeatures.push({
      type: childFeature.type,
      id: regionId,
      properties: {
        name: regionId,
        nameZh,
        nameEn,
        provinceAdcode,
        provinceNameZh,
      },
      geometry: childFeature.geometry,
    })
  }
}

await mkdir(path.dirname(chinaPublicOutputPath), { recursive: true })

const outputGeoJson = JSON.stringify(
  {
    type: 'FeatureCollection',
    features: outputFeatures,
  },
  null,
  2,
)

await writeFile(chinaPublicOutputPath, outputGeoJson)

await writeFile(metadataOutputPath, JSON.stringify(metadata, null, 2))

console.log(
  JSON.stringify(
    {
      sourceProvinces: provinceCollection.features.length,
      selectedRegions: outputFeatures.length,
      outputGeoJson: chinaPublicOutputPath,
      outputMetadata: metadataOutputPath,
    },
    null,
    2,
  ),
)
