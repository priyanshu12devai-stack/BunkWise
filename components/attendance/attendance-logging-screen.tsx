import { useUser } from "@clerk/expo";
import * as Haptics from "expo-haptics";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { weeklySchedule as defaultWeeklySchedule } from "@/data/schedule";
import { subjects as defaultSubjects } from "@/data/subjects";
import { getScheduleSlotsForDate } from "@/lib/schedule";
import { useAttendanceStore } from "@/store/attendance-store";
import type {
  AttendanceLog,
  AttendanceStatus,
  DateString,
  ScheduleSlot,
  Subject,
} from "@/types/attendance";

const STATUS_OPTIONS: {
  activeChipClass: string;
  activeTextClass: string;
  label: string;
  status: AttendanceStatus;
}[] = [
  {
    activeChipClass: "border-safe/40 bg-safe/20",
    activeTextClass: "text-safe",
    label: "Present",
    status: "present",
  },
  {
    activeChipClass: "border-destructive/40 bg-destructive/20",
    activeTextClass: "text-destructive",
    label: "Absent",
    status: "absent",
  },
  {
    activeChipClass: "border-zinc-600 bg-zinc-700",
    activeTextClass: "text-zinc-300",
    label: "Cancelled",
    status: "cancelled",
  },
];

type ScheduledClass = ScheduleSlot & {
  subject: Subject;
};

function getLocalDateString(date: Date): DateString {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}` as DateString;
}

function getDateFromString(date: DateString) {
  return new Date(`${date}T12:00:00`);
}

function shiftDate(date: DateString, amount: number): DateString {
  const nextDate = getDateFromString(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return getLocalDateString(nextDate);
}

function getDateLabel(date: DateString, today: DateString) {
  if (date === today) return "Today";
  if (date === shiftDate(today, -1)) return "Yesterday";

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    weekday: "short",
  }).format(getDateFromString(date));
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${period}`;
}

function isDateInRange(
  date: DateString,
  startDate: DateString,
  endDate: DateString,
) {
  return date >= startDate && date <= endDate;
}

export function AttendanceLoggingScreen() {
  const { user } = useUser();
  const userId = user?.id;
  const today = getLocalDateString(new Date());
  const [selectedDate, setSelectedDate] = useState<DateString>(today);
  const setup = useAttendanceStore((state) =>
    userId ? state.setupsByUserId[userId] : undefined,
  );
  const attendance = useAttendanceStore((state) =>
    userId ? state.logsByUserId[userId] : undefined,
  );
  const setAttendanceLog = useAttendanceStore(
    (state) => state.setAttendanceLog,
  );

  const semesterStart = setup?.semester.startDate;
  const canGoBack = !semesterStart || selectedDate > semesterStart;
  const canGoForward = selectedDate < today;
  const isHoliday =
    setup?.semester.holidays.some((holiday) =>
      isDateInRange(selectedDate, holiday.startDate, holiday.endDate),
    ) ?? false;

  const scheduledClasses = useMemo<ScheduledClass[]>(() => {
    if (isHoliday) return [];

    const schedule = setup?.weeklySchedule ?? defaultWeeklySchedule;
    const subjects = setup?.subjects ?? defaultSubjects;
    const subjectsById = new Map(
      subjects.map((subject) => [subject.id, subject]),
    );

    return getScheduleSlotsForDate(schedule, selectedDate)
      .map((slot) => {
        const subject = subjectsById.get(slot.subjectId);
        return subject ? { ...slot, subject } : null;
      })
      .filter((item): item is ScheduledClass => item !== null)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [
    isHoliday,
    selectedDate,
    setup?.subjects,
    setup?.weeklySchedule,
  ]);

  const logsBySlotId = useMemo(
    () =>
      new Map(
        (attendance ?? [])
          .filter((log) => log.date === selectedDate)
          .map((log) => [log.scheduleSlotId, log]),
      ),
    [attendance, selectedDate],
  );
  const unmarkedCount = scheduledClasses.filter(
    (scheduledClass) => !logsBySlotId.has(scheduledClass.id),
  ).length;

  const navigateDate = (amount: -1 | 1) => {
    if ((amount === -1 && !canGoBack) || (amount === 1 && !canGoForward)) {
      return;
    }

    setSelectedDate((currentDate) => shiftDate(currentDate, amount));
    void Haptics.selectionAsync();
  };

  const updateStatus = (
    scheduledClass: ScheduledClass,
    status: AttendanceStatus,
  ) => {
    if (!userId || !setup) return;

    const existingLog = logsBySlotId.get(scheduledClass.id);
    const log: AttendanceLog = {
      id:
        existingLog?.id ??
        `attendance-${selectedDate}-${scheduledClass.id}`,
      semesterId: setup.semester.id,
      subjectId: scheduledClass.subjectId,
      scheduleSlotId: scheduledClass.id,
      date: selectedDate,
      status,
    };

    setAttendanceLog(userId, log);
    void Haptics.selectionAsync();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
      <ScrollView
        className="bg-[#0A0A0A]"
        contentContainerStyle={{
          gap: 24,
          paddingBottom: 40,
          paddingHorizontal: 20,
          paddingTop: 18,
        }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-outfit text-[32px] font-bold leading-10 text-white">
          Attendance
        </Text>

        {unmarkedCount > 0 ? (
          <Animated.View
            entering={FadeInDown.duration(220)}
            className="flex-row items-center gap-3 rounded-[18px] border border-amber-500/30 bg-amber-500/10 px-4 py-4"
          >
            <AlertTriangle color="#F5A800" size={20} strokeWidth={2.2} />
            <Text className="flex-1 font-jakarta-medium text-[14px] text-amber-400">
              {unmarkedCount}{" "}
              {unmarkedCount === 1 ? "class is" : "classes are"} unmarked
            </Text>
          </Animated.View>
        ) : null}

        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            accessibilityLabel="View previous day"
            accessibilityRole="button"
            activeOpacity={0.62}
            className={`h-12 w-12 items-center justify-center rounded-2xl ${
              canGoBack ? "bg-zinc-900" : "bg-zinc-950"
            }`}
            disabled={!canGoBack}
            onPress={() => navigateDate(-1)}
          >
            <ChevronLeft
              color={canGoBack ? "#D4D4D8" : "#3F3F46"}
              size={25}
              strokeWidth={2.2}
            />
          </TouchableOpacity>

          <View className="items-center">
            <Text className="font-outfit text-[24px] font-semibold text-white">
              {getDateLabel(selectedDate, today)}
            </Text>
            <Text className="pt-0.5 font-jakarta-medium text-xs text-zinc-500">
              {new Intl.DateTimeFormat("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(getDateFromString(selectedDate))}
            </Text>
          </View>

          <TouchableOpacity
            accessibilityLabel="View next day"
            accessibilityRole="button"
            activeOpacity={0.62}
            className={`h-12 w-12 items-center justify-center rounded-2xl ${
              canGoForward ? "bg-zinc-900" : "bg-zinc-950"
            }`}
            disabled={!canGoForward}
            onPress={() => navigateDate(1)}
          >
            <ChevronRight
              color={canGoForward ? "#D4D4D8" : "#3F3F46"}
              size={25}
              strokeWidth={2.2}
            />
          </TouchableOpacity>
        </View>

        <Animated.View className="gap-3" layout={LinearTransition}>
          {scheduledClasses.length > 0 ? (
            scheduledClasses.map((scheduledClass, index) => {
              const selectedStatus =
                logsBySlotId.get(scheduledClass.id)?.status;

              return (
                <Animated.View
                  key={`${selectedDate}-${scheduledClass.id}`}
                  entering={FadeInDown.delay(index * 45).duration(220)}
                  className="mb-3 min-h-[116px] flex-row items-center gap-3 rounded-3xl bg-[#171717] p-5"
                >
                  <View className="min-w-0 flex-1">
                    <Text
                      className="font-outfit text-[18px] font-bold leading-6 text-white"
                      numberOfLines={2}
                    >
                      {scheduledClass.subject.name}
                    </Text>
                    <Text className="pt-2 font-jakarta-medium text-xs text-zinc-500">
                      {formatTime(scheduledClass.startTime)}–
                      {formatTime(scheduledClass.endTime)}
                    </Text>
                  </View>

                  <View className="flex-row items-center gap-1">
                    {STATUS_OPTIONS.map((option) => {
                      const isSelected = selectedStatus === option.status;

                      return (
                        <TouchableOpacity
                          key={option.status}
                          accessibilityLabel={`Mark ${scheduledClass.subject.name} ${option.label.toLowerCase()}`}
                          accessibilityRole="button"
                          accessibilityState={{ selected: isSelected }}
                          activeOpacity={0.65}
                          className={`min-h-9 items-center justify-center rounded-full border px-2 ${
                            isSelected
                              ? option.activeChipClass
                              : "border-transparent bg-zinc-800/40"
                          }`}
                          onPress={() =>
                            updateStatus(scheduledClass, option.status)
                          }
                        >
                          <Text
                            className={`font-jakarta-semibold text-[10px] ${
                              isSelected
                                ? option.activeTextClass
                                : "text-zinc-500"
                            }`}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </Animated.View>
              );
            })
          ) : (
            <Animated.View
              entering={FadeInDown.duration(220)}
              className="min-h-[220px] items-center justify-center rounded-3xl border border-dashed border-zinc-800 bg-[#141414] px-8"
            >
              <Text className="text-center font-outfit text-[20px] font-semibold text-zinc-300">
                No classes scheduled for this day.
              </Text>
              {isHoliday ? (
                <Text className="pt-2 text-center font-jakarta-medium text-sm text-zinc-500">
                  Enjoy the holiday.
                </Text>
              ) : null}
            </Animated.View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}
