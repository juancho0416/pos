// DriverRoute.jsx — Interfaz del Chofer (Mobile First)
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import {
    Truck, MapPin, Phone, Navigation, Package, CheckCircle,
    Clock, DollarSign, AlertTriangle
} from 'lucide-react'
import DeliveryConfirmModal from '../components/delivery/DeliveryConfirmModal'

const COBRO_BADGE = {
    pagado: { bg: 'bg-green-500', text: 'text-white', label: '🟢 YA PAGADO', icon: CheckCircle },
    cobrar: { bg: 'bg-red-500', text: 'text-white', label: '🔴 COBRAR EN ENTREGA', icon: DollarSign },
    credito: { bg: 'bg-blue-500', text: 'text-white', label: '🔵 CARGO A CRÉDITO', icon: AlertTriangle },
}

export default function DriverRoute() {
    const { user } = useAuth()
    const [entregas, setEntregas] = useState([])
    const [loading, setLoading] = useState(true)
    const [deliverTarget, setDeliverTarget] = useState(null)

    const fetchRef = useRef(null)

    useEffect(() => {
        const fetchMisEntregas = async () => {
            if (!user?.id) return
            setLoading(true)

            const { data: viajes } = await supabase
                .from('viajes')
                .select('id')
                .eq('chofer_id', user.id)
                .eq('estado', 'EN_RUTA')

            if (!viajes || viajes.length === 0) {
                setEntregas([])
                setLoading(false)
                return
            }

            const viajeIds = viajes.map(v => v.id)

            const { data, error } = await supabase
                .from('ventas')
                .select(`
                    *,
                    cliente:clientes(id, nombre, telefono),
                    detalles:venta_detalles(id, cantidad, precio_unitario, productos(nombre))
                `)
                .in('viaje_id', viajeIds)
                .in('estado_entrega', ['EN_RUTA', 'ENTREGADO'])
                .order('estado_entrega', { ascending: true })
                .order('created_at', { ascending: true })

            if (error) console.error(error)
            else setEntregas(data || [])
            setLoading(false)
        }

        fetchRef.current = fetchMisEntregas
        fetchMisEntregas()
    }, [user?.id])

    const refetchEntregas = () => fetchRef.current?.()

    const pendientes = entregas.filter(e => e.estado_entrega === 'EN_RUTA')
    const entregados = entregas.filter(e => e.estado_entrega === 'ENTREGADO')
    const totalCobrar = pendientes
        .filter(e => e.metodo_pago !== 'contado' && e.metodo_pago !== 'tarjeta' && e.metodo_pago !== 'credito')
        .reduce((s, e) => s + (e.total || 0), 0)
    const totalCobrado = entregados
        .filter(e => e.cobro_confirmado)
        .reduce((s, e) => s + (e.total || 0), 0)

    const getCobro = (venta) => {
        if (venta.metodo_pago === 'contado' || venta.metodo_pago === 'tarjeta') return 'pagado'
        if (venta.metodo_pago === 'credito') return 'credito'
        return 'cobrar'
    }

    const openMaps = (direccion) => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`, '_blank')
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-4 py-5 text-white">
                <div className="flex items-center gap-3 mb-3">
                    <div className="bg-blue-600 p-2 rounded-xl">
                        <Truck size={22} />
                    </div>
                    <div>
                        <h1 className="font-black text-lg">Mi Ruta de Entregas</h1>
                        <p className="text-xs text-slate-400">
                            {pendientes.length} pendiente{pendientes.length !== 1 ? 's' : ''} · {entregados.length} entregada{entregados.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Por Cobrar</p>
                        <p className="text-xl font-black text-amber-400">${totalCobrar.toLocaleString('es-MX')}</p>
                    </div>
                    <div className="bg-white/10 rounded-xl p-3 backdrop-blur">
                        <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Cobrado</p>
                        <p className="text-xl font-black text-green-400">${totalCobrado.toLocaleString('es-MX')}</p>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {loading ? (
                    <div className="text-center py-12 text-gray-400">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                        Cargando ruta...
                    </div>
                ) : pendientes.length === 0 && entregados.length === 0 ? (
                    <div className="text-center py-12 text-gray-400 bg-white rounded-2xl shadow-sm">
                        <Package size={48} className="mx-auto mb-3 opacity-20" />
                        <p className="font-bold text-sm">No tienes entregas asignadas</p>
                        <p className="text-xs mt-1">Las entregas aparecerán cuando el almacén te asigne un viaje</p>
                    </div>
                ) : (
                    <>
                        {/* Pending Deliveries */}
                        {pendientes.length > 0 && (
                            <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider px-1">
                                📦 Pendientes ({pendientes.length})
                            </h2>
                        )}
                        {pendientes.map(v => {
                            const cobro = getCobro(v)
                            const badge = COBRO_BADGE[cobro]
                            return (
                                <div key={v.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    {/* Cobro Badge - Full width */}
                                    <div className={`px-4 py-2 ${badge.bg} ${badge.text} font-black text-sm flex items-center justify-between`}>
                                        <span>{badge.label}</span>
                                        {cobro === 'cobrar' && (
                                            <span className="text-lg">${v.total?.toLocaleString('es-MX')}</span>
                                        )}
                                    </div>

                                    <div className="p-4">
                                        {/* Client */}
                                        <h3 className="font-black text-slate-800 text-lg mb-0.5">
                                            {v.cliente?.nombre || 'Sin nombre'}
                                        </h3>

                                        {/* Address */}
                                        {v.direccion_entrega && (
                                            <button
                                                onClick={() => openMaps(v.direccion_entrega)}
                                                className="flex items-start gap-2 text-sm text-blue-600 font-medium hover:text-blue-800 transition mt-1 text-left"
                                            >
                                                <Navigation size={16} className="mt-0.5 flex-shrink-0" />
                                                <span className="underline">{v.direccion_entrega}</span>
                                            </button>
                                        )}

                                        {/* Phone */}
                                        {(v.cliente?.telefono || v.telefono_entrega) && (
                                            <a
                                                href={`tel:${v.cliente?.telefono || v.telefono_entrega}`}
                                                className="flex items-center gap-2 text-sm text-gray-600 mt-2"
                                            >
                                                <Phone size={14} /> {v.cliente?.telefono || v.telefono_entrega}
                                            </a>
                                        )}

                                        {/* Items summary */}
                                        <div className="mt-3 bg-gray-50 rounded-lg p-2.5">
                                            {v.detalles?.slice(0, 3).map((d, i) => (
                                                <p key={i} className="text-xs text-gray-600">
                                                    {d.cantidad}x {d.productos?.nombre}
                                                </p>
                                            ))}
                                            {v.detalles?.length > 3 && (
                                                <p className="text-xs text-gray-400 mt-1">+{v.detalles.length - 3} más...</p>
                                            )}
                                        </div>

                                        {/* Deliver Button */}
                                        <button
                                            onClick={() => setDeliverTarget(v)}
                                            className="w-full mt-3 py-3 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 active:scale-[0.98] transition shadow-lg shadow-green-200"
                                        >
                                            <CheckCircle size={20} /> Entregar
                                        </button>
                                    </div>
                                </div>
                            )
                        })}

                        {/* Delivered */}
                        {entregados.length > 0 && (
                            <>
                                <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider px-1 mt-6">
                                    ✅ Entregadas ({entregados.length})
                                </h2>
                                {entregados.map(v => (
                                    <div key={v.id} className="bg-white rounded-2xl shadow-sm border border-green-100 p-4 opacity-70">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-bold text-slate-700">{v.cliente?.nombre}</p>
                                                <p className="text-xs text-gray-400">
                                                    {v.entregado_at && new Date(v.entregado_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
                                                ✅ ${v.total?.toLocaleString('es-MX')}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Confirm Modal */}
            {deliverTarget && (
                <DeliveryConfirmModal
                    venta={deliverTarget}
                    onClose={() => setDeliverTarget(null)}
                    onSuccess={refetchEntregas}
                />
            )}
        </div>
    )
}
