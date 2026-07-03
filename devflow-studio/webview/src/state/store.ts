import { create } from "zustand";
import { call } from "../lib/rpc";

export interface WorkItem {
  id: number;
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
  parentId?: number;
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
  load: async (refresh) => {
    set({ loading: true, error: undefined });
    try {
      const items = await call<WorkItem[]>("workItems.list", {
        refresh: !!refresh,
      });
      set({ items, loading: false });
    } catch (e) {
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
      const s = await call<{ orgUrl?: string; project?: string }>(
        "settings.get",
      );
      set({ orgUrl: s?.orgUrl, project: s?.project });
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

const BLOCKED = new Set(["Redbin/Blocked", "Blocked", "On Hold"]);
const RESOLVED = new Set(["Resolved", "Closed", "Done", "Removed"]);

export function applyView(
  items: WorkItem[],
  view: ViewId,
  notes?: Record<string, NoteRecord>,
  worked?: Record<string, WorkedRecord>,
): WorkItem[] {
  switch (view) {
    case "active":
      return items.filter(
        (i) => !BLOCKED.has(i.state) && !RESOLVED.has(i.state),
      );
    case "blocked":
      return items.filter((i) => BLOCKED.has(i.state));
    case "resolved":
      return items.filter((i) => RESOLVED.has(i.state));
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
  for (const i of items) {
    if (BLOCKED.has(i.state) || RESOLVED.has(i.state) || !i.iterationPath) {
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
