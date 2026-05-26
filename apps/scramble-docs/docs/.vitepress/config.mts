import { defineConfig, type DefaultTheme } from 'vitepress';

const zhSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: '学习路径',
    items: [
      { text: '总览', link: '/zh/' },
      { text: 'WCA 打乱规则', link: '/zh/wca-rules' },
      { text: '打乱生成原理', link: '/zh/generation' },
      { text: 'Move Parser 与状态转换', link: '/zh/state-transition' },
      { text: '打乱图生成原理', link: '/zh/image-rendering' },
      { text: 'CubeKit 包边界', link: '/zh/cubekit-packages' },
    ],
  },
];

const enSidebar: DefaultTheme.SidebarItem[] = [
  {
    text: 'Learning Path',
    items: [
      { text: 'Overview', link: '/en/' },
      { text: 'WCA Scramble Rules', link: '/en/wca-rules' },
      { text: 'Generation Pipeline', link: '/en/generation' },
      { text: 'Move Parser And State Transition', link: '/en/state-transition' },
      { text: 'Image Rendering Pipeline', link: '/en/image-rendering' },
      { text: 'CubeKit Package Boundaries', link: '/en/cubekit-packages' },
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
      label: 'Languages',
      lang: 'zh-CN',
      title: 'CubeKit Scramble Docs',
      description: 'WCA scramble generation and scramble image rendering explained.',
      themeConfig: {
        nav: [
          { text: '中文', link: '/zh/' },
          { text: 'English', link: '/en/' },
        ],
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
          { text: '包文档', link: '/zh/cubekit-packages' },
          { text: 'English', link: '/en/' },
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
    en: {
      label: 'English',
      lang: 'en-US',
      title: 'CubeKit Scramble Docs',
      description: 'WCA scramble generation and scramble image rendering explained.',
      themeConfig: {
        nav: [
          { text: 'Overview', link: '/en/' },
          { text: 'Packages', link: '/en/cubekit-packages' },
          { text: '中文', link: '/zh/' },
        ],
        sidebar: enSidebar,
      },
    },
  },
});
