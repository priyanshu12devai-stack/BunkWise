import type {
  DateString,
  DayOfWeek,
  ScheduleSlot,
  Subject,
  WeeklySchedule,
} from "@/types/attendance";

const DAY_KEYS: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function getLocalDateString(date = new Date()): DateString {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}` as DateString;
}

export function getDayOfWeek(date: DateString): DayOfWeek {
  return DAY_KEYS[new Date(`${date}T12:00:00`).getDay()];
}

export function getPreviousDate(date: DateString): DateString {
  const previousDate = new Date(`${date}T12:00:00`);
  previousDate.setDate(previousDate.getDate() - 1);
  return getLocalDateString(previousDate);
}

export function isScheduleSlotEffectiveOn(
  slot: ScheduleSlot,
  date: DateString,
) {
  const startsOnOrBeforeDate =
    !slot.effectiveFromDate || slot.effectiveFromDate <= date;
  const endsOnOrAfterDate =
    !slot.effectiveUntilDate || slot.effectiveUntilDate >= date;

  return startsOnOrBeforeDate && endsOnOrAfterDate;
}

export function isSubjectActiveOn(subject: Subject, date: DateString) {
  return !subject.archivedFromDate || subject.archivedFromDate > date;
}

export function getScheduleSlotsForDate(
  weeklySchedule: WeeklySchedule,
  date: DateString,
) {
  const day = getDayOfWeek(date);

  return (weeklySchedule[day] ?? [])
    .filter((slot) => isScheduleSlotEffectiveOn(slot, date))
    .sort((first, second) => first.startTime.localeCompare(second.startTime));
}
