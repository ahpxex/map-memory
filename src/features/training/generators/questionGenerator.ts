/**
 * Question Generator
 * 
 * 生成各种类型的训练题目
 */

import type { RegionMeta } from '../../../types/app'
import type {
  Dataset,
  TrainingMode,
  Prompt,
  ChoiceOption,
  UserAnswer,
  TrainingSession,
  WorldSkill,
  ChinaSkill,
} from '../../../types/training'

// ============================================================================
// Data Requirements
// ============================================================================

// 世界地图：国家 -> 首都
const WORLD_CAPITALS: Record<string, string> = {
  'cn': '北京',
  'us': '华盛顿',
  'gb': '伦敦',
  'fr': '巴黎',
  'de': '柏林',
  'jp': '东京',
  'kr': '首尔',
  'in': '新德里',
  'ru': '莫斯科',
  'br': '巴西利亚',
  'au': '堪培拉',
  'ca': '渥太华',
  'it': '罗马',
  'es': '马德里',
  'pt': '里斯本',
  'nl': '阿姆斯特丹',
  'be': '布鲁塞尔',
  'ch': '伯尔尼',
  'at': '维也纳',
  'se': '斯德哥尔摩',
  'no': '奥斯陆',
  'dk': '哥本哈根',
  'fi': '赫尔辛基',
  'pl': '华沙',
  'cz': '布拉格',
  'hu': '布达佩斯',
  'ro': '布加勒斯特',
  'bg': '索非亚',
  'gr': '雅典',
  'tr': '安卡拉',
  'ua': '基辅',
  'eg': '开罗',
  'za': '开普敦',
  'ng': '阿布贾',
  'ke': '内罗毕',
  'et': '亚的斯亚贝巴',
  'tz': '多多马',
  'gh': '阿克拉',
  'ma': '拉巴特',
  'dz': '阿尔及尔',
  'tn': '突尼斯',
  'ly': '的黎波里',
  'sd': '喀土穆',
  'sa': '利雅得',
  'ir': '德黑兰',
  'iq': '巴格达',
  'il': '耶路撒冷',
  'jo': '安曼',
  'lb': '贝鲁特',
  'sy': '大马士革',
  'ye': '萨那',
  'om': '马斯喀特',
  'ae': '阿布扎比',
  'qa': '多哈',
  'kw': '科威特城',
  'bh': '麦纳麦',
  'pk': '伊斯兰堡',
  'af': '喀布尔',
  'bd': '达卡',
  'lk': '科伦坡',
  'np': '加德满都',
  'mm': '内比都',
  'th': '曼谷',
  'vn': '河内',
  'kh': '金边',
  'la': '万象',
  'my': '吉隆坡',
  'sg': '新加坡',
  'id': '雅加达',
  'ph': '马尼拉',
  'tw': '台北',
  'mn': '乌兰巴托',
  'kp': '平壤',
  'nz': '惠灵顿',
  'fj': '苏瓦',
  'pg': '莫尔兹比港',
  'mx': '墨西哥城',
  'gt': '危地马拉城',
  'bz': '贝尔莫潘',
  'sv': '圣萨尔瓦多',
  'hn': '特古西加尔巴',
  'ni': '马那瓜',
  'cr': '圣何塞',
  'pa': '巴拿马城',
  'cu': '哈瓦那',
  'jm': '金斯敦',
  'ht': '太子港',
  'do': '圣多明各',
  'co': '波哥大',
  've': '加拉加斯',
  'ec': '基多',
  'pe': '利马',
  'bo': '苏克雷',
  'py': '亚松森',
  'cl': '圣地亚哥',
  'ar': '布宜诺斯艾利斯',
  'uy': '蒙得维的亚',
  'gy': '乔治敦',
  'sr': '帕拉马里博',
  'gf': '卡宴',
}

// 中国地图：省份 -> 省会
const CHINA_PROVINCIAL_CAPITALS: Record<string, { code: string; name: string }> = {
  '110000': { code: 'cn-110000', name: '北京市' },
  '120000': { code: 'cn-120000', name: '天津市' },
  '130000': { code: 'cn-130100', name: '石家庄市' },
  '140000': { code: 'cn-140100', name: '太原市' },
  '150000': { code: 'cn-150100', name: '呼和浩特市' },
  '210000': { code: 'cn-210100', name: '沈阳市' },
  '220000': { code: 'cn-220100', name: '长春市' },
  '230000': { code: 'cn-230100', name: '哈尔滨市' },
  '310000': { code: 'cn-310000', name: '上海市' },
  '320000': { code: 'cn-320100', name: '南京市' },
  '330000': { code: 'cn-330100', name: '杭州市' },
  '340000': { code: 'cn-340100', name: '合肥市' },
  '350000': { code: 'cn-350100', name: '福州市' },
  '360000': { code: 'cn-360100', name: '南昌市' },
  '370000': { code: 'cn-370100', name: '济南市' },
  '410000': { code: 'cn-410100', name: '郑州市' },
  '420000': { code: 'cn-420100', name: '武汉市' },
  '430000': { code: 'cn-430100', name: '长沙市' },
  '440000': { code: 'cn-440100', name: '广州市' },
  '450000': { code: 'cn-450100', name: '南宁市' },
  '460000': { code: 'cn-460100', name: '海口市' },
  '500000': { code: 'cn-500000', name: '重庆市' },
  '510000': { code: 'cn-510100', name: '成都市' },
  '520000': { code: 'cn-520100', name: '贵阳市' },
  '530000': { code: 'cn-530100', name: '昆明市' },
  '540000': { code: 'cn-540100', name: '拉萨市' },
  '610000': { code: 'cn-610100', name: '西安市' },
  '620000': { code: 'cn-620100', name: '兰州市' },
  '630000': { code: 'cn-630100', name: '西宁市' },
  '640000': { code: 'cn-640100', name: '银川市' },
  '650000': { code: 'cn-650100', name: '乌鲁木齐市' },
  '810000': { code: 'cn-810000', name: '香港' },
  '820000': { code: 'cn-820000', name: '澳门' },
}

// 邻国关系（简化版）
const NEIGHBORS: Record<string, string[]> = {
  'cn': ['ru', 'mn', 'kp', 'af', 'pk', 'in', 'np', 'bt', 'mm', 'la', 'vn', 'kg', 'tj', 'kz'],
  'ru': ['cn', 'mn', 'kp', 'fi', 'ee', 'lv', 'lt', 'pl', 'by', 'ua', 'ge', 'az', 'kz'],
  'us': ['ca', 'mx'],
  'ca': ['us'],
  'mx': ['us', 'gt', 'bz'],
  'br': ['ar', 'bo', 'co', 'gf', 'gy', 'py', 'pe', 'sr', 'uy', 've'],
  'ar': ['bo', 'br', 'cl', 'py', 'uy'],
  'in': ['pk', 'cn', 'np', 'bt', 'bd', 'mm', 'lk'],
  'de': ['dk', 'pl', 'cz', 'at', 'ch', 'fr', 'lu', 'be', 'nl'],
  'fr': ['be', 'lu', 'de', 'ch', 'it', 'mc', 'ad', 'es'],
}

// 大洲中文名
const CONTINENT_NAMES: Record<string, string> = {
  'Asia': '亚洲',
  'Europe': '欧洲',
  'Africa': '非洲',
  'North America': '北美洲',
  'South America': '南美洲',
  'Oceania': '大洋洲',
  'Americas': '美洲',
}

// ============================================================================
// Prompt Builders
// ============================================================================

export function buildNameToLocationPrompt(region: RegionMeta): Prompt {
  return {
    type: 'text',
    content: `找到 ${region.nameZh}`,
    regionId: region.id,
  }
}

export function buildShapeToNamePrompt(region: RegionMeta): Prompt {
  return {
    type: 'shape',
    content: '这是哪个国家/地区？',
    regionId: region.id,
  }
}

export function buildFlagToLocationPrompt(region: RegionMeta): Prompt {
  return {
    type: 'flag',
    content: '这个国旗属于哪个国家？',
    regionId: region.id,
    context: {
      flagUrl: `/flags/${region.isoA2?.toLowerCase()}.svg`,
    },
  }
}

export function buildNameToFlagPrompt(region: RegionMeta): Prompt {
  return {
    type: 'text',
    content: `请选择 ${region.nameZh} 的国旗`,
    regionId: region.id,
  }
}

export function buildCapitalToLocationPrompt(region: RegionMeta): Prompt {
  const capital = WORLD_CAPITALS[region.id] ?? '该国家'
  return {
    type: 'text',
    content: `找到首都 ${capital} 所在的国家`,
    regionId: region.id,
    context: { capital },
  }
}

export function buildNameToCapitalPrompt(region: RegionMeta): Prompt {
  return {
    type: 'text',
    content: `${region.nameZh} 的首都是？`,
    regionId: region.id,
  }
}

export function buildNameToContinentPrompt(region: RegionMeta): Prompt {
  return {
    type: 'text',
    content: `${region.nameZh} 属于哪个大洲？`,
    regionId: region.id,
    context: {
      continent: CONTINENT_NAMES[region.continent ?? ''] ?? region.continent,
    },
  }
}

export function buildNameToSubregionPrompt(region: RegionMeta): Prompt {
  return {
    type: 'text',
    content: `${region.nameZh} 属于哪个次区域？`,
    regionId: region.id,
    context: {
      subregion: region.subregion ?? undefined,
    },
  }
}

export function buildNeighborJudgePrompt(region: RegionMeta, neighborRegion: RegionMeta): Prompt {
  return {
    type: 'text',
    content: `${region.nameZh} 与 ${neighborRegion.nameZh} 是否接壤？`,
    regionId: region.id,
  }
}

export function buildNeighborStreakPrompt(region: RegionMeta): Prompt {
  const neighbors = NEIGHBORS[region.id] ?? []
  return {
    type: 'text',
    content: `请连续点击 ${region.nameZh} 的所有邻国 (${neighbors.length}个)`,
    regionId: region.id,
  }
}

export function buildCityToProvincePrompt(region: RegionMeta): Prompt {
  return {
    type: 'text',
    content: `${region.nameZh} 属于哪个省份？`,
    regionId: region.id,
    context: {
      continent: region.parentNameZh ?? undefined,
    },
  }
}

export function buildProvinceToCitiesPrompt(region: RegionMeta): Prompt {
  return {
    type: 'text',
    content: `请点出属于 ${region.nameZh} 的所有城市`,
    regionId: region.id,
  }
}

export function buildCapitalProvincePrompt(region: RegionMeta, isCapitalToProvince: boolean): Prompt {
  if (isCapitalToProvince) {
    return {
      type: 'text',
      content: `${region.nameZh} 是哪个省份的省会？`,
      regionId: region.id,
    }
  }
  return {
    type: 'text',
    content: `${region.nameZh} 的省会是？`,
    regionId: region.id,
  }
}

export function buildProvinceNeighborJudgePrompt(region: RegionMeta, neighborRegion: RegionMeta): Prompt {
  return {
    type: 'text',
    content: `${region.nameZh} 与 ${neighborRegion.nameZh} 是否接壤？`,
    regionId: region.id,
  }
}

// ============================================================================
// Option Builders
// ============================================================================

export function generateDistractors(
  correct: RegionMeta,
  allRegions: RegionMeta[],
  count: number,
  strategy: 'same-continent' | 'same-subregion' | 'same-parent' | 'random' = 'same-continent'
): RegionMeta[] {
  let candidates: RegionMeta[] = []

  switch (strategy) {
    case 'same-subregion':
      candidates = allRegions.filter(
        r => r.subregion === correct.subregion && r.id !== correct.id
      )
      break
    case 'same-continent':
      candidates = allRegions.filter(
        r => r.continent === correct.continent && r.id !== correct.id
      )
      break
    case 'same-parent':
      candidates = allRegions.filter(
        r => r.parentAdcode === correct.parentAdcode && r.id !== correct.id
      )
      break
    default:
      candidates = allRegions.filter(r => r.id !== correct.id)
  }

  // 如果候选不够，补充其他随机选项
  if (candidates.length < count) {
    const others = allRegions.filter(
      r => r.id !== correct.id && !candidates.some(c => c.id === r.id)
    )
    candidates = [...candidates, ...others]
  }

  return candidates.sort(() => Math.random() - 0.5).slice(0, count)
}

export function buildShapeToNameOptions(
  region: RegionMeta,
  allRegions: RegionMeta[],
  dataset: Dataset
): ChoiceOption[] {
  const distractors = generateDistractors(
    region,
    allRegions,
    3,
    dataset === 'world' ? 'same-continent' : 'same-parent'
  )
  
  const options = [
    { id: region.id, label: region.nameZh },
    ...distractors.map(r => ({ id: r.id, label: r.nameZh })),
  ]
  
  return options.sort(() => Math.random() - 0.5)
}

export function buildNameToFlagOptions(
  region: RegionMeta,
  allRegions: RegionMeta[]
): ChoiceOption[] {
  const distractors = generateDistractors(region, allRegions, 3, 'same-continent')
  
  const options = [
    { 
      id: region.id, 
      label: region.nameZh,
      flagUrl: `/flags/${region.isoA2?.toLowerCase()}.svg`,
    },
    ...distractors.map(r => ({
      id: r.id,
      label: r.nameZh,
      flagUrl: `/flags/${r.isoA2?.toLowerCase()}.svg`,
    })),
  ]
  
  return options.sort(() => Math.random() - 0.5)
}

export function buildNameToCapitalOptions(
  region: RegionMeta,
  allRegions: RegionMeta[]
): ChoiceOption[] {
  const correctCapital = WORLD_CAPITALS[region.id] ?? '未知'
  
  // 从其他国家随机选择干扰项
  const distractors = generateDistractors(region, allRegions, 3, 'same-continent')
  
  const options = [
    { id: region.id, label: correctCapital },
    ...distractors.map(r => ({ 
      id: r.id, 
      label: WORLD_CAPITALS[r.id] ?? '未知' 
    })),
  ]
  
  return options.sort(() => Math.random() - 0.5)
}

export function buildContinentOptions(region: RegionMeta): ChoiceOption[] {
  const continents = [
    { id: 'asia', label: '亚洲' },
    { id: 'europe', label: '欧洲' },
    { id: 'africa', label: '非洲' },
    { id: 'north-america', label: '北美洲' },
    { id: 'south-america', label: '南美洲' },
    { id: 'oceania', label: '大洋洲' },
  ]
  
  return continents.sort(() => Math.random() - 0.5)
}

export function buildSubregionOptions(region: RegionMeta): ChoiceOption[] {
  // 基于大洲的子区域
  const subregionsByContinent: Record<string, string[]> = {
    'Asia': ['东亚', '东南亚', '南亚', '中亚', '西亚'],
    'Europe': ['北欧', '西欧', '东欧', '南欧'],
    'Africa': ['北非', '西非', '中非', '东非', '南非'],
    'Americas': ['北美', '中美', '加勒比', '南美'],
    'Oceania': ['澳新', '美拉尼西亚', '密克罗尼西亚', '波利尼西亚'],
  }
  
  const continent = region.continent ?? 'Asia'
  const subregions = subregionsByContinent[continent] ?? subregionsByContinent['Asia']
  
  return subregions.map(sr => ({
    id: sr,
    label: sr,
  })).sort(() => Math.random() - 0.5)
}

export function buildCityToProvinceOptions(
  region: RegionMeta,
  allRegions: RegionMeta[]
): ChoiceOption[] {
  // 选择其他省份作为干扰项
  const otherProvinces = allRegions
    .filter(r => 
      r.parentAdcode !== region.parentAdcode && 
      r.parentAdcode &&
      r.parentAdcode % 10000 === 0 // 省级行政区
    )
    .map(r => ({ 
      id: r.parentAdcode?.toString() ?? r.id, 
      label: r.parentNameZh ?? '未知' 
    }))
  
  const correctProvince = region.parentNameZh ?? '未知'
  
  const options = [
    { id: region.parentAdcode?.toString() ?? region.id, label: correctProvince },
    ...otherProvinces.slice(0, 3),
  ]
  
  // 去重并打乱
  const unique = Array.from(new Map(options.map(o => [o.id, o])).values())
  return unique.slice(0, 4).sort(() => Math.random() - 0.5)
}

export function buildBooleanOptions(): ChoiceOption[] {
  return [
    { id: 'true', label: '是' },
    { id: 'false', label: '否' },
  ]
}

// ============================================================================
// Correct Answer Builders
// ============================================================================

export function buildMapClickAnswer(region: RegionMeta): UserAnswer {
  return { type: 'map-click', regionId: region.id }
}

export function buildChoiceAnswer(options: ChoiceOption[], region: RegionMeta): UserAnswer {
  const index = options.findIndex(o => o.id === region.id)
  return { type: 'choice', optionIndex: index >= 0 ? index : 0 }
}

export function buildBooleanAnswer(value: boolean): UserAnswer {
  return { type: 'boolean', value }
}

export function buildStreakAnswer(regionIds: string[]): UserAnswer {
  return { type: 'streak', regionIds }
}

// ============================================================================
// Main Generator
// ============================================================================

export interface GeneratedQuestion {
  prompt: Prompt
  options?: ChoiceOption[]
  correctAnswer: UserAnswer
  skill: WorldSkill | ChinaSkill
}

export function generateQuestion(
  region: RegionMeta,
  mode: TrainingMode,
  dataset: Dataset,
  allRegions: RegionMeta[]
): GeneratedQuestion | null {
  switch (mode) {
    case 'name-to-location':
      return {
        prompt: buildNameToLocationPrompt(region),
        correctAnswer: buildMapClickAnswer(region),
        skill: 'location',
      }
    
    case 'shape-to-name': {
      const options = buildShapeToNameOptions(region, allRegions, dataset)
      return {
        prompt: buildShapeToNamePrompt(region),
        options,
        correctAnswer: buildChoiceAnswer(options, region),
        skill: 'shape_name',
      }
    }
    
    case 'flag-to-location':
      return {
        prompt: buildFlagToLocationPrompt(region),
        correctAnswer: buildMapClickAnswer(region),
        skill: 'flag',
      }
    
    case 'name-to-flag': {
      if (dataset !== 'world') return null
      const flagOptions = buildNameToFlagOptions(region, allRegions)
      return {
        prompt: buildNameToFlagPrompt(region),
        options: flagOptions,
        correctAnswer: buildChoiceAnswer(flagOptions, region),
        skill: 'flag',
      }
    }
    
    case 'capital-to-location':
      return {
        prompt: buildCapitalToLocationPrompt(region),
        correctAnswer: buildMapClickAnswer(region),
        skill: 'capital',
      }
    
    case 'name-to-capital': {
      if (dataset !== 'world') return null
      const capitalOptions = buildNameToCapitalOptions(region, allRegions)
      return {
        prompt: buildNameToCapitalPrompt(region),
        options: capitalOptions,
        correctAnswer: buildChoiceAnswer(capitalOptions, region),
        skill: 'capital',
      }
    }
    
    case 'name-to-continent': {
      if (dataset !== 'world') return null
      const continentOptions = buildContinentOptions(region)
      return {
        prompt: buildNameToContinentPrompt(region),
        options: continentOptions,
        correctAnswer: { type: 'choice', optionIndex: 0 }, // 需要正确映射
        skill: 'continent',
      }
    }
    
    case 'name-to-subregion': {
      if (dataset !== 'world') return null
      const subregionOptions = buildSubregionOptions(region)
      return {
        prompt: buildNameToSubregionPrompt(region),
        options: subregionOptions,
        correctAnswer: { type: 'choice', optionIndex: 0 },
        skill: 'subregion',
      }
    }
    
    case 'neighbor-judge': {
      if (dataset !== 'world') return null
      // 随机选择一个邻国或非邻国
      const isNeighbor = Math.random() > 0.5
      const neighbors = NEIGHBORS[region.id] ?? []
      let neighborRegion: RegionMeta | undefined
      
      if (isNeighbor && neighbors.length > 0) {
        const neighborId = neighbors[Math.floor(Math.random() * neighbors.length)]
        neighborRegion = allRegions.find(r => r.id === neighborId)
      } else {
        // 选择一个非邻国
        neighborRegion = allRegions.find(r => 
          r.id !== region.id && !neighbors.includes(r.id)
        )
      }
      
      if (!neighborRegion) return null
      
      return {
        prompt: buildNeighborJudgePrompt(region, neighborRegion),
        options: buildBooleanOptions(),
        correctAnswer: buildBooleanAnswer(isNeighbor),
        skill: 'neighbors',
      }
    }
    
    case 'city-to-province': {
      if (dataset !== 'china') return null
      const provinceOptions = buildCityToProvinceOptions(region, allRegions)
      return {
        prompt: buildCityToProvincePrompt(region),
        options: provinceOptions,
        correctAnswer: buildChoiceAnswer(provinceOptions, { ...region, id: region.parentAdcode?.toString() ?? region.id }),
        skill: 'province_affiliation',
      }
    }
    
    default:
      return null
  }
}
