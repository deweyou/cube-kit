import { defineConfig, type DefaultTheme } from 'vitepress';

const zhSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: '学习路径',
    items: [
      { text: '总览', link: '/zh/' },
      { text: '规则与公平性', link: '/zh/wca-rules' },
      { text: '生成模型', link: '/zh/generation' },
      { text: '状态空间与坐标编码', link: '/zh/state-space' },
      { text: '搜索与剪枝', link: '/zh/search-pruning' },
      { text: '各项目打乱策略', link: '/zh/event-families' },
      { text: '状态转换', link: '/zh/state-transition' },
      { text: '打乱图生成原理', link: '/zh/image-rendering' },
    ],
  },
];

const rootSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: 'Learning Path',
    items: [
      { text: 'Overview', link: '/' },
      { text: 'Rules And Fairness', link: '/wca-rules' },
      { text: 'Generation Model', link: '/generation' },
      { text: 'State Space And Coordinates', link: '/state-space' },
      { text: 'Search And Pruning', link: '/search-pruning' },
      { text: 'Event Strategies', link: '/event-families' },
      { text: 'State Transition', link: '/state-transition' },
      { text: 'Scramble Image Rendering', link: '/image-rendering' },
    ],
  },
];

export default defineConfig({
  title: 'CubeKit Scramble Docs',
  description: 'A bilingual guide to WCA scramble generation and scramble image rendering.',
  cleanUrls: true,
  lastUpdated: true,
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    config(md) {
      const defaultFence = md.renderer.rules.fence;

      md.renderer.rules.fence = (tokens, index, options, env, self) => {
        const token = tokens[index];
        const language = token?.info.trim().split(/\s+/)[0];

        if (language === 'mermaid') {
          return `<MermaidDiagram code="${encodeURIComponent(token.content)}" />`;
        }

        return defaultFence
          ? defaultFence(tokens, index, options, env, self)
          : self.renderToken(tokens, index, options);
      };
    },
  },
  themeConfig: {
    socialLinks: [{ icon: 'github', link: 'https://github.com/deweyou/cubekit' }],
  },
  locales: {
    root: {
      label: 'English',
      lang: 'en-US',
      title: 'CubeKit Scramble Docs',
      description: 'WCA scramble generation and scramble image rendering explained.',
      themeConfig: {
        nav: [
          { text: 'Overview', link: '/' },
          { text: 'Event Strategies', link: '/event-families' },
          { text: 'Images', link: '/image-rendering' },
        ],
        sidebar: rootSidebar,
      },
    },
    zh: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'CubeKit 打乱文档',
      description: 'WCA 魔方打乱生成与打乱图生成原理。',
      themeConfig: {
        nav: [
          { text: '总览', link: '/zh/' },
          { text: '各项目策略', link: '/zh/event-families' },
          { text: '打乱图', link: '/zh/image-rendering' },
        ],
        sidebar: zhSidebar,
        outline: {
          label: '本页目录',
        },
        docFooter: {
          prev: '上一页',
          next: '下一页',
        },
        lastUpdated: {
          text: '最后更新',
        },
      },
    },
  },
});
