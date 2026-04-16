import { useState } from 'react'
import { Plus, Search, Truck, Edit2, Trash2, X, Save, Loader2, Phone, Mail, MapPin, CreditCard } from 'lucide-react'
import { useQuery } from '@powersync/react'
import { powersync } from '../powersync/db'
import { useAuth } from '../context/AuthContext'
import { toast } from 'sonner'

const EMPTY = {
    nombre: '', rfc: '', telefono: '', correo: '', direccion: '',
    dias_credito: 0, limite_credito: 0,
}

const Field = ({ label, icon: Icon, children }) => (
    <div className="space-y-1.5">
        <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400">
            {Icon && <Icon size={12} />} {label}
        </label>
        {children}
    </div>
)
const inp = 'w-full bg-white border border-slate-200 text-slate-800 rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-colors'

function ProveedorModal({ proveedor, onClose, onSaved }) {
    const { selectedBranch } = useAuth()
    const [form, setForm] = useState(proveedor ? { ...EMPTY, ...proveedor } : { ...EMPTY })
    const [saving, setSaving] = useState(false)
    const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }))
    const fn = (field) => (e) => setForm(p => ({ ...p, [field]: parseFloat(e.target.value) || 0 }))

    const handleSave = async () => {
        if (!form.nombre?.trim()) { toast.error('El nombre del proveedor es requerido.'); return }
        setSaving(true)
        try {
            if (proveedor?.id) {
                await powersync.execute(
                    `UPDATE proveedores SET nombre=?, rfc=?, telefono=?, correo=?, direccion=?,
                        dias_credito=?, limite_credito=?, updated_at=datetime('now') WHERE id=?`,
                    [form.nombre, form.rfc || null, form.telefono || null, form.correo || null,
                     form.direccion || null, form.dias_credito || 0, form.limite_credito || 0, proveedor.id]
                )
                toast.success('Proveedor actualizado')
            } else {
                await powersync.execute(
                    `INSERT INTO proveedores (id, nombre, rfc, telefono, correo, direccion, dias_credito, limite_credito, saldo_pendiente, sucursal_id, is_deleted, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 0, datetime('now'), datetime('now'))`,
                    [crypto.randomUUID(), form.nombre, form.rfc || null, form.telefono || null,
                     form.correo || null, form.direccion || null, form.dias_credito || 0, form.limite_credito || 0, selectedBranch || null]
                )
                toast.success('Proveedor creado')
            }
            onSaved?.()
            onClose()
        } catch (err) {
            console.error(err)
            toast.error('Error al guardar el proveedor.')
        } finally { setSaving(false) }
    }

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50 rounded-t-3xl">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-blue-100 rounded-2xl flex items-center justify-center">
                            <Truck className="text-blue-600" size={18} />
                        </div>
                        <h2 className="text-base font-black text-slate-800">
                            {proveedor?.id ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 text-slate-400 rounded-xl">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Field label="Nombre / Razón Social *">
                                <input className={inp} value={form.nombre} onChange={f('nombre')} placeholder="Distribuidora XYZ S.A." autoFocus />
                            </Field>
                        </div>
                        <Field label="RFC" icon={CreditCard}>
                            <input className={inp} value={form.rfc || ''} onChange={f('rfc')} placeholder="XAXX010101000" />
                        </Field>
                        <Field label="Teléfono" icon={Phone}>
                            <input className={inp} value={form.telefono || ''} onChange={f('telefono')} placeholder="81 1234 5678" />
                        </Field>
                        <div className="col-span-2">
                            <Field label="Correo" icon={Mail}>
                                <input type="email" className={inp} value={form.correo || ''} onChange={f('correo')} placeholder="contacto@proveedor.com" />
                            </Field>
                        </div>
                        <div className="col-span-2">
                            <Field label="Dirección" icon={MapPin}>
                                <input className={inp} value={form.direccion || ''} onChange={f('direccion')} placeholder="Calle, Colonia, Ciudad" />
                            </Field>
                        </div>
                        <Field label="Días de Crédito">
                            <input type="number" min="0" className={inp} value={form.dias_credito || 0} onChange={fn('dias_credito')} />
                        </Field>
                        <Field label="Límite de Crédito ($)">
                            <input type="number" min="0" className={inp} value={form.limite_credito || 0} onChange={fn('limite_credito')} />
                        </Field>
                    </div>
                </div>

                <div className="flex justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-3xl">
                    <button onClick={onClose} className="px-5 py-2.5 text-slate-600 font-bold bg-white border border-slate-200 rounded-2xl hover:bg-slate-50">
                        Cancelar
                    </button>
                    <button onClick={handleSave} disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all disabled:opacity-50">
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        {saving ? 'Guardando...' : proveedor?.id ? 'Guardar Cambios' : 'Crear Proveedor'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function Proveedores() {
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [editing, setEditing] = useState(null)

    const { data: proveedores = [] } = useQuery(
        `SELECT * FROM proveedores WHERE is_deleted = 0 OR is_deleted IS NULL ORDER BY nombre ASC`
    )

    const filtered = proveedores.filter(p =>
        !search ||
        (p.nombre || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.rfc || '').toLowerCase().includes(search.toLowerCase())
    )

    const handleDelete = async (id, nombre) => {
        if (!window.confirm(`¿Eliminar a "${nombre}"?`)) return
        try {
            await powersync.execute(`UPDATE proveedores SET is_deleted = 1, updated_at = datetime('now') WHERE id = ?`, [id])
            toast.success('Proveedor eliminado.')
        } catch { toast.error('Error al eliminar.') }
    }

    const openEdit = (p) => { setEditing(p); setShowModal(true) }
    const openNew = () => { setEditing(null); setShowModal(true) }

    return (
        <div className="flex flex-col flex-1 overflow-hidden bg-slate-100">
            {/* Top Bar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shadow-sm shrink-0">
                <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center">
                    <Truck className="text-orange-600" size={24} />
                </div>
                <div className="flex-1">
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">Proveedores</h1>
                    <p className="text-xs font-bold text-slate-400">{proveedores.length} proveedores registrados</p>
                </div>
                <button onClick={openNew}
                    className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-black px-5 py-3 rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all">
                    <Plus size={18} /> Nuevo Proveedor
                </button>
            </div>

            <div className="flex-1 overflow-auto p-4 lg:p-6 space-y-4">
                {/* Search */}
                <div className="relative max-w-md">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar por nombre o RFC..."
                        className="w-full bg-white border border-slate-200 text-slate-800 rounded-2xl pl-10 pr-4 py-2.5 font-bold text-sm focus:outline-none focus:border-orange-500 shadow-sm" />
                </div>

                {/* Table */}
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                    {filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-300 gap-4">
                            <Truck size={56} />
                            <p className="font-bold text-slate-400 text-center">
                                {search ? 'Sin coincidencias' : 'Sin proveedores registrados'}<br />
                                <span className="text-sm font-medium">Da de alta tu primer proveedor para usarlo en compras.</span>
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-sm border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="py-3 px-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Proveedor</th>
                                    <th className="py-3 px-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">RFC</th>
                                    <th className="py-3 px-5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Contacto</th>
                                    <th className="py-3 px-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Crédito</th>
                                    <th className="py-3 px-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Límite</th>
                                    <th className="py-3 px-5 w-24"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {filtered.map(p => (
                                    <tr key={p.id} className="hover:bg-orange-50/20 group transition-colors">
                                        <td className="py-4 px-5">
                                            <p className="font-bold text-slate-800">{p.nombre}</p>
                                            {p.direccion && <p className="text-xs text-slate-400 mt-0.5">{p.direccion}</p>}
                                        </td>
                                        <td className="py-4 px-5">
                                            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                                                {p.rfc || '—'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 text-slate-500 text-sm">
                                            <div className="space-y-0.5">
                                                {p.telefono && <p>📞 {p.telefono}</p>}
                                                {p.correo && <p className="text-xs">✉️ {p.correo}</p>}
                                            </div>
                                        </td>
                                        <td className="py-4 px-5 text-center">
                                            <span className={`text-xs font-black px-2.5 py-1 rounded-lg ${p.dias_credito > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {p.dias_credito > 0 ? `${p.dias_credito} días` : 'Contado'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-5 text-center font-bold text-slate-700">
                                            {p.limite_credito > 0 ? `$${parseFloat(p.limite_credito).toLocaleString('es-MX')}` : '—'}
                                        </td>
                                        <td className="py-4 px-5">
                                            <div className="flex justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => openEdit(p)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors">
                                                    <Edit2 size={15} />
                                                </button>
                                                <button onClick={() => handleDelete(p.id, p.nombre)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {showModal && (
                <ProveedorModal
                    proveedor={editing}
                    onClose={() => { setShowModal(false); setEditing(null) }}
                    onSaved={() => { setShowModal(false); setEditing(null) }}
                />
            )}
        </div>
    )
}
