import React, { useMemo, useState } from 'react';
import { TimeRange, RangeSummary, TIME_RANGE_PERIODS } from '../lib/dashboard-types';
import { TimeRangeSelect } from './time-range-select';
import { InfoTooltip } from './info-tooltip';
import { useStore, type WorkItem } from '../state/store';
import { resolveItems } from '../lib/workflow-categories';
import { useMetricClick, metricKeyHandler } from '../lib/use-metric-click';

interface CompletedVsPlannedProps {
    metrics: {
        completedCount?: number;
        plannedCount?: number;
        completedPoints?: number;
        plannedPoints?: number;
        summaryByRange?: Record<TimeRange, RangeSummary>;
    } | null;
}

export const CompletedVsPlanned: React.FC<CompletedVsPlannedProps> = ({ metrics }) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('monthly');
    const items = useStore((s) => s.items);
    const openMetric = useMetricClick();

    const summary = metrics?.summaryByRange?.[timeRange];
    const completed = summary?.completedCount ?? metrics?.completedCount ?? 0;
    const planned = summary?.plannedCount ?? metrics?.plannedCount ?? 0;
    const completedPoints = summary?.completedPoints ?? metrics?.completedPoints ?? 0;
    const plannedPoints = summary?.plannedPoints ?? metrics?.plannedPoints ?? 0;
    const remaining = Math.max(planned - completed, 0);
    const remainingPoints = Math.max(plannedPoints - completedPoints, 0);
    const percentage = planned > 0 ? Math.round((completed / planned) * 100) : 0;

    const period = TIME_RANGE_PERIODS[timeRange];
    const { completedItems, plannedItems, remainingItems } = useMemo(() => {
        const completedIds = summary?.completedIds ?? [];
        const plannedIds = summary?.plannedIds ?? [];
        const completedSet = new Set(completedIds);
        const resolvedPlanned = resolveItems(plannedIds, items);
        return {
            completedItems: resolveItems(completedIds, items),
            plannedItems: resolvedPlanned,
            remainingItems: resolvedPlanned.filter((i: WorkItem) => !completedSet.has(i.id)),
        };
    }, [summary, items]);

    const tiles = [
        {
            value: completed,
            label: 'Completed',
            onClick: openMetric(`Completed (${period})`, completedItems,
                'Items in a configured completed state with a closed date inside the period.'),
        },
        {
            value: remaining,
            label: 'Remaining',
            onClick: openMetric(`Remaining (${period})`, remainingItems,
                'Planned items in the period that are not yet completed.'),
        },
        {
            value: completedPoints,
            label: 'Points Done',
            onClick: openMetric(`Points done (${period})`, completedItems,
                'Completed items in the period; the number is the sum of their story points.'),
        },
        {
            value: remainingPoints,
            label: 'Points Left',
            onClick: openMetric(`Points left (${period})`, remainingItems,
                'Not-yet-completed planned items in the period; the number is the sum of their story points.'),
        },
    ];

    const openPlanned = openMetric(`Planned (${period})`, plannedItems,
        'All items assigned or worked on during the period (the denominator of the completion percentage).');

    return (
        <div className="widget-content">
            <div className="widget-header">
                <h3>
                    Completed vs Planned Work
                    <InfoTooltip
                        description="Comparison between work items you completed and work items assigned to you in the selected time period. Completed = items in a configured completed state with a closed date; Planned = items assigned or worked on during the period."
                        calculation="Filters your work items by the selected time range, then counts items and story points for completed vs planned using the completed states you configure in Settings → Dashboard Configuration. Percentage = (Completed / Planned) x 100."
                        benefit="Track your delivery rate and capacity planning. A completion rate of 70-90% typically indicates good planning accuracy. Click any figure to see the underlying items."
                    />
                </h3>
                <TimeRangeSelect value={timeRange} onChange={setTimeRange} />
            </div>
            <div className="summary-period">Showing the {period}</div>
            {planned === 0 ? (
                <p className="empty-state">No planned work for the selected period.</p>
            ) : (
                <div className="completion-stats">
                    <div
                        className="progress-ring metric-clickable"
                        role="button"
                        tabIndex={0}
                        onClick={openPlanned}
                        onKeyDown={metricKeyHandler(openPlanned)}
                    >
                        <svg viewBox="0 0 100 100" className="progress-svg">
                            <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="var(--vscode-input-border)"
                                strokeWidth="8"
                            />
                            <circle
                                cx="50"
                                cy="50"
                                r="40"
                                fill="none"
                                stroke="var(--vscode-charts-green)"
                                strokeWidth="8"
                                strokeDasharray={`${percentage * 2.51} 251`}
                                transform="rotate(-90 50 50)"
                            />
                            <text
                                x="50"
                                y="50"
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="20"
                                fill="var(--vscode-foreground)"
                            >
                                {percentage}%
                            </text>
                        </svg>
                    </div>
                    <div className="stats-grid">
                        {tiles.map((tile) => (
                            <div
                                key={tile.label}
                                className="stat-item metric-clickable"
                                role="button"
                                tabIndex={0}
                                onClick={tile.onClick}
                                onKeyDown={metricKeyHandler(tile.onClick)}
                            >
                                <div className="stat-value">{tile.value}</div>
                                <div className="stat-label">{tile.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
