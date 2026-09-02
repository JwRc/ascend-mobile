import { create } from 'zustand';

/**
 * Estado leve do sync offline, só pra UI (banner + indicador de pendências).
 * Não persiste — `pendingCount` é recalculado da fila no disco no boot.
 */
type SyncState = {
  pendingCount: number;
  syncing: boolean;
  setPendingCount: (n: number) => void;
  setSyncing: (v: boolean) => void;
};

export const useSyncStore = create<SyncState>((set) => ({
  pendingCount: 0,
  syncing: false,
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setSyncing: (syncing) => set({ syncing }),
}));
