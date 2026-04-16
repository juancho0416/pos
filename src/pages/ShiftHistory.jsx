import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Calendar, Filter, Clock, DollarSign, User, AlertTriangle, CheckCircle, Lock, Unlock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function ShiftHistory() {
    const { branches } = useAuth()
    const [history, setHistory] = useState([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [selectedBranch, setSelectedBranch] = useState('all')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')

    useEffect(() => {
        // Set default date range (Last 30 days)
        const end = new Date()
        const start = new Date()
        start.setDate(start.getDate() - 30)
        setStartDate(start.toISOString().split('T')[0])
        setEndDate(end.toISOString().split('T')[0])
    }, [])

    useEffect(() => {
        if (startDate && endDate) {
            fetchHistory()
        }
    }, [selectedBranch, startDate, endDate])

    const fetchHistory = async () => {
        setLoading(true)

        try {
            // 1. Traemos los turnos
            const { data: shifts, error: shiftError } = await supabase
                .from('turnos')
                .select('*')
                .order('fecha_inicio', { ascending: false })

            // 2. Traemos las sucursales para tener los nombres
            const { data: branchesData, error: branchesError } = await supabase
                .from('sucursales')
                .select('id, nombre')

            if (shiftError) console.error("Error fetching shifts:", shiftError.message)
            if (branchesError) console.error("Error fetching branches:", branchesError.message)

            if (shifts && branchesData) {
                // 3. "Casamos" los datos: a cada turno le pegamos el nombre de su sucursal
                const fullHistory = shifts.map(shift => ({
                    ...shift,
                    sucursal: branchesData.find(b => b.id === shift.sucursal_id)
                }))

                setHistory(fullHistory)
            }
        } catch (error) {
            console.error("Unexpected error in fetchHistory:", error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-6 min-h-screen bg-gray-50">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="text-blue-600" />
                        Historial de Turnos
                    </h1>
                    <p className="text-gray-500 text-sm">Auditoría de Cierres de Caja</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-2 px-2">
                        <Filter size={16} className="text-gray-400" />
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer"
                        >
                            <option value="all">Todas las Sucursales</option>
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div className="h-6 w-px bg-gray-200"></div>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="text-sm border-none focus:ring-0 text-gray-600 bg-transparent"
                    />
                    <span className="text-gray-400">-</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="text-sm border-none focus:ring-0 text-gray-600 bg-transparent"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
                            <tr>
                                <th className="p-4">Fecha / Hora</th>
                                <th className="p-4">Sucursal / Usuario</th>
                                <th className="p-4 text-center">Fondo Inicial</th>
                                <th className="p-4 text-center">Ventas Totales</th>
                                <th className="p-4 text-center">Efectivo Real</th>
                                <th className="p-4 text-center">Diferencia</th>
                                <th className="p-4 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan="7" className="p-8 text-center text-gray-400">Cargando historial...</td></tr>
                            ) : history.length === 0 ? (
                                <tr><td colSpan="7" className="p-8 text-center text-gray-400">No hay turnos en este periodo.</td></tr>
                            ) : (
                                history.map(turn => {
                                    const isActive = !turn.fecha_fin
                                    const totalVentas = (turn.total_ventas_efectivo || 0) + (turn.total_ventas_tarjeta || 0) + (turn.total_ventas_credito || 0)
                                    const isShort = !isActive && turn.diferencia < -1
                                    const isOver = !isActive && turn.diferencia > 1

                                    return (
                                        <tr key={turn.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-gray-700">
                                                        {new Date(turn.fecha_inicio).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                                        <Clock size={10} />
                                                        {new Date(turn.fecha_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                                                        {isActive ? '...' : new Date(turn.fecha_fin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-800">{turn.sucursal?.nombre}</span>
                                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                                        <User size={10} /> {turn.usuario || 'Cajero'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-center text-gray-500 font-mono">
                                                ${turn.monto_inicial?.toFixed(2)}
                                            </td>
                                            <td className="p-4 text-center">
                                                {isActive ? (
                                                    <span className="text-xs text-gray-400 italic">En curso...</span>
                                                ) : (
                                                    <>
                                                        <span className="font-bold text-blue-600 block">${totalVentas.toFixed(2)}</span>
                                                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">
                                                            Efec: ${turn.total_ventas_efectivo} | Tarj: ${turn.total_ventas_tarjeta}
                                                        </span>
                                                    </>
                                                )}
                                            </td>
                                            <td className="p-4 text-center font-bold text-gray-700">
                                                {isActive ? '-' : `$${turn.monto_final_real?.toFixed(2)}`}
                                            </td>
                                            <td className="p-4 text-center">
                                                {isActive ? '-' : (
                                                    <span className={`px-2 py-1 rounded font-bold text-sm ${isShort ? 'bg-red-100 text-red-700' :
                                                        isOver ? 'bg-green-100 text-green-700' :
                                                            'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {turn.diferencia > 0 ? '+' : ''}{turn.diferencia?.toFixed(2)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="p-4 text-center">
                                                {isActive ? (
                                                    <div className="flex items-center justify-center gap-1 text-blue-500 text-xs font-bold animate-pulse">
                                                        <Unlock size={14} /> ACTIVO
                                                    </div>
                                                ) : (
                                                    isShort ? (
                                                        <div className="flex items-center justify-center gap-1 text-red-500 text-xs font-bold">
                                                            <AlertTriangle size={14} /> FALTANTE
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-1 text-green-500 text-xs font-bold">
                                                            <CheckCircle size={14} /> OK
                                                        </div>
                                                    )
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
