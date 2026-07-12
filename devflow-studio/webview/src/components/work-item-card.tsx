import React from 'react';
import type { WorkItem } from '../state/store';

interface Props {
    item: WorkItem;
    selected?: boolean;
    onClick: (id: number) => void;
}

/** Shared compact work item card used by the focus board and the universal drawer. */
export const WorkItemCard: React.FC<Props> = ({ item, selected, onClick }) => (
    <div
        className={`focus-card ${selected ? 'selected' : ''}`}
        onClick={() => onClick(item.id)}
    >
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
            <span className="item-points">{item.storyPoints ?? 0} pts</span>
            {item.priority && (
                <span className="item-priority">P{item.priority}</span>
            )}
        </div>
    </div>
);
