import React, { useState } from 'react';
import { TimeRange, RangeSummary, TIME_RANGE_PERIODS } from '../lib/dashboard-types';
import { TimeRangeSelect } from './time-range-select';
import { InfoTooltip } from './info-tooltip';

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

    const summary = metrics?.summaryByRange?.[timeRange];
    const completed = summary?.completedCount ?? metrics?.completedCount ?? 0;
    const planned = summary?.plannedCount ?? metrics?.plannedCount ?? 0;
    const completedPoints = summary?.completedPoints ?? metrics?.completedPoints ?? 0;
    const plannedPoints = summary?.plannedPoints ?? metrics?.plannedPoints ?? 0;
    const remaining = Math.max(planned - completed, 0);
    const remainingPoints = Math.max(plannedPoints - completedPoints, 0);
    const percentage = planned > 0 ? Math.round((completed / planned) * 100) : 0;

    return (
        <div className="widget-content">
            <div className="widget-header">
                <h3>
                    Completed vs Planned Work
                    <InfoTooltip
                        description="Comparison between work items you completed and work items assigned to you in the selected time period. Completed = items closed (with a closed date); Planned = items assigned or worked on during the period."
                        calculation="Filters your work items by the selected time range, then counts items and story points for completed vs planned. Percentage = (Completed / Planned) x 100."
                        benefit="Track your delivery rate and capacity planning. A completion rate of 70-90% typically indicates good planning accuracy."
                    />
                </h3>
                <TimeRangeSelect value={timeRange} onChange={setTimeRange} />
            </div>
            <div className="summary-period">Showing the {TIME_RANGE_PERIODS[timeRange]}</div>
            {planned === 0 ? (
                <p className="empty-state">No planned work for the selected period.</p>
            ) : (
                <div className="completion-stats">
                    <div className="progress-ring">
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
                        <div className="stat-item">
                            <div className="stat-value">{completed}</div>
                            <div className="stat-label">Completed</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{remaining}</div>
                            <div className="stat-label">Remaining</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{completedPoints}</div>
                            <div className="stat-label">Points Done</div>
                        </div>
                        <div className="stat-item">
                            <div className="stat-value">{remainingPoints}</div>
                            <div className="stat-label">Points Left</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
