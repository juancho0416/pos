import { useState, useEffect } from 'react'
import { Lock, Unlock, KeyRound, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

// Hashea un PIN con SHA-256 para guardarlo seguro en localStorage
async function hashPin(pin) {
    const encoder = new TextEncoder()
    const data = encoder.encode(String(pin))
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function LockScreen() {
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [showSetPin, setShowSetPin] = useState(false)
    const [newPin, setNewPin] = useState('')
    const [confirmPin, setConfirmPin] = useState('')
    const { unlock, profile } = useAuth()

    const hasPinConfigured = !!localStorage.getItem('pos_pin_hash')

    // Si no hay PIN configurado, mostrar flujo de configuración
    useEffect(() => {
        if (!hasPinConfigured) setShowSetPin(true)
    }, [hasPinConfigured])

    const handleUnlock = async (e) => {
        e.preventDefault()
        setLoading(true)
        const ok = await unlock(pin)
        if (!ok) {
            setError('PIN incorrecto')
            setPin('')
            if (navigator.vibrate) navigator.vibrate(200)
        }
        setLoading(false)
    }

    const handleSetPin = async (e) => {
        e.preventDefault()
        if (newPin.length !== 4) { setError('El PIN debe ser de 4 dígitos'); return }
        if (newPin !== confirmPin) { setError('Los PINs no coinciden'); return }
        const hash = await hashPin(newPin)
        localStorage.setItem('pos_pin_hash', hash)
        setShowSetPin(false)
        setError('')
        setNewPin('')
        setConfirmPin('')
    }

    const switchUser = () => {
        localStorage.removeItem('auth_user')
        localStorage.removeItem('pos_is_locked')
        localStorage.removeItem('auth_profile')
        window.location.href = '/login'
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px]"></div>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] shadow-2xl w-full max-w-sm relative z-10 animate-in fade-in zoom-in duration-500">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-slate-800 rounded-full mx-auto border-4 border-slate-700 flex items-center justify-center mb-4 shadow-inner">
                        {showSetPin ? <Settings className="text-blue-400" size={36} /> : <Lock className="text-slate-400" size={36} />}
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight mb-1">
                        {showSetPin ? 'Configurar PIN de Caja' : 'Caja Bloqueada'}
                    </h1>
                    <p className="text-slate-400 text-sm font-medium">
                        {showSetPin ? 'Define un PIN de 4 dígitos para desbloquear la caja' : 'Reingresa tu PIN para continuar'}
                    </p>
                    {profile?.nombre && !showSetPin && (
                        <div className="mt-4 inline-block bg-blue-500/20 text-blue-300 px-4 py-1.5 rounded-full text-sm font-bold border border-blue-500/30">
                            👤 {profile.nombre}
                        </div>
                    )}
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-6 text-sm text-center font-bold">
                        {error}
                    </div>
                )}

                {/* ── Flujo de configuración de PIN ── */}
                {showSetPin ? (
                    <form onSubmit={handleSetPin} className="space-y-4">
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input
                                type="password"
                                value={newPin}
                                onChange={e => { setError(''); setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4)) }}
                                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-[1em] font-mono text-xl"
                                placeholder="Nuevo PIN"
                                required
                                autoFocus
                            />
                        </div>
                        <div className="relative">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input
                                type="password"
                                value={confirmPin}
                                onChange={e => { setError(''); setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4)) }}
                                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-[1em] font-mono text-xl"
                                placeholder="Confirmar PIN"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={newPin.length < 4 || confirmPin.length < 4}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Settings size={20} />
                            GUARDAR PIN
                        </button>
                        {hasPinConfigured && (
                            <button type="button" onClick={() => { setShowSetPin(false); setError('') }}
                                className="w-full text-slate-400 hover:text-white text-xs font-semibold underline underline-offset-4 transition-colors p-2">
                                Cancelar
                            </button>
                        )}
                    </form>
                ) : (
                    /* ── Flujo de desbloqueo ── */
                    <form onSubmit={handleUnlock} className="space-y-6">
                        <div className="relative group">
                            <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                            <input
                                type="password"
                                value={pin}
                                onChange={e => { setError(''); setPin(e.target.value.replace(/\D/g, '').slice(0, 4)) }}
                                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center tracking-[1em] font-mono text-xl"
                                placeholder="••••"
                                required
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={pin.length < 4 || loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
                        >
                            <Unlock size={20} />
                            {loading ? 'Verificando...' : 'DESBLOQUEAR PANTALLA'}
                        </button>

                        <div className="flex flex-col gap-2 pt-2">
                            <button type="button" onClick={() => { setShowSetPin(true); setError('') }}
                                className="w-full text-slate-500 hover:text-slate-300 text-xs font-semibold transition-colors p-1">
                                🔑 Cambiar PIN
                            </button>
                            <button type="button" onClick={switchUser}
                                className="w-full text-slate-400 hover:text-white text-xs font-semibold underline underline-offset-4 transition-colors p-2">
                                Cambiar de Usuario (Cerrar Sesión Real)
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}
