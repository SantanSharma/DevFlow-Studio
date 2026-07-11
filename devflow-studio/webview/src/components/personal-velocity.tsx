import React from 'react';
import { InfoTooltip } from './info-tooltip';

interface VelocityData {
    period: string;
    points: number;
}

export const PersonalVelocity: React.FC<{ data: VelocityData[] }> = ({ data }) => {
    if (!data || data.length === 0) {
        return (
            <div className="widget-content">
                <h3>Personal Velocity</h3>
                <p className="empty-state">No velocity data available yet.</p>
            </div>
        );
    }

    const maxPoints = Math.max(...data.map(d => d.points), 1);
    const avgPoints = data.reduce((sum, d) => sum + d.points, 0) / data.length;

    return (
        <div className="widget-content">
            <h3>
                Personal Velocity
                <InfoTooltip
                    description="Story points completed over recent weekly periods."
                    calculation="Tracks story points from items closed each week over the last 4 weeks, based on the closed date."
                    benefit="Helps with sprint planning, capacity forecasting, and identifying velocity trends."
                />
            </h3>
            <div className="velocity-summary">
                <div className="stat">
                    <div className="stat-value">{Math.round(avgPoints)}</div>
                    <div className="stat-label">Avg Points/Sprint</div>
                </div>
            </div>
            <div className="line-chart">
                <svg viewBox="0 0 300 100" className="velocity-chart">
                    <polyline
                        fill="none"
                        stroke="var(--vscode-charts-blue)"
                        strokeWidth="2"
                        points={data.map((d, i) => 
                            `${(i / (data.length - 1)) * 280 + 10},${90 - (d.points / maxPoints) * 70}`
                        ).join(' ')}
                    />
                    {data.map((d, i) => (
                        <circle
                            key={i}
                            cx={(i / (data.length - 1)) * 280 + 10}
                            cy={90 - (d.points / maxPoints) * 70}
                            r="3"
                            fill="var(--vscode-charts-blue)"
                        />
                    ))}
                </svg>
                <div className="chart-labels">
                    {data.map((d, i) => (
                        <span key={i} className="chart-label">{d.period}</span>
                    ))}
                </div>
            </div>
        </div>
    );
};
