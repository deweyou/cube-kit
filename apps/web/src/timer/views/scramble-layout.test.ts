import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('scramble layout CSS', () => {
  it('keeps the page fixed while the timer stage owns vertical overflow', () => {
    expect(timerPageCss).toContain('overflow: hidden;');
    expect(timerPageCss).toContain('overflow-y: auto;');
    expect(timerPageCss).toContain('overscroll-behavior: contain;');
    expect(timerPageCss).toContain('scrollbar-width: none;');
    expect(timerPageCss).toContain('.stage::-webkit-scrollbar');
    expect(timerPageCss).toContain('display: none;');
    expect(timerPageCss).toContain('height: calc(100% - 72px);');
    expect(timerPageCss).toContain('margin-top: 72px;');
    expect(timerHeaderCss).toContain('height: 72px;');
    expect(timerHeaderCss).toContain('top: 0;');
    expect(timerHeaderCss).toContain('background: transparent;');
    expect(timerHeaderCss).toContain('border-bottom: 1px solid transparent;');
    expect(timerHeaderCss).toContain(".root[data-scrolled='true']");
    expect(timerHeaderCss).toContain('border-bottom-color: color-mix');
    expect(timerHeaderCss).toContain('z-index: 18;');
    expect(timerSidebarCss).toContain('z-index: 20;');
    expect(timerHeaderCss).not.toContain('backdrop-filter');
    expect(timerHeaderCss).not.toContain('.root::before');
    expect(timerPageCss).not.toContain('.root::after');
    expect(timerPageCss).not.toContain(".root[data-stage-scrolled='true']::before");
    expect(timerPageCss).not.toContain('linear-gradient');
    expect(timerPageCss).toContain(".root[data-sidebar='expanded'] .stage");
    expect(timerPageCss).toContain('.sidebarBackdrop');
    expect(timerPageCss).toContain('pointer-events: none;');
    expect(timerPageCss).toContain('visibility: hidden;');
  });

  it('places scramble content from the upper stage and leaves room to scroll', () => {
    expect(scrambleViewCss).toContain('height: 100%;');
    expect(scrambleViewCss).toContain('min-height: 100%;');
    expect(scrambleViewCss).toContain('overflow: hidden;');
    expect(scrambleViewCss).toContain('--action-stack-bottom: clamp(18px, 3.5vh, 40px);');
    expect(scrambleViewCss).toContain('--action-stack-gap: 10px;');
    expect(scrambleViewCss).toContain('--action-stack-height: 56px;');
    expect(scrambleViewCss).toContain('--scramble-content-gap: clamp(20px, 3.2vh, 40px);');
    expect(scrambleViewCss).toContain('grid-template-rows: minmax(0, 1fr) auto;');
    expect(scrambleViewCss).toContain(
      'padding: clamp(28px, 7vh, 84px) clamp(48px, 7vw, 96px) var(--action-stack-bottom);',
    );
    expect(scrambleViewCss).toContain('padding: clamp(8px, 2vh, 20px) 16px 0;');
    expect(scrambleViewCss).toContain('overflow-y: auto;');
    expect(scrambleViewCss).toContain('.startSurface::-webkit-scrollbar');
    expect(scrambleViewCss).toContain('position: relative;');
    expect(scrambleViewCss).toContain('.toolbarButton');
    expect(scrambleViewCss).toContain('min-height: 40px;');
    expect(scrambleViewCss).toContain('min-width: 40px;');
    expect(scrambleViewCss).toContain('--action-stack-bottom: 10px;');
    expect(scrambleViewCss).toContain('display: grid;');
    expect(scrambleViewCss).toContain('justify-items: center;');
    expect(scrambleViewCss).toContain('box-sizing: border-box;');
    expect(scrambleViewCss).toContain('align-self: stretch;');
    expect(scrambleViewCss).toContain(
      'padding: clamp(18px, 5vh, 48px) 16px calc(10px + env(safe-area-inset-bottom));',
    );
    expect(scrambleViewCss).toContain('@media (max-height: 760px)');
    expect(scrambleViewCss).toContain('--scramble-content-gap: clamp(14px, 2.6vh, 24px);');
    expect(scrambleViewCss).toContain('padding-top: clamp(16px, 4vh, 36px);');
    expect(scrambleViewCss).toContain('min-height: 0;');
    expect(scrambleViewCss).toContain('margin-top: 0;');
    expect(scrambleViewCss).toContain('position: static;');
    expect(scrambleViewCss).toContain('position: fixed;');
    expect(scrambleViewCss).toContain('inline-size: clamp(180px, 48vw, 260px);');
    expect(scrambleViewCss).toContain('min-width: 0;');
    expect(scrambleViewCss).toContain('left: calc(312px + (100vw - 312px) / 2);');
    expect(scrambleViewCss).toContain('z-index: 17;');
    expect(timerPageCss).toContain(
      ".root[data-sidebar='collapsed'] :global([class*='actionStack'][data-ready='true'])",
    );
    expect(scrambleViewCss).toContain('bottom: var(--action-stack-bottom);');
    expect(scrambleViewCss).toContain('background: color-mix');
    expect(scrambleViewCss).toContain('backdrop-filter: blur(10px);');
    expect(scrambleViewCss).toContain('user-select: none;');
    expect(scrambleViewCss).toContain('-webkit-touch-callout: none;');
    expect(scrambleViewCss).toContain('-webkit-user-select: none;');
    expect(scrambleViewCss).toContain(".actionStack[data-touch-ready='true']");
    expect(scrambleViewCss).toContain('opacity: 0;');
    expect(scrambleViewCss).toContain('.touchReadyOverlay');
    expect(scrambleViewCss).toContain('position: fixed;');
    expect(scrambleViewCss).toContain('z-index: 45;');
    expect(scrambleViewCss).toContain('.touchReadyOverlay::before');
    expect(scrambleViewCss).toContain('.touchReadyOverlay::after');
    expect(scrambleViewCss).toContain('transition: opacity 180ms ease;');
    expect(scrambleViewCss).toContain('to bottom');
    expect(scrambleViewCss).toContain('radial-gradient');
    expect(scrambleViewCss).toContain('ellipse at 50% 92%');
    expect(scrambleViewCss).toContain('var(--ui-color-danger-bg)');
    expect(scrambleViewCss).toContain('var(--ui-color-brand-text)');
    expect(scrambleViewCss).toContain('var(--ui-color-canvas) 34%');
    expect(scrambleViewCss).toContain(".touchReadyOverlay[data-cancel-target='true']");
    expect(scrambleViewCss).not.toContain(
      'color-mix(in srgb, var(--ui-color-danger-bg) 28%, transparent)',
    );
    expect(scrambleViewCss).not.toContain('border-bottom: 1px');
    expect(scrambleViewCss).not.toContain(
      '.touchCancelZone {\n  align-items: flex-end;\n  background:',
    );
    expect(scrambleViewCss).toContain('.touchCancelZone');
    expect(scrambleViewCss).toContain('height: 128px;');
    expect(scrambleViewCss).toContain('justify-content: center;');
    expect(scrambleViewCss).toContain('.touchCancelText');
    expect(scrambleViewCss).toContain('transform: translateY(0) scale(1);');
    expect(scrambleViewCss).toContain('transform: translateY(-2px) scale(1.12);');
    expect(scrambleViewCss).toContain('.touchReleaseHint');
    expect(scrambleViewCss).toContain('font-size: 1.18rem;');
    expect(scrambleViewCss).toContain('text-shadow: 0 1px 10px');
    expect(scrambleImageCss).toContain('height: auto;');
    expect(scrambleImageCss).toContain('width: clamp(260px, 38vw, 520px);');
    expect(scrambleImageCss).toContain('width: clamp(260px, 66vw, 420px);');
    expect(scrambleImageCss).toContain('width: clamp(230px, 56vw, 360px);');
    expect(scrambleImageCss).toContain(".root[data-event='sq1']");
    expect(scrambleImageCss).toContain('width: clamp(150px, 18vw, 240px);');
    expect(scrambleImageCss).toContain('width: clamp(150px, 40vw, 220px);');
    expect(scrambleImageCss).toContain('width: clamp(140px, 35vw, 190px);');
    expect(scrambleImageCss).toContain(".root[data-event='clock']");
    expect(scrambleImageCss).toContain(".root[data-event='minx']");
    expect(scrambleImageCss).toContain('width: clamp(300px, 42vw, 560px);');
    expect(scrambleImageCss).toContain('width: clamp(280px, 76vw, 440px);');
    expect(scrambleImageCss).toContain('width: clamp(260px, 70vw, 400px);');
    expect(scrambleImageCss).not.toContain('border: 1px solid');
    expect(scrambleImageCss).not.toContain('padding: clamp(10px');
    expect(scrambleViewCss).toContain(
      'bottom: calc(var(--action-stack-bottom) + var(--action-stack-height) + 24px);',
    );
    expect(scrambleViewCss).toContain('left: 50%;');
  });

  it('uses a compact mobile sidebar drawer behavior', () => {
    expect(timerSidebarCss).toContain('width: min(360px, calc(100vw - 48px));');
    expect(timerSidebarCss).toContain(
      'box-shadow: 18px 0 48px color-mix(in srgb, black 18%, transparent);',
    );
    expect(timerSidebarCss).toContain('z-index: 20;');
    expect(timerSidebarCss).not.toContain('height: 100dvh;');
  });
});

const timerPageCss = readFileSync(
  resolve(process.cwd(), 'src/timer/timer-page.module.css'),
  'utf8',
);

const timerHeaderCss = readFileSync(
  resolve(process.cwd(), 'src/timer/components/timer-header.module.css'),
  'utf8',
);

const scrambleViewCss = readFileSync(
  resolve(process.cwd(), 'src/timer/views/scramble-view.module.css'),
  'utf8',
);

const scrambleImageCss = readFileSync(
  resolve(process.cwd(), 'src/timer/components/scramble-image.module.css'),
  'utf8',
);

const timerSidebarCss = readFileSync(
  resolve(process.cwd(), 'src/timer/components/timer-sidebar.module.css'),
  'utf8',
);
