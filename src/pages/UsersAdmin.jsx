import { useAuth } from '../context/AuthContext'
import { useUsersAdmin } from '../hooks/useUsersAdmin'
import {
    Users, Shield, Key, MapPin, Search, Star, Trophy,
    Loader2, CheckCircle, AlertCircle, UserPlus, RefreshCw, Edit2, X, Save
} from 'lucide-react'

export default function UsersAdmin() {
    const { user, profile, loading: authLoading } = useAuth()
    const {
        users: filteredUsers, branches, loading, topSeller,
        processingId, notification, showModal, setShowModal, editingUser,
        formData, setFormData, searchTerm, setSearchTerm,
        fetchData, handleUpdateBranch, handleResetPassword,
        handleOpenCreate, handleOpenEdit, handleSaveUser,
    } = useUsersAdmin(profile, authLoading)

    if (authLoading || loading) return (
        <div className="flex h-screen flex-col items-center justify-center bg-slate-50 gap-4">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Sincronizando Equipo...</p>
        </div>
    )

    return (
        <div className="p-4 sm:p-8 bg-slate-50 min-h-screen font-sans">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                    <div>
                        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <div className="bg-blue-600 p-2 rounded-xl text-white"><Users size={24} /></div>
                            Gestión de Personal
                        </h1>
                        <p className="text-slate-400 text-sm mt-1">Control de accesos y sucursales para tus 5 empleados.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={fetchData} className="p-3 text-slate-400 hover:text-blue-600 transition-colors rounded-xl hover:bg-slate-50"><RefreshCw size={20} /></button>
                        <button onClick={handleOpenCreate} className="px-5 py-3 bg-slate-900 text-slate-50 font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-900/10 flex items-center gap-2 active:scale-95">
                            <UserPlus size={18} /><span>Nuevo Empleado</span>
                        </button>
                    </div>
                </div>

                {/* Notification */}
                {notification && (
                    <div className={`fixed top-5 right-5 z-[100] px-6 py-4 rounded-2xl shadow-2xl border animate-in slide-in-from-right-10 flex items-center gap-3 font-bold ${notification.type === 'error' ? 'bg-red-600 text-white border-red-500' : 'bg-green-600 text-white border-green-500'}`}>
                        {notification.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
                        {notification.msg}
                    </div>
                )}

                {/* Search */}
                <div className="relative group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input type="text" placeholder="Buscar empleado por nombre..." className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 focus:bg-white transition-all font-medium" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>

                {/* Table */}
                {filteredUsers.length === 0 ? (
                    <div className="bg-white rounded-[2.5rem] p-10 text-center shadow-xl border border-slate-200/60 flex flex-col items-center justify-center gap-4">
                        <div className="bg-slate-100 p-6 rounded-full"><Users size={40} className="text-slate-300" /></div>
                        <div>
                            <h3 className="text-xl font-black text-slate-700">Aún no tienes empleados registrados</h3>
                            <p className="text-slate-400 mt-2">Usa el botón "Nuevo Empleado" para comenzar a armar tu equipo.</p>
                        </div>
                        <button onClick={handleOpenCreate} className="mt-4 px-6 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-colors">Agregar Primero</button>
                    </div>
                ) : (
                    <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200/60 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 border-b border-slate-100">
                                    <tr>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Empleado</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargo</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Sucursal Actual</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredUsers.map((u) => (
                                        <tr key={u.id} className="hover:bg-blue-50/30 transition-colors">
                                            <td className="p-6">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg ${u.rol === 'admin' ? 'bg-gradient-to-br from-indigo-600 to-purple-600' : 'bg-gradient-to-br from-blue-500 to-cyan-500'}`}>
                                                        {u.nombre?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <p className="font-bold text-slate-800 text-sm">{u.nombre}</p>
                                                            <button onClick={() => handleOpenEdit(u)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-blue-500 transition-colors" title="Editar Nombre"><Edit2 size={12} /></button>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 font-mono">{u.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter border ${u.rol === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>{u.rol}</span>
                                            </td>
                                            <td className="p-6">
                                                <div className="relative max-w-[180px]">
                                                    <select className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-blue-500 focus:bg-white transition-all appearance-none cursor-pointer" value={u.sucursal_id || ''} onChange={(e) => handleUpdateBranch(u.id, e.target.value)} disabled={processingId === u.id}>
                                                        <option value="">🏠 Sin Asignar</option>
                                                        {branches.map(b => (<option key={b.id} value={b.id}>{b.nombre}</option>))}
                                                    </select>
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                        {processingId === u.id ? <Loader2 size={14} className="animate-spin" /> : '▼'}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-6 text-right">
                                                <button onClick={() => handleResetPassword(u.id)} className="bg-slate-100 text-slate-500 p-2.5 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all active:scale-90" title="Resetear Clave"><Key size={18} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-slate-800">{editingUser ? 'Editar Empleado' : 'Nuevo Empleado'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} className="text-slate-400" /></button>
                        </div>
                        <form onSubmit={handleSaveUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nombre Completo</label>
                                <input required type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:border-blue-500 focus:bg-white outline-none transition-all" value={formData.nombre} onChange={e => setFormData({ ...formData, nombre: e.target.value })} />
                            </div>
                            {!editingUser && (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email</label>
                                        <input required type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:border-blue-500 focus:bg-white outline-none transition-all" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Contraseña Inicial</label>
                                        <input required type="password" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:border-blue-500 focus:bg-white outline-none transition-all" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Rol</label>
                                        <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 focus:border-blue-500 focus:bg-white outline-none transition-all appearance-none" value={formData.rol} onChange={e => setFormData({ ...formData, rol: e.target.value })}>
                                            <option value="vendedor">Vendedor</option>
                                            <option value="admin">Administrador</option>
                                        </select>
                                    </div>
                                </>
                            )}
                            <button type="submit" disabled={processingId === 'saving'} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 mt-4">
                                {processingId === 'saving' && <Loader2 className="animate-spin" />}
                                {editingUser ? 'Guardar Cambios' : 'Registrar Empleado'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}