import type { Semester } from "@/types/attendance";

export const activeSemester: Semester = {
  id: "semester-monsoon-2026",
  name: "Monsoon Semester 2026",
  startDate: "2026-06-29",
  endDate: "2026-10-18",
  totalWeeks: 16,
  isActive: true,
  holidays: [
    {
      id: "holiday-independence-day-2026",
      name: "Independence Day",
      startDate: "2026-08-15",
      endDate: "2026-08-15",
    },
    {
      id: "holiday-ganesh-chaturthi-2026",
      name: "Ganesh Chaturthi Break",
      startDate: "2026-09-14",
      endDate: "2026-09-15",
    },
    {
      id: "holiday-gandhi-jayanti-2026",
      name: "Gandhi Jayanti",
      startDate: "2026-10-02",
      endDate: "2026-10-02",
    },
  ],
};

export const semesters: Semester[] = [activeSemester];
