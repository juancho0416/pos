import { useState, useRef } from 'react'
import { X, UploadCloud, FileJson, AlertCircle, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export default function XMLImportModal({ show, onClose, onImported }) {
    const [isDragging, setIsDragging] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const fileInputRef = useRef(null)

    if (!show) return null

    const processXML = (xmlString) => {
        try {
            const parser = new DOMParser()
            const xmlDoc = parser.parseFromString(xmlString, "text/xml")

            if (xmlDoc.getElementsByTagName("parsererror").length > 0) {
                throw new Error("El archivo XML no tiene un formato válido.")
            }

            // Helpers to handle namespaces (cfdi: or implicit)
            const getTag = (name) => {
                let els = xmlDoc.getElementsByTagName(`cfdi:${name}`)
                if (els.length === 0) els = xmlDoc.getElementsByTagName(name)
                return els
            }

            const comprobante = getTag("Comprobante")[0]
            if (!comprobante) throw new Error("No se encontró el nodo principal Comprobante (CFDI).")

            const emisor = getTag("Emisor")[0]
            const conceptosList = getTag("Concepto")
            const timbre = xmlDoc.getElementsByTagName("tfd:TimbreFiscalDigital")[0]

            const cabecera = {
                serie: comprobante.getAttribute("Serie") || "",
                folio: comprobante.getAttribute("Folio") || "",
                fecha: comprobante.getAttribute("Fecha") || "",
                subtotal: parseFloat(comprobante.getAttribute("SubTotal") || 0),
                total: parseFloat(comprobante.getAttribute("Total") || 0),
                uuid: timbre ? timbre.getAttribute("UUID") : "",
                emisor_nombre: emisor ? emisor.getAttribute("Nombre") : "",
                emisor_rfc: emisor ? emisor.getAttribute("Rfc") : ""
            }

            const conceptos = []
            for (let i = 0; i < conceptosList.length; i++) {
                const node = conceptosList[i]
                
                // Mapear Traslados para sacar el IVA%
                let ivaPorcentaje = 0
                const traslados = node.getElementsByTagName("cfdi:Traslado")
                if (traslados.length === 0 && node.getElementsByTagName("Traslado").length > 0) {
                    const tNode = node.getElementsByTagName("Traslado")[0]
                    const tasaOCuota = parseFloat(tNode.getAttribute("TasaOCuota") || 0)
                    ivaPorcentaje = Math.round(tasaOCuota * 100)
                } else if (traslados.length > 0) {
                    const tasaOCuota = parseFloat(traslados[0].getAttribute("TasaOCuota") || 0)
                    ivaPorcentaje = Math.round(tasaOCuota * 100)
                }

                conceptos.push({
                    sku: node.getAttribute("NoIdentificacion") || "",
                    clave_sat: node.getAttribute("ClaveProdServ") || "",
                    nombre: node.getAttribute("Descripcion") || "",
                    cantidad: parseFloat(node.getAttribute("Cantidad") || 0),
                    unidad_medida: node.getAttribute("Unidad") || "Pza",
                    costo_unitario: parseFloat(node.getAttribute("ValorUnitario") || 0),
                    importe: parseFloat(node.getAttribute("Importe") || 0),
                    iva_porcentaje: ivaPorcentaje
                })
            }

            return { cabecera, conceptos }
        } catch (err) {
            console.error("XML Parse Error:", err)
            throw new Error("No se pudo leer la factura XML. Asegúrate de que sea un CFDI válido del SAT.")
        }
    }

    const handleFile = async (file) => {
        if (!file || file.type !== 'text/xml') {
            toast.error('Por favor, selecciona un archivo XML válido.')
            return
        }

        setIsLoading(true)
        try {
            const text = await file.text()
            const data = processXML(text)
            toast.success('XML Procesado Correctamente', {
                description: `Proveedor: ${data.cabecera.emisor_nombre}`
            })
            onImported(data)
            onClose()
        } catch (err) {
            toast.error(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) handleFile(file)
    }

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 backdrop-blur-sm bg-slate-900/60">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="bg-slate-50 p-5 flex justify-between items-center border-b border-slate-100">
                    <div className="flex items-center gap-3 font-black text-slate-800">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                            <FileJson size={20} />
                        </div>
                        Importar Factura Proveedor (CFDI XML)
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        className={`
                            border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center text-center transition-all cursor-pointer
                            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-400 hover:bg-slate-50'}
                        `}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div className={`p-4 rounded-full mb-4 ${isDragging ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                            <UploadCloud size={40} />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 mb-1">
                            Arrastra el XML aquí
                        </h3>
                        <p className="text-sm font-semibold text-slate-400 max-w-xs">
                            o haz clic para explorar en tu computadora. Solo archivos .xml (CFDI 3.3 o 4.0)
                        </p>
                        
                        <input 
                            type="file" 
                            accept=".xml" 
                            className="hidden" 
                            ref={fileInputRef}
                            onChange={(e) => {
                                if (e.target.files[0]) handleFile(e.target.files[0])
                            }}
                        />
                    </div>

                    <div className="mt-6 flex gap-3 text-xs font-bold text-slate-500 bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                        <AlertCircle size={32} className="text-blue-500 shrink-0" />
                        <p>
                            Al importar un XML, el sistema extraerá automáticamente al proveedor, el folio, los impuestos y todas las partidas, <strong className="text-slate-700">vinculando el Código de Barras / SKU</strong> con tu catálogo si ya existe.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
