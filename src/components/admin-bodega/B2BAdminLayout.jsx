import React from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { LogOut, PackageSearch, LayoutDashboard, Truck, ClipboardList, Warehouse, Users, PhoneCall } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function B2BAdminLayout() {
    const { user, profile, logout } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const isActive = (path) => {
        return location.pathname.includes(path) ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }

    return (
        <div className="min-h-screen bg-slate-900 flex text-slate-300">
            {/* Sidebar Industrial */}
            <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col hidden md:flex">
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-indigo-500 flex items-center justify-center text-white">
                            <PackageSearch size={20} />
                        </div>
                        <div>
                            <h1 className="text-white font-bold leading-none tracking-tight">Fulfillment</h1>
                            <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold mt-1">Bodega B2B</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <Link to="/admin-bodega/pedidos" className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isActive('/pedidos')}`}>
                        <LayoutDashboard size={20} />
                        Tablero de Despacho
                    </Link>
                    <Link to="/admin-bodega/inventario" className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isActive('/inventario')}`}>
                        <Warehouse size={20} />
                        Monitor de Inventario
                    </Link>
                    <Link to="/admin-bodega/cartera" className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isActive('/cartera')}`}>
                        <Users size={20} />
                        Cartera de Clientes
                    </Link>
                    <Link to="/admin-bodega/despacho" className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isActive('/despacho')}`}>
                        <Warehouse size={20} />
                        Tablero de Despacho
                    </Link>
                    <Link to="/admin-bodega/rutas-activas" className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${isActive('/rutas-activas')}`}>
                        <Truck size={20} />
                        Realizar Entregas (Móvil)
                    </Link>
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 rounded-lg mb-4">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{profile?.nombre || user?.email}</p>
                            <p className="text-xs text-slate-500 truncate">{profile?.rol}</p>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-2 w-full text-left text-sm text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    >
                        <LogOut size={18} />
                        Cerrar Sesión
                    </button>
                </div>
            </aside>

            {/* Main Area */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#0f172a]">
                {/* Topbar para Header Actions (Desktop) y Mobile Menu */}
                <header className="bg-slate-950 border-b border-slate-800 p-4 flex items-center justify-between">
                    <div className="md:hidden">
                        <h1 className="text-white font-bold flex items-center gap-2">
                            <PackageSearch size={20} className="text-indigo-400" />
                            Fulfillment B2B
                        </h1>
                    </div>

                    {/* Header Actions (Right aligned) */}
                    <div className="hidden md:flex ml-auto items-center gap-4">
                        <Link
                            to="/admin-bodega/nuevo-pedido"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                        >
                            <PhoneCall size={16} />
                            ✚ Nuevo Pedido Telefónico
                        </Link>
                    </div>
                </header>

                <div className="flex-1 overflow-auto p-4 md:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    )
}
