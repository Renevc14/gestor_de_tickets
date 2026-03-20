/**
 * SEED DEMO — TicketFlow
 * Genera ~35 tickets simulando 1 mes de uso real del sistema.
 * Ejecutar: node prisma/seed-demo.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── Helpers de fecha ────────────────────────────────────────────────────────

/** Fecha hace N días + horas opcionales */
function daysAgo(days, hours = 0) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(d.getHours() - hours);
  return d;
}

/** Fecha aleatoria en un rango de días */
function randBetweenDays(minDays, maxDays) {
  const days = minDays + Math.random() * (maxDays - minDays);
  return daysAgo(days);
}

const SLA_HOURS = { CRITICA: 2, ALTA: 8, MEDIA: 24, BAJA: 72 };

function slaDeadline(createdAt, priority) {
  const d = new Date(createdAt);
  d.setHours(d.getHours() + SLA_HOURS[priority]);
  return d;
}

// ─── Datos de tickets de ejemplo ─────────────────────────────────────────────

const TICKET_TEMPLATES = [
  // CERRADOS (ya resueltos hace tiempo)
  { title: 'Error crítico en módulo de facturación', description: 'El sistema no genera PDF de facturas. Afecta a todos los clientes del área comercial.', priority: 'CRITICA', catName: 'Software', daysCreated: 28, finalStatus: 'CERRADO' },
  { title: 'Caída del servidor de producción', description: 'El servidor principal dejó de responder a las 03:00 AM. Se requiere intervención urgente.', priority: 'CRITICA', catName: 'Operaciones', daysCreated: 25, finalStatus: 'CERRADO' },
  { title: 'Impresora de red sin conexión — Piso 3', description: 'La impresora HP LaserJet del piso 3 no aparece en la red. Múltiples usuarios afectados.', priority: 'ALTA', catName: 'Hardware', daysCreated: 24, finalStatus: 'CERRADO' },
  { title: 'Acceso VPN bloqueado para equipo remoto', description: 'Cinco usuarios del equipo de desarrollo no pueden conectarse a la VPN corporativa desde ayer.', priority: 'ALTA', catName: 'Accesos', daysCreated: 22, finalStatus: 'CERRADO' },
  { title: 'Base de datos lenta — reportes tardan 10+ min', description: 'Los reportes mensuales que normalmente tardan 2 minutos ahora tardan más de 10 minutos.', priority: 'ALTA', catName: 'Software', daysCreated: 21, finalStatus: 'CERRADO' },
  { title: 'Monitor dañado — Finanzas', description: 'El monitor del equipo de la analista de finanzas tiene la pantalla rota. Necesita reemplazo.', priority: 'MEDIA', catName: 'Hardware', daysCreated: 20, finalStatus: 'CERRADO' },
  { title: 'Correos no llegan al dominio externo', description: 'Los correos enviados a Gmail y Hotmail no están llegando. El servidor de correo reporta error SMTP 550.', priority: 'ALTA', catName: 'Red', daysCreated: 19, finalStatus: 'CERRADO' },
  { title: 'Instalación de software de diseño — Adobe CC', description: 'El área de marketing necesita Adobe Creative Cloud en 3 equipos nuevos.', priority: 'MEDIA', catName: 'Software', daysCreated: 18, finalStatus: 'CERRADO' },
  { title: 'Solicitud de nuevo usuario en Active Directory', description: 'Nuevo empleado Juan Ramírez necesita cuenta de usuario con acceso a carpetas compartidas del área contable.', priority: 'BAJA', catName: 'Accesos', daysCreated: 17, finalStatus: 'CERRADO' },
  { title: 'Backup automatizado fallando desde el martes', description: 'El job de backup nocturno está fallando con error "insufficient disk space". El disco de destino está al 95%.', priority: 'ALTA', catName: 'Operaciones', daysCreated: 16, finalStatus: 'CERRADO' },
  { title: 'Actualización de antivirus en 20 equipos', description: 'Los equipos del área administrativa tienen el antivirus desactualizado. Requieren actualización manual.', priority: 'MEDIA', catName: 'Seguridad', daysCreated: 15, finalStatus: 'CERRADO' },
  { title: 'Firewall bloqueando aplicación de RRHH', description: 'La nueva aplicación de recursos humanos está siendo bloqueada por el firewall corporativo.', priority: 'ALTA', catName: 'Seguridad', daysCreated: 14, finalStatus: 'CERRADO' },

  // RESUELTOS (pendientes de cierre formal)
  { title: 'PC lenta en área de atención al cliente', description: 'El equipo del escritorio 12 tarda 8 minutos en iniciar. Posible falta de RAM o disco duro dañado.', priority: 'MEDIA', catName: 'Hardware', daysCreated: 12, finalStatus: 'RESUELTO' },
  { title: 'Error de permisos en carpeta compartida', description: 'Los usuarios del área legal no pueden acceder a la carpeta "Contratos 2025" en el servidor de archivos.', priority: 'MEDIA', catName: 'Accesos', daysCreated: 11, finalStatus: 'RESUELTO' },
  { title: 'Pantalla azul recurrente — Laptop gerencia', description: 'La laptop del gerente comercial presenta BSOD dos veces por semana. Error: DRIVER_IRQL_NOT_LESS_OR_EQUAL.', priority: 'ALTA', catName: 'Hardware', daysCreated: 10, finalStatus: 'RESUELTO' },
  { title: 'Configurar firma corporativa en Outlook', description: 'Todos los usuarios del área comercial necesitan la nueva firma corporativa configurada en Outlook.', priority: 'BAJA', catName: 'Software', daysCreated: 9, finalStatus: 'RESUELTO' },
  { title: 'Switch de red defectuoso — Sala de servidores', description: 'Un puerto del switch principal está causando colisiones de paquetes. Requiere reemplazo urgente.', priority: 'CRITICA', catName: 'Red', daysCreated: 8, finalStatus: 'RESUELTO' },

  // EN PROCESO
  { title: 'Migración de datos — ERP antiguo a nuevo sistema', description: 'Se requiere migrar 5 años de datos históricos del ERP legacy al nuevo sistema SAP. Proceso crítico.', priority: 'CRITICA', catName: 'Software', daysCreated: 7, finalStatus: 'EN_PROCESO' },
  { title: 'Configurar certificado SSL — Portal web', description: 'El certificado SSL del portal de clientes vence en 15 días. Debe renovarse y configurarse.', priority: 'ALTA', catName: 'Seguridad', daysCreated: 7, finalStatus: 'EN_PROCESO' },
  { title: 'Disco duro lleno en servidor de archivos', description: 'El servidor de archivos tiene el disco principal al 92% de capacidad. Se necesita limpieza y expansión.', priority: 'ALTA', catName: 'Operaciones', daysCreated: 6, finalStatus: 'EN_PROCESO' },
  { title: 'Instalar y configurar nuevo NAS', description: 'Se recibió el nuevo NAS Synology de 20TB. Necesita configuración RAID, cuotas y permisos por área.', priority: 'MEDIA', catName: 'Hardware', daysCreated: 6, finalStatus: 'EN_PROCESO' },
  { title: 'Política de contraseñas no aplica en AD', description: 'La nueva política de contraseñas (mínimo 12 caracteres) no está siendo forzada en Active Directory.', priority: 'ALTA', catName: 'Seguridad', daysCreated: 5, finalStatus: 'EN_PROCESO' },
  { title: 'Reportes de ventas con datos incorrectos', description: 'Los reportes del módulo de ventas muestran cifras duplicadas para los meses de enero y febrero.', priority: 'ALTA', catName: 'Software', daysCreated: 5, finalStatus: 'EN_PROCESO' },
  { title: 'Acceso remoto para nuevo técnico externo', description: 'El proveedor de mantenimiento necesita acceso temporal VPN para revisión del servidor de base de datos.', priority: 'MEDIA', catName: 'Accesos', daysCreated: 4, finalStatus: 'EN_PROCESO' },

  // ASIGNADOS (técnico asignado, aún no comenzó)
  { title: 'Teclado y mouse inalámbrico para sala de juntas', description: 'La sala de juntas principal necesita teclado y mouse inalámbrico para las presentaciones.', priority: 'BAJA', catName: 'Hardware', daysCreated: 4, finalStatus: 'ASIGNADO' },
  { title: 'Configurar VLAN para red de invitados', description: 'Se necesita crear una VLAN separada para conectividad WiFi de visitantes, aislada de la red corporativa.', priority: 'MEDIA', catName: 'Red', daysCreated: 3, finalStatus: 'ASIGNADO' },
  { title: 'Error en módulo de nómina — cálculo de horas extra', description: 'El sistema de nómina no está calculando correctamente las horas extra los días feriados.', priority: 'ALTA', catName: 'Software', daysCreated: 3, finalStatus: 'ASIGNADO' },
  { title: 'Cámaras de seguridad sin grabación', description: 'Tres cámaras del pasillo sur dejaron de grabar. El NVR muestra error de conexión con esas cámaras.', priority: 'ALTA', catName: 'Seguridad', daysCreated: 2, finalStatus: 'ASIGNADO' },

  // NUEVOS (recién creados, sin asignar)
  { title: 'Aplicación de contabilidad no abre en Windows 11', description: 'Después de la actualización de Windows 11, la aplicación ContaMax 2024 no carga. Error: DLL faltante.', priority: 'MEDIA', catName: 'Software', daysCreated: 2, finalStatus: 'NUEVO' },
  { title: 'Solicitud de segundo monitor — Desarrollador senior', description: 'El desarrollador del área de sistemas solicita un segundo monitor para aumentar productividad.', priority: 'BAJA', catName: 'Hardware', daysCreated: 1, finalStatus: 'NUEVO' },
  { title: 'Correo de phishing circulando en la empresa', description: 'Se detectó un correo de phishing suplantando al banco. Ya 3 usuarios hicieron clic en el enlace malicioso.', priority: 'CRITICA', catName: 'Seguridad', daysCreated: 1, finalStatus: 'NUEVO' },
  { title: 'Lentitud en conexión WiFi — Sala de capacitación', description: 'La conexión WiFi en la sala de capacitación es muy lenta cuando hay más de 10 personas conectadas.', priority: 'MEDIA', catName: 'Red', daysCreated: 0, finalStatus: 'NUEVO' },

  // REABIERTO
  { title: 'Impresora de recepción atascada con frecuencia', description: 'La impresora de recepción se atasca al menos 3 veces por día. Ya fue "reparada" la semana pasada pero el problema persiste.', priority: 'MEDIA', catName: 'Hardware', daysCreated: 13, finalStatus: 'REABIERTO' },
  { title: 'Error intermitente en conexión a base de datos', description: 'El sistema principal pierde conexión a la base de datos de forma aleatoria. Ocurre 2-3 veces por día.', priority: 'ALTA', catName: 'Software', daysCreated: 9, finalStatus: 'REABIERTO' },
];

const COMMENTS = {
  'CERRADO': [
    ['Revisando el problema, parece ser un bug en la versión 2.3.1.', 'Se identificó la causa raíz. Aplicando el parche de emergencia.', 'Parche aplicado. El sistema funciona correctamente. Ticket resuelto.'],
    ['Iniciando diagnóstico del incidente.', 'Problema identificado y solución aplicada. Favor confirmar funcionamiento.', 'Confirmado por el usuario. Cerrando ticket.'],
  ],
  'RESUELTO': [
    ['Asignado al técnico. Se revisará hoy en la tarde.', 'Se aplicó la solución. Por favor confirmar que todo funciona bien.'],
    ['Trabajando en el problema. Estimado de resolución: 2 horas.', 'Problema resuelto. Esperando confirmación del usuario solicitante.'],
  ],
  'EN_PROCESO': [
    ['Analizando el incidente. Se requiere acceso al servidor.', 'Acceso obtenido. Trabajando en la solución, estimado 4 horas.'],
    ['Revisando logs del sistema para identificar la causa.', 'Causa identificada. Implementando solución, se notificará cuando esté listo.'],
  ],
  'ASIGNADO': [
    ['Ticket recibido. Será atendido a la brevedad.'],
  ],
  'NUEVO': [
    ['Ticket creado. Esperando asignación de técnico.'],
  ],
  'REABIERTO': [
    ['El problema volvió a aparecer exactamente igual que antes.', 'Se reabre el ticket. La solución anterior no fue efectiva. Se investigará más a fondo.'],
  ],
};

async function main() {
  console.log('🎭 Iniciando carga de datos demo (simulación 1 mes)...\n');

  // Obtener usuarios y categorías existentes
  const admin    = await prisma.user.findUnique({ where: { email: 'admin@ticketflow.com' } });
  const tecnico  = await prisma.user.findUnique({ where: { email: 'tecnico@ticketflow.com' } });
  const usuario  = await prisma.user.findUnique({ where: { email: 'usuario@ticketflow.com' } });
  const cats     = await prisma.category.findMany();

  if (!admin || !tecnico || !usuario) {
    console.error('❌ Usuarios demo no encontrados. Ejecuta primero: npx prisma db seed');
    process.exit(1);
  }
  if (cats.length === 0) {
    console.error('❌ Categorías no encontradas. Ejecuta primero: npx prisma db seed');
    process.exit(1);
  }

  const catMap = Object.fromEntries(cats.map(c => [c.name, c]));

  let ticketsCreated = 0;
  let commentsCreated = 0;
  let historyCreated = 0;
  let auditCreated = 0;

  // ─── Crear tickets ─────────────────────────────────────────
  for (const tmpl of TICKET_TEMPLATES) {
    const cat = catMap[tmpl.catName] || cats[0];
    const createdAt = randBetweenDays(tmpl.daysCreated, Math.max(0, tmpl.daysCreated - 0.5));
    const sla = slaDeadline(createdAt, tmpl.priority);

    // Datos base del ticket
    const ticketData = {
      title:       tmpl.title,
      description: tmpl.description,
      priority:    tmpl.priority,
      status:      tmpl.finalStatus,
      category_id: cat.id,
      user_id:     usuario.id,
      sla_deadline: sla,
      created_at:  createdAt,
      updated_at:  createdAt,
    };

    // Asignar técnico si corresponde
    if (['ASIGNADO', 'EN_PROCESO', 'RESUELTO', 'CERRADO', 'REABIERTO'].includes(tmpl.finalStatus)) {
      ticketData.tech_id = tecnico.id;
    }

    // Fechas de resolución/cierre
    if (['RESUELTO', 'CERRADO'].includes(tmpl.finalStatus)) {
      ticketData.resolved_at = daysAgo(Math.max(0, tmpl.daysCreated - 2));
    }
    if (tmpl.finalStatus === 'CERRADO') {
      ticketData.closed_at = daysAgo(Math.max(0, tmpl.daysCreated - 1));
    }

    const ticket = await prisma.ticket.create({ data: ticketData });
    ticketsCreated++;

    // ─── Historial de transiciones de estado ────────────────
    const transitions = buildTransitions(tmpl.finalStatus, createdAt, tecnico.id, admin.id, usuario.id);

    for (const t of transitions) {
      await prisma.ticketHistory.create({
        data: {
          ticket_id:     ticket.id,
          user_id:       t.userId,
          field_changed: t.field,
          old_value:     t.oldValue,
          new_value:     t.newValue,
          timestamp:     t.timestamp,
        }
      });
      historyCreated++;
    }

    // ─── Comentarios ─────────────────────────────────────────
    const commentGroup = COMMENTS[tmpl.finalStatus] || COMMENTS['NUEVO'];
    const commentTexts = commentGroup[Math.floor(Math.random() * commentGroup.length)];

    for (let i = 0; i < commentTexts.length; i++) {
      const isAdminComment = i > 0; // primer comentario del usuario, resto del técnico/admin
      const commentAt = new Date(createdAt.getTime() + (i + 1) * 2 * 60 * 60 * 1000); // +2h por cada comentario

      await prisma.comment.create({
        data: {
          ticket_id: ticket.id,
          user_id:   isAdminComment ? tecnico.id : usuario.id,
          content:   commentTexts[i],
          timestamp: commentAt,
        }
      });
      commentsCreated++;
    }
  }

  // ─── Audit logs de actividad del mes ────────────────────────
  const auditEvents = [
    // Logins exitosos durante el mes
    ...Array.from({ length: 20 }, (_, i) => ({
      user_id:    admin.id,
      action:     'LOGIN_SUCCESS',
      resource:   'auth',
      ip_address: '192.168.1.10',
      success:    true,
      timestamp:  daysAgo(Math.floor(Math.random() * 30)),
    })),
    ...Array.from({ length: 18 }, (_, i) => ({
      user_id:    tecnico.id,
      action:     'LOGIN_SUCCESS',
      resource:   'auth',
      ip_address: '192.168.1.25',
      success:    true,
      timestamp:  daysAgo(Math.floor(Math.random() * 30)),
    })),
    ...Array.from({ length: 15 }, (_, i) => ({
      user_id:    usuario.id,
      action:     'LOGIN_SUCCESS',
      resource:   'auth',
      ip_address: '192.168.1.45',
      success:    true,
      timestamp:  daysAgo(Math.floor(Math.random() * 30)),
    })),
    // Intentos fallidos de login (seguridad)
    { user_id: null, action: 'LOGIN_FAILED', resource: 'auth', ip_address: '201.55.123.87', success: false, error_msg: 'Credenciales inválidas', timestamp: daysAgo(15) },
    { user_id: null, action: 'LOGIN_FAILED', resource: 'auth', ip_address: '201.55.123.87', success: false, error_msg: 'Credenciales inválidas', timestamp: daysAgo(15) },
    { user_id: null, action: 'LOGIN_FAILED', resource: 'auth', ip_address: '201.55.123.87', success: false, error_msg: 'Credenciales inválidas', timestamp: daysAgo(15) },
    { user_id: null, action: 'ACCOUNT_LOCKED', resource: 'auth', ip_address: '201.55.123.87', success: false, error_msg: 'Cuenta bloqueada por intentos fallidos', timestamp: daysAgo(15) },
    { user_id: null, action: 'LOGIN_FAILED', resource: 'auth', ip_address: '189.77.44.200', success: false, error_msg: 'Credenciales inválidas', timestamp: daysAgo(8) },
    { user_id: null, action: 'LOGIN_FAILED', resource: 'auth', ip_address: '189.77.44.200', success: false, error_msg: 'Credenciales inválidas', timestamp: daysAgo(8) },
    // Cambios de contraseña
    { user_id: tecnico.id,  action: 'PASSWORD_CHANGED', resource: 'users', success: true, ip_address: '192.168.1.25', timestamp: daysAgo(20) },
    { user_id: usuario.id,  action: 'PASSWORD_CHANGED', resource: 'users', success: true, ip_address: '192.168.1.45', timestamp: daysAgo(12) },
    // Accesos denegados
    { user_id: usuario.id, action: 'ACCESS_DENIED', resource: 'reports', success: false, error_msg: 'Permisos insuficientes', ip_address: '192.168.1.45', timestamp: daysAgo(10) },
    { user_id: usuario.id, action: 'ACCESS_DENIED', resource: 'users',   success: false, error_msg: 'Permisos insuficientes', ip_address: '192.168.1.45', timestamp: daysAgo(5) },
    // SLA breach detectado
    { user_id: null, action: 'SLA_BREACH', resource: 'tickets', success: true, details: { priority: 'CRITICA', horasVencido: 3 }, timestamp: daysAgo(25) },
    { user_id: null, action: 'SLA_BREACH', resource: 'tickets', success: true, details: { priority: 'ALTA',    horasVencido: 5 }, timestamp: daysAgo(20) },
    { user_id: null, action: 'SLA_BREACH', resource: 'tickets', success: true, details: { priority: 'ALTA',    horasVencido: 2 }, timestamp: daysAgo(10) },
    // Creación de usuarios por admin
    { user_id: admin.id, action: 'USER_CREATED', resource: 'users', success: true, ip_address: '192.168.1.10', timestamp: daysAgo(28) },
  ];

  for (const evt of auditEvents) {
    await prisma.auditLog.create({ data: evt });
    auditCreated++;
  }

  console.log('✅ Datos demo cargados exitosamente:');
  console.log(`   📋 Tickets:       ${ticketsCreated}`);
  console.log(`   💬 Comentarios:   ${commentsCreated}`);
  console.log(`   📜 Historial:     ${historyCreated} entradas`);
  console.log(`   🔍 Audit logs:    ${auditCreated}`);
  console.log('\n  Distribución de tickets:');
  const counts = {};
  TICKET_TEMPLATES.forEach(t => { counts[t.finalStatus] = (counts[t.finalStatus] || 0) + 1; });
  Object.entries(counts).forEach(([s, n]) => console.log(`   ${s.padEnd(12)}: ${n}`));
}

// ─── Construir transiciones de estado según el estado final ──────────────────

function buildTransitions(finalStatus, createdAt, techId, adminId, userId) {
  const base = createdAt.getTime();
  const h = (n) => new Date(base + n * 60 * 60 * 1000); // +N horas desde creación

  const T = [];

  const add = (field, oldVal, newVal, hoursAfter, actorId) =>
    T.push({ field, oldValue: oldVal, newValue: newVal, timestamp: h(hoursAfter), userId: actorId });

  switch (finalStatus) {
    case 'CERRADO':
      add('status', 'NUEVO',      'ASIGNADO',   1,  adminId);
      add('tech_id', null,        String(techId), 1, adminId);
      add('status', 'ASIGNADO',   'EN_PROCESO',  3,  techId);
      add('status', 'EN_PROCESO', 'RESUELTO',    10, techId);
      add('status', 'RESUELTO',   'CERRADO',     30, adminId);
      break;
    case 'RESUELTO':
      add('status', 'NUEVO',      'ASIGNADO',   1,  adminId);
      add('tech_id', null,        String(techId), 1, adminId);
      add('status', 'ASIGNADO',   'EN_PROCESO',  4,  techId);
      add('status', 'EN_PROCESO', 'RESUELTO',    14, techId);
      break;
    case 'EN_PROCESO':
      add('status', 'NUEVO',    'ASIGNADO',   2,  adminId);
      add('tech_id', null,      String(techId), 2, adminId);
      add('status', 'ASIGNADO', 'EN_PROCESO',  6,  techId);
      break;
    case 'ASIGNADO':
      add('status', 'NUEVO',    'ASIGNADO',   3,  adminId);
      add('tech_id', null,      String(techId), 3, adminId);
      break;
    case 'REABIERTO':
      add('status', 'NUEVO',      'ASIGNADO',   1,  adminId);
      add('tech_id', null,        String(techId), 1, adminId);
      add('status', 'ASIGNADO',   'EN_PROCESO',  3,  techId);
      add('status', 'EN_PROCESO', 'RESUELTO',    8,  techId);
      add('status', 'RESUELTO',   'REABIERTO',   24, userId);
      break;
    case 'NUEVO':
    default:
      // Sin transiciones aún
      break;
  }

  return T;
}

main()
  .catch((e) => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
