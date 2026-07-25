import Feather from "@expo/vector-icons/Feather";
import { Picker } from "@react-native-picker/picker";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import type { DayOfWeek, ScheduleSlot, Subject } from "@/types/attendance";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
);
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
);

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

type TimeWheelProps = {
  accessibilityLabel: string;
  onValueChange: (value: string) => void;
  options: string[];
  selectedValue: string;
  unit: string;
};

function formatTime(value: string) {
  const [hoursText, minutes = "00"] = value.split(":");
  const hours = Number(hoursText);
  const suffix = hours >= 12 ? "PM" : "AM";
  return `${hours % 12 || 12}:${minutes} ${suffix}`;
}

function TimeWheel({
  accessibilityLabel,
  onValueChange,
  options,
  selectedValue,
  unit,
}: TimeWheelProps) {
  const androidWheelRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(options.indexOf(selectedValue), 0);
  const rowHeight = 40;

  useEffect(() => {
    if (process.env.EXPO_OS !== "android") return;

    androidWheelRef.current?.scrollTo({
      animated: false,
      y: selectedIndex * rowHeight,
    });
  }, [selectedIndex]);

  return (
    <View className="h-[200px] w-1/2 shrink-0 grow-0 flex-row items-center justify-center overflow-hidden">
      {process.env.EXPO_OS === "android" ? (
        <ScrollView
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="adjustable"
          className="h-[200px] w-[104px] shrink-0 grow-0"
          contentContainerStyle={{ paddingVertical: 80 }}
          contentOffset={{ x: 0, y: selectedIndex * rowHeight }}
          decelerationRate="fast"
          nestedScrollEnabled
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.max(
              0,
              Math.min(
                options.length - 1,
                Math.round(
                  event.nativeEvent.contentOffset.y / rowHeight,
                ),
              ),
            );
            onValueChange(options[nextIndex]);
          }}
          overScrollMode="never"
          ref={androidWheelRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={rowHeight}
        >
          {options.map((option) => (
            <TouchableOpacity
              activeOpacity={0.7}
              className="h-10 items-center justify-center"
              key={option}
              onPress={() => {
                androidWheelRef.current?.scrollTo({
                  animated: true,
                  y: options.indexOf(option) * rowHeight,
                });
                onValueChange(option);
              }}
            >
              <Text
                className={
                  option === selectedValue
                    ? "font-jakarta-bold text-[29px] text-white"
                    : "font-jakarta-bold text-[25px] text-[#62677F]"
                }
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {option}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <Picker
          accessibilityLabel={accessibilityLabel}
          dropdownIconColor="transparent"
          itemStyle={{
            color: "#FFFFFF",
            fontFamily: "PlusJakartaSans-Bold",
            fontSize: 29,
            fontVariant: ["tabular-nums"],
          }}
          numberOfLines={1}
          onValueChange={(value) => onValueChange(String(value))}
          selectedValue={selectedValue}
          selectionColor="transparent"
          style={{
            color: "#FFFFFF",
            height: 200,
            width: 104,
          }}
        >
          {options.map((option) => (
            <Picker.Item
              color="#FFFFFF"
              fontFamily="PlusJakartaSans-Bold"
              key={option}
              label={option}
              value={option}
            />
          ))}
        </Picker>
      )}

      <Text className="w-8 font-jakarta-semibold text-[11px] text-[#858BA5]">
        {unit}
      </Text>
    </View>
  );
}

function TimeControl({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: ScheduleSlot["startTime"]) => void;
  value: ScheduleSlot["startTime"];
}) {
  const [hours = "00", minutes = "00"] = value.split(":");

  const updateTime = (nextHours: string, nextMinutes: string) => {
    const nextValue =
      `${nextHours}:${nextMinutes}` as ScheduleSlot["startTime"];
    if (nextValue === value) return;

    onChange(nextValue);
    void Haptics.selectionAsync().catch(() => undefined);
  };

  return (
    <View className="relative h-[200px] w-full overflow-hidden rounded-[20px] border border-[#30313B] bg-[#181818]">
      <View className="h-[200px] w-full flex-row items-center justify-center overflow-hidden">
        <TimeWheel
          accessibilityLabel={`${label} hour`}
          onValueChange={(nextHours) => updateTime(nextHours, minutes)}
          options={HOUR_OPTIONS}
          selectedValue={hours}
          unit="hr"
        />
        <TimeWheel
          accessibilityLabel={`${label} minute`}
          onValueChange={(nextMinutes) => updateTime(hours, nextMinutes)}
          options={MINUTE_OPTIONS}
          selectedValue={minutes}
          unit="min"
        />
      </View>

      <View
        className="absolute left-0 right-0 top-0 h-[38px] bg-[#181818]/90"
        pointerEvents="none"
      />
      <View
        className="absolute left-0 right-0 top-[38px] h-[28px] bg-[#181818]/50"
        pointerEvents="none"
      />
      <View
        className="absolute bottom-[38px] left-0 right-0 h-[28px] bg-[#181818]/50"
        pointerEvents="none"
      />
      <View
        className="absolute bottom-0 left-0 right-0 h-[38px] bg-[#181818]/90"
        pointerEvents="none"
      />
    </View>
  );
}

type SlotFormSheetProps = {
  day: DayOfWeek;
  initialSlot: ScheduleSlot | null;
  onClose: () => void;
  onDelete?: () => void;
  onSave: (slot: ScheduleSlot) => string | null;
  subjects: Subject[];
  visible: boolean;
};

export function SlotFormSheet({
  day,
  initialSlot,
  onClose,
  onDelete,
  onSave,
  subjects,
  visible,
}: SlotFormSheetProps) {
  const [subjectId, setSubjectId] = useState("");
  const [startTime, setStartTime] =
    useState<ScheduleSlot["startTime"]>("09:00");
  const [endTime, setEndTime] =
    useState<ScheduleSlot["endTime"]>("10:00");
  const [activeTime, setActiveTime] = useState<"start" | "end">("start");
  const [isSubjectMenuOpen, setIsSubjectMenuOpen] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;

    setSubjectId(initialSlot?.subjectId ?? subjects[0]?.id ?? "");
    setStartTime(initialSlot?.startTime ?? "09:00");
    setEndTime(initialSlot?.endTime ?? "10:00");
    setActiveTime("start");
    setIsSubjectMenuOpen(false);
    setValidationError(null);
  }, [initialSlot, subjects, visible]);

  const selectedSubject = subjects.find(
    (subject) => subject.id === subjectId,
  );
  const isEditingStart = activeTime === "start";

  const submit = () => {
    if (!subjectId) {
      setValidationError("Add a subject before creating a schedule slot.");
      return;
    }

    const error = onSave({
      id: initialSlot?.id ?? `slot-${day}-${Date.now()}`,
      subjectId,
      startTime,
      endTime,
      room: initialSlot?.room ?? "",
    });

    if (error) {
      setValidationError(error);
      return;
    }

    void Haptics.notificationAsync(
      Haptics.NotificationFeedbackType.Success,
    ).catch(() => undefined);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-end bg-black/70">
          <View className="max-h-[92%] rounded-t-[30px] border-t border-[#2C2C34] bg-[#121212] px-5 pb-9 pt-3">
            <View className="mb-4 h-1.5 w-12 self-center rounded-full bg-zinc-700" />

            <View className="mb-6 flex-row items-center justify-between">
              <View>
                <Text className="font-outfit text-[25px] font-bold text-white">
                  {initialSlot ? "Edit slot" : "Add slot"}
                </Text>
                <Text className="pt-1 font-jakarta-medium text-xs text-zinc-500">
                  Recurs every {DAY_LABELS[day]}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close slot form"
                accessibilityRole="button"
                activeOpacity={0.7}
                className="h-11 w-11 items-center justify-center rounded-2xl bg-[#202020]"
                onPress={onClose}
              >
                <Feather color="#A1A1AA" name="x" size={22} />
              </TouchableOpacity>
            </View>

            <Text className="mb-2 font-jakarta-semibold text-[13px] text-zinc-400">
              Subject
            </Text>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={{ expanded: isSubjectMenuOpen }}
              activeOpacity={0.75}
              className="min-h-[56px] flex-row items-center justify-between rounded-2xl border border-[#303038] bg-[#1A1A1A] px-4"
              onPress={() => setIsSubjectMenuOpen((current) => !current)}
            >
              <Text
                className={`flex-1 font-jakarta-semibold text-[15px] ${
                  selectedSubject ? "text-white" : "text-zinc-600"
                }`}
                numberOfLines={1}
              >
                {selectedSubject?.name ?? "No subjects available"}
              </Text>
              <Feather
                color="#71717A"
                name={isSubjectMenuOpen ? "chevron-up" : "chevron-down"}
                size={20}
              />
            </TouchableOpacity>

            {isSubjectMenuOpen ? (
              <Animated.View
                className="mt-2 overflow-hidden rounded-2xl border border-[#303038] bg-[#1A1A1A]"
                entering={FadeInUp.duration(160)}
              >
                {subjects.map((subject, index) => (
                  <View key={subject.id}>
                    <TouchableOpacity
                      accessibilityRole="button"
                      accessibilityState={{
                        selected: subject.id === subjectId,
                      }}
                      activeOpacity={0.72}
                      className="min-h-[50px] flex-row items-center justify-between px-4"
                      onPress={() => {
                        setSubjectId(subject.id);
                        setIsSubjectMenuOpen(false);
                        setValidationError(null);
                      }}
                    >
                      <Text className="font-jakarta-medium text-[14px] text-white">
                        {subject.name}
                      </Text>
                      {subject.id === subjectId ? (
                        <Feather color="#FFFFFF" name="check" size={18} />
                      ) : null}
                    </TouchableOpacity>
                    {index < subjects.length - 1 ? (
                      <View className="h-px bg-[#292929]" />
                    ) : null}
                  </View>
                ))}
              </Animated.View>
            ) : null}

            <Text className="mb-2 mt-5 font-jakarta-semibold text-[13px] text-zinc-400">
              Time
            </Text>
            <View className="mb-3 flex-row gap-2 rounded-[18px] bg-[#1A1A1A] p-1.5">
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected: isEditingStart }}
                activeOpacity={0.8}
                className={`flex-1 rounded-[14px] px-4 py-3 ${
                  isEditingStart ? "bg-white" : "bg-transparent"
                }`}
                onPress={() => setActiveTime("start")}
              >
                <Text
                  className={`font-jakarta-medium text-[11px] ${
                    isEditingStart ? "text-zinc-500" : "text-zinc-600"
                  }`}
                >
                  Start
                </Text>
                <Text
                  className={`pt-0.5 font-jakarta-bold text-[16px] ${
                    isEditingStart ? "text-black" : "text-white"
                  }`}
                >
                  {formatTime(startTime)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityState={{ selected: !isEditingStart }}
                activeOpacity={0.8}
                className={`flex-1 rounded-[14px] px-4 py-3 ${
                  isEditingStart ? "bg-transparent" : "bg-white"
                }`}
                onPress={() => setActiveTime("end")}
              >
                <Text
                  className={`font-jakarta-medium text-[11px] ${
                    isEditingStart ? "text-zinc-600" : "text-zinc-500"
                  }`}
                >
                  End
                </Text>
                <Text
                  className={`pt-0.5 font-jakarta-bold text-[16px] ${
                    isEditingStart ? "text-white" : "text-black"
                  }`}
                >
                  {formatTime(endTime)}
                </Text>
              </TouchableOpacity>
            </View>

            <TimeControl
              key={activeTime}
              label={isEditingStart ? "Start" : "End"}
              onChange={(value) => {
                if (isEditingStart) setStartTime(value);
                else setEndTime(value);
                setValidationError(null);
              }}
              value={isEditingStart ? startTime : endTime}
            />

            {validationError ? (
              <Animated.Text
                className="mt-3 font-jakarta-medium text-[12px] leading-5 text-[#FF668A]"
                entering={FadeInUp.duration(160)}
              >
                {validationError}
              </Animated.Text>
            ) : null}

            <TouchableOpacity
              accessibilityRole="button"
              activeOpacity={0.76}
              className="mt-5 min-h-[56px] items-center justify-center rounded-2xl bg-white"
              onPress={submit}
            >
              <Text className="font-jakarta-bold text-[16px] text-black">
                {initialSlot ? "Save changes" : "Save slot"}
              </Text>
            </TouchableOpacity>

            {initialSlot && onDelete ? (
              <TouchableOpacity
                accessibilityRole="button"
                activeOpacity={0.72}
                className="mt-3 min-h-[52px] flex-row items-center justify-center gap-2 rounded-2xl border border-[#51212D] bg-[#241218]"
                onPress={onDelete}
              >
                <Feather color="#FF668A" name="trash-2" size={18} />
                <Text className="font-jakarta-bold text-[14px] text-[#FF668A]">
                  Remove slot
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
