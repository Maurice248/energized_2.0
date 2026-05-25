"use client";

import type {
  DraggableAttributes,
  DraggableSyntheticListeners,
} from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export type SortableDragProps = {
  attributes: DraggableAttributes;
  listeners: DraggableSyntheticListeners | undefined;
};

type Props = {
  id: string;
  children: (props: SortableDragProps) => React.ReactNode;
};

export function SortableSectionRow({ id, children }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={
        isDragging
          ? "rounded-2xl border-2 border-[var(--v2-accent-soft)] bg-[var(--v2-ink-50)] shadow-sm"
          : ""
      }
    >
      {children({ attributes, listeners })}
    </div>
  );
}
