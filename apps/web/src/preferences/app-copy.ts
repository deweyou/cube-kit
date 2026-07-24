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
    solverAssistLabel: string;
    timerDisplayLabel: string;
    timerDisplayRealtime: string;
    timerDisplaySeconds: string;
    timerDisplayInspectionOnly: string;
  };
  results: {
    title: string;
    pageLabel: string;
    scores: string;
    scoreTypeLabel: string;
    statsViewLabel: string;
    singleScoreType: string;
    stats: string;
    statsOverview: string;
    scoreTableLabel: string;
    averageTableLabel: string;
    sequenceColumn: string;
    resultColumn: string;
    ao5Column: string;
    ao12Column: string;
    createdAtColumn: string;
    rangeColumn: string;
    compositionColumn: string;
    emptySolves: string;
    emptySolvesHint: string;
    emptyAverage: string;
    detailTitle: string;
    averageDetailTitle: string;
    noPenalty: string;
    plusTwoPenalty: string;
    dnfPenalty: string;
    deleteSolve: string;
    copyScramble: string;
    scrambleCopied: string;
    closeDetail: string;
    total: string;
    best: string;
    mean: string;
    currentAo5: string;
    validCount: string;
    validRatio: string;
    bestSingle: string;
    worstSingle: string;
    overallAverage: string;
    averageResults: string;
    currentAverage: string;
    bestAverage: string;
    standardDeviation: string;
    recentTrend: string;
    lineChart: string;
    trendAll: string;
    trendMetricLabel: string;
    trendSingle: string;
    timeDistribution: string;
    statsEmpty: string;
    retry: string;
    localHistoryError: string;
    multiBlindBestResult: string;
    multiBlindBestScore: string;
    multiBlindScore: string;
    multiBlindMissedCount: string;
    multiBlindAttemptedCount: string;
    multiBlindSolvedCount: string;
    multiBlindNoAverage: string;
    fewestMovesResult: string;
    fewestMovesMeanOfThree: string;
    fewestMovesDuration: string;
    fewestMovesSolution: string;
    fewestMovesBestMean: string;
    fewestMovesCurrentMean: string;
  };
  timer: {
    pageLabel: string;
    mainTimerLabel: string;
    bottomInfoLabel: string;
    currentScrambleLabel: string;
    scrambleImageLabel: string;
    scrambleLoading: string;
    refreshScramble: string;
    solverAssistOpen: string;
    solverAssistTitle: string;
    solverAssistMethodLabel: string;
    solverAssistLoading: string;
    solverAssistError: string;
    solverAssistRetry: string;
    solverAssistShortest: string;
    solverAssistEmptyFormula: string;
    solverAssistNoSolutions: string;
    solverAssistStage: string;
    solverAssistReorder: string;
    solverAssistClose: string;
    previousMultiBlindScramble: string;
    nextMultiBlindScramble: string;
    multiBlindPositionLabel: string;
    multiBlindSettings: string;
    multiBlindCubeCountLabel: string;
    multiBlindResultTitle: string;
    multiBlindSolvedCountLabel: string;
    multiBlindPenaltyCountLabel: string;
    multiBlindSolvedCountError: string;
    multiBlindPenaltyCountError: string;
    decreaseValue: string;
    increaseValue: string;
    multiBlindWholeDnfLabel: string;
    multiBlindBestScore: string;
    fewestMovesTitle: string;
    fewestMovesStart: string;
    fewestMovesRemaining: string;
    fewestMovesSubmit: string;
    fewestMovesSolutionLabel: string;
    fewestMovesTotalMoves: string;
    fewestMovesCollapseScramble: string;
    fewestMovesExpandScramble: string;
    fewestMovesSolutionPlaceholder: string;
    fewestMovesValid: string;
    fewestMovesSyntaxError: string;
    fewestMovesUnsolved: string;
    fewestMovesOverEtm: string;
    fewestMovesInverse: string;
    fewestMovesSuspectedInverse: string;
    fewestMovesKeepResult: string;
    fewestMovesMarkDnf: string;
    fewestMovesReturnToEdit: string;
    fewestMovesSaveResult: string;
    fewestMovesTimeUsed: string;
    fewestMovesMoveUnit: string;
    editResult: string;
    discard: string;
    discardConfirmTitle: string;
    discardConfirmDescription: string;
    discardConfirmAction: string;
    apply: string;
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
    deleteResultConfirmTitle: string;
    deleteResultConfirmDescription: string;
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
      solverAssistLabel: '辅助求解显示',
      timerDisplayLabel: '计时显示',
      timerDisplayRealtime: '实时',
      timerDisplaySeconds: '到秒',
      timerDisplayInspectionOnly: '仅观察',
    },
    results: {
      title: '成绩列表',
      pageLabel: '成绩列表',
      scores: '成绩',
      scoreTypeLabel: '成绩类型',
      statsViewLabel: '统计视图',
      singleScoreType: '单次成绩',
      stats: '统计',
      statsOverview: '统计数据',
      scoreTableLabel: '成绩明细',
      averageTableLabel: '平均成绩明细',
      sequenceColumn: '#',
      resultColumn: '成绩',
      ao5Column: 'ao5',
      ao12Column: 'ao12',
      createdAtColumn: '创建时间',
      rangeColumn: '范围',
      compositionColumn: '组成',
      emptySolves: '暂无成绩',
      emptySolvesHint: '先完成一次计时，或在右上角切换列表。',
      emptyAverage: '需要更多成绩',
      detailTitle: '成绩详情',
      averageDetailTitle: '平均详情',
      noPenalty: '无',
      plusTwoPenalty: '+2',
      dnfPenalty: 'DNF',
      deleteSolve: '删除成绩',
      copyScramble: '复制打乱',
      scrambleCopied: '已复制打乱',
      closeDetail: '关闭详情',
      total: '总数',
      best: '最佳',
      mean: '平均',
      currentAo5: '当前 ao5',
      validCount: '有效成绩',
      validRatio: '有效占比',
      bestSingle: '最佳单次',
      worstSingle: '最差单次',
      overallAverage: '总平均',
      averageResults: '平均成绩',
      currentAverage: '当前',
      bestAverage: '最好平均',
      standardDeviation: '标准差',
      recentTrend: '最近趋势',
      lineChart: '折线图',
      trendAll: '全部',
      trendMetricLabel: '折线指标',
      trendSingle: '单次',
      timeDistribution: '时间分布',
      statsEmpty: '暂无统计',
      retry: '重试',
      localHistoryError: '本地成绩读取失败',
      multiBlindBestResult: '最佳成绩',
      multiBlindBestScore: '最高分',
      multiBlindScore: '分数',
      multiBlindMissedCount: '失败数量',
      multiBlindAttemptedCount: '尝试数量',
      multiBlindSolvedCount: '成功数量',
      multiBlindNoAverage: '多盲按最佳单次排名，不计算平均成绩。',
      fewestMovesResult: '步数',
      fewestMovesMeanOfThree: 'Mean of 3',
      fewestMovesDuration: '用时',
      fewestMovesSolution: '还原公式',
      fewestMovesBestMean: '最佳 Mean',
      fewestMovesCurrentMean: '当前 Mean',
    },
    timer: {
      pageLabel: '计时器',
      mainTimerLabel: '主题计时器',
      bottomInfoLabel: '计时器底部信息',
      currentScrambleLabel: '当前打乱',
      scrambleImageLabel: '打乱图',
      scrambleLoading: '生成打乱中...',
      refreshScramble: '刷新打乱',
      solverAssistOpen: '查看辅助还原公式',
      solverAssistTitle: '辅助求解公式',
      solverAssistMethodLabel: '公式类型',
      solverAssistLoading: '正在计算公式…',
      solverAssistError: '公式计算失败，请重试。',
      solverAssistRetry: '重试',
      solverAssistShortest: '最短',
      solverAssistEmptyFormula: '已达到目标',
      solverAssistNoSolutions: '没有可展示的公式。',
      solverAssistStage: '阶段 {index}',
      solverAssistReorder: '调整 {target} 的显示顺序',
      solverAssistClose: '关闭辅助还原公式',
      previousMultiBlindScramble: '上一颗打乱',
      nextMultiBlindScramble: '下一颗打乱',
      multiBlindPositionLabel: '多盲打乱位置',
      multiBlindSettings: '多盲设置',
      multiBlindCubeCountLabel: '魔方数量',
      multiBlindResultTitle: '多盲成绩',
      multiBlindSolvedCountLabel: '成功数量',
      multiBlindPenaltyCountLabel: '累计 +2',
      multiBlindSolvedCountError: '成功数量需为 0–{max} 的整数。',
      multiBlindPenaltyCountError: '累计 +2 需为 0–{max} 的整数。',
      decreaseValue: '减少数值',
      increaseValue: '增加数值',
      multiBlindWholeDnfLabel: '整次 DNF',
      multiBlindBestScore: '最高分',
      fewestMovesTitle: '三阶最少步',
      fewestMovesStart: '开始最少步',
      fewestMovesRemaining: '剩余时间',
      fewestMovesSubmit: '提交公式',
      fewestMovesSolutionLabel: '还原公式',
      fewestMovesTotalMoves: '总步数',
      fewestMovesCollapseScramble: '收起',
      fewestMovesExpandScramble: '展开',
      fewestMovesSolutionPlaceholder: '输入完整的还原公式',
      fewestMovesValid: '公式有效，可以还原',
      fewestMovesSyntaxError: '公式存在无法识别的步骤',
      fewestMovesUnsolved: '执行公式后魔方没有还原',
      fewestMovesOverEtm: '公式超过 80 ETM',
      fewestMovesInverse: '公式为逆打乱，成绩记为 DNF',
      fewestMovesSuspectedInverse: '公式疑似直接使用逆打乱，请确认',
      fewestMovesKeepResult: '保留成绩',
      fewestMovesMarkDnf: '判为 DNF',
      fewestMovesReturnToEdit: '返回修改',
      fewestMovesSaveResult: '保存成绩',
      fewestMovesTimeUsed: '用时',
      fewestMovesMoveUnit: '步',
      editResult: '编辑成绩',
      discard: '本次不记录',
      discardConfirmTitle: '确认本次不记录？',
      discardConfirmDescription: '本次成绩不会保存，且无法恢复。',
      discardConfirmAction: '确认不记录',
      apply: '应用',
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
      deleteResultConfirmTitle: '删除本次成绩',
      deleteResultConfirmDescription: '删除后不可恢复。',
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
      solverAssistLabel: 'Solution hints display',
      timerDisplayLabel: 'Timer display',
      timerDisplayRealtime: 'Realtime',
      timerDisplaySeconds: 'Seconds',
      timerDisplayInspectionOnly: 'Inspection only',
    },
    results: {
      title: 'Results',
      pageLabel: 'Results',
      scores: 'Scores',
      scoreTypeLabel: 'Score type',
      statsViewLabel: 'Statistics view',
      singleScoreType: 'Single',
      stats: 'Stats',
      statsOverview: 'Overview',
      scoreTableLabel: 'Score details',
      averageTableLabel: 'Average details',
      sequenceColumn: '#',
      resultColumn: 'Result',
      ao5Column: 'ao5',
      ao12Column: 'ao12',
      createdAtColumn: 'Created',
      rangeColumn: 'Range',
      compositionColumn: 'Composition',
      emptySolves: 'No solves yet',
      emptySolvesHint: 'Complete a solve, or switch lists in the top right.',
      emptyAverage: 'More solves needed',
      detailTitle: 'Solve detail',
      averageDetailTitle: 'Average detail',
      noPenalty: 'OK',
      plusTwoPenalty: '+2',
      dnfPenalty: 'DNF',
      deleteSolve: 'Delete solve',
      copyScramble: 'Copy scramble',
      scrambleCopied: 'Scramble copied',
      closeDetail: 'Close detail',
      total: 'Total',
      best: 'Best',
      mean: 'Mean',
      currentAo5: 'Current ao5',
      validCount: 'Valid solves',
      validRatio: 'Valid ratio',
      bestSingle: 'Best single',
      worstSingle: 'Worst single',
      overallAverage: 'Session average',
      averageResults: 'Averages',
      currentAverage: 'Current',
      bestAverage: 'Best',
      standardDeviation: 'Standard deviation',
      recentTrend: 'Recent trend',
      lineChart: 'Line chart',
      trendAll: 'All',
      trendMetricLabel: 'Trend series',
      trendSingle: 'Single',
      timeDistribution: 'Time distribution',
      statsEmpty: 'No statistics yet',
      retry: 'Retry',
      localHistoryError: 'Local history failed to load',
      multiBlindBestResult: 'Best result',
      multiBlindBestScore: 'Best score',
      multiBlindScore: 'Score',
      multiBlindMissedCount: 'Missed',
      multiBlindAttemptedCount: 'Attempted',
      multiBlindSolvedCount: 'Solved',
      multiBlindNoAverage: 'Multi-Blind is ranked by best single and has no average result.',
      fewestMovesResult: 'Moves',
      fewestMovesMeanOfThree: 'Mean of 3',
      fewestMovesDuration: 'Duration',
      fewestMovesSolution: 'Solution',
      fewestMovesBestMean: 'Best mean',
      fewestMovesCurrentMean: 'Current mean',
    },
    timer: {
      pageLabel: 'Timer',
      mainTimerLabel: 'Main timer',
      bottomInfoLabel: 'Timer bottom information',
      currentScrambleLabel: 'Current scramble',
      scrambleImageLabel: 'Scramble image',
      scrambleLoading: 'Generating scramble...',
      refreshScramble: 'Refresh scramble',
      solverAssistOpen: 'View solution hints',
      solverAssistTitle: 'Solution hints',
      solverAssistMethodLabel: 'Hint type',
      solverAssistLoading: 'Calculating formulas…',
      solverAssistError: 'Could not calculate formulas. Try again.',
      solverAssistRetry: 'Retry',
      solverAssistShortest: 'Shortest',
      solverAssistEmptyFormula: 'Target already reached',
      solverAssistNoSolutions: 'No formulas to display.',
      solverAssistStage: 'Stage {index}',
      solverAssistReorder: 'Reorder {target}',
      solverAssistClose: 'Close solution hints',
      previousMultiBlindScramble: 'Previous cube scramble',
      nextMultiBlindScramble: 'Next cube scramble',
      multiBlindPositionLabel: 'Multi-blind scramble position',
      multiBlindSettings: 'Multi-blind settings',
      multiBlindCubeCountLabel: 'Cube count',
      multiBlindResultTitle: 'Multi-Blind result',
      multiBlindSolvedCountLabel: 'Solved',
      multiBlindPenaltyCountLabel: 'Cumulative +2',
      multiBlindSolvedCountError: 'Solved must be an integer from 0 to {max}.',
      multiBlindPenaltyCountError: 'Cumulative +2 must be an integer from 0 to {max}.',
      decreaseValue: 'Decrease value',
      increaseValue: 'Increase value',
      multiBlindWholeDnfLabel: 'Whole-attempt DNF',
      multiBlindBestScore: 'best score',
      fewestMovesTitle: '3x3 Fewest Moves',
      fewestMovesStart: 'Start FMC',
      fewestMovesRemaining: 'Time remaining',
      fewestMovesSubmit: 'Submit solution',
      fewestMovesSolutionLabel: 'Solution',
      fewestMovesTotalMoves: 'Total moves',
      fewestMovesCollapseScramble: 'Collapse',
      fewestMovesExpandScramble: 'Expand',
      fewestMovesSolutionPlaceholder: 'Enter the complete solution',
      fewestMovesValid: 'Valid solution; the cube is solved',
      fewestMovesSyntaxError: 'The solution contains an unsupported move',
      fewestMovesUnsolved: 'The cube is not solved after this solution',
      fewestMovesOverEtm: 'The solution exceeds 80 ETM',
      fewestMovesInverse: 'The solution is the inverse scramble and is DNF',
      fewestMovesSuspectedInverse: 'This solution may be derived from the inverse scramble',
      fewestMovesKeepResult: 'Keep result',
      fewestMovesMarkDnf: 'Mark DNF',
      fewestMovesReturnToEdit: 'Return to edit',
      fewestMovesSaveResult: 'Save result',
      fewestMovesTimeUsed: 'Time used',
      fewestMovesMoveUnit: 'moves',
      editResult: 'Edit result',
      discard: "Don't record",
      discardConfirmTitle: 'Discard this result?',
      discardConfirmDescription: 'This result will not be saved and cannot be recovered.',
      discardConfirmAction: 'Discard result',
      apply: 'Apply',
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
      deleteResultConfirmTitle: 'Delete this solve',
      deleteResultConfirmDescription: 'This cannot be undone.',
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
