// DeliveryConfirmModal.jsx — Modal de confirmación de entrega con firma digital
import { useState, useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { supabase } from '../../supabaseClient'
import { toast } from 'sonner'
import { PackageCheck, PenTool, X, RotateCcw, CheckCircle, ToggleLeft, ToggleRight } from 'lucide-react'

export default function DeliveryConfirmModal({ venta, onClose, onSuccess }) {
    const sigRef = useRef(null)
    const [processing, setProcessing] = useState(false)
    const [hasSigned, setHasSigned] = useState(false)
    const [pagoRecibido, setPagoRecibido] = useState(false)

    const isPagado = venta.metodo_pago === 'contado' || venta.metodo_pago === 'tarjeta'
    const isCredito = venta.metodo_pago === 'credito'
    const requiereCobro = !isPagado && !isCredito

    const clearSig = () => {
        sigRef.current?.clear()
        setHasSigned(false)
    }

    const handleConfirm = async () => {
        if (!hasSigned || sigRef.current?.isEmpty()) {
            toast.error('Se requiere la firma del cliente')
            return
        }
        if (requiereCobro && !pagoRecibido) {
            toast.error('Marca que recibiste el pago antes de confirmar')
            return
        }

        setProcessing(true)
        try {
            const firmaBase64 = sigRef.current.toDataURL('image/png')

            const { error } = await supabase
                .from('ventas')
                .update({
                    estado_entrega: 'ENTREGADO',
                    firma_cliente_recibido: firmaBase64,
                    cobro_confirmado: requiereCobro ? pagoRecibido : true,
                    entregado_at: new Date().toISOString()
                })
                .eq('id', venta.id)

            if (error) throw error

            // Auto-WhatsApp al cliente
            try {
                const telefono = venta.cliente?.telefono || venta.telefono_entrega
                if (telefono) {
                    const ticketUrl = `${window.location.origin}/entregas/ticket/${venta.id}`
                    const msg = `✅ ¡Hola ${venta.cliente?.nombre || ''}! Tu pedido ha sido entregado.\n\n` +
                        `📦 Total: $${venta.total?.toLocaleString('es-MX')}\n` +
                        `🔗 Comprobante firmado: ${ticketUrl}\n\n` +
                        `¡Gracias por tu compra! — Ferretería`
                    window.open(`https://wa.me/52${telefono.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
                }
            } catch { /* WhatsApp no es crítico */ }

            toast.success('✅ Entrega confirmada')
            onSuccess?.()
            onClose()
        } catch (err) {
            toast.error('Error: ' + err.message)
        } finally {
            setProcessing(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-slate-900/70 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-600 p-2 rounded-xl text-white">
                            <PackageCheck size={20} />
                        </div>
                        <div>
                            <h2 className="font-black text-lg text-slate-800">Confirmar Entrega</h2>
                            <p className="text-xs text-slate-500">{venta.cliente?.nombre}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                        <X size={20} />
                    </button>
                </div>

                {/* Resumen */}
                <div className="px-5 pt-4">
                    <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Total</span>
                            <span className="font-black text-slate-900 text-lg">${venta.total?.toLocaleString('es-MX')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Método</span>
                            <span className="font-bold text-slate-700 uppercase">{venta.metodo_pago}</span>
                        </div>
                    </div>
                </div>

                {/* Cobro Switch */}
                {requiereCobro && (
                    <div className="px-5 pt-4">
                        <button
                            onClick={() => setPagoRecibido(!pagoRecibido)}
                            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition ${pagoRecibido
                                ? 'border-green-400 bg-green-50'
                                : 'border-red-300 bg-red-50'
                                }`}
                        >
                            <div className="text-left">
                                <p className={`font-black text-sm ${pagoRecibido ? 'text-green-800' : 'text-red-800'}`}>
                                    {pagoRecibido ? '✅ Pago Recibido' : '🔴 Pago Pendiente'}
                                </p>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                    {pagoRecibido ? 'El cobro fue confirmado' : `Debes cobrar $${venta.total?.toLocaleString('es-MX')} al cliente`}
                                </p>
                            </div>
                            {pagoRecibido
                                ? <ToggleRight size={32} className="text-green-600" />
                                : <ToggleLeft size={32} className="text-red-400" />
                            }
                        </button>
                    </div>
                )}

                {/* Firma */}
                <div className="px-5 pt-5">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <PenTool size={14} /> Firma del Cliente de Conformidad
                        </h3>
                        <button onClick={clearSig} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium">
                            <RotateCcw size={12} /> Limpiar
                        </button>
                    </div>
                    <div className="border-2 border-dashed border-green-200 rounded-xl overflow-hidden bg-white hover:border-green-400 transition">
                        <SignatureCanvas
                            ref={sigRef}
                            penColor="#166534"
                            canvasProps={{
                                className: 'w-full',
                                style: { width: '100%', height: '140px' }
                            }}
                            onEnd={() => setHasSigned(true)}
                        />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 text-center italic">
                        El cliente firma aquí como comprobante de recepción
                    </p>
                </div>

                {/* Submit */}
                <div className="p-5">
                    <button
                        onClick={handleConfirm}
                        disabled={processing || !hasSigned || (requiereCobro && !pagoRecibido)}
                        className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                    >
                        <CheckCircle size={20} />
                        {processing ? 'Procesando...' : 'Confirmar Entrega'}
                    </button>
                </div>
            </div>
        </div>
    )
}
