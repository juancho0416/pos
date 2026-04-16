// useSync.js — Re-exporta SyncContext para compatibilidad
// Ya NO hay Web Worker. Todo vive en useMainThreadSync.
export { useSync, SyncProvider } from '../context/SyncContext'

// ════════════════════════════════════════════════════════════
// ★ WAKE LOCK: Requiere DOM APIs, se queda en main thread
// ════════════════════════════════════════════════════════════
let _wakeLock = null

export const requestWakeLock = async () => {
    try {
        if ('wakeLock' in navigator) {
            _wakeLock = await navigator.wakeLock.request('screen')
            console.log('💡 Wake Lock activado — pantalla encendida')
        }
    } catch (err) {
        console.warn('Wake Lock no disponible:', err.message)
    }
}

export const releaseWakeLock = async () => {
    if (_wakeLock) {
        await _wakeLock.release().catch(() => { })
        _wakeLock = null
    }
}

// ════════════════════════════════════════════════════════════
// ★ TRIGGER SYNC: Ahora usa el contexto directamente
// Mantiene la API pública para compatibilidad con Sales.jsx
// ════════════════════════════════════════════════════════════
export async function triggerSyncQueue() {
    // Los consumidores ahora deben usar useSync().triggerSyncQueue
    console.warn('⚠️ triggerSyncQueue standalone deprecated — usa useSync().triggerSyncQueue')
    return false
}
