import { memo } from 'react'
import { Package } from 'lucide-react'

const ProductGrid = memo(function ProductGrid({ products, loading, getStockDisponible, initAddToCart }) {
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 animate-pulse">
                <Package size={48} className="mb-4 opacity-20" />
                <span className="font-bold tracking-widest text-sm">CARGANDO...</span>
            </div>
        )
    }

    if (!products || products.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Package size={48} className="mb-4 opacity-20" />
                <span className="font-bold tracking-widest text-sm">NO SE ENCONTRARON PRODUCTOS</span>
            </div>
        )
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6">
            {products.map(product => {
                const stockDisponible = getStockDisponible(product.id)
                return (
                    <div
                        key={product.id}
                        onClick={() => initAddToCart(product)}
                        className={`group flex flex-col justify-between p-4 sm:p-5 bg-white border border-slate-100 rounded-[1.5rem] cursor-pointer transition-[box-shadow,border-color] duration-200 relative overflow-hidden active:scale-[0.97] shadow-sm ${stockDisponible <= 0 ? 'opacity-60 grayscale pointer-events-none' : 'hover:shadow-lg hover:border-blue-200'
                            }`}
                    >
                        <div className="flex flex-col gap-3 relative z-10">
                            <div className="flex justify-between items-start">
                                <div className="bg-blue-50 w-12 h-12 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                                    <Package className="w-6 h-6" />
                                </div>
                                {stockDisponible <= 5 && stockDisponible > 0 && (
                                    <span className="bg-orange-100 text-orange-700 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wide">Pocos</span>
                                )}
                            </div>

                            <div className="h-14 flex items-center">
                                <div>
                                    <h3 className="font-bold text-slate-700 text-sm sm:text-base leading-tight line-clamp-2 group-hover:text-blue-700 transition-colors">
                                        {product.nombre}
                                    </h3>
                                    <p className="text-slate-400 text-[10px] font-mono uppercase tracking-wide mt-1">{product.sku}</p>
                                </div>
                            </div>
                        </div>

                        <div className="text-right border-t border-slate-50 pt-3 mt-3 relative z-10">
                            <p className={`font-black text-2xl tracking-tighter ${product.prices?.precio_menudeo ? 'text-blue-600' : 'text-slate-300'}`}>
                                {product.prices?.precio_menudeo ? `$${product.prices.precio_menudeo}` : 'Sin precio'}
                            </p>
                            <div className="flex justify-end items-center gap-1 mt-1 opacity-60 group-hover:opacity-100">
                                <div className={`w-1.5 h-1.5 rounded-full ${stockDisponible > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                    Disp: {stockDisponible}
                                </p>
                            </div>
                        </div>
                    </div>
                )
            })}
        </div>
    )
})

export default ProductGrid
