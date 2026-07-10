import React, { useEffect, useState } from 'react';
import { call } from '../lib/rpc';

export const AiMotivation: React.FC<{ metrics: any }> = ({ metrics }) => {
    const [motivation, setMotivation] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        void generateMotivation();
    }, [metrics]);

    const generateMotivation = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await call<{ message: string }>('ai.generateMotivation', {});
            setMotivation(result.message);
        } catch (e) {
            console.error('[AI-MOTIVATION] Failed:', e);
            setError('LLM not connected');
            setMotivation('💭 Please connect to an LLM (Claude, GPT, etc.) for personalized AI-powered daily motivation and insights.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="ai-motivation">
            <div className="ai-motivation-icon">✨</div>
            <div className="ai-motivation-content">
                {loading ? (
                    <div className="loading-text">Generating motivation...</div>
                ) : (
                    <p className="motivation-text">
                        {motivation}
                        {error && <span className="error-badge"> ({error})</span>}
                    </p>
                )}
            </div>
        </div>
    );
};
