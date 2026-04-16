// SyncContext.jsx — Contexto de sincronización con PowerSync
// PowerSync maneja toda la sincronización automáticamente.
// Este contexto solo expone estado de conectividad y Wake Lock.
import React, { createContext, useContext, useEffect } from 'react'
import { useAuth } from './AuthContext'
import { powersync } from '../powersync/db'

// Wake Lock helpers (requieren DOM — siempre en main thread)
let _wakeLock = null

const requestWakeLock = async () => {
    try {
        if ('wakeLock' in navigator) {
            _wakeLock = await navigator.wakeLock.request('screen')
            console.log('💡 Wake Lock activado')
        }
    } catch (err) {
        console.warn('Wake Lock no disponible:', err.message)
    }
}

const releaseWakeLock = async () => {
    if (_wakeLock) {
        await _wakeLock.release().catch(() => { })
        _wakeLock = null
    }
}

const SyncContext = createContext(null)

export const SyncProvider = ({ children }) => {
    const { selectedBranch, user } = useAuth()

    // ★ Wake Lock: mantiene la pantalla encendida mientras el POS está activo
    useEffect(() => {
        if (selectedBranch && user) {
            requestWakeLock()
            const handleVisWake = () => {
                if (document.visibilityState === 'visible') requestWakeLock()
            }
            document.addEventListener('visibilitychange', handleVisWake)
            return () => {
                releaseWakeLock()
                document.removeEventListener('visibilitychange', handleVisWake)
            }
        }
    }, [selectedBranch, user])

    // ★ triggerSyncQueue: PowerSync lo hace automáticamente, pero
    // exponemos una función vacía para compatibilidad con consumidores existentes.
    const triggerSyncQueue = () => {
        // PowerSync maneja la cola de forma automática.
        // No se necesita trigger manual.
    }

    const value = { triggerSyncQueue }

    return (
        <SyncContext.Provider value={value}>
            {children}
        </SyncContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useSync = () => {
    const ctx = useContext(SyncContext)
    if (!ctx) throw new Error('useSync debe usarse dentro de <SyncProvider>')
    return ctx
}
