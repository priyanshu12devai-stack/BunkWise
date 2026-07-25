import { useUser } from "@clerk/expo";
import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import {
  BarChart3,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react-native";
import { useMemo, useRef, useState } from "react";
import {
  type GestureResponderEvent,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeInDown, LinearTransition } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

import {
  calculateSubjectAttendanceForecast,
  calculateWeightedAttendance,
  createAttendanceTimeline,
  formatAttendancePercentage,
  type AttendanceTimelinePoint,
  type SubjectAttendanceForecast,
} from "@/lib/analytics";
import { useAttendanceStore } from "@/store/attendance-store";
import type {
  AttendanceLog,
  DateString,
  Subject,
} from "@/types/attendance";

const SUBJECT_COLOR_PALETTE = [
  "#3B82F6",
  "#A855F7",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
  "#F97316",
  "#84CC16",
] as const;

const PERIODS = [
  { label: "This Month", value: "month" },
  { label: "Semester", value: "semester" },
  { label: "All Time", value: "all" },
] as const;

type AnalyticsPeriod = (typeof PERIODS)[number]["value"];

type MonthTrend = {
  key: string;
  label: string;
  percentage: number;
  total: number;
};

type SubjectAnalytics = {
  color: string;
  forecast: SubjectAttendanceForecast;
  subject: Subject;
  timeline: AttendanceTimelinePoint[];
  trends: MonthTrend[];
};

type InteractivePoint = {
  index: number;
  label: string;
  percentage: number;
  x: number;
  y: number;
};

function getSubjectColor(subject: Subject, index: number) {
  const normalizedName = subject.name.toLowerCase();

  if (normalizedName.includes("data structure")) return "#3B82F6";
  if (normalizedName.includes("web")) return "#10B981";
  if (normalizedName.includes("physics")) return "#A855F7";
  if (
    normalizedName.includes("discrete") ||
    normalizedName.includes("mathematics")
  ) {
    return "#F59E0B";
  }
  if (
    normalizedName.includes("database") ||
    normalizedName.includes("dbms")
  ) {
    return "#EC4899";
  }

  return SUBJECT_COLOR_PALETTE[index % SUBJECT_COLOR_PALETTE.length];
}

function triggerMilestoneHaptic() {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
    () => undefined,
  );
}

function formatTimelineDate(date: DateString) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00`));
}

function formatStatus(status: AttendanceLog["status"]) {
  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
}

function getMonthKey(date: DateString | Date) {
  if (date instanceof Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  return date.slice(0, 7);
}

function getThisMonthStart(): DateString {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01` as DateString;
}

function getFilteredLogs(
  logs: AttendanceLog[],
  period: AnalyticsPeriod,
  semesterId?: string,
  semesterStart?: DateString,
) {
  if (period === "month") {
    const monthStart = getThisMonthStart();
    return logs.filter((log) => log.date >= monthStart);
  }

  if (period === "semester") {
    return logs.filter(
      (log) =>
        (!semesterId || log.semesterId === semesterId) &&
        (!semesterStart || log.date >= semesterStart),
    );
  }

  return logs;
}

function createMonthTrend(
  logs: AttendanceLog[],
  semesterStart?: DateString,
): MonthTrend[] {
  const today = new Date();
  const fallbackStart = new Date(today.getFullYear(), today.getMonth() - 5, 1);
  const configuredStart = semesterStart
    ? new Date(`${semesterStart}T12:00:00`)
    : fallbackStart;
  const start =
    configuredStart <= today && configuredStart >= fallbackStart
      ? configuredStart
      : fallbackStart;
  const monthCursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const trends: MonthTrend[] = [];

  while (monthCursor <= today && trends.length < 6) {
    const key = getMonthKey(monthCursor);
    const monthLogs = logs.filter((log) => log.date.startsWith(key));
    const summary = calculateWeightedAttendance(monthLogs);

    trends.push({
      key,
      label: new Intl.DateTimeFormat("en-US", { month: "short" }).format(
        monthCursor,
      ),
      percentage: summary.percentage,
      total: summary.total,
    });
    monthCursor.setMonth(monthCursor.getMonth() + 1);
  }

  return trends;
}

function MultiSubjectTrendChart({
  subjects,
  targetPercentage,
  trends,
}: {
  subjects: SubjectAnalytics[];
  targetPercentage: number;
  trends: MonthTrend[];
}) {
  const { width: windowWidth } = useWindowDimensions();
  const [selectedPoint, setSelectedPoint] = useState<
    (InteractivePoint & { color: string; subjectName: string }) | null
  >(null);
  const selectedMilestoneRef = useRef<string | null>(null);
  const touchStartRef = useRef<{ pageX: number; pageY: number } | null>(null);
  const chartWidth = Math.max(236, Math.min(520, windowWidth - 92));
  const chartHeight = 166;
  const plotLeft = 36;
  const plotRight = chartWidth - 6;
  const plotTop = 10;
  const plotBottom = 122;
  const plotHeight = plotBottom - plotTop;
  const getX = (index: number) =>
    plotLeft +
    (index / Math.max(1, trends.length - 1)) * (plotRight - plotLeft);
  const getY = (percentage: number) =>
    plotTop + ((100 - Math.min(100, Math.max(0, percentage))) / 100) * plotHeight;
  const targetY =
    plotTop +
    ((100 - Math.min(100, Math.max(0, targetPercentage))) / 100) * plotHeight;
  const riskRatio = subjects.length
    ? subjects.filter((item) => !item.forecast.isOnTrack).length /
      subjects.length
    : 0;

  const selectNearestPoint = (event: GestureResponderEvent) => {
    if (!trends.length) return;

    const { locationX, locationY } = event.nativeEvent;
    const monthIndex = Math.min(
      trends.length - 1,
      Math.max(
        0,
        Math.round(
          ((locationX - plotLeft) / Math.max(1, plotRight - plotLeft)) *
            (trends.length - 1),
        ),
      ),
    );
    const candidates = subjects.flatMap((item) => {
      const trend = item.trends[monthIndex];
      if (!trend || trend.total === 0) return [];

      return [
        {
          color: item.color,
          index: monthIndex,
          label: trend.label,
          percentage: trend.percentage,
          subjectId: item.subject.id,
          subjectName: item.subject.name,
          x: getX(monthIndex),
          y: getY(trend.percentage),
        },
      ];
    });
    const closest = candidates.sort(
      (first, second) =>
        Math.abs(first.y - locationY) - Math.abs(second.y - locationY),
    )[0];
    if (!closest) return;

    const milestone = `${closest.subjectId}-${trends[monthIndex].key}`;
    if (selectedMilestoneRef.current !== milestone) {
      selectedMilestoneRef.current = milestone;
      triggerMilestoneHaptic();
    }
    setSelectedPoint(closest);
  };
  const trackTouchStart = (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    touchStartRef.current = { pageX, pageY };
    return false;
  };
  const shouldClaimHorizontalGesture = (event: GestureResponderEvent) => {
    const start = touchStartRef.current;
    if (!start) return false;

    const { pageX, pageY } = event.nativeEvent;
    return Math.abs(pageX - start.pageX) > Math.abs(pageY - start.pageY);
  };

  return (
    <View className="gap-3">
      <View
        accessibilityHint="Tap or drag across the chart to inspect a subject"
        accessibilityLabel="Interactive monthly attendance trends by subject"
        accessibilityRole="adjustable"
        onMoveShouldSetResponder={shouldClaimHorizontalGesture}
        onResponderGrant={selectNearestPoint}
        onResponderMove={selectNearestPoint}
        onResponderTerminationRequest={() => true}
        onStartShouldSetResponder={trackTouchStart}
      >
        <Svg height={chartHeight} width={chartWidth}>
          <Defs>
            <LinearGradient id="dangerGlow" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor="#FF5079" stopOpacity="0.03" />
              <Stop
                offset="1"
                stopColor="#FF5079"
                stopOpacity={0.08 + riskRatio * 0.14}
              />
            </LinearGradient>
          </Defs>
          <Rect
            fill="url(#dangerGlow)"
            height={Math.max(0, plotBottom - targetY)}
            width={plotRight - plotLeft}
            x={plotLeft}
            y={targetY}
          />
          {[100, 50, 0].map((value) => {
            const y = getY(value);

            return (
              <Line
                key={value}
                stroke="#292B36"
                strokeWidth={1}
                x1={plotLeft}
                x2={plotRight}
                y1={y}
                y2={y}
              />
            );
          })}
          <Line
            stroke="#F59E0B"
            strokeDasharray="6 5"
            strokeOpacity={0.75}
            strokeWidth={1.5}
            x1={plotLeft}
            x2={plotRight}
            y1={targetY}
            y2={targetY}
          />
          {subjects.map((item) => {
            const points = item.trends.flatMap((trend, index) =>
              trend.total > 0
                ? [
                    {
                      x: getX(index),
                      y: getY(trend.percentage),
                    },
                  ]
                : [],
            );
            const path = points
              .map(
                (point, index) =>
                  `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
              )
              .join(" ");

            return (
              <G key={item.subject.id}>
                {path ? (
                  <Path
                    d={path}
                    fill="none"
                    stroke={item.color}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                  />
                ) : null}
                {points.map((point, index) => (
                  <Circle
                    cx={point.x}
                    cy={point.y}
                    fill="#14151F"
                    key={`${item.subject.id}-${index}`}
                    r={3.5}
                    stroke={item.color}
                    strokeWidth={2}
                  />
                ))}
              </G>
            );
          })}
          {selectedPoint ? (
            <>
              <Line
                stroke={selectedPoint.color}
                strokeOpacity={0.48}
                strokeWidth={1}
                x1={selectedPoint.x}
                x2={selectedPoint.x}
                y1={plotTop}
                y2={plotBottom}
              />
              <Circle
                cx={selectedPoint.x}
                cy={selectedPoint.y}
                fill={selectedPoint.color}
                r={6}
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            </>
          ) : null}
        </Svg>

        <View className="absolute left-0 top-0 h-[122px] justify-between">
          {[100, 50, 0].map((value) => (
            <Text
              className="font-jakarta-medium text-[10px] text-[#777D9E]"
              key={value}
            >
              {value}
            </Text>
          ))}
        </View>

        <View className="absolute bottom-[10px] left-9 right-1 flex-row justify-between">
          {trends.map((trend) => (
            <Text
              className="font-jakarta-medium text-[10px] text-[#777D9E]"
              key={trend.key}
            >
              {trend.label}
            </Text>
          ))}
        </View>

        {selectedPoint ? (
          <View
            className="absolute rounded-xl border border-zinc-800 bg-zinc-900/90 px-2 py-1"
            pointerEvents="none"
            style={{
              left: Math.min(
                chartWidth - 170,
                Math.max(4, selectedPoint.x - 76),
              ),
              top: Math.max(2, selectedPoint.y - 42),
            }}
          >
            <Text
              className="font-jakarta-semibold text-xs text-white"
              numberOfLines={1}
            >
              {selectedPoint.subjectName} · {selectedPoint.label}:{" "}
              {formatAttendancePercentage(selectedPoint.percentage)}%
            </Text>
          </View>
        ) : null}
      </View>

      <View className="flex-row flex-wrap gap-x-4 gap-y-2 px-1">
        {subjects.map((item) => (
          <Link
            asChild
            href={{
              pathname: "/subject/[subjectId]",
              params: { subjectId: item.subject.id },
            }}
            key={item.subject.id}
          >
            <TouchableOpacity
              accessibilityLabel={`View ${item.subject.name}`}
              activeOpacity={0.65}
              className="flex-row items-center gap-1.5"
            >
              <View
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <Text
                className="max-w-[124px] font-jakarta-medium text-[10px] text-[#A2A4BA]"
                numberOfLines={1}
              >
                {item.subject.name}
              </Text>
            </TouchableOpacity>
          </Link>
        ))}
      </View>
    </View>
  );
}

function SubjectTimelineChart({
  color,
  subject,
  targetPercentage,
  timeline,
}: {
  color: string;
  subject: Subject;
  targetPercentage: number;
  timeline: AttendanceTimelinePoint[];
}) {
  const { width: windowWidth } = useWindowDimensions();
  const [selectedPoint, setSelectedPoint] = useState<InteractivePoint | null>(
    null,
  );
  const selectedMilestoneRef = useRef<string | null>(null);
  const touchStartRef = useRef<{ pageX: number; pageY: number } | null>(null);
  const chartWidth = Math.max(208, Math.min(460, windowWidth - 112));
  const chartHeight = 126;
  const plotTop = 8;
  const plotBottom = 94;
  const plotHeight = plotBottom - plotTop;
  const plotRight = chartWidth;
  const getX = (index: number) =>
    timeline.length === 1
      ? plotRight / 2
      : (index / Math.max(1, timeline.length - 1)) * plotRight;
  const getY = (percentage: number) =>
    plotTop + ((100 - Math.min(100, Math.max(0, percentage))) / 100) * plotHeight;
  const targetY = getY(targetPercentage);
  const points = timeline.map((point, index) => ({
    index,
    label: `${formatTimelineDate(point.date)}: ${formatStatus(point.status)}`,
    percentage: point.percentage,
    x: getX(index),
    y: getY(point.percentage),
  }));
  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`,
    )
    .join(" ");
  const visibleNodeStep = Math.max(1, Math.ceil(points.length / 24));
  const gradientId = `danger-${subject.id.replace(/[^a-zA-Z0-9]/g, "")}`;
  const latestPercentage = timeline.at(-1)?.percentage;
  const dangerGlowOpacity =
    latestPercentage === undefined
      ? 0.08
      : latestPercentage < targetPercentage
        ? 0.22
        : 0.1;

  const selectNearestPoint = (event: GestureResponderEvent) => {
    if (!points.length) return;

    const index = Math.min(
      points.length - 1,
      Math.max(
        0,
        Math.round(
          (event.nativeEvent.locationX / Math.max(1, plotRight)) *
            (points.length - 1),
        ),
      ),
    );
    const point = points[index];
    const milestone = timeline[index].id;

    if (selectedMilestoneRef.current !== milestone) {
      selectedMilestoneRef.current = milestone;
      triggerMilestoneHaptic();
    }
    setSelectedPoint(point);
  };
  const trackTouchStart = (event: GestureResponderEvent) => {
    const { pageX, pageY } = event.nativeEvent;
    touchStartRef.current = { pageX, pageY };
    return false;
  };
  const shouldClaimHorizontalGesture = (event: GestureResponderEvent) => {
    const start = touchStartRef.current;
    if (!start) return false;

    const { pageX, pageY } = event.nativeEvent;
    return Math.abs(pageX - start.pageX) > Math.abs(pageY - start.pageY);
  };

  return (
    <View
      accessibilityHint="Tap or drag to inspect chronological attendance entries"
      accessibilityLabel={`${subject.name} interactive attendance history`}
      accessibilityRole="adjustable"
      className="mt-4"
      onMoveShouldSetResponder={shouldClaimHorizontalGesture}
      onResponderGrant={selectNearestPoint}
      onResponderMove={selectNearestPoint}
      onResponderTerminationRequest={() => true}
      onStartShouldSetResponder={trackTouchStart}
    >
      <Svg height={chartHeight} width={chartWidth}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor="#FF5079" stopOpacity="0.03" />
            <Stop
              offset="1"
              stopColor="#FF5079"
              stopOpacity={dangerGlowOpacity}
            />
          </LinearGradient>
        </Defs>
        <Rect
          fill={`url(#${gradientId})`}
          height={Math.max(0, plotBottom - targetY)}
          width={plotRight}
          x={0}
          y={targetY}
        />
        {[100, 50, 0].map((value) => (
          <Line
            key={value}
            stroke="#2A2A2A"
            strokeWidth={1}
            x1={0}
            x2={plotRight}
            y1={getY(value)}
            y2={getY(value)}
          />
        ))}
        <Line
          stroke="#FFB020"
          strokeDasharray="5 5"
          strokeOpacity={0.65}
          strokeWidth={1.25}
          x1={0}
          x2={plotRight}
          y1={targetY}
          y2={targetY}
        />
        {path ? (
          <Path
            d={path}
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
          />
        ) : null}
        {points.map((point) =>
          point.index % visibleNodeStep === 0 ||
          point.index === points.length - 1 ? (
            <Circle
              cx={point.x}
              cy={point.y}
              fill="#171717"
              key={timeline[point.index].id}
              r={3.5}
              stroke={color}
              strokeWidth={2}
            />
          ) : null,
        )}
        {selectedPoint ? (
          <Circle
            cx={selectedPoint.x}
            cy={selectedPoint.y}
            fill={color}
            r={6}
            stroke="#FFFFFF"
            strokeWidth={2}
          />
        ) : null}
      </Svg>

      <Text className="absolute bottom-1 left-0 font-jakarta-medium text-[9px] text-zinc-600">
        {timeline.length ? formatTimelineDate(timeline[0].date) : "No entries"}
      </Text>
      <Text className="absolute bottom-1 right-0 font-jakarta-medium text-[9px] text-zinc-600">
        {timeline.length
          ? formatTimelineDate(timeline[timeline.length - 1].date)
          : "Log attendance to begin"}
      </Text>

      {selectedPoint ? (
        <View
          className="absolute rounded-xl border border-zinc-800 bg-zinc-900/90 px-2 py-1"
          pointerEvents="none"
          style={{
            left: Math.min(
              chartWidth - 160,
              Math.max(0, selectedPoint.x - 72),
            ),
            top: Math.max(0, selectedPoint.y - 38),
          }}
        >
          <Text
            className="font-jakarta-semibold text-xs text-white"
            numberOfLines={1}
          >
            {selectedPoint.label} ·{" "}
            {formatAttendancePercentage(selectedPoint.percentage)}%
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function SubjectForecastCard({
  index,
  item,
}: {
  index: number;
  item: SubjectAnalytics;
}) {
  const { color, forecast, subject, timeline } = item;
  const percentage = formatAttendancePercentage(forecast.percentage);
  const postBunkPercentage = formatAttendancePercentage(
    forecast.postBunkPercentage,
  );
  const requiredAttendance = Number.isFinite(
    forecast.requiredConsecutiveAttendance,
  )
    ? forecast.requiredConsecutiveAttendance
    : "every";

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 45).duration(230)}
      layout={LinearTransition}
      className="rounded-3xl bg-[#171717] p-5"
    >
      <View className="flex-row items-start gap-3">
        <View
          className="mt-1 h-3 w-3 rounded-full"
          style={{ backgroundColor: color }}
        />
        <View className="min-w-0 flex-1">
          <Link
            asChild
            href={{
              pathname: "/subject/[subjectId]",
              params: { subjectId: subject.id },
            }}
          >
            <TouchableOpacity
              accessibilityHint="Opens the subject details page"
              accessibilityLabel={`View ${subject.name}`}
              activeOpacity={0.7}
              className="flex-row items-start justify-between gap-3"
            >
              <View className="min-w-0 flex-1">
                <Text
                  className="font-outfit text-[19px] font-semibold leading-6 text-white"
                  numberOfLines={2}
                  selectable
                >
                  {subject.name}
                </Text>
                <Text className="pt-1 font-jakarta-medium text-xs text-zinc-500">
                  {forecast.attended}/{forecast.total} classes attended
                </Text>
              </View>
              <View className="flex-row items-center gap-2">
                <Text
                  className="font-outfit text-[26px] font-bold leading-8 text-white"
                  selectable
                  style={{ fontVariant: ["tabular-nums"] }}
                >
                  {percentage}%
                </Text>
                <ChevronRight color="#777D9E" size={18} strokeWidth={2.2} />
              </View>
            </TouchableOpacity>
          </Link>

          <SubjectTimelineChart
            color={color}
            key={`${forecast.attended}-${forecast.total}-${timeline.length}`}
            subject={subject}
            targetPercentage={forecast.targetPercentage}
            timeline={timeline}
          />

          <View className="mt-4 flex-row flex-wrap items-center justify-between gap-3">
            <View
              className={`rounded-full px-3 py-2 ${
                forecast.isOnTrack
                  ? "bg-safe/20"
                  : "bg-destructive/20"
              }`}
            >
              <Text
                className={`font-jakarta-semibold text-[11px] ${
                  forecast.isOnTrack ? "text-safe" : "text-destructive"
                }`}
              >
                {forecast.isOnTrack
                  ? `Safe to skip: ${forecast.safeBunks} classes`
                  : `Must attend next ${requiredAttendance} classes`}
              </Text>
            </View>

            <Text className="font-jakarta-medium text-[11px] text-[#8B8B9D]">
              Target {formatAttendancePercentage(forecast.targetPercentage)}%
            </Text>
          </View>

          <View className="mt-4 flex-row items-center gap-2 border-t border-[#2A2A2A] pt-4">
            <TrendingDown color="#F5A800" size={15} strokeWidth={2.2} />
            <Text
              className="font-jakarta-medium text-[12px] text-[#B1B2C8]"
              selectable
            >
              Bunking drops you to{" "}
              <Text className="font-jakarta-bold text-[#F5A800]">
                {postBunkPercentage}%
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export function AnalyticsScreen() {
  const { user } = useUser();
  const userId = user?.id;
  const [period, setPeriod] = useState<AnalyticsPeriod>("semester");
  const setup = useAttendanceStore((state) =>
    userId ? state.setupsByUserId[userId] : undefined,
  );
  const attendance = useAttendanceStore((state) =>
    userId ? state.logsByUserId[userId] : undefined,
  );

  const filteredLogs = useMemo(
    () =>
      getFilteredLogs(
        attendance ?? [],
        period,
        setup?.semester.id,
        setup?.semester.startDate,
      ),
    [
      attendance,
      period,
      setup?.semester.id,
      setup?.semester.startDate,
    ],
  );
  const activeSubjectIds = useMemo(
    () => new Set((setup?.subjects ?? []).map((subject) => subject.id)),
    [setup?.subjects],
  );
  const relevantLogs = useMemo(
    () => filteredLogs.filter((log) => activeSubjectIds.has(log.subjectId)),
    [activeSubjectIds, filteredLogs],
  );
  const overall = useMemo(
    () => calculateWeightedAttendance(relevantLogs),
    [relevantLogs],
  );
  const subjectAnalytics = useMemo<SubjectAnalytics[]>(
    () =>
      (setup?.subjects ?? []).map((subject, index) => {
        const subjectLogs = relevantLogs.filter(
          (log) => log.subjectId === subject.id,
        );

        return {
          color: getSubjectColor(subject, index),
          forecast: calculateSubjectAttendanceForecast(
            subjectLogs,
            subject.minimumAttendancePercentage,
          ),
          subject,
          timeline: createAttendanceTimeline(subjectLogs),
          trends: createMonthTrend(
            subjectLogs,
            setup?.semester.startDate,
          ),
        };
      }),
    [relevantLogs, setup?.semester.startDate, setup?.subjects],
  );
  const trends = useMemo(
    () => createMonthTrend(relevantLogs, setup?.semester.startDate),
    [relevantLogs, setup?.semester.startDate],
  );
  const target = setup?.minimumAttendancePercentage ?? 75;
  const currentMonth = trends.at(-1);
  const previousMonth = trends.at(-2);
  const monthDelta =
    currentMonth?.total && previousMonth?.total
      ? currentMonth.percentage - previousMonth.percentage
      : null;
  const prioritySubject = [...subjectAnalytics]
    .filter((item) => !item.forecast.isOnTrack)
    .sort(
      (first, second) =>
        second.forecast.requiredConsecutiveAttendance -
        first.forecast.requiredConsecutiveAttendance,
    )[0];
  const totalSafeBunks = subjectAnalytics.reduce(
    (total, item) => total + item.forecast.safeBunks,
    0,
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
      <ScrollView
        className="bg-black"
        contentContainerStyle={{
          gap: 26,
          paddingBottom: 42,
          paddingHorizontal: 20,
          paddingTop: 18,
        }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <Text
          className="font-outfit text-[34px] font-bold leading-10 text-white"
          selectable
        >
          Analytics
        </Text>

        <View className="flex-row gap-3">
          {PERIODS.map((item) => {
            const isSelected = item.value === period;

            return (
              <TouchableOpacity
                accessibilityRole="tab"
                accessibilityState={{ selected: isSelected }}
                activeOpacity={0.74}
                className={`h-14 flex-1 items-center justify-center rounded-[18px] ${
                  isSelected ? "bg-[#625DFF]" : "bg-[#171717]"
                }`}
                key={item.value}
                onPress={() => setPeriod(item.value)}
              >
                <Text
                  adjustsFontSizeToFit
                  className={`font-outfit text-[16px] font-semibold ${
                    isSelected ? "text-white" : "text-[#777D9E]"
                  }`}
                  minimumFontScale={0.78}
                  numberOfLines={1}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Animated.View
          entering={FadeInDown.duration(230)}
          className="overflow-hidden rounded-3xl border border-[#2B2D37] bg-[#14151F] p-5"
        >
          <View className="flex-row items-start justify-between gap-3">
            <View>
              <Text className="font-outfit text-[14px] font-medium tracking-[1.5px] text-[#858BAF]">
                OVERALL TREND
              </Text>
              <Text
                className="pt-2 font-outfit text-[48px] font-bold leading-[54px] text-white"
                selectable
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {formatAttendancePercentage(overall.percentage)}%
              </Text>
              <Text className="font-jakarta-medium text-xs text-[#777D9E]">
                {overall.attended} of {overall.total} conducted classes
              </Text>
            </View>

            <View className="flex-row items-center gap-1 pt-1">
              {monthDelta !== null && monthDelta < 0 ? (
                <TrendingDown color="#FFC000" size={18} strokeWidth={2.2} />
              ) : (
                <TrendingUp color="#FFC000" size={18} strokeWidth={2.2} />
              )}
              <Text className="font-outfit text-[14px] font-semibold text-[#FFC000]">
                {monthDelta === null
                  ? "Live overview"
                  : `${monthDelta >= 0 ? "+" : ""}${formatAttendancePercentage(monthDelta)}% this month`}
              </Text>
            </View>
          </View>

          <View className="mt-6 items-center">
            <MultiSubjectTrendChart
              key={`${period}-${overall.attended}-${overall.total}`}
              subjects={subjectAnalytics}
              targetPercentage={target}
              trends={trends}
            />
          </View>
          <Text className="mt-3 font-jakarta-medium text-[12px] text-[#777D9E]">
            — {formatAttendancePercentage(target)}% attendance target line
          </Text>
        </Animated.View>

        <View className="gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-outfit text-[20px] font-semibold tracking-[1px] text-[#A6ADDB]">
              SUBJECT BREAKDOWN
            </Text>
            <Text className="font-jakarta-semibold text-[12px] text-[#777DFF]">
              {subjectAnalytics.length} courses
            </Text>
          </View>

          {subjectAnalytics.length ? (
            subjectAnalytics.map((item, index) => (
              <SubjectForecastCard
                index={index}
                item={item}
                key={item.subject.id}
              />
            ))
          ) : (
            <View className="items-center gap-3 rounded-3xl bg-[#171717] px-7 py-12">
              <View className="h-14 w-14 items-center justify-center rounded-[18px] bg-[#242449]">
                <BarChart3 color="#7773FF" size={26} strokeWidth={2.1} />
              </View>
              <Text className="font-outfit text-[19px] font-semibold text-white">
                No subjects to analyze
              </Text>
              <Text className="text-center font-jakarta-medium text-[13px] leading-5 text-zinc-500">
                Complete semester setup to unlock attendance forecasts.
              </Text>
            </View>
          )}
        </View>

        {subjectAnalytics.length ? (
          <Animated.View
            entering={FadeInDown.delay(160).duration(240)}
            className="rounded-3xl border border-[#303184] bg-[#121334] px-5 py-6"
          >
            <Text className="font-outfit text-[13px] font-semibold tracking-[1.4px] text-[#9FA8FF]">
              FORECAST
            </Text>
            {prioritySubject ? (
              <>
                <Text className="pt-3 font-outfit text-[21px] font-semibold leading-7 text-white">
                  Focus on {prioritySubject.subject.name}
                </Text>
                <Text className="pt-2 font-jakarta-medium text-[14px] leading-6 text-[#858BAF]">
                  Attend the next{" "}
                  {Number.isFinite(
                    prioritySubject.forecast.requiredConsecutiveAttendance,
                  )
                    ? prioritySubject.forecast
                        .requiredConsecutiveAttendance
                    : "remaining"}{" "}
                  classes to reach{" "}
                  {formatAttendancePercentage(
                    prioritySubject.forecast.targetPercentage,
                  )}
                  %.
                </Text>
              </>
            ) : (
              <>
                <Text className="pt-3 font-outfit text-[21px] font-semibold leading-7 text-white">
                  Every subject is on track
                </Text>
                <Text className="pt-2 font-jakarta-medium text-[14px] leading-6 text-[#858BAF]">
                  You can safely skip {totalSafeBunks}{" "}
                  {totalSafeBunks === 1 ? "class" : "classes"} across your
                  courses while staying on target.
                </Text>
              </>
            )}
          </Animated.View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
