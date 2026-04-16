import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Search, Filter, Calendar, ClipboardList, Box, ArrowDown, ArrowUp, ArrowLeftRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function KardexGeneral() {
    const { profile, branches } = useAuth()

    // States
    const [kardexItems, setKardexItems] = useState([])
    const [loading, setLoading] = useState(true)
    const [fetchError, setFetchError] = useState(null)

    // Filters
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedBranch, setSelectedBranch] = useState(() => {
        if (profile?.rol === 'vendedor' && profile?.sucursal_id) {
            return profile.sucursal_id.toString()
        }
        return 'ALL'
    })
    const [selectedType, setSelectedType] = useState('ALL')
    const [dateRange, setDateRange] = useState({
        from: new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
    })

    const MOVEMENT_TYPES = [
        { id: 'ALL', label: 'Todos los Movimientos' },
        { id: 'VENTA', label: 'Ventas' },
        { id: 'ENTRADA', label: 'Entradas' },
        { id: 'SALIDA', label: 'Salidas' },
        { id: 'AJUSTE', label: 'Ajustes' },
        { id: 'TRASPASO_ENTRADA', label: 'Traspasos (Entrada)' },
        { id: 'TRASPASO_SALIDA', label: 'Traspasos (Salida)' },
    ]

    const fetchKardex = async () => {
        if (!selectedBranch) return
        setLoading(true)
        setFetchError(null)

        try {
            const { from, to } = dateRange

            // Construct date strings directly to avoid JS Date object time-zone shifting 400 errors
            const fromDateStr = `${from}T00:00:00`
            const toDateStr = `${to}T23:59:59`

            let query = supabase
                .from('kardex')
                .select(`
                    *,
                    productos ( nombre, sku ),
                    sucursales ( nombre )
                `)
                .gte('created_at', fromDateStr)
                .lte('created_at', toDateStr)
                .order('created_at', { ascending: false })
                .limit(1000) // Protege la RAM contra periodos hiper densos

            if (selectedBranch !== 'ALL') {
                query = query.eq('sucursal_id', selectedBranch)
            }

            if (selectedType !== 'ALL') {
                query = query.eq('tipo_movimiento', selectedType)
            }

            const { data, error } = await query

            console.log("Datos de Kardex:", data)
            console.log("Kárdex Query Error:", error)

            if (error) {
                console.error("Error fetching kardex:", error)
                setFetchError(error.message || JSON.stringify(error))
            } else {
                setKardexItems(data || [])
            }
        } catch (err) {
            console.error("Unexpected error in fetchKardex:", err);
            setFetchError(err.message || 'Error inesperado');
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchKardex()
    }, [selectedBranch, selectedType, dateRange])


    const filteredItems = kardexItems.filter(item => {
        const query = searchTerm.toLowerCase()
        return (
            item.productos?.nombre?.toLowerCase().includes(query) ||
            item.productos?.sku?.toLowerCase().includes(query) ||
            item.referencia_id?.toLowerCase().includes(query)
        )
    })

    const getMovementIcon = (type) => {
        const isEntrada = ['ENTRADA', 'TRASPASO_ENTRADA', 'AJUSTE'].includes(type)
        if (type.includes('TRASPASO')) return <ArrowLeftRight size={14} className="text-blue-500" />
        if (isEntrada) return <ArrowDown size={14} className="text-green-500" />
        return <ArrowUp size={14} className="text-red-500" />
    }

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600">
                            <ClipboardList size={28} />
                        </div>
                        Monitor de Kárdex
                    </h1>
                    <p className="text-slate-500 text-sm mt-2">Supervisa todos los movimientos de inventario en tiempo real.</p>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap gap-4 mb-6">

                {/* Search Product */}
                <div className="flex-1 min-w-[250px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar producto o referencia..."
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                {/* Branch Selection */}
                {profile?.rol === 'admin' && (
                    <div className="min-w-[180px] relative">
                        <Box className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <select
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                        >
                            <option value="ALL">Todas las Sucursales</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.nombre}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Type Selection */}
                <div className="min-w-[180px] relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <select
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                    >
                        {MOVEMENT_TYPES.map(t => (
                            <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                    </select>
                </div>

                {/* Date Range */}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                    <Calendar size={18} className="text-slate-400" />
                    <input
                        type="date"
                        value={dateRange.from}
                        onChange={(e) => setDateRange(p => ({ ...p, from: e.target.value }))}
                        className="bg-transparent text-sm text-slate-600 focus:outline-none font-medium p-1 cursor-pointer"
                    />
                    <span className="text-slate-400 text-xs font-bold">A</span>
                    <input
                        type="date"
                        value={dateRange.to}
                        onChange={(e) => setDateRange(p => ({ ...p, to: e.target.value }))}
                        className="bg-transparent text-sm text-slate-600 focus:outline-none font-medium p-1 cursor-pointer"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                {fetchError && (
                    <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-xl">
                        <h3 className="text-red-800 font-bold mb-1">Error de base de datos</h3>
                        <p className="text-sm font-mono text-red-600 break-words">{fetchError}</p>
                    </div>
                )}

                {loading ? (
                    <div className="p-16 text-center text-slate-400 animate-pulse flex flex-col items-center">
                        <ClipboardList size={40} className="mb-4 opacity-20" />
                        Cargando movimientos...
                    </div>
                ) : filteredItems.length === 0 && !fetchError ? (
                    <div className="p-16 text-center text-slate-400 flex flex-col items-center">
                        <ClipboardList size={40} className="mb-4 opacity-20" />
                        No se encontraron movimientos para estos filtros.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                                    <th className="p-4 border-b border-slate-100">Fecha</th>
                                    <th className="p-4 border-b border-slate-100">Producto</th>
                                    <th className="p-4 border-b border-slate-100">Sucursal</th>
                                    <th className="p-4 border-b border-slate-100">Movimiento</th>
                                    <th className="p-4 border-b border-slate-100 text-center">Cant</th>
                                    <th className="p-4 border-b border-slate-100 text-center">Saldo</th>
                                    <th className="p-4 border-b border-slate-100">Referencia / Usuario</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-sm">
                                {filteredItems.map(item => {
                                    const tipoStr = String(item.tipo_movimiento || '');
                                    const isEntrada = ['ENTRADA', 'TRASPASO_ENTRADA', 'AJUSTE'].includes(tipoStr) && item.saldo_nuevo >= item.saldo_previo;

                                    return (
                                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="p-4 whitespace-nowrap text-slate-500 text-xs font-medium">
                                                {new Date(item.created_at).toLocaleString('es-MX', {
                                                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-slate-800 break-words max-w-[200px] leading-tight mb-1">
                                                    {item.productos?.nombre || 'Producto Desconocido'}
                                                </div>
                                                <div className="text-[10px] text-slate-400 font-mono tracking-widest uppercase">
                                                    {item.productos?.sku}
                                                </div>
                                            </td>
                                            <td className="p-4 text-slate-600 font-medium whitespace-nowrap">
                                                {item.sucursales?.nombre}
                                            </td>
                                            <td className="p-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isEntrada ? 'bg-green-100/50 text-green-700' : 'bg-red-100/50 text-red-700'
                                                    }`}>
                                                    {getMovementIcon(tipoStr)}
                                                    {tipoStr.replace('_', ' ')}
                                                </div>
                                            </td>
                                            <td className={`p-4 text-center font-black ${isEntrada ? 'text-green-600' : 'text-red-500'}`}>
                                                {isEntrada ? '+' : '-'}{item.cantidad}
                                            </td>
                                            <td className="p-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-xs text-slate-400 line-through decoration-slate-300">{item.saldo_previo}</span>
                                                    <span className="font-black text-slate-900 leading-none mt-0.5">{item.saldo_nuevo}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 max-w-[250px]">
                                                <div className="text-slate-700 font-medium truncate" title={item.referencia_id}>
                                                    {item.referencia_id || '-'}
                                                </div>
                                                <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                                    Sistema
                                                </div>
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
    )
}
