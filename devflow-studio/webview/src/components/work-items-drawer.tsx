import React, { useEffect } from 'react';
import { useStore } from '../state/store';
import { WorkItemCard } from './work-item-card';
import { WorkItemDetailPanel } from './work-item-detail-panel';

/**
 * Universal right-side drawer showing a list of work items (left panel) and,
 * once a card is selected, the work item details (right panel). Opened from
 * anywhere via useStore().openWorkItemsDrawer(...). Mounted once in App.
 */
export const WorkItemsDrawer: React.FC = () => {
    const drawer = useStore((s) => s.workItemsDrawer);
    const selectedId = useStore((s) => s.drawerSelectedId);
    const selectInDrawer = useStore((s) => s.selectInDrawer);
    const close = useStore((s) => s.closeWorkItemsDrawer);

    useEffect(() => {
        if (!drawer) return;
        const onKey = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') close();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [drawer, close]);

    if (!drawer) return null;

    return (
        <>
            <div className="wi-drawer-backdrop" onClick={close} />
            <div className={`wi-drawer ${selectedId !== undefined ? 'with-detail' : ''}`}>
                <div className="wi-drawer-list">
                    <div className="wi-drawer-header">
                        <div className="wi-drawer-titles">
                            <h3>{drawer.title} ({drawer.items.length})</h3>
                            {drawer.sourceDescription && (
                                <p className="wi-drawer-source">{drawer.sourceDescription}</p>
                            )}
                        </div>
                        <span className="close" title="Close" onClick={close}>✕</span>
                    </div>
                    <div className="wi-drawer-cards">
                        {drawer.items.length === 0 && (
                            <p className="empty-state">No matching work items.</p>
                        )}
                        {drawer.items.map((item) => (
                            <WorkItemCard
                                key={item.id}
                                item={item}
                                selected={selectedId === item.id}
                                onClick={selectInDrawer}
                            />
                        ))}
                    </div>
                </div>
                {selectedId !== undefined && (
                    <div className="wi-drawer-detail">
                        <WorkItemDetailPanel id={selectedId} />
                    </div>
                )}
            </div>
        </>
    );
};
