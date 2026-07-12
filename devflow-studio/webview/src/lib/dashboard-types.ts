export type TimeRange = "weekly" | "monthly" | "half-yearly" | "yearly";

// Manual mirror of RangeSummary in src/services/dashboard-service.ts.
export interface RangeSummary {
  completedCount: number;
  completedPoints: number;
  plannedCount: number;
  plannedPoints: number;
  activeCount: number;
  blockedCount: number;
  // Item ids backing each count; resolve to items via resolveItems() to open
  // the universal work items drawer.
  completedIds: number[];
  plannedIds: number[];
  activeIds: number[];
  blockedIds: number[];
}

export const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  weekly: "Weekly",
  monthly: "Monthly",
  "half-yearly": "Half-Yearly",
  yearly: "Yearly",
};

export const TIME_RANGE_PERIODS: Record<TimeRange, string> = {
  weekly: "last 7 days",
  monthly: "last 30 days",
  "half-yearly": "last 6 months",
  yearly: "last 12 months",
};

export const TIME_RANGE_DAYS: Record<TimeRange, number> = {
  weekly: 7,
  monthly: 30,
  "half-yearly": 180,
  yearly: 365,
};
