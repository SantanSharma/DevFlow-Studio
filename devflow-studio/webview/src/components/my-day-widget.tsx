import React, { useMemo } from 'react';
import type { WorkItem } from '../state/store';

interface Props {
    items: WorkItem[];
}

export const MyDayWidget: React.FC<Props> = ({ items }) => {
    const stats = useMemo(() => {
        const since = Date.now() - 24 * 3600_000;
        return {
            total: items.length,
            active: items.filter((i) => ['New', 'Active', 'Ready for Dev', 'In Development', 'In Progress'].includes(i.state)).length,
            blocked: items.filter((i) => ['Redbin/Blocked', 'Blocked', 'On Hold'].includes(i.state)).length,
            changedToday: items.filter((i) => i.changedDate && new Date(i.changedDate).getTime() >= since).length,
            resolved: items.filter((i) => ['Resolved', 'Closed', 'Done'].includes(i.state)).length,
        };
    }, [items]);

    return (
        <div className="my-day">
            <Card label="Assigned" value={stats.total} />
            <Card label="Active" value={stats.active} />
            <Card label="Blocked" value={stats.blocked} />
            <Card label="Changed in 24h" value={stats.changedToday} />
            <Card label="Resolved" value={stats.resolved} />
        </div>
    );
};

const Card: React.FC<{ label: string; value: number }> = ({ label, value }) => (
    <div className="card">
        <div className="label">{label}</div>
        <div className="value">{value}</div>
    </div>
);
