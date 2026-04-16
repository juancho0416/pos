import { useState } from 'react'
import { ShoppingCart, Plus, Search, FileText, ChevronRight, Package2, Clock, CheckCircle2, XCircle, DollarSign, Wallet } from 'lucide-react'
import { useQuery } from '@powersync/react'
import NuevaCompra from '../components/compras/NuevaCompra'
import PagosOrdenCompraModal from '../components/compras/PagosOrdenCompraModal'
import { useAuth } from '../context/AuthContext'

const ESTADO_STYLES = {
    RECIBIDA: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: CheckCircle2 },
    BORRADOR: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
    CANCELADA: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
    APROBADA: { bg: 'bg-blue-100', text: 'text-blue-700', icon: CheckCircle2 },
}

export default function Compras() {
    const { selectedBranch } = useAuth()
    const [view, setView] = useState('list') // 'list' | 'nueva'
    const [search, setSearch] = useState('')
    const [ordenParaPagar, setOrdenParaPagar] = useState(null)

    const { data: compras = [] } = useQuery(
        `SELECT oc.*, p.nombre as proveedor_nombre,
           (SELECT SUM(monto) FROM pagos_proveedores WHERE orden_compra_id = oc.id) as abonos
         FROM ordenes_compra oc
         LEFT JOIN proveedores p ON p.id = oc.proveedor_id
         WHERE oc.sucursal_id = ?
         ORDER BY oc.fecha_creacion DESC
         LIMIT 200`,
        [selectedBranch]
    )

    const filtered = compras.filter(c =>
        !search ||
        (c.proveedor_nombre || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.numero_folio || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.uuid_factura || '').toLowerCase().includes(search.toLowerCase())
    )

    if (view === 'nueva') {
        return (
            <div className="flex-1 p-4 lg:p-6 overflow-hidden flex flex-col">
                <NuevaCompra onBack={() => setView('list')} />
            </div>
        )
    }

    return (
        <div className="flex flex-col flex-1 overflow-hidden bg-slate-100">
            {/* Top Bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shadow-sm shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center">
                    <ShoppingCart className="text-blue-600" size={24} />
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Módulo de Compras</h1>
                    <p className="text-xs font-bold text-slate-400">Recepciones de mercancía y control de costos</p>
                </div>
                <button
                    onClick={() => setView('nueva')}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-black px-5 py-3 rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                >
                    <Plus size={18} />
                    Nueva Compra
                </button>
            </div>

            {/* Search + Content */}
            <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-4">
                {/* Search */}
                <div className="relative max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por proveedor, folio o UUID..."
                        className="w-full bg-white border border-slate-200 text-slate-800 rounded-2xl pl-10 pr-4 py-2.5 font-bold text-sm focus:outline-none focus:border-blue-500 shadow-sm"
                    />
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                        { label: 'Total Órdenes', val: compras.length, color: 'text-slate-700', bg: 'bg-white' },
                        { label: 'Recibidas', val: compras.filter(c => c.estado === 'RECIBIDA').length, color: 'text-emerald-700', bg: 'bg-emerald-50' },
                        { label: 'Borradores', val: compras.filter(c => c.estado === 'BORRADOR').length, color: 'text-yellow-700', bg: 'bg-yellow-50' },
                        {
                            label: 'Monto Total',
                            val: `$${compras.reduce((a, c) => a + (parseFloat(c.total) || 0), 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                            color: 'text-blue-700',
                            bg: 'bg-blue-50'
                        },
                    ].map(stat => (
                        <div key={stat.label} className={`${stat.bg} rounded-2xl border border-slate-200 p-5`}>
                            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">{stat.label}</p>
                            <p className={`text-2xl font-black ${stat.color}`}>{stat.val}</p>
                        </div>
                    ))}
                </div>

                {/* List */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
                            <Package2 size={56} />
                            <div className="text-center">
                                <p className="font-bold text-slate-500">Sin compras registradas</p>
                                <p className="text-sm text-slate-400 mt-1">Haz clic en "Nueva Compra" para registrar tu primera recepción.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse">
                                <thead className="border-b border-slate-100 bg-slate-50">
                                    <tr>
                                        <th className="py-3 px-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Fecha</th>
                                        <th className="py-3 px-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Folio</th>
                                        <th className="py-3 px-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Proveedor</th>
                                        <th className="py-3 px-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo</th>
                                        <th className="py-3 px-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Estado</th>
                                        <th className="py-3 px-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Total</th>
                                        <th className="py-3 px-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Pago / Deuda</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filtered.map(compra => {
                                        const style = ESTADO_STYLES[compra.estado] ?? ESTADO_STYLES['RECIBIDA']
                                        const Icon = style.icon
                                        const fecha = compra.fecha_documento
                                            ? new Date(compra.fecha_documento).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                                            : new Date(compra.fecha_creacion).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                                        return (
                                            <tr key={compra.id} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                                                <td className="py-3.5 px-5 text-slate-500 font-bold">{fecha}</td>
                                                <td className="py-3.5 px-5">
                                                    <span className="font-mono font-bold text-slate-600 text-xs bg-slate-100 px-2 py-1 rounded">
                                                        {compra.numero_folio || compra.uuid_factura?.slice(0, 8) || '—'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-5 font-bold text-slate-800">{compra.proveedor_nombre || 'Sin proveedor'}</td>
                                                <td className="py-3.5 px-5 text-center">
                                                    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                                                        <FileText size={12} />
                                                        {compra.tipo_documento || 'FACTURA'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-5 text-center">
                                                    <span className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-lg ${style.bg} ${style.text}`}>
                                                        <Icon size={12} />
                                                        {compra.estado}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 px-5 font-black text-slate-800">
                                                    ${parseFloat(compra.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                                </td>
                                                <td className="py-3.5 px-5 text-right">
                                                    {compra.estado === 'CANCELADA' ? (
                                                        <span className="text-slate-400 font-bold text-xs">—</span>
                                                    ) : (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setOrdenParaPagar(compra); }}
                                                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-black text-xs transition-colors shadow-sm
                                                                ${(compra.total - (compra.abonos || 0)) <= 0.01 
                                                                    ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' 
                                                                    : 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200'}`}
                                                        >
                                                            {(compra.total - (compra.abonos || 0)) <= 0.01 ? (
                                                                <><CheckCircle2 size={14} /> LIQUIDADO</>
                                                            ) : (
                                                                <><Wallet size={14} /> Pagar ${Math.max(0, compra.total - (compra.abonos || 0)).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</>
                                                            )}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            <PagosOrdenCompraModal 
                show={!!ordenParaPagar} 
                orden={ordenParaPagar} 
                onClose={() => setOrdenParaPagar(null)} 
            />
        </div>
    )
}
