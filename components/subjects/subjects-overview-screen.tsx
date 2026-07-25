import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { BarChart3, BookOpen, Plus } from "lucide-react-native";
import { useMemo } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { calculateAttendanceSummary } from "@/lib/attendance";
import {
  getLocalDateString,
  isSubjectActiveOn,
} from "@/lib/schedule";
import { useAttendanceStore } from "@/store/attendance-store";
import type { Subject } from "@/types/attendance";

const SUBJECT_COLORS = [
  {
    icon: "#7773FF",
    iconBackground: "bg-[#242449]",
  },
  {
    icon: "#27D8F3",
    iconBackground: "bg-[#173947]",
  },
  {
    icon: "#F59E0B",
    iconBackground: "bg-[#3B2C24]",
  },
  {
    icon: "#ED4694",
    iconBackground: "bg-[#3D1D36]",
  },
  {
    icon: "#10C893",
    iconBackground: "bg-[#17383A]",
  },
] as const;

type SubjectStatus = "safe" | "risk" | "critical";

const STATUS_STYLES: Record<
  SubjectStatus,
  {
    badge: string;
    label: string;
    progress: string;
    text: string;
  }
> = {
  safe: {
    badge: "bg-[#0B3B33]",
    label: "SAFE",
    progress: "#10C893",
    text: "text-[#10D6A0]",
  },
  risk: {
    badge: "bg-[#3B2B12]",
    label: "AT RISK",
    progress: "#F59E0B",
    text: "text-[#F5A800]",
  },
  critical: {
    badge: "bg-[#441929]",
    label: "CRITICAL",
    progress: "#FF4070",
    text: "text-[#FF668A]",
  },
};

function getSubjectStatus(
  percentage: number,
  target: number,
): SubjectStatus {
  if (percentage >= target) return "safe";
  if (percentage >= target - 10) return "risk";
  return "critical";
}

function OverviewAction({
  accessibilityLabel,
  icon,
  isPrimary = false,
  onPress,
}: {
  accessibilityLabel: string;
  icon: React.ReactNode;
  isPrimary?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      activeOpacity={0.7}
      className={`h-[52px] w-[52px] items-center justify-center rounded-[17px] ${
        isPrimary
          ? "bg-[#605BFF]"
          : "border border-[#303344] bg-[#151722]"
      }`}
      onPress={onPress}
    >
      {icon}
    </TouchableOpacity>
  );
}

function SubjectCard({
  index,
  logs,
  subject,
}: {
  index: number;
  logs: ReturnType<typeof useAttendanceStore.getState>["logsByUserId"][string];
  subject: Subject;
}) {
  const summary = calculateAttendanceSummary(
    logs.filter((log) => log.subjectId === subject.id),
    subject.minimumAttendancePercentage,
  );
  const statusKey = getSubjectStatus(
    summary.percentage,
    subject.minimumAttendancePercentage,
  );
  const status = STATUS_STYLES[statusKey];
  const color = SUBJECT_COLORS[index % SUBJECT_COLORS.length];

  return (
    <Animated.View entering={FadeInDown.delay(index * 45).duration(240)}>
      <View className="min-h-[150px] rounded-[22px] border border-[#2C2F3C] bg-[#141620] px-4 py-5">
        <View className="flex-row items-center">
          <View
            className={`mr-4 h-[64px] w-[64px] items-center justify-center rounded-[20px] ${color.iconBackground}`}
          >
            <BookOpen color={color.icon} size={29} strokeWidth={2.2} />
          </View>

          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-2">
              <Text
                className="min-w-0 flex-1 font-outfit text-[19px] font-semibold leading-6 text-white"
                numberOfLines={1}
                selectable
              >
                {subject.name}
              </Text>
              <View className={`rounded-lg px-2.5 py-1.5 ${status.badge}`}>
                <Text
                  className={`font-jakarta-semibold text-[10px] tracking-[0.5px] ${status.text}`}
                >
                  {status.label}
                </Text>
              </View>
            </View>

            <View className="mt-3 h-2 overflow-hidden rounded-full bg-[#292B35]">
              <View
                className="h-full rounded-full"
                style={{
                  backgroundColor: status.progress,
                  width: `${Math.min(100, summary.percentage)}%`,
                }}
              />
            </View>

            <View className="mt-3 flex-row items-center justify-between">
              <Text className="font-jakarta-medium text-[13px] text-[#777D9E]">
                {summary.attended}/{summary.total} classes
              </Text>
              <Text
                className={`font-jakarta-bold text-[16px] ${status.text}`}
                selectable
              >
                {summary.percentage}%
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export function SubjectsOverviewScreen() {
  const router = useRouter();
  const { user } = useUser();
  const userId = user?.id;
  const setup = useAttendanceStore((state) =>
    userId ? state.setupsByUserId[userId] : undefined,
  );
  const attendance = useAttendanceStore((state) =>
    userId ? state.logsByUserId[userId] : undefined,
  );
  const subjectOverviews = useMemo(
    () =>
      (setup?.subjects ?? [])
        .filter((subject) =>
          isSubjectActiveOn(subject, getLocalDateString()),
        )
        .map((subject) => {
          const summary = calculateAttendanceSummary(
            (attendance ?? []).filter(
              (log) => log.subjectId === subject.id,
            ),
            subject.minimumAttendancePercentage,
          );

          return {
            status: getSubjectStatus(
              summary.percentage,
              subject.minimumAttendancePercentage,
            ),
            subject,
          };
        }),
    [attendance, setup?.subjects],
  );
  const statusCounts = useMemo(
    () =>
      subjectOverviews.reduce(
        (counts, item) => ({
          ...counts,
          [item.status]: counts[item.status] + 1,
        }),
        { critical: 0, risk: 0, safe: 0 },
      ),
    [subjectOverviews],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#070914" }}>
      <ScrollView
        className="bg-[#070914]"
        contentContainerStyle={{
          gap: 24,
          paddingBottom: 36,
          paddingHorizontal: 22,
          paddingTop: 18,
        }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          className="flex-row items-center justify-between"
          entering={FadeInDown.duration(220)}
        >
          <Text
            className="font-outfit text-[34px] font-bold text-white"
            selectable
          >
            Subjects
          </Text>

          <View className="flex-row gap-3">
            <OverviewAction
              accessibilityLabel="Open analytics"
              icon={<BarChart3 color="#858BAF" size={22} strokeWidth={2.1} />}
              onPress={() => router.push("/analytics")}
            />
            <OverviewAction
              accessibilityLabel="Edit semester subjects"
              icon={<Plus color="#FFFFFF" size={27} strokeWidth={2.2} />}
              isPrimary
              onPress={() => router.push("/setup-wizard")}
            />
          </View>
        </Animated.View>

        <Animated.View
          className="flex-row gap-3"
          entering={FadeInDown.delay(50).duration(230)}
        >
          <View className="min-h-[104px] flex-1 items-center justify-center rounded-[20px] bg-[#09282B] px-2">
            <Text className="font-jakarta-bold text-[28px] text-[#10D6A0]">
              {statusCounts.safe}
            </Text>
            <Text className="mt-1 font-jakarta-semibold text-[11px] tracking-[0.8px] text-[#10D6A0]">
              SAFE
            </Text>
          </View>
          <View className="min-h-[104px] flex-1 items-center justify-center rounded-[20px] bg-[#282219] px-2">
            <Text className="font-jakarta-bold text-[28px] text-[#F5A800]">
              {statusCounts.risk}
            </Text>
            <Text className="mt-1 font-jakarta-semibold text-[11px] tracking-[0.5px] text-[#F5A800]">
              AT RISK
            </Text>
          </View>
          <View className="min-h-[104px] flex-1 items-center justify-center rounded-[20px] bg-[#2B1022] px-2">
            <Text className="font-jakarta-bold text-[28px] text-[#FF5C82]">
              {statusCounts.critical}
            </Text>
            <Text className="mt-1 font-jakarta-semibold text-[11px] tracking-[0.5px] text-[#FF668A]">
              CRITICAL
            </Text>
          </View>
        </Animated.View>

        {setup?.subjects.length ? (
          <View className="gap-3">
            {setup.subjects.map((subject, index) => (
              <SubjectCard
                index={index}
                key={subject.id}
                logs={attendance ?? []}
                subject={subject}
              />
            ))}
          </View>
        ) : (
          <View className="items-center gap-3 rounded-[22px] border border-[#2C2F3C] bg-[#141620] px-6 py-12">
            <View className="h-14 w-14 items-center justify-center rounded-[18px] bg-[#242449]">
              <BookOpen color="#7773FF" size={26} strokeWidth={2.1} />
            </View>
            <Text className="font-outfit text-[19px] font-semibold text-white">
              No subjects yet
            </Text>
            <Text className="text-center font-jakarta-medium text-[13px] leading-5 text-[#777D9E]">
              Add subjects to your semester to start tracking attendance.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
