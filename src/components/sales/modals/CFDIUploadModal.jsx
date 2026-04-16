import { useState, useRef } from 'react'
import { X, UploadCloud, FileJson, CheckCircle, Search, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '../../../context/AuthContext'
import { powersync } from '../../../powersync/db'

export default function CFDIUploadModal({ show, onClose, allProducts, onItemsLoaded }) {
    const { user, selectedBranch } = useAuth()
    const [fileData, setFileData] = useState(null)
    const [loading, setLoading] = useState(false)
    const [processing, setProcessing] = useState(false)
    const fileInputRef = useRef(null)

    if (!show) return null

    const handleFileUpload = (e) => {
        const file = e.target.files[0]
        if (!file) return

        if (!file.name.toLowerCase().endsWith('.xml')) {
            toast.error('Por favor, selecciona un archivo XML de Factura (CFDI).')
            return
        }

        setLoading(true)
        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                const text = event.target.result
                const parser = new DOMParser()
                const xmlDoc = parser.parseFromString(text, "text/xml")
                
                // Get Timbre Fiscal UUID
                const tfd = xmlDoc.getElementsByTagName("tfd:TimbreFiscalDigital")[0]
                const uuid = tfd ? tfd.getAttribute("UUID") : 'SN-' + Date.now()

                // Get Emisor (Provider)
                const emisor = xmlDoc.getElementsByTagName("cfdi:Emisor")[0]
                const rfcProveedor = emisor ? emisor.getAttribute("Rfc") : ''
                const nombreProveedor = emisor ? emisor.getAttribute("Nombre") : 'Proveedor Desconocido'

                // Get Comprobante (Total)
                const comprobante = xmlDoc.getElementsByTagName("cfdi:Comprobante")[0]
                const totalFactura = comprobante ? parseFloat(comprobante.getAttribute("Total") || 0) : 0

                // Parse Conceptos (Products)
                const conceptosTags = xmlDoc.getElementsByTagName("cfdi:Concepto")
                const parsedItems = Array.from(conceptosTags).map((node, index) => {
                    const noIdentificacion = node.getAttribute("NoIdentificacion") || ''
                    const descripcion = node.getAttribute("Descripcion") || 'Producto sin descripción'
                    const cantidad = parseFloat(node.getAttribute("Cantidad") || 0)
                    const valorUnitario = parseFloat(node.getAttribute("ValorUnitario") || 0)
                    
                    // Identify local match
                    let matchedProduct = null
                    if (noIdentificacion) {
                        matchedProduct = allProducts.find(p => p.sku === noIdentificacion || p.codigo_barras === noIdentificacion)
                    }
                    if (!matchedProduct) {
                        matchedProduct = allProducts.find(p => p.nombre.toLowerCase() === descripcion.toLowerCase())
                    }

                    // Impuestos (Calculate IVA)
                    let ivaImporte = 0
                    const traslados = node.getElementsByTagName("cfdi:Traslado")
                    for(let t of traslados) {
                        if (t.getAttribute("Impuesto") === "002") { // 002 = IVA
                            ivaImporte += parseFloat(t.getAttribute("Importe") || 0)
                        }
                    }

                    return {
                        id: 'cfdi-' + index,
                        noIdentificacion,
                        descripcion,
                        cantidad,
                        valorUnitario,
                        iva: ivaImporte,
                        costoTotal: (cantidad * valorUnitario) + ivaImporte,
                        matchedProduct
                    }
                })

                if (parsedItems.length === 0) {
                    toast.error('El XML no contiene conceptos o tiene un formato no soportado.')
                    setLoading(false)
                    return
                }

                setFileData({
                    uuid,
                    emisor: { rfc: rfcProveedor, nombre: nombreProveedor },
                    total: totalFactura,
                    items: parsedItems
                })
                setLoading(false)
                
            } catch (error) {
                console.error("Error parsing XML", error)
                toast.error('Fallo al procesar el archivo XML. Verifica que sea un CFDI válido.')
                setLoading(false)
            }
        }
        reader.readAsText(file)
    }

    const processEntry = async () => {
        if (!fileData) return

        // If parent wants to load into a cart for review (Reception page mode)
        if (typeof onItemsLoaded === 'function') {
            onItemsLoaded(fileData.items)
            resetAndClose()
            return
        }

        setProcessing(true)

        try {
            // 1. Asegurar Proveedor
            let proveedorRes = await powersync.execute(`SELECT id FROM proveedores WHERE rfc = ? LIMIT 1`, [fileData.emisor.rfc])
            let proveedorId = null
            
            if (proveedorRes.rows?.length > 0) {
                proveedorId = proveedorRes.rows._array[0].id
            } else {
                proveedorId = crypto.randomUUID()
                await powersync.execute(
                    `INSERT INTO proveedores (id, nombre, rfc, sucursal_id, is_deleted) VALUES (?, ?, ?, ?, 0)`,
                    [proveedorId, fileData.emisor.nombre, fileData.emisor.rfc, selectedBranch]
                )
            }

            // 2. Crear Orden de Compra/Entrada
            const ordenId = crypto.randomUUID()
            await powersync.execute(
                `INSERT INTO ordenes_compra (id, proveedor_id, sucursal_id, usuario_id, estado, total, uuid_factura, fecha_creacion, fecha_recepcion)
                 VALUES (?, ?, ?, ?, 'RECIBIDA', ?, ?, datetime('now'), datetime('now'))`,
                [ordenId, proveedorId, selectedBranch, user?.id, fileData.total, fileData.uuid]
            )

            // 3. Procesar Productos, Inventario y Kardex
            for (let item of fileData.items) {
                let currentProductId = null

                if (item.matchedProduct) {
                    currentProductId = item.matchedProduct.id
                } else {
                    // Producto Nuevo - Auto Creación Rápida
                    currentProductId = crypto.randomUUID()
                    await powersync.execute(
                        `INSERT INTO productos (id, nombre, codigo_barras, sku, is_deleted) VALUES (?, ?, ?, ?, 0)`,
                        [currentProductId, item.descripcion, item.noIdentificacion, item.noIdentificacion]
                    )

                    // Init Inventario en 0
                    await powersync.execute(
                        `INSERT INTO inventario (producto_id, sucursal_id, stock_actual, stock_minimo, stock_maximo) VALUES (?, ?, 0, 5, 20)`,
                        [currentProductId, selectedBranch]
                    )

                    // Init Precios en 0 (requiere ajuste manual luego)
                    await powersync.execute(
                        `INSERT INTO precios (id, producto_id, precio_menudeo, precio_mayoreo, min_mayoreo) VALUES (?, ?, ?, ?, 3)`,
                        [crypto.randomUUID(), currentProductId, item.valorUnitario * 1.5, item.valorUnitario * 1.3] // Suggests 50% margin
                    )
                }

                // Obtener stock_anterior
                let inventarioRes = await powersync.execute(
                    `SELECT stock_actual FROM inventario WHERE producto_id = ? AND sucursal_id = ? LIMIT 1`,
                    [currentProductId, selectedBranch]
                )
                let stock_anterior = inventarioRes.rows?.length > 0 ? inventarioRes.rows._array[0].stock_actual : 0
                let stock_nuevo = stock_anterior + item.cantidad

                // Registrar detalle de compra
                await powersync.execute(
                    `INSERT INTO orden_compra_detalles (id, orden_compra_id, producto_id, cantidad, costo_unitario, subtotal, iva) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [crypto.randomUUID(), ordenId, currentProductId, item.cantidad, item.valorUnitario, item.cantidad * item.valorUnitario, item.iva]
                )

                // Actualizar Inventario (Stock)
                await powersync.execute(
                    `UPDATE inventario SET stock_actual = ? WHERE producto_id = ? AND sucursal_id = ?`,
                    [stock_nuevo, currentProductId, selectedBranch]
                )

                // Registrar en Kardex
                await powersync.execute(
                    `INSERT INTO kardex (id, producto_id, sucursal_id, tipo_movimiento, cantidad, saldo_previo, saldo_nuevo, concepto, referencia_id, usuario_id, created_at)
                     VALUES (?, ?, ?, 'entrada', ?, ?, ?, 'Compra Factura XML', ?, ?, datetime('now'))`,
                    [crypto.randomUUID(), currentProductId, selectedBranch, item.cantidad, stock_anterior, stock_nuevo, fileData.uuid, user?.id]
                )
            }

            toast.success('Factura XML Procesada Exitosamente', { 
                description: `Se han actualizado ${fileData.items.length} productos en el inventario.`
            })
            setProcessing(false)
            resetAndClose()

        } catch (error) {
            console.error(error)
            toast.error('Error al procesar la integración en base de datos.')
            setProcessing(false)
        }
    }

    const resetAndClose = () => {
        setFileData(null)
        if (fileInputRef.current) fileInputRef.current.value = ""
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* HEAD */}
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                            <FileJson className="text-blue-600" size={24} /> Recepción Rápida CFDI (XML)
                        </h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">Automatiza la carga de mercancía leyendo el archivo Mxl del proveedor</p>
                    </div>
                    <button onClick={resetAndClose} className="p-2 bg-white hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all border border-slate-200">
                        <X size={24} />
                    </button>
                </div>

                {/* BODY */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                    {!fileData ? (
                        <div className="border-2 border-dashed border-slate-300 rounded-3xl p-10 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                            <div className="bg-blue-50 p-6 rounded-full text-blue-600 mb-6">
                                <UploadCloud size={48} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2">Sube el Archivo XML Bsale o SAT</h3>
                            <p className="text-slate-500 font-medium mb-8 max-w-xs mx-auto">Sube el CFDI de tu proveedor para mapear costos, precios e inventario automáticamente.</p>
                            
                            <input 
                                type="file" 
                                accept=".xml" 
                                className="hidden" 
                                ref={fileInputRef} 
                                onChange={handleFileUpload}
                            />
                            
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                            >
                                {loading ? 'Procesando XML...' : 'Buscar Archivo .XML'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Factura Info */}
                            <div className="bg-slate-800 text-white rounded-2xl p-6 flex flex-wrap justify-between gap-4">
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">PROVEEDOR</p>
                                    <p className="text-lg font-black">{fileData.emisor.nombre}</p>
                                    <p className="text-slate-300 text-sm">{fileData.emisor.rfc}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">FACTURA / UUID</p>
                                    <p className="text-sm font-mono text-slate-300 mb-2">{fileData.uuid}</p>
                                    <p className="text-2xl font-black bg-blue-600/20 text-blue-400 px-3 py-1 rounded-lg inline-block text-right">
                                        Total: ${fileData.total.toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            {/* Detalle de Productos */}
                            <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                <table className="w-full text-left bg-white">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Estatus</th>
                                            <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Código</th>
                                            <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest">Producto</th>
                                            <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Costo Unit.</th>
                                            <th className="py-3 px-4 text-xs font-black text-slate-400 uppercase tracking-widest text-center">Cant (Suma)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {fileData.items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50">
                                                <td className="py-4 px-4 align-middle">
                                                    {item.matchedProduct ? (
                                                        <span className="flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-50 px-2.5 py-1 rounded-lg w-max">
                                                            <CheckCircle size={14} /> En Catálogo
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5 text-xs font-bold text-orange-700 bg-orange-50 px-2.5 py-1 rounded-lg w-max">
                                                            <Search size={14} /> Nuevo (Se Creará)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-4 px-4 align-middle font-mono text-sm font-bold text-slate-500">
                                                    {item.noIdentificacion || 'S/Código'}
                                                </td>
                                                <td className="py-4 px-4 align-middle font-bold text-slate-700">
                                                    {item.descripcion}
                                                </td>
                                                <td className="py-4 px-4 align-middle text-right font-bold text-slate-600">
                                                    ${item.valorUnitario.toFixed(2)}
                                                </td>
                                                <td className="py-4 px-4 align-middle text-center">
                                                    <span className="bg-blue-100 text-blue-700 font-black px-3 py-1 rounded-lg text-sm">
                                                        +{item.cantidad}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                {fileData && (
                    <div className="bg-slate-50 border-t border-slate-200 p-6 flex justify-between items-center shrink-0">
                        <button 
                            onClick={() => setFileData(null)} 
                            disabled={processing}
                            className="px-6 py-3 bg-white border border-slate-300 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        
                        <button 
                            onClick={processEntry}
                            disabled={processing}
                            className="bg-green-600 hover:bg-green-700 text-white font-black px-8 py-3 rounded-xl shadow-lg shadow-green-600/20 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                        >
                            {processing ? (
                                'Procesando e impactando Kardex...'
                            ) : (
                                <><Save size={20} /> APLICAR ENTRADA Y ACTUALIZAR STOCK</>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
