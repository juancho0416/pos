import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'
import {
    Truck, Package, CheckSquare, Square, Send, MapPin,
    Clock, User, DollarSign, Search, Filter, FileText
} from 'lucide-react'
import RouteDispatchModal from '../components/delivery/RouteDispatchModal'

const ESTADO_BADGE = {
    PENDIENTE: { bg: 'bg-amber-100', text: 'text-amber-800', label: '📦 Pendiente' },
    EN_RUTA: { bg: 'bg-blue-100', text: 'text-blue-800', label: '🚚 En Ruta' },
    ENTREGADO: { bg: 'bg-green-100', text: 'text-green-800', label: '✅ Entregado' },
}

export default function DeliveryDispatch() {
    const { user, selectedBranch } = useAuth()
    const [ventas, setVentas] = useState([])
    const [loading, setLoading] = useState(true)
    const [selected, setSelected] = useState(new Set())
    const [choferNombre, setChoferNombre] = useState('')
    const [vehiculo, setVehiculo] = useState('')
    const [searchTerm, setSearchTerm] = useState('')
    const [viewMode, setViewMode] = useState('pendientes') // pendientes | en_ruta | todas
    const [showDispatchModal, setShowDispatchModal] = useState(false)

    const fetchRef = useRef(null)

    useEffect(() => {
        const fetchVentas = async () => {
            if (!selectedBranch) return
            setLoading(true)

            let query = supabase
                .from('ventas')
                .select(`
                    *,
                    cliente:clientes(id, nombre, telefono),
                    detalles:venta_detalles(id, cantidad, precio_unitario, productos(nombre))
                `)
                .eq('sucursal_id', selectedBranch)
                .eq('metodo_entrega', 'DOMICILIO')
                .order('created_at', { ascending: false })
                .limit(100)

            if (viewMode === 'pendientes') {
                query = query.eq('estado_entrega', 'PENDIENTE')
            } else if (viewMode === 'en_ruta') {
                query = query.eq('estado_entrega', 'EN_RUTA')
            }

            const { data, error } = await query
            if (error) console.error('Error fetching delivery sales:', error)
            else setVentas(data || [])
            setLoading(false)
        }

        fetchRef.current = fetchVentas
        fetchVentas()
    }, [selectedBranch, viewMode])

    const refetchVentas = () => fetchRef.current?.()

    const toggleSelect = (id) => {
        setSelected(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const toggleAll = () => {
        const pendientes = ventas.filter(v => v.estado_entrega === 'PENDIENTE')
        if (selected.size === pendientes.length) {
            setSelected(new Set())
        } else {
            setSelected(new Set(pendientes.map(v => v.id)))
        }
    }

    const handleDespacharClick = () => {
        if (selected.size === 0) return toast.error('Selecciona al menos una venta')
        if (!choferNombre.trim()) return toast.error('Ingresa el nombre del chofer')
        setShowDispatchModal(true)
    }

    const handleConfirmDispatch = async (firmaChoferBase64) => {
        // Crear viaje
        const { data: viaje, error: vErr } = await supabase
            .from('viajes')
            .insert({
                chofer_id: user.id,
                chofer_nombre: choferNombre,
                vehiculo: vehiculo || null,
                sucursal_id: selectedBranch,
                estado: 'EN_RUTA'
            })
            .select()
            .single()

        if (vErr) throw vErr

        // Actualizar ventas seleccionadas con firma_chofer_salida
        const ids = Array.from(selected)
        const { error: uErr } = await supabase
            .from('ventas')
            .update({
                estado_entrega: 'EN_RUTA',
                viaje_id: viaje.id,
                firma_chofer_salida: firmaChoferBase64
            })
            .in('id', ids)

        if (uErr) throw uErr

        toast.success(`🚚 ${ids.length} entrega(s) despachadas — Viaje creado`)
        setSelected(new Set())
        setChoferNombre('')
        setVehiculo('')
        refetchVentas()
    }

    const pendientes = ventas.filter(v => v.estado_entrega === 'PENDIENTE')
    const filtered = ventas.filter(v => {
        if (!searchTerm) return true
        const s = searchTerm.toLowerCase()
        return v.cliente?.nombre?.toLowerCase().includes(s) ||
            v.direccion_entrega?.toLowerCase().includes(s)
    })

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Truck className="text-blue-600" />
                        Panel de Entregas a Domicilio
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Gestiona y despacha pedidos para entrega</p>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por cliente o dirección..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2">
                    {['pendientes', 'en_ruta', 'todas'].map(mode => (
                        <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${viewMode === mode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {mode === 'pendientes' ? '📦 Pendientes' : mode === 'en_ruta' ? '🚚 En Ruta' : '📋 Todas'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Assignment Panel (only show when pendientes) */}
            {viewMode === 'pendientes' && selected.size > 0 && (
                <div className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
                    <h3 className="font-black text-blue-800 mb-3 flex items-center gap-2">
                        <Truck size={20} /> Asignar {selected.size} entrega(s) a un viaje
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="text-xs font-bold text-blue-700 uppercase tracking-wider">Chofer *</label>
                            <div className="relative mt-1">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Nombre del chofer"
                                    className="w-full pl-9 pr-4 py-2.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={choferNombre}
                                    onChange={e => setChoferNombre(e.target.value)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-blue-700 uppercase tracking-wider">Vehículo</label>
                            <input
                                type="text"
                                placeholder="Ej: Camioneta Blanca Ford"
                                className="w-full px-4 py-2.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none mt-1"
                                value={vehiculo}
                                onChange={e => setVehiculo(e.target.value)}
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={handleDespacharClick}
                                disabled={!choferNombre.trim() || selected.size === 0}
                                className="w-full bg-blue-600 text-white py-2.5 rounded-xl font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                            >
                                <FileText size={18} />
                                Despachar Viaje
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Sales List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {viewMode === 'pendientes' && pendientes.length > 0 && (
                    <div className="p-3 border-b border-gray-100 bg-gray-50">
                        <button
                            onClick={toggleAll}
                            className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-blue-600 transition"
                        >
                            {selected.size === pendientes.length
                                ? <CheckSquare size={18} className="text-blue-600" />
                                : <Square size={18} />
                            }
                            {selected.size === pendientes.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="p-12 text-center text-gray-400">Cargando entregas...</div>
                ) : filtered.length === 0 ? (
                    <div className="p-12 text-center text-gray-400">
                        <Package size={48} className="mx-auto mb-3 opacity-20" />
                        <p className="font-bold text-sm">No hay entregas {viewMode === 'pendientes' ? 'pendientes' : ''}</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filtered.map(v => {
                            const estado = ESTADO_BADGE[v.estado_entrega] || ESTADO_BADGE.PENDIENTE
                            const isPendiente = v.estado_entrega === 'PENDIENTE'
                            const isSelected = selected.has(v.id)
                            const isPagado = v.metodo_pago === 'contado' || v.metodo_pago === 'tarjeta'
                            const isCredito = v.metodo_pago === 'credito'

                            return (
                                <div
                                    key={v.id}
                                    className={`p-4 flex gap-4 items-start hover:bg-gray-50 transition ${isSelected ? 'bg-blue-50' : ''}`}
                                >
                                    {isPendiente && (
                                        <button
                                            onClick={() => toggleSelect(v.id)}
                                            className="mt-1 flex-shrink-0"
                                        >
                                            {isSelected
                                                ? <CheckSquare size={22} className="text-blue-600" />
                                                : <Square size={22} className="text-gray-300" />
                                            }
                                        </button>
                                    )}

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="font-black text-slate-800">#{v.id?.slice(0, 8)}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${estado.bg} ${estado.text}`}>
                                                {estado.label}
                                            </span>
                                            {/* Payment Badge */}
                                            {isPagado && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-800">🟢 YA PAGADO</span>
                                            )}
                                            {isCredito && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">🔵 CARGO A CRÉDITO</span>
                                            )}
                                            {!isPagado && !isCredito && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-800 animate-pulse">
                                                    🔴 COBRAR ${v.total?.toLocaleString('es-MX')}
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-sm font-bold text-gray-700">{v.cliente?.nombre || 'Sin cliente'}</p>

                                        {v.direccion_entrega && (
                                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                                <MapPin size={12} /> {v.direccion_entrega}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {new Date(v.created_at).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="font-bold text-gray-700">
                                                ${v.total?.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
            {/* Route Dispatch Modal con Firma y Ticket */}
            <RouteDispatchModal
                isOpen={showDispatchModal}
                onClose={() => setShowDispatchModal(false)}
                onConfirm={handleConfirmDispatch}
                choferNombre={choferNombre}
                vehiculo={vehiculo}
                ventasIds={Array.from(selected)}
                ventasObject={ventas.reduce((acc, obj) => ({ ...acc, [obj.id]: obj }), {})}
            />
        </div>
    )
}
