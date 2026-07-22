import Ionicons from "@expo/vector-icons/Ionicons";
import { useAuth } from "@clerk/expo";
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  FadeInUp,
  ZoomIn,
  interpolateColor,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

import {
  type SemesterSetupData,
  useSemesterSetupStore,
} from "@/store/semester-setup-store";
import type {
  DateString,
  DayOfWeek,
  ScheduleSlot,
  Semester,
  Subject,
  WeeklySchedule,
} from "@/types/attendance";

const BACKGROUND = "#070914";
const MUTED = "#7F86AE";
const REQUIREMENT_COLOR = "#13BF91";
const REQUIREMENT_DANGER_COLOR = "#FF5079";
const RING_SIZE = 184;
const RING_STROKE_WIDTH = 17;
const RING_RADIUS = (RING_SIZE - RING_STROKE_WIDTH) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => pad(index));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => pad(index));
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SUBJECT_COLORS = ["#6863FF", "#2BC9E5", "#FF9E0B", "#ED4694", "#13BF91"];
const DAY_ORDER: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];
const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Mo",
  tuesday: "Tu",
  wednesday: "We",
  thursday: "Th",
  friday: "Fr",
  saturday: "Sa",
  sunday: "Su",
};
const TIMETABLE_DAY_LABELS: Record<DayOfWeek, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};
const EMPTY_SCHEDULE: WeeklySchedule = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

type WizardStep = 1 | 2 | 3 | 4 | 5 | "finished";

type SetupDraft = SemesterSetupData;

const initialDraft: SetupDraft = {
  academicYear: "2024–25",
  minimumAttendancePercentage: 75,
  regularWorkingDays: ["monday", "tuesday", "wednesday", "thursday", "friday"],
  semester: {
    id: "semester-draft",
    name: "Semester 5",
    startDate: "2024-08-01",
    endDate: "2024-12-15",
    totalWeeks: 20,
    holidays: [],
    isActive: true,
  },
  subjects: [
    {
      id: "subject-data-structures",
      semesterId: "semester-draft",
      name: "Data Structures",
      courseCode: "CS201",
      minimumAttendancePercentage: 75,
    },
    {
      id: "subject-operating-systems",
      semesterId: "semester-draft",
      name: "Operating Systems",
      courseCode: "CS203",
      minimumAttendancePercentage: 75,
    },
    {
      id: "subject-dbms",
      semesterId: "semester-draft",
      name: "DBMS",
      courseCode: "CS205",
      minimumAttendancePercentage: 75,
    },
  ],
  weeklySchedule: {
    ...EMPTY_SCHEDULE,
    monday: [
      {
        id: "slot-data-structures",
        subjectId: "subject-data-structures",
        startTime: "09:00",
        endTime: "10:00",
        room: "",
      },
      {
        id: "slot-dbms",
        subjectId: "subject-dbms",
        startTime: "11:00",
        endTime: "12:00",
        room: "",
      },
      {
        id: "slot-operating-systems",
        subjectId: "subject-operating-systems",
        startTime: "14:00",
        endTime: "15:00",
        room: "",
      },
    ],
  },
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function toDateString(year: number, month: number, date: number): DateString {
  return `${year}-${pad(month + 1)}-${pad(date)}` as DateString;
}

function parseDate(value: string) {
  const parts = value.split("-").map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return null;
  const [year, month, date] = parts;
  const parsed = new Date(year, month - 1, date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function calculateWeeks(startDate: DateString, endDate: DateString) {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end || end < start) return 0;
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 604_800_000));
}

function formatTime(value: string) {
  const [hoursText, minutes = "00"] = value.split(":");
  const hours = Number(hoursText);
  if (Number.isNaN(hours)) return value;
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes} ${suffix}`;
}

function timeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function slotsOverlap(first: ScheduleSlot, second: ScheduleSlot) {
  const firstStart = timeToMinutes(first.startTime);
  const firstEnd = timeToMinutes(first.endTime);
  const secondStart = timeToMinutes(second.startTime);
  const secondEnd = timeToMinutes(second.endTime);
  if (firstStart === null || firstEnd === null || secondStart === null || secondEnd === null) {
    return false;
  }
  return firstStart < secondEnd && secondStart < firstEnd;
}

function RequirementRing({ percentage }: { percentage: number }) {
  const progress = useSharedValue(percentage);
  const dangerProgress = useSharedValue(percentage < 75 ? 1 : 0);
  const animatedCircleProps = useAnimatedProps(() => ({
    stroke: interpolateColor(
      dangerProgress.value,
      [0, 1],
      [REQUIREMENT_COLOR, REQUIREMENT_DANGER_COLOR],
    ),
    strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress.value / 100),
  }));

  useEffect(() => {
    progress.value = withTiming(percentage, { duration: 260 });
    dangerProgress.value = withTiming(percentage < 75 ? 1 : 0, { duration: 220 });
  }, [dangerProgress, percentage, progress]);

  return (
    <View className="h-[184px] w-[184px] items-center justify-center rounded-full bg-[#080A15]">
      <Svg
        height={RING_SIZE}
        style={{ left: 0, position: "absolute", top: 0 }}
        viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
        width={RING_SIZE}
      >
        <Circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="none"
          r={RING_RADIUS}
          stroke="#191B28"
          strokeWidth={RING_STROKE_WIDTH}
        />
        <AnimatedCircle
          animatedProps={animatedCircleProps}
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          fill="none"
          origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
          r={RING_RADIUS}
          rotation={-90}
          strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
          strokeLinecap="round"
          strokeWidth={RING_STROKE_WIDTH}
        />
      </Svg>
      <View className="items-center justify-center">
        <Text className="font-jakarta-bold text-[43px] leading-[50px] text-white">
          {percentage}%
        </Text>
        <Text className="font-jakarta-regular text-[15px] text-[#858CB3]">
          minimum
        </Text>
      </View>
    </View>
  );
}

function WizardProgress({ step }: { step: number }) {
  const labels = ["Basics", "Requirement", "Subjects", "Timetable", "Holidays"];

  return (
    <View className="gap-3">
      <View className="flex-row gap-2">
        {labels.map((label, index) => (
          <View
            className={`h-1 flex-1 rounded-full ${index < step ? "bg-[#6F63FF]" : "bg-[#252735]"}`}
            key={label}
          />
        ))}
      </View>
      <Text className="font-jakarta-regular text-[15px] leading-5 text-[#7F86AE]">
        Step {step} of 5 — {labels[step - 1]}
      </Text>
    </View>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      accessibilityLabel="Go back"
      accessibilityRole="button"
      activeOpacity={0.7}
      className="h-12 w-12 items-start justify-center"
      onPress={onPress}
    >
      <Ionicons color={MUTED} name="chevron-back" size={30} />
    </TouchableOpacity>
  );
}

function WizardHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View className="gap-2">
      <Text className="font-jakarta-bold text-[27px] leading-9 text-[#FAFAFC]">
        {title}
      </Text>
      <Text className="font-jakarta-regular text-[16px] leading-6 text-[#7F86AE]">
        {subtitle}
      </Text>
    </View>
  );
}

type FieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
};

function WizardField({ label, placeholder, value, onChangeText }: FieldProps) {
  return (
    <View className="gap-2">
      <Text className="font-jakarta-semibold text-[15px] leading-5 text-[#AEB4D5]">
        {label}
      </Text>
      <TextInput
        autoCapitalize="words"
        className="setup-field"
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#777FAD"
        returnKeyType="done"
        underlineColorAndroid="transparent"
        value={value}
      />
    </View>
  );
}

type DateFieldProps = {
  label: string;
  maximumDate?: Date;
  minimumDate?: Date;
  value: DateString;
  onChange: (value: DateString) => void;
};

function formatDateForDisplay(value: DateString) {
  const date = parseDate(value);
  if (!date) return "Select date";
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function DateField({ label, maximumDate, minimumDate, value, onChange }: DateFieldProps) {
  const currentDate = parseDate(value) ?? new Date();
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [pendingDate, setPendingDate] = useState(currentDate);

  const saveDate = (date: Date) => {
    onChange(toDateString(date.getFullYear(), date.getMonth(), date.getDate()));
  };

  const openPicker = () => {
    const nextDate = parseDate(value) ?? new Date();
    if (process.env.EXPO_OS === "android") {
      DateTimePickerAndroid.open({
        display: "default",
        maximumDate,
        minimumDate,
        mode: "date",
        onChange: (event: DateTimePickerEvent, selectedDate?: Date) => {
          if (event.type === "set" && selectedDate) saveDate(selectedDate);
        },
        value: nextDate,
      });
      return;
    }

    setPendingDate(nextDate);
    setIsPickerVisible(true);
  };

  return (
    <View className="gap-2">
      <Text className="font-jakarta-semibold text-[15px] leading-5 text-[#AEB4D5]">
        {label}
      </Text>
      <TouchableOpacity
        accessibilityLabel={`${label}, ${formatDateForDisplay(value)}`}
        accessibilityRole="button"
        activeOpacity={0.78}
        className="h-[58px] flex-row items-center justify-between rounded-[16px] border border-[#323443] bg-[#181925] px-3"
        onPress={openPicker}
      >
        <Text className="font-jakarta-regular text-[14px] text-[#D7DAEB]">
          {formatDateForDisplay(value)}
        </Text>
        <Ionicons color="#858CB3" name="calendar-outline" size={18} />
      </TouchableOpacity>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsPickerVisible(false)}
        transparent
        visible={isPickerVisible}
      >
        <View className="flex-1 justify-end bg-black/70">
          <View className="rounded-t-[28px] bg-[#151722] px-5 pb-8 pt-5">
            <View className="mb-2 flex-row items-center justify-between">
              <TouchableOpacity
                accessibilityRole="button"
                className="px-2 py-2"
                onPress={() => setIsPickerVisible(false)}
              >
                <Text className="font-jakarta-semibold text-[16px] text-[#989FBE]">Cancel</Text>
              </TouchableOpacity>
              <Text className="font-jakarta-bold text-[18px] text-white">{label}</Text>
              <TouchableOpacity
                accessibilityRole="button"
                className="px-2 py-2"
                onPress={() => {
                  saveDate(pendingDate);
                  setIsPickerVisible(false);
                }}
              >
                <Text className="font-jakarta-bold text-[16px] text-[#817CFF]">Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              accentColor="#6964FF"
              display="inline"
              maximumDate={maximumDate}
              minimumDate={minimumDate}
              mode="date"
              onChange={(_event, selectedDate) => {
                if (selectedDate) setPendingDate(selectedDate);
              }}
              style={{ alignSelf: "center", height: 340, width: 350 }}
              themeVariant="dark"
              value={pendingDate}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

function SemesterBasics({ draft, setDraft }: DraftStepProps) {
  const updateSemester = (updates: Partial<Semester>) => {
    setDraft((current) => ({
      ...current,
      semester: { ...current.semester, ...updates },
    }));
  };

  return (
    <View className="gap-8">
      <WizardHeading
        subtitle="Tell us about your current semester."
        title="Semester Basics"
      />
      <View className="gap-6">
        <WizardField
          label="Semester Name"
          onChangeText={(name) => updateSemester({ name })}
          placeholder="e.g. Semester 5"
          value={draft.semester.name}
        />
        <WizardField
          label="Academic Year"
          onChangeText={(academicYear) =>
            setDraft((current) => ({ ...current, academicYear }))
          }
          placeholder="e.g. 2024–25"
          value={draft.academicYear}
        />
        <View className="flex-row gap-4">
          <View className="flex-1">
            <DateField
              label="Start Date"
              maximumDate={parseDate(draft.semester.endDate) ?? undefined}
              onChange={(startDate) =>
                updateSemester({ startDate: startDate as DateString })
              }
              value={draft.semester.startDate}
            />
          </View>
          <View className="flex-1">
            <DateField
              label="End Date"
              minimumDate={parseDate(draft.semester.startDate) ?? undefined}
              onChange={(endDate) =>
                updateSemester({ endDate: endDate as DateString })
              }
              value={draft.semester.endDate}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

function Requirement({ draft, setDraft }: DraftStepProps) {
  const changeRequirement = (amount: number) => {
    setDraft((current) => ({
      ...current,
      minimumAttendancePercentage: Math.min(
        100,
        Math.max(50, current.minimumAttendancePercentage + amount),
      ),
      subjects: current.subjects.map((subject) => ({
        ...subject,
        minimumAttendancePercentage: Math.min(
          100,
          Math.max(50, current.minimumAttendancePercentage + amount),
        ),
      })),
    }));
  };

  return (
    <View className="gap-8">
      <WizardHeading
        subtitle="Your college's minimum attendance percentage."
        title="Attendance Requirement"
      />
      <View className="items-center pt-10">
        <RequirementRing percentage={draft.minimumAttendancePercentage} />
        <View className="mt-9 w-full flex-row items-center justify-around">
          <TouchableOpacity
            accessibilityLabel="Decrease attendance requirement"
            accessibilityRole="button"
            activeOpacity={0.75}
            className="h-14 w-14 items-center justify-center rounded-full border border-[#353846] bg-[#1A1C27]"
            onPress={() => changeRequirement(-1)}
          >
            <Ionicons color="#FFFFFF" name="remove" size={27} />
          </TouchableOpacity>
          <Text className="text-center font-jakarta-medium text-[18px] leading-7 text-[#838AAF]">
            Tap to{"\n"}adjust
          </Text>
          <TouchableOpacity
            accessibilityLabel="Increase attendance requirement"
            accessibilityRole="button"
            activeOpacity={0.75}
            className="h-14 w-14 items-center justify-center rounded-full border border-[#353846] bg-[#1A1C27]"
            onPress={() => changeRequirement(1)}
          >
            <Ionicons color="#FFFFFF" name="add" size={27} />
          </TouchableOpacity>
        </View>
        <View className="setup-card mt-9 w-full flex-row gap-3 px-4 py-4">
          <Ionicons color="#817BFF" name="information-circle-outline" size={21} />
          <Text className="flex-1 font-jakarta-regular text-[14px] leading-6 text-[#858CB3]">
            BunkWise uses this to calculate how many classes you can safely skip.
          </Text>
        </View>
      </View>
    </View>
  );
}

type SubjectModalProps = {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, courseCode: string) => void;
};

function SubjectModal({ visible, onClose, onAdd }: SubjectModalProps) {
  const [name, setName] = useState("");
  const [courseCode, setCourseCode] = useState("");

  const submit = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), courseCode.trim() || `SUB${Date.now().toString().slice(-3)}`);
    setName("");
    setCourseCode("");
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-end bg-black/70">
          <View className="rounded-t-[28px] bg-[#151722] px-6 pb-10 pt-6">
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="font-jakarta-bold text-[22px] text-white">Add Subject</Text>
              <TouchableOpacity accessibilityLabel="Close" onPress={onClose}>
                <Ionicons color="#AEB4D5" name="close" size={28} />
              </TouchableOpacity>
            </View>
            <View className="gap-4">
              <WizardField label="Subject Name" onChangeText={setName} placeholder="e.g. Computer Networks" value={name} />
              <WizardField label="Course Code" onChangeText={setCourseCode} placeholder="e.g. CS207" value={courseCode} />
              <TouchableOpacity className="setup-primary-button mt-2" onPress={submit}>
                <Text className="font-jakarta-bold text-[17px] text-white">Add Subject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function SubjectsStep({ draft, setDraft }: DraftStepProps) {
  const [isAdding, setIsAdding] = useState(false);

  const removeSubject = (subjectId: string) => {
    setDraft((current) => ({
      ...current,
      subjects: current.subjects.filter((subject) => subject.id !== subjectId),
      weeklySchedule: Object.fromEntries(
        DAY_ORDER.map((day) => [
          day,
          current.weeklySchedule[day].filter((slot) => slot.subjectId !== subjectId),
        ]),
      ) as WeeklySchedule,
    }));
  };

  const addSubject = (name: string, courseCode: string) => {
    setDraft((current) => ({
      ...current,
      subjects: [
        ...current.subjects,
        {
          id: `subject-${Date.now()}`,
          semesterId: current.semester.id,
          name,
          courseCode,
          minimumAttendancePercentage: current.minimumAttendancePercentage,
        },
      ],
    }));
    setIsAdding(false);
  };

  return (
    <>
      <View className="gap-5">
        <WizardHeading
          subtitle="Add all subjects you're enrolled in this semester."
          title="Add Subjects"
        />
        <View className="gap-3">
          {draft.subjects.map((subject, index) => (
            <View className="setup-card min-h-[82px] flex-row items-center px-4" key={subject.id}>
              <Ionicons color="#777FA7" name="grid" size={17} />
              <View
                className="ml-4 h-4 w-4 rounded-full"
                style={{ backgroundColor: SUBJECT_COLORS[index % SUBJECT_COLORS.length] }}
              />
              <View className="ml-4 flex-1">
                <Text className="font-jakarta-semibold text-[17px] leading-6 text-[#F7F7FB]">
                  {subject.name}
                </Text>
                <Text className="font-jakarta-regular text-[13px] leading-5 text-[#858CB3]">
                  {subject.courseCode}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityLabel={`Remove ${subject.name}`}
                accessibilityRole="button"
                activeOpacity={0.75}
                className="h-11 w-11 items-center justify-center rounded-[15px] bg-[#351728]"
                onPress={() => removeSubject(subject.id)}
              >
                <Ionicons color="#FF5079" name="close" size={23} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.75}
            className="h-[62px] flex-row items-center justify-center gap-3 rounded-[18px] border border-dashed border-[#4540A0]"
            onPress={() => setIsAdding(true)}
          >
            <Ionicons color="#7B76FF" name="add" size={25} />
            <Text className="font-jakarta-semibold text-[17px] text-[#7B76FF]">Add Subject</Text>
          </TouchableOpacity>
        </View>
      </View>
      <SubjectModal onAdd={addSubject} onClose={() => setIsAdding(false)} visible={isAdding} />
    </>
  );
}

type SlotModalProps = {
  day: DayOfWeek;
  existingSlots: ScheduleSlot[];
  subjects: Subject[];
  visible: boolean;
  onClose: () => void;
  onAdd: (slot: ScheduleSlot) => void;
};

type TimeControlProps = {
  label: string;
  value: ScheduleSlot["startTime"];
  onChange: (value: ScheduleSlot["startTime"]) => void;
};

type TimeWheelProps = {
  accessibilityLabel: string;
  options: string[];
  selectedValue: string;
  unit: string;
  onValueChange: (value: string) => void;
};

function TimeWheel({
  accessibilityLabel,
  options,
  selectedValue,
  unit,
  onValueChange,
}: TimeWheelProps) {
  const androidWheelRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(options.indexOf(selectedValue), 0);
  const androidRowHeight = 40;

  useEffect(() => {
    if (process.env.EXPO_OS !== "android") return;

    androidWheelRef.current?.scrollTo({
      animated: false,
      y: selectedIndex * androidRowHeight,
    });
  }, [selectedIndex]);

  return (
    <View
      style={{
        alignItems: "center",
        flexDirection: "row",
        flexGrow: 0,
        flexShrink: 0,
        height: 200,
        justifyContent: "center",
        overflow: "hidden",
        width: "50%",
      }}
    >
      {process.env.EXPO_OS === "android" ? (
        <ScrollView
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="adjustable"
          contentContainerStyle={{ paddingVertical: 80 }}
          contentOffset={{ x: 0, y: selectedIndex * androidRowHeight }}
          decelerationRate="fast"
          nestedScrollEnabled
          onMomentumScrollEnd={(event) => {
            const nextIndex = Math.max(
              0,
              Math.min(options.length - 1, Math.round(event.nativeEvent.contentOffset.y / androidRowHeight)),
            );
            onValueChange(options[nextIndex]);
          }}
          overScrollMode="never"
          ref={androidWheelRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={androidRowHeight}
          style={{ flexGrow: 0, flexShrink: 0, height: 200, width: 104 }}
        >
          {options.map((option) => (
            <TouchableOpacity
              activeOpacity={0.75}
              key={option}
              onPress={() => {
                const nextIndex = options.indexOf(option);
                androidWheelRef.current?.scrollTo({
                  animated: true,
                  y: nextIndex * androidRowHeight,
                });
                onValueChange(option);
              }}
              style={{ alignItems: "center", height: androidRowHeight, justifyContent: "center" }}
            >
              <Text
                className={
                  option === selectedValue
                    ? "font-jakarta-bold text-[29px] text-[#F8F8FC]"
                    : "font-jakarta-bold text-[25px] text-[#777D9B]"
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
            color: "#F8F8FC",
            fontFamily: "PlusJakartaSans-Bold",
            fontSize: 29,
            fontVariant: ["tabular-nums"],
          }}
          mode="dialog"
          numberOfLines={1}
          onValueChange={(nextValue) => onValueChange(String(nextValue))}
          selectedValue={selectedValue}
          selectionColor="transparent"
          style={{
            color: "#F8F8FC",
            flexGrow: 0,
            flexShrink: 0,
            height: 200,
            width: 104,
          }}
        >
          {options.map((option) => (
            <Picker.Item
              color="#F8F8FC"
              fontFamily="PlusJakartaSans-Bold"
              key={option}
              label={option}
              style={{ backgroundColor: "transparent", color: "#F8F8FC", fontSize: 29 }}
              value={option}
            />
          ))}
        </Picker>
      )}
      <Text
        className="w-8 font-jakarta-semibold text-[12px] text-[#9096B2]"
        numberOfLines={1}
      >
        {unit}
      </Text>
    </View>
  );
}

function TimeControl({ label, value, onChange }: TimeControlProps) {
  const [hours = "00", minutes = "00"] = value.split(":");
  const lastSelectedValue = useRef(value);

  useEffect(() => {
    lastSelectedValue.current = value;
  }, [value]);

  const updateTime = (nextHours: string, nextMinutes: string) => {
    const nextValue = `${nextHours}:${nextMinutes}` as ScheduleSlot["startTime"];

    if (nextValue === lastSelectedValue.current) return;

    lastSelectedValue.current = nextValue;
    onChange(nextValue);
    void Haptics.selectionAsync().catch(() => undefined);
  };

  return (
    <View style={{ flexGrow: 0, flexShrink: 0, height: 200, width: "100%" }}>
      <View
        className="relative overflow-hidden rounded-[20px] border border-[#323443] bg-[#181925]"
        style={{ flexGrow: 0, flexShrink: 0, height: 200 }}
      >
        <View
          style={{
            alignItems: "center",
            flexDirection: "row",
            flexGrow: 0,
            flexShrink: 0,
            height: 200,
            justifyContent: "center",
            overflow: "hidden",
            width: "100%",
            zIndex: 1,
          }}
        >
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

        {/* The native iOS drum supplies perspective; these overlays soften its outer rows. */}
        <View
          className="absolute left-0 right-0 top-0 h-[38px] bg-[#181925]/90"
          pointerEvents="none"
          style={{ zIndex: 2 }}
        />
        <View
          className="absolute left-0 right-0 top-[38px] h-[28px] bg-[#181925]/45"
          pointerEvents="none"
          style={{ zIndex: 2 }}
        />
        <View
          className="absolute bottom-[38px] left-0 right-0 h-[28px] bg-[#181925]/45"
          pointerEvents="none"
          style={{ zIndex: 2 }}
        />
        <View
          className="absolute bottom-0 left-0 right-0 h-[38px] bg-[#181925]/90"
          pointerEvents="none"
          style={{ zIndex: 2 }}
        />
      </View>
    </View>
  );
}

type TimeRangeControlProps = {
  endTime: ScheduleSlot["endTime"];
  startTime: ScheduleSlot["startTime"];
  onEndTimeChange: (value: ScheduleSlot["endTime"]) => void;
  onStartTimeChange: (value: ScheduleSlot["startTime"]) => void;
};

function TimeRangeControl({
  endTime,
  startTime,
  onEndTimeChange,
  onStartTimeChange,
}: TimeRangeControlProps) {
  const [activeTime, setActiveTime] = useState<"start" | "end">("start");
  const isEditingStart = activeTime === "start";

  return (
    <View className="gap-3">
      <View className="flex-row gap-2 rounded-[18px] bg-[#1B1D29] p-1.5">
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: isEditingStart }}
          activeOpacity={0.8}
          className={`flex-1 rounded-[14px] px-4 py-3 ${isEditingStart ? "bg-[#6964FF]" : "bg-transparent"}`}
          onPress={() => setActiveTime("start")}
        >
          <Text
            className={`font-jakarta-medium text-[12px] ${isEditingStart ? "text-white/80" : "text-[#858CAB]"}`}
          >
            Start
          </Text>
          <Text className="pt-0.5 font-jakarta-bold text-[17px] text-white">
            {formatTime(startTime)}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityState={{ selected: !isEditingStart }}
          activeOpacity={0.8}
          className={`flex-1 rounded-[14px] px-4 py-3 ${isEditingStart ? "bg-transparent" : "bg-[#6964FF]"}`}
          onPress={() => setActiveTime("end")}
        >
          <Text
            className={`font-jakarta-medium text-[12px] ${isEditingStart ? "text-[#858CAB]" : "text-white/80"}`}
          >
            End
          </Text>
          <Text className="pt-0.5 font-jakarta-bold text-[17px] text-white">
            {formatTime(endTime)}
          </Text>
        </TouchableOpacity>
      </View>

      <TimeControl
        key={activeTime}
        label={isEditingStart ? "Start" : "End"}
        onChange={isEditingStart ? onStartTimeChange : onEndTimeChange}
        value={isEditingStart ? startTime : endTime}
      />
    </View>
  );
}

function SlotModal({ day, existingSlots, subjects, visible, onClose, onAdd }: SlotModalProps) {
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [startTime, setStartTime] = useState<ScheduleSlot["startTime"]>("09:00");
  const [endTime, setEndTime] = useState<ScheduleSlot["endTime"]>("10:00");
  const [room, setRoom] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!subjects.some((subject) => subject.id === subjectId)) {
      setSubjectId(subjects[0]?.id ?? "");
    }
  }, [subjectId, subjects]);

  const submit = () => {
    if (!subjectId) return;
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
      setValidationError("End time must be later than start time.");
      return;
    }

    const slot: ScheduleSlot = {
      id: `slot-${day}-${Date.now()}`,
      subjectId,
      startTime,
      endTime,
      room: room.trim(),
    };
    if (existingSlots.some((existingSlot) => slotsOverlap(existingSlot, slot))) {
      setValidationError("This time overlaps another class scheduled for this day.");
      return;
    }

    onAdd(slot);
    setRoom("");
    setValidationError(null);
  };

  const close = () => {
    setValidationError(null);
    onClose();
  };

  return (
    <Modal animationType="fade" onRequestClose={close} transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-end bg-black/70">
          <View className="rounded-t-[28px] bg-[#151722] px-6 pb-10 pt-6">
            <View className="mb-5 flex-row items-center justify-between">
              <Text className="font-jakarta-bold text-[22px] text-white">Add {DAY_LABELS[day]} Slot</Text>
              <TouchableOpacity accessibilityLabel="Close" onPress={close}>
                <Ionicons color="#AEB4D5" name="close" size={28} />
              </TouchableOpacity>
            </View>
            <Text className="mb-2 font-jakarta-semibold text-[15px] text-[#AEB4D5]">Subject</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2 pb-5">
                {subjects.map((subject) => (
                  <TouchableOpacity
                    className={`rounded-xl px-4 py-3 ${subject.id === subjectId ? "bg-[#6964FF]" : "bg-[#242634]"}`}
                    key={subject.id}
                    onPress={() => {
                      setSubjectId(subject.id);
                      setValidationError(null);
                    }}
                  >
                    <Text className="font-jakarta-semibold text-[13px] text-white">{subject.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <TimeRangeControl
              endTime={endTime}
              onEndTimeChange={(value) => {
                setEndTime(value);
                setValidationError(null);
              }}
              onStartTimeChange={(value) => {
                setStartTime(value);
                setValidationError(null);
              }}
              startTime={startTime}
            />
            <View className="mt-4"><WizardField label="Room (optional)" onChangeText={setRoom} placeholder="e.g. C-204" value={room} /></View>
            {validationError ? (
              <Animated.Text
                className="mt-3 font-jakarta-medium text-[13px] leading-5 text-[#FF728F]"
                entering={FadeInUp.duration(180)}
              >
                {validationError}
              </Animated.Text>
            ) : null}
            <TouchableOpacity className="setup-primary-button mt-6" onPress={submit}>
              <Text className="font-jakarta-bold text-[17px] text-white">Add Slot</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function TimetableStep({ draft, setDraft }: DraftStepProps) {
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>("monday");
  const [isAdding, setIsAdding] = useState(false);
  const slots = draft.weeklySchedule[selectedDay];

  const removeSlot = (slotId: string) => {
    setDraft((current) => ({
      ...current,
      weeklySchedule: {
        ...current.weeklySchedule,
        [selectedDay]: current.weeklySchedule[selectedDay].filter((slot) => slot.id !== slotId),
      },
    }));
  };

  const addSlot = (slot: ScheduleSlot) => {
    setDraft((current) => ({
      ...current,
      weeklySchedule: {
        ...current.weeklySchedule,
        [selectedDay]: [...current.weeklySchedule[selectedDay], slot],
      },
    }));
    setIsAdding(false);
  };

  return (
    <>
      <View className="gap-4">
        <WizardHeading
          subtitle="Assign subjects to weekly slots so attendance auto-populates."
          title="Build Timetable"
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {DAY_ORDER.slice(0, 5).map((day) => (
              <TouchableOpacity
                className={`h-11 min-w-[74px] items-center justify-center rounded-[14px] px-3 ${selectedDay === day ? "bg-[#5E5CFF]" : "bg-[#181A27]"}`}
                key={day}
                onPress={() => setSelectedDay(day)}
              >
                <Text className={`font-jakarta-semibold text-[15px] ${selectedDay === day ? "text-white" : "text-[#7D83A8]"}`}>
                  {TIMETABLE_DAY_LABELS[day]} {draft.weeklySchedule[day].length}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <View className="gap-3 pt-1">
          {slots.map((slot) => {
            const subject = draft.subjects.find((item) => item.id === slot.subjectId);
            const subjectIndex = Math.max(0, draft.subjects.findIndex((item) => item.id === slot.subjectId));
            return (
              <View className="setup-card min-h-[86px] flex-row items-center px-4" key={slot.id}>
                <View className="h-[54px] w-[5px] rounded-full" style={{ backgroundColor: SUBJECT_COLORS[subjectIndex % SUBJECT_COLORS.length] }} />
                <View className="ml-4 flex-1">
                  <Text className="font-jakarta-semibold text-[17px] leading-6 text-white">{subject?.name ?? "Unknown subject"}</Text>
                  <Text className="font-jakarta-regular text-[14px] leading-5 text-[#858CB3]">
                    {formatTime(slot.startTime)}–{formatTime(slot.endTime)}
                  </Text>
                </View>
                <TouchableOpacity
                  accessibilityLabel="Remove timetable slot"
                  className="h-11 w-11 items-center justify-center rounded-[15px] bg-[#351728]"
                  onPress={() => removeSlot(slot.id)}
                >
                  <Ionicons color="#FF5079" name="close" size={23} />
                </TouchableOpacity>
              </View>
            );
          })}
          <TouchableOpacity
            accessibilityRole="button"
            className="h-[62px] flex-row items-center justify-center gap-3 rounded-[18px] border border-dashed border-[#4540A0]"
            disabled={draft.subjects.length === 0}
            onPress={() => setIsAdding(true)}
            style={{ opacity: draft.subjects.length === 0 ? 0.45 : 1 }}
          >
            <Ionicons color="#7B76FF" name="add" size={25} />
            <Text className="font-jakarta-semibold text-[17px] text-[#7B76FF]">Add Slot</Text>
          </TouchableOpacity>
        </View>
      </View>
      <SlotModal
        day={selectedDay}
        existingSlots={slots}
        onAdd={addSlot}
        onClose={() => setIsAdding(false)}
        subjects={draft.subjects}
        visible={isAdding}
      />
    </>
  );
}

function Calendar({ draft, setDraft }: DraftStepProps) {
  const initialDate = parseDate(draft.semester.startDate) ?? new Date();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(initialDate.getFullYear(), initialDate.getMonth(), 1));
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const leadingCells = firstWeekday;
  const dayCount = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: leadingCells + dayCount }, (_, index) => index < leadingCells ? null : index - leadingCells + 1);
  const selectedDates = new Set(draft.semester.holidays.map((holiday) => holiday.startDate));

  const toggleHoliday = (day: number) => {
    const date = toDateString(year, month, day);
    setDraft((current) => {
      const exists = current.semester.holidays.some((holiday) => holiday.startDate === date);
      return {
        ...current,
        semester: {
          ...current.semester,
          holidays: exists
            ? current.semester.holidays.filter((holiday) => holiday.startDate !== date)
            : [...current.semester.holidays, { id: `holiday-${date}`, name: "Holiday", startDate: date, endDate: date }],
        },
      };
    });
  };

  return (
    <View className="rounded-[18px] bg-[#202A3D] px-4 pb-4 pt-4">
      <View className="flex-row items-center justify-between px-1">
        <TouchableOpacity accessibilityLabel="Previous month" onPress={() => setVisibleMonth(new Date(year, month - 1, 1))}>
          <Ionicons color="#B8BED7" name="chevron-back" size={23} />
        </TouchableOpacity>
        <Text className="font-jakarta-semibold text-[16px] text-[#C5C9DF]">
          {visibleMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </Text>
        <TouchableOpacity accessibilityLabel="Next month" onPress={() => setVisibleMonth(new Date(year, month + 1, 1))}>
          <Ionicons color="#B8BED7" name="chevron-forward" size={23} />
        </TouchableOpacity>
      </View>
      <View className="mt-4 flex-row">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <Text className="flex-1 text-center font-jakarta-medium text-[12px] text-[#AEB4CD]" key={day}>{day}</Text>
        ))}
      </View>
      <View className="mt-2 flex-row flex-wrap">
        {cells.map((day, index) => {
          if (day === null) return <View className="h-10 w-[14.285%]" key={`empty-${index}`} />;
          const date = toDateString(year, month, day);
          const isSelected = selectedDates.has(date);
          const weekday = new Date(year, month, day).getDay();
          return (
            <TouchableOpacity
              accessibilityLabel={`${date}${isSelected ? ", selected holiday" : ""}`}
              className="h-10 w-[14.285%] items-center justify-center"
              key={date}
              onPress={() => toggleHoliday(day)}
            >
              <View className={`h-8 w-8 items-center justify-center rounded-full ${isSelected ? "border-2 border-[#B6B4FF] bg-[#716DFF]" : ""}`}>
                <Text className={`font-jakarta-medium text-[13px] ${isSelected ? "text-white" : weekday === 0 || weekday === 6 ? "text-[#D58F8C]" : "text-[#BAC0D8]"}`}>{day}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
      <View className="mt-3 flex-row items-center justify-center gap-2">
        <View className="h-3 w-3 rounded-full bg-[#7772FF]" />
        <Text className="font-jakarta-regular text-[12px] text-[#AFB5CD]">Selected Holiday</Text>
      </View>
    </View>
  );
}

function HolidaysStep({ draft, setDraft }: DraftStepProps) {
  const toggleWorkingDay = (day: DayOfWeek) => {
    setDraft((current) => ({
      ...current,
      regularWorkingDays: current.regularWorkingDays.includes(day)
        ? current.regularWorkingDays.filter((item) => item !== day)
        : [...current.regularWorkingDays, day],
    }));
  };

  return (
    <View className="gap-5">
      <View className="items-center gap-2">
        <Text className="text-center font-jakarta-bold text-[25px] leading-8 text-[#BEBBFF]">
          Holidays & Working Days
        </Text>
        <Text className="text-center font-jakarta-regular text-[14px] leading-5 text-[#A3A9C5]">
          Tap dates to mark holidays and select your regular{"\n"}working days below.
        </Text>
      </View>
      <Calendar draft={draft} setDraft={setDraft} />
      <View className="gap-3 pt-1">
        <Text className="font-jakarta-semibold text-[15px] text-[#B9BED8]">Regular Working Days</Text>
        <View className="flex-row flex-wrap gap-3">
          {DAY_ORDER.map((day) => {
            const selected = draft.regularWorkingDays.includes(day);
            return (
              <TouchableOpacity
                accessibilityState={{ selected }}
                className={`h-12 items-center justify-center rounded-[10px] ${selected ? "bg-[#7B78F7]" : "bg-[#222A3C]"}`}
                key={day}
                onPress={() => toggleWorkingDay(day)}
                style={{ width: "30.5%" }}
              >
                <Text className={`font-jakarta-semibold text-[14px] ${selected ? "text-[#181B72]" : "text-[#B6BCD3]"}`}>{DAY_LABELS[day]}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function FinishedStep({ draft }: { draft: SetupDraft }) {
  const { userId } = useAuth();
  const completeSetup = useSemesterSetupStore((state) => state.completeSetup);

  const goToDashboard = () => {
    if (!userId) return;

    completeSetup(userId, draft);
  };

  return (
    <ScrollView
      className="bg-[#070914]"
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 28, paddingVertical: 40 }}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      <Animated.View className="items-center" entering={ZoomIn.duration(420).springify()}>
        <View className="h-[96px] w-[96px] items-center justify-center rounded-full border-[3px] border-[#10C893] bg-[#0C3934]">
          <Ionicons color="#12D7A0" name="checkmark" size={52} />
        </View>
        <Text className="mt-8 text-center font-jakarta-bold text-[30px] leading-10 text-white">{"You're all set!"}</Text>
        <Text className="mt-2 text-center font-jakarta-regular text-[16px] leading-6 text-[#858CB3]">
          {draft.semester.name} · {draft.subjects.length} subjects · {draft.minimumAttendancePercentage}% target
        </Text>
        <View className="setup-card mt-7 w-full gap-4 px-5 py-5">
          {draft.subjects.map((subject, index) => (
            <View className="flex-row items-center gap-3" key={subject.id}>
              <View className="h-3 w-3 rounded-full" style={{ backgroundColor: SUBJECT_COLORS[index % SUBJECT_COLORS.length] }} />
              <Text className="flex-1 font-jakarta-regular text-[16px] leading-6 text-[#B6BCD9]">{subject.name}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity className="setup-primary-button mt-8 w-full" onPress={goToDashboard}>
          <Text className="font-jakarta-bold text-[18px] text-white">Go to Dashboard</Text>
        </TouchableOpacity>
      </Animated.View>
    </ScrollView>
  );
}

type DraftStepProps = {
  draft: SetupDraft;
  setDraft: React.Dispatch<React.SetStateAction<SetupDraft>>;
};

export function SetupWizardScreen() {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>(1);
  const [draft, setDraft] = useState<SetupDraft>(initialDraft);

  const canContinue = useMemo(() => {
    if (step === 1) {
      return Boolean(draft.semester.name.trim() && draft.academicYear.trim() && parseDate(draft.semester.startDate) && parseDate(draft.semester.endDate));
    }
    if (step === 3) return draft.subjects.length > 0;
    return true;
  }, [draft, step]);

  const goBack = () => {
    if (typeof step === "number" && step > 1) setStep((step - 1) as WizardStep);
    else if (router.canGoBack()) router.back();
  };

  const continueWizard = () => {
    if (!canContinue || typeof step !== "number") return;
    if (step === 5) {
      setDraft((current) => ({
        ...current,
        semester: {
          ...current.semester,
          totalWeeks: calculateWeeks(current.semester.startDate, current.semester.endDate),
        },
      }));
      setStep("finished");
      return;
    }
    setStep((step + 1) as WizardStep);
  };

  if (step === "finished") {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: BACKGROUND }}>
        <StatusBar style="light" />
        <FinishedStep draft={draft} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: BACKGROUND }}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View className="flex-1 bg-[#070914]">
          <ScrollView
            alwaysBounceVertical
            bounces
            contentContainerStyle={{
              flexGrow: 1,
              paddingBottom: 48,
              paddingHorizontal: 24,
            }}
            contentInsetAdjustmentBehavior="automatic"
            decelerationRate="normal"
            keyboardDismissMode={process.env.EXPO_OS === "ios" ? "interactive" : "on-drag"}
            keyboardShouldPersistTaps="handled"
            overScrollMode="always"
            showsVerticalScrollIndicator={false}
          >
          {step === 5 ? (
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                accessibilityLabel="Go back"
                accessibilityRole="button"
                className="h-12 w-12 items-center justify-center rounded-full bg-[#222A3D]"
                onPress={goBack}
              >
                <Ionicons color="#B8BED7" name="arrow-back" size={24} />
              </TouchableOpacity>
              <Text className="font-jakarta-semibold text-[13px] tracking-[2px] text-[#B9BED5]">
                STEP 5 OF 5
              </Text>
              <View className="h-12 w-12" />
            </View>
          ) : (
            <>
              <BackButton onPress={goBack} />
              <WizardProgress step={step} />
            </>
          )}
          <View className={step === 5 ? "pt-5" : "pt-9"}>
            {step === 1 ? <SemesterBasics draft={draft} setDraft={setDraft} /> : null}
            {step === 2 ? <Requirement draft={draft} setDraft={setDraft} /> : null}
            {step === 3 ? <SubjectsStep draft={draft} setDraft={setDraft} /> : null}
            {step === 4 ? <TimetableStep draft={draft} setDraft={setDraft} /> : null}
            {step === 5 ? <HolidaysStep draft={draft} setDraft={setDraft} /> : null}
          </View>
          </ScrollView>
          <View className="border-t border-[#232530] px-6 pb-3 pt-4">
          {step === 3 ? (
            <Text className="pb-3 text-center font-jakarta-regular text-[13px] text-[#8188AD]">
              {draft.subjects.length} {draft.subjects.length === 1 ? "subject" : "subjects"} added
            </Text>
          ) : null}
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ disabled: !canContinue }}
            activeOpacity={0.82}
            className="setup-primary-button"
            disabled={!canContinue}
            onPress={continueWizard}
            style={{ opacity: canContinue ? 1 : 0.45 }}
          >
            <Text className="font-jakarta-bold text-[19px] text-white">
              {step === 5 ? "Finish Setup" : "Continue"}
            </Text>
          </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
