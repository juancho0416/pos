// SalesService.js — Servicio de ventas con PowerSync
// Escribe la venta en el SQLite local de PowerSync.
// PowerSync automáticamente detecta el INSERT y lo sube a Supabase.
import { powersync } from '../powersync/db'
import { useProductStore } from '../stores/useProductStore'

export const SalesService = {
    /**
     * Guarda una venta en PowerSync (SQLite local).
     * PowerSync se encarga de subir a Supabase cuando hay red.
     * Los detalles también se insertan como filas en venta_detalles.
     */
    guardarVentaLocal: async (ventaPayload, cartContext) => {
        const {
            id,
            sucursal_id,
            vendedor_id,
            usuario_id,
            cliente_id,
            total,
            metodo_pago,
            metodo_entrega,
            direccion_entrega,
            telefono_entrega,
            estado_entrega,
            monto_recibido,
            monto_monedero_usado,
            abono_monedero_generado,
            items,
            cupon_id,
            monto_cupon_usado
        } = ventaPayload

        // 1. Insertar cabecera de venta en PowerSync SQLite
        // SupabaseConnector.uploadData() ejecutará la lógica de negocio (kardex, inventario)
        // al momento de subir esta fila a Supabase.
        // Serializar ítems como JSON — SupabaseConnector los lee para hacer kardex e inventario
        const itemsForKardex = (items || cartContext || []).map(item => ({
            producto_id: item.producto_id || item.id,
            nombre: item.nombre,
            cantidad: item.cantidad,
            precio_unitario: item.precio_unitario || item.selectedPrice
        }))

        await powersync.execute(
            `INSERT INTO ventas (
                id, sucursal_id, vendedor_id, usuario_id, cliente_id,
                total, metodo_pago, metodo_entrega, direccion_entrega, telefono_entrega,
                estado_entrega, monto_recibido, monto_monedero_usado, abono_monedero_generado,
                items_json, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                sucursal_id,
                vendedor_id || null,
                usuario_id || null,
                cliente_id || null,
                total,
                metodo_pago,
                metodo_entrega || 'MOSTRADOR',
                direccion_entrega || null,
                telefono_entrega || null,
                estado_entrega || null,
                monto_recibido || null,
                monto_monedero_usado || 0,
                abono_monedero_generado || 0,
                JSON.stringify(itemsForKardex),  // ← clave: ítems para kardex/inventario
                new Date().toISOString()
            ]
        )

        // 2. Insertar cada detalle como fila en venta_detalles
        for (const item of (items || cartContext || [])) {
            await powersync.execute(
                `INSERT INTO venta_detalles (id, venta_id, producto_id, nombre, cantidad, precio_unitario, subtotal)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [
                    item.id || crypto.randomUUID(),
                    id,
                    item.producto_id || item.id,
                    item.nombre,
                    item.cantidad,
                    item.precio_unitario || item.selectedPrice,
                    (item.cantidad * (item.precio_unitario || item.selectedPrice))
                ]
            )
        }

        // 3. UI Optimista: Actualizar Zustand inmediatamente para que el stock baje al instante
        for (const item of (cartContext || [])) {
            try {
                const stateProd = useProductStore.getState().productos.find(p => p.id === item.id)
                if (stateProd) {
                    const newStock = Math.max(0, (stateProd.stock || 0) - item.cantidad)
                    useProductStore.getState().updateProductStock(item.id, newStock)
                }
            } catch { /* ignorar errores de Zustand */ }
        }

        // 4. Canjear cupón si fue aplicado
        if (cupon_id) {
            await powersync.execute(
                `UPDATE cupones SET estado = 'CANJEADO', monto_disponible = 0 WHERE id = ?`,
                [cupon_id]
            ).catch(e => console.warn('No se pudo marcar cupón como canjeado:', e))
        }

        console.log(`📝 [PowerSync] Venta ${id} guardada en SQLite local. Se subirá a Supabase automáticamente.`)
        return id
    }
}
