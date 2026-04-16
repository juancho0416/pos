import { create } from 'zustand'

export const useB2BAdminStore = create((set, get) => ({
    pedidosNuevos: [],
    pedidosEnSurtido: [],
    pedidosListos: [],

    // UI State
    selectedOrder: null,
    isModalOpen: false,

    setPedidos: (pedidos) => {
        set({
            pedidosNuevos: pedidos.filter(p => p.estado_entrega === 'PENDIENTE'),
            pedidosEnSurtido: pedidos.filter(p => p.estado_entrega === 'EN_SURTIDO'),
            pedidosListos: pedidos.filter(p => p.estado_entrega === 'ENTREGADO' || p.estado_entrega === 'LISTO' || p.estado_entrega === 'LISTO_PARA_RUTA')
        })
    },

    // Añade un pedido recibido por Realtime a la columna correspondiente
    addOrUpdatePedido: (pedido) => set((state) => {
        // Primero remover de cualquier lado para evitar duplicados si cambió de estado
        const removedNuevos = state.pedidosNuevos.filter(p => p.id !== pedido.id)
        const removedSurtido = state.pedidosEnSurtido.filter(p => p.id !== pedido.id)
        const removedListos = state.pedidosListos.filter(p => p.id !== pedido.id)

        const newState = {
            pedidosNuevos: removedNuevos,
            pedidosEnSurtido: removedSurtido,
            pedidosListos: removedListos
        }

        if (pedido.estado_entrega === 'PENDIENTE') newState.pedidosNuevos.unshift(pedido)
        else if (pedido.estado_entrega === 'EN_SURTIDO') newState.pedidosEnSurtido.unshift(pedido)
        else if (pedido.estado_entrega === 'ENTREGADO' || pedido.estado_entrega === 'LISTO' || pedido.estado_entrega === 'LISTO_PARA_RUTA') newState.pedidosListos.unshift(pedido)

        return newState
    }),

    // Remueve un pedido por ID si fue eliminado de la DB
    removePedido: (id) => set((state) => ({
        pedidosNuevos: state.pedidosNuevos.filter(p => p.id !== id),
        pedidosEnSurtido: state.pedidosEnSurtido.filter(p => p.id !== id),
        pedidosListos: state.pedidosListos.filter(p => p.id !== id)
    })),

    // Modal helpers
    openOrderModal: (pedido) => set({ selectedOrder: pedido, isModalOpen: true }),
    closeOrderModal: () => set({ selectedOrder: null, isModalOpen: false })
}))
