import React, { useState, useMemo, useEffect, useRef } from 'react';
import { WorkItem, useStore } from '../state/store';
import { InfoTooltip } from './info-tooltip';

interface MultiDropdownProps {
    label: string;
    options: string[];
    selected: Set<string>;
    onToggle: (value: string) => void;
    onClear: () => void;
    onSelectAll: (all: string[]) => void;
}

const MultiDropdown: React.FC<MultiDropdownProps> = ({
    label, options, selected, onToggle, onClear, onSelectAll,
}) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return;
        const onDown = (e: MouseEvent): void => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDown);
        return () => document.removeEventListener('mousedown', onDown);
    }, [open]);

    const summary = selected.size === 0
        ? `All ${label.toLowerCase()}`
        : selected.size === 1
            ? Array.from(selected)[0]
            : `${selected.size} selected`;

    return (
        <div className="multi-dd" ref={ref}>
            <button
                type="button"
                className="multi-dd-trigger"
                onClick={() => setOpen((o) => !o)}
                style={{ fontSize: '11px', padding: '4px 8px' }}
            >
                <span>{label}: {summary}</span>
                <span className="multi-dd-caret">▾</span>
            </button>
            {open && (
                <div className="multi-dd-menu" role="listbox">
                    <div className="multi-dd-actions">
                        <button type="button" onClick={() => onSelectAll(options)}>All</button>
                        <button type="button" onClick={onClear}>Clear</button>
                    </div>
                    {options.length === 0 && (
                        <div className="multi-dd-option" style={{ opacity: 0.6 }}>No options</div>
                    )}
                    {options.map((opt) => (
                        <label key={opt} className="multi-dd-option">
                            <input
                                type="checkbox"
                                checked={selected.has(opt)}
                                onChange={() => onToggle(opt)}
                            />
                            <span>{opt}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

// All states offered in the per-column filter dropdowns, matching FilterBar.
const ALL_STATES = [
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

interface FocusColumn {
    title: string;
    states: string[];
}

const DEFAULT_COLUMNS: FocusColumn[] = [
    {
        title: 'NEW',
        states: ['New', 'Proposed', 'To Do', 'Triage'],
    },
    {
        title: 'READY FOR DEV',
        states: ['Ready for Dev', 'Ready to Retire/Estimate'],
    },
    {
        title: 'IN DEVELOPMENT',
        states: ['In Development', 'Active', 'In Progress', 'Code Review'],
    },
    {
        title: 'DEV COMPLETE',
        states: ['Dev and QA Closed', 'Ready for QA', 'In QA', 'Ready for Test'],
    },
];

const FocusCard: React.FC<{ item: WorkItem; onClick: (id: number) => void }> = ({ item, onClick }) => (
    <div className="focus-card" onClick={() => onClick(item.id)}>
        <div className="item-header">
            <span className="item-id">#{item.id}</span>
            <span className={`item-type type-${item.type.toLowerCase().replace(/\s+/g, '-')}`}>
                {item.type}
            </span>
            {item.tags.includes('Blocked') && (
                <span className="blocked-badge">🚫 Blocked</span>
            )}
        </div>
        <div className="item-title">{item.title}</div>
        <div className="item-meta">
            <span className="item-state">{item.state}</span>
            {item.storyPoints && (
                <span className="item-points">{item.storyPoints} pts</span>
            )}
            {item.priority && (
                <span className="item-priority">P{item.priority}</span>
            )}
        </div>
    </div>
);

export const TodaysFocusList: React.FC<{ items: WorkItem[] }> = ({ items }) => {
    const select = useStore((s) => s.select);
    const [columnStates, setColumnStates] = useState<Set<string>[]>(
        DEFAULT_COLUMNS.map((col) => new Set(col.states)),
    );

    // Offer every known state plus anything present on the actual items.
    const availableStates = useMemo(() => {
        const all = new Set<string>(ALL_STATES);
        items.forEach((item) => all.add(item.state));
        return Array.from(all).sort();
    }, [items]);

    const columns = useMemo(
        () => DEFAULT_COLUMNS.map((col, idx) => {
            const states = columnStates[idx];
            const colItems = items
                .filter((item) => states.has(item.state))
                .sort((a, b) => (a.priority || 999) - (b.priority || 999));
            return { title: col.title, states, items: colItems };
        }),
        [items, columnStates],
    );

    const setStatesForColumn = (idx: number, next: Set<string>): void => {
        setColumnStates((prev) => prev.map((s, i) => (i === idx ? next : s)));
    };

    const totalShown = columns.reduce((sum, col) => sum + col.items.length, 0);

    return (
        <div className="widget-content todays-focus-kanban">
            <div className="widget-header">
                <h3>
                    Today&rsquo;s Focus List ({totalShown})
                    <InfoTooltip
                        description="Kanban board view of your currently assigned work items across different stages."
                        calculation="Displays all active work items assigned to you, organized into four configurable state columns."
                        benefit="Visual overview of your current work; helps prioritize and shows progress across stages. Click a card to open its details."
                    />
                </h3>
            </div>
            <div className="focus-kanban-board">
                {columns.map((col, idx) => (
                    <div key={col.title} className="focus-column">
                        <div className="focus-column-header">
                            <h4>{col.title}</h4>
                            <span className="focus-column-count">{col.items.length}</span>
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
                                    <FocusCard key={item.id} item={item} onClick={select} />
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
