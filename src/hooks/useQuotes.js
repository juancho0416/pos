import { useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { powersync } from '../powersync/db'
import { toast } from 'sonner'

/**
 * Hook para manejar cotizaciones: crear en Supabase/Dexie y generar PDF.
 */
export function useQuotes({ cart, calculateTotal, clearCart, branches, selectedBranch, customers, user }) {
    const [processing, setProcessing] = useState(false)
    const [showQuoteModal, setShowQuoteModal] = useState(false)
    const [quoteCustomer, setQuoteCustomer] = useState('')
    const [quoteName, setQuoteName] = useState('')
    const [showQuoteSuccessModal, setShowQuoteSuccessModal] = useState(false)

    const handleOpenQuote = useCallback(() => {
        if (cart.length === 0) return
        setShowQuoteModal(true)
        setQuoteCustomer('')
        setQuoteName('')
    }, [cart])

    const generateQuotePDF = useCallback(async (folio, dateStr) => {
        const { default: jsPDF } = await import('jspdf')
        const { default: autoTable } = await import('jspdf-autotable')
        const doc = new jsPDF()
        const branchName = branches.find(b => b.id == selectedBranch)?.nombre || 'General'
        const clientName = quoteCustomer ? customers.find(c => c.id == quoteCustomer)?.nombre : (quoteName || 'Público General')

        doc.setFillColor(30, 64, 175)
        doc.rect(0, 0, 210, 40, 'F')
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(22)
        doc.setFont("helvetica", "bold")
        doc.text("COTIZACION PRELIMINAR", 14, 25)

        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        doc.text(`Folio: COT-${folio}`, 150, 20)
        doc.text(`Fecha: ${new Date(dateStr).toLocaleDateString('es-MX')}`, 150, 28)

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

        cart.forEach(item => {
            tableRows.push([
                item.cantidad,
                item.nombre,
                `$${item.selectedPrice.toFixed(2)}`,
                `$${(item.selectedPrice * item.cantidad).toFixed(2)}`
            ])
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
        doc.text(`TOTAL: $${calculateTotal().toFixed(2)}`, 140, finalY + 15)

        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        doc.setTextColor(100, 100, 100)
        doc.text("Precios sujetos a cambios sin previo aviso. Vigencia de 15 dias.", 14, finalY + 30)

        // Marcar visualmente (OFFLINE) en el PDF si es un folio UUID
        if (folio && String(folio).includes('-')) {
            doc.setTextColor(220, 38, 38)
            doc.text("[ DOCUMENTO GENERADO SIN CONEXIÓN - PENDIENTE DE SINCRONIZACIÓN ]", 14, finalY + 40)
        }

        doc.save(`Cotizacion_COT-_${clientName.replace(/\s+/g, '_')}.pdf`)
    }, [branches, selectedBranch, customers, quoteCustomer, quoteName, cart, calculateTotal])

    const handleConfirmQuote = useCallback(async () => {
        setProcessing(true)
        try {
            const total = calculateTotal()
            const clienteNameForPayload = quoteCustomer ? customers.find(c => c.id == quoteCustomer)?.nombre : (quoteName || 'Público General');

            if (!navigator.onLine) {
                // FLUJO OFFLINE (FULL LOCAL-FIRST)
                // Guardar cotización en PowerSync SQLite local (offline-safe)
                const localId = crypto.randomUUID()
                const now = new Date().toISOString()

                await powersync.execute(
                    `INSERT INTO cotizaciones (id, sucursal_id, cliente_id, nombre_cliente, total, created_by, created_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [localId, selectedBranch, quoteCustomer || null, clienteNameForPayload, total, user?.id, now]
                )

                toast.success('Cotización guardada (Modo Offline)', {
                    description: 'Se sincronizará en cuanto regrese la red.'
                })

                generateQuotePDF(localId, now)

                setShowQuoteModal(false)
                clearCart()
                setShowQuoteSuccessModal(true)
                return
            }

            // FLUJO ONLINE SUPABASE
            const { data: quoteData, error: quoteError } = await supabase
                .from('cotizaciones')
                .insert([{
                    sucursal_id: selectedBranch,
                    cliente_id: quoteCustomer || null,
                    total: total,
                    vendedor_id: user?.id,
                    estado: 'pendiente'
                }])
                .select()
                .single()

            if (quoteError) throw quoteError

            const quoteDetails = cart.map(item => ({
                cotizacion_id: quoteData.id,
                producto_id: item.id,
                cantidad: item.cantidad,
                precio_unitario: item.selectedPrice
            }))

            const { error: detailsError } = await supabase
                .from('cotizacion_detalles')
                .insert(quoteDetails)

            if (detailsError) throw detailsError

            // Guardar silenciosamente copia local en PowerSync para lectura rápida offline
            try {
                await powersync.execute(
                    `INSERT OR REPLACE INTO cotizaciones (id, sucursal_id, cliente_id, nombre_cliente, total, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [quoteData.id, selectedBranch, quoteCustomer || null, clienteNameForPayload, total, user?.id, quoteData.created_at]
                )
            } catch { /* ignorar errors de PowerSync */ }

            generateQuotePDF(quoteData.id, quoteData.created_at)

            setShowQuoteModal(false)
            clearCart()
            setShowQuoteSuccessModal(true)

        } catch (error) {
            toast.error('Error al crear cotización: ' + error.message)
            console.error(error)
        } finally {
            setProcessing(false)
        }
    }, [cart, calculateTotal, selectedBranch, quoteCustomer, quoteName, user, clearCart, generateQuotePDF, customers])

    return {
        quoteProcessing: processing,
        showQuoteModal, setShowQuoteModal,
        quoteCustomer, setQuoteCustomer,
        quoteName, setQuoteName,
        showQuoteSuccessModal, setShowQuoteSuccessModal,
        handleOpenQuote,
        handleConfirmQuote,
    }
}
