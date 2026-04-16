// DeliveryTicketView.jsx — Vista pública del ticket de entrega (Mobile First)
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Package, MapPin, Clock, CheckCircle, XCircle, MessageCircle, Share2 } from 'lucide-react'

const ESTADO_CONFIG = {
    PENDIENTE: { bg: 'bg-amber-100', text: 'text-amber-800', icon: '📦', label: 'Pendiente' },
    EN_RUTA: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '🚚', label: 'En Ruta' },
    ENTREGADO: { bg: 'bg-green-100', text: 'text-green-800', icon: '✅', label: 'Entregado' },
    CANCELADO: { bg: 'bg-red-100', text: 'text-red-800', icon: '❌', label: 'Cancelado' },
}

export default function DeliveryTicketView() {
    const { id } = useParams()
    const [venta, setVenta] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchDelivery = async () => {
            setLoading(true)
            const { data, error: err } = await supabase
                .from('ventas')
                .select(`
                    *,
                    cliente:clientes(id, nombre, telefono),
                    detalles:venta_detalles(id, cantidad, precio_unitario, productos(nombre)),
                    sucursal:sucursales(nombre)
                `)
                .eq('id', id)
                .single()

            if (err) {
                setError('Comprobante no encontrado')
                console.error(err)
            } else {
                setVenta(data)
            }
            setLoading(false)
        }
        if (id) fetchDelivery()
    }, [id])

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                    <p className="text-sm text-slate-500 font-medium">Cargando comprobante...</p>
                </div>
            </div>
        )
    }

    if (error || !venta) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
                    <XCircle size={48} className="text-red-400 mx-auto mb-4" />
                    <h2 className="font-bold text-lg text-slate-800 mb-2">No encontrado</h2>
                    <p className="text-sm text-slate-500">{error}</p>
                </div>
            </div>
        )
    }

    const estado = ESTADO_CONFIG[venta.estado_entrega] || ESTADO_CONFIG.PENDIENTE

    const shareWhatsApp = () => {
        const msg = `📦 Comprobante de Entrega\n` +
            `Cliente: ${venta.cliente?.nombre || '—'}\n` +
            `Total: $${venta.total?.toLocaleString('es-MX')}\n` +
            `Estado: ${estado.label}\n` +
            `🔗 ${window.location.href}`
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex flex-col items-center p-4 py-8">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <Package size={18} className="text-green-400" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Comprobante de Entrega</span>
                    </div>
                    <h1 className="text-2xl font-black text-white mt-1">{venta.cliente?.nombre || 'Cliente'}</h1>
                </div>

                {/* Estado Badge */}
                <div className="flex justify-center -mt-4">
                    <span className={`px-5 py-2 rounded-full text-sm font-black ${estado.bg} ${estado.text} border-2 border-white shadow-sm`}>
                        {estado.icon} {estado.label}
                    </span>
                </div>

                {/* Info */}
                <div className="px-6 pt-5 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Total</span>
                        <span className="font-black text-xl text-slate-900">${venta.total?.toLocaleString('es-MX')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Método de Pago</span>
                        <span className="font-bold text-slate-700 uppercase">{venta.metodo_pago}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Sucursal</span>
                        <span className="font-bold text-slate-700">{venta.sucursal?.nombre || '—'}</span>
                    </div>
                    {venta.created_at && (
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Fecha de venta</span>
                            <span className="font-bold text-slate-700">
                                {new Date(venta.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                        </div>
                    )}
                    {venta.entregado_at && (
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Entregado</span>
                            <span className="font-bold text-green-700">
                                {new Date(venta.entregado_at).toLocaleString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    )}
                </div>

                {/* Dirección */}
                {venta.direccion_entrega && (
                    <div className="px-6 pt-4">
                        <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 flex items-start gap-2">
                            <MapPin size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-blue-800 font-medium">{venta.direccion_entrega}</p>
                        </div>
                    </div>
                )}

                {/* Items */}
                <div className="px-6 pt-5">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Artículos</h3>
                    <div className="divide-y divide-slate-100">
                        {venta.detalles?.map((d, i) => (
                            <div key={i} className="flex justify-between items-center py-2.5">
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">{d.productos?.nombre}</p>
                                    <p className="text-[10px] text-slate-400">{d.cantidad} x ${d.precio_unitario?.toLocaleString('es-MX')}</p>
                                </div>
                                <span className="font-black text-slate-900">
                                    ${(d.cantidad * d.precio_unitario)?.toLocaleString('es-MX')}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Firmas */}
                {(venta.firma_chofer_salida || venta.firma_cliente_recibido) && (
                    <div className="px-6 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {venta.firma_chofer_salida && (
                            <div className="bg-blue-50 rounded-xl p-3 border border-blue-100 flex flex-col justify-between">
                                <p className="text-[10px] text-blue-700 uppercase font-bold tracking-wider mb-2 text-center">
                                    🚚 Firma de Chofer (Salida)
                                </p>
                                <img
                                    src={venta.firma_chofer_salida}
                                    alt="Firma del chofer"
                                    className="max-w-full h-16 object-contain mx-auto border-b-2 border-blue-300"
                                />
                            </div>
                        )}

                        {venta.firma_cliente_recibido && (
                            <div className="bg-green-50 rounded-xl p-3 border border-green-100 flex flex-col justify-between">
                                <p className="text-[10px] text-green-700 uppercase font-bold tracking-wider mb-2 text-center">
                                    ✍️ Firma del Cliente (Recibido)
                                </p>
                                <img
                                    src={venta.firma_cliente_recibido}
                                    alt="Firma del cliente"
                                    className="max-w-full h-16 object-contain mx-auto border-b-2 border-green-300"
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="px-6 py-5 mt-4 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400">Comprobante digital de entrega — Ferretería</p>
                </div>
            </div>

            {/* Share Buttons */}
            <div className="w-full max-w-md mt-4 flex gap-3">
                <button
                    onClick={shareWhatsApp}
                    className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition shadow-lg"
                >
                    <MessageCircle size={18} /> Compartir
                </button>
                <button
                    onClick={() => {
                        if (navigator.share) {
                            navigator.share({ title: 'Comprobante de Entrega', url: window.location.href })
                        } else {
                            navigator.clipboard.writeText(window.location.href)
                            alert('Enlace copiado')
                        }
                    }}
                    className="flex-1 bg-white text-slate-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition shadow-lg border border-slate-200"
                >
                    <Share2 size={18} /> Copiar Link
                </button>
            </div>
        </div>
    )
}
