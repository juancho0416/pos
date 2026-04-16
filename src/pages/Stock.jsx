import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Package, Download, Upload } from 'lucide-react'
import { useQuery } from '@powersync/react'
import { powersync } from '../powersync/db'
import { toast } from 'sonner'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRef, useMemo, useEffect } from 'react'

// Services
import { StockService } from '../services/StockService'
import { ReportExports } from '../services/ReportExports'

// Sub-components
import StockHeader from '../components/stock/StockHeader'
import LowStockTable from '../components/stock/LowStockTable'
import InventoryRow from '../components/stock/InventoryRow'
import BulkImportModal from '../components/stock/BulkImportModal'

export default function Stock() {
    const { branches, selectedBranch, changeBranch } = useAuth()
    const [searchTerm, setSearchTerm] = useState('')
    const [debouncedSearch, setDebouncedSearch] = useState('')
    const [showImport, setShowImport] = useState(false)
    const parentRef = useRef(null)

    // Debounce de la búsqueda para no congelar al escribir rápido
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300)
        return () => clearTimeout(t)
    }, [searchTerm])

    // ─── PowerSync Reactive Query: Inventario local en tiempo real ───
    const { data: inventoryRaw = [] } = useQuery(
        `SELECT
            i.id, i.stock_actual, i.stock_minimo,
            p.id as producto_id, p.nombre, p.sku, p.codigo_barras, p.imagen_url
        FROM inventario i
        JOIN productos p ON p.id = i.producto_id
        WHERE i.sucursal_id = ?
          AND (p.is_deleted = 0 OR p.is_deleted IS NULL)
        ORDER BY p.nombre ASC`,
        [selectedBranch || '']
    )

    // Normalizar estructura para compatibilidad con StockService (item.id = producto_id)
    const inventory = inventoryRaw.map(row => ({
        id: row.producto_id,        // StockService usa item.id como producto_id
        inventory_id: row.id,       // id real de la fila en inventario
        stock_actual: row.stock_actual ?? 0,
        stock_minimo: row.stock_minimo ?? 5,
        producto: {
            id: row.producto_id,
            nombre: row.nombre,
            sku: row.sku,
            codigo_barras: row.codigo_barras,
            imagen_url: row.imagen_url
        }
    }))

    // ─── Handlers ───

    // Ajuste rápido ±1
    const handleAdjust = async (item, amount) => {
        try {
            await StockService.adjustStock(item, amount, selectedBranch || '1')
            toast.success(`${amount > 0 ? '+1' : '-1'} en ${item.producto.nombre}`)
        } catch (err) {
            toast.error('Error al ajustar stock: ' + err.message)
        }
    }

    // Edición inline: establece valor directo → calcula delta → kardex automático
    const handleSetStock = async (item, newValue) => {
        const delta = newValue - item.stock_actual
        if (delta === 0) return
        try {
            await StockService.adjustStock(item, delta, selectedBranch || '1')
            toast.success(`Stock de "${item.producto.nombre}" → ${newValue}`)
        } catch (err) {
            toast.error('Error al actualizar stock: ' + err.message)
        }
    }

    // Stock mínimo
    const handleUpdateMinStock = async (item, newMinStock) => {
        const val = parseInt(newMinStock)
        if (isNaN(val) || val < 0) return
        try {
            await StockService.updateMinStock(item, val, selectedBranch || '1')
        } catch (err) {
            toast.error('Error al actualizar el stock mínimo')
        }
    }

    // ─── Derived Data ───
    const filteredItems = useMemo(() => {
        if (!debouncedSearch) return inventory;
        const s = debouncedSearch.toLowerCase();
        return inventory.filter(item =>
            item.producto.nombre.toLowerCase().includes(s) ||
            (item.producto.sku && item.producto.sku.toLowerCase().includes(s))
        )
    }, [inventory, debouncedSearch])

    // Virtualizador de filas
    const rowVirtualizer = useVirtualizer({
        count: filteredItems.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 76, // Altura estimada en PX por fila
        overscan: 5,
    })

    const lowStockItems = filteredItems.filter(item => {
        const minStock = item.stock_minimo || 5
        return item.stock_actual < minStock && item.stock_actual !== undefined
    })

    // ─── Excel Export ───
    const handleExportExcel = async () => {
        if (lowStockItems.length === 0) {
            toast.info('No hay productos con bajo stock en esta sucursal.')
            return
        }

        const branchName = branches.find(b => b.id == selectedBranch)?.nombre || 'General'
        const headers = ['Producto', 'Sucursal', 'Stock Actual', 'Stock Mínimo', 'Cantidad Sugerida a Pedir']

        const dataRows = lowStockItems.map(item => {
            const minStock = item.stock_minimo || 5
            const sugerido = (minStock * 2) - item.stock_actual
            return [item.producto.nombre, branchName, item.stock_actual, minStock, sugerido > 0 ? sugerido : 0]
        })

        const XLSX = (await import('xlsx-js-style')).default || await import('xlsx-js-style')
        const { saveAs } = await import('file-saver')
        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])
        ws['!cols'] = [{ wch: 40 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 25 }]
        XLSX.utils.book_append_sheet(wb, ws, 'Pedidos')
        const data = new Blob(
            [XLSX.write(wb, { bookType: 'xlsx', type: 'array' })],
            { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' }
        )
        const d = new Date()
        const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"]
        saveAs(data, `Reporte_Bajos_${branchName.replace(/\s+/g,'_')}_${d.getDate()}_${months[d.getMonth()]}.xlsx`)
    }

    // ─── Render ───
    return (
        <div className="p-6 max-w-7xl mx-auto">
            <StockHeader
                branches={branches}
                selectedBranch={selectedBranch}
                onChangeBranch={changeBranch}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
            />

            <LowStockTable
                lowStockItems={lowStockItems}
                onExportExcel={handleExportExcel}
            />

            {/* Inventory List Header */}
            <div className="flex justify-between items-center mb-4 mt-8">
                <div className="flex items-center gap-2">
                    <Package className="text-blue-600" size={20} />
                    <h2 className="text-xl font-bold text-gray-800">Inventario Completo</h2>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                        {filteredItems.length} productos
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Importación Masiva */}
                    <button
                        onClick={() => setShowImport(true)}
                        className="flex items-center gap-1.5 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 transition text-sm shadow-lg shadow-blue-200 active:scale-95"
                    >
                        <Upload size={16} /> Importar CSV/Excel
                    </button>

                    {/* Exportar Inventario Completo */}
                    <button
                        onClick={() => ReportExports.exportStockExcel(filteredItems, branches.find(b => b.id == selectedBranch)?.nombre || 'General')}
                        className="flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-2 rounded-xl font-bold hover:bg-green-100 transition text-sm border border-green-200"
                    >
                        <Download size={16} /> Excel
                    </button>
                </div>
            </div>

            {/* Tip inline editing */}
            <div className="mb-3 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 w-fit">
                <span>💡</span>
                <span>Haz <strong>clic en el número</strong> de stock para editarlo directamente. Presiona <kbd className="bg-white border border-blue-200 px-1 rounded text-[10px]">Enter</kbd> para confirmar.</span>
            </div>

            {/* Inventory List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[70vh]">
                {/* Table Header estático */}
                <div className="grid grid-cols-12 bg-gray-50 p-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 shrink-0">
                    <div className="col-span-5 md:col-span-4">Producto</div>
                    <div className="col-span-2 text-center">Mínimo</div>
                    <div className="col-span-2 text-center">Actual</div>
                    <div className="col-span-3 text-center">Ajuste rápido</div>
                </div>

                {/* Subcontenedor con scroll para el Virtualizador */}
                <div ref={parentRef} className="flex-1 overflow-y-auto overscroll-contain">
                    {filteredItems.length === 0 ? (
                        <div className="p-10 text-center text-gray-400">
                            No se encontraron productos ({debouncedSearch ? 'filtrados' : 'en esta sucursal'}).
                        </div>
                    ) : (
                        <div
                            className="w-full relative divide-y divide-gray-100"
                            style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                        >
                            {rowVirtualizer.getVirtualItems().map(virtualItem => {
                                const item = filteredItems[virtualItem.index]
                                return (
                                    <div
                                        key={virtualItem.key}
                                        data-index={virtualItem.index}
                                        ref={rowVirtualizer.measureElement}
                                        style={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            width: '100%',
                                            transform: `translateY(${virtualItem.start}px)`,
                                        }}
                                    >
                                        <InventoryRow
                                            item={item}
                                            onAdjust={handleAdjust}
                                            onUpdateMinStock={handleUpdateMinStock}
                                            onSetStock={handleSetStock}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Bulk Import Modal */}
            {showImport && (
                <BulkImportModal
                    sucursalId={selectedBranch}
                    onClose={() => setShowImport(false)}
                    onImportComplete={() => setShowImport(false)}
                />
            )}
        </div>
    )
}
