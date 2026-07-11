import React from 'react';
import { InfoTooltip } from './info-tooltip';

interface StoryPointsData {
    month: string;
    points: number;
}

export const StoryPointsChart: React.FC<{ data: StoryPointsData[] }> = ({ data }) => {
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

    return (
        <div className="widget-content">
            <h3>
                Story Points Completed (12 Months)
                <InfoTooltip
                    description="Monthly trend chart showing story points from completed work items over the past 12 months."
                    calculation="Sums story points from all work items closed in each month, grouped by the closed date."
                    benefit="Visualize productivity trends, identify peak or slow periods, and track long-term capacity."
                />
            </h3>
            <div className="chart-container">
                <div className="bar-chart">
                    {data.map((item, idx) => (
                        <div key={idx} className="bar-item">
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
