// DigitalReceiveModal.jsx — Modal de recepción con firma digital
import { useState, useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { supabase } from '../../supabaseClient'
import { toast } from 'sonner'
import { PackageCheck, PenTool, X, RotateCcw, CheckCircle, Image } from 'lucide-react'

export default function DigitalReceiveModal({ transfer, branches, userId, onClose, onSuccess }) {
    const sigRef = useRef(null)
    const [processing, setProcessing] = useState(false)
    const [completed, setCompleted] = useState(false)
    const [hasSigned, setHasSigned] = useState(false)

    const origen = branches.find(b => b.id === transfer.origen_id)?.nombre || '—'
    const destino = branches.find(b => b.id === transfer.destino_id)?.nombre || '—'
    const folio = String(transfer.folio).padStart(4, '0')

    const clearSig = () => {
        sigRef.current?.clear()
        setHasSigned(false)
    }

    const handleConfirm = async () => {
        if (!hasSigned || sigRef.current?.isEmpty()) {
            toast.error('Se requiere la firma digital para confirmar recepción')
            return
        }

        setProcessing(true)
        try {
            const firmaBase64 = sigRef.current.toDataURL('image/png')

            const { error } = await supabase.rpc('recibir_traslado', {
                _traslado_id: transfer.id,
                _usuario_id: userId,
                _firma: firmaBase64
            })

            if (error) throw error

            setCompleted(true)
            toast.success(`Traslado #${folio} recibido — Stock actualizado`)
            onSuccess?.()
        } catch (err) {
            toast.error('Error al recibir: ' + err.message)
        } finally {
            setProcessing(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-slate-900/70 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="bg-green-600 p-2 rounded-xl text-white">
                            <PackageCheck size={20} />
                        </div>
                        <div>
                            <h2 className="font-black text-lg text-slate-800">Confirmar Recepción</h2>
                            <p className="text-xs text-slate-500">Traslado #{folio}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                        <X size={20} />
                    </button>
                </div>

                {!completed ? (
                    <>
                        {/* Ruta */}
                        <div className="px-5 pt-4 flex items-center gap-3 text-sm">
                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg font-bold text-xs">ORIGEN</span>
                            <span className="font-bold text-slate-700">{origen}</span>
                            <span className="text-slate-300">→</span>
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg font-bold text-xs">DESTINO</span>
                            <span className="font-bold text-slate-700">{destino}</span>
                        </div>

                        {/* Items */}
                        <div className="px-5 pt-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Artículos a recibir</h3>
                            <div className="bg-gray-50 rounded-xl p-3 space-y-1 max-h-32 overflow-y-auto">
                                {transfer.items?.map((item, i) => (
                                    <div key={i} className="flex justify-between items-center text-sm py-1">
                                        <span className="text-slate-700 font-medium">{item.producto?.nombre}</span>
                                        <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded">{item.cantidad}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Firma de despacho original */}
                        {transfer.firma_despacho && (
                            <div className="px-5 pt-4">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 mb-2">
                                    <Image size={14} /> Firma de despacho (original)
                                </h3>
                                <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2">
                                    <img
                                        src={transfer.firma_despacho}
                                        alt="Firma de despacho"
                                        className="w-full h-24 object-contain rounded"
                                    />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">
                                    Firmado el {transfer.despachado_at ? new Date(transfer.despachado_at).toLocaleString('es-MX') : '—'}
                                </p>
                            </div>
                        )}

                        {/* Firma de recepción */}
                        <div className="px-5 pt-5">
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <PenTool size={14} /> Firma de quien recibe
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
                                        style: { width: '100%', height: '150px' }
                                    }}
                                    onEnd={() => setHasSigned(true)}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 text-center italic">
                                Firma aquí para confirmar que la mercancía llegó completa
                            </p>
                        </div>

                        {/* Submit */}
                        <div className="p-5">
                            <button
                                onClick={handleConfirm}
                                disabled={processing || !hasSigned}
                                className="w-full py-3.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-green-200"
                            >
                                <PackageCheck size={20} />
                                {processing ? 'Procesando recepción...' : 'Confirmar Recepción y Firmar'}
                            </button>
                        </div>
                    </>
                ) : (
                    /* ═══ POST-RECEPCIÓN ═══ */
                    <div className="p-8 flex flex-col items-center text-center">
                        <div className="bg-green-100 p-3 rounded-full mb-4">
                            <CheckCircle size={32} className="text-green-600" />
                        </div>
                        <h3 className="font-black text-xl text-slate-800 mb-1">¡Recepción Confirmada!</h3>
                        <p className="text-sm text-slate-500 mb-2">Traslado #{folio}</p>
                        <p className="text-xs text-green-600 font-bold bg-green-50 px-3 py-1 rounded-full">
                            ✅ Stock actualizado en {destino}
                        </p>

                        <button
                            onClick={onClose}
                            className="mt-8 px-8 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition"
                        >
                            Cerrar
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
