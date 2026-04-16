// NotificationCenter.jsx — Icono de campana y panel de notificaciones
import { useState, useRef, useEffect } from 'react'
import { Bell, Check, Trash2, Box, ArrowRightLeft, DollarSign, Info } from 'lucide-react'
import { useNotificationStore } from '../stores/useNotificationStore'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { useNavigate } from 'react-router-dom'

const getIcon = (type) => {
    switch (type) {
        case 'TRANSFERENCIA': return <ArrowRightLeft size={16} className="text-blue-500" />
        case 'STOCK': return <Box size={16} className="text-orange-500" />
        case 'VENTA': return <DollarSign size={16} className="text-green-500" />
        default: return <Info size={16} className="text-gray-500" />
    }
}

export default function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false)
    const store = useNotificationStore()
    const { notifications, markAsRead, markAllAsRead, clearAll } = store
    const unreadCount = notifications ? notifications.filter(n => !n.read).length : 0
    const wrapperRef = useRef(null)
    const navigate = useNavigate()

    // Click outside to close
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleNotificationClick = (notif) => {
        markAsRead(notif.id)
        if (notif.link) {
            navigate(notif.link)
            setIsOpen(false)
        }
    }

    return (
        <div className="relative" ref={wrapperRef}>
            {/* Bell Icon */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Notificaciones"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold text-white bg-red-500 border-2 border-white rounded-full px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-[9999] animate-in slide-in-from-top-2">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-gray-800">Notificaciones</h3>
                        <div className="flex gap-2">
                            {unreadCount > 0 && (
                                <button onClick={markAllAsRead} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition" title="Marcar todas como leídas">
                                    <Check size={16} />
                                </button>
                            )}
                            {notifications.length > 0 && (
                                <button onClick={clearAll} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition" title="Limpiar todas">
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="max-h-[70vh] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 flex flex-col items-center justify-center">
                                <Bell size={32} className="mb-2 opacity-50" />
                                <p className="text-sm">No tienes notificaciones nuevas</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleNotificationClick(notif)}
                                        className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 ${!notif.read ? 'bg-blue-50/30' : ''}`}
                                    >
                                        <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!notif.read ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                            {getIcon(notif.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${!notif.read ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                {notif.title}
                                            </p>
                                            <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                                                {notif.message}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-1 font-medium">
                                                {formatDistanceToNow(new Date(notif.timestamp), { addSuffix: true, locale: es })}
                                            </p>
                                        </div>
                                        {!notif.read && (
                                            <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 shrink-0"></div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    {notifications.length > 0 && (
                        <div className="p-2 border-t border-gray-100 bg-gray-50 text-center">
                            <button onClick={() => { setIsOpen(false); navigate('/transfers'); }} className="text-xs font-bold text-blue-600 hover:text-blue-800 transition py-1">
                                Ver Panel Completo
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
