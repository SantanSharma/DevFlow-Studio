import React from 'react';

interface CompletedVsPlannedProps {
    metrics: any;
}

export const CompletedVsPlanned: React.FC<CompletedVsPlannedProps> = ({ metrics }) => {
    const completed = metrics?.completedCount || 0;
    const planned = metrics?.plannedCount || 0;
    const completedPoints = metrics?.completedPoints || 0;
    const plannedPoints = metrics?.plannedPoints || 0;
    const remaining = planned - completed;
    const remainingPoints = plannedPoints - completedPoints;
    const percentage = planned > 0 ? Math.round((completed / planned) * 100) : 0;

    return (
        <div className="widget-content">
            <h3>Completed vs Planned Work</h3>
            {planned === 0 ? (
                <p className="empty-state">No planned work for the current period.</p>
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
