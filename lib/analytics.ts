import type { AttendanceLog } from "@/types/attendance";

export type SubjectAttendanceForecast = {
  attended: number;
  isOnTrack: boolean;
  percentage: number;
  postBunkPercentage: number;
  requiredConsecutiveAttendance: number;
  safeBunks: number;
  targetPercentage: number;
  total: number;
};

export type AttendanceTimelinePoint = {
  attended: number;
  date: AttendanceLog["date"];
  id: AttendanceLog["id"];
  percentage: number;
  status: AttendanceLog["status"];
  total: number;
};

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, value));
}

/**
 * Calculates every predictive value shown by Analytics from persisted logs.
 * Cancelled classes are intentionally excluded because they were not conducted.
 */
export function calculateSubjectAttendanceForecast(
  logs: AttendanceLog[],
  targetPercentage: number,
): SubjectAttendanceForecast {
  const conductedLogs = logs.filter((log) => log.status !== "cancelled");
  const attended = conductedLogs.filter(
    (log) => log.status === "present",
  ).length;
  const total = conductedLogs.length;
  const target = clampPercentage(targetPercentage);
  const targetRatio = target / 100;
  const attendanceRatio = total === 0 ? 0 : attended / total;
  const percentage = attendanceRatio * 100;
  const isOnTrack = total === 0 || percentage >= target;

  const safeBunks =
    isOnTrack && targetRatio > 0
      ? Math.max(
          0,
          Math.floor((attended - targetRatio * total) / targetRatio),
        )
      : 0;

  const requiredConsecutiveAttendance = isOnTrack
    ? 0
    : targetRatio >= 1
      ? Number.POSITIVE_INFINITY
      : Math.max(
          0,
          Math.ceil(
            (targetRatio * total - attended) / (1 - targetRatio),
          ),
        );

  return {
    attended,
    isOnTrack,
    percentage,
    postBunkPercentage: (attended / (total + 1)) * 100,
    requiredConsecutiveAttendance,
    safeBunks,
    targetPercentage: target,
    total,
  };
}

export function calculateWeightedAttendance(logs: AttendanceLog[]) {
  const conductedLogs = logs.filter((log) => log.status !== "cancelled");
  const attended = conductedLogs.filter(
    (log) => log.status === "present",
  ).length;
  const total = conductedLogs.length;

  return {
    attended,
    percentage: total === 0 ? 0 : (attended / total) * 100,
    total,
  };
}

export function createAttendanceTimeline(
  logs: AttendanceLog[],
): AttendanceTimelinePoint[] {
  let attended = 0;
  let total = 0;

  return [...logs]
    .filter((log) => log.status !== "cancelled")
    .sort(
      (first, second) =>
        first.date.localeCompare(second.date) ||
        first.id.localeCompare(second.id),
    )
    .map((log) => {
      if (log.status === "present") {
        attended += 1;
        total += 1;
      } else if (log.status === "absent") {
        total += 1;
      }

      return {
        attended,
        date: log.date,
        id: log.id,
        percentage: total === 0 ? 0 : (attended / total) * 100,
        status: log.status,
        total,
      };
    });
}

export function formatAttendancePercentage(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
