import { Outlet, Link, useLocation } from 'react-router-dom'
import SectionErrorBoundary from './guards/SectionErrorBoundary'
import NotificationCenter from './NotificationCenter'
import {
    ShoppingCart, Package, BarChart3, Menu, X, Box, ArrowRightLeft,
    Lock, Users, Calendar, FileText, ClipboardList, Wifi, WifiOff,
    CloudUpload, Truck, ChevronLeft, ChevronRight, Settings, AlertTriangle, Download, ReceiptText, AlertCircle, RotateCcw, FileSpreadsheet, Receipt
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useSyncStore } from '../stores/useSyncStore'
import { useTransferStore } from '../stores/useTransferStore'
import { useQuery } from '@powersync/react'

export default function Layout() {
    const { profile } = useAuth()
    const [isSidebarOpen, setIsSidebarOpen] = useState(false) // Mobile overlay
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
        return localStorage.getItem('sidebarCollapsed') === 'true'
    })

    const location = useLocation()
    const isOffline = useSyncStore((s) => s.isOffline)
    const pendingCount = useSyncStore((s) => s.pendingCount)
    const errorCount = useSyncStore((s) => s.errorCount)
    const transferPending = useTransferStore((s) => s.pendingRequests)

    const toggleSidebar = () => {
        const nextState = !isSidebarCollapsed
        setIsSidebarCollapsed(nextState)
        localStorage.setItem('sidebarCollapsed', String(nextState))
    }

    const currentRole = profile?.rol || 'vendedor'

    // ── Stock mínimo: productos bajo mínimo en tiempo real
    const { data: lowStockItems = [] } = useQuery(
        `SELECT COUNT(*) as cnt FROM inventario
         WHERE stock_actual <= stock_minimo AND stock_minimo > 0`
    )
    const lowStockCount = lowStockItems?.[0]?.cnt ?? 0

    const MENU_GROUPS = [
        {
            category: 'PUNTO DE VENTA',
            items: [
                { name: 'Ventas', href: '/sales', icon: ShoppingCart, rolesPermitidos: ['admin', 'vendedor'] },
                { name: 'Historial de Ventas', href: '/historial-ventas', icon: ReceiptText, rolesPermitidos: ['admin', 'vendedor'] },
                { name: 'Devoluciones', href: '/devoluciones', icon: RotateCcw, rolesPermitidos: ['admin', 'vendedor'] },
                { name: 'Cotizaciones', href: '/quotes', icon: FileText, rolesPermitidos: ['admin', 'vendedor'] },
                { name: 'Clientes', href: '/customers', icon: Users, rolesPermitidos: ['admin', 'vendedor'] },
                { name: 'Corte de Caja', href: '/cash-close', icon: Lock, rolesPermitidos: ['admin', 'vendedor'] },
            ]
        },
        {
            category: 'INVENTARIO',
            items: [
                { name: 'Compras / Recepciones', href: '/compras', icon: ShoppingCart, rolesPermitidos: ['admin', 'admin_bodega'] },
                { name: 'Proveedores', href: '/proveedores', icon: Truck, rolesPermitidos: ['admin', 'admin_bodega'] },
                { name: 'Entrada Mercancía', href: '/recepcion', icon: Download, rolesPermitidos: ['admin', 'admin_bodega', 'vendedor'] },
                { name: 'Productos', href: '/products', icon: Package, rolesPermitidos: ['admin', 'admin_bodega', 'vendedor'] },
                { name: 'Importar Productos', href: '/importar-productos', icon: FileSpreadsheet, rolesPermitidos: ['admin'] },
                { name: 'Inventario / Almacén', href: '/inventory', icon: Box, rolesPermitidos: ['admin', 'admin_bodega', 'vendedor'], alertCount: lowStockCount },
                { name: 'Kárdex', href: '/kardex', icon: ClipboardList, rolesPermitidos: ['admin', 'admin_bodega'] },
                { name: 'Traspasos', href: '/transfers', icon: ArrowRightLeft, rolesPermitidos: ['admin', 'admin_bodega', 'vendedor'] },
                { name: 'Historial Traspasos', href: '/reporte-traspasos', icon: ArrowRightLeft, rolesPermitidos: ['admin', 'admin_bodega'] },
            ]
        },
        {
            category: 'LOGÍSTICA MENUDEO',
            items: [
                { name: 'Mi Ruta (Chofer)', href: '/chofer/ruta', icon: Truck, rolesPermitidos: ['admin', 'chofer', 'vendedor'] },
                { name: 'Historial Entregas', href: '/entregas', icon: Truck, rolesPermitidos: ['admin', 'admin_bodega', 'vendedor'] },
            ]
        },
        {
            category: 'LOGÍSTICA MAYOREO B2B',
            items: [
                { name: 'Despacho B2B', href: '/admin-bodega/despacho', icon: Package, rolesPermitidos: ['admin', 'admin_bodega'] },
                { name: 'Rutas Activas B2B', href: '/admin-bodega/rutas-activas', icon: Truck, rolesPermitidos: ['admin', 'admin_bodega'] },
            ]
        },
        {
            category: 'ADMINISTRACIÓN',
            items: [
                { name: 'Reportes', href: '/dashboard', icon: BarChart3, rolesPermitidos: ['admin'] },
                { name: 'Gastos Operativos', href: '/gastos', icon: Receipt, rolesPermitidos: ['admin'] },
                { name: 'Historial Turnos', href: '/historial-turnos', icon: Calendar, rolesPermitidos: ['admin'] },
                { name: 'Equipo', href: '/users-admin', icon: Users, rolesPermitidos: ['admin'] },
                { name: 'Configuraciones', href: '/settings-admin', icon: Settings, rolesPermitidos: ['admin'] },
            ]
        }
    ]

    const filteredMenu = MENU_GROUPS.map(group => ({
        ...group,
        items: group.items.filter(item => item.rolesPermitidos.includes(currentRole))
    })).filter(group => group.items.length > 0)

    const isActive = (path) => location.pathname === path

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar (Desktop & Mobile Drawer) */}
            <aside className={`
                fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200 transform transition-all duration-300 ease-in-out shadow-2xl md:shadow-none
                md:relative md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                ${isSidebarCollapsed ? 'md:w-20' : 'md:w-72 w-72'}
            `}>
                <div className="flex items-center justify-between p-4 border-b border-slate-100 min-h-[73px]">
                    <div className={`flex items-center gap-3 overflow-hidden transition-opacity duration-300 ${isSidebarCollapsed ? 'md:opacity-0 md:w-0 md:scale-95' : 'opacity-100 w-auto scale-100'}`}>
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl shadow-lg shadow-blue-200">
                            <Box className="text-white" size={24} />
                        </div>
                        <h1 className="text-xl font-black text-slate-800 tracking-tight">Ferretería<span className="text-blue-600">POS</span></h1>
                    </div>
                    {isSidebarCollapsed && (
                        <div className="hidden md:flex flex-1 justify-center animate-fade-in">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-xl shadow-md">
                                <Box className="text-white" size={22} />
                            </div>
                        </div>
                    )}
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-7 hide-scrollbar">
                    {filteredMenu.map((group, index) => (
                        <div key={index} className="space-y-1.5 animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                            {!isSidebarCollapsed && (
                                <h3 className="px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 select-none">
                                    {group.category}
                                </h3>
                            )}
                            {isSidebarCollapsed && index > 0 && (
                                <div className="border-t border-slate-100 mb-2 mt-4 mx-3 hidden md:block"></div>
                            )}
                            {group.items.map((item) => {
                                const Icon = item.icon
                                const active = isActive(item.href)
                                return (
                                    <Link
                                        key={item.name}
                                        to={item.href}
                                        onClick={() => setIsSidebarOpen(false)}
                                        title={isSidebarCollapsed ? item.name : ''}
                                        className={`
                                            group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 relative overflow-hidden outline-none
                                            ${active
                                                ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100/50'
                                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 focus:bg-slate-100'}
                                        `}
                                    >
                                        {active && (
                                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full"></div>
                                        )}
                                        <div className={`flex items-center justify-center relative ${isSidebarCollapsed ? 'mx-auto' : ''}`}>
                                            <Icon size={20} className={`${active ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} transition-transform duration-200 group-hover:scale-110`} />
                                            {item.href === '/transfers' && transferPending > 0 && isSidebarCollapsed && (
                                                <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
                                            )}
                                            {item.alertCount > 0 && isSidebarCollapsed && (
                                                <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white animate-pulse"></span>
                                            )}
                                        </div>

                                        {!isSidebarCollapsed && (
                                            <span className="flex-1 font-semibold text-sm whitespace-nowrap">{item.name}</span>
                                        )}

                                        {item.href === '/transfers' && transferPending > 0 && !isSidebarCollapsed && (
                                            <span className="bg-red-500 text-white text-[10px] font-black min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                                                {transferPending}
                                            </span>
                                        )}
                                        {item.alertCount > 0 && !isSidebarCollapsed && (
                                            <span className="bg-amber-500 text-white text-[10px] font-black min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center animate-pulse shadow-sm" title="Productos bajo stock mínimo">
                                                {item.alertCount}
                                            </span>
                                        )}
                                    </Link>
                                )
                            })}
                        </div>
                    ))}
                </nav>

                {/* Sidebar Footer (Collapse Toggle & Network Status) */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3 shrink-0">
                    <button
                        onClick={toggleSidebar}
                        className="hidden md:flex items-center justify-center w-full p-2.5 text-slate-400 hover:bg-white hover:text-slate-700 rounded-xl transition-all border border-transparent hover:border-slate-200 hover:shadow-sm"
                    >
                        {isSidebarCollapsed ? <ChevronRight size={20} /> : (
                            <div className="flex items-center gap-2 w-full justify-center">
                                <ChevronLeft size={20} />
                                <span className="text-sm font-semibold">Minimizar Menú</span>
                            </div>
                        )}
                    </button>

                    <div className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative shadow-inner ${isOffline
                        ? 'bg-red-50 text-red-600 border border-red-100 bg-striped-red'
                        : 'bg-white text-green-600 border border-green-100 shadow-sm'
                        }`}>
                        {isOffline ? <WifiOff size={16} className="animate-pulse" /> : <Wifi size={16} />}
                        {!isSidebarCollapsed && (
                            <span>{isOffline ? 'Sin Conexión' : 'En Línea'}</span>
                        )}
                        {errorCount > 0 && !isSidebarCollapsed && (
                            <span className="ml-auto flex items-center gap-1 bg-red-500 text-white px-2 py-0.5 rounded-md shadow-sm" title="Errores Permanentes">
                                <AlertTriangle size={12} />
                                {errorCount}
                            </span>
                        )}
                        {pendingCount > 0 && !isSidebarCollapsed && (
                            <span className={`${errorCount > 0 ? '' : 'ml-auto'} flex items-center gap-1 bg-amber-500 text-white px-2 py-0.5 rounded-md shadow-sm`}>
                                <CloudUpload size={12} />
                                {pendingCount}
                            </span>
                        )}
                        {(pendingCount > 0 || errorCount > 0) && isSidebarCollapsed && (
                            <span className={`absolute -top-1 -right-1 w-3 h-3 ${errorCount > 0 ? 'bg-red-500' : 'bg-amber-500'} rounded-full border-2 border-white animate-pulse shadow-sm`}></span>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-50">
                {/* Mobile Header */}
                <header className="bg-white border-b border-slate-200 p-4 flex items-center justify-between md:hidden shadow-sm relative shrink-0" style={{ zIndex: 99999 }}>
                    <div className="flex items-center gap-3">
                        <NotificationCenter />
                        <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 text-slate-500 bg-slate-50 rounded-xl hover:bg-slate-100 hover:text-slate-800 transition-colors">
                            <Menu size={24} />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-1.5 rounded-lg shadow-sm">
                                <Box className="text-white" size={18} />
                            </div>
                            <h1 className="text-lg font-black text-slate-800 tracking-tight">Ferretería<span className="text-blue-600">POS</span></h1>
                        </div>
                    </div>

                    {/* Mobile Network Badge */}
                    <div className="flex items-center gap-2">
                        {errorCount > 0 && (
                            <span className="flex items-center gap-1 bg-red-100 text-red-800 px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm">
                                <AlertTriangle size={14} />
                                {errorCount}
                            </span>
                        )}
                        {pendingCount > 0 && (
                            <span className="flex items-center gap-1 bg-amber-100 text-amber-800 px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm">
                                <CloudUpload size={14} className="animate-pulse" />
                                {pendingCount}
                            </span>
                        )}
                        <div className={`p-2 rounded-xl shadow-inner ${isOffline ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                            {isOffline ? <WifiOff size={18} /> : <Wifi size={18} />}
                        </div>
                    </div>
                </header>

                {/* Desktop Header */}
                <header className="hidden md:flex bg-white border-b border-slate-200 h-16 px-6 items-center justify-between shrink-0 shadow-sm relative" style={{ zIndex: 99999 }}>
                    <div className="font-medium text-slate-500 capitalize">
                        {new Date().toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationCenter />
                        <div className="w-px h-8 bg-slate-200 mx-2"></div>
                        <div className="flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-sm font-bold text-slate-800 uppercase">{profile?.full_name || profile?.root_name || 'Usuario'}</p>
                                <p className="text-xs font-semibold text-blue-600 capitalize">{profile?.rol?.replace('_', ' ') || 'Ventas'}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-white shadow-sm flex items-center justify-center text-blue-800 font-black text-lg">
                                {(profile?.full_name || profile?.root_name || 'U').charAt(0).toUpperCase()}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-auto w-full relative h-full">
                    <SectionErrorBoundary sectionName="Página">
                        <Outlet />
                    </SectionErrorBoundary>
                </main>
            </div>
        </div>
    )
}
