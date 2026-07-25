import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

import { getPreviousDate } from "@/lib/schedule";
import type {
  AttendanceLog,
  DateString,
  DayOfWeek,
  ScheduleSlot,
  Semester,
  Subject,
  WeeklySchedule,
} from "@/types/attendance";

export type SemesterSetupData = {
  academicYear: string;
  minimumAttendancePercentage: number;
  regularWorkingDays: DayOfWeek[];
  semester: Semester;
  subjects: Subject[];
  weeklySchedule: WeeklySchedule;
};

export type CompletedSemesterSetup = SemesterSetupData & {
  isSetupComplete: true;
};

type AttendanceState = {
  hasHydrated: boolean;
  logsByUserId: Record<string, AttendanceLog[]>;
  setupDraftsByUserId: Record<string, SemesterSetupData>;
  setupsByUserId: Record<string, CompletedSemesterSetup>;
  archiveSubject: (
    userId: string,
    subjectId: string,
    archivedFromDate: DateString,
  ) => void;
  completeSetup: (userId: string, setup: SemesterSetupData) => void;
  initializeUser: (userId: string) => void;
  mergeLegacyAttendance: () => Promise<void>;
  resetAll: () => void;
  resetUser: (userId: string) => void;
  saveSetupDraft: (userId: string, setup: SemesterSetupData) => void;
  saveScheduleSlot: (
    userId: string,
    day: DayOfWeek,
    slot: ScheduleSlot,
    effectiveFromDate: DateString,
    replacedSlotId?: string,
  ) => void;
  removeScheduleSlot: (
    userId: string,
    day: DayOfWeek,
    slotId: string,
    effectiveFromDate: DateString,
  ) => void;
  setAttendanceLog: (userId: string, log: AttendanceLog) => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

type PersistedAttendanceState = Pick<
  AttendanceState,
  "logsByUserId" | "setupDraftsByUserId" | "setupsByUserId"
>;

const LEGACY_ATTENDANCE_STORAGE_KEY = "bunkwise-attendance";
const STORAGE_KEY = "bunkwise-semester-setup";

const serverStorage: StateStorage = {
  getItem: () => null,
  removeItem: () => undefined,
  setItem: () => undefined,
};

const getStorage = () =>
  typeof window === "undefined" ? serverStorage : AsyncStorage;

function isAttendanceLog(value: unknown): value is AttendanceLog {
  if (!value || typeof value !== "object") return false;

  const log = value as Partial<AttendanceLog>;
  return (
    typeof log.id === "string" &&
    typeof log.semesterId === "string" &&
    typeof log.subjectId === "string" &&
    typeof log.scheduleSlotId === "string" &&
    typeof log.date === "string" &&
    (log.status === "present" ||
      log.status === "absent" ||
      log.status === "cancelled")
  );
}

function getLegacyLogsByUserId(value: unknown) {
  if (!value || typeof value !== "object") return {};

  const persisted = value as {
    state?: { logsByUserId?: Record<string, unknown> };
  };
  const candidate = persisted.state?.logsByUserId;
  if (!candidate || typeof candidate !== "object") return {};

  return Object.fromEntries(
    Object.entries(candidate)
      .filter((entry): entry is [string, unknown[]] => Array.isArray(entry[1]))
      .map(([userId, logs]) => [userId, logs.filter(isAttendanceLog)]),
  );
}

export const useAttendanceStore = create<AttendanceState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      logsByUserId: {},
      setupDraftsByUserId: {},
      setupsByUserId: {},
      archiveSubject: (userId, subjectId, archivedFromDate) =>
        set((state) => {
          const setup = state.setupsByUserId[userId];
          if (!setup) return state;

          const previousDate = getPreviousDate(archivedFromDate);
          const subjects = setup.subjects.map((subject) =>
            subject.id === subjectId
              ? { ...subject, archivedFromDate }
              : subject,
          );
          const weeklySchedule = Object.fromEntries(
            Object.entries(setup.weeklySchedule).map(([day, slots]) => [
              day,
              slots.flatMap((slot) => {
                if (
                  slot.subjectId !== subjectId ||
                  (slot.effectiveUntilDate &&
                    slot.effectiveUntilDate < archivedFromDate)
                ) {
                  return [slot];
                }

                if (
                  slot.effectiveFromDate &&
                  slot.effectiveFromDate >= archivedFromDate
                ) {
                  return [];
                }

                return [
                  {
                    ...slot,
                    effectiveUntilDate: previousDate,
                  },
                ];
              }),
            ]),
          ) as WeeklySchedule;
          const nextSetup: CompletedSemesterSetup = {
            ...setup,
            subjects,
            weeklySchedule,
          };
          const draft = state.setupDraftsByUserId[userId];

          return {
            setupDraftsByUserId: draft
              ? {
                  ...state.setupDraftsByUserId,
                  [userId]: {
                    ...draft,
                    subjects,
                    weeklySchedule,
                  },
                }
              : state.setupDraftsByUserId,
            setupsByUserId: {
              ...state.setupsByUserId,
              [userId]: nextSetup,
            },
          };
        }),
      completeSetup: (userId, setup) =>
        set((state) => {
          const completedSetup: CompletedSemesterSetup = {
            ...setup,
            isSetupComplete: true,
            subjects: setup.subjects.map((subject) => ({
              ...subject,
              minimumAttendancePercentage:
                setup.minimumAttendancePercentage,
              semesterId: setup.semester.id,
            })),
          };
          const subjectIds = new Set(
            completedSetup.subjects.map((subject) => subject.id),
          );
          const currentLogs = state.logsByUserId[userId] ?? [];
          const semesterLogs = currentLogs.filter(
            (log) =>
              log.semesterId === completedSetup.semester.id &&
              subjectIds.has(log.subjectId),
          );

          return {
            logsByUserId: {
              ...state.logsByUserId,
              [userId]: semesterLogs,
            },
            setupDraftsByUserId: {
              ...state.setupDraftsByUserId,
              [userId]: completedSetup,
            },
            setupsByUserId: {
              ...state.setupsByUserId,
              [userId]: completedSetup,
            },
          };
        }),
      initializeUser: (userId) =>
        set((state) => {
          if (state.logsByUserId[userId]) return state;

          return {
            logsByUserId: {
              ...state.logsByUserId,
              [userId]: [],
            },
          };
        }),
      mergeLegacyAttendance: async () => {
        if (typeof window === "undefined") return;

        try {
          const legacyValue = await AsyncStorage.getItem(
            LEGACY_ATTENDANCE_STORAGE_KEY,
          );
          if (!legacyValue) return;

          const legacyLogsByUserId = getLegacyLogsByUserId(
            JSON.parse(legacyValue) as unknown,
          );
          if (Object.keys(legacyLogsByUserId).length === 0) return;

          set((state) => {
            const missingLogs = Object.fromEntries(
              Object.entries(legacyLogsByUserId).filter(
                ([userId]) => !state.logsByUserId[userId],
              ),
            );

            return Object.keys(missingLogs).length === 0
              ? state
              : {
                  logsByUserId: {
                    ...missingLogs,
                    ...state.logsByUserId,
                  },
                };
          });
        } catch (error) {
          console.warn("Unable to migrate legacy attendance data.", error);
        }
      },
      resetAll: () =>
        set({
          logsByUserId: {},
          setupDraftsByUserId: {},
          setupsByUserId: {},
        }),
      resetUser: (userId) =>
        set((state) => {
          const logsByUserId = { ...state.logsByUserId };
          const setupDraftsByUserId = { ...state.setupDraftsByUserId };
          const setupsByUserId = { ...state.setupsByUserId };
          delete logsByUserId[userId];
          delete setupDraftsByUserId[userId];
          delete setupsByUserId[userId];

          return { logsByUserId, setupDraftsByUserId, setupsByUserId };
        }),
      saveSetupDraft: (userId, setup) =>
        set((state) => ({
          setupDraftsByUserId: {
            ...state.setupDraftsByUserId,
            [userId]: setup,
          },
        })),
      saveScheduleSlot: (
        userId,
        day,
        slot,
        effectiveFromDate,
        replacedSlotId,
      ) =>
        set((state) => {
          const setup = state.setupsByUserId[userId];
          if (!setup) return state;

          const currentSlots = setup.weeklySchedule[day] ?? [];
          const replacedSlot = replacedSlotId
            ? currentSlots.find((item) => item.id === replacedSlotId)
            : undefined;
          let nextSlots: ScheduleSlot[];

          if (
            replacedSlot &&
            replacedSlot.effectiveFromDate === effectiveFromDate
          ) {
            nextSlots = currentSlots.map((item) =>
              item.id === replacedSlot.id
                ? {
                    ...slot,
                    id: replacedSlot.id,
                    effectiveFromDate,
                    effectiveUntilDate: replacedSlot.effectiveUntilDate,
                  }
                : item,
            );
          } else if (replacedSlot) {
            nextSlots = [
              ...currentSlots.map((item) =>
                item.id === replacedSlot.id
                  ? {
                      ...item,
                      effectiveUntilDate: getPreviousDate(effectiveFromDate),
                    }
                  : item,
              ),
              {
                ...slot,
                id: `${replacedSlot.id}-from-${effectiveFromDate}-${Date.now()}`,
                effectiveFromDate,
                effectiveUntilDate: undefined,
              },
            ];
          } else {
            nextSlots = [
              ...currentSlots,
              {
                ...slot,
                effectiveFromDate,
                effectiveUntilDate: undefined,
              },
            ];
          }

          nextSlots.sort((first, second) =>
            first.startTime.localeCompare(second.startTime),
          );

          const nextWeeklySchedule: WeeklySchedule = {
            ...setup.weeklySchedule,
            [day]: nextSlots,
          };
          const nextSetup: CompletedSemesterSetup = {
            ...setup,
            weeklySchedule: nextWeeklySchedule,
          };
          const draft = state.setupDraftsByUserId[userId];

          return {
            setupDraftsByUserId: draft
              ? {
                  ...state.setupDraftsByUserId,
                  [userId]: {
                    ...draft,
                    weeklySchedule: nextWeeklySchedule,
                  },
                }
              : state.setupDraftsByUserId,
            setupsByUserId: {
              ...state.setupsByUserId,
              [userId]: nextSetup,
            },
          };
        }),
      removeScheduleSlot: (
        userId,
        day,
        slotId,
        effectiveFromDate,
      ) =>
        set((state) => {
          const setup = state.setupsByUserId[userId];
          if (!setup) return state;

          const nextSlots = (setup.weeklySchedule[day] ?? []).flatMap(
            (slot) => {
              if (slot.id !== slotId) return [slot];

              return [
                {
                  ...slot,
                  effectiveUntilDate: getPreviousDate(effectiveFromDate),
                },
              ];
            },
          );
          const weeklySchedule: WeeklySchedule = {
            ...setup.weeklySchedule,
            [day]: nextSlots,
          };
          const nextSetup: CompletedSemesterSetup = {
            ...setup,
            weeklySchedule,
          };
          const draft = state.setupDraftsByUserId[userId];

          return {
            setupDraftsByUserId: draft
              ? {
                  ...state.setupDraftsByUserId,
                  [userId]: {
                    ...draft,
                    weeklySchedule,
                  },
                }
              : state.setupDraftsByUserId,
            setupsByUserId: {
              ...state.setupsByUserId,
              [userId]: nextSetup,
            },
          };
        }),
      setAttendanceLog: (userId, log) =>
        set((state) => {
          const currentLogs = state.logsByUserId[userId] ?? [];
          const existingIndex = currentLogs.findIndex(
            (currentLog) => currentLog.id === log.id,
          );
          const nextLogs = [...currentLogs];

          if (existingIndex >= 0) nextLogs[existingIndex] = log;
          else nextLogs.push(log);

          return {
            logsByUserId: {
              ...state.logsByUserId,
              [userId]: nextLogs,
            },
          };
        }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(getStorage),
      partialize: (state): PersistedAttendanceState => ({
        logsByUserId: state.logsByUserId,
        setupDraftsByUserId: state.setupDraftsByUserId,
        setupsByUserId: state.setupsByUserId,
      }),
      onRehydrateStorage: () => async (state, error) => {
        if (error) {
          console.warn("Unable to hydrate attendance data.", error);
        }

        await state?.mergeLegacyAttendance();
        state?.setHasHydrated(true);
      },
    },
  ),
);

export function clearAttendanceState(userId: string) {
  useAttendanceStore.getState().resetUser(userId);
}

export async function clearAllAttendanceState() {
  useAttendanceStore.getState().resetAll();
  await Promise.all([
    useAttendanceStore.persist.clearStorage(),
    AsyncStorage.removeItem(LEGACY_ATTENDANCE_STORAGE_KEY),
  ]);
}
