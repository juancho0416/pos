import React from 'react'
import { Outlet, Link, useNavigate } from 'react-router-dom'
import { LogOut, ShoppingCart, Package } from 'lucide-react'
import { useMayoristaStore } from '../../stores/useMayoristaStore'

export default function B2BLayout() {
    const navigate = useNavigate()
    // Anticipando la creación del store en el siguiente paso
    const userB2B = useMayoristaStore((state) => state.userB2B)
    const logout = useMayoristaStore((state) => state.logout)
    const cart = useMayoristaStore((state) => state.cart)

    const handleLogout = () => {
        logout()
        navigate('/mayoristas/login')
    }

    // Top Navigation estilo E-commerce Corporativo
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header / Top Navigation */}
            <header className="bg-slate-900 text-white shadow-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">

                        {/* Logo & Brand */}
                        <div className="flex-shrink-0 flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-lg border border-slate-200/50">
                                <img src="/icons/logogfc.png" alt="Logo" className="w-7 h-7 object-contain" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">Ferretería <span className="text-indigo-400">B2B</span></h1>
                                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Portal Mayorista</p>
                            </div>
                        </div>

                        {/* Navigation Links (Solo visibles si hay sesión) */}
                        {userB2B && (
                            <nav className="flex space-x-8">
                                <Link
                                    to="/mayoristas/catalogo"
                                    className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    Catálogo de Productos
                                </Link>
                                <Link
                                    to="/mayoristas/mi-cuenta"
                                    className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                                >
                                    Mi Cuenta
                                </Link>
                            </nav>
                        )}

                        {/* User Profile & Cart */}
                        {userB2B ? (
                            <div className="flex items-center space-x-6">
                                {/* Cart Widget */}
                                <Link
                                    to="/mayoristas/carrito"
                                    className="relative p-2 text-slate-300 hover:text-white transition-colors flex items-center gap-2"
                                >
                                    <ShoppingCart className="w-6 h-6" />
                                    {cart?.length > 0 && (
                                        <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-slate-900">
                                            {cart.length}
                                        </span>
                                    )}
                                    <span className="text-sm font-medium hidden md:block">Carrito</span>
                                </Link>

                                {/* User Dropdown / Info */}
                                <div className="flex items-center gap-4 pl-6 border-l border-slate-700">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-sm font-semibold">{userB2B.nombre_empresa || userB2B.nombre}</p>
                                        <p className="text-xs text-slate-400">Cliente Mayorista</p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-full transition-all"
                                        title="Cerrar Sesión"
                                    >
                                        <LogOut className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-sm text-slate-400">
                                Acceso Restringido
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 w-full max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                {/* Outlet renderiza las sub-rutas dinámicamente */}
                <Outlet />
            </main>

            {/* Simple Footer */}
            <footer className="bg-white border-t border-slate-200 py-6 text-center text-sm text-slate-500">
                <p>© {new Date().getFullYear()} Sistema Ferretero. Portal exclusivo para Mayoristas.</p>
            </footer>
        </div>
    )
}
