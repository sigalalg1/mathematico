import type { ReactNode } from 'react';
import './MathText.css';

interface MathTextProps {
  children: ReactNode;
  className?: string;
}

/** Renders math notation (numbers, ordered pairs) that must stay LTR even on an RTL page. */
export function MathText({ children, className }: MathTextProps) {
  return (
    <span className={`math-text${className ? ` ${className}` : ''}`} dir="ltr">
      {children}
    </span>
  );
}
