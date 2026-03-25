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
const taiwanCountySourcePath = path.resolve(
  __dirname,
  '../src/data/china/taiwan-counties-source.geo.json',
)
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
  810000, // Hong Kong
  820000, // Macau
])

const specialEnglishNames = new Map([
  [110000, 'Beijing'],
  [120000, 'Tianjin'],
  [310000, 'Shanghai'],
  [500000, 'Chongqing'],
  [710000, 'Taiwan Province'],
  [810000, 'Hong Kong'],
  [820000, 'Macau'],
])

const taiwanCountyMappings = new Map([
  ['台北市', { adcode: 710100, nameZh: '台北市', nameEn: 'Taipei City', level: 'city' }],
  ['高雄市', { adcode: 710200, nameZh: '高雄市', nameEn: 'Kaohsiung City', level: 'city' }],
  ['基隆市', { adcode: 710300, nameZh: '基隆市', nameEn: 'Keelung City', level: 'city' }],
  ['台中市', { adcode: 710400, nameZh: '台中市', nameEn: 'Taichung City', level: 'city' }],
  ['台南市', { adcode: 710500, nameZh: '台南市', nameEn: 'Tainan City', level: 'city' }],
  ['新竹市', { adcode: 710600, nameZh: '新竹市', nameEn: 'Hsinchu City', level: 'city' }],
  ['嘉義市', { adcode: 710700, nameZh: '嘉义市', nameEn: 'Chiayi City', level: 'city' }],
  ['新北市', { adcode: 710800, nameZh: '新北市', nameEn: 'New Taipei City', level: 'city' }],
  ['桃園縣', { adcode: 710900, nameZh: '桃园市', nameEn: 'Taoyuan City', level: 'city' }],
  ['宜蘭縣', { adcode: 711100, nameZh: '宜兰县', nameEn: 'Yilan County', level: 'county' }],
  ['新竹縣', { adcode: 711200, nameZh: '新竹县', nameEn: 'Hsinchu County', level: 'county' }],
  ['苗栗縣', { adcode: 711300, nameZh: '苗栗县', nameEn: 'Miaoli County', level: 'county' }],
  ['彰化縣', { adcode: 711400, nameZh: '彰化县', nameEn: 'Changhua County', level: 'county' }],
  ['南投縣', { adcode: 711500, nameZh: '南投县', nameEn: 'Nantou County', level: 'county' }],
  ['雲林縣', { adcode: 711700, nameZh: '云林县', nameEn: 'Yunlin County', level: 'county' }],
  ['嘉義縣', { adcode: 711900, nameZh: '嘉义县', nameEn: 'Chiayi County', level: 'county' }],
  ['屏東縣', { adcode: 712100, nameZh: '屏东县', nameEn: 'Pingtung County', level: 'county' }],
  ['台東縣', { adcode: 712400, nameZh: '台东县', nameEn: 'Taitung County', level: 'county' }],
  ['花蓮縣', { adcode: 712500, nameZh: '花莲县', nameEn: 'Hualien County', level: 'county' }],
  ['澎湖縣', { adcode: 712600, nameZh: '澎湖县', nameEn: 'Penghu County', level: 'county' }],
  ['金門縣', { adcode: 712700, nameZh: '金门县', nameEn: 'Kinmen County', level: 'county' }],
  ['連江縣', { adcode: 712800, nameZh: '连江县', nameEn: 'Lienchiang County', level: 'county' }],
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

function computeApproximateCenter(geometry) {
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
    return null
  }

  return [
    Number(((minX + maxX) / 2).toFixed(6)),
    Number(((minY + maxY) / 2).toFixed(6)),
  ]
}

async function buildTaiwanCountyFeatures(provinceAdcode, provinceNameZh, provinceNameEn) {
  const countyCollection = JSON.parse(await readFile(taiwanCountySourcePath, 'utf8'))

  return countyCollection.features.map((feature) => {
    const sourceName = feature.properties?.COUNTYNAME ?? feature.properties?.name
    const mapping = taiwanCountyMappings.get(sourceName)

    if (!mapping) {
      throw new Error(`Unsupported Taiwan county source entry: ${sourceName}`)
    }

    const center = computeApproximateCenter(feature.geometry)
    const regionId = makeRegionId(mapping.adcode)

    return {
      metadata: {
        id: regionId,
        adcode: mapping.adcode,
        level: mapping.level,
        nameZh: mapping.nameZh,
        nameEn: mapping.nameEn,
        parentAdcode: provinceAdcode,
        parentNameZh: provinceNameZh,
        parentNameEn: provinceNameEn,
        centroid: center,
        center,
        labelWeight: computeLabelWeight(feature.geometry),
      },
      feature: {
        type: feature.type,
        id: regionId,
        properties: {
          name: regionId,
          nameZh: mapping.nameZh,
          nameEn: mapping.nameEn,
          provinceAdcode,
          provinceNameZh,
        },
        geometry: feature.geometry,
      },
    }
  })
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

  if (provinceAdcode === 710000) {
    const taiwanCountyFeatures = await buildTaiwanCountyFeatures(
      provinceAdcode,
      provinceNameZh,
      provinceNameEn,
    )

    for (const { metadata: regionMetadata, feature } of taiwanCountyFeatures) {
      metadata[regionMetadata.id] = regionMetadata
      outputFeatures.push(feature)
    }

    continue
  }

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
