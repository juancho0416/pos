import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { Truck, MapPin, UserSquare2, Package, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function B2BDispatchBoard() {
    const [orders, setOrders] = useState([])
    const [drivers, setDrivers] = useState([])
    const [loading, setLoading] = useState(true)
    const [assigningId, setAssigningId] = useState(null)
    const [selectedDrivers, setSelectedDrivers] = useState({}) // track driver per order

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Fetch orders ready to be routed
                const { data: salesData, error: salesError } = await supabase
                    .from('ventas')
                    .select(`
                        id,
                        total,
                        estado_entrega,
                        direccion_entrega,
                        nombre_receptor,
                        items,
                        created_at,
                        cliente_id,
                        chofer_id
                    `)
                    .eq('tipo_venta', 'MAYOREO')
                    .eq('estado_entrega', 'LISTO_PARA_RUTA')
                    .order('created_at', { ascending: true })

                if (salesError) throw salesError
                setOrders(salesData || [])

                // Fetch available drivers (employees) from perfiles
                const { data: driversData, error: driversError } = await supabase
                    .from('perfiles')
                    .select('id, nombre, rol')
                    .order('nombre')

                if (driversError) throw driversError
                setDrivers(driversData || [])

            } catch (err) {
                console.error("Error fetching dispatch data:", err)
                toast.error("Error al cargar pedidos por despachar.")
            } finally {
                setLoading(false)
            }
        }

        fetchInitialData()

        // Realtime Subscription
        const channel = supabase.channel('dispatch-board')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'ventas', filter: "tipo_venta=eq.MAYOREO" },
                (payload) => {
                    const { new: newVenta, eventType } = payload

                    if (eventType === 'UPDATE') {
                        if (newVenta.estado_entrega === 'LISTO_PARA_RUTA') {
                            setOrders(prev => {
                                const exists = prev.find(o => o.id === newVenta.id)
                                return exists ? prev.map(o => o.id === newVenta.id ? newVenta : o) : [...prev, newVenta]
                            })
                        } else {
                            // If it moved out of LISTO_PARA_RUTA
                            setOrders(prev => prev.filter(o => o.id !== newVenta.id))
                        }
                    } else if (eventType === 'INSERT' && newVenta.estado_entrega === 'LISTO_PARA_RUTA') {
                        setOrders(prev => [...prev, newVenta])
                    }
                }
            )
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [])

    const handleAssignDriver = (orderId, driverId) => {
        setSelectedDrivers(prev => ({ ...prev, [orderId]: driverId }))
    }

    const handleDispatch = async (order) => {
        const driverId = selectedDrivers[order.id]
        if (!driverId) {
            toast.error("Selecciona un chofer o camioneta antes de despachar.")
            return
        }

        setAssigningId(order.id)
        try {
            const { error } = await supabase
                .from('ventas')
                .update({
                    chofer_id: driverId,
                    estado_entrega: 'EN_TRANSITO'
                })
                .eq('id', order.id)

            if (error) throw error
            toast.success(`Orden TKT-${String(order.id).padStart(5, '0')} despachada exitosamente.`)
            // Optimistic update done via realtime channel
        } catch (err) {
            console.error("Error assigning driver:", err)
            toast.error("Fallo al despachar la camioneta.")
        } finally {
            setAssigningId(null)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-[60vh] text-indigo-500">
                <Loader2 className="w-10 h-10 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 p-8 rounded-[2rem] shadow-xl text-white">
                <div>
                    <h1 className="text-3xl font-black flex items-center gap-3 tracking-tight">
                        <Truck className="text-indigo-400 w-8 h-8" />
                        Tablero de Despacho (Logística)
                    </h1>
                    <p className="text-slate-400 mt-2 text-lg">
                        Cargas B2B <span className="text-indigo-400 font-bold uppercase tracking-wider">Lístas Para Ruta</span>
                    </p>
                </div>
            </div>

            {orders.length === 0 ? (
                <div className="bg-white rounded-[2rem] border border-slate-200 p-16 text-center shadow-sm">
                    <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-12 h-12 text-slate-300" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-700">Andén Limpio</h3>
                    <p className="text-slate-500 mt-2">No hay pedidos esperando carga de camionetas en este momento.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {orders.map(order => (
                        <div key={order.id} className="bg-white rounded-3xl p-6 shadow-md border-2 border-indigo-50 hover:border-indigo-100 transition-all flex flex-col justify-between">

                            {/* Order Header */}
                            <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-4">
                                <div>
                                    <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl font-bold text-xs mb-3">
                                        <Package className="w-4 h-4" />
                                        TKT-{String(order.id).padStart(5, '0')}
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight">
                                        {order.nombre_receptor || 'Constructora B2B'}
                                    </h3>
                                    <div className="flex items-start gap-2 text-slate-500 text-sm mt-3 leading-tight">
                                        <MapPin className="w-4 h-4 shrink-0 text-slate-400 mt-0.5" />
                                        <p>{order.direccion_entrega || 'Dirección no especificada'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">Volumen</p>
                                    <p className="text-lg font-black text-slate-700">{order.items?.length || 0} SKUs</p>
                                </div>
                            </div>

                            {/* Dispatch Controls */}
                            <div className="bg-slate-50 p-5 rounded-2xl flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                                <div className="flex-1 relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                        <UserSquare2 className="w-5 h-5" />
                                    </div>
                                    <select
                                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                                        value={selectedDrivers[order.id] || ''}
                                        onChange={(e) => handleAssignDriver(order.id, e.target.value)}
                                        disabled={assigningId === order.id}
                                    >
                                        <option value="" disabled>Seleccionar Chofer / Camioneta...</option>
                                        {drivers.map(d => (
                                            <option key={d.id} value={d.id}>
                                                {d.nombre} {d.rol === 'chofer' ? '(Chofer)' : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <button
                                    onClick={() => handleDispatch(order)}
                                    disabled={assigningId === order.id || !selectedDrivers[order.id]}
                                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                                >
                                    {assigningId === order.id ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            Asignar y Dar Salida
                                            <Truck className="w-5 h-5" />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
