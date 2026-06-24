"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { BlockInstance } from "@/lib/types";

function LayerRow({
  block,
  selected,
  onSelect,
}: {
  block: BlockInstance;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`layer ${selected ? "selected" : ""}`}
      onClick={onSelect}
    >
      <span
        className="grip"
        {...attributes}
        {...listeners}
        title="Trascina per riordinare"
      >
        <GripVertical size={15} />
      </span>
      <span className="name">{block.type}</span>
      {block.customHtml ? <span className="tag">AI</span> : null}
    </div>
  );
}

export function Layers({
  blocks,
  selectedId,
  onSelect,
  onReorder,
}: {
  blocks: BlockInstance[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (ids: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = blocks.map((b) => b.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from === -1 || to === -1) return;
    onReorder(arrayMove(ids, from, to));
  }

  if (blocks.length === 0) {
    return <p className="hint">No blocks yet — add one from the palette above.</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={blocks.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        {blocks.map((b) => (
          <LayerRow
            key={b.id}
            block={b}
            selected={b.id === selectedId}
            onSelect={() => onSelect(b.id)}
          />
        ))}
      </SortableContext>
    </DndContext>
  );
}
