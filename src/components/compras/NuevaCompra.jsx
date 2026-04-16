import { useState, useRef, useCallback, useEffect } from 'react'
import { ArrowLeft, Search, FileText, ScanLine, AlertTriangle, CheckCircle2, Plus, Minus, Trash2, ChevronDown, ChevronUp, Loader2, Save, PackageX, FileJson, FileSpreadsheet } from 'lucide-react'
import ProImportModal from '../shared/ProImportModal'
import XMLImportModal from './XMLImportModal'
import { useAuth } from '../../context/AuthContext'
import { powersync } from '../../powersync/db'
import { useQuery } from '@powersync/react'
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner'
import { toast } from 'sonner'
import { useSettings } from '../../hooks/useSettings'

// ─── Helpers ────────────────────────────────────────────────
const calcPrice = (costo, utilidad) => {
    if (!costo || costo <= 0 || utilidad >= 100) return 0
    return parseFloat((costo / (1 - utilidad / 100)).toFixed(4))
}

const buildLineItem = (product = {}, overrides = {}, settingsObj = {}) => {
    const costo = overrides.costo ?? product.costo_ultimo ?? 0
    
    // Si la DB tiene ya márgenes, los respetamos. Si es un producto "nuevo", inyectamos el base del panel administrador.
    const utilM = product.utilidad_menudeo ?? settingsObj.utilidad_menudeo_default ?? 30
    const utilMm = product.utilidad_medio_mayoreo ?? settingsObj.utilidad_medio_mayoreo_default ?? 20
    const utilMay = product.utilidad_mayoreo ?? settingsObj.utilidad_mayoreo_default ?? 15
    return {
        _pid: product.id ?? null,
        _isExistingProduct: !!product.id,
        _localId: crypto.randomUUID(),
        nombre: overrides.nombre ?? product.nombre ?? '',
        sku: overrides.sku ?? product.sku ?? '',
        codigo_barras: product.codigo_barras ?? '',
        unidad_medida: product.unidad_medida ?? 'Pza',
        factor_conversion: product.factor_conversion ?? 1,
        cantidad_compra: overrides.cantidad_compra ?? 1,
        costo_unitario: costo,            // Sin IVA
        iva_porcentaje: product.iva_porcentaje ?? settingsObj.iva_default ?? 16,
        // Costos de referencia previos
        costo_ultimo_prev: product.costo_ultimo ?? null,
        costo_promedio_prev: product.costo_promedio ?? null,
        // Precios autocalculados
        precio_1_nuevo: calcPrice(costo, utilM),
        precio_2_nuevo: calcPrice(costo, utilMm),
        precio_3_nuevo: calcPrice(costo, utilMay),
        precio_1_actual: product.precio_menudeo ?? 0,
        precio_2_actual: product.precio_medio_mayoreo ?? 0,
        precio_3_actual: product.precio_mayoreo ?? 0,
        utilidad_menudeo: utilM,
        utilidad_medio_mayoreo: utilMm,
        utilidad_mayoreo: utilMay,
        // Estado de aprobación
        precios_aprobados: false,
        expanded: false,
    }
}

// ─── Row component ───────────────────────────────────────────
function ComprasRow({ item, idx, updateItem, removeItem }) {
    const cantidadEntrada = (item.cantidad_compra || 0) * (item.factor_conversion || 1)
    const subtotal = (item.costo_unitario || 0) * (item.cantidad_compra || 0)
    const ivaImporte = subtotal * ((item.iva_porcentaje || 0) / 100)
    const costoConIVA = (item.costo_unitario || 0) * (1 + (item.iva_porcentaje || 0) / 100)

    const hasInflation = item.costo_ultimo_prev && item.costo_unitario > item.costo_ultimo_prev
    const inflationPct = hasInflation
        ? ((item.costo_unitario - item.costo_ultimo_prev) / item.costo_ultimo_prev * 100).toFixed(1)
        : 0

    const handleCostoChange = (val) => {
        const costo = parseFloat(val) || 0
        updateItem(item._localId, {
            costo_unitario: costo,
            precio_1_nuevo: calcPrice(costo, item.utilidad_menudeo),
            precio_2_nuevo: calcPrice(costo, item.utilidad_medio_mayoreo),
            precio_3_nuevo: calcPrice(costo, item.utilidad_mayoreo),
            precios_aprobados: false, // Reset approval when cost changes
        })
    }

    const approveNewPrices = () => updateItem(item._localId, { precios_aprobados: true })

    return (
        <>
            <tr className={`group border-b border-slate-100 hover:bg-slate-50/50 transition-colors ${hasInflation ? 'bg-red-50/30' : ''}`}>
                {/* Código */}
                <td className="py-3 px-3 align-middle">
                    <span className="text-xs font-mono font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded truncate block max-w-[90px]">
                        {item.sku || '—'}
                    </span>
                </td>
                {/* Descripción */}
                <td className="py-3 px-3 align-middle min-w-[160px]">
                    <p className="font-bold text-slate-800 text-sm leading-tight line-clamp-2">{item.nombre}</p>
                    {hasInflation && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-lg mt-1">
                            <AlertTriangle size={10} /> Inflación +{inflationPct}%
                        </span>
                    )}
                </td>
                {/* Unidad / Factor */}
                <td className="py-3 px-3 align-middle text-center">
                    <div className="text-xs font-bold text-slate-600">
                        {item.unidad_medida}
                        {item.factor_conversion > 1 && (
                            <span className="block text-emerald-600">×{item.factor_conversion}</span>
                        )}
                    </div>
                </td>
                {/* Cant. Compra */}
                <td className="py-3 px-3 align-middle">
                    <div className="flex items-center justify-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-[100px] mx-auto">
                        <button onClick={() => updateItem(item._localId, { cantidad_compra: Math.max(1, item.cantidad_compra - 1) })}
                            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 active:scale-95">
                            <Minus size={12} strokeWidth={3} />
                        </button>
                        <input type="number" min="1" value={item.cantidad_compra}
                            onChange={(e) => updateItem(item._localId, { cantidad_compra: parseFloat(e.target.value) || 1 })}
                            className="flex-1 text-center font-black text-slate-800 text-sm bg-transparent focus:outline-none" />
                        <button onClick={() => updateItem(item._localId, { cantidad_compra: item.cantidad_compra + 1 })}
                            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 active:scale-95">
                            <Plus size={12} strokeWidth={3} />
                        </button>
                    </div>
                </td>
                {/* Cant. Entrada */}
                <td className="py-3 px-3 align-middle text-center">
                    <span className="font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg text-sm">
                        +{cantidadEntrada}
                    </span>
                </td>
                {/* Costo s/IVA */}
                <td className="py-3 px-3 align-middle">
                    <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                        <input type="number" min="0" step="0.01" value={item.costo_unitario}
                            onChange={(e) => handleCostoChange(e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl pl-5 pr-2 py-2 font-bold text-sm text-right focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm" />
                    </div>
                    <p className="text-[10px] text-slate-400 text-right mt-0.5">c/IVA: ${costoConIVA.toFixed(2)}</p>
                </td>
                {/* IVA% */}
                <td className="py-3 px-3 align-middle">
                    <select value={item.iva_porcentaje}
                        onChange={(e) => updateItem(item._localId, { iva_porcentaje: parseInt(e.target.value) })}
                        className="w-20 bg-white border border-slate-200 text-slate-700 rounded-xl px-2 py-2 text-sm font-bold focus:outline-none focus:border-blue-500">
                        <option value={16}>16%</option>
                        <option value={8}>8%</option>
                        <option value={0}>0%</option>
                    </select>
                </td>
                {/* Precios nuevos */}
                <td className="py-3 px-3 align-middle text-center min-w-[120px]">
                    {item.precios_aprobados ? (
                        <div className="text-xs space-y-0.5">
                            <p className="text-blue-700 font-bold">P1: ${item.precio_1_nuevo?.toFixed(2)}</p>
                            <p className="text-purple-600 font-bold">P2: ${item.precio_2_nuevo?.toFixed(2)}</p>
                            <p className="text-emerald-600 font-bold">P3: ${item.precio_3_nuevo?.toFixed(2)}</p>
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-lg">
                                <CheckCircle2 size={10} /> Aprobados
                            </span>
                        </div>
                    ) : item.costo_unitario > 0 ? (
                        <button onClick={approveNewPrices}
                            className="text-xs font-black text-white bg-orange-500 hover:bg-orange-600 px-3 py-2 rounded-xl active:scale-95 transition-all w-full leading-tight">
                            ✅ Aprobar<br />nuevos precios
                        </button>
                    ) : (
                        <span className="text-xs text-slate-300">—</span>
                    )}
                </td>
                {/* Subtotal */}
                <td className="py-3 px-3 align-middle text-right">
                    <p className="font-black text-slate-800">${subtotal.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400">IVA: ${ivaImporte.toFixed(2)}</p>
                </td>
                {/* Actions */}
                <td className="py-3 px-2 align-middle">
                    <button onClick={() => removeItem(item._localId)}
                        className="w-7 h-7 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90">
                        <Trash2 size={14} />
                    </button>
                </td>
            </tr>

            {/* Expanded Precios Preview */}
            {item.expanded && (
                <tr className="bg-amber-50/50 border-b border-amber-100">
                    <td colSpan={10} className="px-4 py-3">
                        <div className="grid grid-cols-3 gap-3 text-sm">
                            {[
                                { label: 'P1 Actual', val: item.precio_1_actual, new: item.precio_1_nuevo, color: 'blue' },
                                { label: 'P2 Med. Mayoreo', val: item.precio_2_actual, new: item.precio_2_nuevo, color: 'purple' },
                                { label: 'P3 Mayoreo', val: item.precio_3_actual, new: item.precio_3_nuevo, color: 'emerald' },
                            ].map(({ label, val, new: nw, color }) => (
                                <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-xl p-3`}>
                                    <p className={`text-[10px] font-black uppercase tracking-wide text-${color}-600 mb-1`}>{label}</p>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-slate-500 line-through text-xs">${val?.toFixed(2) ?? '—'}</span>
                                        <span className={`font-black text-${color}-700`}>${nw?.toFixed(2) ?? '—'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}

// ─── MAIN COMPONENT ─────────────────────────────────────────
export default function NuevaCompra({ onBack }) {
    const { user, selectedBranch } = useAuth()
    const { settings } = useSettings()
    
    const [searchTerm, setSearchTerm] = useState('')
    const [processing, setProcessing] = useState(false)
    const [items, setItems] = useState([])
    const [showImport, setShowImport] = useState(false)
    const [showXML, setShowXML] = useState(false)
    const searchRef = useRef(null)

    // Header state
    const [tipo, setTipo] = useState('FACTURA')
    const [folio, setFolio] = useState('')
    const [proveedorId, setProveedorId] = useState('')
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
    const [notas, setNotas] = useState('')

    const { data: allProductsInDB = [] } = useQuery(
        `SELECT p.*, pr.precio_menudeo, pr.precio_medio_mayoreo, pr.precio_mayoreo,
                pr.utilidad_menudeo, pr.utilidad_medio_mayoreo, pr.utilidad_mayoreo
         FROM productos p
         LEFT JOIN precios pr ON pr.producto_id = p.id`
    )
    const { data: proveedores = [] } = useQuery(`SELECT * FROM proveedores WHERE is_deleted = 0 ORDER BY nombre`)

    // Filter products for dropdown
    const activeProducts = allProductsInDB.filter(p => p.is_deleted === 0 || p.is_deleted == null)
    const filteredProducts = searchTerm.length >= 2
        ? activeProducts.filter(p => `${p.nombre} ${p.sku} ${p.codigo_barras}`.toLowerCase().includes(searchTerm.toLowerCase())).slice(0, 8)
        : []

    const addProduct = useCallback((product) => {
        setItems(prev => {
            const exists = prev.find(i => i._pid === product.id)
            if (exists) {
                return prev.map(i => i._pid === product.id ? { ...i, cantidad_compra: i.cantidad_compra + 1 } : i)
            }
            return [...prev, buildLineItem(product, {}, settings)]
        })
        setSearchTerm('')
        toast.success(`${product.nombre} agregado`)
        searchRef.current?.focus()
    }, [settings])

    const updateItem = useCallback((localId, changes) => {
        setItems(prev => prev.map(i => i._localId === localId ? { ...i, ...changes } : i))
    }, [])

    const removeItem = useCallback((localId) => {
        setItems(prev => prev.filter(i => i._localId !== localId))
    }, [])

    useBarcodeScanner({
        isActive: !processing,
        onScan: (code) => {
            const p = activeProducts.find(p => p.codigo_barras === code || p.sku === code)
            if (p) addProduct(p)
            else toast.error('Código no encontrado en catálogo')
        }
    })

    // ── Bulk import: convert imported rows to compras line items
    const handleBulkLineImport = async (rows, onProgress) => {
        let done = 0
        for (const row of rows) {
            const nombre = row.nombre || row.descripcion || ''
            if (!nombre) { done++; onProgress(done); continue }

            // Try to match existing product by SKU or name
            const found = allProductsInDB.find(p =>
                (row.sku && p.sku?.toLowerCase() === row.sku.toLowerCase()) ||
                p.nombre?.toLowerCase() === nombre.toLowerCase()
            )

            const lineItem = buildLineItem(found || {}, {
                nombre,
                sku: row.sku,
                cantidad_compra: parseFloat(row.cantidad) || 1,
                costo: parseFloat(row.costo_unitario) || 0,
            }, settings)

            // Override unidad and IVA if provided
            if (row.unidad_medida) lineItem.unidad_medida = row.unidad_medida
            if (row.iva_porcentaje) lineItem.iva_porcentaje = parseInt(row.iva_porcentaje) || settings.iva_default || 16

            setItems(prev => [...prev, lineItem])

            done++
            onProgress(done)
        }
        toast.success(`${done} líneas agregadas al documento.`)
    }

    // ── XML Import handler
    const handleXMLImport = (data) => {
        // 1. Auto-fill Header
        setTipo('FACTURA')
        setFolio(data.cabecera.folio || data.cabecera.uuid?.split('-')[0] || '')
        setFecha(data.cabecera.fecha ? data.cabecera.fecha.split('T')[0] : new Date().toISOString().split('T')[0])
        
        // Match Provider by RFC
        const foundProv = proveedores.find(p => p.rfc === data.cabecera.emisor_rfc)
        if (foundProv) {
            setProveedorId(foundProv.id)
            toast.success(`Proveedor vinculado: ${foundProv.nombre}`)
        } else {
            setProveedorId('')
            toast.warning(`No se encontró un proveedor con RFC ${data.cabecera.emisor_rfc}. Por favor, promociónalo manual.`)
        }

        // 2. Parse Items
        let added = 0
        const newItems = []
        for (const c of data.conceptos) {
            const foundProduct = allProductsInDB.find(p => 
                (c.sku && p.sku?.includes(c.sku)) || 
                (c.sku && p.codigo_barras?.includes(c.sku)) ||
                (c.clave_sat && p.codigo_barras?.includes(c.clave_sat)) ||
                (p.nombre?.toLowerCase() === c.nombre.toLowerCase())
            )

            const lineItem = buildLineItem(foundProduct || {}, {
                nombre: c.nombre,
                sku: c.sku,
                cantidad_compra: c.cantidad || 1,
                costo: c.costo_unitario || 0,
            }, settings)
            lineItem.iva_porcentaje = c.iva_porcentaje
            lineItem.unidad_medida = c.unidad_medida
            
            newItems.push(lineItem)
            added++
        }
        setItems(prev => [...prev, ...newItems])
        toast.success(`${added} conceptos extraídos de la factura XML.`)
    }

    // Totals
    const subtotalSinIVA = items.reduce((acc, i) => acc + (i.costo_unitario * i.cantidad_compra), 0)
    const ivaTotal = items.reduce((acc, i) => acc + (i.costo_unitario * i.cantidad_compra * (i.iva_porcentaje / 100)), 0)
    const totalConIVA = subtotalSinIVA + ivaTotal

    const pendingApproval = items.filter(i => i.costo_unitario > 0 && !i.precios_aprobados)

    // ── Atomic Save ───────────────────────────────────────────
    const handleConfirm = async () => {
        if (items.length === 0) { toast.error('Agrega al menos un producto.'); return }
        if (!proveedorId) { toast.error('Selecciona un proveedor.'); return }
        if (pendingApproval.length > 0) {
            toast.error('Precios pendientes de aprobación', {
                description: `${pendingApproval.length} producto(s) tienen nuevos precios calculados. Apruébalos antes de procesar.`
            })
            return
        }

        setProcessing(true)
        try {
            const ordenId = crypto.randomUUID()

            // 1. Cabecera
            await powersync.execute(
                `INSERT INTO ordenes_compra (id, proveedor_id, sucursal_id, usuario_id, tipo_documento, estado,
                    subtotal, iva_total, total, numero_folio, notas, fecha_documento, fecha_creacion, fecha_recepcion)
                 VALUES (?, ?, ?, ?, ?, 'RECIBIDA', ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [ordenId, proveedorId, selectedBranch, user?.id, tipo, subtotalSinIVA, ivaTotal, totalConIVA, folio, notas, fecha]
            )

            for (const item of items) {
                let productId = item._isExistingProduct ? item._pid : null

                // Si el producto es nuevo (no debería pasar en Compras, pero por seguridad)
                if (!productId) {
                    productId = crypto.randomUUID()
                    await powersync.execute(
                        `INSERT INTO productos (id, nombre, sku, codigo_barras, iva_porcentaje, is_deleted, costo_ultimo, created_at)
                         VALUES (?, ?, ?, ?, ?, 0, ?, datetime('now'))`,
                        [productId, item.nombre, item.sku, item.codigo_barras || item.sku, item.iva_porcentaje, item.costo_unitario]
                    )
                }

                const cantidadEntrada = item.cantidad_compra * (item.factor_conversion || 1)

                // 2. Detalle de Compra
                await powersync.execute(
                    `INSERT INTO orden_compra_detalles (id, orden_compra_id, producto_id, unidad_compra, factor_conversion,
                        cantidad_compra, cantidad_entrada, costo_unitario, iva_porcentaje, iva_importe, subtotal,
                        precio_aprobado_1, precio_aprobado_2, precio_aprobado_3)
                     VALUES (?, ?, ?, ?, ?,  ?, ?, ?, ?, ?, ?,  ?, ?, ?)`,
                    [crypto.randomUUID(), ordenId, productId, item.unidad_medida, item.factor_conversion,
                        item.cantidad_compra, cantidadEntrada, item.costo_unitario, item.iva_porcentaje,
                        item.costo_unitario * item.cantidad_compra * (item.iva_porcentaje / 100),
                        item.costo_unitario * item.cantidad_compra,
                        item.precio_1_nuevo, item.precio_2_nuevo, item.precio_3_nuevo]
                )

                // 3. Inventario — suma con FACTOR DE CONVERSIÓN aplicado
                const invRes = await powersync.execute(
                    `SELECT stock_actual FROM inventario WHERE producto_id = ? AND sucursal_id = ? LIMIT 1`,
                    [productId, selectedBranch]
                )
                const prevStock = invRes.rows?._array?.[0]?.stock_actual ?? 0
                const newStock = prevStock + cantidadEntrada

                if (invRes.rows?._array?.length > 0) {
                    await powersync.execute(
                        `UPDATE inventario SET stock_actual = ? WHERE producto_id = ? AND sucursal_id = ?`,
                        [newStock, productId, selectedBranch]
                    )
                } else {
                    await powersync.execute(
                        `INSERT INTO inventario (id, producto_id, sucursal_id, stock_actual, stock_minimo, stock_maximo) VALUES (?, ?, ?, ?, 5, 999)`,
                        [crypto.randomUUID(), productId, selectedBranch, newStock]
                    )
                }

                // 4. Costo Promedio Ponderado: (stock_prev × costo_prev + entrada × nuevo_costo) / nuevo_stock
                const prevCosto = item.costo_promedio_prev ?? item.costo_ultimo_prev ?? item.costo_unitario
                const newCostoPromedio = prevStock > 0
                    ? ((prevStock * prevCosto) + (cantidadEntrada * item.costo_unitario)) / newStock
                    : item.costo_unitario

                await powersync.execute(
                    `UPDATE productos SET is_deleted = 0, costo_ultimo = ?, costo_promedio = ?, updated_at = datetime('now') WHERE id = ?`,
                    [item.costo_unitario, parseFloat(newCostoPromedio.toFixed(4)), productId]
                )

                // 5. Precios (si fueron aprobados)
                if (item.precios_aprobados) {
                    const preciosRes = await powersync.execute(`SELECT id FROM precios WHERE producto_id = ? LIMIT 1`, [productId])
                    if (preciosRes.rows?._array?.length > 0) {
                        await powersync.execute(
                            `UPDATE precios SET precio_menudeo=?, precio_medio_mayoreo=?, precio_mayoreo=? WHERE producto_id=?`,
                            [item.precio_1_nuevo, item.precio_2_nuevo, item.precio_3_nuevo, productId]
                        )
                    } else {
                        await powersync.execute(
                            `INSERT INTO precios (id, producto_id, precio_menudeo, precio_medio_mayoreo, precio_mayoreo, min_mayoreo, utilidad_menudeo, utilidad_medio_mayoreo, utilidad_mayoreo)
                             VALUES (?, ?, ?, ?, ?, 12, ?, ?, ?)`,
                            [crypto.randomUUID(), productId, item.precio_1_nuevo, item.precio_2_nuevo, item.precio_3_nuevo,
                             item.utilidad_menudeo, item.utilidad_medio_mayoreo, item.utilidad_mayoreo]
                        )
                    }
                }

                // 6. Kardex
                await powersync.execute(
                    `INSERT INTO kardex (id, producto_id, sucursal_id, tipo_movimiento, cantidad, saldo_previo, saldo_nuevo, concepto, referencia_id, usuario_id, created_at)
                     VALUES (?, ?, ?, 'ENTRADA', ?, ?, ?, ?, ?, ?, datetime('now'))`,
                    [crypto.randomUUID(), productId, selectedBranch, cantidadEntrada, prevStock, newStock,
                     `Compra ${tipo} ${folio || ''}`.trim(), ordenId, user?.id]
                )
            }

            toast.success('✅ Compra Procesada Exitosamente', {
                description: `${items.length} partidas — Total: $${totalConIVA.toFixed(2)} (c/IVA)`
            })
            setItems([])
            setFolio('')
            setNotas('')
            onBack?.()

        } catch (err) {
            console.error(err)
            toast.error('Error al procesar la compra. Revisa la consola.')
        } finally {
            setProcessing(false)
        }
    }

    return (
        <>
        <div className="flex flex-col h-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Top Bar */}
            <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
                <button onClick={onBack} className="p-2 hover:bg-white rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 transition-all">
                    <ArrowLeft size={20} />
                </button>
                <div>
                    <h2 className="text-lg font-black text-slate-800 tracking-tight">Nueva Compra / Recepción</h2>
                    <p className="text-xs text-slate-400 font-bold">Documento con factor de conversión e inteligencia de costos</p>
                </div>
            </div>

            {/* Header Fields */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 px-6 py-4 border-b border-slate-100 bg-white text-sm shrink-0">
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Tipo Documento</label>
                    <select value={tipo} onChange={e => setTipo(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-blue-500">
                        <option value="FACTURA">Factura Fiscal</option>
                        <option value="REMISION">Remisión / Nota</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Folio / No. Factura</label>
                    <input type="text" value={folio} onChange={e => setFolio(e.target.value)} placeholder="FAC-0001"
                        className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Proveedor *</label>
                    <select value={proveedorId} onChange={e => setProveedorId(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-blue-500">
                        <option value="">-- Seleccionar --</option>
                        {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Fecha Documento</label>
                    <input type="date" value={fecha} onChange={e => setFecha(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-blue-500" />
                </div>
            </div>

            {/* Search Bar + Import Button */}
            <div className="px-6 py-3 border-b border-slate-100 relative z-20 shrink-0">
                <div className="flex gap-3 items-center">
                    <div className="relative flex-1">
                        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input ref={searchRef} type="text" value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Busca producto o escanea código de barras..."
                            className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-2xl pl-10 pr-4 py-3 font-bold text-sm focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                            autoFocus
                        />
                        {filteredProducts.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-72 overflow-y-auto z-50">
                                {filteredProducts.map(p => (
                                    <button key={p.id} onClick={() => addProduct(p)}
                                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center gap-3 border-b border-slate-50 last:border-0">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 text-sm truncate">{p.nombre}</p>
                                            <p className="text-xs font-mono text-slate-400">{p.sku || p.codigo_barras}</p>
                                        </div>
                                        {p.costo_ultimo > 0 && (
                                            <span className="text-xs font-bold text-slate-500 shrink-0">Ú: ${parseFloat(p.costo_ultimo).toFixed(2)}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setShowXML(true)}
                        className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black px-4 py-3 rounded-2xl shadow-lg shadow-indigo-600/30 active:scale-95 transition-all text-sm shrink-0"
                    >
                        <FileJson size={18} />
                        <span className="hidden sm:inline">Leer XML Proveedor</span>
                    </button>
                    <button
                        onClick={() => setShowImport(true)}
                        className="flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 font-bold px-4 py-3 rounded-2xl shadow-sm active:scale-95 transition-all text-sm shrink-0"
                    >
                        <FileSpreadsheet size={17} className="text-blue-600" />
                        <span className="hidden sm:inline">Pegar Excel</span>
                    </button>
                </div>
            </div>

            {/* Items Table */}
            <div className="flex-1 overflow-auto scrollbar-thin">
                {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 p-8">
                        <PackageX size={56} />
                        <div className="text-center">
                            <p className="font-bold text-slate-500 text-lg">Documento vacío</p>
                            <p className="text-sm mt-1">Busca un producto en la barra de arriba o escanea su código.</p>
                        </div>
                    </div>
                ) : (
                    <table className="w-full text-sm border-collapse" style={{ minWidth: '960px' }}>
                        <thead className="bg-slate-50 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                            <tr>
                                <th className="py-2.5 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left border-b border-slate-100 w-24">Código</th>
                                <th className="py-2.5 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left border-b border-slate-100">Descripción</th>
                                <th className="py-2.5 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100 w-20">Unid.</th>
                                <th className="py-2.5 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100 w-28">Cant. Compra</th>
                                <th className="py-2.5 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100 w-24">C. Entrada</th>
                                <th className="py-2.5 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100 w-32">Costo s/IVA</th>
                                <th className="py-2.5 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100 w-20">IVA%</th>
                                <th className="py-2.5 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-100 w-36">Precios</th>
                                <th className="py-2.5 px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right border-b border-slate-100 w-28">Subtotal</th>
                                <th className="py-2.5 px-3 border-b border-slate-100 w-8"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => (
                                <ComprasRow key={item._localId} item={item} idx={idx}
                                    updateItem={updateItem} removeItem={removeItem} />
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Footer: Totals + Action */}
            <div className="border-t border-slate-100 bg-white px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                <div className="flex gap-8 text-sm">
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Subtotal s/IVA</p>
                        <p className="text-xl font-black text-slate-700">${subtotalSinIVA.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">IVA</p>
                        <p className="text-xl font-black text-orange-600">${ivaTotal.toFixed(2)}</p>
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Total c/IVA</p>
                        <p className="text-2xl font-black text-slate-900">${totalConIVA.toFixed(2)}</p>
                    </div>
                </div>

                {pendingApproval.length > 0 && (
                    <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 text-sm font-bold text-orange-700">
                        <AlertTriangle size={16} />
                        {pendingApproval.length} producto(s) con precios pendientes de aprobar
                    </div>
                )}

                <button onClick={handleConfirm} disabled={processing || items.length === 0}
                    className="flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-40 text-base">
                    {processing ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    {processing ? 'Procesando...' : 'PROCESAR COMPRA'}
                </button>
            </div>
        </div>

        {showImport && (
            <ProImportModal
                mode="compras"
                title="Importar líneas desde Excel / Factura"
                onClose={() => setShowImport(false)}
                onImported={handleBulkLineImport}
            />
        )}
        
        <XMLImportModal 
            show={showXML} 
            onClose={() => setShowXML(false)} 
            onImported={handleXMLImport} 
        />
        </>
    )
}

