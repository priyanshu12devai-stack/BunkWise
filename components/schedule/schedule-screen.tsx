import Feather from "@expo/vector-icons/Feather";
import { useUser } from "@clerk/expo";
import * as Haptics from "expo-haptics";
import { useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { SlotFormSheet } from "@/components/schedule/slot-form-sheet";
import {
  getDayOfWeek,
  getLocalDateString,
  isScheduleSlotEffectiveOn,
  isSubjectActiveOn,
} from "@/lib/schedule";
import { useAttendanceStore } from "@/store/attendance-store";
import type { DayOfWeek, ScheduleSlot } from "@/types/attendance";

const DAYS: { key: DayOfWeek; label: string }[] = [
  { key: "monday", label: "Mon" },
  { key: "tuesday", label: "Tue" },
  { key: "wednesday", label: "Wed" },
  { key: "thursday", label: "Thu" },
  { key: "friday", label: "Fri" },
  { key: "saturday", label: "Sat" },
  { key: "sunday", label: "Sun" },
];

const SUBJECT_COLORS = [
  "#7773FF",
  "#F59E0B",
  "#ED4694",
  "#10C893",
  "#2BC9E5",
] as const;

function formatTime(value: string) {
  const [hoursText, minutes = "00"] = value.split(":");
  const hours = Number(hoursText);
  const period = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${minutes} ${period}`;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours > 23 ||
    minutes > 59
  ) {
    return null;
  }
  return hours * 60 + minutes;
}

function slotsOverlap(first: ScheduleSlot, second: ScheduleSlot) {
  const firstStart = timeToMinutes(first.startTime);
  const firstEnd = timeToMinutes(first.endTime);
  const secondStart = timeToMinutes(second.startTime);
  const secondEnd = timeToMinutes(second.endTime);

  if (
    firstStart === null ||
    firstEnd === null ||
    secondStart === null ||
    secondEnd === null
  ) {
    return false;
  }

  return firstStart < secondEnd && secondStart < firstEnd;
}

export function ScheduleScreen() {
  const { user } = useUser();
  const userId = user?.id;
  const today = getLocalDateString();
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(
    getDayOfWeek(today),
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const setup = useAttendanceStore((state) =>
    userId ? state.setupsByUserId[userId] : undefined,
  );
  const saveScheduleSlot = useAttendanceStore(
    (state) => state.saveScheduleSlot,
  );
  const removeScheduleSlot = useAttendanceStore(
    (state) => state.removeScheduleSlot,
  );
  const activeSubjects = useMemo(
    () =>
      (setup?.subjects ?? []).filter((subject) =>
        isSubjectActiveOn(subject, today),
      ),
    [setup?.subjects, today],
  );

  const visibleSlots = useMemo(
    () =>
      (setup?.weeklySchedule[selectedDay] ?? [])
        .filter((slot) => isScheduleSlotEffectiveOn(slot, today))
        .sort((first, second) =>
          first.startTime.localeCompare(second.startTime),
        ),
    [selectedDay, setup?.weeklySchedule, today],
  );
  const subjectsById = useMemo(
    () =>
      new Map(
        (setup?.subjects ?? []).map((subject) => [subject.id, subject]),
      ),
    [setup?.subjects],
  );
  const subjectColorById = useMemo(
    () =>
      new Map(
        (setup?.subjects ?? []).map((subject, index) => [
          subject.id,
          SUBJECT_COLORS[index % SUBJECT_COLORS.length],
        ]),
      ),
    [setup?.subjects],
  );

  const openAddForm = () => {
    setEditingSlot(null);
    setIsFormOpen(true);
    void Haptics.selectionAsync().catch(() => undefined);
  };

  const openEditForm = (slot: ScheduleSlot) => {
    setEditingSlot(slot);
    setIsFormOpen(true);
    void Haptics.selectionAsync().catch(() => undefined);
  };

  const saveSlot = (slot: ScheduleSlot) => {
    if (!userId || !setup) return "Your semester setup is not available.";

    const startMinutes = timeToMinutes(slot.startTime);
    const endMinutes = timeToMinutes(slot.endTime);
    if (
      startMinutes === null ||
      endMinutes === null ||
      endMinutes <= startMinutes
    ) {
      return "End time must be later than start time.";
    }

    const hasOverlap = visibleSlots
      .filter((existingSlot) => existingSlot.id !== editingSlot?.id)
      .some((existingSlot) => slotsOverlap(existingSlot, slot));
    if (hasOverlap) {
      return "This time overlaps another class scheduled for this day.";
    }

    saveScheduleSlot(
      userId,
      selectedDay,
      slot,
      today,
      editingSlot?.id,
    );
    return null;
  };

  const confirmRemoveSlot = () => {
    if (!userId || !editingSlot) return;

    Alert.alert(
      "Remove recurring slot?",
      "Past attendance will stay unchanged. This slot will stop appearing from today onward.",
      [
        { style: "cancel", text: "Cancel" },
        {
          onPress: () => {
            removeScheduleSlot(
              userId,
              selectedDay,
              editingSlot.id,
              today,
            );
            setIsFormOpen(false);
            setEditingSlot(null);
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning,
            ).catch(() => undefined);
          },
          style: "destructive",
          text: "Remove slot",
        },
      ],
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#080A15" }}>
      <ScrollView
        className="bg-[#080A15]"
        contentContainerStyle={{
          paddingBottom: 40,
          paddingHorizontal: 20,
          paddingTop: 18,
        }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="font-outfit text-[32px] font-bold leading-10 text-white"
          selectable
        >
          Schedule
        </Text>

        <ScrollView
          className="-mx-5 mt-7"
          contentContainerStyle={{
            gap: 10,
            paddingHorizontal: 20,
          }}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {DAYS.map((day) => {
            const isSelected = selectedDay === day.key;

            return (
              <TouchableOpacity
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                activeOpacity={0.74}
                className={`h-[52px] min-w-[64px] items-center justify-center rounded-[18px] px-4 ${
                  isSelected ? "bg-white" : "bg-[#151722]"
                }`}
                key={day.key}
                onPress={() => {
                  setSelectedDay(day.key);
                  void Haptics.selectionAsync().catch(() => undefined);
                }}
              >
                <Text
                  className={`font-jakarta-bold text-[16px] ${
                    isSelected ? "text-black" : "text-[#777D9E]"
                  }`}
                >
                  {day.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Animated.View
          className="mt-8"
          key={selectedDay}
          layout={LinearTransition.duration(180)}
        >
          {visibleSlots.map((slot, index) => {
            const subject = subjectsById.get(slot.subjectId);
            const accentColor =
              subjectColorById.get(slot.subjectId) ?? "#7773FF";

            return (
              <Animated.View
                className="mb-3"
                entering={FadeInDown.delay(index * 45).duration(220)}
                key={slot.id}
                layout={LinearTransition.duration(180)}
              >
                <TouchableOpacity
                  accessibilityHint="Opens this recurring slot for editing"
                  accessibilityLabel={`Edit ${subject?.name ?? "schedule"} slot`}
                  accessibilityRole="button"
                  activeOpacity={0.76}
                  className="min-h-[104px] flex-row items-center rounded-3xl bg-[#171717] p-5"
                  onPress={() => openEditForm(slot)}
                >
                  <View className="w-[108px] pr-4">
                    <Text className="font-jakarta-medium text-xs leading-5 text-zinc-500">
                      {formatTime(slot.startTime)}
                    </Text>
                    <Text className="font-jakarta-medium text-xs leading-5 text-zinc-600">
                      {formatTime(slot.endTime)}
                    </Text>
                  </View>

                  <View
                    className="mr-4 h-[54px] w-1 rounded-full"
                    style={{ backgroundColor: accentColor }}
                  />

                  <Text
                    className="min-w-0 flex-1 font-outfit text-[19px] font-semibold leading-6 text-white"
                    numberOfLines={2}
                    selectable
                  >
                    {subject?.name ?? "Unknown subject"}
                  </Text>

                  <View className="ml-3 h-10 w-10 items-center justify-center rounded-2xl bg-[#202027]">
                    <Feather
                      color="#777D9E"
                      name="chevron-right"
                      size={20}
                    />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}

          {visibleSlots.length === 0 ? (
            <Animated.View
              className="mb-3 min-h-[116px] items-center justify-center rounded-3xl bg-[#171717] px-6"
              entering={FadeInDown.duration(200)}
            >
              <Text className="font-outfit text-[18px] font-semibold text-zinc-300">
                No slots scheduled
              </Text>
              <Text className="pt-1.5 text-center font-jakarta-medium text-xs text-zinc-600">
                Add a recurring class for this day.
              </Text>
            </Animated.View>
          ) : null}

          <TouchableOpacity
            accessibilityLabel={`Add a ${selectedDay} schedule slot`}
            accessibilityRole="button"
            activeOpacity={0.72}
            className="min-h-[72px] items-center justify-center rounded-3xl border border-dashed border-[#3C3E50]"
            onPress={openAddForm}
          >
            <Text className="font-jakarta-semibold text-[17px] text-[#858BAF]">
              + Add slot
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>

      <SlotFormSheet
        day={selectedDay}
        initialSlot={editingSlot}
        onClose={() => setIsFormOpen(false)}
        onDelete={editingSlot ? confirmRemoveSlot : undefined}
        onSave={saveSlot}
        subjects={activeSubjects}
        visible={isFormOpen}
      />
    </SafeAreaView>
  );
}
