import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMayoristaStore } from '../../stores/useMayoristaStore'
import { supabase } from '../../supabaseClient'

export default function MayoristaLogin() {
    const [rfc, setRfc] = useState('')
    const [password, setPassword] = useState('')
    const login = useMayoristaStore(state => state.login)
    const navigate = useNavigate()

    const handleLogin = async (e) => {
        e.preventDefault()

        try {
            // Buscamos al cliente en la base de datos por su RFC y rol MAYORISTA
            const { data: cliente, error } = await supabase
                .from('clientes')
                .select('*')
                .eq('rfc', rfc.trim().toUpperCase())
                .eq('rol', 'MAYORISTA')
                .single()

            if (error || !cliente) {
                alert('Credenciales inválidas o cuenta no corporativa.')
                return
            }

            // En un entorno real, la contraseña se validaría con Supabase Auth (auth.users).
            // Por ahora, validamos con su existencia en la taba `clientes`.
            login(cliente, 'auth-token-' + cliente.id)
            navigate('/mayoristas/catalogo')

        } catch (err) {
            console.error('Login error:', err)
            alert('Error al intentar iniciar sesión.')
        }
    }

    return (
        <div className="min-h-[70vh] flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-100">
                <div className="text-center mb-8">
                    <img src="/icons/logogfc.png" alt="Logo" className="w-20 h-20 mx-auto mb-4 object-contain" />
                    <h2 className="text-2xl font-bold text-slate-800">Acceso a Mayoristas</h2>
                    <p className="text-sm text-slate-500 mt-2">Ingresa con tus credenciales corporativas</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">RFC o ID de Cliente</label>
                        <input
                            type="text"
                            value={rfc}
                            onChange={(e) => setRfc(e.target.value.toUpperCase())}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors uppercase"
                            placeholder="Ej. DEMO123"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 focus:ring-4 focus:ring-indigo-200 transition-all shadow-md shadow-indigo-100"
                    >
                        Ingresar al Portal
                    </button>
                </form>
            </div>
        </div>
    )
}
