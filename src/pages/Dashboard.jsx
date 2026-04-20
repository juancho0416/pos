import React, { useState } from 'react'
import { DollarSign, AlertTriangle, TrendingUp, TrendingDown, Filter, Download, Calendar, CreditCard, CheckCircle, Percent, Receipt, ListOrdered, Award, Flame, PackageX, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useDashboardData } from '../hooks/useDashboardData'
import { usePowerSync } from '@powersync/react'
import ExportCenterModal from '../components/dashboard/ExportCenterModal'

const BRANCH_COLORS = ['#1e40af', '#10b981', '#f59e0b', '#8b5cf6']

const getLocalIsoDate = (date) => {
    const offset = date.getTimezoneOffset();
    const shifted = new Date(date.getTime() - (offset*60*1000));
    return shifted.toISOString().split('T')[0];
}

// ─── Indicador de Cambio ───
function ChangeIndicator({ value, label }) {
    if (value === null || value === undefined) {
        return <span className="text-xs text-slate-400 font-medium flex items-center gap-1"><Minus size={12} /> Sin datos previos</span>
    }
    const isPositive = value >= 0
    const Icon = isPositive ? ArrowUpRight : ArrowDownRight
    const color = isPositive ? 'text-emerald-500' : 'text-red-500'
    const bg = isPositive ? 'bg-emerald-50' : 'bg-red-50'
    return (
        <span className={`inline-flex items-center gap-1 text-xs font-bold ${color} ${bg} px-2 py-0.5 rounded-full`}>
            <Icon size={13} strokeWidth={2.5} />
            {isPositive ? '+' : ''}{value.toFixed(1)}%
            <span className="font-medium text-slate-400 ml-0.5">{label}</span>
        </span>
    )
}

export default function Dashboard() {
    const powersync = usePowerSync();
    const { branches } = useAuth();
    const {
        dailySales, cobrado, porCobrar, lowStockCount,
        ticketPromedio, margenBruto, topProductsVolume, topProductsProfit,
        salesChangePercent, ticketChangePercent,
        deadStock, totalDeadValue,
        totalGastos, utilidadNeta,
        loading, chartData, salesData,
        selectedBranch, setSelectedBranch,
        startDate, setStartDate, endDate, setEndDate,
    } = useDashboardData(branches);

    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    const setDatePreset = (preset) => {
        const today = new Date();
        let start = new Date();
        let end = new Date();

        if (preset === 'hoy') {
            // Already today
        } else if (preset === 'semana') {
            start.setDate(today.getDate() - 7);
        } else if (preset === 'mes') {
            start.setMonth(today.getMonth() - 1);
        }

        setStartDate(getLocalIsoDate(start));
        setEndDate(getLocalIsoDate(end));
    }

    return (
        <div className="p-6 min-h-screen bg-slate-50">
            {/* Header & Filters */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">Dashboard Ejecutivo</h1>
                    <p className="text-slate-500 text-sm mt-1">Centro de Comando Analítico · Datos en tiempo real desde SQLite local</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                    <div className="flex bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm text-sm font-medium h-9">
                        <button onClick={() => setDatePreset('hoy')} className="px-3 hover:bg-blue-50 hover:text-blue-700 border-r border-slate-200 text-slate-700 transition">Hoy</button>
                        <button onClick={() => setDatePreset('semana')} className="px-3 hover:bg-blue-50 hover:text-blue-700 border-r border-slate-200 text-slate-700 transition">Semana</button>
                        <button onClick={() => setDatePreset('mes')} className="px-3 hover:bg-blue-50 hover:text-blue-700 text-slate-700 transition">Mes</button>
                    </div>

                    <div className="flex items-center gap-2 bg-white px-3 h-9 rounded-lg border border-slate-200 shadow-sm">
                        <Calendar size={16} className="text-slate-400" />
                        <div className="flex items-center gap-2 text-sm">
                            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent border-none p-0 focus:ring-0 text-slate-700 font-medium outline-none cursor-pointer" />
                            <span className="text-slate-400">→</span>
                            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent border-none p-0 focus:ring-0 text-slate-700 font-medium outline-none cursor-pointer" />
                        </div>
                    </div>

                    <div className="relative h-9">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <select value={selectedBranch} onChange={(e) => setSelectedBranch(e.target.value)} className="h-full pl-9 pr-8 py-0 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium text-sm focus:ring-2 focus:ring-blue-600 outline-none shadow-sm appearance-none cursor-pointer hover:border-blue-400 transition">
                            <option value="all">Todas Sucursales</option>
                            {branches.map(b => (<option key={b.id} value={b.id}>{b.nombre}</option>))}
                        </select>
                    </div>

                    <button onClick={() => setIsExportModalOpen(true)} className="h-9 bg-blue-600 hover:bg-blue-700 text-white px-4 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm active:scale-95">
                        <Download size={16} />Exportar
                    </button>
                </div>
            </div>

            {/* KPIs Grid Avanzado */}
            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                {/* Ingreso Bruto Total */}
                <div className="xl:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl shadow-lg flex flex-col justify-between text-white relative overflow-hidden group">
                    <div className="relative z-10">
                        <p className="text-slate-300 text-sm font-semibold uppercase tracking-wider mb-2">Ingreso Bruto Total</p>
                        <h3 className="text-4xl font-black">${dailySales.toLocaleString('es-MX', {minimumFractionDigits: 2})}</h3>
                    </div>
                    <div className="flex items-center gap-3 mt-4 z-10">
                        <ChangeIndicator value={salesChangePercent} label="vs periodo anterior" />
                    </div>
                </div>

                {/* Margen Bruto */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 group hover:border-blue-200 transition">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Margen Bruto</p>
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        {(margenBruto || 0).toFixed(1)}%
                    </h3>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-700 ${margenBruto >= 25 ? 'bg-emerald-500' : margenBruto >= 15 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(margenBruto || 0, 100)}%` }}></div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-2">{margenBruto >= 25 ? '✅ Saludable' : margenBruto >= 15 ? '⚠️ Atención' : '🔴 Crítico'}</p>
                </div>

                {/* Ticket Promedio */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 group hover:border-blue-200 transition relative overflow-hidden">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Ticket Promedio</p>
                    <h3 className="text-2xl font-black text-slate-800">${(ticketPromedio || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</h3>
                    <div className="mt-2">
                        <ChangeIndicator value={ticketChangePercent} label="vs anterior" />
                    </div>
                    <Receipt className="absolute right-3 bottom-0 text-slate-50 opacity-50 transform translate-y-3" size={60} />
                </div>

                {/* Cobrado */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 transition">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Cobrado en Efectivo/Tx</p>
                    <h3 className="text-xl font-black text-emerald-600">${cobrado.toLocaleString('es-MX')}</h3>
                </div>

                {/* Cartera */}
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 transition">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Cartera Créditos</p>
                    <h3 className="text-xl font-black text-amber-500">${porCobrar.toLocaleString('es-MX')}</h3>
                </div>
            </div>

            {/* Utilidad Neta + Gastos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className={`p-6 rounded-2xl shadow-sm border ${(utilidadNeta || 0) >= 0 ? 'bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200' : 'bg-gradient-to-br from-red-50 to-red-100 border-red-200'}`}>
                    <p className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-500">💰 Utilidad Neta del Periodo</p>
                    <h3 className={`text-3xl font-black ${(utilidadNeta || 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        ${(utilidadNeta || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-2">Ventas − Costo Mercancía − Gastos Operativos</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider mb-2 text-slate-500">📊 Gastos del Periodo</p>
                        <h3 className="text-2xl font-black text-red-600">${(totalGastos || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</h3>
                        <p className="text-[10px] text-slate-400 mt-1">Total de egresos operativos registrados</p>
                    </div>
                    <a href="/gastos" className="px-4 py-2 bg-red-50 text-red-600 font-bold text-xs rounded-lg hover:bg-red-100 transition-colors border border-red-200">Ver Detalle →</a>
                </div>
            </div>

            {/* Chart + Rankings */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                {/* Chart Area */}
                <div className="xl:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <TrendingUp size={20} className="text-blue-600" />
                            Comparativa de Ventas por Sucursal
                        </h2>
                    </div>
                    {loading ? (
                        <div className="h-80 w-full flex items-center justify-center text-slate-400 animate-pulse bg-slate-50 rounded-xl">Cargando gráfico interactivo...</div>
                    ) : (
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                                    <defs>
                                        {branches.map((b, idx) => (
                                            <linearGradient key={`color-${b.id}`} id={`color-${b.id}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={BRANCH_COLORS[idx % BRANCH_COLORS.length]} stopOpacity={0.4} />
                                                <stop offset="95%" stopColor={BRANCH_COLORS[idx % BRANCH_COLORS.length]} stopOpacity={0} />
                                            </linearGradient>
                                        ))}
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(v) => `$${v}`} width={80} />
                                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} formatter={(v) => [`$${v.toLocaleString('es-MX')}`, '']} labelStyle={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }} />
                                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '14px', fontWeight: '500', color: '#475569' }} />
                                    {branches.map((b, idx) => {
                                        if (selectedBranch !== 'all' && selectedBranch != b.id) return null
                                        return (<Area key={`area-${b.id}`} type="monotone" dataKey={b.nombre} name={b.nombre} stroke={BRANCH_COLORS[idx % BRANCH_COLORS.length]} strokeWidth={3} fillOpacity={1} fill={`url(#color-${b.id})`} activeDot={{ r: 6, strokeWidth: 0, fill: BRANCH_COLORS[idx % BRANCH_COLORS.length] }} />)
                                    })}
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Rankings Area */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden h-full">
                    <div className="bg-slate-50 border-b border-slate-100 p-5 flex items-center justify-between">
                        <h2 className="text-sm font-bold tracking-widest uppercase text-slate-700 flex items-center gap-2">
                            <Award size={16} className="text-blue-600" /> Rankings de Catálogo
                        </h2>
                    </div>

                    {loading ? (
                         <div className="p-8 text-center text-slate-400 animate-pulse">Analizando facturación...</div>
                    ) : (
                        <div className="p-0 overflow-y-auto" style={{ maxHeight: 'calc(20rem + 24px)' }}>
                            {/* Top Volúmen */}
                            <div className="p-5 border-b border-slate-100">
                                <h3 className="text-xs font-bold text-slate-400 mb-4 flex items-center gap-2"><Flame size={14} className="text-orange-500"/> MAYOR VOLUMEN (UNIDADES)</h3>
                                <div className="space-y-3">
                                    {(topProductsVolume || []).length > 0 ? topProductsVolume.map((p, i) => (
                                        <div key={i} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-slate-300 text-slate-700' : i === 2 ? 'bg-orange-300 text-orange-800' : 'bg-slate-100 text-slate-400'}`}>{i + 1}</div>
                                                <div className="w-32 lg:w-40 xl:w-28 2xl:w-48 truncate text-sm font-semibold text-slate-700" title={p.nombre}>{p.nombre}</div>
                                            </div>
                                            <div className="text-xs font-bold px-2 py-1 bg-white rounded shadow-sm border border-slate-200 text-slate-600">{p.volume} unds</div>
                                        </div>
                                    )) : <p className="text-xs text-slate-400 text-center py-2">Sin datos en el periodo</p>}
                                </div>
                            </div>

                            {/* Top Rentabilidad */}
                            <div className="p-5">
                                <h3 className="text-xs font-bold text-slate-400 mb-4 flex items-center gap-2"><DollarSign size={14} className="text-emerald-500"/> MAYOR RENTABILIDAD</h3>
                                <div className="space-y-3">
                                    {(topProductsProfit || []).length > 0 ? topProductsProfit.map((p, i) => (
                                        <div key={i} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-emerald-400 text-emerald-900' : 'bg-slate-100 text-slate-400'}`}>{i + 1}</div>
                                                <div className="w-32 lg:w-40 xl:w-28 2xl:w-48 truncate text-sm font-semibold text-slate-700" title={p.nombre}>{p.nombre}</div>
                                            </div>
                                            <div className="text-xs font-bold px-2 py-1 bg-emerald-50 text-emerald-700 rounded shadow-sm border border-emerald-100">${(p.profit || 0).toLocaleString('es-MX', {minimumFractionDigits: 0})}</div>
                                        </div>
                                    )) : <p className="text-xs text-slate-400 text-center py-2">Sin datos en el periodo</p>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════ STOCK MUERTO ═══════════════ */}
            {(deadStock || []).length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-red-100 mb-8 overflow-hidden">
                    <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-red-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-red-100 rounded-xl">
                                <PackageX size={22} className="text-red-600" />
                            </div>
                            <div>
                                <h2 className="text-sm font-black text-red-800 uppercase tracking-wider">Stock Muerto · Capital Inmovilizado</h2>
                                <p className="text-xs text-red-600/70 mt-0.5">Productos con inventario positivo y sin una sola venta en los últimos 6 meses</p>
                            </div>
                        </div>
                        <div className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-black shadow-sm shrink-0">
                            ${totalDeadValue.toLocaleString('es-MX', {minimumFractionDigits: 2})} perdidos
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {deadStock.map((item, i) => (
                            <div key={i} className="flex items-center justify-between px-6 py-3.5 hover:bg-red-50/50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600 font-black text-sm">{i + 1}</div>
                                    <div>
                                        <p className="font-semibold text-slate-700 text-sm">{item.nombre}</p>
                                        <p className="text-[11px] text-slate-400">SKU: {item.sku || 'N/A'} · {item.stock_actual} unidades estancadas</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-black text-red-600 text-sm">${(item.valor_muerto || 0).toLocaleString('es-MX', {minimumFractionDigits: 2})}</p>
                                    <p className="text-[10px] text-slate-400">costo unitario: ${(item.costo_promedio || 0).toFixed(2)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Modal */}
            <ExportCenterModal 
                isOpen={isExportModalOpen} 
                onClose={() => setIsExportModalOpen(false)}
                powersync={powersync}
                salesData={salesData}
                startDate={startDate}
                endDate={endDate}
                selectedBranch={selectedBranch}
                branches={branches}
            />
        </div>
    )
}