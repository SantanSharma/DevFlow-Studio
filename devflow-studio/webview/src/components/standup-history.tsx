import React, { useEffect, useState } from 'react';
import { call } from '../lib/rpc';
import { InfoTooltip } from './info-tooltip';

interface Standup {
    date: string;
    timeWindow: string;
    preview: string;
    workItemCount: number;
    blockerCount: number;
    fullText: string;
}

export const StandupHistory: React.FC = () => {
    const [standups, setStandups] = useState<Standup[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        void loadStandups();
    }, []);

    const loadStandups = async () => {
        try {
            const result = await call<{ standups: Standup[] }>('standup.history', {});
            setStandups(result.standups || []);
        } catch (e) {
            console.error('Failed to load standup history:', e);
        } finally {
            setLoading(false);
        }
    };

    const deleteStandup = async (index: number) => {
        try {
            await call('standup.delete', { index });
            await loadStandups(); // Reload after delete
        } catch (e) {
            console.error('Failed to delete standup:', e);
        }
    };

    const copyToClipboard = (text: string) => {
        void call('clipboard.write', { text });
    };

    return (
        <div className="widget-content">
            <h3>
                Standup History
                <InfoTooltip
                    description="Log of your previously generated standup reports."
                    calculation="Stores AI-generated standups based on work item activity in the time windows you specified."
                    benefit="Quick reference for past standups; track what you reported and prepare for retrospectives."
                />
            </h3>
            {loading ? (
                <div className="loading-text">Loading...</div>
            ) : standups.length === 0 ? (
                <p className="empty-state">No saved standups yet. Generate your first standup to populate this section.</p>
            ) : (
                <div className="standup-list">
                    {standups.map((standup, idx) => (
                        <div key={idx} className="standup-item">
                            <div className="standup-date">{standup.date}</div>
                            <div className="standup-preview">{standup.preview}</div>
                            <div className="standup-meta">
                                <span>{standup.workItemCount} items</span>
                                {standup.blockerCount > 0 && (
                                    <span className="blockers">{standup.blockerCount} blockers</span>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '4px', marginTop: '8px' }}>
                                <button 
                                    className="copy-btn"
                                    onClick={() => copyToClipboard(standup.fullText)}
                                >
                                    Copy
                                </button>
                                <button 
                                    className="secondary"
                                    style={{ fontSize: '11px', padding: '4px 8px' }}
                                    onClick={() => void deleteStandup(idx)}
                                    title="Delete this standup"
                                >
                                    🗑️ Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
