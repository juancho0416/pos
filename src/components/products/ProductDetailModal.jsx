import { useState, useEffect } from 'react'
import { X, Package, Warehouse, TrendingUp, Save, Loader2, AlertTriangle, ChevronDown } from 'lucide-react'
import { powersync } from '../../powersync/db'
import { useQuery } from '@powersync/react'
import { toast } from 'sonner'

// ─── Utilidades ───────────────────────────────────────────────
const calcPrice = (costo, utilidad) => {
    if (!costo || costo <= 0 || utilidad >= 100) return 0
    return parseFloat((costo / (1 - utilidad / 100)).toFixed(2))
}

const UNIDADES = ['Pza', 'Caja', 'Kg', 'Metro', 'Litro', 'Par', 'Rollo', 'Bulto']
const IVA_OPTS = [{ label: '16% (General)', value: 16 }, { label: '8% (Zona Fronteriza)', value: 8 }, { label: '0% (Exento)', value: 0 }]

const TABS = [
    { id: 'general', label: 'General', icon: Package },
    { id: 'logistica', label: 'Logística', icon: Warehouse },
    { id: 'costeo', label: 'Costeo', icon: TrendingUp },
]

// ─── Sub-componentes de formulario ────────────────────────────
function Field({ label, children, hint }) {
    return (
        <div className="space-y-1">
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-400">{label}</label>
            {children}
            {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
        </div>
    )
}

function Input({ value, onChange, placeholder = '', type = 'text', readOnly = false, className = '' }) {
    const base = 'w-full border rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none transition-colors'
    const style = readOnly
        ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
        : 'bg-white border-slate-200 text-slate-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10'
    return (
        <input type={type} value={value ?? ''} onChange={onChange} placeholder={placeholder}
            readOnly={readOnly} className={`${base} ${style} ${className}`} />
    )
}

function Select({ value, onChange, options, placeholder }) {
    return (
        <select value={value ?? ''} onChange={onChange}
            className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors appearance-none cursor-pointer">
            {placeholder && <option value="">{placeholder}</option>}
            {options.map(opt => (
                <option key={typeof opt === 'string' ? opt : opt.value} value={typeof opt === 'string' ? opt : opt.value}>
                    {typeof opt === 'string' ? opt : opt.label}
                </option>
            ))}
        </select>
    )
}

// ─── Tab A: Información General ───────────────────────────────
function TabGeneral({ form, setForm }) {
    const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))
    const fn = (field) => (e) => setForm(p => ({ ...p, [field]: parseFloat(e.target.value) || 1 }))

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Field label="SKU / Código Interno *">
                <Input value={form.sku} onChange={f('sku')} placeholder="Ej: FERR-0042" />
            </Field>
            <Field label="Código de Barras (Interno)">
                <Input value={form.codigo_barras} onChange={f('codigo_barras')} placeholder="Código de tu almacén" />
            </Field>
            <Field label="Código de Barras Fabricante (EAN)">
                <Input value={form.codigo_barras_fabricante} onChange={f('codigo_barras_fabricante')} placeholder="7501000000001" />
            </Field>

            <div className="sm:col-span-2 lg:col-span-3">
                <Field label="Descripción / Nombre Comercial *">
                    <Input value={form.nombre} onChange={f('nombre')} placeholder="Nombre claro y comercial del producto" />
                </Field>
            </div>

            <Field label="Línea">
                <Input value={form.linea} onChange={f('linea')} placeholder="Ej: Herramientas Manuales" />
            </Field>
            <Field label="Familia">
                <Input value={form.familia} onChange={f('familia')} placeholder="Ej: Desarmadores" />
            </Field>
            <Field label="Categoría">
                <Input value={form.categoria} onChange={f('categoria')} placeholder="Ej: Ferretería" />
            </Field>
            <Field label="Marca">
                <Input value={form.marca} onChange={f('marca')} placeholder="Ej: Stanley" />
            </Field>
            <Field label="Fabricante / Importador">
                <Input value={form.fabricante} onChange={f('fabricante')} placeholder="Ej: Stanley Black & Decker" />
            </Field>

            <div className="sm:col-span-2 lg:col-span-1">
                <Field label="Unidad de Medida">
                    <Select value={form.unidad_medida} onChange={f('unidad_medida')} options={UNIDADES} placeholder="-- Seleccionar --" />
                </Field>
            </div>

            <Field label="Factor de Conversión" hint={`1 ${form.unidad_medida || 'Caja'} = N pzas para stock`}>
                <Input type="number" min="1" value={form.factor_conversion ?? 1} onChange={fn('factor_conversion')} placeholder="1" />
            </Field>
        </div>
    )
}

// ─── Tab B: Logística y Almacén ───────────────────────────────
function TabLogistica({ form, setForm, productId }) {
    const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))
    const fn = (field) => (e) => setForm(p => ({ ...p, [field]: parseFloat(e.target.value) || null }))

    const { data: stockData = [] } = useQuery(
        productId
            ? `SELECT i.stock_actual, i.stock_minimo, s.nombre as sucursal_nombre
               FROM inventario i
               LEFT JOIN sucursales s ON s.id = i.sucursal_id
               WHERE i.producto_id = ?`
            : `SELECT 1 WHERE 0 = 1`,
        productId ? [productId] : []
    )

    return (
        <div className="space-y-8">
            {/* Stock por sucursal */}
            {productId && (
                <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">📦 Existencias por Sucursal</p>
                    {stockData.length === 0 ? (
                        <p className="text-sm text-slate-400">Sin registros de inventario aún.</p>
                    ) : (
                        <div className="border border-slate-100 rounded-2xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="py-2.5 px-4 text-left text-xs font-black text-slate-400 uppercase tracking-wide">Sucursal</th>
                                        <th className="py-2.5 px-4 text-right text-xs font-black text-slate-400 uppercase tracking-wide">Stock Actual</th>
                                        <th className="py-2.5 px-4 text-right text-xs font-black text-slate-400 uppercase tracking-wide">Stock Mínimo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {stockData.map((s, i) => (
                                        <tr key={i} className={s.stock_actual <= s.stock_minimo ? 'bg-red-50' : ''}>
                                            <td className="py-2.5 px-4 font-bold text-slate-700">{s.sucursal_nombre || 'Sucursal'}</td>
                                            <td className={`py-2.5 px-4 text-right font-black ${s.stock_actual <= s.stock_minimo ? 'text-red-600' : 'text-slate-800'}`}>
                                                {s.stock_actual ?? 0} {form.unidad_medida || 'Pza'}
                                                {s.stock_actual <= s.stock_minimo && <span className="ml-2 text-[10px]">⚠️ BAJO</span>}
                                            </td>
                                            <td className="py-2.5 px-4 text-right text-slate-500">{s.stock_minimo ?? 0}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Dimensiones */}
            <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">📐 Dimensiones y Peso</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <Field label="Peso (kg)"><Input type="number" min="0" step="0.01" value={form.peso_kg} onChange={fn('peso_kg')} placeholder="0.5" /></Field>
                    <Field label="Largo (cm)"><Input type="number" min="0" step="0.1" value={form.dimension_largo} onChange={fn('dimension_largo')} placeholder="25" /></Field>
                    <Field label="Ancho (cm)"><Input type="number" min="0" step="0.1" value={form.dimension_ancho} onChange={fn('dimension_ancho')} placeholder="10" /></Field>
                    <Field label="Alto (cm)"><Input type="number" min="0" step="0.1" value={form.dimension_alto} onChange={fn('dimension_alto')} placeholder="5" /></Field>
                </div>
            </div>
        </div>
    )
}

// ─── Tab C: Costeo y Rentabilidad ────────────────────────────
function TabCosteo({ form, setForm }) {
    const setU = (field) => (e) => {
        const val = parseFloat(e.target.value) || 0
        setForm(p => {
            const updated = { ...p, [field]: val }
            // Recalculate the 3 prices whenever a margin changes
            const costo = updated.costo_ultimo || updated.costo_promedio || 0
            return {
                ...updated,
                precio_menudeo: calcPrice(costo, updated.utilidad_menudeo ?? 30),
                precio_medio_mayoreo: calcPrice(costo, updated.utilidad_medio_mayoreo ?? 20),
                precio_mayoreo: calcPrice(costo, updated.utilidad_mayoreo ?? 15),
            }
        })
    }

    const costo = form.costo_ultimo || form.costo_promedio || 0
    const costoIVA = costo * (1 + (form.iva_porcentaje ?? 16) / 100)

    return (
        <div className="space-y-8">
            {/* IVA */}
            <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">🧾 Configuración de Impuesto</p>
                <div className="max-w-xs">
                    <Field label="IVA aplicable">
                        <Select
                            value={form.iva_porcentaje ?? 16}
                            onChange={(e) => setForm(p => ({ ...p, iva_porcentaje: parseInt(e.target.value) }))}
                            options={IVA_OPTS}
                        />
                    </Field>
                </div>
            </div>

            {/* Costos históricos */}
            <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">📊 Inteligencia de Costos</p>
                <div className="grid grid-cols-2 gap-4 max-w-md">
                    <Field label="Costo Último (c/IVA)" hint="Se actualiza en Compras">
                        <Input readOnly value={form.costo_ultimo ? `$${parseFloat(form.costo_ultimo).toFixed(2)}` : '—'} />
                    </Field>
                    <Field label="Costo Promedio Ponderado" hint="Histórico acumulado">
                        <Input readOnly value={form.costo_promedio ? `$${parseFloat(form.costo_promedio).toFixed(2)}` : '—'} />
                    </Field>
                </div>
                {costo > 0 && (
                    <p className="text-xs text-slate-400 mt-2">Costo base para cálculos: <strong>${costo.toFixed(2)}</strong> s/IVA → <strong>${costoIVA.toFixed(2)}</strong> c/IVA ({form.iva_porcentaje ?? 16}%)</p>
                )}
            </div>

            {/* Estructura de precios */}
            <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">💰 Estructura de Precios Automática</p>
                <p className="text-xs text-slate-400 mb-4">Modifica los <strong>% de Utilidad</strong> y los precios se calculan automáticamente. Fórmula: <code className="bg-slate-100 px-1 rounded">Precio = Costo ÷ (1 − Utilidad%)</code></p>

                <div className="space-y-3">
                    {[
                        { key: 'menudeo', label: 'Precio 1 — Público / Menudeo', minKey: null, color: 'blue' },
                        { key: 'medio_mayoreo', label: 'Precio 2 — Medio Mayoreo', minKey: 'min_medio_mayoreo', color: 'purple' },
                        { key: 'mayoreo', label: 'Precio 3 — Mayoreo / Distribución', minKey: 'min_mayoreo', color: 'emerald' },
                    ].map(({ key, label, minKey, color }) => {
                        const utilField = `utilidad_${key}`
                        const precioField = key === 'menudeo' ? 'precio_menudeo' : key === 'medio_mayoreo' ? 'precio_medio_mayoreo' : 'precio_mayoreo'
                        const utilVal = form[utilField] ?? (key === 'menudeo' ? 30 : key === 'medio_mayoreo' ? 20 : 15)
                        const precio = form[precioField] || calcPrice(costo, utilVal)

                        return (
                            <div key={key} className={`flex items-center gap-4 p-4 rounded-2xl border-2 bg-${color}-50 border-${color}-200`}>
                                <div className="flex-1">
                                    <p className={`text-xs font-black text-${color}-700 uppercase tracking-widest mb-2`}>{label}</p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-slate-500 font-bold">%Utilidad:</span>
                                            <input type="number" min="0" max="99" step="0.5"
                                                value={utilVal}
                                                onChange={setU(utilField)}
                                                className={`w-16 bg-white border-2 border-${color}-300 text-${color}-800 rounded-xl px-2 py-1.5 font-black text-sm text-center focus:outline-none focus:border-${color}-500`}
                                            />
                                            <span className="text-xs font-bold text-slate-400">%</span>
                                        </div>
                                        {minKey && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-500 font-bold">Min pzas:</span>
                                                <input type="number" min="2"
                                                    value={form[minKey] ?? (key === 'medio_mayoreo' ? 6 : 12)}
                                                    onChange={(e) => setForm(p => ({ ...p, [minKey]: parseInt(e.target.value) || 2 }))}
                                                    className="w-16 bg-white border-2 border-slate-200 text-slate-700 rounded-xl px-2 py-1.5 font-black text-sm text-center focus:outline-none focus:border-slate-400"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">Precio</p>
                                    <p className={`text-2xl font-black text-${color}-700`}>
                                        ${precio > 0 ? precio.toFixed(2) : '—'}
                                    </p>
                                    {costo > 0 && precio > 0 && (
                                        <p className="text-[10px] text-slate-500">+${(precio - costo).toFixed(2)} sobre costo</p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ─── MODAL PRINCIPAL ──────────────────────────────────────────
export default function ProductDetailModal({ show, product, onClose, onSaved }) {
    const [activeTab, setActiveTab] = useState('general')
    const [saving, setSaving] = useState(false)

    const emptyForm = {
        nombre: '', sku: '', codigo_barras: '', codigo_barras_fabricante: '',
        linea: '', familia: '', marca: '', fabricante: '', categoria: '',
        unidad_medida: 'Pza', factor_conversion: 1,
        pasillo: '', anaquel: '', nivel: '',
        peso_kg: null, dimension_largo: null, dimension_ancho: null, dimension_alto: null,
        iva_porcentaje: 16, costo_ultimo: null, costo_promedio: null,
        precio_menudeo: null, precio_medio_mayoreo: null, precio_mayoreo: null,
        utilidad_menudeo: 30, utilidad_medio_mayoreo: 20, utilidad_mayoreo: 15,
        min_medio_mayoreo: 6, min_mayoreo: 12,
    }

    const [form, setForm] = useState(emptyForm)

    useEffect(() => {
        if (!show) return
        if (!product) { setForm(emptyForm); setActiveTab('general'); return }
        setForm({ ...emptyForm, ...product })
        setActiveTab('general')
    }, [show, product?.id])

    if (!show) return null

    const handleSave = async () => {
        if (!form.nombre?.trim()) { toast.error('El nombre del producto es requerido.'); return }
        if (!form.sku?.trim()) { toast.error('El SKU es requerido.'); return }

        setSaving(true)
        try {
            const isNew = !product?.id
            const productId = product?.id || crypto.randomUUID()

            if (isNew) {
                await powersync.execute(
                    `INSERT INTO productos (id, nombre, sku, codigo_barras, codigo_barras_fabricante,
                        linea, familia, marca, fabricante, categoria, unidad_medida, factor_conversion,
                        pasillo, anaquel, nivel, peso_kg, dimension_largo, dimension_ancho, dimension_alto,
                        iva_porcentaje, is_deleted, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?,  ?, ?, ?, ?, ?,  ?, ?,  ?, ?, ?,  ?, ?, ?, ?,  ?, 0, datetime('now'), datetime('now'))`,
                    [
                        productId, form.nombre, form.sku, form.codigo_barras || null, form.codigo_barras_fabricante || null,
                        form.linea || null, form.familia || null, form.marca || null, form.fabricante || null, form.categoria || null,
                        form.unidad_medida || 'Pza', form.factor_conversion ?? 1,
                        form.pasillo || null, form.anaquel || null, form.nivel || null,
                        form.peso_kg || null, form.dimension_largo || null, form.dimension_ancho || null, form.dimension_alto || null,
                        form.iva_porcentaje ?? 16
                    ]
                )
            } else {
                await powersync.execute(
                    `UPDATE productos SET
                        nombre=?, sku=?, codigo_barras=?, codigo_barras_fabricante=?,
                        linea=?, familia=?, marca=?, fabricante=?, categoria=?,
                        unidad_medida=?, factor_conversion=?,
                        pasillo=?, anaquel=?, nivel=?,
                        peso_kg=?, dimension_largo=?, dimension_ancho=?, dimension_alto=?,
                        iva_porcentaje=?, updated_at=datetime('now')
                     WHERE id=?`,
                    [
                        form.nombre, form.sku, form.codigo_barras || null, form.codigo_barras_fabricante || null,
                        form.linea || null, form.familia || null, form.marca || null, form.fabricante || null, form.categoria || null,
                        form.unidad_medida || 'Pza', form.factor_conversion ?? 1,
                        form.pasillo || null, form.anaquel || null, form.nivel || null,
                        form.peso_kg || null, form.dimension_largo || null, form.dimension_ancho || null, form.dimension_alto || null,
                        form.iva_porcentaje ?? 16, productId
                    ]
                )
            }

            // Upsert precios
            const preciosRes = await powersync.execute(`SELECT id FROM precios WHERE producto_id = ? LIMIT 1`, [productId])
            const costo = form.costo_ultimo || form.costo_promedio || 0
            const p1 = form.precio_menudeo || calcPrice(costo, form.utilidad_menudeo ?? 30)
            const p2 = form.precio_medio_mayoreo || calcPrice(costo, form.utilidad_medio_mayoreo ?? 20)
            const p3 = form.precio_mayoreo || calcPrice(costo, form.utilidad_mayoreo ?? 15)

            if (preciosRes.rows?._array?.length > 0) {
                await powersync.execute(
                    `UPDATE precios SET precio_menudeo=?, precio_medio_mayoreo=?, precio_mayoreo=?,
                        min_medio_mayoreo=?, min_mayoreo=?,
                        utilidad_menudeo=?, utilidad_medio_mayoreo=?, utilidad_mayoreo=?
                     WHERE producto_id=?`,
                    [p1, p2, p3, form.min_medio_mayoreo ?? 6, form.min_mayoreo ?? 12,
                     form.utilidad_menudeo ?? 30, form.utilidad_medio_mayoreo ?? 20, form.utilidad_mayoreo ?? 15,
                     productId]
                )
            } else {
                await powersync.execute(
                    `INSERT INTO precios (id, producto_id, precio_menudeo, precio_medio_mayoreo, precio_mayoreo,
                        min_medio_mayoreo, min_mayoreo, utilidad_menudeo, utilidad_medio_mayoreo, utilidad_mayoreo)
                     VALUES (?, ?, ?, ?, ?,  ?, ?,  ?, ?, ?)`,
                    [crypto.randomUUID(), productId, p1, p2, p3,
                     form.min_medio_mayoreo ?? 6, form.min_mayoreo ?? 12,
                     form.utilidad_menudeo ?? 30, form.utilidad_medio_mayoreo ?? 20, form.utilidad_mayoreo ?? 15]
                )
            }

            toast.success(isNew ? 'Producto creado correctamente' : 'Producto actualizado', {
                description: `${form.nombre} — ${form.sku}`
            })
            onSaved?.()
            onClose()
        } catch (err) {
            console.error(err)
            toast.error('Error al guardar el producto.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[200] flex items-start justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl my-8 animate-in zoom-in-95 duration-200 ring-1 ring-black/5">

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50 rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
                            <Package className="text-blue-600" size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight">
                                {product?.id ? 'Editar Artículo' : 'Nuevo Artículo'}
                            </h2>
                            {product?.sku && <p className="text-xs font-bold text-slate-400">SKU: {product.sku}</p>}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 text-slate-500 rounded-xl transition-all">
                        <X size={22} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 px-8 bg-white">
                    {TABS.map(tab => {
                        const Icon = tab.icon
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 py-4 px-5 font-bold text-sm border-b-2 transition-all
                                    ${activeTab === tab.id
                                        ? 'border-blue-600 text-blue-700'
                                        : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-200'}`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                {/* Tab Content */}
                <div className="p-8 max-h-[60vh] overflow-y-auto scrollbar-thin">
                    {activeTab === 'general' && <TabGeneral form={form} setForm={setForm} />}
                    {activeTab === 'logistica' && <TabLogistica form={form} setForm={setForm} productId={product?.id} />}
                    {activeTab === 'costeo' && <TabCosteo form={form} setForm={setForm} />}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-8 py-5 border-t border-slate-100 bg-slate-50 rounded-b-3xl">
                    <button onClick={onClose} className="px-6 py-3 text-slate-600 font-bold bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {saving ? 'Guardando...' : product?.id ? 'Guardar Cambios' : 'Crear Producto'}
                    </button>
                </div>
            </div>
        </div>
    )
}
