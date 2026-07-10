import React from 'react';
import { WorkItem } from '../state/store';

export const WorkItemAging: React.FC<{ items: WorkItem[] }> = ({ items }) => {
    const getAgeDays = (item: WorkItem) => {
        if (!item.changedDate) return 0;
        const diff = Date.now() - new Date(item.changedDate).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    const getAgeCategory = (days: number) => {
        if (days <= 2) return '0-2d';
        if (days <= 5) return '3-5d';
        if (days <= 10) return '6-10d';
        return '10d+';
    };

    const sortedItems = [...items].sort((a, b) => getAgeDays(b) - getAgeDays(a));

    return (
        <div className="widget-content">
            <h3>Work Item Aging</h3>
            {sortedItems.length === 0 ? (
                <p className="empty-state">No stale work items found. Nice!</p>
            ) : (
                <div className="aging-list">
                    {sortedItems.slice(0, 5).map((item) => {
                        const age = getAgeDays(item);
                        const category = getAgeCategory(age);
                        return (
                            <div key={item.id} className={`aging-item aging-${category}`}>
                                <div className="aging-header">
                                    <span className="item-id">#{item.id}</span>
                                    <span className="aging-days">{age} days</span>
                                </div>
                                <div className="item-title">{item.title}</div>
                                <div className="item-state">{item.state}</div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
