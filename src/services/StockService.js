import { powersync } from '../powersync/db'

/**
 * Servicio de Acceso a Datos (DAL) para Inventario / Stock.
 * 100% offline-first: todas las escrituras van a PowerSync SQLite.
 * PowerSync se encarga de la sincronización con Supabase en background.
 */
export const StockService = {
    /**
     * Obtiene todos los productos con su inventario para una sucursal.
     * Lee desde PowerSync SQLite local (offline-first).
     */
    fetchInventory: async (sucursalId) => {
        try {
            const result = await powersync.execute(
                `SELECT p.id, p.nombre, p.sku, p.codigo_barras, p.imagen_url,
                        i.stock_actual, i.stock_minimo, i.id as inventory_id
                 FROM productos p
                 LEFT JOIN inventario i ON i.producto_id = p.id AND i.sucursal_id = ?
                 WHERE p.is_deleted IS NOT 1
                 ORDER BY p.nombre ASC`,
                [sucursalId]
            )
            const rows = result?.rows?._array || []
            return rows.map(p => ({
                id: p.id,
                stock_actual: p.stock_actual || 0,
                stock_minimo: p.stock_minimo || 5,
                inventory_id: p.inventory_id,
                producto: {
                    id: p.id,
                    nombre: p.nombre,
                    sku: p.sku,
                    codigo_barras: p.codigo_barras,
                    imagen_url: p.imagen_url
                }
            }))
        } catch (err) {
            console.error('Error fetchInventory desde PowerSync:', err)
            return []
        }
    },

    /**
     * Ajusta el stock de un producto (±N).
     * Escribe inventario Y kardex en PowerSync → se sube a Supabase automáticamente.
     * Funciona 100% offline.
     */
    adjustStock: async (item, amount, sucursalId) => {
        const newStock = Math.max(0, item.stock_actual + amount)

        await powersync.execute(
            `UPDATE inventario SET stock_actual = ?, updated_at = datetime('now')
             WHERE producto_id = ? AND sucursal_id = ?`,
            [newStock, item.id, sucursalId]
        )

        // Registrar el kardex en PowerSync — se sincroniza automáticamente con Supabase
        await powersync.execute(
            `INSERT INTO kardex (id, producto_id, sucursal_id, tipo_movimiento, cantidad,
             saldo_previo, saldo_nuevo, concepto, referencia_id, created_at)
             VALUES (?, ?, ?, 'AJUSTE', ?, ?, ?, 'Ajuste manual de stock', null, datetime('now'))`,
            [crypto.randomUUID(), item.id, sucursalId, Math.abs(amount), item.stock_actual, newStock]
        )

        return newStock
    },

    /**
     * Actualiza el stock mínimo de un producto.
     */
    updateMinStock: async (item, newMinStock, sucursalId) => {
        const val = parseInt(newMinStock)
        if (isNaN(val) || val < 0) return null

        await powersync.execute(
            `UPDATE inventario SET stock_minimo = ?, updated_at = datetime('now')
             WHERE producto_id = ? AND sucursal_id = ?`,
            [val, item.id, sucursalId]
        )

        return val
    }
}
