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
    expect(timerPageCss).toContain(".root[data-sidebar='expanded']::before");
    expect(timerPageCss).toContain('pointer-events: none;');
    expect(timerPageCss).toContain('visibility: hidden;');
  });

  it('places scramble content from the upper stage and leaves room to scroll', () => {
    expect(scrambleViewCss).toContain('min-height: 100%;');
    expect(scrambleViewCss).toContain('overflow: visible;');
    expect(scrambleViewCss).toContain('--action-stack-bottom: clamp(20px, 4vh, 52px);');
    expect(scrambleViewCss).toContain('--action-stack-gap: 10px;');
    expect(scrambleViewCss).toContain('--action-stack-height: 56px;');
    expect(scrambleViewCss).toContain(
      '--action-stack-clearance: calc(\n    var(--action-stack-bottom) + var(--action-stack-height) + var(--action-stack-gap)\n  );',
    );
    expect(scrambleViewCss).toContain('grid-template-rows: minmax(min-content, 1fr) auto;');
    expect(scrambleViewCss).toContain('padding: clamp(32px, 8vh, 96px)');
    expect(scrambleViewCss).toContain('clamp(18px, 3vh, 40px)');
    expect(scrambleViewCss).toContain('padding: 16px;');
    expect(scrambleViewCss).toContain('position: relative;');
    expect(scrambleViewCss).toContain('.toolbarButton');
    expect(scrambleViewCss).toContain('min-height: 40px;');
    expect(scrambleViewCss).toContain('min-width: 40px;');
    expect(scrambleViewCss).toContain('--action-stack-bottom: 18px;');
    expect(scrambleViewCss).toContain('align-content: flex-start;');
    expect(scrambleViewCss).toContain('display: grid;');
    expect(scrambleViewCss).toContain('justify-items: center;');
    expect(scrambleViewCss).toContain('box-sizing: border-box;');
    expect(scrambleViewCss).toContain('align-self: stretch;');
    expect(scrambleViewCss).toContain(
      'padding: clamp(24px, 7vh, 72px) 16px clamp(18px, 4vh, 40px);',
    );
    expect(scrambleViewCss).toContain('min-height: auto;');
    expect(scrambleViewCss).toContain('@media (max-height: 760px)');
    expect(scrambleViewCss).toContain('padding-top: clamp(20px, 5vh, 48px);');
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
    expect(scrambleImageCss).toContain('width: clamp(220px, 32vw, 420px);');
    expect(scrambleImageCss).not.toContain('border: 1px solid');
    expect(scrambleImageCss).not.toContain('padding: clamp(10px');
    expect(scrambleViewCss).toContain(
      'bottom: calc(var(--action-stack-bottom) + var(--action-stack-height) + 24px);',
    );
    expect(scrambleViewCss).toContain('left: 50%;');
  });

  it('uses the original full-screen mobile sidebar behavior', () => {
    expect(timerSidebarCss).toContain('width: 100vw;');
    expect(timerSidebarCss).toContain('width: min(360px, 100vw);');
    expect(timerSidebarCss).toContain('z-index: 20;');
    expect(timerSidebarCss).not.toContain('height: 100dvh;');
    expect(timerSidebarCss).not.toContain('--ui-touch-target-min: 44px;');
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
