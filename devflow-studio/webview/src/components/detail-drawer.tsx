import React from 'react';
import { WorkItemDetailPanel } from './work-item-detail-panel';

interface Props {
    id: number;
    onClose: () => void;
}

/** Standalone right-side drawer showing a single work item's details. */
export const DetailDrawer: React.FC<Props> = ({ id, onClose }) => (
    <div className="drawer">
        <span className="close" onClick={onClose}>✕</span>
        <WorkItemDetailPanel id={id} />
    </div>
);
