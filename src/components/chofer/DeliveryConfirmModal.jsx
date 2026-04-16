import React, { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { supabase } from '../../supabaseClient'
import { X, Check, RotateCcw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function DeliveryConfirmModal({ order, onClose }) {
    const sigCanvas = useRef({})
    const [saving, setSaving] = useState(false)

    const clearSignature = () => {
        sigCanvas.current.clear()
    }

    const handleConfirmDelivery = async () => {
        if (sigCanvas.current.isEmpty()) {
            toast.error('La firma del cliente es obligatoria para entregar la mercancía.')
            return
        }

        setSaving(true)
        try {
            // Generar imagen Base64
            const signatureDataUrl = sigCanvas.current.getCanvas().toDataURL('image/png')

            // Actualizar Venta B2B en Supabase
            const { error } = await supabase
                .from('ventas')
                .update({
                    estado_entrega: 'ENTREGADO',
                    firma_cliente_recibido: signatureDataUrl,
                    entregado_at: new Date().toISOString()
                })
                .eq('id', order.id)

            if (error) throw error

            toast.success('¡Entrega finalizada con éxito! La prueba de entrega quedó registrada.')
            onClose()
        } catch (error) {
            console.error('Error saving signature:', error)
            toast.error('Hubo un error al guardar la firma.')
            setSaving(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-slate-100 animate-in slide-in-from-bottom-full duration-300">
            {/* Header Modal - Mobile First */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-md">
                <h2 className="font-black text-lg">Firma de Recibido</h2>
                <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 font-medium text-slate-600 text-sm">
                    <p className="mb-2"><span className="font-black text-slate-800">Carga:</span> TKT-{String(order.id).padStart(5, '0')}</p>
                    <p><span className="font-black text-slate-800">Recibe:</span> {order.nombre_receptor}</p>
                </div>

                <div className="flex-1 bg-white border-2 border-dashed border-indigo-200 rounded-3xl overflow-hidden relative shadow-inner mb-6 flex flex-col">
                    <div className="absolute top-4 left-0 w-full text-center text-slate-300 font-bold uppercase tracking-widest pointer-events-none select-none z-0 text-sm">
                        Firmar aquí
                    </div>

                    <SignatureCanvas
                        ref={sigCanvas}
                        canvasProps={{ className: 'w-full h-full min-h-[300px] z-10 cursor-crosshair' }}
                        backgroundColor="transparent"
                        penColor="#1e1b4b" // Slate 900
                    />
                </div>

                {/* Actions Bottom Bar */}
                <div className="grid grid-cols-3 gap-3">
                    <button
                        onClick={clearSignature}
                        disabled={saving}
                        className="col-span-1 py-4 bg-rose-50 text-rose-600 font-black rounded-2xl flex flex-col items-center justify-center gap-1 active:bg-rose-100 transition-colors disabled:opacity-50"
                    >
                        <RotateCcw size={20} />
                        <span className="text-[10px] uppercase tracking-wider">Borrar</span>
                    </button>

                    <button
                        onClick={handleConfirmDelivery}
                        disabled={saving}
                        className="col-span-2 py-4 bg-emerald-500 text-white font-black rounded-2xl flex items-center justify-center gap-2 active:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition-all disabled:opacity-50"
                    >
                        {saving ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                <Check size={24} />
                                CONFIRMAR ENTREGA
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
