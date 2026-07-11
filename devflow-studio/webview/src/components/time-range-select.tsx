import React from 'react';
import { TimeRange, TIME_RANGE_LABELS } from '../lib/dashboard-types';

export const TimeRangeSelect: React.FC<{
    value: TimeRange;
    onChange: (range: TimeRange) => void;
}> = ({ value, onChange }) => (
    <select
        value={value}
        onChange={(e) => onChange(e.target.value as TimeRange)}
        style={{ fontSize: '11px' }}
    >
        {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((range) => (
            <option key={range} value={range}>
                {TIME_RANGE_LABELS[range]}
            </option>
        ))}
    </select>
);
