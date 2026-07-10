import React, { useEffect, useState } from 'react';
import { WorkItem } from '../state/store';
import { call } from '../lib/rpc';
import { AiMotivation } from '../components/ai-motivation';
import { AiProductivityInsights } from '../components/ai-productivity-insights';
import { StoryPointsChart } from '../components/story-points-chart';
import { TodaysFocusList } from '../components/todays-focus-list';
import { CompletedVsPlanned } from '../components/completed-vs-planned';
import { WorkItemAging } from '../components/work-item-aging';
import { PersonalVelocity } from '../components/personal-velocity';
import { StandupHistory } from '../components/standup-history';
import { WeeklySummary } from '../components/weekly-summary';

export interface DashboardMetrics {
    storyPointsByMonth: { month: string; points: number }[];
    velocity: { period: string; points: number }[];
    completedCount: number;
    plannedCount: number;
    completedPoints: number;
    plannedPoints: number;
    agingItems: WorkItem[];
    focusItems: WorkItem[];
    currentSprint?: string;
    activeCount: number;
    blockedCount: number;
}

export const PersonalDashboard: React.FC<{ allItems: WorkItem[] }> = ({ allItems }) => {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        void loadMetrics();
    }, [refreshKey]);

    const loadMetrics = async () => {
        setLoading(true);
        try {
            const result = await call<DashboardMetrics>('dashboard.metrics', {});
            setMetrics(result);
        } catch (e) {
            console.error('[DASHBOARD] Failed to load metrics:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        setRefreshKey(prev => prev + 1);
    };

    if (loading && !metrics) {
        return (
            <div className="personal-dashboard loading">
                <div className="loading-message">Loading your dashboard...</div>
            </div>
        );
    }

    return (
        <div className="personal-dashboard">
            <div className="dashboard-header">
                <h2>My Developer Dashboard</h2>
                <button onClick={handleRefresh} className="refresh-btn">
                    Refresh
                </button>
            </div>

            {/* AI Components - Visually Prominent */}
            <AiMotivation key={`motivation-${refreshKey}`} metrics={metrics} />
            <AiProductivityInsights key={`insights-${refreshKey}`} metrics={metrics} allItems={allItems} />

            {/* Main Dashboard Grid */}
            <div className="dashboard-grid">
                {/* Row 1: Immediate Daily Focus */}
                <div className="dashboard-row row-1">
                    <div className="widget widget-focus-list">
                        <TodaysFocusList items={metrics?.focusItems || []} />
                    </div>
                    <div className="widget widget-weekly-summary">
                        <WeeklySummary metrics={metrics} />
                    </div>
                </div>

                {/* Row 2: Progress Against Plan */}
                <div className="dashboard-row row-2">
                    <div className="widget widget-story-points">
                        <StoryPointsChart data={metrics?.storyPointsByMonth || []} />
                    </div>
                    <div className="widget widget-completed-vs-planned">
                        <CompletedVsPlanned metrics={metrics} />
                    </div>
                </div>

                {/* Row 3: Risk and Momentum */}
                <div className="dashboard-row row-3">
                    <div className="widget widget-aging">
                        <WorkItemAging items={metrics?.agingItems || []} />
                    </div>
                    <div className="widget widget-velocity">
                        <PersonalVelocity data={metrics?.velocity || []} />
                    </div>
                    <div className="widget widget-standup-history">
                        <StandupHistory />
                    </div>
                </div>
            </div>
        </div>
    );
};
