import { Outlet, Link, useLocation } from 'react-router-dom'
import { Package, Box, ShoppingCart, BarChart, Menu } from 'lucide-react'

export default function MainLayout() {
    const location = useLocation()

    const navItems = [
        { path: '/pos', label: 'Venta', icon: <ShoppingCart size={24} /> },
        { path: '/productos', label: 'Productos', icon: <Package size={24} /> }, // Changed Box to Package for products
        { path: '/inventario', label: 'Inventario', icon: <Box size={24} /> }, // Changed Package to Box for inventory/stock
        { path: '/reportes', label: 'Reportes', icon: <BarChart size={24} /> },
    ]

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 h-screen fixed left-0 top-0 z-10">
                <div className="p-6 border-b border-gray-200">
                    <h1 className="text-2xl font-bold text-blue-600">Ferretería POS</h1>
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${location.pathname === item.path
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {item.icon}
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 pb-20 md:pb-0">
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-50 safe-area-bottom">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`flex flex-col items-center p-2 rounded-lg ${location.pathname === item.path
                                ? 'text-blue-600'
                                : 'text-gray-500'
                            }`}
                    >
                        {item.icon}
                        <span className="text-xs mt-1 font-medium">{item.label}</span>
                    </Link>
                ))}
            </nav>
        </div>
    )
}
