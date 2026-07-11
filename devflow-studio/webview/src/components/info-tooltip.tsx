import React, { useState } from 'react';

interface InfoTooltipProps {
    description: string;
    calculation: string;
    benefit: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ description, calculation, benefit }) => {
    const [show, setShow] = useState(false);

    return (
        <span className="info-tooltip-wrapper">
            <span
                className="info-icon"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
            >
                ℹ️
            </span>
            {show && (
                <div className="info-tooltip-content">
                    <div className="tooltip-section">
                        <strong>What it is:</strong>
                        <p>{description}</p>
                    </div>
                    <div className="tooltip-section">
                        <strong>How it&rsquo;s calculated:</strong>
                        <p>{calculation}</p>
                    </div>
                    <div className="tooltip-section">
                        <strong>How it helps:</strong>
                        <p>{benefit}</p>
                    </div>
                </div>
            )}
        </span>
    );
};
