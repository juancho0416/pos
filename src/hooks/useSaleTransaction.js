import { useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { SalesService } from '../services/SalesService'

/**
 * Hook que encapsula toda la lógica transaccional de una venta:
 * validación, monedero, guardado local, sync nudge.
 */
export function useSaleTransaction({
    cart,
    calculateTotal,
    clearCart,
    branches,
    selectedBranch,
    customers,
    reloadCustomers,
    user,
    getCheckoutPayload,
    triggerSyncQueue,
}) {
    const [processing, setProcessing] = useState(false)
    const [lastSale, setLastSale] = useState(null)
    const processingRef = useRef(false)

    const handleConfirmSale = useCallback(async ({ onSuccess }) => {
        if (processingRef.current) return
        processingRef.current = true

        const payloadFromStore = getCheckoutPayload()

        if (payloadFromStore.metodo_pago === 'credito' && !payloadFromStore.cliente_id) {
            toast.error('Debes seleccionar un cliente para venta a crédito.')
            processingRef.current = false
            return
        }

        setProcessing(true)

        try {
            const total = calculateTotal()
            const branchName = branches.find(b => b.id == selectedBranch)?.nombre || 'General'

            toast.loading('Registrando venta...', { id: 'saleFlow' })

            // ── Cálculo de Monedero (cliente en contado) ──
            const porcentaje_monedero = 0.02
            const pagadoEfectivoNeto = Math.max(0, total - (payloadFromStore.monto_monedero_usado || 0))
            const nuevoAbono = (payloadFromStore.metodo_pago === 'contado' && payloadFromStore.cliente_id)
                ? pagadoEfectivoNeto * porcentaje_monedero
                : 0

            const ventaPayload = {
                id: crypto.randomUUID(),
                items: cart.map(item => ({
                    id: crypto.randomUUID(),
                    producto_id: item.id,
                    nombre: item.nombre,
                    cantidad: item.cantidad,
                    precio_unitario: item.selectedPrice
                })),
                sucursal_id: selectedBranch,
                total,
                vendedor_id: user?.id,
                usuario_id: user?.id,
                ...payloadFromStore,
                abono_monedero_generado: nuevoAbono
            }

            // 1. Guardar en PowerSync SQLite (local, instantáneo, offline-safe)
            await SalesService.guardarVentaLocal(ventaPayload, cart)

            // 2. Limpiar UI
            const newSale = {
                id: `LOCAL-${Date.now()}`,
                total,
                items: [...cart],
                method: payloadFromStore.metodo_pago,
                date: new Date().toLocaleString(),
                branchName,
                customerName: customers.find(c => c.id == payloadFromStore.cliente_id)?.nombre || 'General',
                monto_recibido: payloadFromStore.monto_recibido,
                cambio: payloadFromStore.cambio,
                usado_monedero: payloadFromStore.monto_monedero_usado,
                ganado_monedero: nuevoAbono
            }

            setLastSale(newSale)
            clearCart()
            onSuccess?.()

            // 3. Red
            if (!navigator.onLine) {
                toast.success('Venta guardada localmente (Offline)', { id: 'saleFlow' })
                return
            }

            toast.success('¡Cobro exitoso!', { id: 'saleFlow' })
            setTimeout(() => {
                try { triggerSyncQueue() } catch (e) { console.warn('Sync nudge error:', e) }
            }, 0)

        } catch (error) {
            toast.error('Error al registrar venta: ' + error.message, { id: 'saleFlow' })
            console.error('Error in handleConfirmSale:', error)
        } finally {
            processingRef.current = false
            setProcessing(false)
        }
    }, [cart, calculateTotal, clearCart, branches, selectedBranch, customers, user, getCheckoutPayload, triggerSyncQueue])

    return { processing, lastSale, handleConfirmSale }
}
