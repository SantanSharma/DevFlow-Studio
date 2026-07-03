import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore, type WorkItem } from '../state/store';

interface Props {
    items: WorkItem[];
}

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
            <span className="multi-dd-label">{label}</span>
            <button
                type="button"
                className="multi-dd-trigger"
                onClick={() => setOpen((o) => !o)}
            >
                <span>{summary}</span>
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

export const FilterBar: React.FC<Props> = ({ items }) => {
    const filters = useStore((s) => s.filters);
    const toggleType = useStore((s) => s.toggleType);
    const toggleState = useStore((s) => s.toggleState);
    const setIteration = useStore((s) => s.setIteration);
    const setTypes = useStore((s) => s.setTypes);
    const setStates = useStore((s) => s.setStates);

    const { types, states, iterations } = useMemo(() => {
        const ts = new Set<string>([
            'Bug',
            'Task',
            'User Story',
            'Product Backlog Item',
            'Feature',
            'Epic',
            'Support Request',
            'Issue',
        ]);
        const ss = new Set<string>([
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
            'Blocked',
            'On Hold',
            'Redbin/Blocked',
            'Resolved',
            'Done',
            'Closed',
            'Removed',
        ]);
        const it = new Set<string>();
        for (const i of items) {
            ts.add(i.type);
            ss.add(i.state);
            if (i.iterationPath) {
                it.add(i.iterationPath);
            }
        }
        return {
            types: Array.from(ts).sort(),
            states: Array.from(ss).sort(),
            iterations: Array.from(it).sort(),
        };
    }, [items]);

    const clearAll = filters.types.size > 0 || filters.states.size > 0 || filters.iteration;

    return (
        <div className="filter-bar">
            <MultiDropdown
                label="Type"
                options={types}
                selected={filters.types}
                onToggle={toggleType}
                onClear={() => setTypes([])}
                onSelectAll={(all) => setTypes(all)}
            />
            <MultiDropdown
                label="Status"
                options={states}
                selected={filters.states}
                onToggle={toggleState}
                onClear={() => setStates([])}
                onSelectAll={(all) => setStates(all)}
            />
            {iterations.length > 0 && (
                <label className="filter-label">
                    <span>Iteration</span>
                    <select
                        value={filters.iteration ?? ''}
                        onChange={(e) => setIteration(e.target.value || undefined)}
                    >
                        <option value="">All iterations</option>
                        {iterations.map((i) => <option key={i} value={i}>{i}</option>)}
                    </select>
                </label>
            )}
            {clearAll && (
                <button
                    type="button"
                    className="secondary filter-clear"
                    onClick={() => { setTypes([]); setStates([]); setIteration(undefined); }}
                >Clear filters</button>
            )}
        </div>
    );
};
