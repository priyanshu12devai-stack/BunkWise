import type { Subject } from "@/types/attendance";

const semesterId = "semester-monsoon-2026";

export const subjects: Subject[] = [
  {
    id: "subject-data-structures",
    semesterId,
    name: "Data Structures",
    courseCode: "CS201",
    minimumAttendancePercentage: 75,
  },
  {
    id: "subject-engineering-physics",
    semesterId,
    name: "Engineering Physics",
    courseCode: "PH201",
    minimumAttendancePercentage: 75,
  },
  {
    id: "subject-web-development",
    semesterId,
    name: "Web Development",
    courseCode: "CS205",
    minimumAttendancePercentage: 75,
  },
  {
    id: "subject-database-management",
    semesterId,
    name: "Database Management Systems",
    courseCode: "CS203",
    minimumAttendancePercentage: 75,
  },
  {
    id: "subject-discrete-mathematics",
    semesterId,
    name: "Discrete Mathematics",
    courseCode: "MA201",
    minimumAttendancePercentage: 75,
  },
];
