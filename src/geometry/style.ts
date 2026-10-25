/**
 * Visual style tokens for the geometry engine's SVG rendering. Nothing in
 * `components/geometry` hardcodes a size, color or stroke width — every
 * visual knob comes from one of these presets, so a future Grade 4 skin
 * (larger controls, more color, simpler diagrams — not built in this change)
 * is a new preset object, not a rewrite of the renderer.
 *
 * `strokeWidth` is capped deliberately low in both presets: a previous
 * version of this app had a real bug where thick strokes made a near-90°
 * angle visually indistinguishable from an exact right angle. Any future
 * preset must keep `strokeWidth` thin for the same reason, even one that
 * otherwise goes bolder/friendlier for younger learners.
 */
export interface GeometryStyleTokens {
  /** SVG viewBox size this preset is designed for. */
  viewBox: { width: number; height: number };
  /** On-screen length (in viewBox units) every drawn ray gets, regardless of its underlying data — see the no-ray-length-cue rule. */
  rayLength: number;
  strokeWidth: number;
  vertexRadius: number;
  /** Visible handle dot radius. */
  handleRadius: number;
  /** Invisible pointer/touch hit-target radius around a handle — always >= handleRadius, touch-friendly. */
  handleHitRadius: number;
  /** Base radius of the first angle arc at a vertex; later arcs sharing the same vertex step outward by `arcStep`. */
  arcBaseRadius: number;
  arcStep: number;
  rightAngleMarkerSize: number;
  labelFontSize: number;
  labelOffset: number;
  gridStrokeWidth: number;
  colors: {
    ray: string;
    vertex: string;
    vertexLabel: string;
    arc: readonly string[];
    handle: string;
    handleActive: string;
    rightAngleMarker: string;
    grid: string;
    polygon: string;
    polygonFill: string;
  };
}

/** Mature, notation-heavy preset used by the Grade 7 Angles unit (this change). */
export const grade7GeometryStyle: GeometryStyleTokens = {
  viewBox: { width: 320, height: 320 },
  rayLength: 120,
  strokeWidth: 1.5,
  vertexRadius: 4,
  handleRadius: 7,
  handleHitRadius: 20,
  arcBaseRadius: 26,
  arcStep: 16,
  rightAngleMarkerSize: 10,
  labelFontSize: 15,
  labelOffset: 16,
  gridStrokeWidth: 1,
  colors: {
    ray: 'var(--text)',
    vertex: 'var(--text-h)',
    vertexLabel: 'var(--text-h)',
    arc: ['var(--blue)', 'var(--purple)', 'var(--mint)', 'var(--yellow)'],
    handle: 'var(--purple)',
    handleActive: 'var(--blue)',
    rightAngleMarker: 'var(--text-h)',
    grid: 'var(--border)',
    polygon: 'var(--mint)',
    polygonFill: 'rgba(126, 240, 195, 0.1)',
  },
};

/**
 * Larger-control, more colorful, simpler-diagram preset reserved for future
 * Grade 4 use. Not wired into any Grade 4 content in this change — exists so
 * the engine's reuse story is real rather than aspirational. Stroke width
 * stays thin for the QA reason above even though everything else goes bigger
 * and more playful.
 */
export const grade4GeometryStyle: GeometryStyleTokens = {
  viewBox: { width: 320, height: 320 },
  rayLength: 110,
  strokeWidth: 2.25,
  vertexRadius: 7,
  handleRadius: 12,
  handleHitRadius: 28,
  arcBaseRadius: 30,
  arcStep: 20,
  rightAngleMarkerSize: 14,
  labelFontSize: 19,
  labelOffset: 20,
  gridStrokeWidth: 1.5,
  colors: {
    ray: 'var(--pastel-mint)',
    vertex: 'var(--pastel-yellow)',
    vertexLabel: 'var(--pastel-yellow)',
    arc: ['var(--pastel-peach)', 'var(--pastel-mint)', 'var(--pastel-lavender)', 'var(--pastel-pink)'],
    handle: 'var(--pastel-peach)',
    handleActive: 'var(--pastel-pink)',
    rightAngleMarker: 'var(--pastel-yellow)',
    grid: 'var(--border)',
    polygon: 'var(--pastel-mint)',
    polygonFill: 'rgba(183, 240, 216, 0.16)',
  },
};
