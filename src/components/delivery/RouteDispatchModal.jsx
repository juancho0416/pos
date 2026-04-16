// RouteDispatchModal.jsx — Modal for driver signature and ticket printing
import { useState, useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { PenTool, X, RotateCcw, Send, FileText } from 'lucide-react'
import RoutePrintTicket from './RoutePrintTicket'
import { toast } from 'sonner'
import { useReactToPrint } from 'react-to-print'

export default function RouteDispatchModal({
    isOpen,
    onClose,
    onConfirm,
    choferNombre,
    vehiculo,
    ventasIds,
    ventasObject
}) {
    const sigRef = useRef(null)
    const printRef = useRef(null)
    const [hasSigned, setHasSigned] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [firmaChofer, setFirmaChofer] = useState(null)

    const totalCobrar = ventasIds.map(id => ventasObject[id]).reduce((sum, v) => {
        if (v.metodo_pago !== 'contado' && v.metodo_pago !== 'tarjeta' && v.metodo_pago !== 'credito') {
            return sum + (v.total || 0)
        }
        return sum
    }, 0)

    const clearSig = () => {
        sigRef.current?.clear()
        setHasSigned(false)
        setFirmaChofer(null)
    }

    const handlePrintTicket = useReactToPrint({
        contentRef: printRef,
        onAfterPrint: () => {
            onClose() // Cerrar modal después de imprimir
        }
    })

    const handleSubmit = async () => {
        if (!hasSigned || sigRef.current?.isEmpty()) {
            return toast.error('Se requiere la firma del chofer para aceptar la carga')
        }

        setProcessing(true)
        try {
            const base64Firma = sigRef.current.toDataURL('image/png')
            setFirmaChofer(base64Firma)

            // Pass the base64 signature back to the parent to save in Supabase
            await onConfirm(base64Firma)

            // Desencadenar la impresión térmica del nuevo ticket (el componente usará la firma del state)
            setTimeout(() => {
                handlePrintTicket()
            }, 100) // Pequeño timeout para que React renderice la firma en el recibo oculto

        } catch (error) {
            console.error('Error Supabase al despachar:', error)
            toast.error('Error al despachar: ' + error.message)
        } finally {
            setProcessing(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-slate-900/70 z-[120] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-xl text-white">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="font-black text-lg text-slate-800">Hoja de Ruta</h2>
                            <p className="text-xs text-slate-500">Chofer: {choferNombre}</p>
                        </div>
                    </div>
                    <button onClick={onClose} disabled={processing} className="text-slate-400 hover:text-slate-600 p-1">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    {/* Resumen */}
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 space-y-2">
                        <div className="flex justify-between text-sm">
                            <span className="text-blue-700 font-medium">Entregas Asignadas</span>
                            <span className="font-black text-blue-900">{ventasIds.length}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-amber-700 font-medium whitespace-nowrap">Cobranza Estimada (Efectivo)</span>
                            <span className="font-black text-amber-700">${totalCobrar.toLocaleString('es-MX')}</span>
                        </div>
                    </div>

                    {/* Firma */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                <PenTool size={14} /> Firma de Chofer (Salida)
                            </h3>
                            <button onClick={clearSig} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium">
                                <RotateCcw size={12} /> Limpiar
                            </button>
                        </div>
                        <div className="border-2 border-dashed border-blue-200 rounded-xl overflow-hidden bg-white hover:border-blue-400 transition">
                            <SignatureCanvas
                                ref={sigRef}
                                penColor="#1e3a8a" // Tailwind blue-900
                                canvasProps={{
                                    className: 'w-full',
                                    style: { width: '100%', height: '140px' }
                                }}
                                onEnd={() => setHasSigned(true)}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 text-center italic">
                            Firma de conformidad al recibir la mercancía en almacén
                        </p>
                    </div>
                </div>

                {/* Submit */}
                <div className="p-5 bg-slate-50 border-t border-slate-100">
                    <button
                        onClick={handleSubmit}
                        disabled={processing || !hasSigned}
                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-black text-lg shadow-lg shadow-blue-500/30 hover:from-blue-500 hover:to-indigo-500 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {processing ? <RotateCcw className="animate-spin" /> : <Send size={20} />}
                        {processing ? 'Despachando...' : 'FIRMAR Y DESPACHAR'}
                    </button>
                    <p className="text-center text-[10px] text-slate-400 mt-3 flex items-center justify-center gap-1">
                        <FileText size={12} /> Imprimirá Hoja de Ruta automática
                    </p>
                </div>

                {/* Componente Oculto para Impresión */}
                <RoutePrintTicket
                    ref={printRef}
                    choferNombre={choferNombre}
                    vehiculo={vehiculo}
                    ventasIds={ventasIds}
                    ventasObject={ventasObject}
                    firmaChofer={firmaChofer}
                />
            </div>
        </div>
    )
}
