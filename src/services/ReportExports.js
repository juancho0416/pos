// ReportExports.js — Servicio centralizado para generación de reportes PDF y Excel
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import * as XLSX from 'xlsx-js-style'
import { saveAs } from 'file-saver'

export const ReportExports = {
    // 1. Exportar Cierre de Caja a PDF
    exportCashClosePDF: (turnData, totals) => {
        const doc = new jsPDF()

        doc.setFontSize(18)
        doc.text('Reporte de Cierre de Caja', 14, 20)

        doc.setFontSize(12)
        doc.text(`Sucursal: ${turnData.branchName || 'N/A'}`, 14, 30)
        doc.text(`Cajero: ${turnData.userName || 'N/A'}`, 14, 38)
        doc.text(`Apertura: ${new Date(turnData.fecha_inicio).toLocaleString()}`, 14, 46)
        doc.text(`Cierre: ${new Date().toLocaleString()}`, 14, 54)

        doc.autoTable({
            startY: 65,
            head: [['Concepto', 'Monto']],
            body: [
                ['Fondo Inicial', `$${Number(turnData.monto_inicial || 0).toFixed(2)}`],
                ['Ventas Efectivo', `$${Number(totals.ventasEfectivo).toFixed(2)}`],
                ['Ventas Tarjeta', `$${Number(totals.ventasTarjeta).toFixed(2)}`],
                ['Total Calculado (Efectivo en caja)', `$${Number(totals.totalCalculado).toFixed(2)}`],
                ['Efectivo Declarado', `$${Number(turnData.efectivo_declarado || 0).toFixed(2)}`],
                ['Diferencia', `$${Number(turnData.diferencia || 0).toFixed(2)}`]
            ],
            theme: 'grid',
            headStyles: { fillColor: [30, 64, 175] }
        })

        if (turnData.observaciones) {
            doc.text('Observaciones:', 14, doc.lastAutoTable.finalY + 15)
            doc.setFontSize(10)
            const splitText = doc.splitTextToSize(turnData.observaciones, 180)
            doc.text(splitText, 14, doc.lastAutoTable.finalY + 22)
        }

        doc.save(`Cierre_Caja_${new Date().toISOString().split('T')[0]}.pdf`)
    },

    // 2. Exportar Clientes a Excel
    exportCustomersExcel: (customers, branchName) => {
        const headers = ['ID', 'Nombre', 'Teléfono', 'Email', 'Dirección', 'Segmento', 'Saldo Pendiente', 'Saldo Monedero']
        const data = customers.map(c => [
            c.id,
            c.nombre,
            c.telefono || '-',
            c.email || '-',
            c.direccion || '-',
            c.segmento || '-',
            Number(c.saldo_pendiente || 0).toFixed(2),
            Number(c.saldo_monedero || 0).toFixed(2)
        ])

        const ws = XLSX.utils.aoa_to_sheet([headers, ...data])

        // Estilo básico para header
        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "1E40AF" } }
        }
        for (let C = 0; C < headers.length; ++C) {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c: C })
            if (!ws[cellRef]) continue
            ws[cellRef].s = headerStyle
        }

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Clientes")

        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        saveAs(new Blob([wbout], { type: "application/octet-stream" }), `Directorio_Clientes_${branchName}_${new Date().toISOString().split('T')[0]}.xlsx`)
    },

    // 3. Exportar Inventario (Stock) a Excel
    exportStockExcel: (inventory, branchName) => {
        const headers = ['SKU', 'Nombre', 'Categoría', 'Precio Venta', 'Stock Actual', 'Mínimo', 'Estado']
        const data = inventory.map(p => {
            let estado = 'ÓPTIMO'
            if (p.stock <= 0) estado = 'AGOTADO'
            else if (p.stock <= p.stock_minimo) estado = 'BAJO'

            return [
                p.sku || '-',
                p.nombre,
                p.categoria || '-',
                Number(p.precio_venta || 0).toFixed(2),
                p.stock || 0,
                p.stock_minimo || 0,
                estado
            ]
        })

        const ws = XLSX.utils.aoa_to_sheet([headers, ...data])

        // Estilo
        const headerStyle = {
            font: { bold: true, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "1E40AF" } }
        }
        for (let C = 0; C < headers.length; ++C) {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c: C })
            if (!ws[cellRef]) continue
            ws[cellRef].s = headerStyle
        }

        // Auto-width
        ws['!cols'] = [
            { wpx: 80 }, { wpx: 250 }, { wpx: 120 }, { wpx: 100 },
            { wpx: 80 }, { wpx: 80 }, { wpx: 100 }
        ]

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Inventario")

        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
        saveAs(new Blob([wbout], { type: "application/octet-stream" }), `Inventario_${branchName}_${new Date().toISOString().split('T')[0]}.xlsx`)
    }
}
