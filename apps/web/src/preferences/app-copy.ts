import type { LanguagePreference } from '@cubegin/shared/preferences';

export type ResolvedAppLanguage = 'zh-CN' | 'en';

export interface AppCopy {
  navigation: {
    ariaLabel: string;
    timer: string;
    results: string;
    formulas: string;
    settings: string;
  };
  placeholders: {
    results: {
      title: string;
      description: string;
    };
    formulas: {
      title: string;
      description: string;
    };
  };
  settings: {
    title: string;
    generalGroup: string;
    timerGroup: string;
    themeLabel: string;
    themeSystem: string;
    themeLight: string;
    themeDark: string;
    languageLabel: string;
    languageBrowser: string;
    languageChinese: string;
    languageEnglish: string;
    wcaInspectionLabel: string;
    timerDisplayLabel: string;
    timerDisplayRealtime: string;
    timerDisplaySeconds: string;
    timerDisplayInspectionOnly: string;
  };
  timer: {
    pageLabel: string;
    mainTimerLabel: string;
    bottomInfoLabel: string;
    currentScrambleLabel: string;
    scrambleImageLabel: string;
    scrambleLoading: string;
    listSelectorLabel: string;
    listToolbarLabel: string;
    listToolbarTitle: string;
    createList: string;
    editList: string;
    createListFormLabel: string;
    editListFormLabel: string;
    listNameLabel: string;
    eventLabel: string;
    cancel: string;
    create: string;
    save: string;
    summaryLabel: string;
    summaryCountLabel: string;
    mean: string;
    best: string;
    recentSolvesLabel: string;
    resultToolbarLabel: string;
    deleteResult: string;
    idleLabel: string;
    armedLabel: string;
    inspectionLabel: string;
    timingLabel: string;
    timingDisplayText: string;
    escCancel: string;
  };
}

const APP_COPY = {
  'zh-CN': {
    navigation: {
      ariaLabel: '主导航',
      timer: '计时器',
      results: '成绩列表',
      formulas: '公式库',
      settings: '设置',
    },
    placeholders: {
      results: {
        title: '成绩列表',
        description: '这里会展示历史成绩和筛选工具。',
      },
      formulas: {
        title: '公式库',
        description: '这里会整理公式学习和复习工具。',
      },
    },
    settings: {
      title: '设置',
      generalGroup: '常规',
      timerGroup: '计时器',
      themeLabel: '主题',
      themeSystem: '跟随系统',
      themeLight: '浅色',
      themeDark: '深色',
      languageLabel: '语言',
      languageBrowser: '跟随浏览器',
      languageChinese: '简体中文',
      languageEnglish: 'English',
      wcaInspectionLabel: 'WCA 观察',
      timerDisplayLabel: '计时显示',
      timerDisplayRealtime: '实时',
      timerDisplaySeconds: '到秒',
      timerDisplayInspectionOnly: '仅观察',
    },
    timer: {
      pageLabel: '计时器',
      mainTimerLabel: '主题计时器',
      bottomInfoLabel: '计时器底部信息',
      currentScrambleLabel: '当前打乱',
      scrambleImageLabel: '打乱图',
      scrambleLoading: '生成打乱中...',
      listSelectorLabel: '切换列表',
      listToolbarLabel: '列表操作',
      listToolbarTitle: '列表',
      createList: '新增列表',
      editList: '编辑列表',
      createListFormLabel: '新增列表表单',
      editListFormLabel: '编辑列表表单',
      listNameLabel: '列表名称',
      eventLabel: '项目',
      cancel: '取消',
      create: '创建',
      save: '保存',
      summaryLabel: '成绩概要',
      summaryCountLabel: '有效成绩次数 / 总次数',
      mean: '平均',
      best: '最佳',
      recentSolvesLabel: '最近成绩',
      resultToolbarLabel: '成绩操作',
      deleteResult: '删除',
      idleLabel: '按 Space 或 Enter 开始计时',
      armedLabel: '松开 Space 开始计时，按 Esc 取消',
      inspectionLabel: '观察中，按 Space 或 Enter 开始计时，按 Esc 取消',
      timingLabel: '计时中，按 Space 或 Enter 结束',
      timingDisplayText: '计时',
      escCancel: 'Esc 取消',
    },
  },
  en: {
    navigation: {
      ariaLabel: 'Primary navigation',
      timer: 'Timer',
      results: 'Results',
      formulas: 'Formulas',
      settings: 'Settings',
    },
    placeholders: {
      results: {
        title: 'Results',
        description: 'Solve history and filters will live here.',
      },
      formulas: {
        title: 'Formulas',
        description: 'Formula study and review tools will live here.',
      },
    },
    settings: {
      title: 'Settings',
      generalGroup: 'General',
      timerGroup: 'Timer',
      themeLabel: 'Theme',
      themeSystem: 'Follow system',
      themeLight: 'Light',
      themeDark: 'Dark',
      languageLabel: 'Language',
      languageBrowser: 'Follow browser',
      languageChinese: '简体中文',
      languageEnglish: 'English',
      wcaInspectionLabel: 'WCA inspection',
      timerDisplayLabel: 'Timer display',
      timerDisplayRealtime: 'Realtime',
      timerDisplaySeconds: 'Seconds',
      timerDisplayInspectionOnly: 'Inspection only',
    },
    timer: {
      pageLabel: 'Timer',
      mainTimerLabel: 'Main timer',
      bottomInfoLabel: 'Timer bottom information',
      currentScrambleLabel: 'Current scramble',
      scrambleImageLabel: 'Scramble image',
      scrambleLoading: 'Generating scramble...',
      listSelectorLabel: 'Switch list',
      listToolbarLabel: 'List actions',
      listToolbarTitle: 'Lists',
      createList: 'New list',
      editList: 'Edit list',
      createListFormLabel: 'New list form',
      editListFormLabel: 'Edit list form',
      listNameLabel: 'List name',
      eventLabel: 'Event',
      cancel: 'Cancel',
      create: 'Create',
      save: 'Save',
      summaryLabel: 'Summary',
      summaryCountLabel: 'Valid solves / total solves',
      mean: 'mean',
      best: 'best',
      recentSolvesLabel: 'Recent solves',
      resultToolbarLabel: 'Result actions',
      deleteResult: 'Delete',
      idleLabel: 'Press Space or Enter to start',
      armedLabel: 'Release Space to start, Esc to cancel',
      inspectionLabel: 'Inspecting, press Space or Enter to start, Esc to cancel',
      timingLabel: 'Timing, press Space or Enter to stop',
      timingDisplayText: 'timing',
      escCancel: 'Esc to cancel',
    },
  },
} satisfies Record<ResolvedAppLanguage, AppCopy>;

export const resolveAppLanguage = (
  preference: LanguagePreference,
  browserLanguages: readonly string[],
): ResolvedAppLanguage => {
  if (preference === 'en' || preference === 'zh-CN') return preference;

  const browserLanguage = browserLanguages[0]?.toLowerCase() ?? '';
  return browserLanguage.startsWith('en') ? 'en' : 'zh-CN';
};

export const getAppCopy = (language: ResolvedAppLanguage): AppCopy => APP_COPY[language];
