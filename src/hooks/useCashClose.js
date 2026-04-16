import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { powersync } from '../powersync/db'
import { toast } from 'sonner'
import { useAuth } from '../context/AuthContext'

/**
 * Hook que encapsula toda la lógica de Corte de Caja (Offline-First)
 */
export function useCashClose(selectedBranch) {
    const { user } = useAuth()
    const [activeTurn, setActiveTurn] = useState(null)
    const [loading, setLoading] = useState(false)
    const [closing, setClosing] = useState(false)
    const [initialCash, setInitialCash] = useState('')
    const [physicalCash, setPhysicalCash] = useState('')
    const [totals, setTotals] = useState({ efectivo: 0, tarjeta: 0, credito: 0, ventasCount: 0 })
    const [showConfirmClose, setShowConfirmClose] = useState(false)
    const [confirmData, setConfirmData] = useState(null)

    const fetchTurnDetails = useCallback(async (turn) => {
        try {
            let allSales = []

            // Leer ventas del turno desde PowerSync SQLite local
            const localSalesResult = await powersync.execute(
                `SELECT total, metodo_pago FROM ventas WHERE sucursal_id = ? AND created_at >= ?`,
                [selectedBranch, turn.fecha_inicio]
            )
            const localSales = localSalesResult?.rows?._array || []

            // Si hay conexión, primar los datos de Supabase
            if (navigator.onLine) {
                const { data } = await supabase
                    .from('ventas')
                    .select('total, created_at, metodo_pago')
                    .eq('sucursal_id', selectedBranch)
                    .gte('created_at', turn.fecha_inicio)
                allSales = data || localSales
            } else {
                allSales = localSales
            }

            setTotals({
                efectivo: allSales.filter(s => s.metodo_pago === 'contado').reduce((a, c) => a + c.total, 0),
                tarjeta: allSales.filter(s => s.metodo_pago === 'tarjeta').reduce((a, c) => a + c.total, 0),
                credito: allSales.filter(s => s.metodo_pago === 'credito').reduce((a, c) => a + c.total, 0),
                ventasCount: allSales.length
            })
        } catch (err) {
            console.error('Error no crítico en fetchTurnDetails:', err)
        }
    }, [selectedBranch])

    const checkActiveTurn = useCallback(async () => {
        setLoading(true)
        try {
            // Leer turno activo desde PowerSync SQLite local
            const result = await powersync.execute(
                `SELECT * FROM turnos WHERE sucursal_id = ? AND (fecha_fin IS NULL OR fecha_fin = '') ORDER BY fecha_inicio DESC LIMIT 1`,
                [selectedBranch]
            )
            const openShift = result?.rows?._array?.[0] || null

            if (openShift) {
                setActiveTurn(openShift)
                fetchTurnDetails(openShift)
            } else {
                // Fallback remoto si PowerSync no ha sincronizado aún
                if (navigator.onLine) {
                    const { data } = await supabase
                        .from('turnos').select('*')
                        .eq('sucursal_id', selectedBranch)
                        .is('fecha_fin', null)
                        .order('fecha_inicio', { ascending: false }).limit(1)

                    if (data && data.length > 0) {
                        setActiveTurn(data[0])
                        fetchTurnDetails(data[0])
                    } else {
                        setActiveTurn(null)
                        setTotals({ efectivo: 0, tarjeta: 0, credito: 0, ventasCount: 0 })
                    }
                } else {
                    setActiveTurn(null)
                    setTotals({ efectivo: 0, tarjeta: 0, credito: 0, ventasCount: 0 })
                }
            }
        } catch (err) {
            console.error('Excepción en checkActiveTurn:', err)
        }
        setLoading(false)
    }, [selectedBranch, fetchTurnDetails])

    useEffect(() => { if (selectedBranch) checkActiveTurn() }, [checkActiveTurn])

    const handleOpenTurn = useCallback(async (e) => {
        e.preventDefault()
        if (!initialCash) { toast.error('Ingresa el monto inicial'); return }

        const shiftId = crypto.randomUUID()
        const now = new Date().toISOString()

        try {
            // Verificar si ya hay un turno abierto en PowerSync SQLite
            const result = await powersync.execute(
                `SELECT id FROM turnos WHERE sucursal_id = ? AND (fecha_fin IS NULL OR fecha_fin = '') LIMIT 1`,
                [selectedBranch]
            )
            if (result?.rows?._array?.length > 0) {
                toast.warning('\u26a0\ufe0f Ya hay un turno abierto en esta sucursal.')
                checkActiveTurn(); return
            }

            await powersync.execute(
                `INSERT INTO turnos (id, sucursal_id, usuario_id, usuario, fecha_inicio, monto_inicial, estado, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [shiftId, selectedBranch, user?.id || null, user?.email || 'Cajero', now, parseFloat(initialCash), 'abierto', now]
            )

            toast.success('Turno abierto correctamente')
            setInitialCash('')
            checkActiveTurn()
        } catch (err) {
            toast.error('Error abriendo turno: ' + err.message)
        }
    }, [initialCash, selectedBranch, checkActiveTurn, user])

    const handleCloseTurn = useCallback(() => {
        if (!physicalCash) { toast.error('Ingresa el efectivo físico que contaste'); return }
        const fisico = parseFloat(physicalCash)
        const esperado = (activeTurn.monto_inicial || 0) + totals.efectivo
        setConfirmData({ fisico, esperado, diferencia: fisico - esperado })
        setShowConfirmClose(true)
    }, [physicalCash, activeTurn, totals])

    const executeCloseTurn = useCallback(async () => {
        if (!confirmData || !activeTurn) return
        setClosing(true); setShowConfirmClose(false)

        try {
            await powersync.execute(
                `UPDATE turnos SET fecha_fin = ?, estado = ?, monto_final_real = ?, total_ventas_efectivo = ?, total_ventas_tarjeta = ?, total_ventas_credito = ?, diferencia = ? WHERE id = ?`,
                [
                    new Date().toISOString(), 'cerrado', confirmData.fisico,
                    totals.efectivo, totals.tarjeta, totals.credito, confirmData.diferencia,
                    activeTurn.id
                ]
            )

            toast.success('\u2705 Turno cerrado correctamente')
            checkActiveTurn()
            setInitialCash(''); setPhysicalCash(''); setConfirmData(null)
        } catch (err) {
            console.error('Error executeCloseTurn:', err);
            toast.error('Error al cerrar: ' + err.message, { duration: 5000 })
        } finally { setClosing(false) }
    }, [confirmData, totals, checkActiveTurn, activeTurn])

    const handleForceClose = useCallback(async () => {
        const result = await powersync.execute(
            `SELECT id FROM turnos WHERE sucursal_id = ? AND (fecha_fin IS NULL OR fecha_fin = '')`,
            [selectedBranch]
        )
        const openTurns = result?.rows?._array || []
        const count = openTurns.length

        if (count === 0) {
            toast.info('No hay turnos locales abiertos detectados.')
            return
        }

        toast.warning(`Cerrando ${count} turno(s) de forma forzada...`)
        setClosing(true)
        try {
            for (const t of openTurns) {
                await powersync.execute(
                    `UPDATE turnos SET fecha_fin = ?, estado = ?, monto_final_real = 0, diferencia = 0 WHERE id = ?`,
                    [new Date().toISOString(), 'cerrado', t.id]
                )
            }
            toast.success('\u2705 Turno(s) cerrado(s) forzosamente')
            checkActiveTurn(); setInitialCash(''); setPhysicalCash('')
        } catch (err) {
            toast.error('Error al forzar cierre: ' + err.message)
        } finally { setClosing(false) }
    }, [selectedBranch, checkActiveTurn])

    return {
        activeTurn, loading, closing, totals,
        initialCash, setInitialCash, physicalCash, setPhysicalCash,
        showConfirmClose, setShowConfirmClose, confirmData,
        handleOpenTurn, handleCloseTurn, executeCloseTurn, handleForceClose,
    }
}
