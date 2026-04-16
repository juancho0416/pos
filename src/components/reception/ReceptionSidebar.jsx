import { CheckCircle, FileText, ChevronUp, UserPlus, Hash, PackageX } from 'lucide-react'

export default function ReceptionSidebar({
    cartTotal = 0,
    handleConfirmReception,
    processing,
    cartLength = 0,
    showMobileCart,
    setShowMobileCart,
    proveedores = [],
    selectedProveedor,
    setSelectedProveedor,
    referencia,
    setReferencia,
    notas,
    setNotas
}) {
    return (
        <>
            {/* DESKTOP SIDEBAR / MOBILE DRAWER */}
            <div className={`
                fixed inset-x-0 bottom-0 z-50 bg-white transition-transform duration-300 rounded-t-[2.5rem] flex flex-col items-center justify-end
                lg:static lg:h-full lg:w-[380px] lg:border-l lg:border-slate-200 lg:rounded-none lg:transform-none lg:bg-transparent lg:pl-6
                ${showMobileCart ? 'translate-y-0 shadow-2xl pb-safe' : 'translate-y-[110%] lg:translate-y-0'}
            `}>
                
                {/* Mobile Handle */}
                <div className="lg:hidden w-full flex justify-center pt-3 pb-2 bg-slate-900 rounded-t-[2.5rem]" onClick={() => setShowMobileCart(false)}>
                    <div className="w-12 h-1.5 bg-white/20 rounded-full mb-1"></div>
                </div>

                <div className="w-full bg-slate-900 text-white lg:rounded-[2rem] p-6 sm:p-8 shadow-2xl flex-1 flex flex-col justify-between h-full">
                    <div className="flex-1 overflow-y-auto hide-scrollbar pr-2 -mr-2 space-y-6">
                        <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">Resumen de Entrada</span>
                            <span className="bg-emerald-500/20 text-emerald-400 text-xs font-black px-3 py-1 rounded-lg">
                                {cartLength} {cartLength === 1 ? 'Partida' : 'Partidas'}
                            </span>
                        </div>
                        
                        {/* Proveedor Selection */}
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wide">
                                    Proveedor *
                                </label>
                                <select
                                    value={selectedProveedor}
                                    onChange={(e) => setSelectedProveedor(e.target.value)}
                                    className="w-full bg-slate-800 border-2 border-slate-700 text-white rounded-xl px-4 py-3 outline-none focus:border-emerald-500 focus:bg-slate-800 transition-colors font-semibold appearance-none cursor-pointer"
                                >
                                    <option value="">-- Seleccionar Proveedor --</option>
                                    <option value="NEW_GENERIC">Proveedor Mostrador (General)</option>
                                    {proveedores.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wide flex items-center gap-1.5">
                                    <Hash size={12}/> Documento / Factura / Remisión
                                </label>
                                <input
                                    type="text"
                                    value={referencia}
                                    onChange={(e) => setReferencia(e.target.value)}
                                    placeholder="Ej. FAC-1200 o Nota 45"
                                    className="w-full bg-slate-800 border-2 border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors font-mono font-semibold"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-400 mb-1.5 block uppercase tracking-wide flex items-center gap-1.5">
                                    <FileText size={12}/> Notas Internas
                                </label>
                                <textarea
                                    value={notas}
                                    onChange={(e) => setNotas(e.target.value)}
                                    placeholder="Opcional..."
                                    rows={2}
                                    className="w-full bg-slate-800 border-2 border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 transition-colors text-sm resize-none"
                                />
                            </div>
                        </div>

                        <div className="h-px bg-slate-800 my-6"></div>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-slate-400 font-medium">
                                <span>Subtotal</span>
                                <span>${(cartTotal / 1.16).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-400 font-medium">
                                <span>IVA (16%)</span>
                                <span>${(cartTotal - (cartTotal / 1.16)).toFixed(2)}</span>
                            </div>
                            
                            <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-800">
                                <span className="text-emerald-400 font-bold uppercase text-sm tracking-widest block mb-1">Total Compra</span>
                                <span className="text-4xl font-black tracking-tighter text-white drop-shadow-lg">${cartTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 mt-6 pt-4 border-t border-slate-800">
                        <button
                            onClick={handleConfirmReception}
                            disabled={cartLength === 0 || !selectedProveedor || processing}
                            className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white py-5 rounded-xl font-black text-xl shadow-xl shadow-emerald-900/50 disabled:opacity-30 disabled:shadow-none transition-all flex justify-center items-center gap-3 active:scale-95 group uppercase tracking-tight"
                        >
                            <CheckCircle className="group-hover:scale-110 transition-transform" size={24} /> INGRESAR MERCANCÍA
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Cart Trigger */}
            <div className="block lg:hidden fixed bottom-4 left-4 right-4 z-40">
                <button
                    onClick={() => setShowMobileCart(true)}
                    className="w-full bg-slate-900 text-white rounded-3xl p-4 shadow-2xl flex justify-between items-center active:scale-95 transition-all border border-white/10"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-emerald-600 rounded-full w-10 h-10 flex items-center justify-center font-black text-sm">
                            <PackageX size={20} />
                        </div>
                        <span className="font-bold uppercase text-xs tracking-widest text-slate-300">Finalizar Recepción</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="font-black text-2xl tracking-tight">${cartTotal.toFixed(2)}</span>
                        <ChevronUp className="text-slate-400" size={24} />
                    </div>
                </button>
            </div>

            {/* Mobile Overlay */}
            {showMobileCart && (
                <div className="lg:hidden fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-sm" onClick={() => setShowMobileCart(false)}></div>
            )}
        </>
    )
}
