import { FileText } from 'lucide-react'

export default function QuoteSuccessModal({ showQuoteSuccessModal, setShowQuoteSuccessModal }) {
    if (!showQuoteSuccessModal) return null

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 backdrop-blur-xl bg-slate-900/80">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-[90%] max-w-sm overflow-hidden animate-in zoom-in duration-300 text-center p-10 ring-4 ring-black/5">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <FileText size={40} />
                </div>
                <h2 className="text-2xl font-black text-slate-800 mb-2 tracking-tight">¡Cotización Creada!</h2>
                <p className="text-slate-500 font-medium text-sm mb-8 leading-relaxed">
                    La cotización se ha guardado en el sistema y se ha descargado el PDF en tu navegador.
                </p>
                <button
                    onClick={() => setShowQuoteSuccessModal(false)}
                    className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg hover:bg-blue-700 active:scale-95 transition-all outline-none"
                >
                    Confirmar y Seguir
                </button>
            </div>
        </div>
    )
}
