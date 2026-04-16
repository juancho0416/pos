// useShift.js — Hook para gestión de turnos con PowerSync
import { useMemo, useCallback } from 'react';
import { useQuery } from '@powersync/react';
import { powersync } from '../powersync/db';

export function useShift(selectedBranch, profileId) {
    // Lee el turno activo (sin fecha_fin) desde SQLite local de PowerSync
    const { data: turnosData } = useQuery(
        selectedBranch
            ? `SELECT id, sucursal_id, fecha_inicio, fecha_fin, monto_inicial, estado, usuario_id
               FROM turnos 
               WHERE sucursal_id = ? AND (fecha_fin IS NULL OR fecha_fin = '')
               ORDER BY fecha_inicio DESC LIMIT 1`
            : `SELECT id FROM turnos LIMIT 0`,
        selectedBranch ? [selectedBranch] : []
    )

    const activeTurno = turnosData?.[0] || null
    const isShiftOpen = !!activeTurno

    // ─── Ventas del día desde PowerSync SQLite (100% offline) ───
    const today = new Date().toISOString().split('T')[0]
    const { data: dailyData } = useQuery(
        selectedBranch
            ? `SELECT COALESCE(SUM(total), 0) as total_hoy
               FROM ventas
               WHERE sucursal_id = ? AND date(created_at) = ?`
            : `SELECT 0 as total_hoy`,
        selectedBranch ? [selectedBranch, today] : []
    )
    const dailyTotal = dailyData?.[0]?.total_hoy ?? 0

    // ─── Apertura de Turno ───
    const openShiftOffline = useCallback(async (payload) => {
        const shiftId = payload.id || crypto.randomUUID()
        await powersync.execute(
            `INSERT INTO turnos (id, sucursal_id, usuario_id, usuario, fecha_inicio, monto_inicial, estado, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                shiftId,
                payload.sucursal_id,
                payload.usuario_id || null,
                payload.usuario || 'Cajero',
                payload.fecha_inicio || new Date().toISOString(),
                payload.monto_inicial || 0,
                'abierto',
                new Date().toISOString()
            ]
        )
        // Guardar en localStorage como flag rápido para la UI
        localStorage.setItem(`shift_open_${selectedBranch}`, 'true')
        console.log(`✅ [PowerSync] Turno ${shiftId} abierto y en cola para Supabase.`)
    }, [selectedBranch])

    // ─── Cierre de Turno ───
    const closeShiftOffline = useCallback(async (shiftId, payload) => {
        const fechaFin = payload.fecha_fin || new Date().toISOString()
        await powersync.execute(
            `UPDATE turnos SET 
                fecha_fin = ?,
                estado = ?,
                monto_final_real = ?,
                total_ventas_efectivo = ?,
                total_ventas_tarjeta = ?,
                total_ventas_credito = ?,
                diferencia = ?
             WHERE id = ?`,
            [
                fechaFin,
                payload.estado || 'cerrado',
                payload.monto_final_real || 0,
                payload.total_ventas_efectivo || 0,
                payload.total_ventas_tarjeta || 0,
                payload.total_ventas_credito || 0,
                payload.diferencia || 0,
                shiftId
            ]
        )
        localStorage.setItem(`shift_open_${selectedBranch}`, 'false')
        console.log(`✅ [PowerSync] Turno ${shiftId} cerrado y en cola para Supabase.`)
    }, [selectedBranch])

    return {
        isShiftOpen,
        dailyTotal,
        activeTurno,
        openShiftOffline,
        closeShiftOffline
    }
}
