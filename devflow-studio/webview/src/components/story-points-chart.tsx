import React from 'react';
import { InfoTooltip } from './info-tooltip';
import { useStore } from '../state/store';
import { resolveItems } from '../lib/workflow-categories';
import { metricKeyHandler } from '../lib/use-metric-click';

interface StoryPointsData {
    month: string;
    points: number;
    itemIds: number[];
}

export const StoryPointsChart: React.FC<{ data: StoryPointsData[] }> = ({ data }) => {
    const items = useStore((s) => s.items);
    const openDrawer = useStore((s) => s.openWorkItemsDrawer);

    if (!data || data.length === 0) {
        return (
            <div className="widget-content">
                <h3>Story Points Completed</h3>
                <p className="empty-state">No story point data available for the last 12 months.</p>
            </div>
        );
    }

    const maxPoints = Math.max(...data.map(d => d.points), 1);
    const BAR_AREA_PX = 130; // pixel height of the tallest bar

    const handleMonthClick = (bucket: StoryPointsData): void => {
        const ids = bucket.itemIds ?? [];
        const matched = resolveItems(ids, items);
        const omitted = ids.length - matched.length;
        // Items missing from workItems.list (older completions) are omitted;
        // a workItems.byIds RPC would be the future enhancement to fetch them.
        openDrawer({
            title: `Completed in ${bucket.month}`,
            sourceDescription:
                `${bucket.points} story points across ${ids.length} items, matched by your configured completed states and closed date.` +
                (omitted > 0 ? ` ${omitted} older item${omitted === 1 ? '' : 's'} not in the current list are omitted.` : ''),
            items: matched,
        });
    };

    return (
        <div className="widget-content">
            <h3>
                Story Points Completed (12 Months)
                <InfoTooltip
                    description="Monthly trend chart showing story points from completed work items over the past 12 months."
                    calculation="Sums story points from all work items closed in each month, using the completed states you configure in Settings → Dashboard Configuration. Completion dates come from the ADO closed date or revision history."
                    benefit="Visualize productivity trends, identify peak or slow periods, and track long-term capacity. Click any month to see the contributing work items."
                />
            </h3>
            <div className="chart-container">
                <div className="bar-chart">
                    {data.map((item, idx) => (
                        <div
                            key={idx}
                            className="bar-item metric-clickable"
                            role="button"
                            tabIndex={0}
                            onClick={() => handleMonthClick(item)}
                            onKeyDown={metricKeyHandler(() => handleMonthClick(item))}
                        >
                            {item.points > 0 && (
                                <div className="bar-value">{item.points}</div>
                            )}
                            <div
                                className="bar"
                                // Pixel height: percentage heights collapse to 0
                                // because .bar-item has no fixed height.
                                style={{ height: `${Math.max(Math.round((item.points / maxPoints) * BAR_AREA_PX), 2)}px` }}
                                title={`${item.month}: ${item.points} points`}
                            />
                            <div className="bar-label">{item.month.substring(0, 3)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
