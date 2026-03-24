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
const chinaOutputPath = path.resolve(__dirname, '../src/data/china/china.geo.json')
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

await mkdir(path.dirname(chinaOutputPath), { recursive: true })

await writeFile(
  chinaOutputPath,
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
      sourceProvinces: provinceCollection.features.length,
      selectedRegions: outputFeatures.length,
      outputGeoJson: chinaOutputPath,
      outputMetadata: metadataOutputPath,
    },
    null,
    2,
  ),
)
