import React, { useMemo } from 'react';
import { useStore, type WorkItem } from '../state/store';
import { categoryStateSet, normalizeState } from '../lib/workflow-categories';
import { useMetricClick, metricKeyHandler } from '../lib/use-metric-click';
import { InfoTooltip } from './info-tooltip';

interface Props {
    items: WorkItem[];
}

export const MyDayWidget: React.FC<Props> = ({ items }) => {
    const categories = useStore((s) => s.workflowCategories);
    const openMetric = useMetricClick();

    // Item arrays (not just counts) so each card can open the drawer with its set.
    const stats = useMemo(() => {
        const since = Date.now() - 24 * 3600_000;
        const activeStates = categoryStateSet(categories, ['new', 'readyForDev', 'inDev']);
        const blockedStates = categoryStateSet(categories, ['blocked']);
        const resolvedStates = categoryStateSet(categories, ['completed']);
        resolvedStates.add('removed');
        resolvedStates.add('deleted');
        return {
            total: items,
            active: items.filter((i) => activeStates.has(normalizeState(i.state))),
            blocked: items.filter((i) => blockedStates.has(normalizeState(i.state))),
            changedToday: items.filter((i) => i.changedDate && new Date(i.changedDate).getTime() >= since),
            resolved: items.filter((i) => resolvedStates.has(normalizeState(i.state))),
        };
    }, [items, categories]);

    return (
        <div className="my-day">
            <Card
                label="Assigned"
                value={stats.total.length}
                onClick={openMetric('Assigned items', stats.total,
                    'All work items currently assigned to you.')}
            />
            <Card
                label="Active"
                value={stats.active.length}
                onClick={openMetric('Active items', stats.active,
                    'Items whose current state maps to the New, Ready for Development, or In Development categories in your workflow settings.')}
            />
            <Card
                label="Blocked"
                value={stats.blocked.length}
                onClick={openMetric('Blocked items', stats.blocked,
                    'Items whose current state maps to the Blocked category in your workflow settings.')}
            />
            <Card
                label="Changed in 24h"
                value={stats.changedToday.length}
                onClick={openMetric('Changed in the last 24 hours', stats.changedToday,
                    'Items with any change in the last 24 hours.')}
            />
            <Card
                label="Resolved"
                value={stats.resolved.length}
                onClick={openMetric('Resolved items', stats.resolved,
                    'Items whose current state maps to the Completed category in your workflow settings (plus Removed).')}
            />
            <span className="my-day-info">
                <InfoTooltip
                    description="Quick counts of your assigned work: total, active, blocked, recently changed, and resolved."
                    calculation="Categorizes each item's current state via the workflow categories you configure in Settings → Dashboard Configuration. 'Changed in 24h' uses the last change timestamp."
                    benefit="One-glance workload overview. Click any card to list the matching work items."
                />
            </span>
        </div>
    );
};

const Card: React.FC<{ label: string; value: number; onClick: () => void }> = ({ label, value, onClick }) => (
    <div
        className="card metric-clickable"
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={metricKeyHandler(onClick)}
    >
        <div className="label">{label}</div>
        <div className="value">{value}</div>
    </div>
);
