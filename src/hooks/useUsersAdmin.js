import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

/**
 * Hook que encapsula toda la lógica CRUD de administración de usuarios.
 */
export function useUsersAdmin(profile, authLoading) {
    const navigate = useNavigate()

    const [users, setUsers] = useState(() => {
        const cached = localStorage.getItem('users_admin_list')
        return cached ? JSON.parse(cached).users : []
    })
    const [branches, setBranches] = useState(() => {
        const cached = localStorage.getItem('users_admin_list')
        return cached ? JSON.parse(cached).branches : []
    })
    const [loading, setLoading] = useState(users.length === 0)
    const [searchTerm, setSearchTerm] = useState('')
    const [topSeller, setTopSeller] = useState(null)
    const [processingId, setProcessingId] = useState(null)
    const [notification, setNotification] = useState(null)
    const [showModal, setShowModal] = useState(false)
    const [editingUser, setEditingUser] = useState(null)
    const [formData, setFormData] = useState({ nombre: '', email: '', password: '', rol: 'vendedor' })

    const showNotification = useCallback((msg, type = 'success') => {
        setNotification({ msg, type })
        setTimeout(() => setNotification(null), 3000)
    }, [])

    const fetchData = useCallback(async () => {
        if (users.length === 0) setLoading(true)
        try {
            const { data: usersData, error: uError } = await supabase
                .from('perfiles').select(`*, sucursales (id, nombre)`).order('nombre')
            if (uError) throw uError

            const { data: bData } = await supabase.from('sucursales').select('*')
            setUsers(usersData || [])
            setBranches(bData || [])
            localStorage.setItem('users_admin_list', JSON.stringify({ users: usersData || [], branches: bData || [] }))

            try {
                const { data: topData } = await supabase.from('vendedor_estrella').select('*').limit(1).maybeSingle()
                if (topData) setTopSeller(topData)
            } catch { /* Vista no disponible */ }
        } catch (error) {
            console.error("Error cargando datos de admin:", error)
            showNotification('Error al cargar la lista de equipo', 'error')
        } finally {
            setLoading(false)
        }
    }, [showNotification])

    useEffect(() => {
        if (!authLoading) {
            if (!profile || profile.rol !== 'admin') {
                console.warn("Acceso denegado: Se requiere rol de administrador")
                navigate('/sales')
            } else {
                fetchData()
            }
        }
    }, [profile, authLoading, navigate, fetchData])

    const handleUpdateBranch = useCallback(async (userId, newBranchId) => {
        setProcessingId(userId)
        try {
            const { error } = await supabase.from('perfiles').update({ sucursal_id: newBranchId || null }).eq('id', userId)
            if (error) throw error
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, sucursal_id: newBranchId, sucursales: branches.find(b => b.id === newBranchId) } : u))
            showNotification('Sucursal asignada correctamente')
        } catch { showNotification('Error al actualizar', 'error') }
        finally { setProcessingId(null) }
    }, [branches, showNotification])

    const handleResetPassword = useCallback(async (userId) => {
        if (!confirm('¿Resetear contraseña a "ferre1234"?')) return
        setProcessingId(userId)
        try {
            const { error } = await supabase.rpc('admin_reset_password', { p_user_id: userId, p_new_password: 'ferre1234' })
            if (error) throw error
            showNotification('Clave reseteada: ferre1234')
        } catch { showNotification('Error: No se pudo resetear la clave', 'error') }
        finally { setProcessingId(null) }
    }, [showNotification])

    const handleOpenCreate = useCallback(() => {
        setEditingUser(null)
        setFormData({ nombre: '', email: '', password: '', rol: 'vendedor' })
        setShowModal(true)
    }, [])

    const handleOpenEdit = useCallback((user) => {
        setEditingUser(user)
        setFormData({ nombre: user.nombre, email: user.email, password: '', rol: user.rol })
        setShowModal(true)
    }, [])

    const handleSaveUser = useCallback(async (e) => {
        e.preventDefault()
        setProcessingId('saving')
        try {
            if (editingUser) {
                const { error } = await supabase.from('perfiles').update({ nombre: formData.nombre }).eq('id', editingUser.id)
                if (error) throw error
                setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, nombre: formData.nombre } : u))
                showNotification('Nombre actualizado')
                setShowModal(false)
            } else {
                const { error } = await supabase.auth.signUp({
                    email: formData.email, password: formData.password,
                    options: { data: { nombre: formData.nombre, rol: formData.rol } }
                })
                if (error) throw error
                showNotification('¡Empleado registrado! Revisa su email para confirmar.')
                setShowModal(false)
                fetchData()
            }
        } catch (error) {
            console.error(error)
            showNotification('Error: ' + error.message, 'error')
        } finally { setProcessingId(null) }
    }, [editingUser, formData, showNotification, fetchData])

    const filteredUsers = users.filter(u =>
        u.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.rol?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return {
        users: filteredUsers, branches, loading, topSeller,
        processingId, notification, showModal, setShowModal, editingUser,
        formData, setFormData, searchTerm, setSearchTerm,
        fetchData, handleUpdateBranch, handleResetPassword,
        handleOpenCreate, handleOpenEdit, handleSaveUser,
    }
}
