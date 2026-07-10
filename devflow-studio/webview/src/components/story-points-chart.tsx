import React from 'react';

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

    return (
        <div className="widget-content">
            <h3>Story Points Completed (12 Months)</h3>
            <div className="chart-container">
                <div className="bar-chart">
                    {data.map((item, idx) => (
                        <div key={idx} className="bar-item">
                            <div 
                                className="bar" 
                                style={{ height: `${(item.points / maxPoints) * 100}%` }}
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
