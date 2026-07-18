// SVG → PNG for OGP cards (X crawlers don't render SVG).
// v0 uses system fonts (DejaVu on ubuntu runners); bundled fonts are a later polish.
import { Resvg } from '@resvg/resvg-js';

export function renderPng(svg, { width = 1280 } = {}) {
  const r = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: { loadSystemFonts: true, defaultFontFamily: 'DejaVu Sans' },
    background: '#0c0d10',
  });
  return r.render().asPng();
}
