export type DateString = `${number}-${number}-${number}`;

export type TimeString = `${number}:${number}`;

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type AttendanceStatus = "present" | "absent" | "cancelled";

export type SemesterHoliday = {
  id: string;
  name: string;
  startDate: DateString;
  endDate: DateString;
};

export type Semester = {
  id: string;
  name: string;
  startDate: DateString;
  endDate: DateString;
  totalWeeks: number;
  holidays: SemesterHoliday[];
  isActive: boolean;
};

export type Subject = {
  id: string;
  semesterId: Semester["id"];
  name: string;
  courseCode: string;
  minimumAttendancePercentage: number;
};

export type ScheduleSlot = {
  id: string;
  subjectId: Subject["id"];
  startTime: TimeString;
  endTime: TimeString;
  room: string;
};

export type WeeklySchedule = Record<DayOfWeek, ScheduleSlot[]>;

export type AttendanceLog = {
  id: string;
  semesterId: Semester["id"];
  subjectId: Subject["id"];
  scheduleSlotId: ScheduleSlot["id"];
  date: DateString;
  status: AttendanceStatus;
};
