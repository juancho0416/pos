// RoleGuard.jsx — Componente de protección de rutas por rol
// Si el usuario no tiene el rol requerido, redirige a /sales con alerta.
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'sonner'
import { useEffect, useRef } from 'react'

export default function RoleGuard({ allowedRoles = [], children }) {
    const { profile, loading } = useAuth()
    const location = useLocation()
    const hasAlerted = useRef(false)

    const currentRole = profile?.rol || 'vendedor'
    const isAllowed = allowedRoles.length === 0 || allowedRoles.includes(currentRole)

    useEffect(() => {
        // Mostrar alerta solo una vez al intentar acceder
        if (!loading && !isAllowed && !hasAlerted.current) {
            hasAlerted.current = true
            toast.error('🔒 Acceso Denegado', {
                description: `No tienes permisos para acceder a ${location.pathname}. Contacta a un administrador.`,
                duration: 4000,
            })
        }
    }, [loading, isAllowed, location.pathname])

    // Mientras carga la sesión, no flash — simplemente no renderizar nada
    if (loading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        )
    }

    // Si no tiene permisos, redirigir a ventas
    if (!isAllowed) {
        return <Navigate to="/sales" replace />
    }

    return children
}
