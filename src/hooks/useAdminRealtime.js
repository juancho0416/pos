import { useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useB2BAdminStore } from '../stores/useB2BAdminStore'
import { toast } from 'sonner'

export function useAdminRealtime(sucursalBodegaId) {
    const { setPedidos, addOrUpdatePedido, removePedido } = useB2BAdminStore()

    useEffect(() => {
        if (!sucursalBodegaId) return

        let isMounted = true

        // 1. Carga inicial de datos
        const fetchInitialOrders = async () => {
            try {
                const { data, error } = await supabase
                    .from('ventas')
                    .select('*')
                    .eq('sucursal_id', sucursalBodegaId)
                    .eq('tipo_venta', 'MAYOREO')
                    .order('created_at', { ascending: false }) // Los más recientes primero
                    .limit(50)

                if (error) throw error
                if (isMounted && data) {
                    setPedidos(data)
                }
            } catch (err) {
                console.error("Error fetching initial B2B orders:", err)
            }
        }

        fetchInitialOrders()

        // 2. Suscripción a Realtime
        const channel = supabase.channel('admin-bodega-ventas')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'ventas',
                    filter: `sucursal_id=eq.${sucursalBodegaId}`
                },
                (payload) => {
                    // Validar explícitamente el tipo de venta en cliente
                    if (payload.new && payload.new.tipo_venta !== 'MAYOREO') return

                    if (payload.eventType === 'INSERT') {
                        toast.success(`Nuevo pedido B2B recibido.`, { id: 'new-b2b' })
                        addOrUpdatePedido(payload.new)
                    } else if (payload.eventType === 'UPDATE') {
                        // El pedido cambió (ej. de PENDIENTE a EN_SURTIDO por nosotros u otro admin)
                        addOrUpdatePedido(payload.new)
                    } else if (payload.eventType === 'DELETE') {
                        removePedido(payload.old.id)
                    }
                }
            )
            .subscribe()

        return () => {
            isMounted = false
            supabase.removeChannel(channel)
        }
    }, [sucursalBodegaId, setPedidos, addOrUpdatePedido, removePedido])
}
