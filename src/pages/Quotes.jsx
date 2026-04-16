import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Search, FileText, Calendar, User, DollarSign, ArrowRight, Printer, AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'


export default function Quotes() {
    const navigate = useNavigate()
    const { profile, branches, selectedBranch, changeBranch } = useAuth()

    const [quotes, setQuotes] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const fetchQuotes = async () => {
        if (!selectedBranch) return
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('cotizaciones')
                .select(`
                    *,
                    clientes(nombre),
                    cotizacion_detalles(
                        cantidad,
                        precio_unitario,
                        productos(
                            id, 
                            nombre, 
                            inventario(stock_actual, sucursal_id)
                        )
                    )
                `)
                .eq('sucursal_id', selectedBranch)
                .order('created_at', { ascending: false })

            if (error) {
                console.error("Error fetching quotes:", error)
            } else {
                setQuotes(data || [])
            }
        } catch (err) {
            console.error("Unexpected error in fetchQuotes:", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchQuotes()
    }, [selectedBranch])


    const handleConvertToSale = async (quote) => {
        // Prepare cart format expected by Sales.jsx
        const cartItems = quote.cotizacion_detalles.map(d => {
            // Find the inventory stock for the current branch
            const branchStock = d.productos.inventario?.find(i => i.sucursal_id == selectedBranch)?.stock_actual || 1000;

            return {
                id: d.productos.id,
                nombre: d.productos.nombre,
                cantidad: d.cantidad,
                selectedPrice: d.precio_unitario,
                stock: branchStock, // Store the corrected branch stock limit
                priceType: 'cotizado'
            };
        })

        // Optional: Mark quote as converted
        await supabase.from('cotizaciones').update({ estado: 'convertida' }).eq('id', quote.id)

        // Pass to POS
        localStorage.setItem('shopping_cart', JSON.stringify(cartItems))
        navigate('/') // Sales page
    }

    const rePrintQuote = async (quote) => {
        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')
        const doc = new jsPDF()
        const branchName = branches.find(b => b.id == selectedBranch)?.nombre || 'General'
        const clientName = quote.clientes?.nombre || 'Público General'

        doc.setFillColor(30, 64, 175)
        doc.rect(0, 0, 210, 40, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(22)
        doc.setFont("helvetica", "bold")
        doc.text("COTIZACION", 14, 25)

        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        doc.text(`Folio: COT-${quote.folio || quote.id.split('-')[0]}`, 150, 20)
        doc.text(`Fecha: ${new Date(quote.created_at).toLocaleDateString('es-MX')}`, 150, 28)

        doc.setTextColor(60, 60, 60)
        doc.setFontSize(12)
        doc.setFont("helvetica", "bold")
        doc.text("Datos del Cliente:", 14, 55)
        doc.setFont("helvetica", "normal")
        doc.text(`Nombre: ${clientName}`, 14, 62)

        doc.setFont("helvetica", "bold")
        doc.text("Sucursal Emisora:", 120, 55)
        doc.setFont("helvetica", "normal")
        doc.text(branchName, 120, 62)

        const tableColumn = ["Cant", "Descripción/Producto", "Precio Unitario", "Importe"]
        const tableRows = []

        quote.cotizacion_detalles.forEach(d => {
            const rowData = [
                d.cantidad,
                d.productos?.nombre || 'Producto',
                `$${d.precio_unitario.toFixed(2)}`,
                `$${(d.precio_unitario * d.cantidad).toFixed(2)}`
            ]
            tableRows.push(rowData)
        })

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 75,
            theme: 'grid',
            styles: { fontSize: 10, cellPadding: 5 },
            headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [241, 245, 249] },
        })

        const finalY = doc.lastAutoTable.finalY || 75

        doc.setFontSize(14)
        doc.setFont("helvetica", "bold")
        doc.text(`TOTAL: $${quote.total.toFixed(2)}`, 140, finalY + 15)

        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(100, 100, 100)
        doc.text("Precios sujetos a cambios sin previo aviso.", 14, finalY + 30)

        doc.save(`Cotizacion_COT-${quote.folio || quote.id.split('-')[0]}_${clientName.replace(/\s+/g, '_')}.pdf`)
    }

    const filteredQuotes = quotes.filter(q =>
        (q.folio && q.folio.toString().includes(searchTerm)) ||
        q.id.toString().includes(searchTerm) ||
        (q.clientes?.nombre && q.clientes.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen bg-slate-50">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-xl text-indigo-600"><FileText size={28} /></div>
                        Cotizaciones
                    </h1>
                    <p className="text-slate-500 text-sm mt-2">Gestiona y convierte las cotizaciones pendientes de tus clientes en ventas reales.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Branch Filter (Admin Only) */}
                    {profile?.rol === 'admin' ? (
                        <select
                            className="w-full sm:w-64 pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm cursor-pointer hover:border-indigo-300 transition"
                            value={selectedBranch}
                            onChange={(e) => changeBranch(e.target.value)}
                        >
                            {branches.map(b => <option key={b.id} value={b.id}>{b.nombre}</option>)}
                        </select>
                    ) : (
                        <div className="w-full sm:w-64 px-4 py-2.5 bg-slate-200 border border-slate-300 rounded-xl text-slate-500 font-bold text-sm flex items-center justify-center cursor-not-allowed">
                            {branches.find(b => b.id == selectedBranch)?.nombre || 'Mi Sucursal'}
                        </div>
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="mb-8">
                <div className="relative w-full max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por Folio o Cliente..."
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm text-slate-700 font-medium transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center p-12 text-slate-400 animate-pulse">Cargando cotizaciones...</div>
            ) : filteredQuotes.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-slate-200 flex flex-col items-center">
                    <FileText size={48} className="text-slate-300 mb-4" />
                    <p className="text-slate-500 font-bold text-lg">No hay cotizaciones registradas</p>
                    <p className="text-slate-400 text-sm mt-1">Las cotizaciones generadas desde el POS aparecerán aquí.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredQuotes.map(quote => (
                        <div key={quote.id} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group">

                            {/* Card Header */}
                            <div className="flex justify-between items-start mb-4 border-b border-slate-50 pb-4">
                                <div>
                                    <span className="text-indigo-600 font-black text-lg tracking-tight">COT-{quote.folio || quote.id.split('-')[0]}</span>
                                    <div className="flex items-center gap-1 text-slate-400 text-xs mt-1 font-medium">
                                        <Calendar size={12} />
                                        {new Date(quote.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </div>
                                </div>
                                <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg ${quote.estado === 'convertida' ? 'bg-green-100 text-green-700' : quote.estado === 'cancelada' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                    {quote.estado}
                                </span>
                            </div>

                            {/* Info */}
                            <div className="flex-1 space-y-3 mb-6">
                                <div className="flex items-start gap-3 text-slate-600">
                                    <User size={18} className="text-slate-400 shrink-0 mt-0.5" />
                                    <span className="font-bold text-sm leading-tight text-slate-800">{quote.clientes?.nombre || 'Público General'}</span>
                                </div>
                                <div className="flex flex-col pl-7 space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{quote.cotizacion_detalles.length} partidas</span>
                                    {quote.cotizacion_detalles.slice(0, 2).map((d, i) => (
                                        <span key={i} className="text-xs text-slate-500 truncate">- {d.cantidad}x {d.productos?.nombre}</span>
                                    ))}
                                    {quote.cotizacion_detalles.length > 2 && <span className="text-xs text-slate-400 italic">...y {quote.cotizacion_detalles.length - 2} más</span>}
                                </div>
                            </div>

                            {/* Total & Action */}
                            <div className="mt-auto">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Importe Total</span>
                                    <span className="text-2xl font-black text-slate-900">${quote.total.toFixed(2)}</span>
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => rePrintQuote(quote)}
                                        className="p-3 bg-slate-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95 shrink-0"
                                        title="Imprimir PDF"
                                    >
                                        <Printer size={20} />
                                    </button>
                                    <button
                                        disabled={quote.estado === 'convertida'}
                                        onClick={() => handleConvertToSale(quote)}
                                        className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:bg-slate-300 disabled:text-slate-50 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 active:scale-95 transition-all shadow-lg shadow-indigo-600/20 disabled:shadow-none"
                                    >
                                        Convertir a Venta <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>

                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
