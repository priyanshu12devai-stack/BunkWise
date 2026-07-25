import type { Subject } from "@/types/attendance";

const semesterId = "semester-monsoon-2026";

export const subjects: Subject[] = [
  {
    id: "subject-data-structures",
    semesterId,
    name: "Data Structures",
    courseCode: "CS-201",
    minimumAttendancePercentage: 75,
  },
  {
    id: "subject-engineering-physics",
    semesterId,
    name: "Engineering Physics",
    courseCode: "PH-201",
    minimumAttendancePercentage: 75,
  },
  {
    id: "subject-web-development",
    semesterId,
    name: "Web Development",
    courseCode: "CS-204",
    minimumAttendancePercentage: 75,
  },
  {
    id: "subject-database-management",
    semesterId,
    name: "Database Management Systems",
    courseCode: "CS-203",
    minimumAttendancePercentage: 75,
  },
  {
    id: "subject-discrete-mathematics",
    semesterId,
    name: "Discrete Structures",
    courseCode: "CS-202",
    minimumAttendancePercentage: 75,
  },
];
