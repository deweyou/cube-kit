import { BRAND_ICON_SVGS } from '@cubegin/icons/brand';

type ResolvedTheme = 'light' | 'dark';

const CUBEGIN_WORDMARK_SVGS: Record<ResolvedTheme, string> = {
  dark: BRAND_ICON_SVGS['cubegin-wordmark-dark'],
  light: BRAND_ICON_SVGS['cubegin-wordmark'],
};

export const getCubeginWordmarkSvg = (resolvedTheme: ResolvedTheme) =>
  CUBEGIN_WORDMARK_SVGS[resolvedTheme];
