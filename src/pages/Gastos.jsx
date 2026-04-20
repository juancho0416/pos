import React, { useState, useMemo } from 'react'
import { useGastos, CATEGORIAS } from '../hooks/useGastos'
import { useAuth } from '../context/AuthContext'
import { useBranchFilterStore } from '../stores/useBranchFilterStore'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import {
    Plus, Trash2, X, Receipt, TrendingDown, DollarSign,
    Calendar, Filter, Search, FileSpreadsheet, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

const METODOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA', 'CHEQUE']

export default function Gastos() {
    const { profile, branches } = useAuth()
    const { selectedBranch } = useBranchFilterStore()
    const { gastos, isLoading, kpis, registrarGasto, eliminarGasto } = useGastos()

    const [isModalOpen, setIsModalOpen] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterCategoria, setFilterCategoria] = useState('all')
    const [filterMes, setFilterMes] = useState(() => {
        const d = new Date()
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })

    // Filtrar gastos
    const gastosFiltrados = useMemo(() => {
        return gastos.filter(g => {
            const matchSearch = !searchTerm ||
                g.concepto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                g.proveedor?.toLowerCase().includes(searchTerm.toLowerCase())
            const matchCat = filterCategoria === 'all' || g.categoria === filterCategoria
            const matchMes = !filterMes || g.fecha_gasto?.startsWith(filterMes)
            return matchSearch && matchCat && matchMes
        })
    }, [gastos, searchTerm, filterCategoria, filterMes])

    // Datos para la gráfica de dona
    const chartData = useMemo(() => {
        const porCat = {}
        gastosFiltrados.forEach(g => {
            porCat[g.categoria] = (porCat[g.categoria] || 0) + (g.monto || 0)
        })
        return Object.entries(porCat).map(([cat, total]) => {
            const catInfo = CATEGORIAS.find(c => c.value === cat)
            return { name: catInfo?.label || cat, value: total, color: catInfo?.color || '#94a3b8' }
        }).sort((a, b) => b.value - a.value)
    }, [gastosFiltrados])

    const totalFiltrado = gastosFiltrados.reduce((s, g) => s + (g.monto || 0), 0)

    const handleDelete = async (id) => {
        if (!confirm('¿Eliminar este gasto?')) return
        try {
            await eliminarGasto(id)
            toast.success('Gasto eliminado')
        } catch (e) {
            toast.error('Error: ' + e.message)
        }
    }

    const getCatInfo = (cat) => CATEGORIAS.find(c => c.value === cat) || { label: cat, icon: '📦', color: '#94a3b8' }

    return (
        <div className="p-6 min-h-screen bg-slate-50">
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Gastos Operativos</h1>
                    <p className="text-slate-500 text-sm mt-1">Control de egresos y flujo de caja</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-red-200 transition-all active:scale-95"
                >
                    <Plus size={18} /> Registrar Gasto
                </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-gradient-to-br from-red-600 to-red-800 p-6 rounded-2xl shadow-lg text-white">
                    <p className="text-red-200 text-xs font-bold uppercase tracking-wider mb-2">Total del Mes</p>
                    <h3 className="text-3xl font-black">${kpis.totalMes.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h3>
                    <div className="flex items-center gap-2 mt-3 text-red-200 text-sm font-medium">
                        <TrendingDown size={16} />
                        <span>Egresos acumulados {filterMes}</span>
                    </div>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-red-200 transition">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Gasto Promedio Diario</p>
                    <h3 className="text-2xl font-black text-slate-800">${kpis.promedioDiario.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</h3>
                    <p className="text-[10px] text-slate-400 mt-2">Basado en {new Date().getDate()} días del mes</p>
                </div>

                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-red-200 transition">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Categoría Principal</p>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-2xl">{getCatInfo(kpis.topCategoria.name).icon}</span>
                        <h3 className="text-lg font-black text-slate-800">{getCatInfo(kpis.topCategoria.name).label}</h3>
                    </div>
                    <p className="text-xs text-red-500 font-bold mt-1">${kpis.topCategoria.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>

            {/* Chart + Filters + Table */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Dona Chart */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                    <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Receipt size={16} className="text-red-500" /> Distribución por Categoría
                    </h2>
                    {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%" cy="50%"
                                    innerRadius={55} outerRadius={100}
                                    paddingAngle={3}
                                    dataKey="value"
                                    animationBegin={0}
                                    animationDuration={800}
                                >
                                    {chartData.map((entry, i) => (
                                        <Cell key={i} fill={entry.color} stroke="white" strokeWidth={2} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(v) => [`$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'Monto']}
                                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: '11px', fontWeight: '600', color: '#64748b' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[280px] flex items-center justify-center text-slate-400 text-sm">
                            Sin gastos en este periodo
                        </div>
                    )}
                    <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                        <p className="text-xs text-slate-400">Total filtrado</p>
                        <p className="text-xl font-black text-red-600">${totalFiltrado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>

                {/* Table Area */}
                <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col">
                    {/* Table Filters */}
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Buscar por concepto o proveedor..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
                            />
                        </div>
                        <select
                            value={filterCategoria}
                            onChange={(e) => setFilterCategoria(e.target.value)}
                            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-red-500 outline-none"
                        >
                            <option value="all">Todas las Categorías</option>
                            {CATEGORIAS.map(c => (
                                <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
                            ))}
                        </select>
                        <input
                            type="month"
                            value={filterMes}
                            onChange={(e) => setFilterMes(e.target.value)}
                            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-red-500 outline-none"
                        />
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto">
                        {isLoading ? (
                            <div className="p-8 text-center text-slate-400 animate-pulse">Cargando gastos...</div>
                        ) : gastosFiltrados.length === 0 ? (
                            <div className="p-12 text-center">
                                <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
                                <p className="text-slate-400 text-sm">No hay gastos registrados en este periodo</p>
                                <button onClick={() => setIsModalOpen(true)} className="mt-4 text-red-600 font-bold text-sm hover:underline">+ Registrar el primero</button>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                                    <tr>
                                        <th className="text-left p-3 font-bold text-slate-500 text-xs uppercase">Fecha</th>
                                        <th className="text-left p-3 font-bold text-slate-500 text-xs uppercase">Categoría</th>
                                        <th className="text-left p-3 font-bold text-slate-500 text-xs uppercase">Concepto</th>
                                        <th className="text-left p-3 font-bold text-slate-500 text-xs uppercase hidden lg:table-cell">Método</th>
                                        <th className="text-right p-3 font-bold text-slate-500 text-xs uppercase">Monto</th>
                                        <th className="text-center p-3 font-bold text-slate-500 text-xs uppercase w-12"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {gastosFiltrados.map((g, i) => {
                                        const catInfo = getCatInfo(g.categoria)
                                        return (
                                            <tr key={g.id} className={`hover:bg-red-50/30 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                                <td className="p-3 font-medium text-slate-600 whitespace-nowrap">
                                                    {g.fecha_gasto ? new Date(g.fecha_gasto + 'T12:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '-'}
                                                </td>
                                                <td className="p-3">
                                                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold" style={{ backgroundColor: catInfo.color + '15', color: catInfo.color }}>
                                                        {catInfo.icon} {catInfo.label}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <p className="font-semibold text-slate-700 truncate max-w-[200px]">{g.concepto}</p>
                                                    {g.proveedor && <p className="text-[10px] text-slate-400 mt-0.5">→ {g.proveedor}</p>}
                                                </td>
                                                <td className="p-3 text-slate-500 font-medium hidden lg:table-cell">{g.metodo_pago}</td>
                                                <td className="p-3 text-right font-black text-red-600">${(g.monto || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                                                <td className="p-3 text-center">
                                                    <button onClick={() => handleDelete(g.id)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 size={15} />
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Table Footer */}
                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500">
                        <span>{gastosFiltrados.length} registro{gastosFiltrados.length !== 1 ? 's' : ''}</span>
                        <span className="font-black text-red-600 text-sm">Total: ${totalFiltrado.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </div>

            {/* Modal Nuevo Gasto */}
            {isModalOpen && (
                <NuevoGastoModal
                    onClose={() => setIsModalOpen(false)}
                    onSave={async (data) => {
                        try {
                            await registrarGasto({
                                ...data,
                                sucursal_id: selectedBranch !== 'all' ? selectedBranch : (branches?.[0]?.id || null),
                                usuario_id: profile?.user_id || profile?.id
                            })
                            toast.success('Gasto registrado exitosamente')
                            setIsModalOpen(false)
                        } catch (e) {
                            toast.error('Error: ' + e.message)
                        }
                    }}
                />
            )}
        </div>
    )
}

// ══════════════════════════════════════════
// Modal de Registro
// ══════════════════════════════════════════
function NuevoGastoModal({ onClose, onSave }) {
    const [form, setForm] = useState({
        categoria: 'OTROS',
        concepto: '',
        monto: '',
        metodo_pago: 'EFECTIVO',
        es_recurrente: false,
        proveedor: '',
        comprobante_ref: '',
        fecha_gasto: new Date().toISOString().split('T')[0],
        notas: ''
    })
    const [saving, setSaving] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!form.concepto.trim()) return toast.error('El concepto es obligatorio')
        if (!form.monto || parseFloat(form.monto) <= 0) return toast.error('Ingresa un monto válido')

        setSaving(true)
        await onSave({ ...form, monto: parseFloat(form.monto) })
        setSaving(false)
    }

    const update = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 bg-gradient-to-r from-red-600 to-red-700 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <DollarSign size={22} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Registrar Gasto</h2>
                            <p className="text-xs text-red-200">El monto se sincroniza automáticamente</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Categoría Visual */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">Categoría</label>
                        <div className="grid grid-cols-5 gap-2">
                            {CATEGORIAS.map(cat => (
                                <button
                                    key={cat.value}
                                    type="button"
                                    onClick={() => update('categoria', cat.value)}
                                    className={`flex flex-col items-center p-2 rounded-xl text-center transition-all border-2 ${form.categoria === cat.value
                                        ? 'border-red-500 bg-red-50 shadow-sm scale-105'
                                        : 'border-slate-100 hover:border-slate-300 bg-white'
                                        }`}
                                >
                                    <span className="text-xl mb-1">{cat.icon}</span>
                                    <span className="text-[9px] font-bold text-slate-600 leading-tight">{cat.label.split(' ')[0]}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Concepto + Monto */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Concepto *</label>
                            <input
                                type="text"
                                value={form.concepto}
                                onChange={(e) => update('concepto', e.target.value)}
                                placeholder="Ej: Pago de luz del mes"
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Monto *</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={form.monto}
                                    onChange={(e) => update('monto', e.target.value)}
                                    placeholder="0.00"
                                    className="w-full pl-7 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm font-bold focus:ring-2 focus:ring-red-500 outline-none"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    {/* Método + Fecha */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Método de Pago</label>
                            <select
                                value={form.metodo_pago}
                                onChange={(e) => update('metodo_pago', e.target.value)}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
                            >
                                {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Fecha del Gasto</label>
                            <input
                                type="date"
                                value={form.fecha_gasto}
                                onChange={(e) => update('fecha_gasto', e.target.value)}
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Proveedor + Comprobante */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Proveedor / Beneficiario</label>
                            <input
                                type="text"
                                value={form.proveedor}
                                onChange={(e) => update('proveedor', e.target.value)}
                                placeholder="(Opcional)"
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">No. Comprobante</label>
                            <input
                                type="text"
                                value={form.comprobante_ref}
                                onChange={(e) => update('comprobante_ref', e.target.value)}
                                placeholder="Factura / Recibo"
                                className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Notas */}
                    <div>
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Notas Adicionales</label>
                        <textarea
                            value={form.notas}
                            onChange={(e) => update('notas', e.target.value)}
                            rows={2}
                            placeholder="Observaciones opcionales..."
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
                        />
                    </div>

                    {/* Recurrente */}
                    <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer transition">
                        <input
                            type="checkbox"
                            checked={form.es_recurrente}
                            onChange={(e) => update('es_recurrente', e.target.checked)}
                            className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                        />
                        <div>
                            <span className="text-sm font-semibold text-slate-700">Gasto Recurrente</span>
                            <p className="text-[10px] text-slate-400">Se repite mensualmente (para referencia)</p>
                        </div>
                    </label>
                </form>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-lg transition-all disabled:opacity-50 shadow-sm active:scale-95 flex items-center gap-2"
                    >
                        {saving ? 'Guardando...' : <><DollarSign size={16} /> Registrar Gasto</>}
                    </button>
                </div>
            </div>
        </div>
    )
}
