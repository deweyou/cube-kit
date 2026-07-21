import isMobile from 'is-mobile';

interface NavigatorWithUserAgentData extends Navigator {
  userAgentData?: {
    mobile?: boolean;
  };
}

export const isMobileWebDevice = (): boolean => {
  if (typeof navigator === 'undefined') return false;

  const webNavigator = navigator as NavigatorWithUserAgentData;
  if (webNavigator.userAgentData?.mobile === true) return true;

  return isMobile({
    tablet: true,
    featureDetect: true,
  });
};
