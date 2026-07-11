import React, { useState } from 'react';
import { TimeRange, RangeSummary, TIME_RANGE_PERIODS } from '../lib/dashboard-types';
import { TimeRangeSelect } from './time-range-select';
import { InfoTooltip } from './info-tooltip';

interface SummaryDetailsProps {
    metrics: {
        completedCount?: number;
        completedPoints?: number;
        activeCount?: number;
        blockedCount?: number;
        summaryByRange?: Record<TimeRange, RangeSummary>;
    } | null;
}

export const SummaryDetails: React.FC<SummaryDetailsProps> = ({ metrics }) => {
    const [timeRange, setTimeRange] = useState<TimeRange>('weekly');

    const summary = metrics?.summaryByRange?.[timeRange];
    const completedCount = summary?.completedCount ?? metrics?.completedCount ?? 0;
    const completedPoints = summary?.completedPoints ?? metrics?.completedPoints ?? 0;
    const activeCount = summary?.activeCount ?? metrics?.activeCount ?? 0;
    const blockedCount = summary?.blockedCount ?? metrics?.blockedCount ?? 0;

    return (
        <div className="widget-content">
            <div className="widget-header">
                <h3>
                    Summary Details
                    <InfoTooltip
                        description="Aggregate counts of work items and story points for the selected time period."
                        calculation="Counts items closed (by closed date), points completed, and active or blocked items touched within the selected timeframe."
                        benefit="Quick snapshot of productivity metrics; track weekly to yearly progress at a glance."
                    />
                </h3>
                <TimeRangeSelect value={timeRange} onChange={setTimeRange} />
            </div>
            <div className="summary-period">Showing the {TIME_RANGE_PERIODS[timeRange]}</div>
            <div className="summary-stats">
                <div className="summary-item">
                    <div className="summary-value">{completedCount}</div>
                    <div className="summary-label">Items Closed</div>
                </div>
                <div className="summary-item">
                    <div className="summary-value">{completedPoints}</div>
                    <div className="summary-label">Points Done</div>
                </div>
                <div className="summary-item">
                    <div className="summary-value">{activeCount}</div>
                    <div className="summary-label">Active Items</div>
                </div>
                <div className="summary-item">
                    <div className="summary-value">{blockedCount}</div>
                    <div className="summary-label">Blocked</div>
                </div>
            </div>
        </div>
    );
};
