export type Language = 'zh' | 'en'

interface Translations {
  world: string
  china: string
  explore: string
  training: string
  labels: string
  labelsOn: string
  labelsOff: string
  records: string
  export: string
  import: string
  find: string
  preparing: string
  noRecords: string
  startPracticing: string
  practiced: string
  accuracy: string
  attempts: string
  correct: string
  wrong: string
  lastPracticed: string
  importConfirm: string
  importReplaceWarning: string
  importFailed: string
  importInvalidFile: string
  switchToEn: string
  switchToZh: string
  trainingPrompt: string
}

const translations: Record<Language, Translations> = {
  zh: {
    world: '世界',
    china: '中国',
    explore: '探索',
    training: '训练',
    labels: '标签',
    labelsOn: '显示标签',
    labelsOff: '隐藏标签',
    records: '记录',
    export: '导出数据',
    import: '导入数据',
    find: '找到',
    preparing: '准备中...',
    noRecords: '还没有练习记录',
    startPracticing: '开始练习后，这里会显示你的进度',
    practiced: '已练习',
    accuracy: '准确率',
    attempts: '练习',
    correct: '正确',
    wrong: '错误',
    lastPracticed: '最近练习',
    importConfirm: '导入确认',
    importReplaceWarning: '导入将替换当前的本地训练数据，是否继续？',
    importFailed: '导入失败，文件格式无效。',
    importInvalidFile: 'This file is not a valid map-memory export.',
    switchToEn: 'Switch to English',
    switchToZh: '切换至中文',
    trainingPrompt: '训练',
  },
  en: {
    world: 'World',
    china: 'China',
    explore: 'Explore',
    training: 'Training',
    labels: 'Labels',
    labelsOn: 'Labels On',
    labelsOff: 'Labels Off',
    records: 'Records',
    export: 'Export',
    import: 'Import',
    find: 'Find',
    preparing: 'Preparing...',
    noRecords: 'No practice records yet',
    startPracticing: 'Start practicing to see your progress here',
    practiced: 'Practiced',
    accuracy: 'Accuracy',
    attempts: 'Attempts',
    correct: 'Correct',
    wrong: 'Wrong',
    lastPracticed: 'Last practiced',
    importConfirm: 'Import Confirmation',
    importReplaceWarning: 'Importing will replace your current training data. Continue?',
    importFailed: 'Import failed. Invalid file format.',
    importInvalidFile: 'This file is not a valid map-memory export.',
    switchToEn: 'Switch to English',
    switchToZh: 'Switch to Chinese',
    trainingPrompt: 'Training',
  },
}

export function t(key: keyof Translations, lang: Language): string {
  return translations[lang][key]
}
