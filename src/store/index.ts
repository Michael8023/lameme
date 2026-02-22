import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PoopRecord } from "../types";
import {
  cloudDefaults,
  createRecord,
  fetchCloudState,
  patchRecord,
  removeAllRecords,
  removeRecord,
  saveHourlySalary,
  saveProfile,
  type UserProfile,
} from "../lib/cloud";

interface PoopState {
  records: PoopRecord[];
  profile: UserProfile;
  currentSession: {
    isActive: boolean;
    startTime: number | null;
  };
  hourlySalary: number;
  cloudReady: boolean;
  cloudLoading: boolean;
  cloudError: string;
  hydrateFromCloud: () => Promise<void>;
  resetForSignOut: () => void;
  addRecord: (record: PoopRecord) => Promise<void>;
  updateRecord: (id: string, patch: Partial<PoopRecord>) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  clearRecords: () => Promise<void>;
  startSession: () => void;
  endSession: () => number;
  setHourlySalary: (salary: number) => Promise<void>;
  setProfile: (patch: Partial<UserProfile>) => Promise<void>;
  getRecordsByDate: (date: string) => PoopRecord[];
  getRecordsByMonth: (year: number, month: number) => PoopRecord[];
  getTotalDuration: () => number;
  getYearRecords: (year: number) => PoopRecord[];
}

const defaultSession = {
  isActive: false,
  startTime: null,
};

export const usePoopStore = create<PoopState>()(
  persist(
    (set, get) => ({
      records: [],
      profile: cloudDefaults.profile,
      currentSession: defaultSession,
      hourlySalary: 1,
      cloudReady: false,
      cloudLoading: false,
      cloudError: "",

      hydrateFromCloud: async () => {
        set({ cloudLoading: true, cloudError: "" });
        try {
          const { records, hourlySalary, profile } = await fetchCloudState();
          set({
            records,
            hourlySalary,
            profile,
            cloudReady: true,
            cloudLoading: false,
            cloudError: "",
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "云端同步失败";
          set({ cloudLoading: false, cloudError: message, cloudReady: false });
          throw error;
        }
      },

      resetForSignOut: () =>
        set({
          records: [],
          profile: cloudDefaults.profile,
          currentSession: defaultSession,
          hourlySalary: 1,
          cloudReady: false,
          cloudLoading: false,
          cloudError: "",
        }),

      addRecord: async (record) => {
        await createRecord(record);
        set((state) => ({ records: [record, ...state.records] }));
      },

      updateRecord: async (id, patch) => {
        await patchRecord(id, patch);
        set((state) => ({
          records: state.records.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        }));
      },

      deleteRecord: async (id) => {
        await removeRecord(id);
        set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
      },

      clearRecords: async () => {
        await removeAllRecords();
        set({
          records: [],
          currentSession: defaultSession,
        });
      },

      startSession: () => set({ currentSession: { isActive: true, startTime: Date.now() } }),

      endSession: () => {
        const { currentSession } = get();
        const duration = currentSession.startTime
          ? Math.floor((Date.now() - currentSession.startTime) / 1000)
          : 0;

        set({ currentSession: defaultSession });
        return duration;
      },

      setHourlySalary: async (salary) => {
        const value = Math.max(1, Number(salary) || 1);
        await saveHourlySalary(value);
        set({ hourlySalary: value });
      },

      setProfile: async (patch) => {
        const next = { ...get().profile, ...patch };
        await saveProfile(next);
        set({ profile: next });
      },

      getRecordsByDate: (date) => get().records.filter((r) => r.date === date),

      getRecordsByMonth: (year, month) => {
        const prefix = `${year}-${String(month).padStart(2, "0")}`;
        return get().records.filter((r) => r.date.startsWith(prefix));
      },

      getTotalDuration: () => get().records.reduce((sum, r) => sum + r.duration, 0),

      getYearRecords: (year) => get().records.filter((r) => r.date.startsWith(`${year}`)),
    }),
    {
      name: "poop-tracker-storage",
      partialize: (state) => ({
        records: state.records,
        profile: state.profile,
        hourlySalary: state.hourlySalary,
      }),
    }
  )
);
