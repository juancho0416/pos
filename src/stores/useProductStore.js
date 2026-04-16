// useProductStore.js — Zustand store para productos
// CERO Dexie en el render path. Inmune al Ghost Lock de Chrome.
// Los productos viven en PowerSync SQLite — NO se persisten en localStorage.
import { create } from 'zustand'

export const useProductStore = create(
    (set) => ({
        productos: [],
        isLoading: true,
        error: null,

        setProductos: (data) => set({ productos: data, isLoading: false, error: null }),
        setLoading: (loading) => set({ isLoading: loading }),
        setError: (error) => set({ error, isLoading: false }),
        clearProductos: () => set({ productos: [], isLoading: true }),

        // Acción atómica para actualizar stock en tiempo real
        updateProductStock: (productoId, nuevoStock) => set((state) => ({
            productos: state.productos.map(p =>
                p.id === productoId ? { ...p, stock: nuevoStock } : p
            )
        })),
    })
)
