import { useState, useRef, useCallback } from 'react'
import * as XLSX from 'xlsx'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import {
    Upload, FileSpreadsheet, Play, CheckCircle2, AlertTriangle,
    X, RotateCcw, ChevronDown, ChevronUp, Download, TrendingUp
} from 'lucide-react'

// ─── Constants ─────────────────────────────────────────────
const BATCH_SIZE = 200   // rows per Supabase upsert call
const EMPTY_STATS = { total: 0, inserted: 0, skipped: 0, errors: 0 }

// ─── Column auto-detection helpers ─────────────────────────
function normalizeHeader(h) {
    return String(h ?? '').trim().toUpperCase()
        .replace(/[ÁÀÄÂ]/g, 'A')
        .replace(/[ÉÈËÊ]/g, 'E')
        .replace(/[ÍÌÏÎ]/g, 'I')
        .replace(/[ÓÒÖÔ]/g, 'O')
        .replace(/[ÚÙÜÛ]/g, 'U')
        .replace(/[^A-Z0-9 _]/g, '')
        .trim()
}

const COLUMN_ALIASES = {
    codigo_barras:  ['ARTICULO', 'CODIGO BARRAS', 'CODIGO', 'SKU', 'CLAVE', 'BARCODE', 'ID ARTICULO'],
    nombre:         ['DESCRIPCION', 'NOMBRE', 'PRODUCTO', 'DESCRIPCIÓN', 'ARTICULO NOMBRE'],
    linea:          ['LINEA', 'LÍNEA', 'LINEA NEGOCIO', 'LINE'],
    marca:          ['MARCA', 'BRAND'],
    existencia:     ['EXISTENCIA', 'STOCK', 'CANTIDAD', 'EXIST'],
    precio_menudeo: ['PRECIO', 'PRECIO VENTA', 'P VENTA', 'PRECIO MENUDEO', 'PRECIO1'],
    costo_ultimo:   ['COSTO', 'COSTO ULTIMO', 'PRECIO COSTO', 'COST'],
}

function detectColumns(headers) {
    const result = {}
    const normalized = headers.map(normalizeHeader)
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
        const idx = normalized.findIndex(h => aliases.includes(h))
        if (idx >= 0) result[field] = idx
    }
    return result
}

// ─── Small helper components ────────────────────────────────
function StatCard({ label, value, color }) {
    return (
        <div className={`flex flex-col items-center p-4 rounded-2xl border ${color}`}>
            <span className="text-3xl font-black">{value.toLocaleString()}</span>
            <span className="text-xs font-bold uppercase tracking-widest mt-1 opacity-70">{label}</span>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════
export default function ImportProductos() {
    const { selectedBranch, branches } = useAuth()
    const branchName = branches.find(b => String(b.id) === String(selectedBranch))?.nombre || 'General'

    // File / parsing state
    const [file, setFile]           = useState(null)
    const [headers, setHeaders]     = useState([])
    const [colMap, setColMap]       = useState({})      // { field: colIndex }
    const [previewRows, setPreview] = useState([])
    const [rawRows, setRawRows]     = useState([])     // all non-empty rows
    const [sheetNames, setSheetNames] = useState([])
    const [activeSheet, setSheet]   = useState(0)
    const [workbook, setWorkbook]   = useState(null)

    // Import progress state
    const [running, setRunning]   = useState(false)
    const [done, setDone]         = useState(false)
    const [progress, setProgress] = useState(0)         // 0-100
    const [stats, setStats]       = useState({ ...EMPTY_STATS })
    const [errorLog, setErrorLog] = useState([])
    const [showErrors, setShowErrors] = useState(false)
    const [wiping, setWiping]     = useState(false)
    // Márgenes de utilidad para calcular precios desde costo_ultimo
    const [utilidad1, setUtilidad1] = useState(30)  // Menudeo
    const [utilidad2, setUtilidad2] = useState(20)  // Medio Mayoreo
    const [utilidad3, setUtilidad3] = useState(15)  // Mayoreo
    const abortRef = useRef(false)

    // ── Wipe Inventory ───────────────────────────────────────
    const wipeInventory = async () => {
        if (!selectedBranch) {
            alert('No hay sucursal seleccionada.')
            return
        }
        const confirmStr = `BORRAR ${branchName}`
        const p = prompt(`🚨 ¡ATENCIÓN! 🚨\nEsto borrará TODO el inventario actual de la sucursal "${branchName}".\n\nSi estás seguro, escribe exactamente:\n${confirmStr}`)
        
        if (p !== confirmStr) {
            alert('Cancelado. No se borró nada.')
            return
        }

        setWiping(true)
        try {
            const { error } = await supabase
                .from('inventario')
                .delete()
                .eq('sucursal_id', selectedBranch)

            if (error) throw error
            alert(`✅ Inventario de ${branchName} borrado exitosamente. Ahora puedes hacer una importación limpia.`)
        } catch (err) {
            alert('Error al borrar inventario:\n' + err.message)
        } finally {
            setWiping(false)
        }
    }

    // ── File picker ──────────────────────────────────────────
    const onFileChange = useCallback((e) => {
        const f = e.target.files?.[0]
        if (!f) return
        setFile(f)
        setDone(false)
        setStats({ ...EMPTY_STATS })
        setErrorLog([])
        setProgress(0)

        const reader = new FileReader()
        reader.onload = (ev) => {
            try {
                const wb = XLSX.read(ev.target.result, { type: 'array' })
                setWorkbook(wb)
                setSheetNames(wb.SheetNames)
                loadSheet(wb, 0)
            } catch (err) {
                alert('No se pudo leer el archivo: ' + err.message)
            }
        }
        reader.readAsArrayBuffer(f)
    }, [])

    const loadSheet = (wb, sheetIdx) => {
        setSheet(sheetIdx)
        const ws = wb.Sheets[wb.SheetNames[sheetIdx]]
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

        // Find header row (first row with ≥3 non-empty cells)
        let headerRowIdx = 0
        for (let i = 0; i < Math.min(10, rawData.length); i++) {
            const row = rawData[i]
            if (row.filter(c => String(c).trim() !== '').length >= 3) {
                headerRowIdx = i
                break
            }
        }

        const hdrs = rawData[headerRowIdx].map(h => String(h ?? '').trim())
        const detected = detectColumns(hdrs)
        const dataRows = rawData.slice(headerRowIdx + 1).filter(row =>
            row.some(cell => String(cell).trim() !== '')
        )

        setHeaders(hdrs)
        setColMap(detected)
        setRawRows(dataRows)
        setPreview(dataRows.slice(0, 8))
    }

    const onSheetChange = (idx) => {
        if (workbook) loadSheet(workbook, idx)
    }

    // ── Build producto row from Excel row ────────────────────
    const buildProducto = (row) => {
        const get = (field) => {
            const idx = colMap[field]
            return idx !== undefined ? String(row[idx] ?? '').trim() : ''
        }
        const getNum = (field) => {
            const v = parseFloat(get(field))
            return isNaN(v) ? null : v
        }

        const codigo = get('codigo_barras')
        if (!codigo) return null   // skip rows without code

        const costo = getNum('costo_ultimo')

        return {
            producto: {
                codigo_barras: codigo,
                sku: codigo,
                nombre: get('nombre') || codigo,
                linea: get('linea') || null,
                marca: get('marca') || null,
                // Only set costo_ultimo if it exists in the file — don't overwrite with null
                ...(costo !== null && { costo_ultimo: costo, costo_promedio: costo }),
                iva_porcentaje: 16,
                is_deleted: 0,
            },
            precio_menudeo: getNum('precio_menudeo'),
            costo,
            existencia: getNum('existencia') ?? 0,
        }
    }

    // ── Core import logic ─────────────────────────────────────
    const startImport = async () => {
        if (!colMap.codigo_barras && !colMap.nombre) {
            alert('No se detectó la columna de ARTICULO o DESCRIPCION. Revisa el mapeo.')
            return
        }

        abortRef.current = false
        setRunning(true)
        setDone(false)
        setProgress(0)
        setStats({ ...EMPTY_STATS })
        setErrorLog([])

        let inserted = 0, skipped = 0, errors = 0, total = 0
        const errLog = []

        // Build all valid product rows and deduplicate
        const productsMap = new Map()
        for (const row of rawRows) {
            const built = buildProducto(row)
            if (!built) { skipped++; continue }
            
            const cod = built.producto.codigo_barras
            if (productsMap.has(cod)) {
                // Duplicate found: sum the inventory, but keep the first data
                const existing = productsMap.get(cod)
                existing.existencia += built.existencia
                skipped++ // Count duplicates as skipped
            } else {
                productsMap.set(cod, built)
                total++
            }
        }
        const allProducts = Array.from(productsMap.values())
        setStats(s => ({ ...s, total }))

        // Process in batches
        for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
            if (abortRef.current) break

            const chunk = allProducts.slice(i, i + BATCH_SIZE)

            // --- Upsert productos ---
            const productosPayload = chunk.map(p => p.producto)
            const { error: prodErr } = await supabase
                .from('productos')
                .upsert(productosPayload, {
                    onConflict: 'codigo_barras',
                    ignoreDuplicates: false
                })

            if (prodErr) {
                errors += chunk.length
                const msg = `Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${prodErr.message}`
                errLog.push(msg)
                setErrorLog([...errLog])
                // Show first error immediately as an alert so it's not missed
                if (i === 0) alert(`❌ Error al importar productos:\n\n${prodErr.message}\n\nCódigo: ${prodErr.code}`)

            } else {
                // Fetch IDs once — shared by both inventario and precios
                const codigos = productosPayload.map(p => p.codigo_barras)
                const { data: dbProducts, error: fetchErr } = await supabase
                    .from('productos')
                    .select('id, codigo_barras')
                    .in('codigo_barras', codigos)

                if (fetchErr) {
                    errLog.push(`Lote ${Math.floor(i / BATCH_SIZE) + 1} (fetch): ${fetchErr.message}`)
                    setErrorLog([...errLog])
                } else if (dbProducts && dbProducts.length > 0) {
                    const codeToId = {}
                    dbProducts.forEach(p => { codeToId[p.codigo_barras] = p.id })

                    // --- Inventario ---
                    if (selectedBranch) {
                        const inventarioRows = chunk
                            .filter(p => codeToId[p.producto.codigo_barras])
                            .map(p => ({
                                producto_id: codeToId[p.producto.codigo_barras],
                                sucursal_id: selectedBranch,
                                stock_actual: p.existencia ?? 0,
                                stock_minimo: 0,
                                stock_maximo: 9999,
                            }))

                        if (inventarioRows.length > 0) {
                            const { error: invErr } = await supabase
                                .from('inventario')
                                .upsert(inventarioRows, { onConflict: 'producto_id,sucursal_id' })
                            if (invErr) {
                                errLog.push(`Lote ${Math.floor(i / BATCH_SIZE) + 1} (inv): ${invErr.message}`)
                                setErrorLog([...errLog])
                            }
                        }
                    }

                    // --- Precios (calculados desde costo_ultimo + margen) ---
                    const preciosRows = chunk
                        .filter(p => codeToId[p.producto.codigo_barras] && (p.costo > 0 || p.precio_menudeo > 0))
                        .map(p => {
                            const costo = p.costo ?? 0
                            const pm  = p.precio_menudeo > 0 ? p.precio_menudeo : (costo > 0 ? Math.round(costo / (1 - utilidad1 / 100) * 100) / 100 : 0)
                            const pmm = costo > 0 ? Math.round(costo / (1 - utilidad2 / 100) * 100) / 100 : pm
                            const pM  = costo > 0 ? Math.round(costo / (1 - utilidad3 / 100) * 100) / 100 : pm
                            return {
                                producto_id: codeToId[p.producto.codigo_barras],
                                precio_menudeo: pm,
                                precio_medio_mayoreo: pmm,
                                precio_mayoreo: pM,
                                min_mayoreo: 12,
                                min_medio_mayoreo: 6,
                                utilidad_menudeo: utilidad1,
                                utilidad_medio_mayoreo: utilidad2,
                                utilidad_mayoreo: utilidad3,
                            }
                        })

                    if (preciosRows.length > 0) {
                        const { error: precioErr } = await supabase
                            .from('precios')
                            .upsert(preciosRows, { onConflict: 'producto_id' })
                        if (precioErr) {
                            errLog.push(`Lote ${Math.floor(i / BATCH_SIZE) + 1} (precios): ${precioErr.message}`)
                            setErrorLog([...errLog])
                        }
                    }
                }

                inserted += chunk.length
            }

            const pct = Math.round(((i + chunk.length) / allProducts.length) * 100)
            setProgress(pct)
            setStats({ total, inserted, skipped, errors })

            // Small yield to keep UI responsive
            await new Promise(r => setTimeout(r, 0))
        }

        setRunning(false)
        setDone(true)
        setProgress(100)
        setStats({ total, inserted, skipped, errors })
    }

    const abort = () => { abortRef.current = true }
    const reset = () => {
        setFile(null); setHeaders([]); setColMap({}); setPreview([])
        setRawRows([]); setStats({ ...EMPTY_STATS }); setDone(false)
        setProgress(0); setErrorLog([])
    }

    // ── Download error log ───────────────────────────────────
    const downloadErrors = () => {
        const blob = new Blob([errorLog.join('\n')], { type: 'text/plain' })
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
        a.download = 'errores_importacion.txt'; a.click()
    }

    // ── Render ────────────────────────────────────────────────
    return (
        <div className="flex flex-col flex-1 overflow-auto bg-slate-100">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shadow-sm shrink-0">
                <div className="w-11 h-11 bg-blue-100 rounded-2xl flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="text-blue-600" size={22} />
                </div>
                <div className="flex-1">
                    <h1 className="text-xl font-black text-slate-800">Importar Productos</h1>
                    <p className="text-xs font-bold text-slate-400">
                        Destino: <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-widest">{branchName}</span> · MyBusinessPOS → Supabase
                    </p>
                </div>
                
                <div className="flex items-center gap-4">
                    {!running && !done && (
                        <button 
                            onClick={wipeInventory}
                            disabled={wiping}
                            className="flex items-center gap-2 text-xs font-black text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-colors disabled:opacity-50">
                            <AlertTriangle size={14} />
                            {wiping ? 'Borrando...' : 'Vaciar Inventario Actual'}
                        </button>
                    )}
                    {(file || done) && (
                        <button onClick={reset} className="flex items-center gap-2 text-xs font-black text-slate-400 hover:text-red-500 transition-colors">
                            <RotateCcw size={14} /> Empezar de nuevo
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-6 max-w-4xl mx-auto w-full">

                {/* ── STEP 1: File Drop ── */}
                {!file && (
                    <label className="block cursor-pointer">
                        <div className="border-3 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors rounded-3xl p-16 flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                                <Upload className="text-blue-500" size={32} />
                            </div>
                            <div className="text-center">
                                <p className="font-black text-slate-700 text-lg">Arrastra tu Excel aquí</p>
                                <p className="text-sm font-bold text-slate-400 mt-1">o haz clic para seleccionar · .xlsx, .xls, .csv</p>
                            </div>
                            <p className="text-xs font-bold text-blue-500 bg-blue-100 px-3 py-1.5 rounded-xl">
                                Formato MyBusinessPOS: ARTICULO · DESCRIPCION · LINEA · MARCA · EXISTENCIA
                            </p>
                        </div>
                        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFileChange} />
                    </label>
                )}

                {/* ── STEP 2: Config + Preview ── */}
                {file && !done && (
                    <>
                        {/* File info */}
                        <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-4 shadow-sm">
                            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                                <FileSpreadsheet className="text-emerald-600" size={18} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-slate-800 truncate">{file.name}</p>
                                <p className="text-xs font-bold text-slate-400">
                                    {rawRows.length.toLocaleString()} filas detectadas
                                    {sheetNames.length > 1 && ` · ${sheetNames.length} hojas`}
                                </p>
                            </div>
                        </div>

                        {/* Sheet selector */}
                        {sheetNames.length > 1 && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Hoja de Excel</p>
                                <div className="flex flex-wrap gap-2">
                                    {sheetNames.map((name, i) => (
                                        <button key={i} onClick={() => onSheetChange(i)}
                                            className={`px-4 py-2 rounded-xl font-black text-sm transition-all ${activeSheet === i ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                                            {name}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Column mapping */}
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-5 py-4 border-b border-slate-100">
                                <p className="font-black text-slate-800">Mapeo de Columnas</p>
                                <p className="text-xs font-bold text-slate-400">Detectado automáticamente — ajusta si es necesario</p>
                            </div>
                            <div className="p-5 grid grid-cols-2 gap-4">
                                {Object.entries({
                                    codigo_barras:  'Código / Artículo *',
                                    nombre:         'Nombre / Descripción *',
                                    linea:          'Línea',
                                    marca:          'Marca',
                                    existencia:     'Existencia (Stock)',
                                    precio_menudeo: 'Precio de Venta',
                                    costo_ultimo:   'Costo',
                                }).map(([field, label]) => (
                                    <div key={field}>
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">{label}</label>
                                        <select
                                            value={colMap[field] ?? ''}
                                            onChange={e => setColMap(prev => ({
                                                ...prev,
                                                [field]: e.target.value === '' ? undefined : parseInt(e.target.value)
                                            }))}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500">
                                            <option value="">— Sin mapear —</option>
                                            {headers.map((h, i) => (
                                                <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Preview table */}
                        {previewRows.length > 0 && (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-slate-100">
                                    <p className="font-black text-slate-800">Vista Previa</p>
                                    <p className="text-xs font-bold text-slate-400">Primeras 8 filas</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-slate-50">
                                                {['Código', 'Nombre', 'Línea', 'Marca', 'Stock', 'Precio'].map(h => (
                                                    <th key={h} className="text-left px-4 py-2 font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {previewRows.map((row, i) => {
                                                const get = (f) => colMap[f] !== undefined ? String(row[colMap[f]] ?? '').trim() : '—'
                                                return (
                                                    <tr key={i} className="border-t border-slate-50 hover:bg-slate-50">
                                                        <td className="px-4 py-2 font-mono text-slate-700 whitespace-nowrap">{get('codigo_barras')}</td>
                                                        <td className="px-4 py-2 font-bold text-slate-700 max-w-[240px] truncate">{get('nombre')}</td>
                                                        <td className="px-4 py-2 text-slate-500">{get('linea')}</td>
                                                        <td className="px-4 py-2 text-slate-500">{get('marca')}</td>
                                                        <td className="px-4 py-2 text-slate-500">{get('existencia')}</td>
                                                        <td className="px-4 py-2 text-slate-500">{get('precio_menudeo')}</td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Márgenes de Utilidad */}
                        {rawRows.length > 0 && (
                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={16} className="text-amber-600" />
                                    <span className="text-sm font-black text-amber-700">Márgenes de Utilidad para calcular precios</span>
                                    <span className="text-xs text-amber-500 ml-auto">Precio = Costo ÷ (1 − Margen%)</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: 'Menudeo', val: utilidad1, set: setUtilidad1 },
                                        { label: 'Medio Mayoreo', val: utilidad2, set: setUtilidad2 },
                                        { label: 'Mayoreo', val: utilidad3, set: setUtilidad3 },
                                    ].map(({ label, val, set }) => (
                                        <div key={label} className="flex flex-col gap-1">
                                            <label className="text-xs font-bold text-amber-700">{label}</label>
                                            <div className="flex items-center gap-1 bg-white border border-amber-300 rounded-lg px-2 py-1">
                                                <input
                                                    type="number" min="1" max="99" step="1"
                                                    value={val}
                                                    onChange={e => set(Math.min(99, Math.max(1, Number(e.target.value))))}
                                                    className="w-full text-sm font-black text-amber-900 bg-transparent outline-none text-right"
                                                />
                                                <span className="text-xs text-amber-400 shrink-0">%</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Import button */}
                        {!running && (
                            <button onClick={startImport}
                                disabled={!colMap.codigo_barras && !colMap.nombre}
                                className="w-full flex items-center justify-center gap-3 py-5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-black text-lg rounded-2xl shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                                <Play size={22} />
                                Iniciar Importación · {rawRows.length.toLocaleString()} productos
                            </button>
                        )}

                        {/* Progress section */}
                        {running && (
                            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                                <div className="flex items-center justify-between">
                                    <p className="font-black text-slate-800">Importando...</p>
                                    <button onClick={abort} className="flex items-center gap-1.5 text-xs font-black text-red-500 hover:text-red-700 transition-colors">
                                        <X size={14} /> Detener
                                    </button>
                                </div>

                                {/* Progress bar */}
                                <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                                    <div
                                        className="h-4 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                                <p className="text-center font-black text-slate-700 text-2xl">{progress}%</p>

                                {/* Live stats */}
                                <div className="grid grid-cols-4 gap-3">
                                    <StatCard label="Total" value={stats.total} color="border-slate-200 text-slate-700" />
                                    <StatCard label="Importados" value={stats.inserted} color="border-emerald-200 text-emerald-700" />
                                    <StatCard label="Omitidos" value={stats.skipped} color="border-amber-200 text-amber-700" />
                                    <StatCard label="Errores" value={stats.errors} color="border-red-200 text-red-700" />
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* ── STEP 3: Done ── */}
                {done && (
                    <div className="space-y-4">
                        <div className="bg-white rounded-3xl border border-emerald-200 p-8 shadow-sm flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
                                <CheckCircle2 className="text-emerald-600" size={36} />
                            </div>
                            <div className="text-center">
                                <h2 className="text-2xl font-black text-slate-800">¡Importación Completada!</h2>
                                <p className="text-slate-400 font-bold text-sm mt-1">
                                    Los productos ya están en Supabase y sincronizándose con todos los dispositivos.
                                </p>
                            </div>

                            <div className="grid grid-cols-4 gap-3 w-full mt-2">
                                <StatCard label="Total" value={stats.total} color="border-slate-200 text-slate-700" />
                                <StatCard label="Importados" value={stats.inserted} color="border-emerald-200 text-emerald-700" />
                                <StatCard label="Omitidos" value={stats.skipped} color="border-amber-200 text-amber-700" />
                                <StatCard label="Errores" value={stats.errors} color="border-red-200 text-red-700" />
                            </div>
                        </div>

                        {/* Error log */}
                        {errorLog.length > 0 && (
                            <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
                                <button onClick={() => setShowErrors(!showErrors)}
                                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-red-50 transition-colors">
                                    <div className="flex items-center gap-2">
                                        <AlertTriangle className="text-red-500" size={18} />
                                        <span className="font-black text-red-700">{errorLog.length} lote(s) con errores</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={(e) => { e.stopPropagation(); downloadErrors() }}
                                            className="flex items-center gap-1.5 text-xs font-black text-red-500 hover:text-red-700">
                                            <Download size={14} /> Descargar log
                                        </button>
                                        {showErrors ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                </button>
                                {showErrors && (
                                    <div className="px-5 pb-5 space-y-1 max-h-48 overflow-auto">
                                        {errorLog.map((e, i) => (
                                            <p key={i} className="text-xs font-mono text-red-600 bg-red-50 px-3 py-2 rounded-lg">{e}</p>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="flex gap-3">
                            <button onClick={reset}
                                className="flex-1 flex items-center justify-center gap-2 py-4 bg-white border border-slate-200 text-slate-700 font-black rounded-2xl hover:bg-slate-50 transition-colors">
                                <Upload size={18} /> Importar otro archivo
                            </button>
                            <a href="/productos"
                                className="flex-1 flex items-center justify-center gap-2 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-colors">
                                <FileSpreadsheet size={18} /> Ver Catálogo
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
