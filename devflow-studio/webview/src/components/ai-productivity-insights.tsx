import React, { useEffect, useState } from 'react';
import { call } from '../lib/rpc';
import { WorkItem } from '../state/store';

interface InsightsProps {
    metrics: any;
    allItems: WorkItem[];
}

export const AiProductivityInsights: React.FC<InsightsProps> = ({ metrics, allItems }) => {
    const [insights, setInsights] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        void generateInsights();
    }, [metrics]);

    const generateInsights = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await call<{ insights: string }>('ai.generateInsights', {});
            setInsights(result.insights);
        } catch (e) {
            console.error('[AI-INSIGHTS] Failed:', e);
            setError('LLM not connected');
            const completed = metrics?.completedCount || 0;
            const planned = metrics?.plannedCount || 0;
            setInsights(
                `📊 Basic stats: ${completed} completed out of ${planned} planned items.\n\n` +
                `💡 Connect an LLM (via GitHub Copilot, Claude, etc.) to get personalized productivity insights, trends analysis, and actionable recommendations based on your work patterns.`
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ai-productivity-insights">
            <div className="ai-insights-icon">💡</div>
            <div className="ai-insights-content">
                <h3>Productivity Insights</h3>
                {loading ? (
                    <div className="loading-text">Analyzing your work patterns...</div>
                ) : (
                    <div className="insights-text">
                        {insights}
                        {error && <div className="error-badge">({error})</div>}
                    </div>
                )}
            </div>
        </div>
    );
};
