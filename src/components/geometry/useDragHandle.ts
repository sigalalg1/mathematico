import { useCallback, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Point } from '../../types/geometry';

interface UseDragHandleOptions {
  /** The stage's viewBox, so client pixel coordinates convert to the same user-space units every other geometry primitive uses. */
  viewBox: { width: number; height: number };
  onDrag: (point: Point) => void;
  onDragEnd?: () => void;
  disabled?: boolean;
}

/**
 * Pointer+touch drag handling for one draggable geometry handle, hand-rolled
 * on top of the Pointer Events API (unifies mouse/touch/pen) rather than
 * pulling in a gesture library — consistent with how the app's existing
 * `GeometryVisuals`/`CoordinateGrid` components already do their own pointer
 * math. `setPointerCapture` keeps the drag tracking even once the pointer
 * moves off the small handle, which is what makes a big invisible hit target
 * actually touch-friendly.
 */
export function useDragHandle({ viewBox, onDrag, onDragEnd, disabled }: UseDragHandleOptions) {
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const toStagePoint = useCallback(
    (event: ReactPointerEvent<SVGElement>): Point | null => {
      const svg = svgRef.current ?? event.currentTarget.ownerSVGElement;
      if (!svg) return null;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return null;
      return {
        x: ((event.clientX - rect.left) / rect.width) * viewBox.width,
        y: ((event.clientY - rect.top) / rect.height) * viewBox.height,
      };
    },
    [viewBox.width, viewBox.height],
  );

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<SVGElement>) => {
      if (disabled) return;
      svgRef.current = event.currentTarget.ownerSVGElement;
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setDragging(true);
      const point = toStagePoint(event);
      if (point) onDrag(point);
    },
    [disabled, onDrag, toStagePoint],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<SVGElement>) => {
      if (!dragging || disabled) return;
      const point = toStagePoint(event);
      if (point) onDrag(point);
    },
    [dragging, disabled, onDrag, toStagePoint],
  );

  const endDrag = useCallback(() => {
    if (!dragging) return;
    setDragging(false);
    onDragEnd?.();
  }, [dragging, onDragEnd]);

  return {
    dragging,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    },
  };
}
