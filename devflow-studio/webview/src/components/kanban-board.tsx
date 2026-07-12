import React, { useMemo, useState } from "react";
import type { WorkItem } from "../state/store";
import { useStore } from "../state/store";
import { normalizeState } from "../lib/workflow-categories";
import { useMetricClick, metricKeyHandler } from "../lib/use-metric-click";

interface Props {
  items: WorkItem[];
}

interface BoardColumn {
  title: string;
  /** State the item is set to when dropped here; undefined = drop disabled. */
  dropState?: string;
  items: WorkItem[];
}

export const KanbanBoard: React.FC<Props> = ({ items }) => {
  const updateState = useStore((s) => s.updateState);
  const select = useStore((s) => s.select);
  const columnConfig = useStore((s) => s.kanbanColumns);
  const openMetric = useMetricClick();
  const [draggingId, setDraggingId] = useState<number | undefined>();
  const [overCol, setOverCol] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  // Bucket items into the configured columns (case-insensitive state match).
  // Anything unmatched lands in an automatic trailing "Other" column so no
  // item is ever silently hidden.
  const columns = useMemo<BoardColumn[]>(() => {
    const matched = new Set<number>();
    const cols: BoardColumn[] = columnConfig.map((col) => {
      const states = new Set(col.states.map(normalizeState));
      const colItems = items.filter((i) => {
        if (matched.has(i.id)) return false;
        if (states.has(normalizeState(i.state))) {
          matched.add(i.id);
          return true;
        }
        return false;
      });
      return { title: col.title, dropState: col.states[0], items: colItems };
    });
    const other = items.filter((i) => !matched.has(i.id));
    if (other.length > 0) {
      cols.push({ title: "Other", dropState: undefined, items: other });
    }
    return cols;
  }, [items, columnConfig]);

  return (
    <div className="kanban-board">
      {columns.map((col) => (
        <div
          key={col.title}
          className={`kanban-column ${overCol === col.title ? "over" : ""}`}
          onDragOver={(e) => {
            if (!col.dropState) return;
            e.preventDefault();
            setOverCol(col.title);
          }}
          onDragLeave={() => {
            if (overCol === col.title) {
              setOverCol(undefined);
            }
          }}
          onDrop={async (e) => {
            if (!col.dropState) return;
            e.preventDefault();
            setOverCol(undefined);
            const id = Number(e.dataTransfer.getData("text/plain"));
            if (!id || busy) {
              return;
            }
            const item = items.find((i) => i.id === id);
            if (!item || normalizeState(item.state) === normalizeState(col.dropState)) {
              return;
            }
            setBusy(true);
            try {
              await updateState(id, col.dropState);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div
            className="kanban-column-header"
            title={
              col.dropState
                ? `Drop a card here to set its state to '${col.dropState}'. Click the count to list items.`
                : "Items whose state matches no configured column. Click the count to list items."
            }
          >
            <span>{col.title}</span>
            <span
              className="count metric-clickable"
              role="button"
              tabIndex={0}
              onClick={openMetric(`${col.title} (Kanban)`, col.items,
                "Items in this Kanban column, per your configured column states.")}
              onKeyDown={metricKeyHandler(openMetric(`${col.title} (Kanban)`, col.items,
                "Items in this Kanban column, per your configured column states."))}
            >
              {col.items.length}
            </span>
          </div>
          <div className="kanban-column-body">
            {col.items.map((i) => (
              <div
                key={i.id}
                className={`kanban-card ${draggingId === i.id ? "dragging" : ""}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", String(i.id));
                  e.dataTransfer.effectAllowed = "move";
                  setDraggingId(i.id);
                }}
                onDragEnd={() => setDraggingId(undefined)}
                onClick={() => select(i.id)}
                title={i.title}
              >
                <div className="kanban-card-id">
                  #{i.id} <span className="kanban-card-type">{i.type}</span>
                </div>
                <div className="kanban-card-title">{i.title}</div>
                {i.iterationPath && (
                  <div className="kanban-card-iter">
                    {i.iterationPath.split("\\").pop()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
