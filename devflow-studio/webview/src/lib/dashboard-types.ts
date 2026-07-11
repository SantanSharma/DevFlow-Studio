export type TimeRange = "weekly" | "monthly" | "half-yearly" | "yearly";

export interface RangeSummary {
  completedCount: number;
  completedPoints: number;
  plannedCount: number;
  plannedPoints: number;
  activeCount: number;
  blockedCount: number;
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
