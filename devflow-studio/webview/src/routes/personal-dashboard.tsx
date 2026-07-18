import React, { useEffect, useState } from 'react';
import { WorkItem, useStore } from '../state/store';
import { call } from '../lib/rpc';
import { RangeSummary, TimeRange } from '../lib/dashboard-types';
import { AiProductivityInsights } from '../components/ai-productivity-insights';
import { StoryPointsChart } from '../components/story-points-chart';
import { TodaysFocusList } from '../components/todays-focus-list';
import { CompletedVsPlanned } from '../components/completed-vs-planned';
import { PersonalVelocity } from '../components/personal-velocity';
import { StandupHistory } from '../components/standup-history';
import { SummaryDetails } from '../components/summary-details';
import { DetailDrawer } from '../components/detail-drawer';

export interface DashboardMetrics {
    storyPointsByMonth: { month: string; points: number; itemIds: number[] }[];
    velocity: { period: string; points: number; itemIds: number[] }[];
    completedCount: number;
    plannedCount: number;
    completedPoints: number;
    plannedPoints: number;
    focusItems: WorkItem[];
    currentSprint?: string;
    activeCount: number;
    blockedCount: number;
    summaryByRange: Record<TimeRange, RangeSummary>;
}

export const PersonalDashboard: React.FC<{ allItems: WorkItem[] }> = ({ allItems }) => {
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const selectedId = useStore((s) => s.selectedId);
    const select = useStore((s) => s.select);

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
            <AiProductivityInsights key={`insights-${refreshKey}`} metrics={metrics} allItems={allItems} />

            {/* Main Dashboard Grid */}
            <div className="dashboard-grid">
                {/* Row 1: Immediate Daily Focus (full width Kanban) */}
                <div className="dashboard-row row-1">
                    <div className="widget widget-focus-list">
                        {/* Full assigned set (same pool as 'All Assigned'): the
                            per-column state filters decide what shows, so completed
                            items are reachable too when a column selects their state. */}
                        <TodaysFocusList items={allItems} />
                    </div>
                </div>

                {/* Row 2: Progress Against Plan */}
                <div className="dashboard-row row-2">
                    <div className="widget widget-story-points">
                        <StoryPointsChart data={metrics?.storyPointsByMonth || []} />
                    </div>
                    <div className="widget widget-summary-details">
                        <SummaryDetails />
                    </div>
                </div>

                {/* Row 3: Risk and Momentum */}
                <div className="dashboard-row row-3">
                    <div className="widget widget-completed-vs-planned">
                        <CompletedVsPlanned metrics={metrics} />
                    </div>
                    <div className="widget widget-velocity">
                        <PersonalVelocity data={metrics?.velocity || []} />
                    </div>
                    <div className="widget widget-standup-history">
                        <StandupHistory />
                    </div>
                </div>
            </div>

            {selectedId !== undefined && (
                <DetailDrawer id={selectedId} onClose={() => select(undefined)} />
            )}
        </div>
    );
};
