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
      onClick={onSelect}
      className={`flex items-center gap-2 px-2.5 py-2 border rounded-md bg-white mb-1.5 cursor-pointer select-none ${
        selected ? "border-moca-red ring-1 ring-moca-red" : "border-gray-300 hover:bg-gray-50"
      }`}
    >
      <span
        className="text-gray-300 cursor-grab inline-flex"
        {...attributes}
        {...listeners}
        title="Trascina per riordinare"
      >
        <GripVertical size={15} />
      </span>
      <span className="flex-1 text-sm font-semibold capitalize text-moca-black">
        {block.type}
      </span>
      {block.customHtml ? (
        <span className="text-[10px] font-bold text-moca-red bg-moca-red-light rounded-full px-2 py-0.5">
          AI
        </span>
      ) : null}
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
    return (
      <p className="text-xs text-moca-gray leading-relaxed">
        Nessun blocco — aggiungine uno dalla palette qui sopra.
      </p>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
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
