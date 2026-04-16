import { useMemo } from 'react'
import { useQuery } from '@powersync/react'
import { useBranchFilterStore } from '../stores/useBranchFilterStore'

/**
 * Hook que encapsula la obtención de datos del Dashboard desde SQLite Local.
 * Altamente veloz, permite funcionamiento 100% offline y tiempo de carga < 50ms.
 * 
 * v2: Incluye comparativa vs periodo anterior, stock muerto y filtro global.
 */
export function useDashboardData(branches) {
    const { selectedBranch, setSelectedBranch } = useBranchFilterStore()

    const now = new Date()
    const [startDate, setStartDate] = useDateState(() => {
        const d = new Date(); d.setDate(d.getDate() - 7)
        return d.toISOString().split('T')[0]
    })
    const [endDate, setEndDate] = useDateState(() => now.toISOString().split('T')[0])

    const branchFilter = selectedBranch !== 'all' ? `AND v.sucursal_id = ?` : ''
    const branchFilterInvCli = selectedBranch !== 'all' ? `WHERE sucursal_id = ?` : ''

    const salesParams = selectedBranch !== 'all' ? [selectedBranch] : []
    const invCliParams = selectedBranch !== 'all' ? [selectedBranch] : []

    // ═══════════════════════════════════════════════════
    // Periodo Actual
    // ═══════════════════════════════════════════════════
    const { data: salesData = [], isLoading: loadingSales } = useQuery(`
        SELECT v.*, s.nombre as sucursal_nombre
        FROM ventas v
        LEFT JOIN sucursales s ON s.id = v.sucursal_id
        WHERE v.created_at >= '${startDate}T00:00:00.000Z' 
          AND v.created_at <= '${endDate}T23:59:59.999Z'
        ${branchFilter}
    `, salesParams)

    // ═══════════════════════════════════════════════════
    // Periodo Anterior (misma duración, desplazado hacia atrás)
    // ═══════════════════════════════════════════════════
    const { prevStart, prevEnd } = useMemo(() => {
        const s = new Date(`${startDate}T12:00:00`)
        const e = new Date(`${endDate}T12:00:00`)
        const diffMs = e.getTime() - s.getTime()
        const ps = new Date(s.getTime() - diffMs - 86400000)
        const pe = new Date(s.getTime() - 86400000)
        return {
            prevStart: ps.toISOString().split('T')[0],
            prevEnd: pe.toISOString().split('T')[0]
        }
    }, [startDate, endDate])

    const { data: prevSalesData = [] } = useQuery(`
        SELECT total, metodo_pago
        FROM ventas
        WHERE created_at >= '${prevStart}T00:00:00.000Z' 
          AND created_at <= '${prevEnd}T23:59:59.999Z'
        ${branchFilter}
    `, salesParams)

    // ═══════════════════════════════════════════════════
    // Inventario, Clientes, Productos
    // ═══════════════════════════════════════════════════
    const { data: inventoryData = [], isLoading: loadingInv } = useQuery(`
        SELECT stock_actual, stock_minimo FROM inventario
        ${branchFilterInvCli}
    `, invCliParams)

    const { data: clientsData = [], isLoading: loadingCli } = useQuery(`
        SELECT saldo_pendiente FROM clientes
        ${branchFilterInvCli}
    `, invCliParams)

    const { data: topProductsRows = [], isLoading: loadingProducts } = useQuery(`
        SELECT 
            vd.producto_id,
            p.nombre,
            SUM(vd.cantidad) as volume,
            SUM(IFNULL(vd.subtotal, vd.precio_unitario * vd.cantidad)) as origin_revenue,
            SUM(vd.cantidad * IFNULL(IFNULL(p.costo_promedio, p.costo_ultimo), 0)) as total_cost
        FROM venta_detalles vd
        JOIN ventas v ON v.id = vd.venta_id
        LEFT JOIN productos p ON p.id = vd.producto_id
        WHERE v.created_at >= '${startDate}T00:00:00.000Z' 
          AND v.created_at <= '${endDate}T23:59:59.999Z'
        ${branchFilter}
        GROUP BY vd.producto_id
    `, salesParams)

    // ═══════════════════════════════════════════════════
    // Stock Muerto: Productos con inventario > 0 que NO se han vendido en 6+ meses
    // ═══════════════════════════════════════════════════
    const sixMonthsAgo = useMemo(() => {
        const d = new Date(); d.setMonth(d.getMonth() - 6)
        return d.toISOString()
    }, [])

    const branchFilterDead = selectedBranch !== 'all' ? `AND i.sucursal_id = ?` : ''
    const deadParams = selectedBranch !== 'all' ? [sixMonthsAgo, selectedBranch] : [sixMonthsAgo]

    const { data: deadStockRows = [] } = useQuery(`
        SELECT 
            p.nombre,
            p.sku,
            i.stock_actual,
            IFNULL(p.costo_promedio, 0) as costo_promedio,
            (i.stock_actual * IFNULL(p.costo_promedio, 0)) as valor_muerto
        FROM inventario i
        JOIN productos p ON p.id = i.producto_id
        WHERE i.stock_actual > 0
        ${branchFilterDead}
        AND i.producto_id NOT IN (
            SELECT DISTINCT vd.producto_id
            FROM venta_detalles vd
            JOIN ventas v ON v.id = vd.venta_id
            WHERE v.created_at >= ?
        )
        ORDER BY valor_muerto DESC
        LIMIT 5
    `, [...(selectedBranch !== 'all' ? [selectedBranch] : []), sixMonthsAgo])

    const loading = loadingSales || loadingInv || loadingCli || loadingProducts

    // ═══════════════════════════════════════════════════
    // Procesar KPIs, Comparativas y Gráficos
    // ═══════════════════════════════════════════════════
    const computed = useMemo(() => {
        let totalSales = 0, totalCobrado = 0
        
        salesData.forEach(s => {
            if (s.metodo_pago !== 'abono') totalSales += (s.total || 0)
            if (s.metodo_pago !== 'credito') totalCobrado += (s.total || 0)
        })

        // Periodo anterior
        let prevTotalSales = 0, prevTicketCount = 0
        prevSalesData.forEach(s => {
            if (s.metodo_pago !== 'abono') prevTotalSales += (s.total || 0)
            prevTicketCount++
        })
        const prevTicketPromedio = prevTicketCount > 0 ? (prevTotalSales / prevTicketCount) : 0

        // Comparativas %
        const salesChangePercent = prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales) * 100 : null

        const pendiente = clientsData.reduce((sum, c) => sum + (c.saldo_pendiente || 0), 0)
        const lowStock = inventoryData.filter(i => (i.stock_actual || 0) < (i.stock_minimo || 5)).length

        const ticketCount = salesData.length
        const ticketPromedio = ticketCount > 0 ? (totalSales / ticketCount) : 0
        const ticketChangePercent = prevTicketPromedio > 0 ? ((ticketPromedio - prevTicketPromedio) / prevTicketPromedio) * 100 : null

        let totalRevenue = 0, totalCost = 0
        topProductsRows.forEach(p => {
             totalRevenue += (p.origin_revenue || 0)
             totalCost += (p.total_cost || 0)
        })
        const margenBruto = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0

        const topProductsVolume = [...topProductsRows].sort((a,b) => b.volume - a.volume).slice(0, 5)
        const topProductsProfit = [...topProductsRows].map(p => ({
            ...p,
            profit: (p.origin_revenue || 0) - (p.total_cost || 0)
        })).sort((a,b) => b.profit - a.profit).slice(0, 5)

        // Valor del stock muerto
        const totalDeadValue = deadStockRows.reduce((sum, d) => sum + (d.valor_muerto || 0), 0)

        // Chart data
        const chartMap = {}
        const dStart = new Date(`${startDate}T12:00:00`)
        const dEnd = new Date(`${endDate}T12:00:00`)
        const daysDiff = Math.abs(Math.round((dEnd - dStart) / (1000 * 60 * 60 * 24)))

        if (daysDiff <= 31) {
            for (let i = 0; i <= daysDiff; i++) {
                const d = new Date(dStart); d.setDate(d.getDate() + i)
                const dateStr = d.toISOString().split('T')[0]
                chartMap[dateStr] = { name: d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }) }
                branches.forEach(b => { chartMap[dateStr][b.nombre] = 0 })
            }
        }

        salesData.forEach(s => {
            const date = s.created_at.split('T')[0]
            if (!chartMap[date]) {
                const d = new Date(`${date}T12:00:00`)
                chartMap[date] = { name: d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }) }
                branches.forEach(b => { chartMap[date][b.nombre] = 0 })
            }
            const branchName = s.sucursal_nombre || 'Desconocida'
            if (chartMap[date][branchName] === undefined) chartMap[date][branchName] = 0
            chartMap[date][branchName] += (s.total || 0)
        })

        return {
            dailySales: totalSales,
            cobrado: totalCobrado,
            porCobrar: pendiente,
            lowStockCount: lowStock,
            ticketPromedio,
            margenBruto,
            topProductsVolume,
            topProductsProfit,
            // Comparativas
            salesChangePercent,
            ticketChangePercent,
            prevTotalSales,
            // Stock Muerto
            deadStock: deadStockRows,
            totalDeadValue,
            // Chart
            chartData: Object.keys(chartMap).sort().map(key => chartMap[key])
        }
    }, [salesData, prevSalesData, inventoryData, clientsData, topProductsRows, deadStockRows, startDate, endDate, branches])

    return {
        ...computed,
        loading, salesData,
        selectedBranch, setSelectedBranch,
        startDate, setStartDate, endDate, setEndDate,
    }
}

// Mini hook para estado con date
import { useState } from 'react'
function useDateState(init) { return useState(init) }
