import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { X, Save } from 'lucide-react'
import { powersync } from '../powersync/db'
import { toast } from 'sonner'

export default function ProductForm({ onClose, onProductSaved, productToEdit }) {
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        sku: '',
        nombre: '',
        codigo_barras: '',
        descripcion: '',
        categoria: '',

        // Pricing
        precio_menudeo: '',
        precio_mayoreo: '',
        min_mayoreo: '',

        // Inventory Defaults (Only used for new products)
        stock_minimo: 5
    })

    // Pre-fill form if editing
    useEffect(() => {
        if (productToEdit) {
            setFormData({
                sku: productToEdit.sku || '',
                nombre: productToEdit.nombre || '',
                codigo_barras: productToEdit.codigo_barras || '',
                descripcion: productToEdit.descripcion || '',
                categoria: productToEdit.categoria || '',

                // Extract prices if available (assuming correct join structure)
                precio_menudeo: productToEdit.precios?.precio_menudeo || '',
                precio_mayoreo: productToEdit.precios?.precio_mayoreo || '',
                min_mayoreo: productToEdit.precios?.min_mayoreo || '',

                // Stock min not critical for edit, but can keep default or fetch if needed
                stock_minimo: 5
            })
        }
    }, [productToEdit])

    // Handle Input Change
    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
    }

    // Submit Handler
    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            let productId = productToEdit?.id

            if (!navigator.onLine) {
                // OFFLINE: Guardar en PowerSync SQLite local
                if (productToEdit) {
                    // Actualizar producto existente
                    await powersync.execute(
                        `UPDATE productos SET sku = ?, nombre = ?, codigo_barras = ?, categoria = ? WHERE id = ?`,
                        [formData.sku, formData.nombre, formData.codigo_barras || null, formData.categoria, productToEdit.id]
                    )
                    await powersync.execute(
                        `UPDATE precios SET precio_menudeo = ?, precio_mayoreo = ?, min_mayoreo = ? WHERE producto_id = ?`,
                        [parseFloat(formData.precio_menudeo), parseFloat(formData.precio_mayoreo), parseInt(formData.min_mayoreo) || 12, productToEdit.id]
                    )
                    toast.success('Producto actualizado (Modo Offline)', { description: 'Sincronizará al volver la red' })
                } else {
                    // Nuevo producto
                    productId = crypto.randomUUID()
                    const now = new Date().toISOString()
                    await powersync.execute(
                        `INSERT INTO productos (id, sku, nombre, codigo_barras, categoria, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
                        [productId, formData.sku, formData.nombre, formData.codigo_barras || null, formData.categoria, now]
                    )
                    await powersync.execute(
                        `INSERT INTO precios (id, producto_id, precio_menudeo, precio_mayoreo, min_mayoreo, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
                        [crypto.randomUUID(), productId, parseFloat(formData.precio_menudeo), parseFloat(formData.precio_mayoreo), parseInt(formData.min_mayoreo) || 12, now]
                    )
                    toast.success('Producto creado (Modo Offline)', { description: 'Sincronizará al volver la red' })
                }

                onProductSaved()
                onClose()
                return
            }

            if (productToEdit) {
                // UPDATE Logic
                const { error: updateError } = await supabase
                    .from('productos')
                    .update({
                        sku: formData.sku,
                        nombre: formData.nombre,
                        codigo_barras: formData.codigo_barras || null,
                        descripcion: formData.descripcion,
                        categoria: formData.categoria
                    })
                    .eq('id', productId)

                if (updateError) throw updateError
            } else {
                // CREATE Logic
                const { data: product, error: insertError } = await supabase
                    .from('productos')
                    .insert([{
                        sku: formData.sku,
                        nombre: formData.nombre,
                        codigo_barras: formData.codigo_barras || null,
                        descripcion: formData.descripcion,
                        categoria: formData.categoria
                    }])
                    .select()
                    .single()

                if (insertError) throw insertError
                productId = product.id
            }

            // Upsert Prices (Works for both Create and Update)
            const { error: priceError } = await supabase
                .from('precios')
                .upsert({
                    producto_id: productId,
                    precio_menudeo: parseFloat(formData.precio_menudeo),
                    precio_mayoreo: parseFloat(formData.precio_mayoreo),
                    min_mayoreo: parseInt(formData.min_mayoreo) || 12
                }, { onConflict: 'producto_id' })

            if (priceError) throw priceError

            // Create Inventory ONLY if New Product
            if (!productToEdit) {
                const { data: branches } = await supabase.from('sucursales').select('id')
                if (branches) {
                    const inventoryRecords = branches.map(branch => ({
                        producto_id: productId,
                        sucursal_id: branch.id,
                        stock_actual: 0,
                        stock_minimo: parseInt(formData.stock_minimo)
                    }))
                    await supabase.from('inventario').insert(inventoryRecords)
                }
            }

            onProductSaved()
            onClose()

        } catch (error) {
            console.error('Error saving product:', error)
            toast.error('Error al guardar producto: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm transition-all duration-300">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto transform scale-100 animate-in fade-in zoom-in duration-200">
                <div className="flex justify-between items-center p-6 border-b border-gray-100 bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-800">
                        {productToEdit ? 'Editar Producto' : 'Nuevo Producto'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Primary Info */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">SKU (Código Interno)</label>
                                <input
                                    type="text"
                                    name="sku"
                                    required
                                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5 px-4 bg-gray-50 border focus:bg-white transition-colors"
                                    value={formData.sku}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Código de Barras</label>
                                <input
                                    type="text"
                                    name="codigo_barras"
                                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5 px-4 bg-gray-50 border focus:bg-white transition-colors"
                                    value={formData.codigo_barras}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Name & Category */}
                        <div className="space-y-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Producto</label>
                                <input
                                    type="text"
                                    name="nombre"
                                    required
                                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5 px-4 bg-gray-50 border focus:bg-white transition-colors"
                                    value={formData.nombre}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Categoría</label>
                                <input
                                    type="text"
                                    name="categoria"
                                    className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5 px-4 bg-gray-50 border focus:bg-white transition-colors"
                                    value={formData.categoria}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción</label>
                            <textarea
                                name="descripcion"
                                rows={2}
                                className="w-full rounded-xl border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 py-2.5 px-4 bg-gray-50 border focus:bg-white transition-colors"
                                value={formData.descripcion}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Pricing Section */}
                        <div className="md:col-span-2 pt-4 border-t border-gray-100">
                            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">Configuración de Precios</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Precio Menudeo</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="precio_menudeo"
                                            required
                                            className="w-full pl-8 pr-4 py-2.5 rounded-xl border-gray-300 focus:ring-blue-500 focus:border-blue-500 border bg-white font-medium"
                                            value={formData.precio_menudeo}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-blue-600 mb-1">Precio Mayoreo</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="precio_mayoreo"
                                            required
                                            className="w-full pl-8 pr-4 py-2.5 rounded-xl border-blue-200 focus:ring-blue-500 focus:border-blue-500 border bg-blue-50 font-bold text-blue-700"
                                            value={formData.precio_mayoreo}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-600 mb-1">Mínimo para Mayoreo</label>
                                    <input
                                        type="number"
                                        name="min_mayoreo"
                                        required
                                        placeholder="Ej: 12"
                                        className="w-full px-4 py-2.5 rounded-xl border-gray-300 focus:ring-blue-500 focus:border-blue-500 border bg-white"
                                        value={formData.min_mayoreo}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>
                        </div>

                        {!productToEdit && (
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-600 mb-1">Stock Mínimo Inicial (Todas las sucursales)</label>
                                <input
                                    type="number"
                                    name="stock_minimo"
                                    required
                                    className="w-24 px-4 py-2.5 rounded-xl border-gray-300 focus:ring-blue-500 focus:border-blue-500 border bg-white"
                                    value={formData.stock_minimo}
                                    onChange={handleChange}
                                />
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end pt-6 gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-200 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Save size={18} />
                            {loading ? 'Guardando...' : (productToEdit ? 'Actualizar Producto' : 'Guardar Producto')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
