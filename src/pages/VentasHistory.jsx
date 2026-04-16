import { useState } from 'react'
import { ShoppingBag, Search, Calendar, Eye, Printer, ReceiptText, TrendingUp, Clock, ChevronRight } from 'lucide-react'
import { useQuery } from '@powersync/react'
import { useAuth } from '../context/AuthContext'

const METODO_ICONS = {
    efectivo: '💵',
    tarjeta: '💳',
    credito: '📒',
    mixto: '🔀',
    monedero: '👛',
}

function formatDate(dateStr) {
    if (!dateStr) return '—'
    try {
        return new Date(dateStr).toLocaleString('es-MX', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        })
    } catch { return dateStr }
}

export default function VentasHistory() {
    const { selectedBranch } = useAuth()
    const [search, setSearch] = useState('')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [selectedVenta, setSelectedVenta] = useState(null)

    const { data: ventas = [] } = useQuery(
        selectedBranch
            ? `SELECT v.*, c.nombre as cliente_nombre
               FROM ventas v
               LEFT JOIN clientes c ON c.id = v.cliente_id
               WHERE v.sucursal_id = ?
               ORDER BY v.created_at DESC
               LIMIT 500`
            : `SELECT 1 WHERE 0=1`,
        selectedBranch ? [selectedBranch] : []
    )

    const { data: detalles = [] } = useQuery(
        selectedVenta
            ? `SELECT * FROM venta_detalles WHERE venta_id = ? ORDER BY rowid`
            : `SELECT 1 WHERE 0=1`,
        selectedVenta ? [selectedVenta.id] : []
    )

    const filtered = ventas.filter(v => {
        const term = search.toLowerCase()
        const matchesSearch = !search ||
            (v.cliente_nombre || '').toLowerCase().includes(term) ||
            (v.metodo_pago || '').toLowerCase().includes(term) ||
            v.id.includes(term)

        const vDate = v.created_at?.slice(0, 10)
        const matchesFrom = !dateFrom || vDate >= dateFrom
        const matchesTo = !dateTo || vDate <= dateTo

        return matchesSearch && matchesFrom && matchesTo
    })

    const totalFiltrado = filtered.reduce((s, v) => s + (parseFloat(v.total) || 0), 0)
    const totalVentas = ventas.reduce((s, v) => s + (parseFloat(v.total) || 0), 0)

    return (
        <div className="flex flex-col flex-1 overflow-hidden bg-slate-100">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shadow-sm shrink-0">
                <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center">
                    <ReceiptText className="text-violet-600" size={24} />
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Historial de Ventas</h1>
                    <p className="text-xs font-bold text-slate-400">{ventas.length} ventas · Total acumulado: ${totalVentas.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left: List */}
                <div className="flex flex-col flex-1 overflow-hidden">
                    {/* Filters */}
                    <div className="bg-white border-b border-slate-100 px-4 py-3 flex flex-wrap gap-3 items-center shrink-0">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                                placeholder="Buscar por cliente, método, ID..."
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl pl-9 pr-3 py-2 font-bold text-sm focus:outline-none focus:border-violet-500" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar size={14} className="text-slate-400 shrink-0" />
                            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2 font-bold text-xs focus:outline-none focus:border-violet-500" />
                            <span className="text-slate-300 text-xs font-bold">—</span>
                            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-3 py-2 font-bold text-xs focus:outline-none focus:border-violet-500" />
                        </div>
                        {(search || dateFrom || dateTo) && (
                            <div className="text-xs font-bold text-violet-600 bg-violet-50 px-3 py-2 rounded-xl">
                                {filtered.length} resultados · ${totalFiltrado.toFixed(2)}
                            </div>
                        )}
                    </div>

                    {/* Stats mini */}
                    <div className="grid grid-cols-3 gap-0 border-b border-slate-100 bg-white shrink-0">
                        {[
                            { label: 'Hoy', val: ventas.filter(v => v.created_at?.startsWith(new Date().toISOString().slice(0, 10))).length, icon: Clock, color: 'text-blue-600' },
                            { label: 'Ventas mostradas', val: filtered.length, icon: TrendingUp, color: 'text-violet-600' },
                            { label: 'Total mostrado', val: `$${totalFiltrado.toFixed(2)}`, icon: ShoppingBag, color: 'text-emerald-600' },
                        ].map(s => {
                            const Icon = s.icon
                            return (
                                <div key={s.label} className="flex items-center gap-3 px-5 py-3 border-r border-slate-50 last:border-0">
                                    <Icon size={18} className={s.color} />
                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{s.label}</p>
                                        <p className={`text-base font-black ${s.color}`}>{s.val}</p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Table */}
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead className="bg-white sticky top-0 z-10 border-b border-slate-100 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                                <tr>
                                    <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</th>
                                    <th className="py-3 px-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</th>
                                    <th className="py-3 px-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Método</th>
                                    <th className="py-3 px-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Total</th>
                                    <th className="py-3 px-4 w-10" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-3 text-slate-300">
                                                <ReceiptText size={48} />
                                                <p className="font-bold text-slate-400">Sin ventas en este periodo</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : filtered.map(v => (
                                    <tr key={v.id}
                                        onClick={() => setSelectedVenta(v === selectedVenta ? null : v)}
                                        className={`hover:bg-violet-50/30 cursor-pointer transition-colors ${selectedVenta?.id === v.id ? 'bg-violet-50 border-l-2 border-violet-400' : ''}`}>
                                        <td className="py-3 px-4 text-slate-500 text-xs font-bold">{formatDate(v.created_at)}</td>
                                        <td className="py-3 px-4">
                                            <p className="font-bold text-slate-700 text-sm">{v.cliente_nombre || 'Público General'}</p>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="inline-flex items-center gap-1 text-xs font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
                                                {METODO_ICONS[v.metodo_pago] || '💰'} {v.metodo_pago || 'efectivo'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-right font-black text-slate-800">${parseFloat(v.total || 0).toFixed(2)}</td>
                                        <td className="py-3 px-3">
                                            <ChevronRight size={16} className={`text-slate-300 transition-transform ${selectedVenta?.id === v.id ? 'rotate-90 text-violet-400' : ''}`} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Detail Panel */}
                {selectedVenta && (
                    <div className="w-80 border-l border-slate-200 bg-white flex flex-col overflow-hidden shrink-0 shadow-xl">
                        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Detalle de Venta</p>
                                <button onClick={() => setSelectedVenta(null)} className="text-slate-400 hover:text-slate-700 p-1">✕</button>
                            </div>
                            <p className="text-[10px] font-mono text-slate-400 mt-1 truncate">{selectedVenta.id}</p>
                        </div>

                        <div className="flex-1 overflow-auto p-4 space-y-4">
                            {/* Metadata */}
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-400 font-bold">Fecha:</span>
                                    <span className="font-bold text-slate-700 text-xs">{formatDate(selectedVenta.created_at)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400 font-bold">Cliente:</span>
                                    <span className="font-bold text-slate-700">{selectedVenta.cliente_nombre || 'Público'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400 font-bold">Método:</span>
                                    <span className="font-bold text-slate-700">
                                        {METODO_ICONS[selectedVenta.metodo_pago]} {selectedVenta.metodo_pago}
                                    </span>
                                </div>
                                {selectedVenta.monto_recibido > 0 && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-400 font-bold">Recibido:</span>
                                        <span className="font-bold text-slate-700">${parseFloat(selectedVenta.monto_recibido).toFixed(2)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Line Items */}
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Productos</p>
                                <div className="space-y-2">
                                    {detalles.length === 0 ? (
                                        <p className="text-xs text-slate-300 italic">Sin detalles guardados</p>
                                    ) : detalles.map((d, i) => (
                                        <div key={i} className="flex items-start justify-between gap-2 text-sm">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-slate-700 text-xs leading-tight truncate">{d.nombre}</p>
                                                <p className="text-[10px] text-slate-400">{d.cantidad} × ${parseFloat(d.precio_unitario || 0).toFixed(2)}</p>
                                            </div>
                                            <span className="font-black text-slate-700 text-sm shrink-0">${parseFloat(d.subtotal || 0).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Total */}
                            <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                                <span className="font-black text-slate-600 uppercase text-xs tracking-widest">Total</span>
                                <span className="text-2xl font-black text-slate-900">${parseFloat(selectedVenta.total || 0).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
                            <button
                                onClick={() => window.print()}
                                className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-800 text-white font-black py-2.5 rounded-2xl text-sm active:scale-95 transition-all">
                                <Printer size={16} />
                                Reimprimir Ticket
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
