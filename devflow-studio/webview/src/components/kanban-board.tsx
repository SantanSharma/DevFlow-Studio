import React, { useState } from "react";
import type { WorkItem } from "../state/store";
import { useStore } from "../state/store";

interface Props {
  items: WorkItem[];
}

const COLUMN_ORDER = [
  "New",
  "To Do",
  "Ready for Dev",
  "Active",
  "In Development",
  "In Progress",
  "Redbin/Blocked",
  "Blocked",
  "On Hold",
  "Resolved",
  "Closed",
  "Done",
];

function orderColumns(states: string[]): string[] {
  const ordered: string[] = [];
  for (const s of COLUMN_ORDER) {
    if (states.includes(s)) {
      ordered.push(s);
    }
  }
  for (const s of states) {
    if (!ordered.includes(s)) {
      ordered.push(s);
    }
  }
  return ordered;
}

export const KanbanBoard: React.FC<Props> = ({ items }) => {
  const updateState = useStore((s) => s.updateState);
  const select = useStore((s) => s.select);
  const [draggingId, setDraggingId] = useState<number | undefined>();
  const [overState, setOverState] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const columns = orderColumns(Array.from(new Set(items.map((i) => i.state))));
  const byState: Record<string, WorkItem[]> = {};
  for (const c of columns) {
    byState[c] = [];
  }
  for (const i of items) {
    byState[i.state].push(i);
  }

  return (
    <div className="kanban-board">
      {columns.map((col) => (
        <div
          key={col}
          className={`kanban-column ${overState === col ? "over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOverState(col);
          }}
          onDragLeave={() => {
            if (overState === col) {
              setOverState(undefined);
            }
          }}
          onDrop={async (e) => {
            e.preventDefault();
            setOverState(undefined);
            const id = Number(e.dataTransfer.getData("text/plain"));
            if (!id || busy) {
              return;
            }
            const item = items.find((i) => i.id === id);
            if (!item || item.state === col) {
              return;
            }
            setBusy(true);
            try {
              await updateState(id, col);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="kanban-column-header">
            <span>{col}</span>
            <span className="count">{byState[col].length}</span>
          </div>
          <div className="kanban-column-body">
            {byState[col].map((i) => (
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
