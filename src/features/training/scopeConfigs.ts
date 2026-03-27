/**
 * Scope Configurations
 * 
 * 根据 training-system-implementation.md 定义的 Scope 配置表
 */

import type { Dataset, ScopeType, ScopeConfig, SkillProgress } from '../../types/training'
import type { RegionMeta } from '../../types/app'

// ============================================================================
// Helper Functions
// ============================================================================

// 微型国家列表（人口少于100万或面积极小）
const MICROSTATE_IDS = new Set([
  'va', 'mc', 'sm', 'li', 'ad', 'mt', 'va', 'mc', // 欧洲
  'sg', 'mv', 'bh', 'qa', 'ae', 'kw', 'bn', // 亚洲
  'tv', 'nr', 'ki', 'pw', 'mh', 'fm', 'ws', 'to', 'vu', 'sb', // 大洋洲
  'gd', 'vc', 'lc', 'ag', 'dm', 'kn', 'bb', 'tt', 'jm', 'bs', // 加勒比
  'sc', 'km', 'mu', 'cv', 'st', 'dj', 'gz', 'gw', // 非洲
  'bz', 'sv', 'gt', 'hn', 'pa', 'cr', 'ni', // 中美洲
])

// 混淆组定义
const WORLD_CONFUSION_GROUPS: string[][] = [
  // 相似名称
  ['ua', 'uy', 'uz'], // 乌克兰、乌拉圭、乌兹别克斯坦
  ['ne', 'ng', 'na'], // 尼日尔、尼日利亚、纳米比亚
  ['mr', 'ml', 'mw', 'mg'], // 毛里塔尼亚、马里、马拉维、马达加斯加
  ['pa', 'py', 'pe'], // 巴拿马、巴拉圭、秘鲁
  ['kz', 'kg', 'kh'], // 哈萨克斯坦、吉尔吉斯斯坦、柬埔寨
  ['tz', 'tj', 'tm', 'tn'], // 坦桑尼亚、塔吉克斯坦、土库曼斯坦、突尼斯
  ['et', 'er', 'ee'], // 埃塞俄比亚、厄立特里亚、爱沙尼亚
  ['ao', 'ga', 'gm'], // 安哥拉、加蓬、冈比亚
  // 地理相邻易混
  ['no', 'se', 'fi'], // 北欧三国
  ['pl', 'cz', 'sk', 'hu'], // 维谢格拉德集团
  ['cr', 'pa', 'ni'], // 中美洲
  ['my', 'id', 'ph', 'sg'], // 东南亚
]

const CHINA_CONFUSION_GROUPS: string[][] = [
  // 同音字、形近字城市
  ['cn-130100', 'cn-140100'], // 石家庄、太原（省会城市易混）
  ['cn-210100', 'cn-220100', 'cn-230100'], // 沈阳、长春、哈尔滨（东北省会）
  ['cn-320100', 'cn-330100', 'cn-310100'], // 南京、杭州、上海（长三角）
  ['cn-420100', 'cn-430100'], // 武汉、长沙（华中省会）
  ['cn-440100', 'cn-450100'], // 广州、南宁（华南）
  ['cn-510100', 'cn-500100'], // 成都、重庆（川渝）
  ['cn-610100', 'cn-620100'], // 西安、兰州（西北省会）
]

// 大洲映射
const CONTINENT_MAPPING: Record<string, string> = {
  'Asia': 'asia',
  'Europe': 'europe',
  'Africa': 'africa',
  'North America': 'north-america',
  'South America': 'south-america',
  'Oceania': 'oceania',
  'Americas': 'north-america', // fallback
}

// ============================================================================
// Filter Functions
// ============================================================================

function filterAll(regions: RegionMeta[]): RegionMeta[] {
  return regions
}

function filterByContinent(regions: RegionMeta[], continent?: string): RegionMeta[] {
  if (!continent) return regions
  
  return regions.filter(r => {
    const mapped = CONTINENT_MAPPING[r.continent ?? '']
    return mapped === continent
  })
}

function filterMicrostates(regions: RegionMeta[]): RegionMeta[] {
  return regions.filter(r => MICROSTATE_IDS.has(r.id))
}

function filterConfusionSetWorld(regions: RegionMeta[]): RegionMeta[] {
  const confusionIds = new Set(WORLD_CONFUSION_GROUPS.flat())
  return regions.filter(r => confusionIds.has(r.id))
}

function filterConfusionSetChina(regions: RegionMeta[]): RegionMeta[] {
  const confusionIds = new Set(CHINA_CONFUSION_GROUPS.flat())
  return regions.filter(r => confusionIds.has(r.id))
}

function filterByProvince(regions: RegionMeta[], provinceAdcode?: string): RegionMeta[] {
  if (!provinceAdcode) return regions
  
  return regions.filter(r => 
    r.parentAdcode?.toString() === provinceAdcode ||
    r.adcode?.toString() === provinceAdcode
  )
}

function filterSameProvince(regions: RegionMeta[], provinceAdcode?: string): RegionMeta[] {
  return filterByProvince(regions, provinceAdcode)
}

function filterWrongOnly(
  regions: RegionMeta[],
  _value: string | undefined,
  context?: { errorBook: { regionId: string }[] }
): RegionMeta[] {
  if (!context?.errorBook?.length) return regions
  
  const errorIds = new Set(context.errorBook.map(e => e.regionId))
  return regions.filter(r => errorIds.has(r.id))
}

function filterWeakOnly(
  regions: RegionMeta[],
  _value: string | undefined,
  context?: { weakItems: { regionId: string; masteryScore: number }[] }
): RegionMeta[] {
  if (!context?.weakItems?.length) return regions
  
  const weakIds = new Set(context.weakItems.filter(w => w.masteryScore < 50).map(w => w.regionId))
  return regions.filter(r => weakIds.has(r.id))
}

// ============================================================================
// Scope Configurations
// ============================================================================

export const worldScopeConfigs: Record<string, ScopeConfig> = {
  'all': {
    id: 'all',
    label: '全部国家',
    labelEn: 'All Countries',
    dataset: ['world'],
    requiresValue: false,
    filterFn: filterAll,
  },
  'continent': {
    id: 'continent',
    label: '按大洲',
    labelEn: 'By Continent',
    dataset: ['world'],
    requiresValue: true,
    filterFn: (regions, value) => filterByContinent(regions, value),
  },
  'microstates': {
    id: 'microstates',
    label: '微型国家',
    labelEn: 'Microstates',
    dataset: ['world'],
    requiresValue: false,
    filterFn: filterMicrostates,
  },
  'confusion-set': {
    id: 'confusion-set',
    label: '易混国家',
    labelEn: 'Confusion Set',
    dataset: ['world'],
    requiresValue: false,
    filterFn: filterConfusionSetWorld,
  },
  'wrong-only': {
    id: 'wrong-only',
    label: '错题本',
    labelEn: 'Wrong Answers',
    dataset: ['world'],
    requiresValue: false,
    filterFn: filterWrongOnly,
  },
  'weak-only': {
    id: 'weak-only',
    label: '薄弱项',
    labelEn: 'Weak Items',
    dataset: ['world'],
    requiresValue: false,
    filterFn: filterWeakOnly,
  },
}

export const chinaScopeConfigs: Record<string, ScopeConfig> = {
  'all': {
    id: 'all',
    label: '全国',
    labelEn: 'All Regions',
    dataset: ['china'],
    requiresValue: false,
    filterFn: filterAll,
  },
  'province': {
    id: 'province',
    label: '按省份',
    labelEn: 'By Province',
    dataset: ['china'],
    requiresValue: true,
    filterFn: (regions, value) => filterByProvince(regions, value),
  },
  'same-province': {
    id: 'same-province',
    label: '同省专项',
    labelEn: 'Same Province',
    dataset: ['china'],
    requiresValue: true,
    filterFn: (regions, value) => filterSameProvince(regions, value),
  },
  'confusion-set': {
    id: 'confusion-set',
    label: '易混城市',
    labelEn: 'Confusion Set',
    dataset: ['china'],
    requiresValue: false,
    filterFn: filterConfusionSetChina,
  },
  'wrong-only': {
    id: 'wrong-only',
    label: '错题本',
    labelEn: 'Wrong Answers',
    dataset: ['china'],
    requiresValue: false,
    filterFn: filterWrongOnly,
  },
  'weak-only': {
    id: 'weak-only',
    label: '薄弱项',
    labelEn: 'Weak Items',
    dataset: ['china'],
    requiresValue: false,
    filterFn: filterWeakOnly,
  },
}

// ============================================================================
// Utilities
// ============================================================================

export function getScopeConfig(scope: ScopeType, dataset: Dataset): ScopeConfig | null {
  const configs = dataset === 'world' ? worldScopeConfigs : chinaScopeConfigs
  return configs[scope] ?? null
}

export function getScopesForDataset(dataset: Dataset): ScopeConfig[] {
  return dataset === 'world'
    ? Object.values(worldScopeConfigs)
    : Object.values(chinaScopeConfigs)
}

export function filterRegionsByScope(
  regions: RegionMeta[],
  scope: ScopeType,
  scopeValue: string | null,
  dataset: Dataset,
  context?: { errorBook?: { regionId: string }[]; weakItems?: { regionId: string; masteryScore: number }[] }
): RegionMeta[] {
  const config = getScopeConfig(scope, dataset)
  if (!config) return regions
  
  return config.filterFn(regions, scopeValue ?? undefined, context)
}

// 大洲选项
export const CONTINENT_OPTIONS = [
  { id: 'asia', label: '亚洲', labelEn: 'Asia' },
  { id: 'europe', label: '欧洲', labelEn: 'Europe' },
  { id: 'africa', label: '非洲', labelEn: 'Africa' },
  { id: 'north-america', label: '北美洲', labelEn: 'North America' },
  { id: 'south-america', label: '南美洲', labelEn: 'South America' },
  { id: 'oceania', label: '大洋洲', labelEn: 'Oceania' },
]
