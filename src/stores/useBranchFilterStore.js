import { create } from 'zustand'

/**
 * Store global de filtro de sucursal.
 * Persiste la selección en sessionStorage para que al navegar entre
 * Dashboard → Historial → Inventario, el usuario no pierda su filtro.
 */
export const useBranchFilterStore = create((set) => ({
    selectedBranch: sessionStorage.getItem('global_branch_filter') || 'all',
    setSelectedBranch: (branch) => {
        sessionStorage.setItem('global_branch_filter', branch)
        set({ selectedBranch: branch })
    }
}))
