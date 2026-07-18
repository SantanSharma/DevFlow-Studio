import React, { useMemo, useState } from 'react';
import { call } from '../../lib/rpc';
import { useStore } from '../../state/store';
import { MultiDropdown } from '../multi-dropdown';
import {
    buildStateOptions,
    DEFAULT_KANBAN_COLUMNS,
    normalizeState,
    type KanbanColumnConfig,
} from '../../lib/workflow-categories';

const MAX_COLUMNS = 6;
const MIN_COLUMNS = 2;

interface Props {
    onError: (message: string) => void;
}

/**
 * Dashboard Configuration tab: Kanban column editor and completed-states
 * editor. All changes persist immediately via the settings.set RPC into
 * devflowStudio.* VS Code settings and are re-read through loadSettings.
 */
export const DashboardSettings: React.FC<Props> = ({ onError }) => {
    const items = useStore((s) => s.items);
    const columns = useStore((s) => s.kanbanColumns);
    const completedStates = useStore((s) => s.completedStates);
    const customStates = useStore((s) => s.customStates);
    const loadSettings = useStore((s) => s.loadSettings);
    const [customState, setCustomState] = useState('');
    const [newStatus, setNewStatus] = useState('');

    // Built-in states first, custom states and live item states listed below.
    const availableStates = useMemo(
        () => buildStateOptions([...customStates, ...items.map((i) => i.state)]),
        [items, customStates],
    );

    const persistColumns = async (next: KanbanColumnConfig[]): Promise<void> => {
        try {
            await call('settings.set', { key: 'kanbanColumns', value: next });
            await loadSettings();
        } catch (e) {
            onError(e instanceof Error ? e.message : String(e));
        }
    };

    const persistCompletedStates = async (next: string[]): Promise<void> => {
        try {
            await call('settings.set', { key: 'completedStates', value: next });
            await loadSettings();
        } catch (e) {
            onError(e instanceof Error ? e.message : String(e));
        }
    };

    const persistCustomStates = async (next: string[]): Promise<void> => {
        try {
            await call('settings.set', { key: 'customStates', value: next });
            await loadSettings();
        } catch (e) {
            onError(e instanceof Error ? e.message : String(e));
        }
    };

    const addCustomStatus = (): void => {
        const value = newStatus.trim();
        if (!value) return;
        const exists = availableStates.some((s) => normalizeState(s) === normalizeState(value));
        if (!exists) {
            void persistCustomStates([...customStates, value]);
        }
        setNewStatus('');
    };

    const updateColumn = (idx: number, patch: Partial<KanbanColumnConfig>): void => {
        void persistColumns(columns.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
    };

    const moveColumn = (idx: number, dir: -1 | 1): void => {
        const target = idx + dir;
        if (target < 0 || target >= columns.length) return;
        const next = [...columns];
        [next[idx], next[target]] = [next[target], next[idx]];
        void persistColumns(next);
    };

    // States mapped to more than one column (first match wins on the boards).
    const duplicateStates = useMemo(() => {
        const seen = new Map<string, number>();
        for (const col of columns) {
            for (const s of col.states) {
                const k = normalizeState(s);
                seen.set(k, (seen.get(k) ?? 0) + 1);
            }
        }
        return Array.from(seen.entries())
            .filter(([, count]) => count > 1)
            .map(([state]) => state);
    }, [columns]);

    const addCustomCompletedState = (): void => {
        const value = customState.trim();
        if (!value) return;
        const exists = completedStates.some((s) => normalizeState(s) === normalizeState(value));
        if (!exists) {
            void persistCompletedStates([...completedStates, value]);
        }
        setCustomState('');
    };

    const completedSelected = useMemo(
        () => new Set(completedStates),
        [completedStates],
    );

    return (
        <>
            <h3>Custom statuses</h3>
            <p className="help-text">
                Extra work item states beyond the built-in list. Added statuses appear in
                every status dropdown: the work items Status filter, the Kanban column
                editors below, the focus board column filters, and the completed states
                picker. Statuses already present on fetched items are offered automatically.
            </p>
            <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <input
                    type="text"
                    placeholder="Add status (e.g. In Deployment)"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomStatus();
                        }
                    }}
                    style={{ width: 220 }}
                />
                <button type="button" disabled={!newStatus.trim()} onClick={addCustomStatus}>
                    Add
                </button>
            </div>
            <div className="state-chips">
                {customStates.length === 0 && (
                    <span className="help-text">No custom statuses configured.</span>
                )}
                {customStates.map((s) => (
                    <span key={s} className="state-chip">
                        {s}
                        <button
                            type="button"
                            className="state-chip-remove"
                            title={`Remove ${s}`}
                            onClick={() => void persistCustomStates(customStates.filter((x) => x !== s))}
                        >
                            ✕
                        </button>
                    </span>
                ))}
            </div>

            <h3 style={{ marginTop: 24 }}>Kanban columns</h3>
            <p className="help-text">
                Columns used by the dashboard focus board and the work items Kanban view.
                Each column shows items whose state matches one of its mapped states
                (case-insensitive). Array order is display order. Items matching no column
                appear in an automatic &ldquo;Other&rdquo; column on the Kanban board.
            </p>
            {duplicateStates.length > 0 && (
                <p className="settings-warning">
                    ⚠ {duplicateStates.map((s) => `'${s}'`).join(', ')} mapped to more than one
                    column; items show in the first matching column.
                </p>
            )}
            {columns.map((col, idx) => (
                <div key={idx} className="column-editor-row">
                    <input
                        type="text"
                        className="column-title-input"
                        defaultValue={col.title}
                        placeholder="Column name"
                        onBlur={(e) => {
                            const title = e.target.value.trim();
                            if (title && title !== col.title) {
                                updateColumn(idx, { title });
                            }
                        }}
                    />
                    <MultiDropdown
                        label="States"
                        options={availableStates}
                        selected={new Set(col.states)}
                        onToggle={(state) => {
                            const has = col.states.some((s) => normalizeState(s) === normalizeState(state));
                            updateColumn(idx, {
                                states: has
                                    ? col.states.filter((s) => normalizeState(s) !== normalizeState(state))
                                    : [...col.states, state],
                            });
                        }}
                        onClear={() => updateColumn(idx, { states: [] })}
                        onSelectAll={(all) => updateColumn(idx, { states: all })}
                    />
                    <button type="button" className="secondary" disabled={idx === 0}
                        onClick={() => moveColumn(idx, -1)} title="Move up">↑</button>
                    <button type="button" className="secondary" disabled={idx === columns.length - 1}
                        onClick={() => moveColumn(idx, 1)} title="Move down">↓</button>
                    <button type="button" className="secondary" disabled={columns.length <= MIN_COLUMNS}
                        onClick={() => void persistColumns(columns.filter((_, i) => i !== idx))}>
                        Remove
                    </button>
                    {col.states.length === 0 && (
                        <span className="settings-warning">Column will always be empty</span>
                    )}
                </div>
            ))}
            <div className="row" style={{ gap: 8, marginTop: 8 }}>
                <button
                    type="button"
                    disabled={columns.length >= MAX_COLUMNS}
                    onClick={() => void persistColumns([...columns, { title: `Column ${columns.length + 1}`, states: [] }])}
                >
                    + Add column
                </button>
                <button
                    type="button"
                    className="secondary"
                    onClick={() => void persistColumns(DEFAULT_KANBAN_COLUMNS)}
                >
                    Reset to defaults
                </button>
            </div>

            <h3 style={{ marginTop: 24 }}>Completed states</h3>
            <p className="help-text">
                Items entering any of these states count as completed for the Story Points
                chart, velocity, and summaries. For states that never receive an ADO Closed
                Date, the completion date is resolved from revision history. Empty = built-in
                defaults. Note: the Summary donut groups by workflow categories, which is a
                separate mapping.
            </p>
            <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <MultiDropdown
                    label="Completed states"
                    options={availableStates}
                    selected={completedSelected}
                    onToggle={(state) => {
                        const has = completedStates.some((s) => normalizeState(s) === normalizeState(state));
                        void persistCompletedStates(
                            has
                                ? completedStates.filter((s) => normalizeState(s) !== normalizeState(state))
                                : [...completedStates, state],
                        );
                    }}
                    onClear={() => void persistCompletedStates([])}
                    onSelectAll={(all) => void persistCompletedStates(all)}
                />
                <input
                    type="text"
                    placeholder="Add custom state (e.g. Released)"
                    value={customState}
                    onChange={(e) => setCustomState(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addCustomCompletedState();
                        }
                    }}
                    style={{ width: 220 }}
                />
                <button type="button" disabled={!customState.trim()} onClick={addCustomCompletedState}>
                    Add
                </button>
            </div>
            <div className="state-chips">
                {completedStates.length === 0 && (
                    <span className="help-text">Using built-in defaults.</span>
                )}
                {completedStates.map((s) => (
                    <span key={s} className="state-chip">
                        {s}
                        <button
                            type="button"
                            className="state-chip-remove"
                            title={`Remove ${s}`}
                            onClick={() => void persistCompletedStates(completedStates.filter((x) => x !== s))}
                        >
                            ✕
                        </button>
                    </span>
                ))}
            </div>
        </>
    );
};
