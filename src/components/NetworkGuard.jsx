// NetworkGuard.jsx — Componente invisible que vigila la conexión
// Muestra toasts (sonner) y ejecuta recarga silenciosa al reconectar
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useSyncStore } from '../stores/useSyncStore'
import { useSync } from '../hooks/useSync'

export default function NetworkGuard() {
    const setOffline = useSyncStore((s) => s.setOffline)
    const refreshPendingCount = useSyncStore((s) => s.refreshPendingCount)
    const setLastSyncAt = useSyncStore((s) => s.setLastSyncAt)
    const { syncCatalog, triggerSyncQueue } = useSync()
    const hasBooted = useRef(false)

    useEffect(() => {
        // Evitar toast en el montaje inicial
        if (!hasBooted.current) {
            hasBooted.current = true
            return
        }
    }, [])

    useEffect(() => {
        const handleOffline = () => {
            setOffline(true)
            toast.error('Sin conexión a Internet', {
                description: 'Las ventas se guardan localmente y se enviarán al reconectar.',
                duration: 5000,
                id: 'network-status',
                icon: '🔴',
            })
        }

        const handleOnline = () => {
            setOffline(false)
            toast.success('Conexión restaurada', {
                description: 'Sincronizando datos con el servidor...',
                duration: 4000,
                id: 'network-status',
                icon: '🟢',
            })

            // ★ PowerSync retomará la sincronización automáticamente en background.
            try {
                if (typeof refreshPendingCount === 'function') refreshPendingCount()
                if (typeof setLastSyncAt === 'function') setLastSyncAt(Date.now())
            } catch (e) { console.warn(e) }
        }

        window.addEventListener('offline', handleOffline)
        window.addEventListener('online', handleOnline)

        return () => {
            window.removeEventListener('offline', handleOffline)
            window.removeEventListener('online', handleOnline)
        }
    }, [setOffline, syncCatalog, triggerSyncQueue, refreshPendingCount, setLastSyncAt])

    return null // Componente invisible — solo vigila la red
}
