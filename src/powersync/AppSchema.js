import { Schema, Table, column } from '@powersync/web';

export const AppSchema = new Schema({
  // ── Catálogo ──
  productos: new Table({
    // Identificación básica
    codigo_barras: column.text,
    codigo_barras_fabricante: column.text,  // EAN del fabricante
    nombre: column.text,
    descripcion: column.text,               // Descripción larga
    sku: column.text,

    // Clasificación
    linea: column.text,                     // Línea de negocio
    familia: column.text,                   // Subfamilia
    marca: column.text,
    fabricante: column.text,
    categoria: column.text,

    // Unidades y logística
    unidad_medida: column.text,             // Pza, Kg, Metro, Caja, Litro
    factor_conversion: column.real,         // 1 Caja = N Pzas

    // Ubicación física en almacén
    pasillo: column.text,
    anaquel: column.text,
    nivel: column.text,

    // Dimensiones para e-commerce/logística
    peso_kg: column.real,
    dimension_largo: column.real,
    dimension_ancho: column.real,
    dimension_alto: column.real,

    // Inteligencia de costos
    costo_ultimo: column.real,              // Costo de última compra
    costo_promedio: column.real,            // Costo promedio ponderado

    // Impuestos
    iva_porcentaje: column.integer,         // 0, 8, o 16

    // Control
    imagen_url: column.text,
    is_deleted: column.integer,
    created_at: column.text,
    updated_at: column.text
  },
  {
    indexes: {
      idx_nombre: ['nombre'],
      idx_codigo: ['codigo_barras'],
      idx_sku: ['sku']
    }
  }),

  precios: new Table({
    producto_id: column.text,
    // Precios calculados
    precio_menudeo: column.real,            // Precio 1
    precio_medio_mayoreo: column.real,      // Precio 2
    precio_mayoreo: column.real,            // Precio 3
    // Cantidades mínimas por nivel
    min_medio_mayoreo: column.integer,      // mín pzas para Precio 2
    min_mayoreo: column.integer,            // mín pzas para Precio 3
    // % de utilidad (margen) sobre costo — fuente de verdad
    utilidad_menudeo: column.real,          // % sobre costo
    utilidad_medio_mayoreo: column.real,
    utilidad_mayoreo: column.real,
  }),

  inventario: new Table({
    producto_id: column.text,
    sucursal_id: column.text,
    stock_actual: column.real,
    stock_minimo: column.real,
    stock_maximo: column.real,
    created_at: column.text,
    updated_at: column.text
  }),

  kardex: new Table({
    producto_id:     column.text,
    sucursal_id:     column.text,
    tipo_movimiento: column.text,   // 'entrada' | 'salida' | 'ajuste' | 'COMPRA'
    cantidad:        column.real,
    saldo_previo:    column.real,   // stock antes del movimiento
    saldo_nuevo:     column.real,   // stock después del movimiento
    concepto:        column.text,
    referencia_id:   column.text,
    usuario_id:      column.text,
    created_at:      column.text
  }),

  // ── Compras y Proveedores ──
  proveedores: new Table({
    nombre: column.text,
    rfc: column.text,
    telefono: column.text,
    correo: column.text,
    direccion: column.text,
    dias_credito: column.integer,
    limite_credito: column.real,
    saldo_pendiente: column.real,
    sucursal_id: column.text,
    created_at: column.text,
    updated_at: column.text,
    is_deleted: column.integer
  }),

  ordenes_compra: new Table({
    proveedor_id: column.text,
    sucursal_id: column.text,
    usuario_id: column.text,
    tipo_documento: column.text, // FACTURA, REMISION
    numero_folio: column.text,
    estado: column.text, // BORRADOR, APROBADA, RECIBIDA, CANCELADA
    subtotal: column.real,
    iva_total: column.real,
    total: column.real,
    uuid_factura: column.text, // Para ligar con el XML del SAT
    fecha_documento: column.text,
    fecha_creacion: column.text,
    fecha_recepcion: column.text,
    notas: column.text
  }),

  orden_compra_detalles: new Table({
    orden_compra_id: column.text,
    producto_id: column.text,
    unidad_compra: column.text,
    factor_conversion: column.real,
    cantidad_compra: column.real,
    cantidad_entrada: column.real,
    costo_unitario: column.real,
    iva_porcentaje: column.real,
    iva_importe: column.real,
    subtotal: column.real,
    precio_aprobado_1: column.real,
    precio_aprobado_2: column.real,
    precio_aprobado_3: column.real
  }),

  pagos_proveedores: new Table({
    proveedor_id: column.text,
    orden_compra_id: column.text,
    usuario_id: column.text,
    monto: column.real,
    metodo_pago: column.text,
    fecha: column.text
  }),

  // ── Clientes ──
  clientes: new Table({
    nombre: column.text,
    email: column.text,
    telefono: column.text,
    direccion: column.text,
    rfc: column.text,
    sucursal_id: column.text,
    rol: column.text,
    saldo_monedero: column.real,
    saldo_pendiente: column.real,
    limite_credito: column.real,
    created_at: column.text,
    updated_at: column.text
  }),

  // ── Ventas ──
  ventas: new Table({
    sucursal_id: column.text,
    vendedor_id: column.text,
    usuario_id: column.text,
    cliente_id: column.text,
    total: column.real,
    metodo_pago: column.text,
    metodo_entrega: column.text,
    direccion_entrega: column.text,
    telefono_entrega: column.text,
    estado_entrega: column.text,
    monto_recibido: column.real,
    monto_monedero_usado: column.real,
    abono_monedero_generado: column.real,
    items_json: column.text,   // JSON serializado de ítems — solo local, _clean() lo quita antes de Supabase
    created_at: column.text
  }),

  venta_detalles: new Table({
    venta_id: column.text,
    producto_id: column.text,
    nombre: column.text,
    cantidad: column.real,
    precio_unitario: column.real,
    subtotal: column.real
  }),

  // ── Operaciones ──
  turnos: new Table({
    sucursal_id: column.text,
    usuario_id: column.text,
    usuario: column.text,
    fecha_inicio: column.text,
    fecha_fin: column.text,
    estado: column.text,
    monto_inicial: column.real,
    monto_final_real: column.real,
    total_ventas_efectivo: column.real,
    total_ventas_tarjeta: column.real,
    total_ventas_credito: column.real,
    diferencia: column.real,
    created_at: column.text
  }),

  cotizaciones: new Table({
    sucursal_id: column.text,
    cliente_id: column.text,
    nombre_cliente: column.text,
    created_by: column.text,
    total: column.real,
    created_at: column.text
  }),

  // ── Infraestructura ──
  sucursales: new Table({
    nombre: column.text,
    direccion: column.text,
    telefono: column.text,
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text
  }),

  perfiles: new Table({
    user_id: column.text,
    rol: column.text,
    sucursal_id: column.text,
    full_name: column.text,
    root_name: column.text,
    nombre: column.text,
    created_at: column.text,
    updated_at: column.text
  }),

  // ── Devoluciones ──
  devoluciones: new Table({
    venta_id: column.text,        // Referencia a la venta original
    cliente_id: column.text,      // Para abonar al monedero
    sucursal_id: column.text,
    usuario_id: column.text,
    total_devolucion: column.real, // Total del valor devuelto
    monto_monedero: column.real,   // Monto abonado al monedero (= total_devolucion)
    motivo: column.text,
    estado: column.text,          // PROCESADA | CANCELADA
    created_at: column.text
  }),

  devolucion_detalles: new Table({
    devolucion_id: column.text,
    producto_id: column.text,
    nombre: column.text,
    cantidad_devuelta: column.real,
    precio_unitario: column.real,
    subtotal: column.real
  }),
  // ── Cupones de Devolución ──
  cupones: new Table({
    codigo: column.text,       // Código único legible (ej: DEV-XKCD)
    tipo: column.text,         // 'devolucion'
    monto_original: column.real,
    monto_disponible: column.real,
    venta_origen_id: column.text,
    sucursal_id: column.text,
    usuario_id: column.text,
    motivo: column.text,
    estado: column.text,       // ACTIVO | CANJEADO | VENCIDO
    expira_at: column.text,
    created_at: column.text
  }),

  // ── Configuraciones Globales ──
  configuraciones_sistema: new Table({
    llave: column.text,
    valor: column.text,
    updated_at: column.text
  })

});
