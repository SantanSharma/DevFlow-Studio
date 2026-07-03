import React from 'react';
import { useStore, type WorkItem } from '../state/store';
import { FilterBar } from '../components/filter-bar';
import { MyDayWidget } from '../components/my-day-widget';
import { WorkItemGrid } from '../components/work-item-grid';
import { DetailDrawer } from '../components/detail-drawer';
import { KanbanBoard } from '../components/kanban-board';

interface Props {
    items: WorkItem[];
    allItems: WorkItem[];
}

export const Dashboard: React.FC<Props> = ({ items, allItems }) => {
    const loading = useStore((s) => s.loading);
    const error = useStore((s) => s.error);
    const selectedId = useStore((s) => s.selectedId);
    const select = useStore((s) => s.select);
    const boardMode = useStore((s) => s.boardMode);

    return (
        <>
            <MyDayWidget items={allItems} />
            <FilterBar items={allItems} />
            {error && <div className="error">{error}</div>}
            {loading && items.length === 0 && <div className="empty">Loading…</div>}
            {!loading && items.length === 0 && <div className="empty">No work items match the current view/filters.</div>}
            {boardMode === 'grid' ? (
                <div className="grid-wrap">
                    <WorkItemGrid items={items} onSelect={(id) => select(id)} />
                </div>
            ) : (
                <div className="kanban-wrap">
                    <KanbanBoard items={items} />
                </div>
            )}
            {selectedId !== undefined && (
                <DetailDrawer id={selectedId} onClose={() => select(undefined)} />
            )}
        </>
    );
};
