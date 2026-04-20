/**
 * Servicio para exportar datos del dashboard a Excel.
 */
export async function exportSalesToExcel(salesData, { selectedBranch, branches, startDate, endDate }) {
    if (salesData.length === 0) {
        alert('No hay ventas en este periodo para exportar.')
        return
    }

    const headers = ['Folio', 'Fecha', 'Cliente', 'Sucursal', 'Método de Pago', 'Total']

    const dataRows = salesData.map(s => [
        s.id,
        new Date(s.created_at).toLocaleString('es-MX'),
        s.clientes?.nombre || 'Público General',
        s.sucursales?.nombre || 'General',
        s.metodo_pago ? s.metodo_pago.toUpperCase() : 'EFECTIVO',
        s.total
    ])

    const XLSX = (await import('xlsx-js-style')).default || await import('xlsx-js-style')
    const { saveAs } = await import('file-saver')

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])

    ws['!cols'] = [
        { wch: 10 }, { wch: 22 }, { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 15 }
    ]

    const borderStyle = {
        top: { style: 'thin', color: { rgb: "D1D5DB" } },
        bottom: { style: 'thin', color: { rgb: "D1D5DB" } },
        left: { style: 'thin', color: { rgb: "D1D5DB" } },
        right: { style: 'thin', color: { rgb: "D1D5DB" } }
    }

    const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E40AF" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: borderStyle
    }

    const rowStyleNormal = { border: borderStyle }
    const rowStyleAlt = { fill: { fgColor: { rgb: "F1F5F9" } }, border: borderStyle }

    for (let R = 0; R <= dataRows.length; ++R) {
        for (let C = 0; C < headers.length; ++C) {
            const cellRef = XLSX.utils.encode_cell({ r: R, c: C })
            if (!ws[cellRef]) continue

            if (R === 0) {
                ws[cellRef].s = headerStyle
            } else {
                ws[cellRef].s = (R % 2 === 0) ? rowStyleAlt : rowStyleNormal
                if (C === 0 || C === 5) {
                    ws[cellRef].s = { ...ws[cellRef].s, alignment: { horizontal: "center" } }
                }
                if (C === 5) ws[cellRef].z = '"$"#,##0.00'
            }
        }
    }

    XLSX.utils.book_append_sheet(wb, ws, "Ventas")
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' })

    // Para futuras exportaciones en este fichero, podemos extraer la lógica de XLS a un helper local si se requiere, de momento exportSalesToExcel queda intacta
    const branchName = selectedBranch === 'all' ? 'Todas' : (branches.find(b => b.id == selectedBranch)?.nombre || 'Sucursal')
    saveAs(data, `Reporte_Ventas_${branchName.replace(/\s+/g, '_')}_${startDate}_al_${endDate}.xlsx`)
}

export async function exportInventoryToExcel(powersync, { selectedBranch, branches }) {
    const branchFilter = selectedBranch !== 'all' ? `WHERE i.sucursal_id = ?` : ''
    const params = selectedBranch !== 'all' ? [selectedBranch] : []

    const inventoryData = await powersync.getAll(`
        SELECT p.nombre, p.sku, i.stock_actual, i.stock_minimo, p.costo_promedio, s.nombre as sucursal_nombre
        FROM inventario i
        JOIN productos p ON p.id = i.producto_id
        LEFT JOIN sucursales s ON s.id = i.sucursal_id
        ${branchFilter}
        ORDER BY i.stock_actual DESC
    `, params)

    if (inventoryData.length === 0) {
        alert('No hay inventario para exportar.')
        return
    }

    const headers = ['SKU', 'Producto', 'Sucursal', 'Stock Actual', 'Stock Mínimo', 'Costo Promedio', 'Valoración Total']
    const dataRows = inventoryData.map(i => [
        i.sku || 'N/A',
        i.nombre || 'Desconocido',
        i.sucursal_nombre || 'General',
        i.stock_actual || 0,
        i.stock_minimo || 0,
        i.costo_promedio || 0,
        (i.stock_actual || 0) * (i.costo_promedio || 0)
    ])

    await buildAndSaveExcel(headers, dataRows, 'Valoracion_Inventario')
}

export async function exportPurchasesToExcel(powersync, { startDate, endDate }) {
    const purchasesData = await powersync.getAll(`
        SELECT oc.*, p.nombre as proveedor_nombre 
        FROM ordenes_compra oc
        LEFT JOIN proveedores p ON p.id = oc.proveedor_id
        WHERE oc.fecha_creacion >= ? AND oc.fecha_creacion <= ?
        ORDER BY oc.fecha_creacion DESC
    `, [`${startDate}T00:00:00.000Z`, `${endDate}T23:59:59.999Z`])
    
    if (purchasesData.length === 0) {
        alert('No hay compras en este periodo para exportar.')
        return
    }

    const headers = ['Folio', 'Fecha', 'Proveedor', 'Estado', 'Total']
    const dataRows = purchasesData.map(c => [
        c.numero_folio || 'N/A',
        new Date(c.fecha_creacion).toLocaleString('es-MX'),
        c.proveedor_nombre || 'Desconocido',
        c.estado || 'N/A',
        c.total || 0
    ])

    await buildAndSaveExcel(headers, dataRows, `Compras_${startDate}_al_${endDate}`)
}

export async function exportClientsToExcel(powersync) {
    const clientsData = await powersync.getAll(`
        SELECT nombre, telefono, email, saldo_pendiente, saldo_monedero 
        FROM clientes
        ORDER BY saldo_pendiente DESC
    `)

    if (clientsData.length === 0) {
        alert('No hay clientes para exportar.')
        return
    }

    const headers = ['Cliente', 'Teléfono', 'Email', 'Saldo Pendiente', 'Saldo Monedero']
    const dataRows = clientsData.map(c => [
        c.nombre || 'Desconocido',
        c.telefono || 'N/A',
        c.email || 'N/A',
        c.saldo_pendiente || 0,
        c.saldo_monedero || 0
    ])

    await buildAndSaveExcel(headers, dataRows, 'Cartera_Clientes')
}

export async function exportGastosToExcel(powersync, { startDate, endDate }) {
    const gastosData = await powersync.getAll(`
        SELECT * FROM gastos
        WHERE fecha_gasto >= ? AND fecha_gasto <= ?
        ORDER BY fecha_gasto DESC
    `, [startDate, endDate])

    if (gastosData.length === 0) {
        alert('No hay gastos en este periodo para exportar.')
        return
    }

    const headers = ['Fecha', 'Categoría', 'Concepto', 'Proveedor', 'Método Pago', 'Comprobante', 'Monto']
    const dataRows = gastosData.map(g => [
        g.fecha_gasto || 'N/A',
        g.categoria || 'OTROS',
        g.concepto || '',
        g.proveedor || 'N/A',
        g.metodo_pago || 'EFECTIVO',
        g.comprobante_ref || 'N/A',
        g.monto || 0
    ])

    await buildAndSaveExcel(headers, dataRows, `Gastos_Operativos_${startDate}_al_${endDate}`)
}

async function buildAndSaveExcel(headers, dataRows, filenamePrefix) {
    const XLSX = (await import('xlsx-js-style')).default || await import('xlsx-js-style')
    const { saveAs } = await import('file-saver')

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])

    ws['!cols'] = headers.map(() => ({ wch: 18 }))

    const borderStyle = {
        top: { style: 'thin', color: { rgb: "D1D5DB" } },
        bottom: { style: 'thin', color: { rgb: "D1D5DB" } },
        left: { style: 'thin', color: { rgb: "D1D5DB" } },
        right: { style: 'thin', color: { rgb: "D1D5DB" } }
    }

    const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "1E40AF" } },
        alignment: { horizontal: "center", vertical: "center" },
        border: borderStyle
    }

    const rowStyleNormal = { border: borderStyle }
    const rowStyleAlt = { fill: { fgColor: { rgb: "F1F5F9" } }, border: borderStyle }

    for (let R = 0; R <= dataRows.length; ++R) {
        for (let C = 0; C < headers.length; ++C) {
            const cellRef = XLSX.utils.encode_cell({ r: R, c: C })
            if (!ws[cellRef]) continue

            if (R === 0) {
                ws[cellRef].s = headerStyle
            } else {
                ws[cellRef].s = (R % 2 === 0) ? rowStyleAlt : rowStyleNormal
                if (typeof dataRows[R-1][C] === 'number') {
                    ws[cellRef].z = '"$"#,##0.00'
                }
            }
        }
    }

    XLSX.utils.book_append_sheet(wb, ws, "Reporte")
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
    const data = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' })

    saveAs(data, `${filenamePrefix}.xlsx`)
}
