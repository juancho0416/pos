export default function PriceModal({
    showPriceModal,
    setShowPriceModal,
    selectedProductForPrice,
    confirmAddToCart
}) {
    if (!showPriceModal) return null

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-[999999] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white rounded-[2rem] shadow-2xl w-[90%] max-w-sm overflow-hidden animate-in zoom-in duration-300 ring-4 ring-black/5">
                <div className="p-8 bg-slate-50 border-b border-slate-100 text-center">
                    <h3 className="font-black text-xl text-slate-800 leading-tight">{selectedProductForPrice?.nombre}</h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">Selecciona Tarifa</p>
                </div>
                <div className="p-6 space-y-4">
                    <button onClick={() => confirmAddToCart('menudeo')} className="w-full flex justify-between items-center p-5 rounded-2xl border-2 border-slate-100 hover:border-blue-500 hover:bg-blue-50 transition-all group active:scale-95 bg-white shadow-sm">
                        <span className="font-bold text-slate-600 text-sm uppercase tracking-wider group-hover:text-blue-600">Menudeo</span>
                        <span className="font-black text-3xl text-slate-900 group-hover:text-blue-600">${selectedProductForPrice?.prices?.precio_menudeo}</span>
                    </button>
                    <button onClick={() => confirmAddToCart('mayoreo')} className="w-full flex justify-between items-center p-5 rounded-2xl border-2 border-slate-100 hover:border-purple-500 hover:bg-purple-50 transition-all group active:scale-95 bg-white shadow-sm">
                        <div>
                            <span className="font-bold text-slate-600 block text-sm uppercase tracking-wider group-hover:text-purple-600">Mayoreo</span>
                            <span className="text-[10px] text-purple-600 font-extrabold bg-purple-100 px-2 py-0.5 rounded-md uppercase tracking-wide">Min {selectedProductForPrice?.prices?.min_mayoreo}</span>
                        </div>
                        <span className="font-black text-3xl text-slate-900 group-hover:text-purple-600">${selectedProductForPrice?.prices?.precio_mayoreo}</span>
                    </button>
                    <button onClick={() => setShowPriceModal(false)} className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors text-xs uppercase tracking-widest">Cancelar</button>
                </div>
            </div>
        </div>
    )
}
