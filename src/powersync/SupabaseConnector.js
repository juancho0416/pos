import { supabase } from '../supabaseClient';
import { toast } from 'sonner';

export class SupabaseConnector {
  constructor() {
    this.powerSyncUrl = import.meta.env.VITE_POWERSYNC_URL || '<endpoint-placeholder>';
  }

  async fetchCredentials() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) throw new Error('No hay sesión activa en Supabase');
    return { endpoint: this.powerSyncUrl, token: session.access_token };
  }

  // ════════════════════════════════════════════════════════════
  // uploadData — Sube cambios locales de PowerSync a Supabase
  // ════════════════════════════════════════════════════════════
  async uploadData(database) {
    const batch = await database.getNextCrudTransaction();
    if (!batch) return;

    try {
      for (const op of batch.crud) {
        const { table, op: operation, id, opData } = op;

        if (operation === 'PUT') {
          // Al insertar una venta, también ejecutar lógica de negocio
          if (table === 'ventas') {
            await this._handleNuevaVenta(id, opData);
            continue; // _handleNuevaVenta ya hace el upsert de ventas
          }

          if (table === 'turnos') {
            await this._handleTurno(id, opData);
            continue;
          }

          // Upsert genérico para el resto de tablas
          const { error } = await supabase.from(table).upsert({ id, ...this._clean(table, opData) });
          if (error) throw error;

        } else if (operation === 'PATCH') {
          if (table === 'turnos') {
            await this._handleCierreTurno(id, opData);
            continue;
          }
          const { error } = await supabase.from(table).update(this._clean(table, opData)).eq('id', id);
          if (error) throw error;

        } else if (operation === 'DELETE') {
          const { error } = await supabase.from(table).delete().eq('id', id);
          if (error) throw error;
        }
      }

      await batch.complete();
    } catch (error) {
      // Error de red → no completar el batch, PowerSync reintentará
      if (error.message?.includes('Failed to fetch') || error.status === 0) {
        console.log('📡 Sin conexión — PowerSync reintentará el lote cuando vuelva la red.');
        return;
      }
      console.error('❌ [PowerSync] Error en uploadData:', error.message);
      toast.error(`Error Sync Supabase: ${error.message}`);
      // Error de datos (400) → completar para no bloquear la cola
      await batch.complete();
    }
  }

  // ════════════════════════════════════════════════════════════
  // Lógica de Negocio: Nueva Venta
  // ════════════════════════════════════════════════════════════
  async _handleNuevaVenta(ventaId, data) {
    try {
      const items = data.items_json ? JSON.parse(data.items_json) : [];
      
      // Llamada única a PostgreSQL para atómicamente:
      // 1. Ingresar Cabecera de venta
      // 2. Iterar items, restar Inventario, crear Kardex
      // 3. Calcular montos y sumar deuda de Clientes o restar Monederos
      const { error } = await supabase.rpc('procesar_venta_offline', {
        p_venta_id: ventaId,
        p_venta_data: data,
        p_items: items
      });

      if (error) throw error;
      
    } catch (err) {
      if (err.message && err.message.includes('Failed to fetch')) {
        // Ignorar de forma segura (PowerSync lo reintentará)
        throw err;
      }
      console.error(`❌ Error en RPC procesar_venta_offline (ID: ${ventaId}):`, err.message);
      throw err; 
    }
  }

  // ════════════════════════════════════════════════════════════
  // Lógica de Negocio: Apertura de Turno
  // ════════════════════════════════════════════════════════════
  async _handleTurno(turnoId, data) {
    const { error } = await supabase.from('turnos').upsert({
      id: turnoId,
      sucursal_id: data.sucursal_id,
      usuario_id: data.usuario_id || null,
      usuario: data.usuario || 'Cajero',
      fecha_inicio: data.fecha_inicio,
      monto_inicial: data.monto_inicial || 0,
      estado: data.estado || 'abierto'
    }, { onConflict: 'id' });
    if (error) throw error;
  }

  // ════════════════════════════════════════════════════════════
  // Lógica de Negocio: Cierre de Turno
  // ════════════════════════════════════════════════════════════
  async _handleCierreTurno(turnoId, data) {
    const { error } = await supabase.from('turnos').update({
      fecha_fin: data.fecha_fin,
      estado: data.estado || 'cerrado',
      monto_final_real: data.monto_final_real,
      total_ventas_efectivo: data.total_ventas_efectivo,
      total_ventas_tarjeta: data.total_ventas_tarjeta,
      total_ventas_credito: data.total_ventas_credito,
      diferencia: data.diferencia
    }).eq('id', turnoId);
    if (error) throw error;
  }

  // ════════════════════════════════════════════════════════════
  // Whitelist de columnas permitidas por tabla en Supabase
  // Solo estas columnas se envían — el resto se filtra silenciosamente.
  // Agrega aquí si amplías el esquema en Supabase.
  // ════════════════════════════════════════════════════════════
  static ALLOWED_COLUMNS = {
    productos: [
      'id', 'nombre', 'sku', 'codigo_barras', 'codigo_barras_fabricante',
      'linea', 'familia', 'marca', 'fabricante', 'categoria',
      'unidad_medida', 'factor_conversion',
      'pasillo', 'anaquel', 'nivel',
      'peso_kg', 'dimension_largo', 'dimension_ancho', 'dimension_alto',
      'costo_ultimo', 'costo_promedio', 'iva_porcentaje',
      'imagen_url', 'is_deleted', 'created_at', 'updated_at'
    ],
    precios: [
      'id', 'producto_id',
      'precio_menudeo', 'precio_medio_mayoreo', 'precio_mayoreo',
      'min_medio_mayoreo', 'min_mayoreo',
      'utilidad_menudeo', 'utilidad_medio_mayoreo', 'utilidad_mayoreo'
    ],
    inventario: [
      'id', 'producto_id', 'sucursal_id',
      'stock_actual', 'stock_minimo', 'stock_maximo',
      'created_at'
    ],
    kardex: [
      'id', 'producto_id', 'sucursal_id',
      'tipo_movimiento', 'cantidad', 'saldo_previo', 'saldo_nuevo',
      'concepto', 'referencia_id', 'usuario_id', 'created_at'
    ],
    ventas: [
      'id', 'sucursal_id', 'vendedor_id', 'usuario_id', 'cliente_id',
      'total', 'metodo_pago', 'metodo_entrega',
      'direccion_entrega', 'telefono_entrega', 'estado_entrega',
      'monto_recibido', 'monto_monedero_usado', 'abono_monedero_generado',
      'created_at'
      // items_json: EXCLUIDO — solo local
    ],
    venta_detalles: [
      'id', 'venta_id', 'producto_id', 'nombre',
      'cantidad', 'precio_unitario', 'subtotal'
    ],
    turnos: [
      'id', 'sucursal_id', 'usuario_id', 'usuario',
      'fecha_inicio', 'fecha_fin', 'estado',
      'monto_inicial', 'monto_final_real',
      'total_ventas_efectivo', 'total_ventas_tarjeta', 'total_ventas_credito',
      'diferencia', 'created_at'
    ],
    clientes: [
      'id', 'nombre', 'email', 'telefono', 'direccion', 'rfc',
      'sucursal_id', 'rol', 'saldo_monedero', 'saldo_pendiente',
      'limite_credito', 'created_at', 'updated_at'
    ],
    proveedores: [
      'id', 'nombre', 'rfc', 'telefono', 'correo', 'direccion',
      'dias_credito', 'limite_credito', 'saldo_pendiente',
      'sucursal_id', 'created_at', 'updated_at', 'is_deleted'
    ],
    ordenes_compra: [
      'id', 'proveedor_id', 'sucursal_id', 'usuario_id',
      'tipo_documento', 'numero_folio', 'estado',
      'subtotal', 'iva_total', 'total',
      'uuid_factura', 'fecha_documento', 'fecha_creacion', 'fecha_recepcion', 'notas'
    ],
    orden_compra_detalles: [
      'id', 'orden_compra_id', 'producto_id', 'unidad_compra',
      'factor_conversion', 'cantidad_compra', 'cantidad_entrada',
      'costo_unitario', 'iva_porcentaje', 'iva_importe', 'subtotal',
      'precio_aprobado_1', 'precio_aprobado_2', 'precio_aprobado_3'
    ],
    devoluciones: [
      'id', 'venta_id', 'cliente_id', 'sucursal_id', 'usuario_id',
      'total_devolucion', 'monto_monedero', 'motivo', 'estado', 'created_at'
    ],
    devolucion_detalles: [
      'id', 'devolucion_id', 'producto_id', 'nombre',
      'cantidad_devuelta', 'precio_unitario', 'subtotal'
    ],
    cupones: [
      'id', 'codigo', 'tipo', 'monto_original', 'monto_disponible',
      'venta_origen_id', 'sucursal_id', 'usuario_id',
      'motivo', 'estado', 'expira_at', 'created_at'
    ],
    cotizaciones: [
      'id', 'sucursal_id', 'cliente_id', 'nombre_cliente',
      'created_by', 'total', 'created_at'
    ],
  }

  _clean(table, data) {
    const allowed = SupabaseConnector.ALLOWED_COLUMNS[table]
    if (!allowed) {
      // Tabla no registrada: solo quitar items_json como mínimo de seguridad
      const cleaned = { ...data }
      delete cleaned.items_json
      return cleaned
    }
    // Filtrar solo las columnas permitidas
    return Object.fromEntries(
      Object.entries(data).filter(([key]) => allowed.includes(key))
    )
  }
}