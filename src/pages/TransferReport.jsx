// TransferReport.jsx — Historial completo de traspasos
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Search, ArrowRightLeft, Calendar as CalendarIcon, Filter, Eye } from 'lucide-react'
import TransferTicket from '../components/transfers/TransferTicket'
import { useAuth } from '../context/AuthContext'

const ESTADO_BADGE = {
    SOLICITADO: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Solicitado', icon: '🕐' },
    EN_TRANSITO: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'En Tránsito', icon: '🚚' },
    RECIBIDO: { bg: 'bg-green-100', text: 'text-green-800', label: 'Recibido', icon: '✅' },
    CANCELADO: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelado', icon: '❌' },
}

export default function TransferReport() {
    const { branches } = useAuth()
    const [transfers, setTransfers] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [dateFilter, setDateFilter] = useState('all')
    const [statusFilter, setStatusFilter] = useState('all')
    const [ticketData, setTicketData] = useState(null)

    const fetchTransferHistory = async () => {
        setLoading(true)

        const now = new Date()
        let startDate = null

        if (dateFilter === 'today') {
            startDate = new Date(now.setHours(0, 0, 0, 0)).toISOString()
        } else if (dateFilter === 'week') {
            const firstDay = now.getDate() - now.getDay()
            startDate = new Date(now.setDate(firstDay)).toISOString()
        } else if (dateFilter === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
        }

        let query = supabase
            .from('traslados')
            .select(`
                *,
                items:traslado_items(
                    id, cantidad,
                    producto:productos(id, nombre, sku)
                )
            `)
            .order('created_at', { ascending: false })
            .limit(100)

        if (startDate) {
            query = query.gte('created_at', startDate)
        }
        if (statusFilter !== 'all') {
            query = query.eq('estado', statusFilter)
        }

        const { data, error } = await query

        if (error) {
            console.error('Error fetching transfer history:', error)
        } else {
            setTransfers(data || [])
        }

        setLoading(false)
    }

    useEffect(() => {
        fetchTransferHistory()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateFilter, statusFilter])

    const filteredTransfers = transfers.filter(t => {
        const searchLower = searchTerm.toLowerCase()
        if (!searchLower) return true
        return t.items?.some(item =>
            item.producto?.nombre?.toLowerCase().includes(searchLower) ||
            item.producto?.sku?.toLowerCase().includes(searchLower)
        )
    })

    const viewTicket = (t) => {
        setTicketData({
            ...t,
            items: t.items?.map(i => ({
                nombre: i.producto?.nombre,
                sku: i.producto?.sku,
                cantidad: i.cantidad
            }))
        })
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ArrowRightLeft className="text-blue-600" />
                        Historial de Traspasos
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Registro de movimientos de mercancía entre sucursales</p>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre de producto o SKU..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="relative min-w-[180px]">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <select
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white font-medium text-gray-700"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                    >
                        <option value="all">Todas las fechas</option>
                        <option value="today">Hoy</option>
                        <option value="week">Esta semana</option>
                        <option value="month">Este mes</option>
                    </select>
                </div>

                <div className="min-w-[180px]">
                    <select
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white font-medium text-gray-700"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="all">Todos los estados</option>
                        <option value="SOLICITADO">Solicitado</option>
                        <option value="EN_TRANSITO">En Tránsito</option>
                        <option value="RECIBIDO">Recibido</option>
                        <option value="CANCELADO">Cancelado</option>
                    </select>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
                                <th className="p-4 font-semibold whitespace-nowrap">Folio</th>
                                <th className="p-4 font-semibold">Fecha</th>
                                <th className="p-4 font-semibold">Estado</th>
                                <th className="p-4 font-semibold">Origen</th>
                                <th className="p-4 font-semibold">Destino</th>
                                <th className="p-4 font-semibold text-right">Artículos</th>
                                <th className="p-4 font-semibold text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-400">
                                        Cargando historial de traspasos...
                                    </td>
                                </tr>
                            ) : filteredTransfers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="p-8 text-center text-gray-400">
                                        No se encontraron movimientos.
                                    </td>
                                </tr>
                            ) : (
                                filteredTransfers.map((t) => {
                                    const estado = ESTADO_BADGE[t.estado] || ESTADO_BADGE.SOLICITADO
                                    return (
                                        <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4">
                                                <span className="font-black text-slate-800">#{String(t.folio).padStart(4, '0')}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-gray-600 w-max">
                                                    <CalendarIcon size={16} className="text-gray-400" />
                                                    <span className="text-sm font-medium">
                                                        {new Date(t.created_at).toLocaleDateString('es-MX')}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-400">
                                                    {new Date(t.created_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${estado.bg} ${estado.text}`}>
                                                    {estado.icon} {estado.label}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                    {branches.find(b => b.id === t.origen_id)?.nombre || '—'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    {branches.find(b => b.id === t.destino_id)?.nombre || '—'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <span className="font-bold text-gray-900">{t.items?.length || 0}</span>
                                                <span className="text-xs text-gray-400 ml-1">
                                                    ({t.items?.reduce((s, i) => s + i.cantidad, 0) || 0} uds)
                                                </span>
                                            </td>
                                            <td className="p-4 text-center">
                                                <button
                                                    onClick={() => viewTicket(t)}
                                                    className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 p-2 rounded-lg transition"
                                                    title="Ver comprobante"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Ticket Modal */}
            {ticketData && (
                <TransferTicket
                    transfer={ticketData}
                    branches={branches}
                    onClose={() => setTicketData(null)}
                />
            )}
        </div>
    )
}
