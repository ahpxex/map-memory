/**
 * Mode Configurations
 * 
 * 根据 training-system-implementation.md 定义的题型配置表
 */

import type {
  Dataset,
  TrainingMode,
  Skill,
  AnswerType,
  ModeConfig,
  Prompt,
  ChoiceOption,
  UserAnswer,
  TrainingSession,
} from '../../types/training'
import type { RegionMeta } from '../../types/app'

// ============================================================================
// Helper Functions
// ============================================================================

function getRegionName(region: RegionMeta, lang: 'zh' | 'en' = 'zh'): string {
  return lang === 'zh' ? region.nameZh : region.nameEn
}

function getParentName(region: RegionMeta, lang: 'zh' | 'en' = 'zh'): string {
  if (lang === 'zh') {
    return region.parentNameZh ?? region.parentNameEn ?? ''
  }
  return region.parentNameEn ?? region.parentNameZh ?? ''
}

// 干扰项生成器 - 基于规则选择相似的选项
function generateDistractors(
  correct: RegionMeta,
  allRegions: RegionMeta[],
  count: number,
  strategy: 'same-continent' | 'same-subregion' | 'same-parent' | 'neighbors' | 'random'
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
    case 'neighbors':
      // 邻居策略需要外部传入邻居数据
      candidates = allRegions.filter(r => r.id !== correct.id)
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

  // 随机打乱并取前 count 个
  return candidates.sort(() => Math.random() - 0.5).slice(0, count)
}

// ============================================================================
// Prompt Builders
// ============================================================================

function buildNameToLocationPrompt(region: RegionMeta): Prompt {
  return {
    type: 'text',
    content: region.nameZh,
    regionId: region.id,
  }
}

function buildShapeToNamePrompt(region: RegionMeta): Prompt {
  return {
    type: 'shape',
    content: '这是哪个国家/地区？',
    regionId: region.id,
  }
}

function buildFlagToLocationPrompt(region: RegionMeta): Prompt {
  return {
    type: 'flag',
    content: '这个国旗属于哪个国家？',
    regionId: region.id,
    context: {
      flagUrl: `/flags/${region.isoA2?.toLowerCase()}.svg`,
    },
  }
}

function buildNameToFlagPrompt(region: RegionMeta): Prompt {
  return {
    type: 'text',
    content: `请选择 ${region.nameZh} 的国旗`,
    regionId: region.id,
  }
}

function buildCapitalToLocationPrompt(region: RegionMeta): Prompt {
  // 需要从外部数据源获取首都信息
  return {
    type: 'text',
    content: `找到首都 ${region.id} 所在的国家`,
    regionId: region.id,
  }
}

function buildNameToCapitalPrompt(region: RegionMeta): Prompt {
  return {
    type: 'text',
    content: `${region.nameZh} 的首都是？`,
    regionId: region.id,
  }
}

function buildNameToContinentPrompt(region: RegionMeta): Prompt {
  return {
    type: 'text',
    content: `${region.nameZh} 属于哪个大洲？`,
    regionId: region.id,
    context: {
      continent: region.continent ?? undefined,
    },
  }
}

function buildNameToSubregionPrompt(region: RegionMeta): Prompt {
  return {
    type: 'text',
    content: `${region.nameZh} 属于哪个次区域？`,
    regionId: region.id,
    context: {
      subregion: region.subregion ?? undefined,
    },
  }
}

function buildNeighborJudgePrompt(region: RegionMeta, neighborRegion?: RegionMeta): Prompt {
  if (!neighborRegion) {
    return {
      type: 'text',
      content: '邻国判断',
      regionId: region.id,
    }
  }
  return {
    type: 'text',
    content: `${region.nameZh} 与 ${neighborRegion.nameZh} 是否接壤？`,
    regionId: region.id,
  }
}

function buildNeighborStreakPrompt(region: RegionMeta): Prompt {
  return {
    type: 'text',
    content: `请连续点击 ${region.nameZh} 的所有邻国`,
    regionId: region.id,
  }
}

function buildCityToProvincePrompt(region: RegionMeta): Prompt {
  return {
    type: 'text',
    content: `${region.nameZh} 属于哪个省份？`,
    regionId: region.id,
    context: {
      continent: region.parentNameZh ?? undefined,
    },
  }
}

function buildProvinceToCitiesPrompt(region: RegionMeta): Prompt {
  return {
    type: 'text',
    content: `请点出属于 ${region.nameZh} 的所有城市`,
    regionId: region.id,
  }
}

function buildCapitalProvincePrompt(region: RegionMeta, isCapitalToProvince: boolean): Prompt {
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

function buildProvinceNeighborJudgePrompt(region: RegionMeta, neighborRegion?: RegionMeta): Prompt {
  if (!neighborRegion) {
    return {
      type: 'text',
      content: '邻省判断',
      regionId: region.id,
    }
  }
  return {
    type: 'text',
    content: `${region.nameZh} 与 ${neighborRegion.nameZh} 是否接壤？`,
    regionId: region.id,
  }
}

// ============================================================================
// Option Builders
// ============================================================================

function buildShapeToNameOptions(
  region: RegionMeta,
  allRegions: RegionMeta[],
  dataset: Dataset
): ChoiceOption[] {
  const distractors = generateDistractors(region, allRegions, 3, 
    dataset === 'world' ? 'same-continent' : 'same-parent'
  )
  
  const options = [
    { id: region.id, label: region.nameZh },
    ...distractors.map(r => ({ id: r.id, label: r.nameZh })),
  ]
  
  // 打乱顺序
  return options.sort(() => Math.random() - 0.5)
}

function buildNameToFlagOptions(
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

function buildNameToCapitalOptions(
  region: RegionMeta,
  allRegions: RegionMeta[]
): ChoiceOption[] {
  // 这里需要首都数据，暂时用同大洲国家作为干扰项
  const distractors = generateDistractors(region, allRegions, 3, 'same-continent')
  
  return [
    { id: region.id, label: '首都A' }, // 占位，实际应从数据中获取
    ...distractors.map(() => ({ id: crypto.randomUUID(), label: '首都X' })),
  ].sort(() => Math.random() - 0.5)
}

function buildContinentOptions(region: RegionMeta): ChoiceOption[] {
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

function buildSubregionOptions(region: RegionMeta): ChoiceOption[] {
  // 基于大洲的子区域
  const subregions: Record<string, string[]> = {
    'Asia': ['Eastern Asia', 'South-Eastern Asia', 'Southern Asia', 'Central Asia', 'Western Asia'],
    'Europe': ['Northern Europe', 'Western Europe', 'Eastern Europe', 'Southern Europe'],
    'Africa': ['Northern Africa', 'Western Africa', 'Middle Africa', 'Eastern Africa', 'Southern Africa'],
    'Americas': ['Northern America', 'Central America', 'Caribbean', 'South America'],
    'Oceania': ['Australia and New Zealand', 'Melanesia', 'Micronesia', 'Polynesia'],
  }
  
  const continent = region.continent ?? 'Asia'
  const continentSubregions = subregions[continent] ?? subregions['Asia']
  
  return continentSubregions.map(sr => ({
    id: sr.toLowerCase().replace(/\s+/g, '-'),
    label: sr,
  })).sort(() => Math.random() - 0.5)
}

function buildCityToProvinceOptions(
  region: RegionMeta,
  allRegions: RegionMeta[]
): ChoiceOption[] {
  // 同省的其他城市作为干扰项，加上正确的省份
  const sameProvince = allRegions.filter(
    r => r.parentAdcode === region.parentAdcode && r.id !== region.id
  )
  
  const parentName = region.parentNameZh ?? '未知省份'
  
  const options = [
    { id: region.parentAdcode?.toString() ?? region.id, label: parentName },
    ...sameProvince.slice(0, 3).map(r => ({
      id: r.parentAdcode?.toString() ?? r.id,
      label: r.parentNameZh ?? '未知',
    })),
  ]
  
  // 去重并打乱
  const unique = Array.from(new Map(options.map(o => [o.id, o])).values())
  return unique.slice(0, 4).sort(() => Math.random() - 0.5)
}

function buildBooleanOptions(): ChoiceOption[] {
  return [
    { id: 'true', label: '是' },
    { id: 'false', label: '否' },
  ]
}

// ============================================================================
// Evaluators
// ============================================================================

function evaluateMapClick(userAnswer: UserAnswer, correctAnswer: UserAnswer): boolean {
  if (userAnswer.type !== 'map-click' || correctAnswer.type !== 'map-click') {
    return false
  }
  return userAnswer.regionId === correctAnswer.regionId
}

function evaluateChoice(userAnswer: UserAnswer, correctAnswer: UserAnswer): boolean {
  if (userAnswer.type !== 'choice' || correctAnswer.type !== 'choice') {
    return false
  }
  return userAnswer.optionIndex === correctAnswer.optionIndex
}

function evaluateBoolean(userAnswer: UserAnswer, correctAnswer: UserAnswer): boolean {
  if (userAnswer.type !== 'boolean' || correctAnswer.type !== 'boolean') {
    return false
  }
  return userAnswer.value === correctAnswer.value
}

function evaluateStreak(userAnswer: UserAnswer, correctAnswer: UserAnswer): boolean {
  if (userAnswer.type !== 'streak' || correctAnswer.type !== 'streak') {
    return false
  }
  // 检查是否完成了所有目标
  const required = new Set(correctAnswer.regionIds)
  const completed = new Set(userAnswer.regionIds)
  return required.size === completed.size && [...required].every(id => completed.has(id))
}

// ============================================================================
// Feedback Formatters
// ============================================================================

function formatMapClickFeedback(session: TrainingSession, region: RegionMeta, lang: 'zh' | 'en'): string {
  const userClicked = session.userAnswer?.type === 'map-click' 
    ? session.userAnswer.regionId 
    : null
  
  if (lang === 'zh') {
    return `你点击的是 ${userClicked}，正确答案是 ${region.nameZh}`
  }
  return `You clicked ${userClicked}, the correct answer is ${region.nameEn}`
}

function formatChoiceFeedback(session: TrainingSession, region: RegionMeta, lang: 'zh' | 'en'): string {
  if (lang === 'zh') {
    return `正确答案是 ${region.nameZh}`
  }
  return `The correct answer is ${region.nameEn}`
}

function formatBooleanFeedback(session: TrainingSession, region: RegionMeta, lang: 'zh' | 'en'): string {
  const correct = session.correctAnswer.type === 'boolean' 
    ? session.correctAnswer.value 
    : true
  
  if (lang === 'zh') {
    return correct ? '两国确实接壤' : '两国并不接壤'
  }
  return correct ? 'The two countries share a border' : 'The two countries do not share a border'
}

// ============================================================================
// Mode Configurations
// ============================================================================

export const worldModeConfigs: Record<string, Partial<ModeConfig>> = {
  'name-to-location': {
    id: 'name-to-location',
    label: '看名找图',
    labelEn: 'Name to Location',
    dataset: ['world'],
    skill: 'location',
    answerType: 'map-click',
    promptBuilder: buildNameToLocationPrompt,
    evaluator: evaluateMapClick,
    feedbackFormatter: (session, region) => formatMapClickFeedback(session, region, 'zh'),
  },
  'shape-to-name': {
    id: 'shape-to-name',
    label: '看图选名',
    labelEn: 'Shape to Name',
    dataset: ['world'],
    skill: 'shape_name',
    answerType: 'choice',
    promptBuilder: buildShapeToNamePrompt,
    optionBuilder: (region, allRegions) => buildShapeToNameOptions(region, allRegions, 'world'),
    evaluator: evaluateChoice,
    feedbackFormatter: (session, region) => formatChoiceFeedback(session, region, 'zh'),
  },
  'flag-to-location': {
    id: 'flag-to-location',
    label: '国旗找国家',
    labelEn: 'Flag to Location',
    dataset: ['world'],
    skill: 'flag',
    answerType: 'map-click',
    promptBuilder: buildFlagToLocationPrompt,
    evaluator: evaluateMapClick,
    feedbackFormatter: (session, region) => formatMapClickFeedback(session, region, 'zh'),
  },
  'name-to-flag': {
    id: 'name-to-flag',
    label: '国家找国旗',
    labelEn: 'Name to Flag',
    dataset: ['world'],
    skill: 'flag',
    answerType: 'choice',
    promptBuilder: buildNameToFlagPrompt,
    optionBuilder: buildNameToFlagOptions,
    evaluator: evaluateChoice,
    feedbackFormatter: (session, region) => formatChoiceFeedback(session, region, 'zh'),
  },
  'capital-to-location': {
    id: 'capital-to-location',
    label: '首都找国家',
    labelEn: 'Capital to Location',
    dataset: ['world'],
    skill: 'capital',
    answerType: 'map-click',
    promptBuilder: buildCapitalToLocationPrompt,
    evaluator: evaluateMapClick,
    feedbackFormatter: (session, region) => formatMapClickFeedback(session, region, 'zh'),
  },
  'name-to-capital': {
    id: 'name-to-capital',
    label: '国家找首都',
    labelEn: 'Name to Capital',
    dataset: ['world'],
    skill: 'capital',
    answerType: 'choice',
    promptBuilder: buildNameToCapitalPrompt,
    optionBuilder: buildNameToCapitalOptions,
    evaluator: evaluateChoice,
    feedbackFormatter: (session, region) => formatChoiceFeedback(session, region, 'zh'),
  },
  'name-to-continent': {
    id: 'name-to-continent',
    label: '国家找大洲',
    labelEn: 'Name to Continent',
    dataset: ['world'],
    skill: 'continent',
    answerType: 'choice',
    promptBuilder: buildNameToContinentPrompt,
    optionBuilder: buildContinentOptions,
    evaluator: evaluateChoice,
    feedbackFormatter: (session, region) => formatChoiceFeedback(session, region, 'zh'),
  },
  'name-to-subregion': {
    id: 'name-to-subregion',
    label: '国家找次区域',
    labelEn: 'Name to Subregion',
    dataset: ['world'],
    skill: 'subregion',
    answerType: 'choice',
    promptBuilder: buildNameToSubregionPrompt,
    optionBuilder: buildSubregionOptions,
    evaluator: evaluateChoice,
    feedbackFormatter: (session, region) => formatChoiceFeedback(session, region, 'zh'),
  },
  'neighbor-judge': {
    id: 'neighbor-judge',
    label: '邻国判断',
    labelEn: 'Neighbor Judge',
    dataset: ['world'],
    skill: 'neighbors',
    answerType: 'boolean',
    promptBuilder: buildNeighborJudgePrompt,
    optionBuilder: buildBooleanOptions,
    evaluator: evaluateBoolean,
    feedbackFormatter: (session, region) => formatBooleanFeedback(session, region, 'zh'),
  },
  'neighbor-streak': {
    id: 'neighbor-streak',
    label: '邻国连击',
    labelEn: 'Neighbor Streak',
    dataset: ['world'],
    skill: 'neighbors',
    answerType: 'streak',
    promptBuilder: buildNeighborStreakPrompt,
    evaluator: evaluateStreak,
    feedbackFormatter: (session, region) => formatMapClickFeedback(session, region, 'zh'),
  },
}

export const chinaModeConfigs: Record<string, Partial<ModeConfig>> = {
  'name-to-location': {
    id: 'name-to-location',
    label: '看名找图',
    labelEn: 'Name to Location',
    dataset: ['china'],
    skill: 'location',
    answerType: 'map-click',
    promptBuilder: buildNameToLocationPrompt,
    evaluator: evaluateMapClick,
    feedbackFormatter: (session, region) => formatMapClickFeedback(session, region, 'zh'),
  },
  'shape-to-name': {
    id: 'shape-to-name',
    label: '看图选名',
    labelEn: 'Shape to Name',
    dataset: ['china'],
    skill: 'shape_name',
    answerType: 'choice',
    promptBuilder: buildShapeToNamePrompt,
    optionBuilder: (region, allRegions) => buildShapeToNameOptions(region, allRegions, 'china'),
    evaluator: evaluateChoice,
    feedbackFormatter: (session, region) => formatChoiceFeedback(session, region, 'zh'),
  },
  'city-to-province': {
    id: 'city-to-province',
    label: '城市找所属省份',
    labelEn: 'City to Province',
    dataset: ['china'],
    skill: 'province_affiliation',
    answerType: 'choice',
    promptBuilder: buildCityToProvincePrompt,
    optionBuilder: buildCityToProvinceOptions,
    evaluator: evaluateChoice,
    feedbackFormatter: (session, region) => {
      return `${region.nameZh} 属于 ${region.parentNameZh ?? '未知省份'}`
    },
  },
  'province-to-cities': {
    id: 'province-to-cities',
    label: '省份找下属城市',
    labelEn: 'Province to Cities',
    dataset: ['china'],
    skill: 'province_children',
    answerType: 'streak',
    promptBuilder: buildProvinceToCitiesPrompt,
    evaluator: evaluateStreak,
    feedbackFormatter: (session, region) => {
      return `请点出所有属于 ${region.nameZh} 的城市`
    },
  },
  'capital-province': {
    id: 'capital-province',
    label: '省会训练',
    labelEn: 'Capital Province',
    dataset: ['china'],
    skill: 'provincial_capital',
    answerType: 'choice',
    promptBuilder: (region) => buildCapitalProvincePrompt(region, Math.random() > 0.5),
    evaluator: evaluateChoice,
    feedbackFormatter: (session, region) => formatChoiceFeedback(session, region, 'zh'),
  },
  'province-neighbor-judge': {
    id: 'province-neighbor-judge',
    label: '邻省判断',
    labelEn: 'Province Neighbor Judge',
    dataset: ['china'],
    skill: 'neighbors',
    answerType: 'boolean',
    promptBuilder: buildProvinceNeighborJudgePrompt,
    optionBuilder: buildBooleanOptions,
    evaluator: evaluateBoolean,
    feedbackFormatter: (session, region) => formatBooleanFeedback(session, region, 'zh'),
  },
}

// 获取指定 dataset 的所有可用 modes
export function getModesForDataset(dataset: Dataset): Partial<ModeConfig>[] {
  return dataset === 'world'
    ? Object.values(worldModeConfigs)
    : Object.values(chinaModeConfigs)
}

// 获取指定 mode 的配置
export function getModeConfig(mode: TrainingMode): Partial<ModeConfig> | null {
  return worldModeConfigs[mode] ?? chinaModeConfigs[mode] ?? null
}

// 获取 mode 对应的 skill
export function getSkillForMode(mode: TrainingMode): Skill {
  const config = getModeConfig(mode)
  return config?.skill ?? 'location'
}
