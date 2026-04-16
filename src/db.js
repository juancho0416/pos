// db.js — Base de datos local con Dexie (IndexedDB)
// Offline-First: la app lee de aquí, no directamente de Supabase
import Dexie from 'dexie'

export const db = new Dexie('FerreteriaPOS')

db.version(6).stores({
    // Catálogo local (sincronizado desde Supabase)
    productos: 'id, nombre, sku, codigo_barras, sucursal_id, categoria, precio_menudeo, precio_mayoreo, stock',
    sucursales: 'id, nombre',
    clientes: 'id, nombre, telefono, sucursal_id, saldo_monedero, saldo_pendiente, sync_pending',
    cotizaciones: 'id, cliente_id, total, items, fecha, sync_pending',
    turnos: 'id, sucursal_id, fecha_fin',

    // Cola de sincronización (ventas pendientes de subir)
    sync_queue: '++localId, type, status, createdAt',

    // Cola offline robusta (reemplaza localStorage)
    offline_queue: '++id, status, timestamp, retryCount',

    // Sesión de Carrito Activo (Auto-Save no bloqueante)
    cart_cache: 'id' // id = nombre de la sucursal (ej: shopping_cart_1)
})

// ════════════════════════════════════════════════════════════
// ★ PROTOCOLO AVE FÉNIX: safeDexieQuery con destrucción de DB
//   Si Chrome tiene un Ghost Lock irrecuperable:
//   1. Timeout de 3s → detecta el deadlock
//   2. Destruye la DB corrupta con db.delete()
//   3. Fuerza reload → la DB renace limpia en el siguiente ciclo
//   4. El SyncProvider re-descargará el catálogo desde Supabase
// ════════════════════════════════════════════════════════════
export const safeDexieQuery = async (queryPromise, fallbackValue = [], timeoutMs = 3000) => {
    return Promise.race([
        queryPromise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('DEXIE_TIMEOUT')), timeoutMs)
        )
    ]).catch(async (err) => {
        if (err.message === 'DEXIE_TIMEOUT') {
            console.error('🔥 Deadlock irrecuperable en Chrome. Ejecutando Protocolo Ave Fénix...')
            try {
                // 1. Destruir la base de datos corrupta desde la raíz
                await db.delete()
                console.warn('💀 Base de datos destruida. Reiniciando sistema...')
                // 2. Recargar — la DB renacerá limpia y el catálogo se re-descargará
                window.location.reload()
            } catch (deleteErr) {
                console.error('Fallo al destruir la DB corrupta:', deleteErr)
                // Último recurso: pedir al usuario que borre datos manualmente
                try {
                    const dbs = await indexedDB.databases()
                    for (const dbInfo of dbs) {
                        indexedDB.deleteDatabase(dbInfo.name)
                    }
                } catch {
                    // Ignorar
                }
                window.location.reload()
            }
            // Retornar promesa que nunca resuelve (estamos recargando)
            return new Promise(() => { })
        }

        // Error normal de Dexie (no timeout) → retornar fallback
        console.warn('⚠️ Dexie error (usando fallback):', err.message)
        return fallbackValue
    })
}
