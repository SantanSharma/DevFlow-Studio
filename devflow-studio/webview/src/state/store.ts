import { create } from "zustand";
import { call } from "../lib/rpc";
import {
  DEFAULT_KANBAN_COLUMNS,
  DEFAULT_WORKFLOW_CATEGORIES,
  categoryStateSet,
  normalizeState,
  type KanbanColumnConfig,
  type WorkflowCategory,
} from "../lib/workflow-categories";

export interface WorkItem {
  id: number;
  rev?: number;
  type: string;
  state: string;
  title: string;
  iterationPath?: string;
  areaPath?: string;
  assignedTo?: string;
  priority?: number;
  storyPoints?: number;
  tags: string[];
  changedDate?: string;
  createdDate?: string;
  // Populated from ADO when available. Items from workItems.list carry the raw
  // ADO value; dashboard.metrics items additionally get revision-resolved
  // completion dates for custom completed states (see resolveCompletionDates).
  closedDate?: string;
  parentId?: number;
  url?: string;
}

export interface NoteEntry {
  ts: string;
  text: string;
}

export interface NoteRecord {
  entries: NoteEntry[];
  done: boolean;
  updatedAt: string;
}

export interface WorkedRecord {
  snapshot: WorkItem;
  pinnedAt: string;
}

export type BoardMode = "grid" | "kanban";

export type ViewId =
  | "active"
  | "today"
  | "blocked"
  | "sprint"
  | "all"
  | "resolved"
  | "todo"
  | "worked";

export interface Filters {
  types: Set<string>;
  states: Set<string>;
  iteration?: string;
  search: string;
}

export interface WorkItemsDrawerState {
  title: string;
  items: WorkItem[];
  /** Optional one-line explanation of how this list was derived (shown under the title). */
  sourceDescription?: string;
}

interface StoreState {
  items: WorkItem[];
  loading: boolean;
  error?: string;
  view: ViewId;
  boardMode: BoardMode;
  filters: Filters;
  selectedId?: number;
  notes: Record<string, NoteRecord>;
  worked: Record<string, WorkedRecord>;
  orgUrl?: string;
  project?: string;
  // Configurable workflow mappings (loaded via settings.get; defaults until then).
  workflowCategories: WorkflowCategory[];
  kanbanColumns: KanbanColumnConfig[];
  completedStates: string[];
  // Universal work items drawer (list + detail). Deliberately separate from
  // selectedId, which drives the legacy standalone DetailDrawer.
  workItemsDrawer?: WorkItemsDrawerState;
  drawerSelectedId?: number;
  openWorkItemsDrawer: (drawer: WorkItemsDrawerState) => void;
  closeWorkItemsDrawer: () => void;
  selectInDrawer: (id?: number) => void;
  setView: (v: ViewId) => void;
  setBoardMode: (m: BoardMode) => void;
  setSearch: (s: string) => void;
  toggleType: (t: string) => void;
  toggleState: (s: string) => void;
  setTypes: (t: string[]) => void;
  setStates: (s: string[]) => void;
  setIteration: (i?: string) => void;
  select: (id?: number) => void;
  load: (refresh?: boolean) => Promise<void>;
  loadSettings: () => Promise<void>;
  updateState: (id: number, state: string) => Promise<void>;
  loadNotes: () => Promise<void>;
  appendNoteEntry: (id: number, text: string) => Promise<void>;
  deleteNoteEntry: (id: number, ts: string) => Promise<void>;
  toggleNoteDone: (id: number, done?: boolean) => Promise<void>;
  loadWorked: () => Promise<void>;
  pinWorked: (item: WorkItem) => Promise<void>;
  unpinWorked: (id: number) => Promise<void>;
  openExternal: (url: string) => Promise<void>;
}

export const useStore = create<StoreState>((set, get) => ({
  items: [],
  loading: false,
  view: "active",
  boardMode: "grid",
  filters: { types: new Set(), states: new Set(), search: "" },
  notes: {},
  worked: {},
  workflowCategories: DEFAULT_WORKFLOW_CATEGORIES,
  kanbanColumns: DEFAULT_KANBAN_COLUMNS,
  completedStates: [],
  setView: (v) => set({ view: v }),
  setBoardMode: (m) => set({ boardMode: m }),
  setSearch: (search) => set({ filters: { ...get().filters, search } }),
  toggleType: (t) => {
    const f = get().filters;
    const next = new Set(f.types);
    next.has(t) ? next.delete(t) : next.add(t);
    set({ filters: { ...f, types: next } });
  },
  toggleState: (s) => {
    const f = get().filters;
    const next = new Set(f.states);
    next.has(s) ? next.delete(s) : next.add(s);
    set({ filters: { ...f, states: next } });
  },
  setTypes: (t) => set({ filters: { ...get().filters, types: new Set(t) } }),
  setStates: (s) => set({ filters: { ...get().filters, states: new Set(s) } }),
  setIteration: (iteration) =>
    set({ filters: { ...get().filters, iteration } }),
  select: (id) => set({ selectedId: id }),
  openWorkItemsDrawer: (drawer) =>
    set({ workItemsDrawer: drawer, drawerSelectedId: undefined }),
  closeWorkItemsDrawer: () =>
    set({ workItemsDrawer: undefined, drawerSelectedId: undefined }),
  selectInDrawer: (id) => set({ drawerSelectedId: id }),
  load: async (refresh) => {
    set({ loading: true, error: undefined });
    try {
      const items = await call<WorkItem[]>("workItems.list", {
        refresh: !!refresh,
      });
      set({ items, loading: false });
    } catch (e) {
      console.error("[STORE] Failed to load work items:", e);
      set({
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  },
  updateState: async (id, state) => {
    await call("workItems.updateState", { id, state });
    await get().load(true);
  },
  loadSettings: async () => {
    try {
      const s = await call<{
        orgUrl?: string;
        project?: string;
        workflowCategories?: WorkflowCategory[];
        kanbanColumns?: KanbanColumnConfig[];
        completedStates?: string[];
      }>("settings.get");
      set({
        orgUrl: s?.orgUrl,
        project: s?.project,
        workflowCategories:
          s?.workflowCategories && s.workflowCategories.length > 0
            ? s.workflowCategories
            : DEFAULT_WORKFLOW_CATEGORIES,
        kanbanColumns:
          s?.kanbanColumns && s.kanbanColumns.length > 0
            ? s.kanbanColumns
            : DEFAULT_KANBAN_COLUMNS,
        completedStates: s?.completedStates ?? [],
      });
    } catch {
      /* ignore */
    }
  },
  loadNotes: async () => {
    try {
      const notes = await call<Record<string, NoteRecord>>("notes.list");
      set({ notes });
    } catch {
      /* ignore */
    }
  },
  appendNoteEntry: async (id, text) => {
    const rec = await call<NoteRecord>("notes.appendEntry", { id, text });
    set({ notes: { ...get().notes, [String(id)]: rec } });
  },
  deleteNoteEntry: async (id, ts) => {
    const rec = await call<NoteRecord>("notes.deleteEntry", { id, ts });
    set({ notes: { ...get().notes, [String(id)]: rec } });
  },
  toggleNoteDone: async (id, done) => {
    const rec = await call<NoteRecord>("notes.toggleDone", { id, done });
    set({ notes: { ...get().notes, [String(id)]: rec } });
  },
  loadWorked: async () => {
    try {
      const worked = await call<Record<string, WorkedRecord>>("worked.list");
      set({ worked });
    } catch {
      /* ignore */
    }
  },
  pinWorked: async (item) => {
    const worked = await call<Record<string, WorkedRecord>>("worked.add", {
      item,
    });
    set({ worked });
  },
  unpinWorked: async (id) => {
    const worked = await call<Record<string, WorkedRecord>>("worked.remove", {
      id,
    });
    set({ worked });
  },
  openExternal: async (url) => {
    await call("system.openExternal", { url });
  },
}));

// States representing deleted/removed items; not part of any workflow category.
const REMOVED_STATES = new Set(["removed", "deleted"]);

/** Lowercased blocked states from the configured workflow categories. */
function blockedSet(): Set<string> {
  return categoryStateSet(useStore.getState().workflowCategories, ["blocked"]);
}

/** Lowercased resolved states: the completed category plus removed/deleted. */
function resolvedSet(): Set<string> {
  const set = categoryStateSet(useStore.getState().workflowCategories, [
    "completed",
  ]);
  for (const s of REMOVED_STATES) {
    set.add(s);
  }
  return set;
}

export function applyView(
  items: WorkItem[],
  view: ViewId,
  notes?: Record<string, NoteRecord>,
  worked?: Record<string, WorkedRecord>,
): WorkItem[] {
  switch (view) {
    case "active": {
      const blocked = blockedSet();
      const resolved = resolvedSet();
      return items.filter(
        (i) =>
          !blocked.has(normalizeState(i.state)) &&
          !resolved.has(normalizeState(i.state)),
      );
    }
    case "blocked": {
      const blocked = blockedSet();
      return items.filter((i) => blocked.has(normalizeState(i.state)));
    }
    case "resolved": {
      const resolved = resolvedSet();
      return items.filter((i) => resolved.has(normalizeState(i.state)));
    }
    case "todo": {
      const n = notes ?? {};
      return items.filter((i) => {
        const rec = n[String(i.id)];
        return rec && rec.entries.length > 0;
      });
    }
    case "worked": {
      const w = worked ?? {};
      const byId = new Map(items.map((i) => [i.id, i] as const));
      const out: WorkItem[] = [];
      for (const [idStr, rec] of Object.entries(w)) {
        const id = Number(idStr);
        out.push(byId.get(id) ?? rec.snapshot);
      }
      out.sort((a, b) => {
        const ta = w[String(a.id)]?.pinnedAt ?? "";
        const tb = w[String(b.id)]?.pinnedAt ?? "";
        return tb.localeCompare(ta);
      });
      return out;
    }
    case "today": {
      const since = Date.now() - 24 * 3600_000;
      return items.filter(
        (i) => i.changedDate && new Date(i.changedDate).getTime() >= since,
      );
    }
    case "sprint": {
      const sprint = guessSprint(items);
      return sprint
        ? items.filter((i) => i.iterationPath?.includes(sprint))
        : items;
    }
    case "all":
    default:
      return items;
  }
}

export function applyFilters(items: WorkItem[], f: Filters): WorkItem[] {
  return items.filter((i) => {
    if (f.types.size && !f.types.has(i.type)) {
      return false;
    }
    if (f.states.size && !f.states.has(i.state)) {
      return false;
    }
    if (f.iteration && !i.iterationPath?.includes(f.iteration)) {
      return false;
    }
    if (f.search) {
      const q = f.search.toLowerCase();
      if (
        !i.title.toLowerCase().includes(q) &&
        String(i.id) !== f.search.trim()
      ) {
        return false;
      }
    }
    return true;
  });
}

function guessSprint(items: WorkItem[]): string | undefined {
  const counts = new Map<string, number>();
  const blocked = blockedSet();
  const resolved = resolvedSet();
  for (const i of items) {
    if (
      blocked.has(normalizeState(i.state)) ||
      resolved.has(normalizeState(i.state)) ||
      !i.iterationPath
    ) {
      continue;
    }
    counts.set(i.iterationPath, (counts.get(i.iterationPath) ?? 0) + 1);
  }
  let best: string | undefined;
  let max = 0;
  for (const [k, v] of counts) {
    if (v > max) {
      best = k;
      max = v;
    }
  }
  return best;
}
