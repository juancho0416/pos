// ★★★ DESFIBRILADOR DE CHROME ★★★
// Protección contra Memory Saver que corrompe IndexedDB y WebSockets.
// Se ejecuta ANTES de React para interceptar el estado zombie a nivel DOM nativo.

let _lastVisibleTime = Date.now()

// ★ Flush de ventas pendientes via fetch() nativo (sin React, sin Supabase client)
// Se ejecuta ANTES del hard reload cuando Chrome entra en zombie state
async function _flushPendingSalesBeforeReload() {
  try {
    const raw = localStorage.getItem('pos_offline_sales')
    if (!raw) return

    const queue = JSON.parse(raw)
    const pending = queue.filter(i => i.status === 'pending')
    if (pending.length === 0) return

    // Obtener token de auth desde localStorage (donde Supabase lo guarda)
    const authRaw = localStorage.getItem('sb-auth-token')
    const auth = authRaw ? JSON.parse(authRaw) : null
    const token = auth?.access_token
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
    const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!token || !SUPABASE_URL || !navigator.onLine) return

    console.warn(`🔥 [ZOMBIE FLUSH] ${pending.length} venta(s) pendiente(s) — enviando antes del reload...`)

    const headers = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${token}`,
      'Prefer': 'return=representation'
    }

    for (const item of pending) {
      try {
        const p = item.payload
        // Insertar cabecera de venta
        const ventaRes = await fetch(`${SUPABASE_URL}/rest/v1/ventas`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            sucursal_id: p.sucursal_id,
            total: p.total,
            metodo_pago: p.metodo_pago,
            cliente_id: p.cliente_id,
            vendedor_id: p.vendedor_id,
            usuario_id: p.usuario_id
          })
        })

        if (!ventaRes.ok) continue
        const [ventaData] = await ventaRes.json()
        if (!ventaData?.id) continue

        // Insertar detalles
        const detalles = p.items.map(it => ({
          venta_id: ventaData.id,
          producto_id: it.producto_id,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario
        }))
        await fetch(`${SUPABASE_URL}/rest/v1/venta_detalles`, {
          method: 'POST', headers,
          body: JSON.stringify(detalles)
        })

        // Marcar como enviada en localStorage
        item.status = 'synced'
        console.log(`✅ [ZOMBIE FLUSH] Venta #${item.localId} → Supabase OK`)
      } catch (e) {
        console.warn(`⚠️ [ZOMBIE FLUSH] Venta #${item.localId} falló:`, e.message)
      }
    }

    // No borramos las enviadas aquí. Las guardamos con status='synced'.
    // `useMainThreadSync` al recargar la app leerá este status, 
    // sabrá que ya subieron, y limpiará la cola de Dexie (y de localStorage) sin duplicar la venta.
    localStorage.setItem('pos_offline_sales', JSON.stringify(queue))

  } catch (e) {
    console.error('[ZOMBIE FLUSH] Error general:', e)
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    _lastVisibleTime = Date.now()
  } else if (document.visibilityState === 'visible') {
    const timeAsleep = Date.now() - _lastVisibleTime

    if (timeAsleep > 3_000) {
      console.warn(`☠️ Chrome Zombie State detectado (${Math.round(timeAsleep / 1000)}s dormido).`)

      document.body.innerHTML = '<div style="height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;background:#f1f5f9;color:#334155;font-weight:700;font-size:1.1rem;gap:12px"><div style="width:24px;height:24px;border:3px solid #3b82f6;border-top-color:transparent;border-radius:50%;animation:spin 0.6s linear infinite"></div>Sincronizando ventas pendientes...</div><style>@keyframes spin{to{transform:rotate(360deg)}}</style>'

      // ★ Flush ventas ANTES de recargar (máximo 5 segundos)
      Promise.race([
        _flushPendingSalesBeforeReload(),
        new Promise(r => setTimeout(r, 5000))
      ]).finally(() => {
        sessionStorage.setItem('tactical_reload', 'true')
        window.location.reload()
      })
      return
    }
  }
})

// ★ PWA - REGISTRO DE SERVICE WORKER
import { registerSW } from 'virtual:pwa-register'
if ('serviceWorker' in navigator) {
  registerSW({ immediate: true })
}

// ★★★ DEXIE LOCK BREAKER ★★★
// Forzar liberación de IndexedDB locks ANTES de que Chrome destruya el contexto
import { db } from './db'

window.addEventListener('beforeunload', () => {
  try { db.close() } catch { /* silencioso */ }
})

window.addEventListener('pagehide', () => {
  try { db.close() } catch { /* silencioso */ }
})

// ════════════════════════════════════════════
// React mount — SIN StrictMode
// ★ StrictMode provoca double-mount en React 18,
//   disparando dos db.open() simultáneos que causan
//   un deadlock irrecuperable en Chrome V8/IndexedDB.
// ════════════════════════════════════════════
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { PowerSyncContext } from '@powersync/react'
import { powersync, setupPowerSync } from './powersync/db'

// Inicializar la sincronización y db local de PowerSync
setupPowerSync().catch(e => console.error('Error inicializando PowerSync:', e))

createRoot(document.getElementById('root')).render(
  <PowerSyncContext.Provider value={powersync}>
    <App />
  </PowerSyncContext.Provider>
)
