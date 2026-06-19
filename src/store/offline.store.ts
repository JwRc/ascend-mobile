import { create } from 'zustand';

export type OfflineMutationType = 'LOG_WORKOUT' | 'LOG_BODY_RECORD' | 'UPDATE_GOAL';

export type OfflineMutation = {
  id: string;
  type: OfflineMutationType;
  payload: unknown;
  createdAt: number;
};

type OfflineStore = {
  queue: OfflineMutation[];
  enqueue: (type: OfflineMutationType, payload: unknown) => void;
  dequeue: (ids: string[]) => void;
  clearAll: () => void;
};

function uid() {
  return `offline_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export const useOfflineStore = create<OfflineStore>((set) => ({
  queue: [],

  enqueue: (type, payload) =>
    set((s) => ({
      queue: [...s.queue, { id: uid(), type, payload, createdAt: Date.now() }],
    })),

  dequeue: (ids) =>
    set((s) => ({ queue: s.queue.filter((m) => !ids.includes(m.id)) })),

  clearAll: () => set({ queue: [] }),
}));
