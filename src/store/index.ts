import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PoopRecord } from "../types";

interface PoopState {
  records: PoopRecord[];
  currentSession: {
    isActive: boolean;
    startTime: number | null;
  };
  hourlySalary: number;
  addRecord: (record: PoopRecord) => void;
  deleteRecord: (id: string) => void;
  startSession: () => void;
  endSession: () => number;
  setHourlySalary: (salary: number) => void;
  getRecordsByDate: (date: string) => PoopRecord[];
  getRecordsByMonth: (year: number, month: number) => PoopRecord[];
  getTotalDuration: () => number;
  getYearRecords: (year: number) => PoopRecord[];
}

export const usePoopStore = create<PoopState>()(
  persist(
    (set, get) => ({
      records: [],
      currentSession: {
        isActive: false,
        startTime: null,
      },
      hourlySalary: 50,

      addRecord: (record) =>
        set((state) => ({
          records: [record, ...state.records],
        })),

      deleteRecord: (id) =>
        set((state) => ({
          records: state.records.filter((r) => r.id !== id),
        })),

      startSession: () =>
        set({
          currentSession: {
            isActive: true,
            startTime: Date.now(),
          },
        }),

      endSession: () => {
        const { currentSession } = get();
        const duration = currentSession.startTime
          ? Math.floor((Date.now() - currentSession.startTime) / 1000)
          : 0;
        set({
          currentSession: {
            isActive: false,
            startTime: null,
          },
        });
        return duration;
      },

      setHourlySalary: (salary) => set({ hourlySalary: salary }),

      getRecordsByDate: (date) => {
        return get().records.filter((r) => r.date === date);
      },

      getRecordsByMonth: (year, month) => {
        const prefix = `${year}-${String(month).padStart(2, "0")}`;
        return get().records.filter((r) => r.date.startsWith(prefix));
      },

      getTotalDuration: () => {
        return get().records.reduce((sum, r) => sum + r.duration, 0);
      },

      getYearRecords: (year) => {
        return get().records.filter((r) => r.date.startsWith(`${year}`));
      },
    }),
    {
      name: "poop-tracker-storage",
    }
  )
);
