import { rawGetImage } from './cstimer.js';
import { WCA_EVENT_BY_ID, type ScrambleType, type WcaEventId } from './wca-events.js';

const ERROR_PREFIX = '@cubekit/scramble';

const SVG_OPEN_TAG = /^<svg\b([^>]*)>/;

const isWcaEventId = (type: string): type is WcaEventId =>
  Object.prototype.hasOwnProperty.call(WCA_EVENT_BY_ID, type);

/**
 * Upstream `cstimer_module` emits SVG strings shaped like:
 *
 *   <svg width="916" height="682.667" xmlns="..."> ... </svg>
 *
 * Note the missing `viewBox` attribute. When a consumer inlines the SVG into a
 * responsive container via `innerHTML` and then resizes it with CSS (e.g.
 * `max-width: 100%; height: auto;`), the absence of a `viewBox` means the
 * user-space coordinate system stays at its natural pixel extent. Any drawing
 * command that references coordinates outside the CSS box is clipped — for a
 * 7x7 cube, that clips away most of the unfolded net.
 *
 * We fix this centrally in the wrapper: derive a `viewBox` from the SVG's own
 * `width` / `height` attributes and inject it before returning. The output is
 * still a single self-contained SVG string — consumers can inline, save, or
 * encode it as a data URL exactly as before, but CSS resizing now scales the
 * whole drawing instead of clipping it.
 *
 * If the upstream ever starts emitting its own `viewBox` (unlikely), the
 * injection becomes a no-op: we skip any SVG that already has one.
 */
const ensureViewBox = (svg: string): string => {
  if (/\bviewBox\s*=/.test(svg)) return svg;
  const tagMatch = svg.match(SVG_OPEN_TAG);
  if (!tagMatch) return svg;
  const attrs = tagMatch[1];
  const widthMatch = attrs.match(/\bwidth\s*=\s*"([^"]+)"/);
  const heightMatch = attrs.match(/\bheight\s*=\s*"([^"]+)"/);
  if (!widthMatch || !heightMatch) return svg;
  return svg.replace(SVG_OPEN_TAG, `<svg$1 viewBox="0 0 ${widthMatch[1]} ${heightMatch[1]}">`);
};

/**
 * Render an SVG of the puzzle state after applying `scramble`.
 *
 * - Pass a {@link WcaEventId} → resolved to the underlying cstimer type id.
 * - Pass any other string → forwarded to `cstimer_module` as-is.
 * - An empty `scramble` yields an SVG of the solved state (valid, not an error).
 *
 * The returned SVG always carries a `viewBox` attribute so it resizes cleanly
 * inside CSS-sized containers. See {@link ensureViewBox} for the rationale.
 *
 * @throws Error if `cstimer_module` rejects the type or produces no image.
 */
export const getImage = (scramble: string, type: ScrambleType): string => {
  const cstimerType = isWcaEventId(type) ? WCA_EVENT_BY_ID[type].cstimerType : type;

  let result: string;
  try {
    result = rawGetImage(scramble, cstimerType);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `${ERROR_PREFIX}: image for type '${type}' was rejected by cstimer_module: ${message}`,
    );
  }

  if (!result) {
    throw new Error(`${ERROR_PREFIX}: cstimer_module produced no image for type '${type}'`);
  }

  return ensureViewBox(result);
};
