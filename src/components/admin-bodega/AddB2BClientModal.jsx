import React, { useState } from 'react'
import { PlusCircle, Building, Building2, Phone, Mail, FileText, DollarSign, Loader2 } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { toast } from 'sonner'
import { useAuth } from '../../context/AuthContext'

export default function AddB2BClientModal({ isOpen, onClose, onClientAdded }) {
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        nombre_empresa: '',
        rfc: '',
        nombre_contacto: '',
        telefono: '',
        email: '',
        direccion: '',
        limite_credito: ''
    })

    if (!isOpen) return null

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.nombre_empresa) {
            toast.error("El nombre de la empresa / constructora es obligatorio.")
            return
        }

        setLoading(true)
        toast.loading('Registrando constructora...', { id: 'create_client' })

        try {
            // Resolver el UUID real de la Bodega para evitar errores de tipo en Supabase
            const { data: branchData } = await supabase.from('sucursales').select('id').ilike('nombre', '%Bodega%').limit(1).single()
            const bodegaId = branchData?.id

            const limite = Number(formData.limite_credito) || 0

            const newClient = {
                nombre_empresa: formData.nombre_empresa,
                nombre: formData.nombre_contacto || formData.nombre_empresa, // Fallback si no hay contacto
                rfc: formData.rfc,
                telefono: formData.telefono,
                email: formData.email,
                direccion: formData.direccion,
                limite_credito: limite,
                saldo_deudor: 0,
                rol: 'MAYORISTA', // Forzado estricto
            }

            // Asignar sucursal si se encontró el UUID válido para Bodega
            if (bodegaId) {
                newClient.sucursal_id = bodegaId
            }

            const { data, error } = await supabase
                .from('clientes')
                .insert([newClient])
                .select()
                .single()

            if (error) throw error

            toast.success(`Cliente corporativo ${data.nombre_empresa} dado de alta exitosamente.`, { id: 'create_client' })
            onClientAdded(data) // Refresca lista
            onClose()

        } catch (error) {
            console.error(error)
            toast.error('Ocurrió un error al registrar el cliente.', { id: 'create_client' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
            <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl p-6 md:p-8 flex flex-col max-h-[90vh] overflow-hidden">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            <Building2 className="text-indigo-400 w-6 h-6" /> Alta de Mayorista / Constructora
                        </h3>
                        <p className="text-sm text-slate-400 mt-1">Perfil B2B exclusivo para compras de mayoreo a crédito.</p>
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-2">✕</button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2">
                    <form id="add-client-form" onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-slate-400 mb-1">Nombre de Empresa o Constructora *</label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                    <input
                                        type="text" name="nombre_empresa" required
                                        value={formData.nombre_empresa} onChange={handleChange}
                                        placeholder="Ej. Constructora del Valle S.A. de C.V."
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">RFC</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                    <input
                                        type="text" name="rfc"
                                        value={formData.rfc} onChange={handleChange}
                                        placeholder="R.F.C. Corporativo"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 uppercase"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Contacto Principal (Nombre)</label>
                                <input
                                    type="text" name="nombre_contacto"
                                    value={formData.nombre_contacto} onChange={handleChange}
                                    placeholder="Ej. Ing. Carlos Ruiz"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Teléfono Móvil o Fijo</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                    <input
                                        type="tel" name="telefono"
                                        value={formData.telefono} onChange={handleChange}
                                        placeholder="10 dígitos"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Correo Electrónico (Facturación)</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
                                    <input
                                        type="email" name="email"
                                        value={formData.email} onChange={handleChange}
                                        placeholder="contacto@empresa.com"
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-slate-400 mb-1">Límite de Crédito Autorizado ($)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 w-5 h-5 font-bold" />
                                    <input
                                        type="number" name="limite_credito" required min="0" step="1000"
                                        value={formData.limite_credito} onChange={handleChange}
                                        placeholder="100000"
                                        className="w-full bg-slate-950 border border-emerald-500/30 rounded-lg pl-9 pr-4 py-3 text-white text-lg font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                                    />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Este límite decrecerá automáticamente cuando el cliente realice pedidos B2B.</p>
                            </div>

                            <div className="col-span-1 md:col-span-2">
                                <label className="block text-sm font-medium text-slate-400 mb-1">Dirección de Entrega Fiscal/Principal</label>
                                <textarea
                                    name="direccion" rows="2"
                                    value={formData.direccion} onChange={handleChange}
                                    placeholder="Calle, No. Ext, Colonia, CP, Ciudad"
                                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-indigo-500 resize-none"
                                />
                            </div>
                        </div>
                    </form>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-800 flex gap-4">
                    <button type="button" onClick={onClose} disabled={loading} className="w-1/3 py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50">
                        Cancelar
                    </button>
                    <button type="submit" form="add-client-form" disabled={loading} className="w-2/3 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50">
                        {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Registrando...</> : <><PlusCircle className="w-5 h-5" /> Confirmar Alta B2B</>}
                    </button>
                </div>
            </div>
        </div>
    )
}
