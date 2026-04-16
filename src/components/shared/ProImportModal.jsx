import { useState, useRef, useCallback, useEffect } from 'react'
import {
    X, Upload, FileSpreadsheet, ClipboardPaste, Check, AlertTriangle,
    ChevronRight, ChevronLeft, Loader2, Download, Trash2, Plus, Info
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Importar xlsx-js-style para leer Excel ──────────────────
let XLSX = null
const loadXLSX = async () => {
    if (XLSX) return XLSX
    const mod = await import('xlsx-js-style')
    XLSX = mod.default || mod
    return XLSX
}

// ─── Helpers de parseo ───────────────────────────────────────
const parseTSV = (text) => {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return { headers: [], rows: [] }
    const headers = lines[0].split('\t').map(h => h.trim().replace(/^"|"$/g, ''))
    const rows = lines.slice(1).map(line =>
        line.split('\t').map(cell => cell.trim().replace(/^"|"$/g, ''))
    )
    return { headers, rows }
}

const parseCSV = (text) => {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length === 0) return { headers: [], rows: [] }

    // Handle quoted CSV properly
    const splitCSVLine = (line) => {
        const result = []; let current = ''; let inQuotes = false
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '"') { inQuotes = !inQuotes }
            else if (line[i] === ',' && !inQuotes) { result.push(current.trim()); current = '' }
            else { current += line[i] }
        }
        result.push(current.trim())
        return result
    }

    const headers = splitCSVLine(lines[0])
    const rows = lines.slice(1).map(splitCSVLine)
    return { headers, rows }
}

const normalizeHeader = (h) => h?.toLowerCase().trim()
    .replace(/\s+/g, '_')
    .replace(/[áéíóú]/g, c => ({ á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u' })[c] || c)
    .replace(/[^a-z0-9_]/g, '')

// ─── Column mapping definitions per mode ────────────────────
export const SCHEMAS = {
    productos: {
        label: 'Catálogo de Productos',
        columns: [
            { key: 'nombre', label: 'Nombre / Descripción', required: true, aliases: ['nombre', 'descripcion', 'producto', 'name', 'description'] },
            { key: 'sku', label: 'SKU / Código Interno', required: true, aliases: ['sku', 'codigo', 'codigo_interno', 'referencia', 'ref'] },
            { key: 'codigo_barras', label: 'Código de Barras', required: false, aliases: ['codigo_barras', 'barcode', 'ean', 'upc', 'codigo_barras_interno'] },
            { key: 'precio_menudeo', label: 'Precio Público (P1)', required: false, aliases: ['precio', 'precio_menudeo', 'precio_venta', 'precio_publico', 'p1', 'pvp'] },
            { key: 'precio_mayoreo', label: 'Precio Mayoreo (P3)', required: false, aliases: ['precio_mayoreo', 'mayoreo', 'p3', 'precio_distribuidor'] },
            { key: 'costo', label: 'Costo de Compra', required: false, aliases: ['costo', 'costo_unitario', 'costo_compra', 'precio_costo', 'cost'] },
            { key: 'stock', label: 'Stock Inicial', required: false, aliases: ['stock', 'existencias', 'cantidad', 'inventory', 'qty'] },
            { key: 'categoria', label: 'Categoría', required: false, aliases: ['categoria', 'category', 'linea', 'familia', 'grupo'] },
            { key: 'marca', label: 'Marca', required: false, aliases: ['marca', 'brand', 'fabricante'] },
            { key: 'unidad_medida', label: 'Unidad', required: false, aliases: ['unidad', 'unidad_medida', 'um', 'unit'] },
            { key: 'iva_porcentaje', label: 'IVA %', required: false, aliases: ['iva', 'iva_porcentaje', 'impuesto', 'tax'] },
        ]
    },
    compras: {
        label: 'Líneas de Compra',
        columns: [
            { key: 'nombre', label: 'Nombre / Descripción', required: true, aliases: ['nombre', 'descripcion', 'producto', 'concepto', 'description'] },
            { key: 'sku', label: 'SKU / Código', required: false, aliases: ['sku', 'codigo', 'clave', 'ref', 'articulo'] },
            { key: 'cantidad', label: 'Cantidad', required: true, aliases: ['cantidad', 'qty', 'pzas', 'piezas', 'cant'] },
            { key: 'costo_unitario', label: 'Costo Unitario s/IVA', required: true, aliases: ['costo', 'costo_unitario', 'precio_unitario', 'precio', 'unit_price', 'importe_unitario'] },
            { key: 'iva_porcentaje', label: 'IVA %', required: false, aliases: ['iva', 'iva_porcentaje', 'impuesto', 'tasa_iva'] },
            { key: 'unidad_medida', label: 'Unidad', required: false, aliases: ['unidad', 'um', 'unit', 'unidad_medida'] },
        ]
    },
}

// ─── Auto-detect column mapping ──────────────────────────────
const autoMapColumns = (headers, schemaColumns) => {
    const mapping = {}
    schemaColumns.forEach(col => {
        const found = headers.findIndex(h =>
            col.aliases.includes(normalizeHeader(h))
        )
        if (found >= 0) mapping[col.key] = found
    })
    return mapping
}

// ─── Step 1: Source Selector ────────────────────────────────
function StepSource({ mode, onParsed, schema }) {
    const fileRef = useRef(null)
    const [dragOver, setDragOver] = useState(false)
    const [pasteText, setPasteText] = useState('')
    const [pasteMode, setPasteMode] = useState(false)
    const [parsing, setParsing] = useState(false)

    const processRaw = async (file = null, rawText = null) => {
        setParsing(true)
        try {
            let headers = [], rows = []

            if (file) {
                const buf = await file.arrayBuffer()
                const xls = await loadXLSX()
                const wb = xls.read(buf, { type: 'array' })
                const ws = wb.Sheets[wb.SheetNames[0]]
                const raw = xls.utils.sheet_to_json(ws, { header: 1, defval: '' })
                if (raw.length < 2) { toast.error('La hoja está vacía o tiene menos de 2 filas.'); return }
                headers = raw[0].map(String)
                rows = raw.slice(1).map(r => r.map(String))
            } else if (rawText) {
                // Auto-detect TSV vs CSV
                const isTSV = rawText.includes('\t')
                const parsed = isTSV ? parseTSV(rawText) : parseCSV(rawText)
                headers = parsed.headers
                rows = parsed.rows
            }

            // Filter empty rows
            rows = rows.filter(r => r.some(cell => cell?.toString().trim()))

            if (headers.length === 0 || rows.length === 0) {
                toast.error('No se encontraron datos. Verifica que el archivo tenga encabezados y filas.')
                return
            }

            const mapping = autoMapColumns(headers, schema.columns)
            onParsed({ headers, rows, mapping })
        } catch (err) {
            console.error(err)
            toast.error('Error al leer el archivo. Verifica que sea Excel (.xlsx) o CSV válido.')
        } finally {
            setParsing(false)
        }
    }

    const handleFile = async (file) => {
        if (!file) return
        const ext = file.name.split('.').pop().toLowerCase()
        if (!['xlsx', 'xls', 'csv', 'txt'].includes(ext)) {
            toast.error('Solo se aceptan archivos .xlsx, .xls, .csv o .txt')
            return
        }
        if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
            const reader = new FileReader()
            reader.onload = (e) => processRaw(null, e.target.result)
            reader.readAsText(file, 'UTF-8')
        } else {
            processRaw(file)
        }
    }

    const handleDrop = (e) => {
        e.preventDefault(); setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }

    const downloadTemplate = () => {
        const header = schema.columns.map(c => c.label).join(',')
        const example = schema.columns.map(c => {
            if (c.key === 'nombre') return 'Llave Philips #2'
            if (c.key === 'sku') return 'FERR-001'
            if (c.key === 'precio_menudeo' || c.key === 'costo_unitario') return '45.50'
            if (c.key === 'cantidad' || c.key === 'stock') return '100'
            if (c.key === 'iva_porcentaje') return '16'
            if (c.key === 'unidad_medida') return 'Pza'
            return ''
        }).join(',')
        const csv = `${header}\n${example}\n`
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = `plantilla_${mode}.csv`; a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="space-y-6">
            {!pasteMode ? (
                <>
                    {/* Drag & Drop Zone */}
                    <div
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileRef.current?.click()}
                        className={`relative border-2 border-dashed rounded-3xl p-12 text-center cursor-pointer transition-all duration-200
                            ${dragOver ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50'}`}
                    >
                        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.txt" className="hidden"
                            onChange={(e) => handleFile(e.target.files?.[0])} />
                        {parsing ? (
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 size={40} className="text-blue-500 animate-spin" />
                                <p className="font-bold text-slate-600">Procesando archivo...</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center">
                                    <FileSpreadsheet size={32} className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-black text-slate-700 text-lg">Arrastra tu archivo aquí</p>
                                    <p className="text-slate-400 text-sm mt-1">O haz clic para seleccionar · Excel (.xlsx) o CSV</p>
                                </div>
                                {dragOver && (
                                    <div className="absolute inset-0 bg-blue-500/10 rounded-3xl flex items-center justify-center">
                                        <p className="text-blue-600 font-black text-xl">¡Suelta el archivo!</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-center gap-3">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">o</span>
                        <div className="h-px flex-1 bg-slate-200" />
                    </div>

                    {/* Paste Mode Button */}
                    <button
                        onClick={() => setPasteMode(true)}
                        className="w-full flex items-center gap-4 p-5 bg-slate-50 hover:bg-emerald-50 border-2 border-dashed border-slate-200 hover:border-emerald-400 rounded-2xl transition-all group"
                    >
                        <div className="w-12 h-12 bg-emerald-100 group-hover:bg-emerald-200 rounded-2xl flex items-center justify-center transition-colors">
                            <ClipboardPaste size={22} className="text-emerald-600" />
                        </div>
                        <div className="text-left">
                            <p className="font-black text-slate-700">Pegar filas desde Excel / Google Sheets</p>
                            <p className="text-slate-400 text-sm mt-0.5">Copia las celdas en tu hoja de cálculo y pégalas aquí (Ctrl+V)</p>
                        </div>
                    </button>

                    {/* Download Template */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Info size={13} />
                            <span>La primera fila debe ser el encabezado de columnas</span>
                        </div>
                        <button onClick={downloadTemplate}
                            className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline">
                            <Download size={14} /> Descargar plantilla
                        </button>
                    </div>
                </>
            ) : (
                /* Paste textarea mode */
                <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                        <ClipboardPaste size={20} className="text-emerald-600 shrink-0" />
                        <p className="text-sm text-emerald-800 font-bold">
                            Copia las celdas en Excel o Google Sheets <strong>(incluyendo la fila de encabezados)</strong> y pega aquí con Ctrl+V
                        </p>
                    </div>
                    <textarea
                        autoFocus
                        value={pasteText}
                        onChange={e => setPasteText(e.target.value)}
                        onPaste={e => {
                            const text = e.clipboardData.getData('text')
                            if (text) {
                                e.preventDefault()
                                setPasteText(text)
                                processRaw(null, text)
                            }
                        }}
                        placeholder="Pega aquí el contenido copiado de tu hoja de cálculo..."
                        className="w-full h-48 bg-white border-2 border-slate-200 focus:border-emerald-500 rounded-2xl p-4 font-mono text-sm text-slate-700 focus:outline-none resize-none"
                    />
                    <div className="flex gap-3">
                        <button onClick={() => setPasteMode(false)}
                            className="px-4 py-2.5 text-slate-600 font-bold border border-slate-200 rounded-xl hover:bg-slate-50">
                            ← Atrás
                        </button>
                        <button
                            onClick={() => processRaw(null, pasteText)}
                            disabled={!pasteText.trim() || parsing}
                            className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl disabled:opacity-40 transition-all">
                            {parsing ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={16} />}
                            Procesar datos
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

// ─── Step 2: Column Mapping ──────────────────────────────────
function StepMapping({ headers, schema, mapping, onMappingChange }) {
    return (
        <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <Info size={16} className="text-blue-600 mt-0.5 shrink-0" />
                <p className="text-sm text-blue-800 font-bold">
                    El sistema detectó automáticamente las columnas. Verifica y ajusta si es necesario.
                </p>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                            <th className="py-2.5 px-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Campo del sistema</th>
                            <th className="py-2.5 px-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Req.</th>
                            <th className="py-2.5 px-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Columna en tu archivo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {schema.columns.map(col => {
                            const mappedIdx = mapping[col.key] ?? -1
                            return (
                                <tr key={col.key} className={mappedIdx === -1 && col.required ? 'bg-red-50' : ''}>
                                    <td className="py-3 px-4">
                                        <p className="font-bold text-slate-700 text-sm">{col.label}</p>
                                        <p className="text-[10px] text-slate-400 font-mono">campo: {col.key}</p>
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                        {col.required ? (
                                            <span className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-0.5 rounded">REQ</span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-300">opt</span>
                                        )}
                                    </td>
                                    <td className="py-3 px-4">
                                        <select
                                            value={mappedIdx}
                                            onChange={e => onMappingChange(col.key, parseInt(e.target.value))}
                                            className={`w-full bg-white border rounded-xl px-3 py-2 text-sm font-bold focus:outline-none focus:border-blue-500 transition-colors
                                                ${mappedIdx === -1 ? col.required ? 'border-red-300 text-red-500' : 'border-slate-200 text-slate-300' : 'border-emerald-300 text-emerald-700'}`}
                                        >
                                            <option value={-1}>— No importar —</option>
                                            {headers.map((h, i) => (
                                                <option key={i} value={i}>{h}</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

// ─── Step 3: Preview & Validation ───────────────────────────
function StepPreview({ rows, headers, schema, mapping, onRowChange, onRowRemove }) {
    const requiredCols = schema.columns.filter(c => c.required)

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-600">{rows.length} filas listas para importar</p>
                <div className="flex gap-3 text-xs font-bold">
                    <span className="text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        ✅ {rows.filter(r => requiredCols.every(c => mapping[c.key] !== undefined && mapping[c.key] >= 0 && r[mapping[c.key]]?.toString().trim())).length} válidas
                    </span>
                    <span className="text-red-500 bg-red-50 px-2.5 py-1 rounded-lg">
                        ⚠️ {rows.filter(r => requiredCols.some(c => mapping[c.key] !== undefined && mapping[c.key] >= 0 && !r[mapping[c.key]]?.toString().trim())).length} con errores
                    </span>
                </div>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden">
                <div className="overflow-auto max-h-72">
                    <table className="w-full text-xs border-collapse" style={{ minWidth: '600px' }}>
                        <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-100">
                            <tr>
                                <th className="py-2 px-3 text-left font-black text-slate-400 uppercase tracking-widest">#</th>
                                {schema.columns.filter(c => mapping[c.key] !== undefined && mapping[c.key] >= 0).map(c => (
                                    <th key={c.key} className="py-2 px-3 text-left font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                                        {c.label} {c.required && <span className="text-red-400">*</span>}
                                    </th>
                                ))}
                                <th className="py-2 px-3 w-8" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {rows.map((row, ri) => {
                                const hasError = requiredCols.some(c =>
                                    mapping[c.key] >= 0 && !row[mapping[c.key]]?.toString().trim()
                                )
                                return (
                                    <tr key={ri} className={`group ${hasError ? 'bg-red-50' : 'hover:bg-slate-50'}`}>
                                        <td className="py-1.5 px-3 text-slate-400 font-mono">{ri + 1}</td>
                                        {schema.columns.filter(c => mapping[c.key] !== undefined && mapping[c.key] >= 0).map(c => {
                                            const isEmpty = c.required && !row[mapping[c.key]]?.toString().trim()
                                            return (
                                                <td key={c.key} className="py-1 px-2">
                                                    <input
                                                        type="text"
                                                        value={row[mapping[c.key]] ?? ''}
                                                        onChange={e => onRowChange(ri, mapping[c.key], e.target.value)}
                                                        className={`w-full bg-transparent border rounded-lg px-2 py-1 font-bold focus:outline-none focus:bg-white transition-colors min-w-[80px]
                                                            ${isEmpty ? 'border-red-300 text-red-600 bg-red-50' : 'border-transparent hover:border-slate-200 focus:border-blue-400 text-slate-700'}`}
                                                    />
                                                </td>
                                            )
                                        })}
                                        <td className="py-1.5 px-2">
                                            <button onClick={() => onRowRemove(ri)}
                                                className="w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                                <Trash2 size={12} />
                                            </button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

// ─── MAIN MODAL ──────────────────────────────────────────────
export default function ProImportModal({
    mode = 'productos',      // 'productos' | 'compras'
    onClose,
    onImported,              // (rows, mapping, schema) => Promise<void>
    title,
}) {
    const schema = SCHEMAS[mode]
    const [step, setStep] = useState('source')  // source | mapping | preview | importing | done
    const [headers, setHeaders] = useState([])
    const [rows, setRows] = useState([])
    const [mapping, setMapping] = useState({})
    const [progress, setProgress] = useState({ current: 0, total: 0 })
    const [results, setResults] = useState({ ok: 0, errors: [] })

    const handleParsed = useCallback(({ headers: h, rows: r, mapping: m }) => {
        setHeaders(h)
        setRows(r)
        setMapping(m)
        setStep('mapping')
    }, [])

    const handleMappingChange = (key, idx) => {
        setMapping(prev => ({ ...prev, [key]: idx }))
    }

    const updateRow = (ri, colIdx, val) => {
        setRows(prev => {
            const copy = prev.map(r => [...r])
            copy[ri][colIdx] = val
            return copy
        })
    }

    const removeRow = (ri) => setRows(prev => prev.filter((_, i) => i !== ri))

    // Validate required fields before proceeding
    const requiredCols = schema.columns.filter(c => c.required)
    const validRows = rows.filter(r =>
        requiredCols.every(c => mapping[c.key] >= 0 && r[mapping[c.key]]?.toString().trim())
    )
    const hasAllRequired = requiredCols.every(c => mapping[c.key] !== undefined && mapping[c.key] >= 0)

    // Build row objects from raw data
    const buildRowObjects = () => rows.map(row => {
        const obj = {}
        schema.columns.forEach(col => {
            if (mapping[col.key] >= 0) {
                obj[col.key] = row[mapping[col.key]]?.toString().trim() ?? ''
            }
        })
        return obj
    }).filter(obj => requiredCols.every(c => obj[c.key]))

    const handleImport = async () => {
        const rowObjects = buildRowObjects()
        if (rowObjects.length === 0) { toast.error('No hay filas válidas para importar.'); return }

        setStep('importing')
        setProgress({ current: 0, total: rowObjects.length })

        let ok = 0; const errors = []

        try {
            await onImported(rowObjects, (current) => setProgress(p => ({ ...p, current })))
            ok = rowObjects.length
        } catch (err) {
            errors.push(err.message || 'Error desconocido')
        }

        setResults({ ok, errors })
        setStep('done')
    }

    const STEP_LABELS = { source: 'Fuente', mapping: 'Columnas', preview: 'Revisar', importing: 'Importando', done: 'Listo' }
    const STEPS_ORDER = ['source', 'mapping', 'preview']
    const stepIdx = STEPS_ORDER.indexOf(step)

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl animate-in zoom-in-95 duration-200 ring-1 ring-black/5 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50 rounded-t-3xl shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
                            <FileSpreadsheet className="text-blue-600" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800">{title || `Importar ${schema.label}`}</h2>
                            <p className="text-xs text-slate-400 font-bold">Excel · CSV · Pegar desde hoja de cálculo</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 text-slate-400 rounded-xl">
                        <X size={20} />
                    </button>
                </div>

                {/* Steps indicator */}
                {!['importing', 'done'].includes(step) && (
                    <div className="flex items-center gap-0 px-8 py-3 border-b border-slate-100 bg-white shrink-0">
                        {STEPS_ORDER.map((s, i) => (
                            <div key={s} className="flex items-center">
                                <div className={`flex items-center gap-2 text-sm font-bold px-1 py-0.5
                                    ${stepIdx >= i ? 'text-blue-700' : 'text-slate-300'}`}>
                                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black
                                        ${stepIdx > i ? 'bg-emerald-500 text-white' : stepIdx === i ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                        {stepIdx > i ? <Check size={12} strokeWidth={3} /> : i + 1}
                                    </span>
                                    {STEP_LABELS[s]}
                                </div>
                                {i < STEPS_ORDER.length - 1 && (
                                    <ChevronRight size={14} className={`mx-1 ${stepIdx > i ? 'text-emerald-400' : 'text-slate-200'}`} />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8">
                    {step === 'source' && (
                        <StepSource mode={mode} schema={schema} onParsed={handleParsed} />
                    )}
                    {step === 'mapping' && (
                        <StepMapping headers={headers} schema={schema} mapping={mapping} onMappingChange={handleMappingChange} />
                    )}
                    {step === 'preview' && (
                        <StepPreview rows={rows} headers={headers} schema={schema} mapping={mapping}
                            onRowChange={updateRow} onRowRemove={removeRow} />
                    )}
                    {step === 'importing' && (
                        <div className="flex flex-col items-center justify-center py-12 gap-6">
                            <div className="relative w-24 h-24">
                                <svg className="w-24 h-24 -rotate-90">
                                    <circle cx="48" cy="48" r="44" stroke="#e2e8f0" strokeWidth="8" fill="none" />
                                    <circle cx="48" cy="48" r="44" stroke="#3b82f6" strokeWidth="8" fill="none"
                                        strokeDasharray={`${2 * Math.PI * 44}`}
                                        strokeDashoffset={`${2 * Math.PI * 44 * (1 - progress.current / progress.total)}`}
                                        className="transition-all duration-300" />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-lg font-black text-blue-700">
                                        {Math.round((progress.current / progress.total) * 100)}%
                                    </span>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-black text-slate-800">Importando...</p>
                                <p className="text-slate-400 text-sm mt-1">{progress.current} de {progress.total} registros procesados</p>
                            </div>
                        </div>
                    )}
                    {step === 'done' && (
                        <div className="flex flex-col items-center justify-center py-12 gap-5 text-center">
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                                <Check size={40} className="text-emerald-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-black text-slate-800">¡Importación completa!</p>
                                <p className="text-emerald-600 font-bold mt-1">{results.ok} registros importados exitosamente</p>
                            </div>
                            {results.errors.length > 0 && (
                                <div className="w-full bg-red-50 border border-red-100 rounded-2xl p-4 text-left">
                                    <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-2">Errores ({results.errors.length})</p>
                                    <ul className="space-y-1 text-xs text-red-500 max-h-24 overflow-auto">
                                        {results.errors.map((e, i) => <li key={i}>• {e}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer navigation */}
                {!['importing', 'done'].includes(step) && (
                    <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100 bg-slate-50 rounded-b-3xl shrink-0">
                        <button
                            onClick={() => {
                                if (step === 'mapping') setStep('source')
                                else if (step === 'preview') setStep('mapping')
                                else onClose()
                            }}
                            className="px-5 py-2.5 font-bold text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50"
                        >
                            {stepIdx === 0 ? 'Cancelar' : '← Atrás'}
                        </button>

                        {step === 'mapping' && (
                            <div className="text-center">
                                <p className="text-xs text-slate-500 font-bold">{headers.length} columnas · {rows.length} filas</p>
                            </div>
                        )}

                        {step !== 'preview' ? (
                            <button
                                onClick={() => setStep(step === 'source' ? 'mapping' : step === 'mapping' ? 'preview' : 'done')}
                                disabled={step === 'mapping' && !hasAllRequired}
                                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-40"
                            >
                                Siguiente <ChevronRight size={16} />
                            </button>
                        ) : (
                            <button
                                onClick={handleImport}
                                disabled={validRows.length === 0}
                                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-40"
                            >
                                <Upload size={16} />
                                Importar {validRows.length} registros
                            </button>
                        )}
                    </div>
                )}

                {step === 'done' && (
                    <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 rounded-b-3xl shrink-0">
                        <button onClick={() => { onImported?.(); onClose() }}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-95 transition-all">
                            ✅ Cerrar y ver resultados
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
