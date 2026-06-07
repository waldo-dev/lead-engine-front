import { create } from "zustand";
import type { Company } from "@/types";

interface UIState {
  selectedCompany: Company | null;
  selectedIds: string[];
  globalSearch: string;
  sidebarOpen: boolean;
  setSelectedCompany: (company: Company | null) => void;
  toggleSelectedId: (id: string) => void;
  setSelectedIds: (ids: string[]) => void;
  clearSelection: () => void;
  setGlobalSearch: (search: string) => void;
  setSidebarOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  selectedCompany: null,
  selectedIds: [],
  globalSearch: "",
  sidebarOpen: true,
  setSelectedCompany: (company) => set({ selectedCompany: company }),
  toggleSelectedId: (id) =>
    set((state) => ({
      selectedIds: state.selectedIds.includes(id)
        ? state.selectedIds.filter((i) => i !== id)
        : [...state.selectedIds, id],
    })),
  setSelectedIds: (ids) => set({ selectedIds: ids }),
  clearSelection: () => set({ selectedIds: [] }),
  setGlobalSearch: (search) => set({ globalSearch: search }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
}));
