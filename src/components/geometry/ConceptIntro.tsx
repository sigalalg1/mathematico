import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import './GeometryLesson.css';

/**
 * The one reusable "interactive visual vocabulary" card for the whole Grade 4
 * geometry-foundations unit (see mission brief, Part B): a concept's name, a
 * one-sentence definition, an interactive diagram that demonstrates the
 * concept rather than just decorating the screen, and an optional "try it"
 * status line. Every one of the ~25 concepts across the unit's five learning
 * groups renders through this single component — only the diagram content
 * (built from `PolygonSceneView`/`VertexSceneView` and the shared SVG
 * primitives) and the i18n copy differ per concept, never the shell.
 */
export interface ConceptIntroProps {
  /** i18n key for the concept's Hebrew/English name (e.g. "קודקוד" / "Vertex"). */
  termKey: string;
  /** i18n key for the one-sentence, child-friendly definition. */
  definitionKey: string;
  /** The interactive illustration — built by the caller, but always rendered inside this same frame. */
  diagram: ReactNode;
  /** i18n key for the short "try it" instruction shown under the diagram. Omit for a purely illustrative concept with no direct interaction. */
  tryItKey?: string;
  /** Whether the child has completed the try-it interaction. */
  completed?: boolean;
  /** i18n key for the short success line shown once `completed` is true, replacing `tryItKey`'s instruction. */
  successKey?: string;
  className?: string;
}

export function ConceptIntro({ termKey, definitionKey, diagram, tryItKey, completed, successKey, className }: ConceptIntroProps) {
  const { t } = useTranslation();
  return (
    <section className={`concept-intro${className ? ` ${className}` : ''}`} data-testid="concept-intro">
      <h3 className="concept-intro-term">{t(termKey)}</h3>
      <p className="concept-intro-definition">{t(definitionKey)}</p>
      <div className="concept-intro-diagram">{diagram}</div>
      {tryItKey && (
        <p className={`concept-intro-tryit${completed ? ' is-complete' : ''}`} role="status" aria-live="polite" data-testid="concept-intro-tryit">
          {completed ? <span aria-hidden="true">✓ </span> : null}
          {completed && successKey ? t(successKey) : t(tryItKey)}
        </p>
      )}
    </section>
  );
}
