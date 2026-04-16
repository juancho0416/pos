import React, { useState } from 'react'
import { exportSalesToExcel, exportInventoryToExcel, exportPurchasesToExcel, exportClientsToExcel } from '../../services/DashboardExport'
import { FileSpreadsheet, Package, ShoppingCart, Users, X, Download } from 'lucide-react'

export default function ExportCenterModal({ 
  isOpen, 
  onClose, 
  powersync, 
  salesData, 
  startDate, 
  endDate, 
  selectedBranch, 
  branches 
}) {
  const [isExporting, setIsExporting] = useState(false)

  if (!isOpen) return null

  const handleExport = async (exportFn, type) => {
    setIsExporting(true)
    try {
      if (type === 'sales') {
        await exportFn(salesData, { selectedBranch, branches, startDate, endDate })
      } else if (type === 'inventory') {
        await exportFn(powersync, { selectedBranch, branches })
      } else if (type === 'purchases') {
        await exportFn(powersync, { startDate, endDate })
      } else if (type === 'clients') {
        await exportFn(powersync)
      }
    } catch (error) {
      console.error(`Error exportando ${type}:`, error)
      alert('Error en la exportación: ' + error.message)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Centro de Exportaciones</h2>
              <p className="text-xs text-slate-500">Descarga reportes gerenciales en formato Excel</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <ExportCard 
            title="Ventas Históricas" 
            description={`Transacciones del ${startDate} al ${endDate}`}
            icon={<ShoppingBagIcon className="text-emerald-500" />}
            isLoading={isExporting}
            onClick={() => handleExport(exportSalesToExcel, 'sales')}
          />
          <ExportCard 
            title="Valoración de Inventario" 
            description="Estado actual del inventario y costo promedio"
            icon={<Package className="text-indigo-500" />}
            isLoading={isExporting}
            onClick={() => handleExport(exportInventoryToExcel, 'inventory')}
          />
          <ExportCard 
            title="Compras a Proveedores" 
            description={`Órdenes de compra del ${startDate} al ${endDate}`}
            icon={<ShoppingCart className="text-orange-500" />}
            isLoading={isExporting}
            onClick={() => handleExport(exportPurchasesToExcel, 'purchases')}
          />
          <ExportCard 
            title="Cartera de Clientes" 
            description="Saldos, monederos y deudas pendientes"
            icon={<Users className="text-blue-500" />}
            isLoading={isExporting}
            onClick={() => handleExport(exportClientsToExcel, 'clients')}
          />
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cerrar Panel
          </button>
        </div>
      </div>
    </div>
  )
}

function ExportCard({ title, description, icon, isLoading, onClick }) {
  return (
    <div 
      className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer shadow-sm hover:shadow-md"
      onClick={!isLoading ? onClick : undefined}
    >
      <div className="flex items-center gap-4 mb-3 sm:mb-0">
        <div className="p-3 bg-slate-50 rounded-lg group-hover:bg-white group-hover:shadow-sm border border-slate-100 transition-all">
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <button 
        disabled={isLoading}
        className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 font-medium rounded-lg text-sm disabled:opacity-50 transition-all w-full sm:w-auto mt-2 sm:mt-0"
      >
        <Download size={16} />
        <span className="sm:hidden lg:inline">Descargar</span>
      </button>
    </div>
  )
}

// ShoppingBag is not imported, let's use a local SVG or just a lucide icon
function ShoppingBagIcon(props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/>
      <path d="M3 6h18"/>
      <path d="M16 10a4 4 0 0 1-8 0"/>
    </svg>
  )
}
