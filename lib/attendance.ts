import type { AttendanceLog } from "@/types/attendance";

export type AttendanceSummary = {
  attended: number;
  percentage: number;
  safeBunks: number;
  toRecover: number;
  total: number;
};

export function calculateAttendanceSummary(
  logs: AttendanceLog[],
  targetPercentage: number,
): AttendanceSummary {
  const countedLogs = logs.filter((log) => log.status !== "cancelled");
  const attended = countedLogs.filter((log) => log.status === "present").length;
  const total = countedLogs.length;
  const attendanceRatio = total === 0 ? 0 : attended / total;
  const percentage = Math.round(attendanceRatio * 100);
  const targetRatio = targetPercentage / 100;
  const safeBunks =
    total === 0 || targetRatio <= 0
      ? 0
      : Math.max(0, Math.floor(attended / targetRatio - total));
  const toRecover =
    attendanceRatio >= targetRatio || targetRatio >= 1
      ? 0
      : Math.max(
          0,
          Math.ceil(
            (targetRatio * total - attended) / (1 - targetRatio),
          ),
        );

  return { attended, percentage, safeBunks, toRecover, total };
}
