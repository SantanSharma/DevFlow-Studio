import React, { useMemo, useState } from 'react';
import { TimeRange, TIME_RANGE_PERIODS, TIME_RANGE_DAYS } from '../lib/dashboard-types';
import { TimeRangeSelect } from './time-range-select';
import { InfoTooltip } from './info-tooltip';
import { useStore, type WorkItem } from '../state/store';
import {
    categorizeItems,
    OTHER_CATEGORY_KEY,
    OTHER_CATEGORY_LABEL,
} from '../lib/workflow-categories';
import { metricKeyHandler } from '../lib/use-metric-click';

interface Segment {
    key: string;
    label: string;
    items: WorkItem[];
    points: number;
}

// Colors per default category key; extra user-defined categories cycle through
// the fallback palette. Theme variables only, so light and dark both work.
const CATEGORY_COLORS: Record<string, string> = {
    completed: 'var(--vscode-charts-green)',
    inDev: 'var(--vscode-charts-blue)',
    readyForDev: 'var(--vscode-charts-purple)',
    new: 'var(--vscode-charts-yellow)',
    qa: 'var(--vscode-charts-orange)',
    blocked: 'var(--vscode-charts-red)',
    [OTHER_CATEGORY_KEY]: 'var(--vscode-charts-lines)',
};

const FALLBACK_COLORS = [
    'var(--vscode-charts-foreground)',
    'var(--vscode-charts-purple)',
    'var(--vscode-charts-yellow)',
    'var(--vscode-charts-orange)',
];

export const SummaryDetails: React.FC = () => {
    const [timeRange, setTimeRange] = useState<TimeRange>('weekly');
    const items = useStore((s) => s.items);
    const categories = useStore((s) => s.workflowCategories);
    const openDrawer = useStore((s) => s.openWorkItemsDrawer);

    // Population: items "touched" within the selected range (changed/created or
    // closed inside the range), matching the backend _summarizeRange definition.
    const segments = useMemo<Segment[]>(() => {
        const cutoff = Date.now() - TIME_RANGE_DAYS[timeRange] * 24 * 60 * 60 * 1000;
        const inRange = (iso?: string): boolean =>
            !!iso && new Date(iso).getTime() >= cutoff;
        const touched = items.filter(
            (i) => inRange(i.changedDate ?? i.createdDate) || inRange(i.closedDate),
        );
        const byCategory = categorizeItems(touched, categories);
        const labels = new Map(categories.map((c) => [c.key, c.label] as const));
        labels.set(OTHER_CATEGORY_KEY, OTHER_CATEGORY_LABEL);
        return Array.from(byCategory.entries())
            .map(([key, catItems]) => ({
                key,
                label: labels.get(key) ?? key,
                items: catItems,
                points: catItems.reduce((sum, i) => sum + (i.storyPoints || 0), 0),
            }))
            .filter((seg) => seg.items.length > 0);
    }, [items, categories, timeRange]);

    const total = segments.reduce((sum, s) => sum + s.items.length, 0);

    const openCategory = (seg: Segment): void => {
        openDrawer({
            title: `${seg.label} (${TIME_RANGE_PERIODS[timeRange]})`,
            sourceDescription: `Items whose current state maps to '${seg.label}' via your workflow category settings, touched in the ${TIME_RANGE_PERIODS[timeRange]}.`,
            items: seg.items,
        });
    };

    const colorFor = (key: string, idx: number): string =>
        CATEGORY_COLORS[key] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];

    const R = 40;
    const C = 2 * Math.PI * R;
    let offset = 0;

    return (
        <div className="widget-content">
            <div className="widget-header">
                <h3>
                    Summary Details
                    <InfoTooltip
                        description="Donut chart partitioning your work items by workflow category (Completed, In Development, QA, Blocked, ...)."
                        calculation="Partitions items touched in the selected period by your configured workflow categories (Settings → Dashboard Configuration). Unmapped states appear as Other. Date-based charts use the separate completed-states setting."
                        benefit="See where your work sits at a glance. Click a segment or legend row to list its work items."
                    />
                </h3>
                <TimeRangeSelect value={timeRange} onChange={setTimeRange} />
            </div>
            <div className="summary-period">Showing the {TIME_RANGE_PERIODS[timeRange]}</div>
            {total === 0 ? (
                <p className="empty-state">No work items touched in the selected period.</p>
            ) : (
                <div className="donut-chart">
                    <svg viewBox="0 0 120 120" className="donut-svg">
                        {segments.map((seg, idx) => {
                            const frac = seg.items.length / total;
                            const el = (
                                <circle
                                    key={seg.key}
                                    cx="60"
                                    cy="60"
                                    r={R}
                                    fill="none"
                                    stroke={colorFor(seg.key, idx)}
                                    strokeWidth="16"
                                    strokeDasharray={`${frac * C} ${C}`}
                                    strokeDashoffset={-offset * C}
                                    transform="rotate(-90 60 60)"
                                    className="donut-segment"
                                    onClick={() => openCategory(seg)}
                                >
                                    <title>{`${seg.label} - ${seg.items.length} items, ${seg.points} pts`}</title>
                                </circle>
                            );
                            offset += frac;
                            return el;
                        })}
                        <text
                            x="60"
                            y="56"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="18"
                            fill="var(--vscode-foreground)"
                        >
                            {total}
                        </text>
                        <text
                            x="60"
                            y="72"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fontSize="7"
                            fill="var(--vscode-foreground)"
                            opacity="0.7"
                        >
                            items in {TIME_RANGE_PERIODS[timeRange]}
                        </text>
                    </svg>
                    <div className="donut-legend">
                        {segments.map((seg, idx) => (
                            <div
                                key={seg.key}
                                className="legend-row metric-clickable"
                                role="button"
                                tabIndex={0}
                                onClick={() => openCategory(seg)}
                                onKeyDown={metricKeyHandler(() => openCategory(seg))}
                            >
                                <span
                                    className="legend-dot"
                                    style={{ background: colorFor(seg.key, idx) }}
                                />
                                <span className="legend-label">{seg.label}</span>
                                <span className="legend-count">
                                    {seg.items.length} item{seg.items.length === 1 ? '' : 's'} · {seg.points} pts
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
