import { Search, PackagePlus, FileJson } from 'lucide-react'

export default function ReceptionTopBar({
    searchTerm,
    setSearchTerm,
    onSearchEnter,
    searchInputRef,
    allProducts = [],
    initReceiveItem,
    setShowScanner,
    onOpenCFDI
}) {
    const handleSearch = (e) => {
        setSearchTerm(e.target.value)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            onSearchEnter()
        }
    }

    // Filter products based on search term
    const getFilteredProducts = () => {
        if (!searchTerm || searchTerm.length < 2) return []

        const exactMatch = allProducts.find(p => p.codigo_barras === searchTerm || p.sku === searchTerm)
        if (exactMatch) return [exactMatch]

        const searchTerms = searchTerm.toLowerCase().split(' ').filter(term => term.length > 0)
        return allProducts.filter(p => {
            const searchString = `${p.nombre} ${p.codigo_barras || ''} ${p.sku || ''}`.toLowerCase()
            return searchTerms.every(term => searchString.includes(term))
        }).slice(0, 10)
    }

    const searchResults = getFilteredProducts()
    const showDropdown = searchResults.length > 0 && searchTerm.length >= 2 && !(searchResults.length === 1 && (searchResults[0].codigo_barras === searchTerm || searchResults[0].sku === searchTerm))

    return (
        <div className="bg-white border-b border-slate-200 shrink-0 shadow-sm relative z-[60]">
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 max-w-[1600px] mx-auto">
                <div className="flex items-center gap-3 shrink-0">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center -rotate-6 shadow-inner tracking-tight">
                        <PackagePlus className="text-emerald-600" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight leading-none">Recepción</h1>
                        <p className="text-xs font-bold text-slate-400">Entrada de Mercancía</p>
                    </div>
                </div>

                {/* CFDI XML Button */}
                {onOpenCFDI && (
                    <button
                        onClick={onOpenCFDI}
                        className="shrink-0 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2.5 rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all text-sm"
                    >
                        <FileJson size={18} />
                        <span className="hidden sm:inline">Cargar Factura XML</span>
                        <span className="sm:hidden">XML</span>
                    </button>
                )}

                <div className="flex-1 w-full relative sm:max-w-2xl sm:mx-8">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-6 w-6 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                        </div>
                        <input
                            ref={searchInputRef}
                            type="text"
                            value={searchTerm}
                            onChange={handleSearch}
                            onKeyDown={handleKeyDown}
                            className="w-full bg-slate-100 border-2 border-slate-200 text-slate-800 placeholder-slate-400 rounded-2xl pl-12 pr-6 py-4 font-bold text-lg sm:text-xl focus:outline-none focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10 transition-all shadow-inner"
                            placeholder="Escanea el código o busca el producto..."
                            autoFocus
                        />
                    </div>
                    
                    {showDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden max-h-[60vh] overflow-y-auto w-full origin-top animate-in slide-in-from-top-2 z-50">
                            {searchResults.map((p, idx) => (
                                <button
                                    key={p.id}
                                    onClick={() => initReceiveItem(p)}
                                    className={`w-full text-left p-4 hover:bg-emerald-50 focus:bg-emerald-50 transition-colors flex items-center justify-between gap-4 outline-none active:bg-emerald-100
                                        ${idx < searchResults.length - 1 ? 'border-b border-slate-50' : ''}
                                    `}
                                >
                                    <div className="flex items-center gap-4 flex-1 overflow-hidden">
                                        <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center shrink-0 border border-slate-200">
                                            <PackagePlus size={20} className="text-slate-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 text-base sm:text-lg truncate">{p.nombre}</p>
                                            <p className="text-xs font-bold font-mono text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg inline-block mt-1 border border-emerald-100">
                                                {p.codigo_barras || p.sku || 'S/C'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity shrink-0">
                                        <Search size={16} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
