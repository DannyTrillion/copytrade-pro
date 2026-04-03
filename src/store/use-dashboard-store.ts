import { create } from "zustand";
import type { TradeData, SignalData, DashboardStats } from "@/types";

interface DashboardState {
  trades: TradeData[];
  signals: SignalData[];
  stats: DashboardStats | null;
  isLoading: boolean;
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;
  activePanel: string;

  setTrades: (trades: TradeData[]) => void;
  setSignals: (signals: SignalData[]) => void;
  setStats: (stats: DashboardStats) => void;
  setLoading: (loading: boolean) => void;
  toggleSidebar: () => void;
  setMobileSidebar: (open: boolean) => void;
  toggleMobileSidebar: () => void;
  setActivePanel: (panel: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  trades: [],
  signals: [],
  stats: null,
  isLoading: false,
  sidebarOpen: true,
  mobileSidebarOpen: false,
  activePanel: "overview",

  setTrades: (trades) => set({ trades }),
  setSignals: (signals) => set({ signals }),
  setStats: (stats) => set({ stats }),
  setLoading: (isLoading) => set({ isLoading }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setMobileSidebar: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
  toggleMobileSidebar: () => set((state) => ({ mobileSidebarOpen: !state.mobileSidebarOpen })),
  setActivePanel: (activePanel) => set({ activePanel }),
}));
