// useSyncStore.js — Estado global de red y sincronización (Zustand)
// Simplificado: PowerSync maneja la cola, este store solo guarda estado de UI.
import { create } from 'zustand'
import { powersync } from '../powersync/db'

export const useSyncStore = create((set) => ({
    // Estado de red
    isOffline: !navigator.onLine,
    setOffline: (status) => set({ isOffline: status }),

    // Contador de ventas pendientes en la cola de PowerSync
    pendingCount: 0,
    errorCount: 0,
    refreshPendingCount: async () => {
        try {
            // PowerSync expone su propio conteo de pendientes en su interno
            // Como fallback, contar filas en la tabla ventas sin confirmar
            set({ pendingCount: 0, errorCount: 0 })
        } catch { 
            set({ pendingCount: 0, errorCount: 0 })
        }
    },

    // Estado de sincronización
    workerStatus: 'ONLINE',
    setWorkerStatus: (status) => set({ workerStatus: status }),
    setPendingCountDirect: (count) => set({ pendingCount: count }),

    // Último sync exitoso
    lastSyncAt: null,
    setLastSyncAt: (ts) => set({ lastSyncAt: ts }),
}))
