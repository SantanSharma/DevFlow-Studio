import * as vscode from "vscode";

export interface WorkflowCategory {
  key: string;
  label: string;
  states: string[];
}

export interface KanbanColumn {
  title: string;
  states: string[];
}

// Defaults mirror the package.json contribution defaults. They must reproduce
// the pre-configuration behavior of every consumer exactly.
export const DEFAULT_WORKFLOW_CATEGORIES: WorkflowCategory[] = [
  { key: "new", label: "New", states: ["New", "Proposed", "To Do", "Triage"] },
  {
    key: "readyForDev",
    label: "Ready for Development",
    states: ["Ready for Dev", "Ready to Retire/Estimate", "Committed"],
  },
  {
    key: "inDev",
    label: "In Development",
    states: ["In Development", "Active", "In Progress", "Code Review"],
  },
  {
    key: "qa",
    label: "QA",
    states: [
      "Ready for QA",
      "In QA",
      "Ready for Test",
      "In Test",
      "Dev and QA Closed",
    ],
  },
  {
    key: "blocked",
    label: "Blocked",
    states: ["Blocked", "On Hold", "Redbin/Blocked"],
  },
  {
    key: "completed",
    label: "Completed",
    states: ["Closed", "Resolved", "Done", "Dev Complete"],
  },
];

export const DEFAULT_KANBAN_COLUMNS: KanbanColumn[] = [
  { title: "New", states: ["New", "Proposed", "To Do", "Triage"] },
  {
    title: "Ready for Development",
    states: ["Ready for Dev", "Ready to Retire/Estimate"],
  },
  {
    title: "In Development",
    states: ["In Development", "Active", "In Progress", "Code Review"],
  },
  {
    title: "QA",
    states: ["Dev and QA Closed", "Ready for QA", "In QA", "Ready for Test"],
  },
];

export function normalizeState(state: string): string {
  return state.toLowerCase().trim();
}

function isValidCategory(value: unknown): value is WorkflowCategory {
  const v = value as WorkflowCategory;
  return (
    !!v &&
    typeof v.key === "string" &&
    typeof v.label === "string" &&
    Array.isArray(v.states) &&
    v.states.every((s) => typeof s === "string")
  );
}

function isValidColumn(value: unknown): value is KanbanColumn {
  const v = value as KanbanColumn;
  return (
    !!v &&
    typeof v.title === "string" &&
    Array.isArray(v.states) &&
    v.states.every((s) => typeof s === "string")
  );
}

/** Configured workflow categories, falling back to defaults when unset/invalid. */
export function getWorkflowCategories(): WorkflowCategory[] {
  const configured = vscode.workspace
    .getConfiguration()
    .get<unknown[]>("devflowStudio.workflowCategories");
  if (Array.isArray(configured)) {
    const valid = configured.filter(isValidCategory);
    if (valid.length > 0) {
      return valid;
    }
  }
  return DEFAULT_WORKFLOW_CATEGORIES;
}

/** Configured Kanban columns, falling back to defaults when unset/invalid. */
export function getKanbanColumns(): KanbanColumn[] {
  const configured = vscode.workspace
    .getConfiguration()
    .get<unknown[]>("devflowStudio.kanbanColumns");
  if (Array.isArray(configured)) {
    const valid = configured.filter(isValidColumn);
    if (valid.length > 0) {
      return valid;
    }
  }
  return DEFAULT_KANBAN_COLUMNS;
}

/**
 * Maps a state to a category key. Case-insensitive; categories evaluated in
 * array order, first match wins; unmatched states map to "other".
 */
export function categorizeState(
  state: string | undefined,
  categories: WorkflowCategory[],
): string {
  if (!state) return "other";
  const norm = normalizeState(state);
  for (const cat of categories) {
    if (cat.states.some((s) => normalizeState(s) === norm)) {
      return cat.key;
    }
  }
  return "other";
}

/** Lowercased set of all states belonging to the given category keys. */
export function categoryStateSet(
  categories: WorkflowCategory[],
  keys: string[],
): Set<string> {
  const wanted = new Set(keys);
  const out = new Set<string>();
  for (const cat of categories) {
    if (wanted.has(cat.key)) {
      for (const s of cat.states) {
        out.add(normalizeState(s));
      }
    }
  }
  return out;
}
