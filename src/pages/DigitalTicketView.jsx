// DigitalTicketView.jsx — Vista pública Mobile-First del ticket digital
// Accesible sin login para que el chofer lo vea desde su celular
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import {
    ArrowRightLeft, Truck, PackageCheck, Clock,
    XCircle, Share2, MessageCircle
} from 'lucide-react'

const ESTADO_CONFIG = {
    SOLICITADO: { bg: 'bg-amber-100', text: 'text-amber-800', icon: '🕐', label: 'Solicitado', border: 'border-amber-200' },
    EN_TRANSITO: { bg: 'bg-blue-100', text: 'text-blue-800', icon: '🚚', label: 'En Tránsito', border: 'border-blue-200' },
    RECIBIDO: { bg: 'bg-green-100', text: 'text-green-800', icon: '✅', label: 'Recibido', border: 'border-green-200' },
    CANCELADO: { bg: 'bg-red-100', text: 'text-red-800', icon: '❌', label: 'Cancelado', border: 'border-red-200' },
}

export default function DigitalTicketView() {
    const { id } = useParams()
    const [transfer, setTransfer] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchTransfer = async () => {
            setLoading(true)
            const { data, error: err } = await supabase
                .from('traslados')
                .select(`
                    *,
                    items:traslado_items(
                        id, cantidad,
                        producto:productos(id, nombre, sku)
                    ),
                    origen:sucursales!traslados_origen_id_fkey(id, nombre),
                    destino:sucursales!traslados_destino_id_fkey(id, nombre)
                `)
                .eq('id', id)
                .single()

            if (err) {
                setError('Traslado no encontrado o enlace inválido')
                console.error(err)
            } else {
                setTransfer(data)
            }
            setLoading(false)
        }

        if (id) fetchTransfer()
    }, [id])

    const shareWhatsApp = () => {
        if (!transfer) return
        const folio = String(transfer.folio).padStart(4, '0')
        const origen = transfer.origen?.nombre || '—'
        const destino = transfer.destino?.nombre || '—'
        const estado = ESTADO_CONFIG[transfer.estado]?.label || transfer.estado
        const itemsList = transfer.items?.map(i =>
            `  • ${i.producto?.nombre} x${i.cantidad}`
        ).join('\n') || ''
        const url = window.location.href

        const text = `📦 *TRASLADO #${folio}*\n` +
            `Estado: ${estado}\n` +
            `De: ${origen}\n` +
            `A: ${destino}\n\n` +
            `Artículos:\n${itemsList}\n\n` +
            `🔗 Ver ticket: ${url}`

        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
    }

    // ─── Loading ──────────────────────────────────
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

    // ─── Error ────────────────────────────────────
    if (error || !transfer) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-sm w-full">
                    <XCircle size={48} className="text-red-400 mx-auto mb-4" />
                    <h2 className="font-bold text-lg text-slate-800 mb-2">Ticket no encontrado</h2>
                    <p className="text-sm text-slate-500">{error || 'El enlace puede haber expirado o ser incorrecto.'}</p>
                </div>
            </div>
        )
    }

    const estado = ESTADO_CONFIG[transfer.estado] || ESTADO_CONFIG.SOLICITADO
    const folio = String(transfer.folio).padStart(4, '0')
    const totalUnidades = transfer.items?.reduce((s, i) => s + i.cantidad, 0) || 0

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 flex flex-col items-center p-4 py-8">
            {/* Ticket Card */}
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 text-center">
                    <div className="flex items-center justify-center gap-2 mb-1">
                        <ArrowRightLeft size={18} className="text-blue-400" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Comprobante de Traslado Digital</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight mt-1">#{folio}</h1>
                </div>

                {/* Estado Badge */}
                <div className="flex justify-center -mt-4">
                    <span className={`px-5 py-2 rounded-full text-sm font-black ${estado.bg} ${estado.text} ${estado.border} border-2 shadow-sm`}>
                        {estado.icon} {estado.label}
                    </span>
                </div>

                {/* Info */}
                <div className="px-6 pt-5 space-y-3">
                    <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Fecha</span>
                        <span className="font-bold text-slate-800">
                            {new Date(transfer.created_at).toLocaleDateString('es-MX', {
                                day: 'numeric', month: 'short', year: 'numeric'
                            })}
                        </span>
                    </div>
                    {transfer.despachado_at && (
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Despachado</span>
                            <span className="font-bold text-slate-800">
                                {new Date(transfer.despachado_at).toLocaleString('es-MX', {
                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                })}
                            </span>
                        </div>
                    )}
                    {transfer.recibido_at && (
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Recibido</span>
                            <span className="font-bold text-green-700">
                                {new Date(transfer.recibido_at).toLocaleString('es-MX', {
                                    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                })}
                            </span>
                        </div>
                    )}
                </div>

                {/* Ruta */}
                <div className="px-6 pt-5">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-red-400 ring-2 ring-red-100"></div>
                                <div className="w-0.5 h-6 bg-slate-200"></div>
                                <div className="w-3 h-3 rounded-full bg-green-400 ring-2 ring-green-100"></div>
                            </div>
                            <div className="flex-1 space-y-3">
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Origen</p>
                                    <p className="font-bold text-slate-800">{transfer.origen?.nombre || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Destino</p>
                                    <p className="font-bold text-slate-800">{transfer.destino?.nombre || '—'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="px-6 pt-5">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Artículos</h3>
                    <div className="divide-y divide-slate-100">
                        {transfer.items?.map((item, i) => (
                            <div key={i} className="flex justify-between items-center py-2.5">
                                <div>
                                    <p className="font-semibold text-slate-800 text-sm">{item.producto?.nombre}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">{item.producto?.sku}</p>
                                </div>
                                <span className="font-black text-lg text-slate-900 bg-slate-50 px-3 py-1 rounded-lg">
                                    {item.cantidad}
                                </span>
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center pt-3 mt-2 border-t border-slate-200">
                        <span className="text-sm text-slate-500 font-medium">Total</span>
                        <span className="font-black text-xl text-blue-700">{totalUnidades} uds</span>
                    </div>
                </div>

                {/* Notas */}
                {transfer.notas && (
                    <div className="px-6 pt-4">
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                            <p className="text-xs text-amber-800">📝 {transfer.notas}</p>
                        </div>
                    </div>
                )}

                {/* Firmas */}
                <div className="px-6 pt-5 space-y-4">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Firmas Digitales</h3>

                    {transfer.firma_despacho ? (
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">
                                ✍️ Firma de Despacho
                            </p>
                            <img
                                src={transfer.firma_despacho}
                                alt="Firma de despacho"
                                className="max-w-full h-20 object-contain mx-auto border-b-2 border-slate-300"
                            />
                            <p className="text-[10px] text-slate-400 text-center mt-1">
                                {transfer.despachado_at ? new Date(transfer.despachado_at).toLocaleString('es-MX') : ''}
                            </p>
                        </div>
                    ) : (
                        <div className="bg-slate-50 rounded-xl p-4 border border-dashed border-slate-200 text-center">
                            <p className="text-xs text-slate-400">Firma de despacho pendiente</p>
                        </div>
                    )}

                    {transfer.firma_recepcion ? (
                        <div className="bg-green-50 rounded-xl p-3 border border-green-100">
                            <p className="text-[10px] text-green-700 uppercase font-bold tracking-wider mb-2">
                                ✍️ Firma de Recepción
                            </p>
                            <img
                                src={transfer.firma_recepcion}
                                alt="Firma de recepción"
                                className="max-w-full h-20 object-contain mx-auto border-b-2 border-green-300"
                            />
                            <p className="text-[10px] text-slate-400 text-center mt-1">
                                {transfer.recibido_at ? new Date(transfer.recibido_at).toLocaleString('es-MX') : ''}
                            </p>
                        </div>
                    ) : transfer.estado === 'EN_TRANSITO' ? (
                        <div className="bg-slate-50 rounded-xl p-4 border border-dashed border-slate-200 text-center">
                            <Clock size={16} className="mx-auto mb-1 text-slate-300" />
                            <p className="text-xs text-slate-400">Esperando firma de recepción...</p>
                        </div>
                    ) : null}
                </div>

                {/* Footer */}
                <div className="px-6 py-5 mt-4 bg-slate-50 border-t border-slate-100 text-center">
                    <p className="text-[10px] text-slate-400">Este comprobante digital tiene validez operativa</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Ferretería — Sistema de Control de Mercancía</p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full max-w-md mt-4 flex gap-3">
                <button
                    onClick={shareWhatsApp}
                    className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition shadow-lg"
                >
                    <MessageCircle size={18} />
                    Compartir
                </button>
                <button
                    onClick={() => {
                        if (navigator.share) {
                            navigator.share({
                                title: `Traslado #${folio}`,
                                text: `Comprobante de traslado #${folio}`,
                                url: window.location.href
                            })
                        } else {
                            navigator.clipboard.writeText(window.location.href)
                            alert('Enlace copiado al portapapeles')
                        }
                    }}
                    className="flex-1 bg-white text-slate-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-50 transition shadow-lg border border-slate-200"
                >
                    <Share2 size={18} />
                    Copiar Link
                </button>
            </div>
        </div>
    )
}
