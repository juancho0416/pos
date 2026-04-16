import { Trash2, Plus, Minus, PackageX, DollarSign, Percent, Tag, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

function MarginBadge({ costo, precioVenta }) {
    if (!costo || !precioVenta || costo <= 0) return null
    const margin = ((precioVenta - costo) / precioVenta) * 100
    const color = margin < 15 ? 'text-red-600 bg-red-50' : margin < 30 ? 'text-yellow-600 bg-yellow-50' : 'text-emerald-700 bg-emerald-50'
    return (
        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${color}`}>
            {margin.toFixed(0)}% margen
        </span>
    )
}

function ItemRow({ item, idx, updateField, updateQuantity, removeFromCart }) {
    const [expanded, setExpanded] = useState(false)

    const handleCostoChange = (val) => {
        const costo = parseFloat(val) || 0
        updateField(item.id, 'costo', costo)
        // Auto-recalculate sale price preserving existing margin if margin > 0
        if (item.margen > 0) {
            const newPrecio = costo / (1 - item.margen / 100)
            updateField(item.id, 'precio_menudeo', parseFloat(newPrecio.toFixed(2)))
        } else {
            // Default 30% margin
            updateField(item.id, 'precio_menudeo', parseFloat((costo * 1.3).toFixed(2)))
            updateField(item.id, 'precio_mayoreo', parseFloat((costo * 1.15).toFixed(2)))
            updateField(item.id, 'margen', 23.1) // 30% markup = ~23% margin
        }
    }

    const handlePrecioChange = (val) => {
        const precio = parseFloat(val) || 0
        updateField(item.id, 'precio_menudeo', precio)
        if (item.costo > 0 && precio > 0) {
            const margen = ((precio - item.costo) / precio) * 100
            updateField(item.id, 'margen', parseFloat(margen.toFixed(1)))
        }
    }

    const handleMargenChange = (val) => {
        const margen = parseFloat(val) || 0
        updateField(item.id, 'margen', margen)
        if (item.costo > 0 && margen < 100) {
            const newPrecio = item.costo / (1 - margen / 100)
            updateField(item.id, 'precio_menudeo', parseFloat(newPrecio.toFixed(2)))
        }
    }

    const costo_con_iva = item.costo * (1 + (item.iva_porcentaje || 0) / 100)
    const subtotalLinea = item.costo * item.cantidad

    return (
        <>
            <tr className="group hover:bg-emerald-50/20 transition-colors border-b border-slate-50">
                {/* Código/SKU */}
                <td className="py-3 px-4 align-middle">
                    <input
                        type="text"
                        value={item.sku || ''}
                        onChange={(e) => updateField(item.id, 'sku', e.target.value)}
                        placeholder="SKU/C.B."
                        className="w-20 text-xs font-mono font-bold text-slate-600 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                </td>

                {/* Nombre Producto */}
                <td className="py-3 px-4 align-middle min-w-[180px]">
                    <input
                        type="text"
                        value={item.nombre || ''}
                        onChange={(e) => updateField(item.id, 'nombre', e.target.value)}
                        className="w-full font-bold text-slate-800 text-sm bg-white border border-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-emerald-500"
                    />
                    {item.es_nuevo && (
                        <span className="inline-block mt-1 text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-lg">⚡ Nuevo en catálogo</span>
                    )}
                </td>

                {/* Cantidad */}
                <td className="py-3 px-4 align-middle">
                    <div className="flex items-center justify-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm w-[100px] mx-auto">
                        <button
                            onClick={() => updateQuantity(item.id, -1)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-emerald-600 active:scale-95 transition-all"
                        >
                            <Minus size={12} strokeWidth={3} />
                        </button>
                        <input
                            type="number"
                            className="flex-1 text-center font-black text-slate-800 text-sm bg-transparent focus:outline-none"
                            value={item.cantidad}
                            min="1"
                            onChange={(e) => {
                                const val = parseInt(e.target.value) || 1
                                updateQuantity(item.id, val - item.cantidad)
                            }}
                        />
                        <button
                            onClick={() => updateQuantity(item.id, 1)}
                            className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-emerald-600 active:scale-95 transition-all"
                        >
                            <Plus size={12} strokeWidth={3} />
                        </button>
                    </div>
                </td>

                {/* Costo Unitario (sin IVA) */}
                <td className="py-3 px-4 align-middle">
                    <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">$</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.costo}
                            onChange={(e) => handleCostoChange(e.target.value)}
                            className="w-full bg-white border border-slate-200 text-slate-800 rounded-xl pl-5 pr-2 py-2 font-bold text-sm text-right focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
                        />
                    </div>
                    {(item.iva_porcentaje > 0) && (
                        <p className="text-[10px] text-slate-400 text-right mt-0.5">c/IVA: <strong>${costo_con_iva.toFixed(2)}</strong></p>
                    )}
                </td>

                {/* IVA % */}
                <td className="py-3 px-4 align-middle">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-2 shadow-sm">
                        <select
                            value={item.iva_porcentaje ?? 16}
                            onChange={(e) => updateField(item.id, 'iva_porcentaje', parseInt(e.target.value))}
                            className="w-full font-bold text-slate-700 text-sm bg-transparent focus:outline-none cursor-pointer"
                        >
                            <option value={0}>0% (Exento)</option>
                            <option value={8}>8% (Frontera)</option>
                            <option value={16}>16% (General)</option>
                        </select>
                    </div>
                </td>

                {/* Precio de Venta Menudeo */}
                <td className="py-3 px-4 align-middle">
                    <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-400 text-xs font-bold">$</span>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.precio_menudeo}
                            onChange={(e) => handlePrecioChange(e.target.value)}
                            className="w-full bg-blue-50 border border-blue-200 text-blue-800 rounded-xl pl-5 pr-2 py-2 font-bold text-sm text-right focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                        />
                    </div>
                    <div className="mt-0.5 text-right">
                        <MarginBadge costo={item.costo} precioVenta={item.precio_menudeo} />
                    </div>
                </td>

                {/* Margen % */}
                <td className="py-3 px-4 align-middle">
                    <div className="relative">
                        <input
                            type="number"
                            min="0"
                            max="99"
                            step="0.1"
                            value={item.margen ?? ''}
                            onChange={(e) => handleMargenChange(e.target.value)}
                            placeholder="%"
                            className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 font-bold text-sm text-right focus:outline-none focus:border-emerald-500 shadow-sm"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">%</span>
                    </div>
                </td>

                {/* Subtotal */}
                <td className="py-3 px-4 align-middle text-right">
                    <p className="font-black text-slate-800">${subtotalLinea.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-400">{item.cantidad} x ${item.costo.toFixed(2)}</p>
                </td>

                {/* Actions */}
                <td className="py-3 px-3 align-middle text-center">
                    <div className="flex flex-col gap-1">
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-400 hover:bg-blue-50 hover:text-blue-500 transition-all"
                            title="Más campos"
                        >
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <button
                            onClick={() => removeFromCart(item.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 text-slate-400 hover:bg-red-50 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all active:scale-90"
                            title="Eliminar"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </td>
            </tr>

            {/* EXPANDED ROW — Extra fields */}
            {expanded && (
                <tr className="bg-slate-50 border-b border-slate-100">
                    <td colSpan={9} className="px-4 pb-4 pt-2">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {/* Precio Mayoreo */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Precio Mayoreo</label>
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-purple-400 text-xs font-bold">$</span>
                                    <input
                                        type="number" min="0" step="0.01"
                                        value={item.precio_mayoreo}
                                        onChange={(e) => updateField(item.id, 'precio_mayoreo', parseFloat(e.target.value) || 0)}
                                        className="w-full bg-purple-50 border border-purple-200 text-purple-800 rounded-xl pl-5 pr-2 py-2 font-bold text-sm text-right focus:outline-none focus:border-purple-500"
                                    />
                                </div>
                            </div>

                            {/* Min Mayoreo */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Min pza. Mayoreo</label>
                                <input
                                    type="number" min="2"
                                    value={item.min_mayoreo ?? 3}
                                    onChange={(e) => updateField(item.id, 'min_mayoreo', parseInt(e.target.value) || 3)}
                                    className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 font-bold text-sm text-right focus:outline-none focus:border-slate-400"
                                />
                            </div>

                            {/* Stock Mínimo */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Stock Mínimo</label>
                                <input
                                    type="number" min="0"
                                    value={item.stock_minimo ?? 5}
                                    onChange={(e) => updateField(item.id, 'stock_minimo', parseInt(e.target.value) || 0)}
                                    className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 font-bold text-sm text-right focus:outline-none focus:border-slate-400"
                                />
                            </div>

                            {/* Categoría */}
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Categoría</label>
                                <input
                                    type="text"
                                    value={item.categoria ?? ''}
                                    onChange={(e) => updateField(item.id, 'categoria', e.target.value)}
                                    placeholder="Ej: Herramientas"
                                    className="w-full bg-white border border-slate-200 text-slate-700 rounded-xl px-3 py-2 font-bold text-sm focus:outline-none focus:border-slate-400"
                                />
                            </div>
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}

export default function ReceptionCartTable({ cart, updateQuantity, updateField, removeFromCart, clearCart }) {
    const totalGeneral = cart.reduce((acc, item) => acc + (item.costo * item.cantidad), 0)
    const ivaGeneral = cart.reduce((acc, item) => {
        const ivaRate = (item.iva_porcentaje ?? 16) / 100
        return acc + (item.costo * item.cantidad * ivaRate)
    }, 0)

    return (
        <div className="flex-1 flex flex-col bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Table Header */}
            <div className="flex justify-between items-center bg-slate-50 border-b border-slate-200 px-6 py-4 shrink-0">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-black text-slate-800 tracking-tight uppercase">Doc. Recepción</h2>
                    <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-lg">
                        {cart.length} {cart.length === 1 ? 'partida' : 'partidas'}
                    </span>
                </div>
                <div className="flex items-center gap-4">
                    {cart.length > 0 && (
                        <p className="text-sm font-bold text-slate-500 hidden sm:block">
                            +IVA: <span className="text-orange-600">${ivaGeneral.toFixed(2)}</span>
                            <span className="mx-2 text-slate-300">|</span>
                            Total: <span className="text-slate-800">${totalGeneral.toFixed(2)}</span>
                        </p>
                    )}
                    {cart.length > 0 && (
                        <button
                            onClick={clearCart}
                            className="text-slate-400 hover:text-red-600 flex items-center gap-1.5 text-sm font-bold bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 px-3 py-1.5 rounded-xl transition-all active:scale-95"
                        >
                            <Trash2 size={14} /> Vaciar
                        </button>
                    )}
                </div>
            </div>

            {/* Table Body */}
            <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-slate-200">
                {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-4 p-8">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border-4 border-white shadow-inner">
                            <PackageX size={40} className="text-slate-300" />
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-bold tracking-tight text-slate-700">Documento vacío</p>
                            <p className="text-sm font-medium mt-1 max-w-xs">Busca un producto, escanea un código o carga un archivo XML para comenzar la recepción.</p>
                        </div>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse text-sm" style={{ minWidth: '900px' }}>
                        <thead className="bg-white sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
                            <tr>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 w-24">Cód/SKU</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Descripción</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center w-28">Cant</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center w-32">Costo (sin IVA)</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center w-28">IVA</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center w-32">P. Venta Menudeo</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-center w-24">Margen</th>
                                <th className="py-3 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right w-28">Subtotal</th>
                                <th className="py-3 px-4 border-b border-slate-100 w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {cart.map((item, idx) => (
                                <ItemRow
                                    key={`${item.id}-${idx}`}
                                    item={item}
                                    idx={idx}
                                    updateField={updateField}
                                    updateQuantity={updateQuantity}
                                    removeFromCart={removeFromCart}
                                />
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
