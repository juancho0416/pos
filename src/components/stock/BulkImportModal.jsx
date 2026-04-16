import { useState, useRef } from 'react'
import { X, Upload, CheckCircle, AlertTriangle, FileSpreadsheet, Download } from 'lucide-react'
import { powersync } from '../../powersync/db'
import { supabase } from '../../supabaseClient'
import { toast } from 'sonner'

/**
 * Modal para importar inventario masivo desde un archivo CSV o Excel (.xlsx).
 * Formato esperado: columnas SKU, Nombre (opcional), Stock
 * 
 * Props:
 *   onClose: () => void
 *   sucursalId: string
 *   onImportComplete: () => void
 */
export default function BulkImportModal({ onClose, sucursalId, onImportComplete }) {
    const fileRef = useRef(null)
    const [step, setStep] = useState('upload') // 'upload' | 'preview' | 'importing' | 'done'
    const [rows, setRows] = useState([])    // filas parseadas
    const [results, setResults] = useState({ ok: 0, errors: [] })
    const [progress, setProgress] = useState(0)

    // ─── Plantilla de ejemplo ───
    const downloadTemplate = () => {
        const csv = 'SKU,Nombre,Stock_Nuevo\nPROD-001,Ejemplo Producto 1,50\nPROD-002,Ejemplo Producto 2,100\n'
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url; a.download = 'plantilla_inventario.csv'; a.click()
        URL.revokeObjectURL(url)
    }

    // ─── Parsear archivo ───
    const handleFile = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
        const isCsv = file.name.endsWith('.csv')
        if (!isExcel && !isCsv) {
            toast.error('Formato no soportado. Usa CSV o Excel (.xlsx)')
            return
        }

        try {
            let parsed = []

            if (isExcel) {
                const XLSX = (await import('xlsx-js-style')).default || await import('xlsx-js-style')
                const buffer = await file.arrayBuffer()
                const wb = XLSX.read(buffer, { type: 'array' })
                const ws = wb.Sheets[wb.SheetNames[0]]
                const data = XLSX.utils.sheet_to_json(ws, { defval: '' })
                parsed = data.map(r => normalizeRow(r))
            } else {
                const text = await file.text()
                const lines = text.split('\n').filter(Boolean)
                const headers = lines[0].split(',').map(h => h.trim())
                parsed = lines.slice(1).map(line => {
                    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
                    const obj = {}
                    headers.forEach((h, i) => obj[h] = vals[i] || '')
                    return normalizeRow(obj)
                })
            }

            const valid = parsed.filter(r => r.sku && r.stock !== null && !isNaN(r.stock))
            const invalid = parsed.filter(r => !r.sku || r.stock === null || isNaN(r.stock))

            if (invalid.length > 0) {
                toast.warning(`${invalid.length} fila(s) ignoradas por datos incompletos`)
            }

            setRows(valid)
            setStep('preview')
        } catch (err) {
            toast.error('Error al leer el archivo: ' + err.message)
        }

        // Reset input for re-uploading same file
        e.target.value = ''
    }

    const normalizeRow = (row) => {
        // Acepta columnas: SKU, sku, Sku, Stock, Stock_Nuevo, stock, Existencia
        const sku = row.SKU || row.sku || row.Sku || row['Código'] || ''
        const nombre = row.Nombre || row.nombre || row.Producto || ''
        const stockRaw = row.Stock_Nuevo ?? row.Stock ?? row.stock ?? row.Existencia ?? row.Cantidad ?? null
        const stock = stockRaw !== '' && stockRaw !== null ? parseFloat(String(stockRaw).replace(',', '.')) : null
        return { sku: String(sku).trim(), nombre: String(nombre).trim(), stock }
    }

    // ── Parsear texto pegado desde Excel (formato TSV) ──
    const handlePaste = (e) => {
        e.preventDefault()
        const text = e.clipboardData?.getData('text') || ''
        if (!text.trim()) return

        const lines = text.split(/\r?\n/).filter(l => l.trim())
        if (lines.length < 2) {
            toast.error('Pega al menos una fila de encabezado y una de datos.')
            return
        }

        // Detectar separador: tab (Excel) o coma (CSV)
        const sep = lines[0].includes('\t') ? '\t' : ','
        const headers = lines[0].split(sep).map(h => h.trim().replace(/^"|"$/g, ''))

        const parsed = lines.slice(1).map(line => {
            const vals = line.split(sep).map(v => v.trim().replace(/^"|"$/g, ''))
            const obj = {}
            headers.forEach((h, i) => obj[h] = vals[i] || '')
            return normalizeRow(obj)
        })

        const valid = parsed.filter(r => r.sku && r.stock !== null && !isNaN(r.stock))
        const invalid = parsed.filter(r => !r.sku || r.stock === null || isNaN(r.stock))

        if (valid.length === 0) {
            toast.error('No se encontraron filas válidas. Verifica que las columnas sean SKU y Stock (o Stock_Nuevo).')
            return
        }
        if (invalid.length > 0) toast.warning(`${invalid.length} fila(s) ignoradas por datos incompletos`)

        setRows(valid)
        setStep('preview')
    }

    // ─── Ejecutar importación ───
    const runImport = async () => {
        setStep('importing')
        let ok = 0
        const errors = []

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i]
            try {
                // Buscar producto_id por SKU en PowerSync local
                const result = await powersync.execute(
                    `SELECT id FROM productos WHERE sku = ? LIMIT 1`,
                    [row.sku]
                )
                const productoId = result?.rows?._array?.[0]?.id

                if (!productoId) {
                    errors.push({ sku: row.sku, reason: 'SKU no encontrado en el catálogo' })
                } else {
                    // Leer stock anterior para calcular delta para kardex
                    const invResult = await powersync.execute(
                        `SELECT id, stock_actual FROM inventario WHERE producto_id = ? AND sucursal_id = ? LIMIT 1`,
                        [productoId, sucursalId]
                    )
                    const invRow = invResult?.rows?._array?.[0]
                    const stockPrevio = invRow?.stock_actual ?? 0
                    const delta = row.stock - stockPrevio

                    if (invRow) {
                        await powersync.execute(
                            `UPDATE inventario SET stock_actual = ? WHERE producto_id = ? AND sucursal_id = ?`,
                            [row.stock, productoId, sucursalId]
                        )
                    } else {
                        await powersync.execute(
                            `INSERT INTO inventario (id, producto_id, sucursal_id, stock_actual, stock_minimo, created_at)
                             VALUES (?, ?, ?, ?, 5, ?)`,
                            [crypto.randomUUID(), productoId, sucursalId, row.stock, new Date().toISOString()]
                        )
                    }

                    // Escribir kardex en Supabase si hay conexión
                    if (navigator.onLine && delta !== 0) {
                        try {
                            await supabase.from('kardex').insert([{
                                producto_id: productoId,
                                sucursal_id: sucursalId,
                                tipo_movimiento: 'AJUSTE_MASIVO',
                                cantidad: Math.abs(delta),
                                saldo_previo: stockPrevio,
                                saldo_nuevo: row.stock,
                                referencia_id: null
                            }])
                        } catch { /* kardex offline — se registrará luego */ }
                    }

                    ok++
                }
            } catch (err) {
                errors.push({ sku: row.sku, reason: err.message })
            }

            setProgress(Math.round(((i + 1) / rows.length) * 100))
        }

        setResults({ ok, errors })
        setStep('done')
        if (ok > 0) {
            toast.success(`✅ ${ok} producto(s) actualizados correctamente`)
            onImportComplete()
        }
    }

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <FileSpreadsheet size={22} />
                        </div>
                        <div>
                            <h2 className="font-bold text-lg">Importación Masiva de Inventario</h2>
                            <p className="text-blue-100 text-sm">CSV o Excel — columnas: SKU, Nombre, Stock_Nuevo</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition">
                        <X size={22} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {/* STEP 1: Upload */}
                    {step === 'upload' && (
                        <div className="space-y-4">
                            <button
                                onClick={downloadTemplate}
                                className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 px-4 py-2 rounded-xl hover:bg-green-100 transition font-medium"
                            >
                                <Download size={16} /> Descargar plantilla CSV de ejemplo
                            </button>

                            {/* Zona de pegado desde Excel */}
                            <div className="relative">
                                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                                    <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">OPCIÓN 1</span>
                                    Pegar desde Excel (Ctrl+V)
                                </div>
                                <textarea
                                    rows={5}
                                    onPaste={handlePaste}
                                    placeholder={`Copia las celdas desde Excel y pega aquí con Ctrl+V\n\nEjemplo (con encabezados):\nSKU\t\tNombre\t\t\tStock_Nuevo\nPROD-001\tCoca Cola 600ml\t150\nPROD-002\tSabritas\t\t\t80`}
                                    className="w-full border-2 border-purple-200 rounded-xl p-4 text-sm font-mono text-gray-700 placeholder-gray-300 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition bg-purple-50/30 resize-none"
                                />
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 group-focus-within:opacity-100">
                                </div>
                            </div>

                            {/* Divisor */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-gray-200"/>
                                <span className="text-xs text-gray-400 font-bold uppercase bg-white px-2">o sube un archivo</span>
                                <div className="flex-1 h-px bg-gray-200"/>
                            </div>

                            {/* Upload zone */}
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">OPCIÓN 2</span>
                                Subir archivo CSV o Excel
                            </div>
                            <div
                                onClick={() => fileRef.current?.click()}
                                className="border-2 border-dashed border-blue-300 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 transition-all group"
                            >
                                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Upload size={24} className="text-blue-600" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-gray-800">Haz clic para seleccionar tu archivo</p>
                                    <p className="text-gray-500 text-sm mt-0.5">Soporta .csv y .xlsx (Excel)</p>
                                </div>
                            </div>
                            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />
                        </div>
                    )}

                    {/* STEP 2: Preview */}
                    {step === 'preview' && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 font-medium text-sm">
                                    <CheckCircle size={16} /> {rows.length} producto(s) listos para actualizar
                                </div>
                                <button onClick={() => { setRows([]); setStep('upload') }} className="text-sm text-gray-500 hover:text-gray-700 underline">
                                    Cambiar archivo
                                </button>
                            </div>

                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                                <div className="grid grid-cols-3 bg-gray-50 p-3 text-xs font-bold text-gray-500 uppercase">
                                    <span>SKU</span><span>Nombre</span><span className="text-center">Stock Nuevo</span>
                                </div>
                                <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                                    {rows.map((row, i) => (
                                        <div key={i} className="grid grid-cols-3 p-3 text-sm hover:bg-gray-50">
                                            <span className="font-mono text-gray-700">{row.sku}</span>
                                            <span className="text-gray-600 truncate">{row.nombre || '—'}</span>
                                            <span className="text-center font-bold text-blue-700">{row.stock}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Importing */}
                    {step === 'importing' && (
                        <div className="flex flex-col items-center justify-center py-12 gap-6">
                            <div className="relative w-24 h-24">
                                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="42" fill="none" stroke="#e5e7eb" strokeWidth="8" />
                                    <circle
                                        cx="50" cy="50" r="42" fill="none" stroke="#3b82f6" strokeWidth="8"
                                        strokeDasharray={`${2 * Math.PI * 42}`}
                                        strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
                                        strokeLinecap="round"
                                        style={{ transition: 'stroke-dashoffset 0.3s ease' }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-blue-600">{progress}%</span>
                                </div>
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-gray-800 text-lg">Actualizando inventario...</p>
                                <p className="text-gray-500 text-sm">PowerSync sincronizará con Supabase automáticamente</p>
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Done */}
                    {step === 'done' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                                <CheckCircle size={24} className="text-green-600 flex-shrink-0" />
                                <div>
                                    <p className="font-bold text-green-800">{results.ok} producto(s) actualizados</p>
                                    <p className="text-green-600 text-sm">Los cambios se sincronizarán a Supabase automáticamente</p>
                                </div>
                            </div>
                            {results.errors.length > 0 && (
                                <div className="border border-red-200 rounded-xl overflow-hidden">
                                    <div className="flex items-center gap-2 bg-red-50 p-3 text-sm font-bold text-red-700">
                                        <AlertTriangle size={16} /> {results.errors.length} error(es)
                                    </div>
                                    <div className="divide-y divide-red-100 max-h-40 overflow-y-auto">
                                        {results.errors.map((e, i) => (
                                            <div key={i} className="flex justify-between p-3 text-sm">
                                                <span className="font-mono text-gray-700">{e.sku}</span>
                                                <span className="text-red-600">{e.reason}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 rounded-b-2xl">
                    {step === 'done' ? (
                        <button onClick={onClose} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition">
                            Cerrar
                        </button>
                    ) : step === 'preview' ? (
                        <>
                            <button onClick={onClose} className="px-6 py-2.5 text-gray-600 bg-gray-100 font-medium rounded-xl hover:bg-gray-200 transition">
                                Cancelar
                            </button>
                            <button
                                onClick={runImport}
                                className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-200"
                            >
                                <Upload size={18} /> Importar {rows.length} productos
                            </button>
                        </>
                    ) : (
                        <button onClick={onClose} className="px-6 py-2.5 text-gray-600 bg-gray-100 font-medium rounded-xl hover:bg-gray-200 transition">
                            Cancelar
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
