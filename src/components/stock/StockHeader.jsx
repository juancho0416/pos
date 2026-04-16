import { Search, Filter, Package } from 'lucide-react'

/**
 * Barra superior con título, selector de sucursal y búsqueda para la vista de Stock.
 */
export default function StockHeader({ branches, selectedBranch, onChangeBranch, searchTerm, onSearchChange }) {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Package className="text-blue-600" />
                    Gestión de Inventario
                </h1>
                <p className="text-gray-500 text-sm mt-1">Administra existencias por sucursal</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                {/* Branch Selector */}
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" size={18} />
                    <select
                        className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white border border-blue-100 rounded-lg text-gray-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm cursor-pointer hover:border-blue-300 transition"
                        value={selectedBranch}
                        onChange={(e) => onChangeBranch(e.target.value)}
                    >
                        {branches.map(b => (
                            <option key={b.id} value={b.id}>{b.nombre}</option>
                        ))}
                    </select>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar producto..."
                        className="w-full sm:w-64 pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
            </div>
        </div>
    )
}
