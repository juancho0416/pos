import { FileText, RotateCcw, User } from 'lucide-react'

export default function QuoteModal({
    showQuoteModal,
    setShowQuoteModal,
    calculateTotal,
    quoteCustomer,
    setQuoteCustomer,
    quoteName,
    setQuoteName,
    customers,
    handleConfirmQuote,
    processing
}) {
    if (!showQuoteModal) return null

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-[999999] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-[95%] max-w-md overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300 ring-4 ring-black/5">
                <div className="p-8 bg-gradient-to-br from-indigo-600 to-indigo-800 text-white flex justify-between items-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    <div className="relative z-10">
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Generar Cotización</h2>
                        <p className="opacity-80 font-medium text-sm mt-1">Total: ${calculateTotal().toFixed(2)}</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm relative z-10 shadow-lg border border-white/10"><FileText size={28} /></div>
                </div>

                <div className="p-8 space-y-6">
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Cliente Registrado (Opcional)</label>
                        <div className="relative mb-4">
                            <select
                                className="w-full p-4 pl-5 border-2 border-indigo-100 bg-indigo-50/50 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer hover:bg-indigo-100/50"
                                value={quoteCustomer}
                                onChange={(e) => setQuoteCustomer(e.target.value)}
                            >
                                <option value="">Consumidor Final (Sin Registro)...</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                            </select>
                            <User className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-300 pointer-events-none" size={20} />
                        </div>

                        {!quoteCustomer && (
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2 block">Nombre del Solicitante</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Juan Pérez"
                                    value={quoteName}
                                    onChange={(e) => setQuoteName(e.target.value)}
                                    className="w-full p-4 border-2 border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-indigo-500 transition-all"
                                />
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-8 bg-slate-50 flex gap-4 border-t border-slate-100">
                    <button onClick={() => setShowQuoteModal(false)} className="flex-1 py-4 font-bold text-slate-400 bg-white rounded-2xl border border-slate-200 hover:bg-slate-100 transition-colors">Cancelar</button>
                    <button
                        onClick={handleConfirmQuote}
                        disabled={processing}
                        className="flex-[2] py-4 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-indigo-500/30 active:scale-95 transition-all flex justify-center items-center gap-2 hover:from-indigo-400 hover:to-indigo-500"
                    >
                        {processing ? <RotateCcw className="animate-spin" /> : 'GENERAR PDF'}
                    </button>
                </div>
            </div>
        </div>
    )
}
