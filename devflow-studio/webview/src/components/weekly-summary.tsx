import React from 'react';

interface WeeklySummaryProps {
    metrics: any;
}

export const WeeklySummary: React.FC<WeeklySummaryProps> = ({ metrics }) => {
    const completedCount = metrics?.completedCount || 0;
    const completedPoints = metrics?.completedPoints || 0;
    const blockedCount = metrics?.blockedCount || 0;
    const activeCount = metrics?.activeCount || 0;

    return (
        <div className="widget-content">
            <h3>Weekly Summary</h3>
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
