/**
 * The basketball monkey's figure, extracted from `BasketballMonkeyCourt` so
 * it can be reused anywhere a basketball-themed answer picker wants the
 * same character — purely presentational, no game logic. Styled entirely
 * through `.bm-player`/`.bm-*` classes in `BasketballMonkeyCourt.css`.
 */
export function MonkeyFigure({ label, className }: { label: string; className?: string }) {
  return (
    <div className={`bm-player${className ? ` ${className}` : ''}`} role="img" aria-label={label}>
      <svg viewBox="0 0 180 220" aria-hidden="true">
        <path className="bm-tail" d="M67 157C27 178 17 137 40 126" />
        <ellipse className="bm-leg" cx="77" cy="183" rx="18" ry="29" />
        <ellipse className="bm-leg" cx="121" cy="183" rx="18" ry="29" />
        <path className="bm-shoe" d="M55 202h44v15H52c-8 0-9-10 3-15Z" />
        <path className="bm-shoe" d="M104 202h45c12 6 10 15 1 15h-46Z" />
        <ellipse className="bm-body" cx="99" cy="145" rx="45" ry="54" />
        <path className="bm-jersey" d="M65 111c19-14 49-14 68 0l5 63H60Z" />
        <text className="bm-jersey-mark" x="99" y="151" textAnchor="middle">
          M
        </text>
        <path className="bm-arm" d="M66 119 45 89" />
        <path className="bm-arm bm-arm-shoot" d="m128 116 17-45" />
        <circle className="bm-ear" cx="64" cy="72" r="20" />
        <circle className="bm-ear" cx="133" cy="72" r="20" />
        <circle className="bm-head" cx="99" cy="71" r="44" />
        <ellipse className="bm-muzzle" cx="99" cy="82" rx="29" ry="23" />
        <circle className="bm-eye" cx="84" cy="66" r="5" />
        <circle className="bm-eye" cx="114" cy="66" r="5" />
        <path className="bm-smile" d="M85 87q14 13 28 0" />
        <path className="bm-headband" d="M58 56q41-20 82 0" />
        <path className="bm-headband-tail" d="m136 52 24-12-15 22" />
        <circle className="bm-ball" cx="147" cy="54" r="24" />
        <path className="bm-ball-line" d="M123 54h48M147 30c-12 13-12 35 0 48M147 30c12 13 12 35 0 48" />
      </svg>
    </div>
  );
}
