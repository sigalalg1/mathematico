import { useTranslation } from 'react-i18next';

export type KeeperState = 'ready' | 'diveLeft' | 'diveRight' | 'save' | 'disappointed';

/**
 * The penalty-shootout goalkeeper, extracted from `PenaltyShootoutPage` so a
 * second soccer-themed court can reuse the exact same character — purely
 * presentational, no game logic. Styled entirely through `.ps-keeper*`
 * classes in `PenaltyShootoutPage.css`.
 */
export function Goalkeeper({ state, diveSide }: { state: KeeperState; diveSide?: 'left' | 'right' }) {
  const { t } = useTranslation();
  const saveSide = state === 'save' && diveSide === 'right' ? ' ps-keeper-saveRight' : '';
  return (
    <svg className={`ps-keeper ps-keeper-${state}${saveSide}`} viewBox="0 0 120 150" role="img" aria-label={t(`penaltyShootout.keeper.${state}`)}>
      <ellipse className="ps-keeper-shadow" cx="60" cy="142" rx="34" ry="7" />
      <g className="ps-keeper-person">
        <circle className="ps-keeper-head" cx="60" cy="30" r="18" />
        <path className="ps-keeper-hair" d="M43 29 Q47 7 64 11 Q79 13 78 31 Q67 20 43 29" />
        <rect className="ps-keeper-shirt" x="37" y="48" width="46" height="52" rx="15" />
        <path className="ps-keeper-arm" d="M39 57 L10 78" />
        <path className="ps-keeper-arm" d="M81 57 L110 78" />
        <circle className="ps-keeper-glove" cx="8" cy="80" r="9" />
        <circle className="ps-keeper-glove" cx="112" cy="80" r="9" />
        <path className="ps-keeper-leg" d="M50 96 L40 133" />
        <path className="ps-keeper-leg" d="M70 96 L82 133" />
        <circle className="ps-keeper-eye" cx="54" cy="29" r="2" />
        <circle className="ps-keeper-eye" cx="66" cy="29" r="2" />
        <path className="ps-keeper-mouth" d={state === 'disappointed' ? 'M53 41 Q60 34 67 41' : 'M53 38 Q60 44 67 38'} />
      </g>
    </svg>
  );
}
