import { useTranslation } from 'react-i18next';
import { ANGLE_SCENE_HOTSPOTS, ANGLE_SCENE_POINTS as P, ANGLE_SCENE_VIEWBOX } from '../data/angleScene';
import type { AngleHotspot } from '../data/angleScene';
import type { Point } from '../types/geometry';
import { pointFromAngle } from '../utils/geometry';
import './AngleSceneVisual.css';

const { width: W, height: H } = ANGLE_SCENE_VIEWBOX;

function line(from: Point, to: Point) {
  return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
}

function towards(vertex: Point, target: Point, length: number): Point {
  const degrees = (Math.atan2(target.y - vertex.y, target.x - vertex.x) * 180) / Math.PI;
  return pointFromAngle(vertex, degrees, length);
}

/** Arc sweeping the opening between the two drawn edges of a hotspot. */
function hotspotArc(hotspot: AngleHotspot, radius: number): string {
  const first = towards(hotspot.vertex, hotspot.arms[0], radius);
  const second = towards(hotspot.vertex, hotspot.arms[1], radius);
  const cross =
    (hotspot.arms[0].x - hotspot.vertex.x) * (hotspot.arms[1].y - hotspot.vertex.y) -
    (hotspot.arms[0].y - hotspot.vertex.y) * (hotspot.arms[1].x - hotspot.vertex.x);
  return `M ${first.x} ${first.y} A ${radius} ${radius} 0 0 ${cross > 0 ? 1 : 0} ${second.x} ${second.y}`;
}

interface AngleSceneVisualProps {
  /** Hotspot the child picked, if any. Nothing is highlighted before that. */
  revealedHotspotId: string | null;
  disabled?: boolean;
  onSelect: (hotspot: AngleHotspot) => void;
}

/**
 * Playground scene built from real objects (house roof, kite, patio umbrella,
 * garden table) whose edges meet at genuine acute, right and obtuse angles.
 *
 * Nothing marks which angle is which before the child answers: the hotspots are
 * plain touch targets, and the arc plus the two thick edges only appear for the
 * hotspot that was actually clicked.
 */
export function AngleSceneVisual({ revealedHotspotId, disabled = false, onSelect }: AngleSceneVisualProps) {
  const { t } = useTranslation();
  const revealed = ANGLE_SCENE_HOTSPOTS.find((hotspot) => hotspot.id === revealedHotspotId) ?? null;

  return (
    <div className="angle-scene" data-testid="angle-scene">
      <svg className="angle-scene-art" viewBox={`0 0 ${W} ${H}`} style={{ direction: 'ltr' }} aria-hidden="true">
        <rect className="as-sky" x="0" y="0" width={W} height={H} />
        <rect className="as-ground" x="0" y={P.groundLeft.y} width={W} height={H - P.groundLeft.y} />
        <line className="as-edge as-ground-line" {...line(P.groundLeft, P.groundRight)} />

        {/* House: two roof edges meeting at the ridge, walls meeting roof and ground. */}
        <rect
          className="as-wall"
          x={P.roofLeft.x}
          y={P.roofLeft.y}
          width={P.roofRight.x - P.roofLeft.x}
          height={P.houseLeftFoot.y - P.roofLeft.y}
        />
        <rect className="as-door" x="88" y="150" width="24" height="40" rx="3" />
        <polygon className="as-roof" points={`${P.roofApex.x},${P.roofApex.y} ${P.roofLeft.x},${P.roofLeft.y} ${P.roofRight.x},${P.roofRight.y}`} />
        <line className="as-edge" {...line(P.roofApex, P.roofLeft)} />
        <line className="as-edge" {...line(P.roofApex, P.roofRight)} />
        <line className="as-edge" {...line(P.roofRight, P.houseRightFoot)} />
        <line className="as-edge" {...line(P.roofLeft, P.houseLeftFoot)} />

        {/* Kite: four edges, the top pair meeting at an acute angle. */}
        <path className="as-kite-tail" d={`M ${P.kiteBottom.x} ${P.kiteBottom.y} q -14 18 4 30 q 16 12 2 28`} />
        <polygon
          className="as-kite"
          points={`${P.kiteTop.x},${P.kiteTop.y} ${P.kiteRight.x},${P.kiteRight.y} ${P.kiteBottom.x},${P.kiteBottom.y} ${P.kiteLeft.x},${P.kiteLeft.y}`}
        />
        <line className="as-edge" {...line(P.kiteTop, P.kiteLeft)} />
        <line className="as-edge" {...line(P.kiteTop, P.kiteRight)} />

        {/* Patio umbrella: canopy edges over an upright pole. */}
        <line className="as-edge as-pole" {...line(P.umbrellaFoot, P.umbrellaApex)} />
        <polygon
          className="as-umbrella"
          points={`${P.umbrellaApex.x},${P.umbrellaApex.y} ${P.umbrellaLeft.x},${P.umbrellaLeft.y} ${P.umbrellaRight.x},${P.umbrellaRight.y}`}
        />
        <line className="as-edge" {...line(P.umbrellaApex, P.umbrellaLeft)} />
        <line className="as-edge" {...line(P.umbrellaApex, P.umbrellaRight)} />

        {/* Garden table: top edge meeting each upright leg. */}
        <line className="as-edge as-table-top" {...line(P.tableLeft, P.tableRight)} />
        <line className="as-edge as-leg" {...line(P.tableLeft, P.tableLeftFoot)} />
        <line className="as-edge as-leg" {...line(P.tableRight, P.tableRightFoot)} />

        {revealed && (
          <g className="as-reveal" data-testid="angle-scene-reveal">
            <line className="as-reveal-edge" {...line(revealed.vertex, towards(revealed.vertex, revealed.arms[0], 52))} />
            <line className="as-reveal-edge" {...line(revealed.vertex, towards(revealed.vertex, revealed.arms[1], 52))} />
            <path className="as-reveal-arc" d={hotspotArc(revealed, 24)} />
            <circle className="as-reveal-vertex" cx={revealed.vertex.x} cy={revealed.vertex.y} r="4" />
          </g>
        )}
      </svg>

      {ANGLE_SCENE_HOTSPOTS.map((hotspot) => (
        <button
          key={hotspot.id}
          type="button"
          className={`as-hotspot${revealedHotspotId === hotspot.id ? ' is-picked' : ''}`}
          style={{ left: `${(hotspot.vertex.x / W) * 100}%`, top: `${(hotspot.vertex.y / H) * 100}%` }}
          disabled={disabled}
          data-testid={`angle-hotspot-${hotspot.id}`}
          aria-label={t('geometry.a11y.sceneAngle', { object: t(`geometry.sceneObjects.${hotspot.objectKey}`) })}
          onClick={() => onSelect(hotspot)}
        >
          <span aria-hidden="true" />
        </button>
      ))}
    </div>
  );
}
