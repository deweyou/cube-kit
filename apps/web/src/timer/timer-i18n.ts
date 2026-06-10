import type { TimerLocale } from '@cubegin/shared/timer-session';

export type { TimerLocale };

export interface TimerMessages {
  cancel: string;
  cancelReady: string;
  close: string;
  confirmCreateSession: string;
  continue: string;
  createSession: string;
  defaultSession: string;
  delete: string;
  deleteSession: string;
  deleteSessionAria: (name: string) => string;
  deleteSolve: string;
  eventSelectorLabel: string;
  imageRenderFailed: (message: string) => string;
  loading: string;
  mainNav: string;
  newSessionFallback: string;
  newSessionName: string;
  noPenalty: string;
  noSolves: string;
  refreshScramble: string;
  releaseToCancel: string;
  releaseToStart: string;
  slideUpToCancel: string;
  resultSelection: string;
  statisticsAverage: string;
  statisticsBest: string;
  statisticsRollingAverage: (size: number) => string;
  statisticsValidCount: string;
  scrambleLoading: string;
  sessionList: string;
  sessionSettings: string;
  sidebar: string;
  sidebarCollapse: string;
  sidebarExpand: string;
  solveDetail: string;
  solves: string;
  startReady: string;
  stats: string;
  storageError: (message: string) => string;
  timer: string;
  timerPage: string;
  toggleLanguage: string;
  toggleThemeDark: string;
  toggleThemeLight: string;
  waitingScramble: string;
  formulaLibrary: string;
  holdEnterToStart: string;
}

export const TIMER_MESSAGES: Record<TimerLocale, TimerMessages> = {
  'zh-CN': {
    cancel: '取消',
    cancelReady: '取消准备',
    close: '关闭',
    confirmCreateSession: '确认新建列表',
    continue: '继续',
    createSession: '新建列表',
    defaultSession: '默认列表',
    delete: '删除',
    deleteSession: '删除列表',
    deleteSessionAria: (name) => `删除${name}`,
    deleteSolve: '删除成绩',
    eventSelectorLabel: '魔方类型',
    imageRenderFailed: (message) => `打乱图渲染失败：${message}`,
    loading: '载入成绩中...',
    mainNav: '主导航',
    newSessionFallback: '新列表',
    newSessionName: '新列表名称',
    noPenalty: '无',
    noSolves: '暂无成绩',
    refreshScramble: '换一个打乱',
    releaseToCancel: '松开取消',
    releaseToStart: '松开开始',
    slideUpToCancel: '上滑取消',
    resultSelection: '选择结果',
    statisticsAverage: '平均',
    statisticsBest: '最好',
    statisticsRollingAverage: (size) => `${size} 次平均`,
    statisticsValidCount: '有效 / 总数',
    scrambleLoading: '生成打乱中...',
    sessionList: '成绩列表',
    sessionSettings: '列表设置',
    sidebar: '练习列表',
    sidebarCollapse: '收起侧栏',
    sidebarExpand: '展开侧栏',
    solveDetail: '成绩详情',
    solves: '成绩',
    startReady: 'Enter',
    stats: '统计',
    storageError: (message) => `成绩暂时无法保存：${message}`,
    timer: '计时',
    timerPage: '计时器',
    toggleLanguage: 'Switch to English',
    toggleThemeDark: '切换深色模式',
    toggleThemeLight: '切换浅色模式',
    waitingScramble: '等待打乱',
    formulaLibrary: '公式库',
    holdEnterToStart: '按住 Enter 开始',
  },
  'en-US': {
    cancel: 'Cancel',
    cancelReady: 'Cancel ready',
    close: 'Close',
    confirmCreateSession: 'Create session',
    continue: 'Continue',
    createSession: 'New session',
    defaultSession: 'Default session',
    delete: 'Delete',
    deleteSession: 'Delete session',
    deleteSessionAria: (name) => `Delete ${name}`,
    deleteSolve: 'Delete solve',
    eventSelectorLabel: 'Cube event',
    imageRenderFailed: (message) => `Scramble image failed: ${message}`,
    loading: 'Loading solves...',
    mainNav: 'Main navigation',
    newSessionFallback: 'New session',
    newSessionName: 'New session name',
    noPenalty: 'None',
    noSolves: 'No solves yet',
    refreshScramble: 'New scramble',
    releaseToCancel: 'Release to cancel',
    releaseToStart: 'Release to start',
    slideUpToCancel: 'Slide up to cancel',
    resultSelection: 'Result actions',
    statisticsAverage: 'Average',
    statisticsBest: 'Best',
    statisticsRollingAverage: (size) => `Ao${size}`,
    statisticsValidCount: 'Valid / Total',
    scrambleLoading: 'Generating scramble...',
    sessionList: 'Session list',
    sessionSettings: 'Session settings',
    sidebar: 'Practice list',
    sidebarCollapse: 'Collapse sidebar',
    sidebarExpand: 'Expand sidebar',
    solveDetail: 'Solve detail',
    solves: 'Solves',
    startReady: 'Enter',
    stats: 'Stats',
    storageError: (message) => `Solves cannot be saved right now: ${message}`,
    timer: 'Timer',
    timerPage: 'Timer',
    toggleLanguage: '切换到中文',
    toggleThemeDark: 'Switch to dark mode',
    toggleThemeLight: 'Switch to light mode',
    waitingScramble: 'Waiting for scramble',
    formulaLibrary: 'Algorithms',
    holdEnterToStart: 'Hold Enter to start',
  },
};
