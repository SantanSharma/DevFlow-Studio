import React, { useState, useMemo, useEffect } from 'react';
import { WorkItem, useStore } from '../state/store';
import { InfoTooltip } from './info-tooltip';
import { WorkItemCard } from './work-item-card';
import { MultiDropdown } from './multi-dropdown';
import { buildStateOptions, normalizeState } from '../lib/workflow-categories';
import { useMetricClick, metricKeyHandler } from '../lib/use-metric-click';

export const TodaysFocusList: React.FC<{ items: WorkItem[] }> = ({ items }) => {
    const select = useStore((s) => s.select);
    const columnConfig = useStore((s) => s.kanbanColumns);
    const customStates = useStore((s) => s.customStates);
    const openMetric = useMetricClick();

    // Session-only per-column overrides of the configured states; re-derived
    // whenever the persisted column configuration changes.
    const [columnStates, setColumnStates] = useState<Set<string>[]>(
        () => columnConfig.map((col) => new Set(col.states)),
    );
    useEffect(() => {
        setColumnStates(columnConfig.map((col) => new Set(col.states)));
    }, [columnConfig]);

    // Built-in states first, then configured custom states and live item
    // states below, so newly configured statuses are selectable immediately.
    const availableStates = useMemo(
        () => buildStateOptions([...customStates, ...items.map((i) => i.state)]),
        [items, customStates],
    );

    const columns = useMemo(
        () => columnConfig.map((col, idx) => {
            const states = columnStates[idx] ?? new Set(col.states);
            const normalized = new Set(Array.from(states).map(normalizeState));
            // Empty selection means "All states" (matches the dropdown summary):
            // show every item instead of hiding the column's contents.
            const colItems = items
                .filter((item) => normalized.size === 0 || normalized.has(normalizeState(item.state)))
                .sort((a, b) => (a.priority || 999) - (b.priority || 999));
            return { title: col.title, states, items: colItems };
        }),
        [items, columnConfig, columnStates],
    );

    const setStatesForColumn = (idx: number, next: Set<string>): void => {
        setColumnStates((prev) => prev.map((s, i) => (i === idx ? next : s)));
    };

    const allColumnItems = useMemo(() => {
        const seen = new Set<number>();
        const out: WorkItem[] = [];
        for (const col of columns) {
            for (const item of col.items) {
                if (!seen.has(item.id)) {
                    seen.add(item.id);
                    out.push(item);
                }
            }
        }
        return out;
    }, [columns]);

    const totalShown = allColumnItems.length;

    return (
        <div className="widget-content todays-focus-kanban">
            <div className="widget-header">
                <h3>
                    Today&rsquo;s Focus List (
                    <span
                        className="metric-clickable"
                        role="button"
                        tabIndex={0}
                        onClick={openMetric("Today's focus items", allColumnItems,
                            'Union of all items currently shown across the focus board columns.')}
                        onKeyDown={metricKeyHandler(openMetric("Today's focus items", allColumnItems,
                            'Union of all items currently shown across the focus board columns.'))}
                    >{totalShown}</span>
                    )
                    <InfoTooltip
                        description="Kanban board view of your currently assigned work items across different stages."
                        calculation="Displays your active work items organized into the Kanban columns you configure in Settings → Dashboard Configuration (defaults provided). Per-column state filters here are session-only overrides."
                        benefit="Visual overview of your current work; helps prioritize and shows progress across stages. Click a card to open its details, or click a column count to list that column's items."
                    />
                </h3>
            </div>
            <div className="focus-kanban-board">
                {columns.map((col, idx) => (
                    <div key={`${col.title}-${idx}`} className="focus-column">
                        <div className="focus-column-header">
                            <h4>{col.title}</h4>
                            <span
                                className="focus-column-count metric-clickable"
                                role="button"
                                tabIndex={0}
                                onClick={openMetric(`${col.title} (focus board)`, col.items,
                                    'Items matching this focus board column’s state filter.')}
                                onKeyDown={metricKeyHandler(openMetric(`${col.title} (focus board)`, col.items,
                                    'Items matching this focus board column’s state filter.'))}
                            >{col.items.length}</span>
                        </div>
                        <MultiDropdown
                            label="States"
                            options={availableStates}
                            selected={col.states}
                            onToggle={(state) => {
                                const next = new Set(col.states);
                                next.has(state) ? next.delete(state) : next.add(state);
                                setStatesForColumn(idx, next);
                            }}
                            onClear={() => setStatesForColumn(idx, new Set())}
                            onSelectAll={(all) => setStatesForColumn(idx, new Set(all))}
                        />
                        <div className="focus-column-cards">
                            {col.items.length === 0 ? (
                                <p className="empty-state">No items</p>
                            ) : (
                                col.items.map((item) => (
                                    <WorkItemCard key={item.id} item={item} onClick={select} />
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
