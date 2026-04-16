import React, { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { MapPin, Package, Navigation, CheckCircle2, Loader2, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import DeliveryConfirmModal from '../../components/chofer/DeliveryConfirmModal'

export default function DriverRoute() {
    const { user } = useAuth()
    const [orders, setOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [selectedOrder, setSelectedOrder] = useState(null)
    const [showModal, setShowModal] = useState(false)

    useEffect(() => {
        if (!user) return

        const fetchRoute = async () => {
            try {
                const { data, error } = await supabase
                    .from('ventas')
                    .select(`
                        id, 
                        total, 
                        nombre_receptor, 
                        direccion_entrega, 
                        items, 
                        estado_entrega,
                        chofer_id
                    `)
                    .eq('estado_entrega', 'EN_TRANSITO')
                    .order('created_at', { ascending: true })

                if (error) throw error
                setOrders(data || [])
            } catch (error) {
                console.error("Error fetching route:", error)
                toast.error("No se pudo cargar tu ruta activa.")
            } finally {
                setLoading(false)
            }
        }

        fetchRoute()

        // Realtime Subscription universally for EN_TRANSITO
        const channel = supabase.channel('active-routes')
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'ventas', filter: `estado_entrega=eq.EN_TRANSITO` },
                (payload) => {
                    const updatedSale = payload.new
                    if (updatedSale.estado_entrega === 'EN_TRANSITO') {
                        setOrders(prev => {
                            const exists = prev.find(o => o.id === updatedSale.id)
                            return exists ? prev.map(o => o.id === updatedSale.id ? updatedSale : o) : [...prev, updatedSale]
                        })
                    } else if (updatedSale.estado_entrega === 'ENTREGADO') {
                        setOrders(prev => prev.filter(o => o.id !== updatedSale.id))
                    }
                }
            )
            .subscribe()

        return () => supabase.removeChannel(channel)
    }, [user])

    const handleOpenMaps = (address) => {
        const query = encodeURIComponent(address)
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank')
    }

    const handleOpenSignCanvas = (order) => {
        setSelectedOrder(order)
        setShowModal(true)
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-slate-500 font-bold animate-pulse">Cargando Ruta...</p>
            </div>
        )
    }

    if (orders.length === 0) {
        return (
            <div className="bg-white p-8 rounded-[2rem] text-center shadow-sm border border-slate-100 mt-8">
                <div className="bg-emerald-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight">Ruta Limpia</h2>
                <p className="text-slate-500 mt-2">No tienes viajes pendientes asignados.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {orders.map((order, idx) => (
                <div key={order.id} className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden relative">
                    {/* Badge Parada */}
                    <div className="absolute top-0 right-0 bg-indigo-600 text-white px-4 py-1.5 rounded-bl-xl font-black text-sm">
                        Parada {idx + 1}
                    </div>

                    <div className="p-6">
                        <h3 className="text-xl font-black text-slate-800 leading-tight pr-16">
                            {order.nombre_receptor || 'Construcción / Obra'}
                        </h3>

                        <div className="mt-4 flex items-start gap-3 text-slate-600 bg-slate-50 p-4 rounded-2xl">
                            <MapPin className="w-6 h-6 shrink-0 text-indigo-500 mt-0.5" />
                            <p className="font-medium text-sm leading-snug">{order.direccion_entrega || 'Dirección no especificada'}</p>
                        </div>

                        {/* Botón de Navegación Nativo */}
                        <button
                            onClick={() => handleOpenMaps(order.direccion_entrega)}
                            className="w-full mt-3 bg-indigo-50 text-indigo-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-100 active:scale-95 transition-all text-sm"
                        >
                            <Navigation size={18} />
                            Navegar al Destino
                        </button>

                        {/* Desglose de Items */}
                        <div className="mt-6">
                            <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2 mb-3">
                                <Package className="w-4 h-4 text-slate-400" />
                                Material a Descargar ({order.items?.length || 0})
                            </h4>
                            <div className="space-y-2">
                                {order.items?.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm py-1 border-b border-slate-50 last:border-0">
                                        <span className="text-slate-600 truncate mr-4">{item.nombre}</span>
                                        <span className="font-black text-slate-800 bg-slate-100 px-2.5 py-1 rounded-lg">x{item.cantidad}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Botón de Acción Principal */}
                    <button
                        onClick={() => handleOpenSignCanvas(order)}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-5 text-lg flex items-center justify-center gap-2 shadow-inner active:bg-emerald-700 transition-colors"
                    >
                        Entregar Mercancía
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>
            ))}

            {showModal && selectedOrder && (
                <DeliveryConfirmModal
                    order={selectedOrder}
                    onClose={() => setShowModal(false)}
                />
            )}
        </div>
    )
}
