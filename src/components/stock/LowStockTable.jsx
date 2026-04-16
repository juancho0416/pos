import { AlertCircle, Download } from 'lucide-react'

/**
 * Tabla de productos con stock bajo o agotado.
 * Componente presentacional puro (sin lógica de negocio).
 */
export default function LowStockTable({ lowStockItems, onExportExcel }) {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-red-100 overflow-hidden mb-8">
            <div className="p-6 border-b border-red-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-red-50/30">
                <h2 className="font-bold text-red-600 flex items-center gap-2">
                    <AlertCircle size={20} className="text-red-500" />
                    Productos Agotados o Bajos
                </h2>
                <button
                    type="button"
                    onClick={onExportExcel}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm active:scale-95"
                >
                    <Download size={18} />
                    Generar Lista de Pedido (Excel)
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                        <tr>
                            <th className="px-6 py-4 text-left">Producto</th>
                            <th className="px-6 py-4 text-left">SKU</th>
                            <th className="px-6 py-4 text-center">Stock Actual</th>
                            <th className="px-6 py-4 text-center">Mínimo</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {lowStockItems.length === 0 ? (
                            <tr>
                                <td colSpan="4" className="p-8 text-center text-slate-400">Todo el inventario está saludable en esta sucursal.</td>
                            </tr>
                        ) : (
                            <>
                                {lowStockItems.slice(0, 100).map(item => (
                                    <tr key={item.id} className="hover:bg-red-50/50 transition-colors">
                                <td className="px-6 py-4 font-bold text-slate-700">{item.producto.nombre}</td>
                                <td className="px-6 py-4 text-slate-500">{item.producto.sku}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`font-black ${item.stock_actual === 0 ? 'text-red-600' : 'text-orange-500'}`}>
                                        {item.stock_actual}
                                    </span>
                                </td>
                                    <td className="px-6 py-4 text-center text-slate-400">{item.stock_minimo || 5}</td>
                                </tr>
                                ))}
                                {lowStockItems.length > 100 && (
                                    <tr>
                                        <td colSpan="4" className="p-4 text-center bg-red-50 text-red-600 font-bold text-xs uppercase tracking-wider">
                                            + {lowStockItems.length - 100} productos adicionales ocultos en pantalla. Genera el Excel para verlos todos.
                                        </td>
                                    </tr>
                                )}
                            </>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
