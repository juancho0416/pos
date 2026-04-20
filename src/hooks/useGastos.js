import { useMemo } from 'react'
import { useQuery } from '@powersync/react'
import { usePowerSync } from '@powersync/react'
import { useBranchFilterStore } from '../stores/useBranchFilterStore'

const CATEGORIAS = [
    { value: 'RENTA', label: 'Renta de Local', icon: '🏠', color: '#6366f1' },
    { value: 'NOMINA', label: 'Nómina / Sueldos', icon: '👥', color: '#8b5cf6' },
    { value: 'SERVICIOS', label: 'Servicios (Luz, Agua, Tel)', icon: '💡', color: '#f59e0b' },
    { value: 'FLETES', label: 'Fletes y Envíos', icon: '🚛', color: '#10b981' },
    { value: 'MANTENIMIENTO', label: 'Mantenimiento', icon: '🔧', color: '#ef4444' },
    { value: 'COMBUSTIBLE', label: 'Combustible', icon: '⛽', color: '#f97316' },
    { value: 'IMPUESTOS', label: 'Impuestos y SAT', icon: '🏛️', color: '#64748b' },
    { value: 'PUBLICIDAD', label: 'Publicidad', icon: '📢', color: '#ec4899' },
    { value: 'INSUMOS', label: 'Insumos de Oficina', icon: '📎', color: '#06b6d4' },
    { value: 'OTROS', label: 'Otros Gastos', icon: '📦', color: '#94a3b8' },
]

export { CATEGORIAS }

export function useGastos() {
    const powersync = usePowerSync()
    const { selectedBranch } = useBranchFilterStore()

    const branchFilter = selectedBranch !== 'all' ? `AND sucursal_id = ?` : ''
    const params = selectedBranch !== 'all' ? [selectedBranch] : []

    // Todos los gastos (últimos 90 días por defecto para no sobrecargar)
    const { data: gastos = [], isLoading } = useQuery(`
        SELECT * FROM gastos
        WHERE 1=1 ${branchFilter}
        ORDER BY fecha_gasto DESC, created_at DESC
        LIMIT 500
    `, params)

    // KPIs del mes actual
    const mesActual = useMemo(() => {
        const now = new Date()
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    }, [])

    const { data: kpiRows = [] } = useQuery(`
        SELECT 
            COUNT(*) as total_registros,
            IFNULL(SUM(monto), 0) as total_monto,
            categoria,
            SUM(monto) as cat_total
        FROM gastos
        WHERE fecha_gasto LIKE '${mesActual}%'
        ${branchFilter}
        GROUP BY categoria
        ORDER BY cat_total DESC
    `, params)

    const kpis = useMemo(() => {
        let totalMes = 0
        let topCategoria = { name: 'N/A', total: 0 }
        const porCategoria = {}

        kpiRows.forEach(row => {
            const catTotal = row.cat_total || 0
            totalMes += catTotal
            porCategoria[row.categoria] = catTotal
            if (catTotal > topCategoria.total) {
                topCategoria = { name: row.categoria, total: catTotal }
            }
        })

        const diasDelMes = new Date().getDate()
        const promedioDiario = diasDelMes > 0 ? totalMes / diasDelMes : 0

        return { totalMes, promedioDiario, topCategoria, porCategoria }
    }, [kpiRows])

    // Registrar un nuevo gasto
    const registrarGasto = async (gastoData) => {
        const id = crypto.randomUUID()
        const now = new Date().toISOString()

        await powersync.execute(
            `INSERT INTO gastos (id, sucursal_id, usuario_id, categoria, concepto, monto, metodo_pago, es_recurrente, proveedor, comprobante_ref, fecha_gasto, notas, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                gastoData.sucursal_id,
                gastoData.usuario_id,
                gastoData.categoria,
                gastoData.concepto,
                gastoData.monto,
                gastoData.metodo_pago,
                gastoData.es_recurrente ? 1 : 0,
                gastoData.proveedor || null,
                gastoData.comprobante_ref || null,
                gastoData.fecha_gasto,
                gastoData.notas || null,
                now
            ]
        )
        return id
    }

    // Eliminar gasto
    const eliminarGasto = async (id) => {
        await powersync.execute(`DELETE FROM gastos WHERE id = ?`, [id])
    }

    return {
        gastos,
        isLoading,
        kpis,
        registrarGasto,
        eliminarGasto,
        CATEGORIAS
    }
}
