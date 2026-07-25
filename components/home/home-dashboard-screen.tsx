import Feather from "@expo/vector-icons/Feather";
import { useClerk, useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import { EditProfileModal } from "@/components/home/edit-profile-modal";
import { calculateAttendanceSummary } from "@/lib/attendance";
import {
  getLocalDateString,
  getScheduleSlotsForDate,
} from "@/lib/schedule";
import { useAttendanceStore } from "@/store/attendance-store";
import type { ScheduleSlot, Subject } from "@/types/attendance";

const SUBJECT_COLORS = ["#6863FF", "#F59E0B", "#ED4694", "#13BF91", "#2BC9E5"];
const RING_SIZE = 126;
const RING_STROKE = 13;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = Math.PI * 2 * RING_RADIUS;

type ClassItem = ScheduleSlot & {
  subject: Subject;
};

type ProfileOverlay = "edit" | "menu" | null;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hour = hours % 12 || 12;
  return `${hour}:${String(minutes).padStart(2, "0")} ${period}`;
}

function AttendanceRing({
  percentage,
  isOnTrack,
}: {
  percentage: number;
  isOnTrack: boolean;
}) {
  const progress = Math.min(100, Math.max(0, percentage));
  const progressColor = isOnTrack ? "#10C893" : "#FF5079";

  return (
    <View
      className="items-center justify-center"
      style={{ height: RING_SIZE, width: RING_SIZE }}
    >
      <Svg height={RING_SIZE} width={RING_SIZE}>
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="none"
          r={RING_RADIUS}
          stroke="#262750"
          strokeWidth={RING_STROKE}
        />
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="none"
          r={RING_RADIUS}
          rotation="-90"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          stroke={progressColor}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={
            RING_CIRCUMFERENCE - (progress / 100) * RING_CIRCUMFERENCE
          }
          strokeLinecap="round"
          strokeWidth={RING_STROKE}
        />
      </Svg>
      <View className="absolute items-center">
        <Text className="font-jakarta-extrabold text-[30px] leading-9 text-white">
          {percentage}%
        </Text>
        <Text className="font-jakarta-medium text-[12px] text-[#858CB3]">
          overall
        </Text>
      </View>
    </View>
  );
}

function MenuRow({
  color = "#FFFFFF",
  icon,
  label,
  onPress,
}: {
  color?: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.68}
      className="h-[58px] flex-row items-center gap-4 px-5"
      onPress={onPress}
    >
      <Feather color={color} name={icon} size={21} />
      <Text
        className="font-jakarta-semibold text-[16px]"
        style={{ color }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function HomeDashboardScreen() {
  const router = useRouter();
  const { signOut } = useClerk();
  const { isLoaded, user } = useUser();
  const [profileOverlay, setProfileOverlay] = useState<ProfileOverlay>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const userId = user?.id;
  const setup = useAttendanceStore((state) =>
    userId ? state.setupsByUserId[userId] : undefined,
  );
  const attendance = useAttendanceStore((state) =>
    userId ? state.logsByUserId[userId] : undefined,
  );

  const target = setup?.minimumAttendancePercentage ?? 75;
  const summary = calculateAttendanceSummary(attendance ?? [], target);
  const isOnTrack = summary.percentage >= target;

  const todayClasses = useMemo<ClassItem[]>(() => {
    if (!setup) return [];

    const today = getLocalDateString();
    const subjectsById = new Map(
      setup.subjects.map((subject) => [subject.id, subject]),
    );

    return getScheduleSlotsForDate(setup.weeklySchedule, today)
      .map((slot) => {
        const subject = subjectsById.get(slot.subjectId);
        return subject ? { ...slot, subject } : null;
      })
      .filter((item): item is ClassItem => item !== null);
  }, [setup]);

  const dateLabel = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    weekday: "short",
  })
    .format(new Date())
    .toUpperCase();
  const firstName = user?.firstName?.trim() || "Student";
  const initials = firstName.charAt(0).toUpperCase();
  const hasCustomAvatar = isLoaded && Boolean(user?.hasImage);

  const handleSignOut = async () => {
    if (!userId || isSigningOut) return;

    setIsSigningOut(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Unable to sign out. Please try again.", error);
    } finally {
      setIsSigningOut(false);
      setProfileOverlay(null);
    }
  };

  const openSemesterEditor = () => {
    setProfileOverlay(null);
    router.push("/setup-wizard");
  };

  const openProfileEditor = () => {
    setProfileOverlay("edit");
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#070914" }}>
      <ScrollView
        className="bg-[#070914]"
        contentContainerStyle={{
          gap: 28,
          paddingBottom: 36,
          paddingHorizontal: 24,
          paddingTop: 20,
        }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1 pr-4">
            <Text className="font-jakarta-medium text-[17px] leading-6 text-[#858CB3]">
              {getGreeting()},
            </Text>
            <Text
              className="font-jakarta-bold text-[29px] leading-10 text-white"
              numberOfLines={1}
            >
              {firstName} 👋
            </Text>
          </View>

          <TouchableOpacity
            accessibilityLabel="Open profile menu"
            accessibilityRole="button"
            activeOpacity={0.75}
            className="h-[58px] w-[58px] items-center justify-center overflow-hidden rounded-full border-2 border-[#4B47A5] bg-[#6C42F5]"
            onPress={() => setProfileOverlay("menu")}
          >
            {hasCustomAvatar && user ? (
              <Image
                accessibilityLabel={`${firstName}'s profile photo`}
                cachePolicy="memory"
                className="h-full w-full"
                contentFit="cover"
                source={{
                  uri: `${user.imageUrl}?t=${user.updatedAt?.getTime() ?? 0}`,
                }}
              />
            ) : (
              <Text className="font-jakarta-bold text-[19px] text-white">
                {initials}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="rounded-[26px] border border-[#302E7D] bg-[#12123A] px-4 py-6">
          <View className="flex-row items-center gap-4">
            <AttendanceRing
              isOnTrack={isOnTrack}
              percentage={summary.percentage}
            />

            <View className="min-w-0 flex-1 gap-4">
              <View>
                <Text className="font-jakarta-semibold text-[11px] tracking-[1px] text-[#858CB3]">
                  ATTENDANCE STATUS
                </Text>
                <Text
                  className={`pt-1 font-jakarta-bold text-[20px] leading-7 ${isOnTrack ? "text-[#10C893]" : "text-[#FF5079]"}`}
                >
                  {summary.total === 0
                    ? "No records yet"
                    : isOnTrack
                      ? "On track"
                      : "Needs attention"}
                </Text>
              </View>

              <View className="flex-row gap-2">
                <View className="min-w-0 flex-1">
                  <Text className="font-jakarta-bold text-[22px] text-[#10C893]">
                    {summary.safeBunks}
                  </Text>
                  <Text
                    adjustsFontSizeToFit
                    className="font-jakarta-medium text-[10px] uppercase tracking-[0.2px] text-[#858CB3]"
                    minimumFontScale={0.8}
                    numberOfLines={1}
                  >
                    Safe bunks
                  </Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="font-jakarta-bold text-[22px] text-[#FF5079]">
                    {summary.toRecover}
                  </Text>
                  <Text
                    adjustsFontSizeToFit
                    className="font-jakarta-medium text-[10px] uppercase tracking-[0.2px] text-[#858CB3]"
                    minimumFontScale={0.8}
                    numberOfLines={1}
                  >
                    To recover
                  </Text>
                </View>
              </View>

              <Text
                adjustsFontSizeToFit
                className="font-jakarta-medium text-[11px] text-[#858CB3]"
                minimumFontScale={0.82}
                numberOfLines={1}
              >
                {setup?.semester.name ?? "Current semester"} · {target}% target
              </Text>
            </View>
          </View>
        </View>

        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-jakarta-bold text-[23px] leading-8 text-white">
              Today&apos;s Classes
            </Text>
            <Text className="font-jakarta-semibold text-[12px] tracking-[0.8px] text-[#858CB3]">
              {dateLabel}
            </Text>
          </View>

          {todayClasses.length > 0 ? (
            <View className="gap-3">
              {todayClasses.map((item, index) => (
                <TouchableOpacity
                  accessibilityHint="Opens this subject's attendance details"
                  accessibilityLabel={`Open ${item.subject.name}`}
                  accessibilityRole="button"
                  activeOpacity={0.72}
                  className="min-h-[96px] flex-row items-center rounded-[22px] border border-[#2C3042] bg-[#131622] px-5 py-4"
                  key={item.id}
                  onPress={() =>
                    router.push({
                      pathname: "/subject/[subjectId]",
                      params: { subjectId: item.subject.id },
                    })
                  }
                >
                  <View
                    className="mr-4 h-[56px] w-[5px] rounded-full"
                    style={{
                      backgroundColor:
                        SUBJECT_COLORS[index % SUBJECT_COLORS.length],
                    }}
                  />
                  <View className="min-w-0 flex-1 gap-1">
                    <Text
                      className="font-jakarta-semibold text-[18px] leading-6 text-white"
                      numberOfLines={1}
                    >
                      {item.subject.name}
                    </Text>
                    <Text className="font-jakarta-medium text-[13px] leading-5 text-[#858CB3]">
                      {formatTime(item.startTime)}–{formatTime(item.endTime)}
                      {item.room ? `  ·  ${item.room}` : ""}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="items-center gap-2 rounded-[22px] border border-[#2C3042] bg-[#131622] px-5 py-8">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-[#22263A]">
                <Feather color="#858CB3" name="coffee" size={21} />
              </View>
              <Text className="font-jakarta-semibold text-[16px] text-white">
                No classes today
              </Text>
              <Text className="font-jakarta-regular text-[13px] text-[#858CB3]">
                Your schedule is clear.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setProfileOverlay(null)}
        transparent
        visible={profileOverlay !== null}
      >
        {profileOverlay === "edit" ? (
          <EditProfileModal onClose={() => setProfileOverlay(null)} />
        ) : (
          <Pressable
            accessibilityLabel="Close profile menu"
            className="flex-1 justify-end bg-black/50 px-5 pb-8"
            onPress={() => setProfileOverlay(null)}
          >
            <Pressable
              className="overflow-hidden rounded-[26px] border border-[#30303A] bg-zinc-900"
              onPress={() => undefined}
            >
              <MenuRow
                icon="user"
                label="Edit Profile"
                onPress={openProfileEditor}
              />
              <View className="h-px bg-[#30303A]" />
              <MenuRow
                icon="calendar"
                label="Edit Semester"
                onPress={openSemesterEditor}
              />
              <View className="h-px bg-[#30303A]" />
              <MenuRow
                color="#F43F5E"
                icon="log-out"
                label={isSigningOut ? "Signing Out…" : "Sign Out"}
                onPress={handleSignOut}
              />
            </Pressable>
          </Pressable>
        )}
      </Modal>
    </SafeAreaView>
  );
}
