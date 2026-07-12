import React, { useEffect, useRef, useState } from 'react';

export interface MultiDropdownProps {
    label: string;
    options: string[];
    selected: Set<string>;
    onToggle: (value: string) => void;
    onClear: () => void;
    onSelectAll: (all: string[]) => void;
}

/** Shared multi-select dropdown (checkbox list) used by boards and settings editors. */
export const MultiDropdown: React.FC<MultiDropdownProps> = ({
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
