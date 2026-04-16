import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, Search, Trash2, Edit, Package, Package2, FileSpreadsheet, Tag } from 'lucide-react'
import ProductDetailModal from '../components/products/ProductDetailModal'
import BarcodePrintModal from '../components/products/BarcodePrintModal'
import ProImportModal from '../components/shared/ProImportModal'
import { useAuth } from '../context/AuthContext'
import { useQuery } from '@powersync/react'
import { powersync } from '../powersync/db'
import { toast } from 'sonner'

// ── LRU Cache para evitar flicker al cambiar rutas ────────────────────
// Max 10 entradas para no acumular memoria indefinidamente
const MAX_CACHE = 10
const queryCache = new Map()
function cacheSet(key, value) {
    if (queryCache.size >= MAX_CACHE) {
        // Eliminar la entrada más antigua (primera en inserción)
        queryCache.delete(queryCache.keys().next().value)
    }
    queryCache.set(key, value)
}

export default function Products() {
    const [showForm, setShowForm] = useState(false)
    const [productToEdit, setProductToEdit] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [showImport, setShowImport] = useState(false)
    const [productToPrint, setProductToPrint] = useState(null)
    const [diagnosticCount, setDiagnosticCount] = useState(-1)
    const { selectedBranch } = useAuth()

    // ── Debounce de búsqueda (300ms) ──────────────────────────────────
    const [debouncedSearch, setDebouncedSearch] = useState('')
    useEffect(() => {
        const t = setTimeout(() => setDebouncedSearch(searchTerm), 300)
        return () => clearTimeout(t)
    }, [searchTerm])

    const searchFilter = debouncedSearch
        ? `AND (nombre LIKE '%' || ? || '%' OR codigo_barras LIKE '%' || ? || '%' OR sku LIKE '%' || ? || '%')`
        : ''

    let queryParams = []
    if (debouncedSearch) {
        queryParams = [debouncedSearch, debouncedSearch, debouncedSearch, selectedBranch || 'default']
    } else {
        queryParams = [selectedBranch || 'default']
    }

    // Siempre ordenar en SQLite — evita JS sort sobre 200 filas
    const orderFilter = 'ORDER BY nombre ASC'

    // ── Query principal con columnas explícitas (no SELECT p.*) ───────
    const { data: rawProducts = [], isLoading: loading, error: queryError } = useQuery(`
        SELECT
            p.id,
            p.nombre,
            p.sku,
            p.codigo_barras,
            p.linea,
            p.marca,
            p.categoria,
            p.iva_porcentaje,
            p.costo_ultimo,
            p.unidad_medida,
            pr.precio_menudeo,
            pr.precio_medio_mayoreo,
            pr.precio_mayoreo,
            pr.utilidad_menudeo,
            pr.utilidad_medio_mayoreo,
            pr.utilidad_mayoreo,
            i.stock_actual as _stock_i
        FROM (
            SELECT id, nombre, sku, codigo_barras, linea, marca, categoria,
                   iva_porcentaje, costo_ultimo, unidad_medida
            FROM productos
            WHERE is_deleted IS NOT 1
            ${searchFilter}
            ${orderFilter}
            LIMIT 200
        ) p
        LEFT JOIN inventario i ON i.producto_id = p.id AND i.sucursal_id = ?
        LEFT JOIN precios pr ON p.id = pr.producto_id
    `, queryParams)

    // ── Cache LRU: guardar resultados para evitar flicker ─────────────
    useEffect(() => {
        if (rawProducts && rawProducts.length > 0) {
            cacheSet(debouncedSearch, rawProducts)
        }
    }, [rawProducts, debouncedSearch])

    const activeProducts = rawProducts.length === 0 && loading && queryCache.has(debouncedSearch)
        ? queryCache.get(debouncedSearch)
        : rawProducts

    // ── COUNT diagnóstico: solo una vez al montar el componente ────────
    const countFetchedRef = useRef(false)
    useEffect(() => {
        if (countFetchedRef.current) return
        countFetchedRef.current = true
        powersync.execute('SELECT COUNT(*) as c FROM productos WHERE is_deleted IS NOT 1')
            .then(res => setDiagnosticCount(res.rows?.item(0)?.c ?? 0))
            .catch(() => setDiagnosticCount(-99))
    }, [])

    // Refrescar el count solo después de que una importación termine
    const refreshCount = useCallback(() => {
        powersync.execute('SELECT COUNT(*) as c FROM productos WHERE is_deleted IS NOT 1')
            .then(res => setDiagnosticCount(res.rows?.item(0)?.c ?? 0))
            .catch(() => {})
    }, [])

    const handleEdit = (product) => {
        setProductToEdit(product)
        setShowForm(true)
    }

    const handleDelete = async (id, nombre) => {
        if (!window.confirm(`¿Eliminar "${nombre}"?`)) return
        try {
            await powersync.execute(
                `UPDATE productos SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?`, [id]
            )
            toast.success('Producto eliminado del catálogo.')
            refreshCount()
        } catch (err) {
            toast.error('Error al eliminar el producto.')
        }
    }

    // ── Bulk Import con transacción SQLite — drásticamente más rápido ──
    const handleBulkImport = async (rows, onProgress) => {
        let done = 0
        let errors = 0

        // Wrap en writeTransaction para un solo flush a disco
        await powersync.writeTransaction(async (tx) => {
            for (const row of rows) {
                try {
                    // Check si el SKU ya existe (dentro de la transacción)
                    const existingRes = await tx.execute(
                        `SELECT id FROM productos WHERE sku = ? AND is_deleted IS NOT 1 LIMIT 1`,
                        [row.sku?.trim() || '']
                    )
                    const existing = existingRes.rows?._array?.[0]

                    const productId = existing?.id ?? crypto.randomUUID()
                    const costo = parseFloat(row.costo) || 0
                    const sku = row.sku?.trim() || `IMP-${Date.now()}-${done}`
                    const iva = parseInt(row.iva_porcentaje) || 16
                    const stock = parseFloat(row.stock) || 0

                    if (existing) {
                        await tx.execute(
                            `UPDATE productos SET nombre=?, sku=?, linea=?, marca=?, unidad_medida=?,
                             costo_ultimo=CASE WHEN ? > 0 THEN ? ELSE costo_ultimo END,
                             iva_porcentaje=?, updated_at=datetime('now') WHERE id=?`,
                            [row.nombre, sku, row.categoria || null, row.marca || null,
                             row.unidad_medida || 'Pza', costo, costo, iva, productId]
                        )
                    } else {
                        await tx.execute(
                            `INSERT INTO productos (id, nombre, sku, codigo_barras, linea, familia, marca, unidad_medida,
                             costo_ultimo, costo_promedio, iva_porcentaje, is_deleted, created_at, updated_at)
                             VALUES (?, ?, ?, ?, ?, null, ?, ?, ?, ?, ?, 0, datetime('now'), datetime('now'))`,
                            [productId, row.nombre, sku, row.codigo_barras || null,
                             row.categoria || null, row.marca || null,
                             row.unidad_medida || 'Pza', costo, costo, iva]
                        )
                    }

                    // Upsert precios
                    const p1 = parseFloat(row.precio_menudeo) || 0
                    const p3 = parseFloat(row.precio_mayoreo) || 0
                    if (p1 > 0 || p3 > 0) {
                        const precioRes = await tx.execute(
                            `SELECT id FROM precios WHERE producto_id = ? LIMIT 1`, [productId]
                        )
                        if (precioRes.rows?._array?.length > 0) {
                            await tx.execute(
                                `UPDATE precios SET
                                 precio_menudeo=CASE WHEN ? > 0 THEN ? ELSE precio_menudeo END,
                                 precio_mayoreo=CASE WHEN ? > 0 THEN ? ELSE precio_mayoreo END
                                 WHERE producto_id=?`,
                                [p1, p1, p3, p3, productId]
                            )
                        } else {
                            await tx.execute(
                                `INSERT INTO precios (id, producto_id, precio_menudeo, precio_medio_mayoreo,
                                 precio_mayoreo, min_mayoreo, utilidad_menudeo, utilidad_medio_mayoreo, utilidad_mayoreo)
                                 VALUES (?, ?, ?, ?, ?, 12, 30, 20, 15)`,
                                [crypto.randomUUID(), productId, p1, p3 > 0 ? (p1 + p3) / 2 : 0, p3]
                            )
                        }
                    }

                    // Set initial stock
                    if (stock > 0) {
                        const invRes = await tx.execute(
                            `SELECT id FROM inventario WHERE producto_id = ? LIMIT 1`, [productId]
                        )
                        if (invRes.rows?._array?.length === 0) {
                            await tx.execute(
                                `INSERT INTO inventario (producto_id, sucursal_id, stock_actual, stock_minimo, stock_maximo)
                                 VALUES (?, 'default', ?, 5, 9999)`,
                                [productId, stock]
                            )
                        }
                    }

                } catch (err) {
                    console.error(`Error en fila ${done + 1}:`, err)
                    errors++
                }
                done++
                onProgress(done)
            }
        })

        refreshCount()
        const ok = done - errors
        if (errors > 0) {
            toast.warning(`${ok} productos importados. ${errors} filas con errores (ver consola).`)
        } else {
            toast.success(`${ok} productos importados al catálogo.`)
        }
    }

    // Solo mostrar loading si no hay nada en cache
    const isDeliberatelySearching = (searchTerm !== debouncedSearch || loading) && activeProducts.length === 0

    return (
        <div className="flex flex-col flex-1 overflow-hidden bg-slate-100">
            {/* Top Bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shadow-sm shrink-0">
                <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center">
                    <Package2 className="text-indigo-600" size={24} />
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Catálogo Maestro</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md text-xs font-bold border border-slate-200">
                            SQLite: {diagnosticCount < 0 ? '...' : diagnosticCount.toLocaleString()} artículos
                        </span>
                        <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-md text-xs font-bold border border-indigo-100">
                            En pantalla: {activeProducts.length.toLocaleString()} resultados
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {queryError && (
                        <div className="bg-red-100 text-red-700 px-3 py-1 text-xs rounded-xl border border-red-300 max-w-sm truncate" title={queryError.message}>
                            SQL Error: {queryError.message}
                        </div>
                    )}
                    <button
                        onClick={() => setShowImport(true)}
                        className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 font-bold px-4 py-3 rounded-2xl shadow-sm active:scale-95 transition-all text-sm"
                    >
                        <FileSpreadsheet size={17} className="text-indigo-600" />
                        Importar Excel / CSV
                    </button>
                    <button
                        onClick={() => { setProductToEdit(null); setShowForm(true) }}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-5 py-3 rounded-2xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
                    >
                        <Plus size={18} />
                        Nuevo Artículo
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-4">
                {/* Search */}
                <div className="relative max-w-lg">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, SKU, código, marca o línea..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-800 rounded-2xl pl-10 pr-4 py-2.5 font-bold text-sm focus:outline-none focus:border-indigo-500 shadow-sm"
                    />
                </div>

                {/* Table */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead className="border-b border-slate-100 bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="py-3 px-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Artículo / SKU</th>
                                    <th className="py-3 px-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Clasificación</th>
                                    <th className="py-3 px-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Costo Últ.</th>
                                    <th className="py-3 px-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">P1 Menudeo</th>
                                    <th className="py-3 px-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">P2 Med.May.</th>
                                    <th className="py-3 px-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">P3 Mayoreo</th>
                                    <th className="py-3 px-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">IVA</th>
                                    <th className="py-3 px-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400 w-24">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {isDeliberatelySearching ? (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center text-slate-400 animate-pulse font-bold">Buscando en catálogo...</td>
                                    </tr>
                                ) : activeProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-16 text-center">
                                            <div className="flex flex-col items-center justify-center text-slate-400">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                                    <Package size={32} className="text-slate-300" />
                                                </div>
                                                <p className="text-base font-bold text-slate-600 mb-1">No se encontraron productos</p>
                                                <p className="text-sm">Ajusta tu búsqueda o agrega nuevos artículos</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : activeProducts.map(product => {
                                    const margen = product.precio_menudeo && product.costo_ultimo
                                        ? ((product.precio_menudeo - product.costo_ultimo) / product.precio_menudeo * 100).toFixed(0)
                                        : null

                                    return (
                                        <tr key={product.id} className="hover:bg-indigo-50/20 transition-colors group">
                                            <td className="py-4 px-5">
                                                <p className="font-bold text-slate-800 leading-tight">{product.nombre}</p>
                                                <div className="flex items-center gap-2 mt-1">
                                                    {product.sku && (
                                                        <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                                                            {product.sku}
                                                        </span>
                                                    )}
                                                    {product.codigo_barras && (
                                                        <span className="text-[10px] text-slate-400">{product.codigo_barras}</span>
                                                    )}
                                                    {product.unidad_medida && product.unidad_medida !== 'Pza' && (
                                                        <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                                                            {product.unidad_medida}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="space-y-0.5">
                                                    {product.linea && <p className="text-xs font-bold text-slate-600">{product.linea}</p>}
                                                    {product.marca && <p className="text-[11px] text-slate-400">{product.marca}</p>}
                                                    {product.categoria && !product.linea && (
                                                        <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                                                            {product.categoria}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-5 text-center">
                                                <span className="font-bold text-slate-600 text-sm">
                                                    {product.costo_ultimo ? `$${parseFloat(product.costo_ultimo).toFixed(2)}` : '—'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-5 text-center">
                                                <div>
                                                    <span className="font-black text-emerald-700">
                                                        ${product.precio_menudeo ? parseFloat(product.precio_menudeo).toFixed(2) : '—'}
                                                    </span>
                                                    {margen && (
                                                        <span className={`ml-1 text-[9px] font-black px-1.5 py-0.5 rounded ${parseInt(margen) >= 30 ? 'text-emerald-700 bg-emerald-50' : parseInt(margen) >= 15 ? 'text-yellow-700 bg-yellow-50' : 'text-red-600 bg-red-50'}`}>
                                                            {margen}%
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="py-4 px-5 text-center">
                                                <span className="font-bold text-purple-700">
                                                    {product.precio_medio_mayoreo ? `$${parseFloat(product.precio_medio_mayoreo).toFixed(2)}` : '—'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-5 text-center">
                                                <span className="font-bold text-blue-700">
                                                    {product.precio_mayoreo ? `$${parseFloat(product.precio_mayoreo).toFixed(2)}` : '—'}
                                                </span>
                                            </td>
                                            <td className="py-4 px-5 text-center">
                                                <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${(product.iva_porcentaje ?? 16) === 16 ? 'bg-slate-100 text-slate-600' : (product.iva_porcentaje ?? 16) === 8 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                                    {product.iva_porcentaje ?? 16}%
                                                </span>
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="flex justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setProductToPrint(product)}
                                                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                                                        title="Imprimir etiquetas de código de barras"
                                                    >
                                                        <Tag size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEdit(product)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                                                        title="Editar ficha completa"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(product.id, product.nombre)}
                                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                                        title="Eliminar"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <ProductDetailModal
                show={showForm}
                product={productToEdit}
                onClose={() => { setShowForm(false); setProductToEdit(null) }}
                onSaved={() => { setShowForm(false); setProductToEdit(null) }}
            />

            {showImport && (
                <ProImportModal
                    mode="productos"
                    title="Importar Catálogo de Productos"
                    onClose={() => setShowImport(false)}
                    onImported={handleBulkImport}
                />
            )}

            <BarcodePrintModal
                show={!!productToPrint}
                product={productToPrint}
                onClose={() => setProductToPrint(null)}
            />
        </div>
    )
}
