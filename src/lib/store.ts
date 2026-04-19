"use client";

import { create } from "zustand";
import type { Bbox } from "@/types/sentinel";

export type JobPhase =
  | "idle"
  | "fetching"
  | "processing"
  | "encoding"
  | "done"
  | "error";

export interface JobState {
  phase: JobPhase;
  framesTotal: number;
  framesDone: number;
  encodeProgress: number;
  message: string;
  videoUrl: string | null;
  error: string | null;
}

interface TimelapseState {
  bbox: Bbox | null;
  startDate: string;
  endDate: string;
  intervalDays: number;
  width: number;
  height: number;
  transition: string;
  transitionSeconds: number;
  framePauseSeconds: number;
  fps: number;
  enableHistogramMatch: boolean;
  job: JobState;
  setBbox: (bbox: Bbox | null) => void;
  setStartDate: (d: string) => void;
  setEndDate: (d: string) => void;
  setIntervalDays: (n: number) => void;
  setEnableHistogramMatch: (v: boolean) => void;
  setTransition: (t: string) => void;
  setJob: (patch: Partial<JobState>) => void;
  resetJob: () => void;
}

const initialJob: JobState = {
  phase: "idle",
  framesTotal: 0,
  framesDone: 0,
  encodeProgress: 0,
  message: "",
  videoUrl: null,
  error: null,
};

const today = new Date();
const threeMonthsAgo = new Date(today);
threeMonthsAgo.setMonth(today.getMonth() - 3);

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const useTimelapseStore = create<TimelapseState>((set) => ({
  bbox: null,
  startDate: fmt(threeMonthsAgo),
  endDate: fmt(today),
  intervalDays: 10,
  width: 1920,
  height: 1080,
  transition: "dissolve",
  transitionSeconds: 0.5,
  framePauseSeconds: 0.4,
  fps: 30,
  enableHistogramMatch: true,
  job: initialJob,
  setBbox: (bbox) => set({ bbox }),
  setStartDate: (d) => set({ startDate: d }),
  setEndDate: (d) => set({ endDate: d }),
  setIntervalDays: (n) => set({ intervalDays: n }),
  setEnableHistogramMatch: (v) => set({ enableHistogramMatch: v }),
  setTransition: (t) => set({ transition: t }),
  setJob: (patch) => set((state) => ({ job: { ...state.job, ...patch } })),
  resetJob: () => set({ job: initialJob }),
}));
