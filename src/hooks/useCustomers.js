// useCustomers.js — Hook para clientes con PowerSync
// Lee de PowerSync SQLite local. Reactivo en tiempo real.
import { useMemo, useCallback } from 'react'
import { useQuery } from '@powersync/react'
import { supabase } from '../supabaseClient'

export function useCustomers(selectedBranch) {
    // Lee clientes desde SQLite local de PowerSync
    // Filtra mayoristas para el POS
    const { data: rawCustomers } = useQuery(
        selectedBranch
            ? `SELECT id, nombre, telefono, email, sucursal_id, saldo_monedero, saldo_pendiente, limite_credito, rol
               FROM clientes 
               WHERE sucursal_id = ? AND (rol IS NULL OR rol != 'MAYORISTA')
               ORDER BY nombre ASC`
            : `SELECT id FROM clientes LIMIT 0`,
        selectedBranch ? [selectedBranch] : []
    )

    const customers = useMemo(() => rawCustomers || [], [rawCustomers])

    // Función de recarga: fuerza una re-query en Supabase y lo guarda en PowerSync
    // Útil después de que hay un cambio en monedero/saldo que queremos ver ya
    const reloadCustomers = useCallback(async () => {
        if (!navigator.onLine || !selectedBranch) return
        try {
            // PowerSync se actualiza solo, pero si el conector acaba de sincronizar
            // un cambio, el useQuery reactivo lo verá automáticamente.
            // Este callback existe solo por compatibilidad con useSaleTransaction.
            console.log('ℹ️ [PowerSync] Clientes se actualizan reactivamente. No se requiere reload manual.')
        } catch (e) {
            console.error('Error en reloadCustomers:', e)
        }
    }, [selectedBranch])

    return { customers, reloadCustomers }
}
