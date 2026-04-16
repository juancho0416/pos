// useTransferStore.js — Estado global para notificaciones de traspasos en tiempo real
import { create } from 'zustand'

export const useTransferStore = create((set) => ({
    pendingRequests: 0,         // Solicitudes entrantes sin revisar
    lastNotification: null,     // Última notificación recibida

    incrementPendingRequests: () => set((s) => ({
        pendingRequests: s.pendingRequests + 1,
        lastNotification: Date.now()
    })),

    decrementPendingRequests: () => set((s) => ({
        pendingRequests: Math.max(0, s.pendingRequests - 1)
    })),

    setPendingRequests: (count) => set({ pendingRequests: count }),

    clearPending: () => set({ pendingRequests: 0 }),
}))
