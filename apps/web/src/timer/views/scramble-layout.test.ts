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
    expect(timerPageCss).toContain('.root::before');
    expect(timerPageCss).toContain('height: 72px;');
    expect(timerPageCss).toContain('background: var(--ui-color-canvas);');
    expect(timerPageCss).toContain('circle at 68% 18%');
    expect(timerPageCss).toContain('.root::after');
    expect(timerPageCss).toContain('top: 72px;');
    expect(timerPageCss).toContain('linear-gradient');
    expect(timerPageCss).toContain('opacity: 0;');
    expect(timerPageCss).toContain(".root[data-stage-scrolled='true']::after");
    expect(timerPageCss).toContain(".root[data-stage-scrolled='true']::before");
    expect(timerPageCss).toContain('opacity: 1;');
    expect(timerPageCss).toContain(".root[data-sidebar='expanded'] .stage");
    expect(timerPageCss).toContain('pointer-events: none;');
    expect(timerPageCss).toContain('visibility: hidden;');
  });

  it('places scramble content from the upper stage and leaves room to scroll', () => {
    expect(scrambleViewCss).toContain('justify-content: center;');
    expect(scrambleViewCss).toContain('justify-content: safe center;');
    expect(scrambleViewCss).toContain('min-height: 100%;');
    expect(scrambleViewCss).toContain('overflow: visible;');
    expect(scrambleViewCss).toContain('--action-stack-bottom: clamp(20px, 4vh, 52px);');
    expect(scrambleViewCss).toContain('--action-stack-gap: 10px;');
    expect(scrambleViewCss).toContain('--action-stack-height: 56px;');
    expect(scrambleViewCss).toContain(
      '--action-stack-clearance: calc(\n    var(--action-stack-bottom) + var(--action-stack-height) + var(--action-stack-gap)\n  );',
    );
    expect(scrambleViewCss).toContain('padding: clamp(72px, 12vh, 144px)');
    expect(scrambleViewCss).toContain('justify-content: center;');
    expect(scrambleViewCss).toContain('clamp(180px, 20vh, 240px)');
    expect(scrambleViewCss).toContain('padding: 16px 16px clamp(96px, 11vh, 140px);');
    expect(scrambleViewCss).toContain('--action-stack-bottom: 18px;');
    expect(scrambleViewCss).toContain('align-content: safe center;');
    expect(scrambleViewCss).toContain('display: grid;');
    expect(scrambleViewCss).toContain('justify-items: center;');
    expect(scrambleViewCss).toContain('padding: 0 16px;');
    expect(scrambleViewCss).toContain('align-self: safe center;');
    expect(scrambleViewCss).toContain('padding: 0 0 var(--action-stack-clearance);');
    expect(scrambleViewCss).toContain('min-height: clamp(500px, 58vh, 660px);');
    expect(scrambleViewCss).toContain('min-height: auto;');
    expect(scrambleViewCss).toContain('position: fixed;');
    expect(scrambleViewCss).toContain('inline-size: clamp(196px, 56vw, 260px);');
    expect(scrambleViewCss).toContain('min-width: 0;');
    expect(scrambleViewCss).toContain('left: calc(312px + (100vw - 312px) / 2);');
    expect(scrambleViewCss).toContain('z-index: 17;');
    expect(timerPageCss).toContain(
      ".root[data-sidebar='collapsed'] :global([class*='actionStack'])",
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
    expect(scrambleViewCss).toContain('.touchCancelText');
    expect(scrambleViewCss).toContain('transform: translateY(0) scale(1);');
    expect(scrambleViewCss).toContain('transform: translateY(-2px) scale(1.12);');
    expect(scrambleViewCss).toContain('.touchReleaseHint');
    expect(scrambleViewCss).toContain('font-size: 1.18rem;');
    expect(scrambleViewCss).toContain('text-shadow: 0 1px 10px');
    expect(scrambleViewCss).toContain(
      'bottom: calc(var(--action-stack-bottom) + var(--action-stack-height) + 24px);',
    );
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

const scrambleViewCss = readFileSync(
  resolve(process.cwd(), 'src/timer/views/scramble-view.module.css'),
  'utf8',
);

const timerSidebarCss = readFileSync(
  resolve(process.cwd(), 'src/timer/components/timer-sidebar.module.css'),
  'utf8',
);
