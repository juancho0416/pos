/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext()

export function AuthProvider({ children }) {
    // ─── Estado Central ───
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [branches, setBranches] = useState([])
    const [selectedBranch, setSelectedBranch] = useState('')
    const [loading, setLoading] = useState(true)

    // ★ BANDERA OPTIMISTIC RENDERING (Anti-Flicker)
    const isTacticalReload = sessionStorage.getItem('tactical_reload') === 'true'

    // ★ BANDERA: Una vez que loading pasa a false, NUNCA vuelve a true
    const bootedRef = useRef(false)
    const safeSetLoading = useCallback((val) => {
        if (val === false) {
            bootedRef.current = true
            setLoading(false)
        }
        // Si val === true Y ya booteamos → IGNORAR
        // loading solo es true al abrir la app por primera vez
        if (val === true && !bootedRef.current) {
            setLoading(true)
        }
    }, [])

    // ─── Limpieza del Flag de Recarga Táctica ───
    useEffect(() => {
        if (isTacticalReload) {
            // Limpiamos la bandera a los 3 segundos.
            // Así, si el usuario hace un F5 manual mañana, sí verá la pantalla de carga normal.
            const timer = setTimeout(() => sessionStorage.removeItem('tactical_reload'), 3000);
            return () => clearTimeout(timer);
        }
    }, [isTacticalReload])

    // ─── Cargar Perfil desde Supabase ───
    const loadProfile = useCallback(async (userId, email) => {
        try {
            // ★ OFFLINE-FIRST: Si no hay red, salta la espera y va directo al caché
            if (!navigator.onLine) {
                const cached = localStorage.getItem('auth_profile')
                if (cached) {
                    const parsed = JSON.parse(cached)
                    setProfile(parsed)
                    return parsed
                }
            }

            const { data } = await supabase
                .from('perfiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (data) {
                setProfile(data)
                localStorage.setItem('auth_profile', JSON.stringify(data))
                return data
            }
        } catch (err) {
            console.error("Error cargando perfil:", err)
            const cached = localStorage.getItem('auth_profile')
            if (cached) {
                const p = JSON.parse(cached)
                setProfile(p)
                return p
            }
        }

        // FALLBACK: nunca null — SIN email hardcodeado (evita backdoor de seguridad)
        const fallback = {
            nombre: email?.split('@')[0] || 'Usuario',
            rol: 'vendedor',  // Siempre el rol mínimo como fallback offline
            sucursal_id: null
        }
        setProfile(fallback)
        localStorage.setItem('auth_profile', JSON.stringify(fallback))
        return fallback
    }, [])

    // ─── Cargar Sucursales ───
    const loadBranches = useCallback(async (profileData) => {
        try {
            if (!navigator.onLine) {
                const cachedBranches = localStorage.getItem('auth_branches')
                if (cachedBranches) {
                    setBranches(JSON.parse(cachedBranches))
                    return
                }
            }

            const { data: bData } = await supabase.from('sucursales').select('*').order('id')
            if (bData && bData.length > 0) {
                setBranches(bData)
                localStorage.setItem('auth_branches', JSON.stringify(bData))

                const cached = localStorage.getItem('selected_branch')

                if (profileData?.rol === 'vendedor' && profileData?.sucursal_id) {
                    setSelectedBranch(profileData.sucursal_id.toString())
                    localStorage.setItem('selected_branch', profileData.sucursal_id.toString())
                } else if (cached) {
                    setSelectedBranch(cached)
                } else {
                    const first = bData[0].id.toString()
                    setSelectedBranch(first)
                    localStorage.setItem('selected_branch', first)
                }
            }
        } catch (err) {
            console.error("Error cargando sucursales:", err)
            const cachedBranches = localStorage.getItem('auth_branches')
            if (cachedBranches) {
                setBranches(JSON.parse(cachedBranches))
            }
        }
    }, [])

    // ─── Sign In / Sign Out ───
    const signIn = useCallback(async (email, password) => {
        try {
            const emailLower = email.trim().toLowerCase()
            const { data, error } = await supabase.auth.signInWithPassword({
                email: emailLower,
                password
            })
            if (error) throw error
            localStorage.removeItem('pos_is_locked') // Por si acaso
        } catch (e) {
            console.error("🔴 [AUTH ERROR FATAL]:", e)
            throw new Error(e.message || "Error desconocido al Iniciar Sesión.")
        }
    }, [])

    const unlock = useCallback(async (pin) => {
        // Verificar PIN contra el hash guardado en localStorage
        const storedHash = localStorage.getItem('pos_pin_hash')

        if (!storedHash) {
            // Sin PIN configurado: permitir acceso pero avisar
            console.warn('[LockScreen] Sin PIN configurado — desbloqueando sin verificación')
            localStorage.removeItem('pos_is_locked')
            window.location.href = '/sales'
            return true
        }

        // Hashear el PIN ingresado con SHA-256 y comparar
        try {
            const encoder = new TextEncoder()
            const data = encoder.encode(String(pin))
            const hashBuffer = await crypto.subtle.digest('SHA-256', data)
            const hashArray = Array.from(new Uint8Array(hashBuffer))
            const inputHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

            if (inputHash === storedHash) {
                localStorage.removeItem('pos_is_locked')
                window.location.href = '/sales'
                return true
            } else {
                return false  // PIN incorrecto — el caller maneja el error
            }
        } catch {
            // Fallo del crypto API (nunca debería pasar) — fail-safe: bloquear
            return false
        }
    }, [])

    const signOut = useCallback(async () => {
        // ★ SOFT LOGOUT (LOCK SCREEN)
        // No cerramos sesión en Supabase para no romper la capacidad Offline a futuro
        try {
            localStorage.setItem('pos_is_locked', 'true')
            window.location.href = '/lock-screen'
        } catch (error) {
            console.error("Error al bloquear:", error)
        }
    }, [])

    // ─── Cambiar Sucursal ───
    const changeBranch = useCallback((branchId) => {
        setSelectedBranch(branchId)
        localStorage.setItem('selected_branch', branchId.toString())
    }, [])

    // ════════════════════════════════════════════════════════════
    // EFECTO PRINCIPAL: Simple, directo, sin listeners de tab
    // ════════════════════════════════════════════════════════════
    useEffect(() => {
        let isMounted = true

        const bootstrap = async () => {
            // PASO 1: Cache = UI instantánea
            try {
                const cachedUser = localStorage.getItem('auth_user')
                const cachedProfile = localStorage.getItem('auth_profile')
                const cachedBranch = localStorage.getItem('selected_branch')

                if (cachedUser && cachedProfile) {
                    setUser(JSON.parse(cachedUser))
                    setProfile(JSON.parse(cachedProfile))
                    if (cachedBranch) setSelectedBranch(cachedBranch)
                    // ★ App visible DE INMEDIATO
                    if (isMounted) safeSetLoading(false)
                }
            } catch (e) {
                console.error('Error leyendo cache:', e)
            }

            // PASO 2: Validar sesión en segundo plano (silencioso)
            try {
                const { data: { session } } = await supabase.auth.getSession()

                if (session && isMounted) {
                    localStorage.setItem('auth_user', JSON.stringify(session.user))
                    setUser(session.user)
                    const profileData = await loadProfile(session.user.id, session.user.email)
                    await loadBranches(profileData)
                } else if (!session && isMounted) {
                    setUser(null)
                    setProfile(null)
                    setBranches([])
                    setSelectedBranch('')
                    localStorage.removeItem('auth_user')
                    localStorage.removeItem('auth_profile')
                    localStorage.removeItem('selected_branch')
                }
            } catch (e) {
                // ★ Error silencioso: si la red falla, el cache ya nos salvó
                console.error('Error validando sesión (silencioso):', e)
            }

            // PASO 3: SIEMPRE apagar loading
            if (isMounted) safeSetLoading(false)
        }
        bootstrap()

        // ─── Auth Listener: MÍNIMO, sin mutar estados masivos ───
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (!isMounted) return

            try {
                if (event === 'SIGNED_IN') {
                    setUser(session.user)
                    localStorage.setItem('auth_user', JSON.stringify(session.user))
                    const profileData = await loadProfile(session.user.id, session.user.email)
                    await loadBranches(profileData)
                    if (isMounted) safeSetLoading(false)
                } else if (event === 'TOKEN_REFRESHED') {
                    // ★ SILENCIO ABSOLUTO: solo localStorage, CERO setUser/setState
                    if (session) {
                        localStorage.setItem('auth_user', JSON.stringify(session.user))
                    }
                } else if (event === 'SIGNED_OUT') {
                    setUser(null)
                    setProfile(null)
                    setBranches([])
                    setSelectedBranch('')
                    localStorage.removeItem('auth_user')
                    // Dejamos auth_profile y la bóveda para el modo offline
                    localStorage.removeItem('selected_branch')
                    if (isMounted) safeSetLoading(false)
                }
                // Cualquier otro evento (INITIAL_SESSION, USER_UPDATED): IGNORAR
            } catch (err) {
                // ★ Aislamiento: errores de Supabase al volver de pestaña = console.error SOLAMENTE
                console.error(`Auth event error [${event}]:`, err)
            }
        })

        return () => {
            isMounted = false
            subscription.unsubscribe()
        }
    }, [loadProfile, loadBranches, safeSetLoading])

    // ════════════════════════════════════════════════════════════
    // MEMOIZAR VALUE
    // ════════════════════════════════════════════════════════════
    const authValue = useMemo(() => ({
        user,
        profile,
        branches,
        selectedBranch,
        changeBranch,
        loading,
        signIn,
        signOut,
        unlock
    }), [user, profile, branches, selectedBranch, changeBranch, loading, signIn, signOut, unlock])

    // EL TRUCO VISUAL (Optimistic Rendering):
    // Si está cargando, PERO es un reload táctico, NO mostramos la pantalla de bloqueo.
    // Renderizamos los {children} directamente porque sabemos que la sesión en LocalStorage es super válida.

    const shouldShowLoading = loading && !isTacticalReload;

    return (
        <AuthContext.Provider value={authValue}>
            {shouldShowLoading ? (
                <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-slate-500 font-bold">Verificando acceso...</p>
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)