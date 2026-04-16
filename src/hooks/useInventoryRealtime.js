import { useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useProductStore } from '../stores/useProductStore'
import { toast } from 'sonner' // Para una pequeña alerta opcional interactiva

export function useInventoryRealtime(selectedBranch) {
    const updateProductStock = useProductStore(state => state.updateProductStock)
    const channelRef = useRef(null)

    useEffect(() => {
        // Validación de seguridad para no levantar canales basura si no hay sucursal
        if (!selectedBranch) return

        // 1. Crear conexión explícita al topic 'public:inventario'
        const channel = supabase.channel(`inventario_branch_${selectedBranch}`)

        channel
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',             // Nos interesan ventas, traspasos, etc.
                    schema: 'public',
                    table: 'inventario',
                    filter: `sucursal_id=eq.${selectedBranch}` // FILTRO CLAVE: Solo mi sucursal
                },
                (payload) => {
                    // 2. Extraer datos del evento Websocket
                    const { producto_id, stock_actual } = payload.new

                    // 3. Acción Inmediata: Inyectar dato actualizado en el catálogo en RAM (Zustand)
                    updateProductStock(producto_id, stock_actual)

                    // (Opcional) Pequeña ayuda visual en modo debug
                    // console.log(`⚡ [Realtime] Producto ${producto_id} actualizado. Nuevo stock: ${stock_actual}`)
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`🔌 [Realtime] Suscrito a cambios de inventario (Sucursal: ${selectedBranch})`)
                }
                if (status === 'CHANNEL_ERROR') {
                    if (navigator.onLine) {
                        console.error('❌ [Realtime] Error conectando al canal de inventario.')
                    }
                }
            })

        channelRef.current = channel

        // 4. CLEANUP: Apagar WebSocket al desmontar o al cambiar de sucursal
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
                console.log(`🔌 [Realtime] Desconectado del canal de inventario.`)
            }
        }
    }, [selectedBranch, updateProductStock])
}
