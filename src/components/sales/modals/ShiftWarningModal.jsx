import { X, Lock, Unlock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'

export default function ShiftWarningModal({ showShiftWarning, setShowShiftWarning }) {
    const navigate = useNavigate()
    const { branches, selectedBranch } = useAuth()

    if (!showShiftWarning) return null

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md transition-all duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-[90%] max-w-sm p-8 text-center border border-white/50 animate-in zoom-in duration-300 relative">
                <button onClick={() => setShowShiftWarning(false)} className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 p-2"><X size={24} /></button>
                <div className="bg-red-50 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner"><Lock className="text-red-500" size={40} /></div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">Acción Bloqueada</h2>
                <p className="text-slate-500 mb-8 leading-relaxed font-medium text-sm">Turno cerrado en <span className="font-bold text-slate-700">{branches.find(b => b.id === selectedBranch)?.nombre}</span>.</p>
                <div className="space-y-3">
                    <button onClick={() => navigate('/cash-close')} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"><Unlock size={20} /> ABRIR TURNO</button>
                    <button onClick={() => setShowShiftWarning(false)} className="text-slate-400 font-bold text-xs underline decoration-slate-300 hover:decoration-slate-500 underline-offset-4">Solo consultar</button>
                </div>
            </div>
        </div>
    )
}
