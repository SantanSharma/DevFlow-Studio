import React, { useState, useMemo, useEffect, useRef } from 'react';
import { WorkItem } from '../state/store';

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

export const TodaysFocusList: React.FC<{ items: WorkItem[] }> = ({ items }) => {
    const [sortBy, setSortBy] = useState<'priority' | 'age' | 'storyPoints'>('priority');
    
    // Default selected states matching My Active view
    const [selectedStates, setSelectedStates] = useState<Set<string>>(new Set([
        'Investigation',
        'Ready for QA',
        'New',
        'In Development',
        'Ready for Dev',
        'Ready to Retire/Estimate',
        'Dev and QA Closed',
        'In Deployment'
    ]));

    // Get ALL possible states (not just from items) - matching FilterBar
    const availableStates = useMemo(() => {
        const allStates = new Set<string>([
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
        ]);
        // Add any states from actual items that aren't in the default list
        items.forEach(item => allStates.add(item.state));
        return Array.from(allStates).sort();
    }, [items]);

    // Filter items by selected states
    const filteredItems = useMemo(() => {
        if (selectedStates.size === 0) return items;
        return items.filter(item => selectedStates.has(item.state));
    }, [items, selectedStates]);

    const sortedItems = useMemo(() => {
        return [...filteredItems].sort((a, b) => {
            if (sortBy === 'priority') {
                return (a.priority || 999) - (b.priority || 999);
            } else if (sortBy === 'age') {
                const dateA = a.changedDate ? new Date(a.changedDate).getTime() : 0;
                const dateB = b.changedDate ? new Date(b.changedDate).getTime() : 0;
                return dateA - dateB;
            } else {
                return (b.storyPoints || 0) - (a.storyPoints || 0);
            }
        });
    }, [filteredItems, sortBy]);

    const toggleState = (state: string) => {
        const newStates = new Set(selectedStates);
        if (newStates.has(state)) {
            newStates.delete(state);
        } else {
            newStates.add(state);
        }
        setSelectedStates(newStates);
    };

    const selectAllStates = () => setSelectedStates(new Set(availableStates));
    const clearAllStates = () => setSelectedStates(new Set());

    const getAgeDays = (item: WorkItem) => {
        if (!item.changedDate) return 0;
        const diff = Date.now() - new Date(item.changedDate).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    return (
        <div className="widget-content">
            <div className="widget-header">
                <h3>Today's Focus List ({filteredItems.length})</h3>
                <div className="sort-controls" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <MultiDropdown
                        label="Status"
                        options={availableStates}
                        selected={selectedStates}
                        onToggle={toggleState}
                        onClear={clearAllStates}
                        onSelectAll={selectAllStates}
                    />
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} style={{ fontSize: '11px' }}>
                        <option value="priority">Sort by Priority</option>
                        <option value="age">Sort by Age</option>
                        <option value="storyPoints">Sort by Story Points</option>
                    </select>
                </div>
            </div>

            {sortedItems.length === 0 ? (
                <p className="empty-state">No items match the selected filters.</p>
            ) : (
                <div className="focus-list">
                    {sortedItems.map((item) => (
                        <div key={item.id} className="focus-item">
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
                                <span className="item-age">{getAgeDays(item)}d old</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
