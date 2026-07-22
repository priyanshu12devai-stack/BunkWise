import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import {
  createJSONStorage,
  persist,
  type StateStorage,
} from "zustand/middleware";

import type {
  DayOfWeek,
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

type CompletedSemesterSetup = SemesterSetupData & {
  isSetupComplete: true;
};

type SemesterSetupState = {
  hasHydrated: boolean;
  setupDraftsByUserId: Record<string, SemesterSetupData>;
  setupsByUserId: Record<string, CompletedSemesterSetup>;
  completeSetup: (userId: string, setup: SemesterSetupData) => void;
  saveSetupDraft: (userId: string, setup: SemesterSetupData) => void;
  resetSetups: (userId: string) => void;
  resetAllSetups: () => void;
  setHasHydrated: (hasHydrated: boolean) => void;
};

const serverStorage: StateStorage = {
  getItem: () => null,
  removeItem: () => undefined,
  setItem: () => undefined,
};

const getStorage = () =>
  typeof window === "undefined" ? serverStorage : AsyncStorage;

export const useSemesterSetupStore = create<SemesterSetupState>()(
  persist(
    (set) => ({
      hasHydrated: false,
      setupDraftsByUserId: {},
      setupsByUserId: {},
      completeSetup: (userId, setup) =>
        set((state) => ({
          setupDraftsByUserId: {
            ...state.setupDraftsByUserId,
            [userId]: setup,
          },
          setupsByUserId: {
            ...state.setupsByUserId,
            [userId]: {
              ...setup,
              isSetupComplete: true,
            },
          },
        })),
      saveSetupDraft: (userId, setup) =>
        set((state) => ({
          setupDraftsByUserId: {
            ...state.setupDraftsByUserId,
            [userId]: setup,
          },
        })),
      resetSetups: (userId) =>
        set((state) => {
          const setupDraftsByUserId = { ...state.setupDraftsByUserId };
          const setupsByUserId = { ...state.setupsByUserId };
          delete setupDraftsByUserId[userId];
          delete setupsByUserId[userId];

          return { setupDraftsByUserId, setupsByUserId };
        }),
      resetAllSetups: () =>
        set({ setupDraftsByUserId: {}, setupsByUserId: {} }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "bunkwise-semester-setup",
      storage: createJSONStorage(getStorage),
      partialize: (state) => ({
        setupDraftsByUserId: state.setupDraftsByUserId,
        setupsByUserId: state.setupsByUserId,
      }),
      onRehydrateStorage: (state) => () => {
        state.setHasHydrated(true);
      },
    },
  ),
);

export function clearSemesterSetupState(userId: string) {
  useSemesterSetupStore.getState().resetSetups(userId);
}

export async function clearAllSemesterSetupState() {
  useSemesterSetupStore.getState().resetAllSetups();
  await useSemesterSetupStore.persist.clearStorage();
}
