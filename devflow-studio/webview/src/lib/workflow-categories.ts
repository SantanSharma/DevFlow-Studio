import type { WorkItem } from '../state/store';

export interface WorkflowCategory {
    key: string;
    label: string;
    states: string[];
}

export interface KanbanColumnConfig {
    title: string;
    states: string[];
}

export const OTHER_CATEGORY_KEY = 'other';
export const OTHER_CATEGORY_LABEL = 'Other';

// Manual mirror of src/util/workflow-categories.ts defaults (no shared package).
// Used until settings.get delivers the configured values, so first paint is correct.
export const DEFAULT_WORKFLOW_CATEGORIES: WorkflowCategory[] = [
    { key: 'new', label: 'New', states: ['New', 'Proposed', 'To Do', 'Triage'] },
    { key: 'readyForDev', label: 'Ready for Development', states: ['Ready for Dev', 'Ready to Retire/Estimate', 'Committed'] },
    { key: 'inDev', label: 'In Development', states: ['In Development', 'Active', 'In Progress', 'Code Review'] },
    { key: 'qa', label: 'QA', states: ['Ready for QA', 'In QA', 'Ready for Test', 'In Test', 'Dev and QA Closed'] },
    { key: 'blocked', label: 'Blocked', states: ['Blocked', 'On Hold', 'Redbin/Blocked'] },
    { key: 'completed', label: 'Completed', states: ['Closed', 'Resolved', 'Done', 'Dev Complete'] },
];

export const DEFAULT_KANBAN_COLUMNS: KanbanColumnConfig[] = [
    { title: 'New', states: ['New', 'Proposed', 'To Do', 'Triage'] },
    { title: 'Ready for Development', states: ['Ready for Dev', 'Ready to Retire/Estimate'] },
    { title: 'In Development', states: ['In Development', 'Active', 'In Progress', 'Code Review'] },
    { title: 'QA', states: ['Dev and QA Closed', 'Ready for QA', 'In QA', 'Ready for Test'] },
];

/** All states offered in state-picker dropdowns; live item states get unioned in. */
export const ALL_STATES = [
    'New',
    'Proposed',
    'To Do',
    'Triage',
    'Investigation',
    'Ready for Dev',
    'Active',
    'Committed',
    'In Progress',
    'In Development',
    'Code Review',
    'Ready for Test',
    'In Test',
    'Ready for QA',
    'In QA',
    'Blocked',
    'On Hold',
    'Redbin/Blocked',
    'Dev and QA Closed',
    'In Deployment',
    'Ready to Retire/Estimate',
    'Resolved',
    'Done',
    'Closed',
    'Removed',
];

export function normalizeState(state: string): string {
    return state.toLowerCase().trim();
}

/**
 * Single source for status dropdown options across the app: built-in states
 * first (alphabetical), then extras (user-configured custom states and states
 * present on live items) appended below, deduplicated case-insensitively.
 */
export function buildStateOptions(extras: Iterable<string>): string[] {
    const base = [...ALL_STATES].sort();
    const seen = new Set(base.map(normalizeState));
    const extra: string[] = [];
    for (const s of extras) {
        const norm = normalizeState(s);
        if (!norm || seen.has(norm)) {
            continue;
        }
        seen.add(norm);
        extra.push(s.trim());
    }
    extra.sort();
    return [...base, ...extra];
}

/**
 * Maps a state to a category key. Case-insensitive; categories evaluated in
 * array order, first match wins; unmatched states map to "other".
 */
export function categorizeState(
    state: string | undefined,
    categories: WorkflowCategory[],
): string {
    if (!state) return OTHER_CATEGORY_KEY;
    const norm = normalizeState(state);
    for (const cat of categories) {
        if (cat.states.some((s) => normalizeState(s) === norm)) {
            return cat.key;
        }
    }
    return OTHER_CATEGORY_KEY;
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

/**
 * Partitions items by category key. Every configured category gets an entry
 * (possibly empty); unmatched items land under "other".
 */
export function categorizeItems(
    items: WorkItem[],
    categories: WorkflowCategory[],
): Map<string, WorkItem[]> {
    const out = new Map<string, WorkItem[]>();
    for (const cat of categories) {
        out.set(cat.key, []);
    }
    out.set(OTHER_CATEGORY_KEY, []);
    for (const item of items) {
        const key = categorizeState(item.state, categories);
        out.get(key)!.push(item);
    }
    return out;
}

/**
 * Resolves work item ids to items known to the store, silently dropping
 * unknown ids (callers may note the omission via the drawer sourceDescription).
 */
export function resolveItems(ids: number[], items: WorkItem[]): WorkItem[] {
    const byId = new Map(items.map((i) => [i.id, i] as const));
    return ids
        .map((id) => byId.get(id))
        .filter((i): i is WorkItem => !!i);
}
