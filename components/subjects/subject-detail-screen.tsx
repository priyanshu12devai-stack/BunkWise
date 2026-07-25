import { useUser } from "@clerk/expo";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { ArrowLeft, CalendarDays, Check, X } from "lucide-react-native";
import { useMemo } from "react";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  LinearTransition,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { calculateAttendanceSummary } from "@/lib/attendance";
import { useAttendanceStore } from "@/store/attendance-store";
import type {
  AttendanceLog,
  AttendanceStatus,
  DateString,
  ScheduleSlot,
} from "@/types/attendance";

const STATUS_STYLES: Record<
  AttendanceStatus,
  { badge: string; dot: string; label: string; text: string }
> = {
  present: {
    badge: "bg-[#0B3B33]",
    dot: "bg-[#10D6A0]",
    label: "Present",
    text: "text-[#10D6A0]",
  },
  absent: {
    badge: "bg-[#441929]",
    dot: "bg-[#FF5079]",
    label: "Absent",
    text: "text-[#FF5C82]",
  },
  cancelled: {
    badge: "bg-[#292B35]",
    dot: "bg-zinc-500",
    label: "Cancelled",
    text: "text-zinc-400",
  },
};

const NEXT_STATUS: Record<AttendanceStatus, AttendanceStatus> = {
  present: "absent",
  absent: "cancelled",
  cancelled: "present",
};

function getLocalDateString(date: Date): DateString {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}` as DateString;
}

function formatHistoryDate(date: DateString) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    weekday: "short",
  }).format(new Date(`${date}T00:00:00`));
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${period}`;
}

function getSessionLabel(
  scheduleSlotId: string,
  scheduleSlotsById: Map<string, ScheduleSlot>,
) {
  const slot = scheduleSlotsById.get(scheduleSlotId);
  if (!slot) return "Manual attendance entry";

  return `${formatTime(slot.startTime)} – ${formatTime(slot.endTime)}${
    slot.room ? `  ·  ${slot.room}` : ""
  }`;
}

export function SubjectDetailScreen({ subjectId }: { subjectId: string }) {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id;
  const setup = useAttendanceStore((state) =>
    userId ? state.setupsByUserId[userId] : undefined,
  );
  const attendance = useAttendanceStore((state) =>
    userId ? state.logsByUserId[userId] : undefined,
  );
  const setAttendanceLog = useAttendanceStore(
    (state) => state.setAttendanceLog,
  );

  const subject = setup?.subjects.find((item) => item.id === subjectId);
  const subjectLogs = useMemo(
    () =>
      (attendance ?? [])
        .filter((log) => log.subjectId === subjectId)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [attendance, subjectId],
  );
  const scheduleSlots = useMemo(
    () =>
      setup
        ? Object.values(setup.weeklySchedule)
            .flat()
            .filter((slot) => slot.subjectId === subjectId)
        : [],
    [setup, subjectId],
  );
  const scheduleSlotsById = useMemo(
    () => new Map(scheduleSlots.map((slot) => [slot.id, slot])),
    [scheduleSlots],
  );
  const target =
    subject?.minimumAttendancePercentage ??
    setup?.minimumAttendancePercentage ??
    75;
  const summary = useMemo(
    () => calculateAttendanceSummary(subjectLogs, target),
    [subjectLogs, target],
  );

  const tone =
    summary.total === 0 || summary.percentage >= target
      ? "safe"
      : summary.percentage >= target - 10
        ? "warning"
        : "critical";
  const toneColor =
    tone === "safe"
      ? "#10D6A0"
      : tone === "warning"
        ? "#F59E0B"
        : "#FF5079";
  const progressWidth =
    summary.total === 0 ? 0 : Math.min(100, Math.max(0, summary.percentage));
  const statusMessage =
    summary.total === 0
      ? `Start tracking to protect your ${target}% target`
      : summary.percentage >= target
        ? summary.safeBunks === 1
          ? "You can safely skip 1 more class"
          : `You can safely skip ${summary.safeBunks} more classes`
        : summary.toRecover === 1
          ? `Must attend the next class to hit ${target}%`
          : `Must attend next ${summary.toRecover} classes to hit ${target}%`;
  const statusBadgeClass =
    tone === "safe"
      ? "bg-[#0B3B33]"
      : tone === "warning"
        ? "bg-[#3B2B12]"
        : "bg-[#441929]";
  const statusTextClass =
    tone === "safe"
      ? "text-[#10D6A0]"
      : tone === "warning"
        ? "text-[#F59E0B]"
        : "text-[#FF5C82]";

  const addAttendance = async (
    status: Extract<AttendanceStatus, "present" | "absent">,
  ) => {
    if (!userId || !setup || !subject) return;

    const now = new Date();
    const log: AttendanceLog = {
      id: `manual-${subject.id}-${now.getTime()}`,
      semesterId: setup.semester.id,
      subjectId: subject.id,
      scheduleSlotId: `manual-${subject.id}`,
      date: getLocalDateString(now),
      status,
    };

    setAttendanceLog(userId, log);
    await Haptics.impactAsync(
      status === "present"
        ? Haptics.ImpactFeedbackStyle.Light
        : Haptics.ImpactFeedbackStyle.Medium,
    );
  };

  const cycleHistoryStatus = async (log: AttendanceLog) => {
    if (!userId) return;

    setAttendanceLog(userId, {
      ...log,
      status: NEXT_STATUS[log.status],
    });
    await Haptics.selectionAsync();
  };

  if (!subject) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: "#070914" }}>
        <View className="flex-1 items-center justify-center gap-5 px-6">
          <Text className="font-outfit text-[28px] font-bold text-white">
            Subject not found
          </Text>
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.7}
            className="min-h-12 flex-row items-center gap-2 rounded-2xl bg-[#5F5BFF] px-5"
            onPress={() => router.back()}
          >
            <ArrowLeft color="#FFFFFF" size={19} strokeWidth={2.4} />
            <Text className="font-jakarta-semibold text-[15px] text-white">
              Go back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#070914" }}>
      <ScrollView
        className="bg-[#070914]"
        contentContainerStyle={{
          paddingBottom: 48,
          paddingHorizontal: 22,
          paddingTop: 12,
        }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(220)}>
          <TouchableOpacity
            accessibilityLabel="Back to dashboard"
            accessibilityRole="button"
            activeOpacity={0.65}
            className="mb-6 h-12 w-12 items-center justify-center rounded-2xl border border-[#2C3042] bg-[#131622]"
            onPress={() => router.back()}
          >
            <ArrowLeft color="#F7F7FB" size={23} strokeWidth={2.3} />
          </TouchableOpacity>

          <Text
            className="font-outfit text-[34px] font-bold leading-[42px] text-white"
            selectable
          >
            {subject.name}
          </Text>
          <Text
            className="mt-1 font-jakarta-medium text-[14px] tracking-[0.8px] text-zinc-500"
            selectable
          >
            {subject.courseCode}
          </Text>
        </Animated.View>

        <Animated.View
          className="mt-7 rounded-[28px] border border-[#2A2C37] bg-[#171717] p-6"
          entering={FadeInDown.delay(60).duration(240)}
          layout={LinearTransition.duration(180)}
        >
          <Text className="text-center font-jakarta-medium text-[14px] text-zinc-400">
            Current Attendance
          </Text>

          <Text
            className="mt-2 text-center font-outfit text-[68px] font-bold leading-[78px] text-white"
            selectable
          >
            {summary.percentage}%
          </Text>
          <Text className="text-center font-jakarta-medium text-[13px] text-zinc-500">
            Attended {summary.attended} out of {summary.total} classes total
          </Text>

          <View className="mt-6 h-2.5 overflow-hidden rounded-full bg-[#292A33]">
            <Animated.View
              className="h-full rounded-full"
              layout={LinearTransition.duration(220)}
              style={{
                backgroundColor: toneColor,
                width: `${progressWidth}%`,
              }}
            />
          </View>

          <View className="mt-5 items-center">
            <View className={`rounded-full px-4 py-2.5 ${statusBadgeClass}`}>
              <Text
                className={`font-jakarta-semibold text-[12px] ${statusTextClass}`}
              >
                {statusMessage}
              </Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          className="mt-4 flex-row gap-3"
          entering={FadeInDown.delay(110).duration(240)}
        >
          <TouchableOpacity
            accessibilityLabel="Add attended class"
            accessibilityRole="button"
            activeOpacity={0.72}
            className="min-h-[58px] flex-1 flex-row items-center justify-center gap-2 rounded-[18px] bg-[#0D3A33]"
            onPress={() => addAttendance("present")}
          >
            <View className="h-7 w-7 items-center justify-center rounded-full bg-[#10D6A0]">
              <Check color="#06261F" size={17} strokeWidth={3} />
            </View>
            <Text className="font-jakarta-bold text-[14px] text-[#10D6A0]">
              + Attended
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            accessibilityLabel="Add absent class"
            accessibilityRole="button"
            activeOpacity={0.72}
            className="min-h-[58px] flex-1 flex-row items-center justify-center gap-2 rounded-[18px] bg-[#3B1825]"
            onPress={() => addAttendance("absent")}
          >
            <View className="h-7 w-7 items-center justify-center rounded-full bg-[#FF5079]">
              <X color="#2B0712" size={17} strokeWidth={3} />
            </View>
            <Text className="font-jakarta-bold text-[14px] text-[#FF668A]">
              + Absent
            </Text>
          </TouchableOpacity>
        </Animated.View>

        <View className="mb-3 mt-8 flex-row items-end justify-between">
          <Text className="font-outfit text-[22px] font-semibold text-white">
            Attendance History
          </Text>
          <Text className="pb-0.5 font-jakarta-medium text-[11px] text-zinc-600">
            Tap status to edit
          </Text>
        </View>

        {subjectLogs.length > 0 ? (
          <View className="gap-3">
            {subjectLogs.map((log, index) => {
              const status = STATUS_STYLES[log.status];

              return (
                <Animated.View
                  className="min-h-[82px] flex-row items-center rounded-[20px] border border-[#292C38] bg-[#131622] px-4 py-4"
                  entering={FadeInDown.delay(Math.min(index, 5) * 35).duration(
                    220,
                  )}
                  key={log.id}
                  layout={LinearTransition.duration(180)}
                >
                  <View className="mr-3 h-10 w-10 items-center justify-center rounded-[13px] bg-[#22253A]">
                    <CalendarDays color="#7773FF" size={19} strokeWidth={2.1} />
                  </View>
                  <View className="min-w-0 flex-1 pr-2">
                    <Text className="font-jakarta-semibold text-[15px] text-white">
                      {formatHistoryDate(log.date)}
                    </Text>
                    <Text
                      className="mt-1 font-jakarta-medium text-[11px] text-[#777D9E]"
                      numberOfLines={1}
                    >
                      {getSessionLabel(log.scheduleSlotId, scheduleSlotsById)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    accessibilityHint="Cycles between present, absent, and cancelled"
                    accessibilityLabel={`Change ${status.label.toLowerCase()} attendance status`}
                    accessibilityRole="button"
                    activeOpacity={0.65}
                    className={`flex-row items-center gap-1.5 rounded-full px-3 py-2 ${status.badge}`}
                    onPress={() => cycleHistoryStatus(log)}
                  >
                    <View className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
                    <Text
                      className={`font-jakarta-semibold text-[11px] ${status.text}`}
                    >
                      {status.label}
                    </Text>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>
        ) : (
          <View className="items-center gap-3 rounded-[22px] border border-[#292C38] bg-[#131622] px-6 py-10">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-[#22253A]">
              <CalendarDays color="#7773FF" size={22} strokeWidth={2} />
            </View>
            <Text className="font-jakarta-semibold text-[15px] text-white">
              No attendance recorded
            </Text>
            <Text className="text-center font-jakarta-medium text-[12px] leading-5 text-zinc-500">
              Use the quick actions above to add your first class.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
