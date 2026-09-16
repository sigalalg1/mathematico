interface ProgressRingProps {
  value: number;
  total: number;
  /** Text shown in the middle; defaults to `value/total`. */
  label?: string;
}

const RADIUS = 62;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Circular score ring used on activity completion screens. It only ever
 * visualises data the activity already tracks (answers correct out of asked).
 */
export function ProgressRing({ value, total, label }: ProgressRingProps) {
  const ratio = total > 0 ? Math.min(1, Math.max(0, value / total)) : 0;

  return (
    <div className="progress-ring">
      <svg viewBox="0 0 148 148" aria-hidden="true" focusable="false">
        <circle className="progress-ring-track" cx="74" cy="74" r={RADIUS} />
        <circle
          className="progress-ring-fill"
          cx="74"
          cy="74"
          r={RADIUS}
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
        />
      </svg>
      <span className="progress-ring-value" dir="ltr">
        {label ?? `${value}/${total}`}
      </span>
    </div>
  );
}
