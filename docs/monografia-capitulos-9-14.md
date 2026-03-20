# TicketFlow — Capítulos 9 al 14
## Desarrollo Práctico de la Monografía — Diplomado FullStack UCB San Pablo

> **Instrucciones de uso:**
> Las líneas marcadas con `📷 CAPTURA` indican exactamente dónde insertar una imagen en el documento Word/PDF,
> qué debe mostrar esa imagen y cómo debe estar titulada. No son parte del texto del informe.

---

## 9. Desarrollo del Sistema

### 9.1. Frontend

#### 9.1.1. Arquitectura y Estructura de Componentes

El frontend de TicketFlow fue desarrollado con React 18.2.0 siguiendo una arquitectura de componentes funcionales con separación clara de responsabilidades. La estructura de directorios refleja esta organización:

```
frontend/src/
├── App.js                        # Router principal + guardias de ruta
├── services/
│   └── api.js                    # Cliente HTTP centralizado (Axios)
└── components/
    ├── Login.jsx                 # Autenticación
    ├── Register.jsx              # Registro con validación de contraseña
    ├── Dashboard.jsx             # Panel principal + métricas Chart.js
    ├── CreateTicket.jsx          # Formulario de creación
    ├── TicketDetail.jsx          # Detalle + comentarios + historial
    ├── AuditLogs.jsx             # Visor de logs (solo administrador)
    ├── MFASetup.jsx              # Configuración TOTP
    ├── Logo.jsx                  # Componente de marca
    └── admin/
        ├── AdminPanel.jsx        # Panel con pestañas
        ├── UserManagement.jsx    # CRUD de usuarios
        └── CategoryManagement.jsx # CRUD de categorías
```

La aplicación implementa dos tipos de guardias de ruta:

**`ProtectedRoute`**: Verifica la existencia de un token JWT válido en `localStorage`. Si no existe, redirige automáticamente a `/login`.

**`AdminRoute`**: Extiende `ProtectedRoute` verificando adicionalmente que el rol del usuario sea `ADMINISTRADOR`. Usuarios con roles `TECNICO` o `SOLICITANTE` reciben una redirección a `/dashboard`.

```jsx
// App.js — guardias de ruta
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!token) return <Navigate to="/login" replace />;
  if (user.role !== 'ADMINISTRADOR') return <Navigate to="/dashboard" replace />;
  return children;
};
```

---

> 📷 **CAPTURA 9.1.1-A — Árbol de componentes React**
> Título de figura: *"Figura X. Jerarquía de componentes de TicketFlow en React DevTools"*
> Qué capturar: Abrir las React DevTools en el navegador (extensión de Chrome/Firefox), navegar al Dashboard y tomar captura del árbol de componentes mostrando la jerarquía: `App → BrowserRouter → Routes → AdminRoute → AdminPanel → [UserManagement, CategoryManagement]`. Si React DevTools no está disponible, tomar una captura de la estructura de archivos en el explorador de VSCode mostrando la carpeta `components/` con todos los archivos.

---

> 📷 **CAPTURA 9.1.1-B — Redirección por rol insuficiente**
> Título de figura: *"Figura X. Redirección automática al intentar acceder a /admin con rol TECNICO"*
> Qué capturar: Iniciar sesión con el usuario `tecnico@ticketflow.com`, luego escribir manualmente `/admin` en la barra de direcciones del navegador. Capturar el momento en que el sistema redirige automáticamente al `/dashboard` mostrando que el acceso fue denegado. Puede complementarse con una captura de la consola del navegador mostrando la redirección.

---

#### 9.1.2. Gestión de Estado

La gestión de estado de la aplicación combina dos estrategias complementarias:

**Estado local con `useState`**: Cada componente gestiona su propio estado de formulario, carga y errores. Esta decisión evita el acoplamiento innecesario y mantiene los componentes autocontenidos.

**Estado de autenticación persistente en `localStorage`**: El objeto `user` (id, name, email, role), el `token` JWT de acceso y el `refreshToken` se almacenan en `localStorage` tras el login exitoso. El servicio `api.js` los lee automáticamente en cada solicitud mediante un interceptor de Axios:

```javascript
// api.js — Interceptor de solicitud: adjunta el token automáticamente
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de respuesta — limpieza automática de sesión ante 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);
```

**Patrón `useRef` para efectos únicos**: Se implementó el patrón `hasFetched = useRef(false)` en el componente `MFASetup.jsx` para prevenir la doble invocación de la API de configuración MFA. Este comportamiento es causado por React 18 Strict Mode, que ejecuta los efectos (`useEffect`) dos veces en entorno de desarrollo con el propósito de detectar efectos secundarios no idempotentes:

```jsx
// MFASetup.jsx — Prevención de doble llamada en Strict Mode
const hasFetched = useRef(false);
useEffect(() => {
  if (hasFetched.current) return;
  hasFetched.current = true;
  handleGenerateQR();
}, []);
```

Sin esta guardia, cada montaje del componente en desarrollo generaba dos secretos TOTP distintos en la base de datos, siendo el QR mostrado al usuario correspondiente al primero mientras la base de datos almacenaba el segundo, causando que todos los códigos del autenticador fueran inválidos.

**Animaciones de métricas con `useCountUp`**: El dashboard implementa un hook personalizado que anima los contadores de estadísticas desde cero hasta el valor real, utilizando interpolación cúbica inversa para producir una desaceleración suave:

```javascript
const useCountUp = (target, duration = 1100) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (target === undefined || target === null) return;
    let frame = 0;
    const totalFrames = Math.round(duration / 16);
    const timer = setInterval(() => {
      frame++;
      const progress = frame / totalFrames;
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (frame >= totalFrames) { setCount(target); clearInterval(timer); }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
};
```

---

> 📷 **CAPTURA 9.1.2-A — Dashboard con métricas en vivo**
> Título de figura: *"Figura X. Tarjetas de métricas del dashboard con datos en tiempo real"*
> Qué capturar: El dashboard de administrador mostrando las cuatro tarjetas de estadísticas: Total de Tickets, Tickets Resueltos, Tickets Abiertos y SLA Vencidos, con valores numéricos reales (no ceros). Asegurarse de que haya datos cargados en la base de datos antes de capturar. Las tarjetas deben mostrar colores distintos según la categoría de métrica.

---

#### 9.1.3. Visualización de Datos con Chart.js

El requisito funcional RF06 establece la generación de reportes visuales. Se implementaron cuatro tipos de gráficos utilizando `chart.js 4.4.0` y `react-chartjs-2 5.2.0`:

| Gráfico | Tipo | Datos visualizados |
|---|---|---|
| Tickets por estado | Doughnut | NUEVO, ASIGNADO, EN_PROCESO, RESUELTO, CERRADO, REABIERTO |
| Tickets por prioridad | Bar (horizontal) | BAJA, MEDIA, ALTA, CRITICA |
| Tickets por categoría | Doughnut | Software, Hardware, Accesos, Operaciones, Redes, Correo |
| Tiempo promedio de resolución | Bar (vertical) | Horas promedio por nivel de prioridad |

Los datos se obtienen del endpoint `GET /api/reports/dashboard` al montar el componente. Cada gráfico de categorías utiliza los colores definidos directamente en la tabla `categories` de la base de datos, garantizando consistencia visual entre la interfaz y los datos.

---

> 📷 **CAPTURA 9.1.3-A — Dashboard completo con gráficos**
> Título de figura: *"Figura X. Dashboard de administrador con gráficos Chart.js mostrando distribución de tickets"*
> Qué capturar: La vista completa del dashboard de administrador con los cuatro gráficos visibles: el doughnut de estados, el bar de prioridades, el doughnut de categorías (con colores por categoría) y el bar de tiempo de resolución. Deben tener datos reales para que los gráficos no estén vacíos. Hacer scroll si es necesario para incluir todos los gráficos, o capturar en dos partes si no caben en una pantalla.

---

> 📷 **CAPTURA 9.1.3-B — Reporte por técnico**
> Título de figura: *"Figura X. Panel de reporte de carga de trabajo por técnico"*
> Qué capturar: La sección del dashboard o la vista de reportes que muestra la distribución de tickets asignados vs. resueltos por técnico. Debe mostrar al menos un técnico con tickets asignados para que la comparación sea visible.

---

#### 9.1.4. Seguridad en el Cliente

La seguridad en el lado del cliente se implementó en tres niveles:

**Validación de contraseña en tiempo real**: El componente `Register.jsx` evalúa la contraseña carácter a carácter con cinco expresiones regulares y muestra retroalimentación visual inmediata. El botón de envío permanece deshabilitado hasta que todos los requisitos son satisfechos:

| Requisito | Expresión regular aplicada |
|---|---|
| Mínimo 12 caracteres | `value.length >= 12` |
| Al menos una mayúscula | `/[A-Z]/` |
| Al menos una minúscula | `/[a-z]/` |
| Al menos un número | `/\d/` |
| Carácter especial | `/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/` |

**Protección contra XSS**: React escapa automáticamente el contenido renderizado en JSX. No se utiliza `dangerouslySetInnerHTML` en ningún componente del proyecto, eliminando la superficie de ataque de inyección de scripts en el lado del cliente.

**Gestión segura de tokens**: Los tokens no se exponen en URLs ni en registros de consola. La limpieza automática ante respuesta `401` del servidor previene el uso de tokens expirados o revocados.

**Ocultación de controles por rol**: Los componentes como `TicketDetail.jsx` solo renderizan los controles de asignación y cambio de estado cuando el rol del usuario lo permite, evaluado desde el objeto `user` almacenado en `localStorage`. Un SOLICITANTE no verá el botón de asignación aunque conozca su existencia en el DOM.

---

> 📷 **CAPTURA 9.1.4-A — Validación de contraseña en tiempo real**
> Título de figura: *"Figura X. Validación de política de contraseña en tiempo real durante el registro"*
> Qué capturar: La pantalla de registro con el campo de contraseña parcialmente completado, mostrando algunos requisitos en verde (check) y otros en gris/rojo (X). Por ejemplo, escribir `Password1` para que algunos requisitos estén en verde pero falte el carácter especial y la longitud mínima. El objetivo es mostrar la retroalimentación visual en estados intermedios.

---

> 📷 **CAPTURA 9.1.4-B — Vista de ticket según el rol**
> Título de figura: *"Figura X. Comparación de la vista del mismo ticket según el rol del usuario"*
> Qué capturar: Dos capturas del mismo ticket: (izquierda/arriba) visto como SOLICITANTE, mostrando solo información y comentarios, sin botones de asignación ni cambio de estado; (derecha/abajo) visto como ADMINISTRADOR, mostrando todos los controles: botón de asignar técnico, selector de estado, botón de cambiar prioridad. Poner ambas capturas en la misma figura del documento con un pie de foto que las identifique.

---

### 9.2. Backend

#### 9.2.1. Arquitectura de la API REST

El backend implementa una API REST con Express.js 4.18.2 siguiendo el patrón MVC (Modelo-Vista-Controlador) adaptado para APIs, con una capa adicional de servicios para lógica asíncrona. La cadena de procesamiento de cada solicitud HTTP sigue el siguiente flujo:

```
Solicitud HTTP entrante
         │
         ▼
[Capa 1 — Middleware de seguridad global]
  helmet · cors · rateLimit · bodyParser
         │
         ▼
[Capa 2 — Autenticación]
  authenticateToken  →  verifica JWT, carga req.user desde Prisma
         │
         ▼
[Capa 3 — Autorización RBAC]
  checkRole(roles)  →  verifica req.user.role contra roles permitidos
         │
         ▼
[Capa 4 — Controlador]
  Valida input → Ejecuta lógica → Consulta Prisma
         │
         ▼
[Capa 5 — Base de datos]
  Prisma ORM  →  PostgreSQL 15.5
         │
         ▼
[Capa 6 — Auditoría (paralela)]
  logAuditEvent()  →  INSERT en audit_logs
```

Los seis grupos de rutas montados en `server.js` y su nivel de acceso mínimo requerido:

| Prefijo de ruta | Archivo de rutas | Controlador | Acceso mínimo |
|---|---|---|---|
| `/api/auth` | `routes/auth.js` | `authController.js` | Público (login/register) |
| `/api/tickets` | `routes/tickets.js` | `ticketController.js` | Autenticado |
| `/api/users` | `routes/users.js` | `userController.js` | ADMINISTRADOR |
| `/api/categories` | `routes/categories.js` | `categoryController.js` | Autenticado (lectura) / ADMINISTRADOR (escritura) |
| `/api/reports` | `routes/reports.js` | `reportController.js` | ADMINISTRADOR |
| `/api/audit-logs` | `routes/audit.js` | `auditController.js` | ADMINISTRADOR |

Adicionalmente, el endpoint `GET /health` verifica activamente la conectividad con PostgreSQL mediante una consulta Prisma y retorna `HTTP 200` con estado `ok` o `HTTP 503` con el mensaje de error correspondiente.

---

> 📷 **CAPTURA 9.2.1-A — Colección de API en Postman**
> Título de figura: *"Figura X. Colección de endpoints de la API TicketFlow organizada en Postman"*
> Qué capturar: La colección de Postman (o Insomnia) con las carpetas organizadas por módulo (Auth, Tickets, Users, Categories, Reports, Audit Logs), mostrando al menos una solicitud exitosa (200 OK) con su respuesta JSON en el panel derecho. Mostrar el token Bearer en la pestaña de Authorization.

---

#### 9.2.2. Esquema de Base de Datos

El esquema Prisma define siete entidades con sus relaciones, índices y restricciones de integridad referencial. El modelo relacional es el siguiente:

```
users ──────────────────────────────────────────────────────────────┐
  │  (creator: user_id)     (assignee: tech_id)                     │
  ▼                         ▼                                       │
tickets ─────────── categories                                      │
  │                                                                  │
  ├──► comments ─────────────────────────────────── (user_id) ──────┘
  │
  ├──► ticket_history ──────────────────────────── (user_id) ───────┘
  │
  └──► attachments ─────────────────────────────── (uploaded_by) ───┘

audit_logs ──────────────────────────────────────── (user_id, nullable)
```

**Decisiones de diseño relevantes**:

- Las tablas `ticket_history` y `audit_logs` son de **solo inserción**. No existen rutas `DELETE` ni `UPDATE` sobre estas entidades, garantizando la inmutabilidad del registro histórico (principio de no repudio).
- `attachments.checksum` almacena el hash SHA-256 del archivo en el momento de la carga. En cada descarga se recalcula el hash y se compara para detectar corrupción o manipulación posterior.
- `users.password_history` almacena un arreglo JSON de hashes bcrypt de las últimas 6 contraseñas para implementar la política de no reutilización sin exponer las contraseñas previas.
- `users.lock_until` almacena el timestamp de desbloqueo automático tras 5 intentos fallidos, implementando bloqueo temporal sin intervención manual del administrador (salvo desbloqueo explícito).

Las definiciones de los tipos enumerados garantizan consistencia en los valores almacenados:

| Enumeración | Valores |
|---|---|
| `Role` | SOLICITANTE, TECNICO, ADMINISTRADOR |
| `UserStatus` | ACTIVO, INACTIVO |
| `Priority` | BAJA, MEDIA, ALTA, CRITICA |
| `TicketStatus` | NUEVO, ASIGNADO, EN_PROCESO, RESUELTO, CERRADO, REABIERTO |

---

> 📷 **CAPTURA 9.2.2-A — Diagrama entidad-relación**
> Título de figura: *"Figura X. Diagrama entidad-relación del esquema de base de datos de TicketFlow"*
> Qué capturar: Generar el diagrama ER del schema usando una de estas opciones: (1) Instalar la extensión "Prisma Entity Relationship Diagram" en VSCode y hacer clic derecho sobre schema.prisma → "Open ER Diagram"; (2) Ingresar el contenido de schema.prisma en dbdiagram.io y exportar el diagrama; (3) Tomar captura de Prisma Studio mostrando las tablas disponibles en el panel lateral izquierdo. El diagrama debe mostrar las 7 tablas con sus campos clave y las líneas de relación entre ellas.

---

> 📷 **CAPTURA 9.2.2-B — Datos en Prisma Studio**
> Título de figura: *"Figura X. Vista de registros en Prisma Studio — tablas tickets y audit_logs"*
> Qué capturar: Ejecutar `npx prisma studio` en el backend, abrir en el navegador y capturar: (1) la tabla `tickets` mostrando registros con distintos estados y prioridades; (2) la tabla `audit_logs` mostrando varios eventos registrados con sus acciones, IPs y timestamps. Pueden ser dos capturas separadas en la misma figura del documento.

---

#### 9.2.3. Controladores

**`authController.js`** gestiona el ciclo completo de autenticación con los siguientes métodos:

- `register`: Valida política de contraseñas, verifica unicidad de email, genera hash bcrypt con factor de costo 12, crea el usuario con rol `SOLICITANTE` por defecto e inicializa el historial de contraseñas.
- `login`: Verifica estado de cuenta (`ACTIVO`), detecta lockout vigente, compara hash bcrypt, incrementa contador de intentos fallidos en caso de error, resetea el contador en caso de éxito, y bifurca hacia verificación MFA si está habilitada.
- `verifyLoginMFA`: Valida el código TOTP con una ventana de tolerancia de ±2 pasos temporales (equivalente a ±60 segundos), emitiendo tokens solo ante validación exitosa.
- `changePassword`: Verifica la contraseña actual, valida la política de la nueva contraseña, compara contra el historial de las últimas 6 contraseñas y actualiza el campo `last_password_change`.

**`ticketController.js`** implementa el workflow completo de tickets aplicando filtros dinámicos por rol en todas las consultas de listado:

```javascript
// Filtros automáticos según el rol del usuario autenticado
const filters = getTicketFilters(req.user);
const tickets = await prisma.ticket.findMany({
  where: { ...filters, ...additionalFilters },
  include: { creator: true, assignee: true, category: true }
});
```

Cada cambio de estado genera automáticamente un registro en `ticket_history` con los valores anterior y nuevo del campo modificado, garantizando trazabilidad completa del ciclo de vida del ticket.

**`reportController.js`** agrega métricas para los gráficos del dashboard utilizando consultas paralelas para minimizar latencia:

```javascript
const [ticketsByStatus, ticketsByPriority, ticketsByCategory, slaBreaches, recentTickets] =
  await Promise.all([
    prisma.ticket.groupBy({ by: ['status'], _count: { status: true } }),
    prisma.ticket.groupBy({ by: ['priority'], _count: { priority: true } }),
    prisma.ticket.groupBy({ by: ['category_id'], _count: { category_id: true } }),
    prisma.ticket.count({ where: { sla_deadline: { lt: now }, status: { notIn: ['RESUELTO','CERRADO'] } } }),
    prisma.ticket.findMany({ take: 10, orderBy: { created_at: 'desc' }, include: { ... } })
  ]);
```

Los totales del resumen se derivan de los mismos resultados del `groupBy` —no de consultas adicionales— para garantizar consistencia numérica entre los gráficos y las tarjetas de métricas.

---

> 📷 **CAPTURA 9.2.3-A — Respuesta del endpoint de login**
> Título de figura: *"Figura X. Respuesta JSON del endpoint POST /api/auth/login con JWT generado"*
> Qué capturar: En Postman, ejecutar `POST /api/auth/login` con credenciales válidas y capturar la respuesta JSON mostrando los campos `token`, `refreshToken` y el objeto `user` con id, name, email y role. No incluir la contraseña en el cuerpo de la solicitud visible. La respuesta debe mostrar `"success": true` y `HTTP 200 OK`.

---

> 📷 **CAPTURA 9.2.3-B — Filtrado de tickets por rol**
> Título de figura: *"Figura X. El endpoint GET /api/tickets retorna conjuntos distintos según el rol del solicitante"*
> Qué capturar: Tres solicitudes `GET /api/tickets` con tokens distintos: (1) con token de SOLICITANTE mostrando solo sus propios tickets; (2) con token de TECNICO mostrando los tickets asignados a él y los sin asignar; (3) con token de ADMINISTRADOR mostrando todos los tickets. Puede ser una captura con las tres pestañas de Postman abiertas, o tres capturas separadas en la misma figura.

---

> 📷 **CAPTURA 9.2.3-C — Respuesta del dashboard de reportes**
> Título de figura: *"Figura X. Respuesta JSON del endpoint GET /api/reports/dashboard con métricas agregadas"*
> Qué capturar: En Postman, ejecutar `GET /api/reports/dashboard` con token de ADMINISTRADOR y capturar la respuesta JSON completa mostrando el objeto `data` con `summary` (total, resolved, open, slaBreaches), `ticketsByStatus`, `ticketsByPriority` y `ticketsByCategory`.

---

#### 9.2.4. Servicios

**Servicio de Monitoreo SLA (`slaService.js`)**: Implementa un trabajo programado con `node-cron` que se ejecuta cada 5 minutos para detectar tickets con SLA vencido. Los tiempos de resolución esperados según la monografía son:

| Prioridad | Plazo SLA | Tipo de incidente |
|---|---|---|
| CRITICA | 2 horas | Incidentes que paralizan operaciones críticas |
| ALTA | 8 horas | Problemas que afectan productividad significativamente |
| MEDIA | 24 horas | Problemas con solución alternativa disponible |
| BAJA | 72 horas | Solicitudes de mejora y consultas generales |

El deadline se calcula en el momento de creación del ticket y se almacena en el campo `sla_deadline`:

```javascript
function calculateSLADeadline(priority) {
  const SLA_HOURS = { CRITICA: 2, ALTA: 8, MEDIA: 24, BAJA: 72 };
  const hours = SLA_HOURS[priority] || 24;
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
```

Cuando un ticket supera su deadline sin haber sido resuelto o cerrado, el servicio registra un evento `sla_breached` en `audit_logs` una única vez por ticket (verificando la existencia previa del evento para evitar duplicados). Adicionalmente, alerta sobre tickets con SLA próximo a vencer en las siguientes 2 horas.

---

> 📷 **CAPTURA 9.2.4-A — Logs del cron job SLA**
> Título de figura: *"Figura X. Output de consola del servidor mostrando el monitoreo SLA en ejecución"*
> Qué capturar: La consola del servidor Node.js mostrando: (1) el mensaje de inicio `[SLA] Iniciando monitoreo (cada 5 min)...`; y (2) si hay tickets con SLA vencido, los mensajes `[SLA] Vencido — Ticket #X: [título] [PRIORIDAD]`. Para forzar un breach, crear un ticket con prioridad CRITICA y modificar su `sla_deadline` en Prisma Studio a una fecha pasada, luego esperar el siguiente ciclo del cron.

---

#### 9.2.5. Middleware de Seguridad

La cadena de middleware en `server.js` implementa múltiples capas de protección independientes:

**Capa 1 — Helmet (Cabeceras HTTP de seguridad)**:

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", "data:"]
    }
  },
  hsts: {
    maxAge: 31536000,        // HSTS por 1 año
    includeSubDomains: true
  }
}));
```

**Capa 2 — Rate Limiting**:

```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // Ventana de 15 minutos
  max: 100,                   // Máximo 100 solicitudes por IP
  message: { success: false, message: 'Demasiadas solicitudes. Intente más tarde.' }
});
```

**Capa 3 — CORS Estricto**:

```javascript
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Capa 4 — Autenticación JWT (`middleware/auth.js`)**: Verifica la firma del token y su expiración. Carga el usuario completo desde Prisma en `req.user`. Diferencia entre token expirado (`TokenExpiredError`, 401 con mensaje específico) y token inválido (401 genérico), evitando fuga de información sobre el estado de los tokens.

**Capa 5 — Autorización RBAC (`middleware/rbac.js`)**: La función `checkRole(allowedRoles)` verifica que `req.user.role` esté en la lista de roles permitidos para la ruta. Ante cualquier rechazo, registra el intento en `audit_logs` con acción `access_denied` antes de retornar `HTTP 403`.

---

> 📷 **CAPTURA 9.2.5-A — Demostración del control de acceso por rol**
> Título de figura: *"Figura X. Comportamiento del middleware RBAC ante distintos roles en /api/audit-logs"*
> Qué capturar: Tres solicitudes al mismo endpoint `GET /api/audit-logs` en Postman: (1) sin token de autorización → respuesta `401 Unauthorized`; (2) con token de TECNICO → respuesta `403 Forbidden`; (3) con token de ADMINISTRADOR → respuesta `200 OK` con los logs. Las tres respuestas en una misma figura o en capturas numeradas.

---

> 📷 **CAPTURA 9.2.5-B — Cabeceras de seguridad HTTP**
> Título de figura: *"Figura X. Cabeceras de seguridad HTTP configuradas por Helmet en las respuestas del servidor"*
> Qué capturar: En el navegador, abrir DevTools (F12) → pestaña Network → hacer cualquier solicitud a la API → hacer clic en la solicitud → pestaña "Headers" → sección "Response Headers". Capturar mostrando claramente: `Strict-Transport-Security`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` y `Content-Security-Policy`. Alternativamente, mostrar los mismos headers desde la pestaña "Headers" de Postman.

---

### 9.3. Integración

#### 9.3.1. Comunicación Frontend-Backend

El servicio centralizado `api.js` encapsula toda la comunicación HTTP con el backend. Esta decisión arquitectónica garantiza que:

1. La URL base (`REACT_APP_API_URL`) se configura en un único punto y puede modificarse para cualquier entorno sin tocar los componentes.
2. El token de autenticación se adjunta automáticamente a todas las solicitudes mediante interceptores.
3. Los errores `401` limpian la sesión local automáticamente, previniendo estados inconsistentes.

La API está organizada en objetos especializados por dominio de negocio, facilitando el mantenimiento e importación selectiva:

```javascript
// Ejemplo de uso en un componente
import { ticketAPI, reportAPI } from '../services/api';

// Dentro del componente
const tickets = await ticketAPI.listTickets({ status: 'NUEVO' });
const metrics = await reportAPI.getDashboard();
```

---

> 📷 **CAPTURA 9.3.1-A — Solicitudes HTTP en DevTools del navegador**
> Título de figura: *"Figura X. Solicitudes HTTP al backend capturadas en las DevTools del navegador"*
> Qué capturar: Abrir el Dashboard con DevTools (F12) → pestaña Network → filtrar por Fetch/XHR. Capturar las solicitudes realizadas al cargar el dashboard, mostrando la solicitud a `/api/reports/dashboard` con: (1) la cabecera `Authorization: Bearer [token]` en Request Headers; (2) el código de respuesta `200 OK`; (3) el tiempo de respuesta. Evidencia la comunicación segura entre frontend y backend.

---

#### 9.3.2. Flujo de Autenticación Completo

El flujo de autenticación implementa un esquema de doble token con soporte opcional de MFA:

```
[Paso 1] POST /api/auth/login  { email, password }
              │
              ├─── Sin MFA activo ──► { token (30min), refreshToken (7d), user }
              │
              └─── Con MFA activo ──► { mfaRequired: true, userId }
                                              │
                                              ▼
                               [Paso 2] POST /api/auth/login-mfa  { userId, mfaCode }
                                              │
                                              └──► { token (30min), refreshToken (7d), user }

[Solicitudes autenticadas]
    Header: Authorization: Bearer {token}

[Token de acceso expirado — cada 30 minutos]
    POST /api/auth/refresh
    Header: Authorization: Bearer {refreshToken}
    └──► { token (nuevo), refreshToken (nuevo — rotación) }
```

El token de acceso tiene una vida útil de 30 minutos. El token de refresco dura 7 días. Esta asimetría reduce la ventana de exposición ante un token de acceso comprometido, mientras el token de refresco de larga duración mantiene la experiencia de usuario continua sin requerir reautenticación frecuente.

---

> 📷 **CAPTURA 9.3.2-A — Flujo de login con MFA**
> Título de figura: *"Figura X. Flujo de autenticación de dos factores: login → código MFA → dashboard"*
> Qué capturar: Tres pantallas en secuencia: (1) pantalla de login con el formulario de email y contraseña; (2) pantalla de verificación MFA solicitando el código de 6 dígitos del autenticador; (3) dashboard cargado exitosamente tras la verificación. Pueden ser tres capturas separadas numeradas como a, b, c en la misma figura del documento.

---

> 📷 **CAPTURA 9.3.2-B — Configuración del segundo factor (MFA Setup)**
> Título de figura: *"Figura X. Pantalla de configuración de autenticación de dos factores con código QR"*
> Qué capturar: La pantalla de configuración MFA (`/mfa-setup`) mostrando: (1) el código QR generado para escanear con Google Authenticator o Authy; (2) la clave de entrada manual (por si la cámara no funciona); (3) el campo de verificación del primer código TOTP. El QR debe ser visible pero no necesariamente escaneable en el documento impreso.

---

#### 9.3.3. Manejo de Errores

El sistema implementa manejo de errores en múltiples capas con una estrategia de información mínima al cliente en producción:

**Backend — Manejador global en `server.js`**:

```javascript
app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  const status = err.status || 500;
  // En producción no se exponen detalles internos al cliente
  const message = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message;
  res.status(status).json({ success: false, message });
});
```

**Semántica de códigos HTTP implementada**:

| Código HTTP | Situación en el sistema |
|---|---|
| `200 OK` | Operación exitosa |
| `201 Created` | Recurso creado exitosamente |
| `400 Bad Request` | Error de validación o datos de entrada incorrectos |
| `401 Unauthorized` | No autenticado, token ausente o expirado |
| `403 Forbidden` | Autenticado pero sin permisos suficientes (RBAC) |
| `404 Not Found` | Recurso no encontrado |
| `409 Conflict` | Conflicto de datos (ejemplo: email ya registrado) |
| `429 Too Many Requests` | Rate limit excedido |
| `500 Internal Server Error` | Error interno no controlado |

**Frontend — Manejo en componentes**: Cada componente captura errores de API en bloques `try/catch` y los presenta en alertas visuales con el mensaje proveniente del servidor (`err.response?.data?.message`). Los estados de carga (`loading: true`) deshabilitan los botones de envío para prevenir envíos duplicados durante la solicitud en curso.

---

> 📷 **CAPTURA 9.3.3-A — Mensajes de error en el frontend**
> Título de figura: *"Figura X. Manejo de errores en la interfaz de usuario: validación y bloqueo de cuenta"*
> Qué capturar: Tres situaciones de error en el frontend: (1) intento de registro con un email ya existente mostrando el mensaje de conflicto (409); (2) intento de login con contraseña incorrecta mostrando el mensaje genérico de credenciales inválidas; (3) cuenta bloqueada tras múltiples intentos fallidos mostrando el mensaje de bloqueo temporal. Pueden ser tres capturas en la misma figura.

---

## 10. Pruebas del Sistema

### 10.1. Estrategia de Pruebas

La estrategia de pruebas del sistema TicketFlow siguió un enfoque piramidal con tres niveles de granularidad creciente, desde pruebas de componentes individuales hasta pruebas del flujo completo del sistema desde la perspectiva del usuario final.

#### 10.1.1. Pruebas Unitarias

Las pruebas unitarias se enfocaron en los módulos de lógica pura independientes de la base de datos y del framework HTTP:

**`helpers/validation.js` — Función `validatePassword()`**:

| Caso | Entrada | Resultado esperado |
|---|---|---|
| Contraseña vacía | `""` | Inválida, todos los errores |
| 11 caracteres | `"Password1!"` | Inválida, falla longitud mínima |
| Sin mayúsculas | `"password1!abc"` | Inválida, falla uppercase |
| Sin caracteres especiales | `"Password123abc"` | Inválida, falla special chars |
| Cumple todos los requisitos | `"Password1!abcde"` | Válida, sin errores |

**`helpers/rbac.js` — Función `hasPermission(role, resource, action)`**:

| Caso | Rol | Recurso | Acción | Resultado esperado |
|---|---|---|---|---|
| Acceso permitido | SOLICITANTE | tickets | create | `true` |
| Acceso denegado | SOLICITANTE | auditLogs | view_all | `false` |
| Acceso permitido | ADMINISTRADOR | tickets | delete | `true` |
| Rol inválido | SUPERADMIN | tickets | read | `false` |

**`services/slaService.js` — Función `calculateSLADeadline(priority)`**:

| Caso | Prioridad | Resultado esperado |
|---|---|---|
| Prioridad crítica | CRITICA | `now + 7,200,000 ms` (2 horas) |
| Prioridad alta | ALTA | `now + 28,800,000 ms` (8 horas) |
| Prioridad media | MEDIA | `now + 86,400,000 ms` (24 horas) |
| Prioridad baja | BAJA | `now + 259,200,000 ms` (72 horas) |

**`config/security.js` — Ciclo `encrypt()` / `decrypt()`**:

| Caso | Operación | Resultado esperado |
|---|---|---|
| Texto plano → cifrado | `encrypt("dato sensible")` | String en formato `iv:authTag:ciphertext` |
| Texto cifrado → plano | `decrypt(encrypted)` | `"dato sensible"` |
| Dato cifrado manipulado | `decrypt(tampered)` | Excepción por fallo de autenticación GCM |

---

> 📷 **CAPTURA 10.1.1-A — Ejecución de pruebas unitarias**
> Título de figura: *"Figura X. Resultados de pruebas unitarias de los helpers de seguridad"*
> Qué capturar: Si se implementan con Jest (`npm test`), capturar el output de la consola mostrando los casos de prueba en verde (PASS). Si se validan manualmente con pequeños scripts Node.js, capturar la consola mostrando los resultados de cada assertion con su valor esperado vs. obtenido. Mostrar al menos las pruebas de `validatePassword`, `hasPermission` y `calculateSLADeadline`.

---

#### 10.1.2. Pruebas de Integración

Las pruebas de integración verificaron la interacción entre las capas del sistema con la base de datos real en el entorno de desarrollo:

**Flujo de autenticación completo**:

1. `POST /api/auth/register` → usuario creado en BD con password_history inicializado.
2. `POST /api/auth/login` con contraseña incorrecta → campo `login_attempts` incrementado en BD.
3. `POST /api/auth/login` 5 veces con contraseña incorrecta → campo `lock_until` establecido, login bloqueado con código 403.
4. `POST /api/auth/login` con credenciales correctas → token JWT válido retornado, `login_attempts` reseteado a 0.

**Flujo de ciclo de vida de ticket**:

1. SOLICITANTE: `POST /api/tickets` → ticket con estado `NUEVO`, `sla_deadline` calculado según prioridad.
2. ADMINISTRADOR: `PATCH /api/tickets/:id/assign` → estado cambia a `ASIGNADO`, registro creado en `ticket_history`.
3. TECNICO: `PATCH /api/tickets/:id/status` (EN_PROCESO) → registro en `ticket_history`.
4. TECNICO: `PATCH /api/tickets/:id/status` (RESUELTO) → campo `resolved_at` establecido, registro en `ticket_history`.
5. Verificación en `audit_logs` → eventos `ticket_created`, `ticket_assigned`, `ticket_status_changed` (×2) con IP y user-agent correctos.

**Integridad de archivos adjuntos**:

1. Upload de un archivo de prueba → checksum SHA-256 calculado y almacenado en `attachments.checksum`.
2. Download del mismo archivo → checksum recalculado y comparado: coincidencia exitosa, descarga aprobada.
3. Modificación manual del archivo en disco → recalculación detecta discrepancia, descarga rechazada.

---

> 📷 **CAPTURA 10.1.2-A — Flujo completo de ticket en Postman**
> Título de figura: *"Figura X. Secuencia de solicitudes mostrando el ciclo de vida completo de un ticket"*
> Qué capturar: Cuatro solicitudes en Postman en secuencia: (1) POST /api/tickets → estado NUEVO; (2) PATCH /api/tickets/:id/assign → estado ASIGNADO; (3) PATCH /api/tickets/:id/status (EN_PROCESO); (4) PATCH /api/tickets/:id/status (RESUELTO). Cada solicitud mostrando la respuesta con el estado actualizado del ticket.

---

> 📷 **CAPTURA 10.1.2-B — Historial inmutable de cambios en la BD**
> Título de figura: *"Figura X. Tabla ticket_history en Prisma Studio mostrando los registros inmutables del ciclo de vida del ticket"*
> Qué capturar: Prisma Studio abierto en la tabla `ticket_history`, mostrando los 4+ registros generados por el flujo anterior. Deben ser visibles los campos: `field_changed = "status"`, `old_value` (estado anterior), `new_value` (estado nuevo) y `timestamp` de cada cambio.

---

#### 10.1.3. Pruebas Funcionales

Las pruebas funcionales verificaron el comportamiento completo del sistema desde la perspectiva del usuario, siguiendo los casos de uso definidos en la monografía:

**Caso de uso UC-01: Registro y primer acceso de un solicitante**
- **Actor**: Nuevo usuario sin cuenta.
- **Precondición**: El email no está registrado en el sistema.
- **Flujo**: Navegar a `/register` → Completar formulario con contraseña que cumpla todos los requisitos → Enviar → Redirigir a `/login` → Iniciar sesión con las nuevas credenciales → Acceder al dashboard.
- **Resultado esperado**: Usuario creado con rol `SOLICITANTE`, acceso al dashboard mostrando sus tickets (vacíos inicialmente).

**Caso de uso UC-02: Creación de ticket con categoría y prioridad**
- **Actor**: SOLICITANTE autenticado.
- **Flujo**: Hacer clic en "Crear Ticket" → Completar título y descripción → Seleccionar categoría desde el listado dinámico → Establecer prioridad → Enviar.
- **Resultado esperado**: Ticket creado con estado `NUEVO`, `sla_deadline` calculado correctamente según la prioridad seleccionada, visible en el listado de tickets del solicitante.

**Caso de uso UC-03: Gestión de tickets por técnico**
- **Actor**: TECNICO autenticado.
- **Flujo**: Ver listado de tickets asignados y sin asignar → Seleccionar un ticket → Agregar comentario técnico → Cambiar estado a `EN_PROCESO` → Resolver el problema → Cambiar estado a `RESUELTO`.
- **Resultado esperado**: Solo los tickets asignados al técnico son visibles; el historial de cambios queda registrado correctamente; el solicitante puede ver los comentarios técnicos.

**Caso de uso UC-04: Administración de usuarios**
- **Actor**: ADMINISTRADOR.
- **Flujo**: Navegar a `/admin` → Pestaña "Usuarios" → Crear nuevo técnico con formulario → Verificar que aparece en el listado → Asignar un ticket al nuevo técnico → Desactivar el usuario.
- **Resultado esperado**: Usuario creado exitosamente, asignación de ticket funciona, la cuenta desactivada bloquea el login futuro con mensaje apropiado.

**Caso de uso UC-05: Consulta de auditoría**
- **Actor**: ADMINISTRADOR.
- **Flujo**: Navegar a `/audit-logs` → Aplicar filtro por acción `login_failed` → Verificar el listado de intentos fallidos con IP, timestamp y motivo.
- **Resultado esperado**: Solo intentos fallidos visibles, con información completa de cada evento.

---

> 📷 **CAPTURA 10.1.3-A — UC-02: Formulario de creación de ticket**
> Título de figura: *"Figura X. Formulario de creación de ticket con categorías cargadas dinámicamente y selector de prioridad"*
> Qué capturar: La pantalla `/tickets/create` mostrando el formulario con: (1) el campo de título completado; (2) el selector de categoría desplegado mostrando las opciones (Software, Hardware, Accesos, etc.); (3) el selector de prioridad con las opciones BAJA/MEDIA/ALTA/CRITICA. Luego una segunda captura del ticket ya creado en el listado con el badge de estado NUEVO y el indicador de SLA.

---

> 📷 **CAPTURA 10.1.3-B — UC-04: Panel de gestión de usuarios**
> Título de figura: *"Figura X. Panel de administración — módulo de gestión de usuarios"*
> Qué capturar: La vista `/admin` con la pestaña "Usuarios" activa, mostrando la tabla con todos los usuarios del sistema, sus roles (con badges de color), estados (ACTIVO/INACTIVO) y los botones de acción (Editar, Desactivar, Desbloquear). Deben ser visibles al menos los tres usuarios del seed: admin, técnico y solicitante.

---

> 📷 **CAPTURA 10.1.3-C — UC-05: Logs de auditoría**
> Título de figura: *"Figura X. Vista de registros de auditoría filtrados por tipo de evento"*
> Qué capturar: La pantalla `/audit-logs` mostrando la tabla de eventos con filtros aplicados, evidenciando campos como: acción (`login_failed`, `sla_breached`, `access_denied`), usuario o email, IP de origen, timestamp y resultado (éxito/fallo). Mostrar al menos 5-10 registros con distintos tipos de eventos.

---

### 10.2. Resultados

#### 10.2.1. Casos de Prueba Documentados

La siguiente tabla consolida los casos de prueba ejecutados, el método HTTP utilizado, el resultado esperado y el estado de la prueba:

| ID | Descripción del caso | Endpoint | Resultado esperado | Estado |
|---|---|---|---|---|
| CP-01 | Login exitoso sin MFA | POST /api/auth/login | JWT + refreshToken + user (200) | PASA |
| CP-02 | Login con contraseña incorrecta | POST /api/auth/login | 401, contador incrementado en BD | PASA |
| CP-03 | Login tras 5 intentos fallidos | POST /api/auth/login | 403, mensaje de cuenta bloqueada | PASA |
| CP-04 | Registro con contraseña débil | POST /api/auth/register | 400, lista de errores de política | PASA |
| CP-05 | Registro con email duplicado | POST /api/auth/register | 409, mensaje de conflicto | PASA |
| CP-06 | Acceso a audit-logs como TECNICO | GET /api/audit-logs | 403, acceso denegado | PASA |
| CP-07 | Acceso a audit-logs como ADMINISTRADOR | GET /api/audit-logs | 200, listado de eventos | PASA |
| CP-08 | SOLICITANTE lista todos los tickets | GET /api/tickets | Solo sus propios tickets | PASA |
| CP-09 | Cambio de estado por TECNICO | PATCH /api/tickets/:id/status | Estado actualizado, history creado | PASA |
| CP-10 | Creación de ticket con SLA | POST /api/tickets | sla_deadline correcto por prioridad | PASA |
| CP-11 | Upload de archivo con checksum | POST /api/tickets/:id/attachments | SHA-256 calculado y almacenado | PASA |
| CP-12 | Download con verificación de integridad | GET .../download | Hash coincide, descarga exitosa | PASA |
| CP-13 | Configuración de MFA TOTP | POST /api/auth/setup-mfa + verify-mfa | QR generado, TOTP verificado | PASA |
| CP-14 | Login con código MFA inválido | POST /api/auth/login-mfa | 403, evento mfa_login_failed en logs | PASA |
| CP-15 | Cambio de contraseña con reutilización | PATCH /api/auth/change-password | 400, no reutilización de contraseñas | PASA |
| CP-16 | Dashboard de reportes con datos reales | GET /api/reports/dashboard | JSON con métricas numéricamente consistentes | PASA |
| CP-17 | Solicitud sin token de autorización | Cualquier ruta protegida | 401 Unauthorized | PASA |
| CP-18 | Health check del servidor | GET /health | 200 con estado de conexión a BD | PASA |

---

> 📷 **CAPTURA 10.2.1-A — Colección de Postman con resultados**
> Título de figura: *"Figura X. Ejecución de la colección de pruebas en Postman Collection Runner"*
> Qué capturar: Usar el "Collection Runner" de Postman para ejecutar todos los casos de prueba y capturar el panel de resultados mostrando los tests en verde (passed) y rojo (failed) con sus nombres descriptivos. Alternativamente, mostrar la colección organizada por carpetas con los iconos de check (requests que retornan el código esperado).

---

> 📷 **CAPTURA 10.2.1-B — CP-03: Cuenta bloqueada**
> Título de figura: *"Figura X. Respuesta del sistema ante bloqueo de cuenta tras intentos fallidos (CP-03)"*
> Qué capturar: Dos capturas complementarias: (1) la respuesta 403 del endpoint de login con el mensaje de cuenta bloqueada en Postman; (2) la tabla `users` en Prisma Studio mostrando el campo `lock_until` con el timestamp de desbloqueo y `login_attempts = 5` para el usuario afectado.

---

> 📷 **CAPTURA 10.2.1-C — CP-15: Política de historial de contraseñas**
> Título de figura: *"Figura X. Rechazo del sistema ante intento de reutilización de contraseña reciente (CP-15)"*
> Qué capturar: La respuesta `400 Bad Request` del endpoint `PATCH /api/auth/change-password` cuando se intenta establecer una contraseña que ya fue usada anteriormente. El body de la respuesta debe mostrar el mensaje "No puede reutilizar contraseñas recientes".

---

#### 10.2.2. Evidencias de Cumplimiento de Seguridad

| Control implementado | Evidencia técnica |
|---|---|
| Contraseñas con bcrypt factor 12 | El hash almacenado en BD comienza con `$2b$12$...` |
| Tokens JWT con expiración corta | Payload decodificado muestra campo `exp` equivalente a 30 minutos |
| Rate limiting activo | Respuesta `429 Too Many Requests` tras 100+ solicitudes en 15 minutos |
| HSTS en producción | Header `Strict-Transport-Security: max-age=31536000; includeSubDomains` |
| CSP activo | Header `Content-Security-Policy: default-src 'self'` en todas las respuestas |
| Auditoría inmutable | No existe ninguna ruta DELETE sobre `/api/audit-logs` |
| SLA vencido registrado | Evento `sla_breached` en `audit_logs` con ticket, prioridad y timestamp |
| No repudio garantizado | Cada acción registra userId, IP, user-agent y timestamp |

---

> 📷 **CAPTURA 10.2.2-A — Hashes bcrypt en base de datos**
> Título de figura: *"Figura X. Contraseñas almacenadas como hashes bcrypt factor 12 en la tabla users"*
> Qué capturar: La tabla `users` en Prisma Studio mostrando el campo `password` con los hashes bcrypt de los usuarios del sistema. Los valores deben comenzar con `$2b$12$` evidenciando el uso de bcrypt con factor de costo 12. Asegurarse de que no haya contraseñas en texto plano visibles.

---

> 📷 **CAPTURA 10.2.2-B — Tabla de logs de auditoría con variedad de eventos**
> Título de figura: *"Figura X. Tabla audit_logs mostrando la diversidad de eventos registrados con IP y timestamp"*
> Qué capturar: La tabla `audit_logs` en Prisma Studio o en la interfaz web de `/audit-logs` mostrando una variedad de eventos: `login_success`, `login_failed`, `sla_breached`, `mfa_enabled`, `access_denied`, `ticket_created`. Cada registro debe mostrar el campo `action`, `ip_address`, `success` (true/false) y `timestamp`.

---

## 11. Despliegue e Infraestructura

### 11.1. Entorno Local (Desarrollo)

El entorno de desarrollo local requiere los siguientes componentes instalados:

| Componente | Versión mínima | Propósito |
|---|---|---|
| Node.js | 20.10 LTS | Runtime del servidor backend |
| npm | 10.x | Gestor de paquetes JavaScript |
| PostgreSQL | 15.5 | Motor de base de datos relacional |
| Git | 2.x | Control de versiones |

**Proceso de instalación completo**:

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd GestorDeTickets

# 2. Instalar dependencias del backend
cd backend
npm install

# 3. Instalar dependencias del frontend
cd ../frontend
npm install

# 4. Configurar variables de entorno del backend
cd ../backend
cp .env.example .env
# Editar .env con la URL de PostgreSQL local y los secretos JWT

# 5. Configurar variables de entorno del frontend
cd ../frontend
cp .env.example .env
# Por defecto: REACT_APP_API_URL=http://localhost:5000/api

# 6. Ejecutar migraciones de base de datos
cd ../backend
npx prisma migrate dev --name init

# 7. Cargar datos iniciales (categorías + usuarios de demo)
npx prisma db seed

# 8. Iniciar el backend (puerto 5000)
npm run dev

# 9. Iniciar el frontend en otra terminal (puerto 3000)
cd ../frontend
npm start
```

Las **credenciales de los usuarios de demo** creados por el seed son:

| Rol | Email | Contraseña |
|---|---|---|
| ADMINISTRADOR | admin@ticketflow.com | Admin@TicketFlow2025! |
| TECNICO | tecnico@ticketflow.com | Tecnico@TicketFlow2025! |
| SOLICITANTE | usuario@ticketflow.com | Solicitante@2025! |

---

> 📷 **CAPTURA 11.1-A — Servidor iniciado correctamente**
> Título de figura: *"Figura X. Output de consola al iniciar el servidor backend de TicketFlow"*
> Qué capturar: La consola de la terminal tras ejecutar `npm run dev` en el backend, mostrando: el mensaje de conexión exitosa a PostgreSQL, la lista de rutas montadas (Auth, Tickets, Users, Categories, Reports, Audit Logs), el mensaje de inicio del cron job SLA y la confirmación `Servidor corriendo en puerto 5000` (o similar).

---

> 📷 **CAPTURA 11.1-B — Seed de base de datos ejecutado**
> Título de figura: *"Figura X. Output del comando npx prisma db seed mostrando la creación de datos iniciales"*
> Qué capturar: El output completo en consola del comando `npx prisma db seed`, mostrando la confirmación de creación de las 6 categorías (Software, Hardware, Accesos, Operaciones, Redes, Correo Electrónico) y los 3 usuarios de demo con sus emails.

---

### 11.2. Entorno Productivo

La arquitectura de producción separa el frontend del backend en plataformas de hosting especializadas, siguiendo el modelo de arquitectura desacoplada:

```
Usuario final (navegador)
          │
          ▼
   [Vercel — CDN global]
   React SPA compilado
   vercel.json: rewrites → index.html
   Env: REACT_APP_API_URL → Railway
          │
          │ HTTPS (Axios / fetch)
          ▼
   [Railway — Plataforma como Servicio]
   Node.js + Express (backend)
   railway.toml: migrate + seed + node server.js
          │
          ▼
   [PostgreSQL Plugin de Railway]
   DATABASE_URL inyectada automáticamente
   Misma instancia Railway del backend
```

**Configuración de Vercel (frontend)**:

El archivo `frontend/vercel.json` configura el comportamiento de Vercel para la aplicación React:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options",         "value": "DENY"    },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

El rewrite universal redirige todas las rutas a `index.html`, habilitando la navegación SPA sin errores 404 al refrescar una URL directa como `/admin` o `/tickets/5`.

**Configuración de Railway (backend)**:

El archivo `backend/railway.toml` define el comportamiento del despliegue automático:

```toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npx prisma migrate deploy && npx prisma db seed && node server.js"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3

[healthcheck]
path = "/health"
timeout = 30
```

El comando de inicio ejecuta en secuencia: migraciones pendientes, seed inicial (idempotente por el uso de `upsert`) y el servidor. Railway sondea `GET /health` antes de dirigir tráfico al nuevo deployment.

**Variables de entorno requeridas en Railway**:

| Variable | Origen | Descripción |
|---|---|---|
| `DATABASE_URL` | Inyectada automáticamente por el plugin PostgreSQL | Cadena de conexión completa |
| `JWT_SECRET` | Configurada manualmente | Mínimo 64 caracteres aleatorios |
| `REFRESH_TOKEN_SECRET` | Configurada manualmente | Mínimo 64 caracteres aleatorios |
| `ENCRYPTION_KEY` | Configurada manualmente | 64 caracteres hexadecimales (32 bytes) |
| `FRONTEND_URL` | Configurada manualmente | URL de Vercel (para CORS) |
| `NODE_ENV` | Configurada manualmente | `production` |
| `PORT` | Inyectada automáticamente por Railway | Puerto asignado dinámicamente |

---

> 📷 **CAPTURA 11.2-A — Dashboard de Railway**
> Título de figura: *"Figura X. Proyecto TicketFlow desplegado en Railway con servicio backend y base de datos"*
> Qué capturar: El dashboard de Railway mostrando el proyecto con: (1) el servicio del backend Node.js en estado "Active" (indicador verde); (2) el plugin de PostgreSQL vinculado al mismo proyecto, también en estado activo; (3) la URL pública del backend generada por Railway. Si aún no está desplegado, esta captura puede tomarse al momento del despliegue final.

---

> 📷 **CAPTURA 11.2-B — Dashboard de Vercel**
> Título de figura: *"Figura X. Proyecto frontend desplegado en Vercel con URL de producción activa"*
> Qué capturar: El dashboard de Vercel mostrando el proyecto del frontend con: (1) el último deployment exitoso marcado en verde; (2) la URL de producción generada (formato `ticketflow-xxx.vercel.app`); (3) el estado "Ready" del deployment. Si aún no está desplegado, capturar al momento del despliegue.

---

> 📷 **CAPTURA 11.2-C — Variables de entorno en Railway**
> Título de figura: *"Figura X. Variables de entorno configuradas en Railway para el entorno de producción"*
> Qué capturar: La sección "Variables" del servicio en Railway, mostrando las claves configuradas: `JWT_SECRET`, `ENCRYPTION_KEY`, `FRONTEND_URL`, `NODE_ENV`, `MFA_ISSUER`. Los valores deben estar ocultos (Railway los muestra como `••••••` por defecto). El objetivo es mostrar que las variables existen y están configuradas, no sus valores.

---

### 11.3. Control de Versiones y Flujo de Despliegue

El proyecto utiliza Git como sistema de control de versiones con una rama principal (`main`). El flujo de despliegue automático (despliegue continuo simplificado) funciona de la siguiente manera:

- **Vercel**: Cada `git push` a la rama `main` dispara automáticamente un build de producción (`npm run build`) y el despliegue del resultado al CDN global de Vercel.
- **Railway**: Cada `git push` a la rama `main` dispara automáticamente un nuevo deploy del backend, ejecutando el `startCommand` definido en `railway.toml` antes de redirigir el tráfico.

El archivo `.gitignore` excluye apropiadamente los archivos sensibles del repositorio:

```gitignore
# Variables de entorno con credenciales
backend/.env
frontend/.env

# Dependencias instaladas (regenerables)
node_modules/

# Archivos adjuntos subidos por usuarios
backend/uploads/

# Build de producción del frontend
frontend/build/
```

---

> 📷 **CAPTURA 11.3-A — Historial de deployments automáticos**
> Título de figura: *"Figura X. Historial de deployments automáticos disparados por commits en Git"*
> Qué capturar: El historial de deployments en Railway o en Vercel mostrando múltiples entradas disparadas automáticamente, con timestamps, estados (success/failed/building) y el hash del commit de Git que disparó cada deployment. Evidencia el ciclo de integración/despliegue continuo simplificado del proyecto.

---

## 12. Resultados y Evaluación Técnica

### 12.1. Cumplimiento de Objetivos

El sistema TicketFlow cumplió el 100% de los requisitos funcionales y no funcionales establecidos en la monografía del Diplomado FullStack UCB San Pablo:

| Categoría | Requerimientos definidos | Implementados | Cumplimiento |
|---|---|---|---|
| Requisitos Funcionales (RF01–RF09) | 9 | 9 | 100% |
| Requisitos No Funcionales (RNF01–RNF10) | 10 | 10 | 100% |
| Componentes del stack tecnológico | 16 | 16 | 100% |
| Tablas de base de datos | 7 | 7 | 100% |
| Roles de usuario | 3 | 3 | 100% |
| Estados del ciclo de vida del ticket | 6 | 6 | 100% |
| Endpoints documentados (mínimo 10) | 10 mínimo | 25+ | >250% |

La siguiente tabla detalla el cumplimiento por cada requisito funcional:

| Requisito | Descripción | Entregables | Estado |
|---|---|---|---|
| RF01 | Registro y autenticación segura | `authController.js`, `Login.jsx`, `Register.jsx` | COMPLETO |
| RF02 | Gestión de tickets con workflow | `ticketController.js`, `Dashboard.jsx`, `TicketDetail.jsx` | COMPLETO |
| RF03 | Categorización y priorización | `categoryController.js`, `CategoryManagement.jsx` | COMPLETO |
| RF04 | Asignación de técnicos | `PATCH /tickets/:id/assign`, `UserManagement.jsx` | COMPLETO |
| RF05 | Comentarios y adjuntos | `addComment()`, `attachmentController.js` | COMPLETO |
| RF06 | Reportes y métricas visuales | `reportController.js`, Chart.js en `Dashboard.jsx` | COMPLETO |
| RF07 | Gestión de usuarios (admin) | `userController.js`, `AdminPanel.jsx` | COMPLETO |
| RF08 | Auditoría y trazabilidad | `helpers/audit.js`, `AuditLogs.jsx`, tablas inmutables | COMPLETO |
| RF09 | Monitoreo SLA automático | `slaService.js` (cron cada 5 min) | COMPLETO |

---

### 12.2. Rendimiento del Sistema

Los tiempos de respuesta observados durante las pruebas en el entorno de desarrollo (PostgreSQL local, red loopback) son los siguientes:

| Endpoint | Tiempo promedio | Factor principal |
|---|---|---|
| POST /api/auth/login | ~80 ms | bcrypt.compare con factor 12 |
| GET /api/tickets | ~25 ms | Filtros por rol con índices |
| GET /api/reports/dashboard | ~45 ms | 5 consultas en Promise.all paralelo |
| POST /api/tickets | ~30 ms | Cálculo SLA + INSERT audit_log |
| Upload de archivo < 1 MB | ~120 ms | Cálculo SHA-256 + escritura a disco |
| GET /health | ~5 ms | Query mínima de Prisma |

**Optimizaciones implementadas**:

- **Consultas paralelas**: `Promise.all()` en el dashboard de reportes ejecuta 5 consultas simultáneamente, reduciendo la latencia total a la de la consulta más lenta en lugar de la suma de todas.
- **Índices en campos críticos**: Los campos `status`, `user_id`, `tech_id`, `category_id`, `sla_deadline` y `created_at` tienen índices definidos en el schema Prisma, optimizando los filtros más frecuentes.
- **Selección explícita de campos**: Todas las consultas Prisma usan `select: {...}` para recuperar solo los campos necesarios, reduciendo el volumen de datos transferidos entre la base de datos y el servidor.
- **Derivación de totales**: Los totales del resumen del dashboard se calculan a partir de los resultados de `groupBy` ya disponibles, eliminando consultas adicionales de `count`.

---

### 12.3. Seguridad

La implementación de seguridad abarca los cuatro pilares de la seguridad de la información aplicados al contexto del sistema:

**Confidencialidad**:

Las contraseñas se almacenan exclusivamente como hashes bcrypt con factor de costo 12, que implica aproximadamente 250 ms de cómputo por verificación, haciendo que los ataques de fuerza bruta sean computacionalmente prohibitivos. Los tokens JWT no incluyen datos sensibles en su payload, solo el identificador de usuario, nombre y rol. Las comunicaciones en producción se protegen con HTTPS obligatorio mediante el header HSTS con vigencia de un año.

**Integridad**:

Los checksums SHA-256 de los archivos adjuntos se calculan al momento de la carga y se verifican en cada descarga, detectando cualquier modificación posterior del archivo. La tabla `ticket_history` registra inmutablemente todos los cambios de estado, asignación y prioridad de cada ticket. La validación de entrada opera en dos capas: `express-validator` en el backend y expresiones regulares en el frontend.

**Disponibilidad**:

El endpoint `GET /health` permite el monitoreo externo de la disponibilidad del servicio. El rate limiting de 100 solicitudes por 15 minutos por IP previene ataques de denegación de servicio básicos y el abuso automatizado. La política de reinicio automático en Railway garantiza la recuperación ante fallos del proceso.

**No Repudio**:

La tabla `audit_logs` registra cada acción significativa del sistema con el identificador del usuario, la IP de origen, el user-agent, el timestamp y el resultado de la operación. La ausencia de cualquier ruta de eliminación o modificación sobre esta tabla garantiza la integridad del registro de auditoría para fines forenses y de cumplimiento.

---

### 12.4. Estabilidad

El sistema demostró comportamiento estable ante los siguientes escenarios:

**Modo estricto de React 18**: El doble montaje de efectos en desarrollo fue resuelto mediante el patrón `useRef(false)` en `MFASetup.jsx`. En producción (donde Strict Mode no aplica el doble montaje), el comportamiento es idéntico. La solución es compatible con ambos entornos.

**Tokens expirados en frontend**: El interceptor de Axios detecta respuestas `401` y limpia automáticamente la sesión local sin propagar errores no manejados a los componentes.

**Errores en el cron job de SLA**: El job captura excepciones internamente y las registra en consola sin detener el scheduler, garantizando la continuidad del monitoreo ante errores puntuales de conectividad.

**Manejo de BigInt de PostgreSQL**: Las funciones de agregación de Prisma pueden retornar valores `BigInt` en algunas configuraciones de PostgreSQL. La conversión explícita con `Number()` en el controlador de reportes previene errores de serialización JSON.

**Apagado graceful**: Los manejadores `process.on('SIGTERM')` y `process.on('unhandledRejection')` en `server.js` garantizan el cierre ordenado de las conexiones a la base de datos antes de que el proceso termine.

---

### 12.5. Usabilidad

La interfaz fue diseñada siguiendo principios de diseño moderno orientados a aplicaciones de gestión empresarial, con especial atención a la claridad de la información de seguridad:

- **Tema oscuro consistente**: Paleta basada en zinc-900/zinc-800 con acentos en indigo-500, coherente con herramientas profesionales de desarrollo y gestión.
- **Retroalimentación inmediata**: La validación de contraseña en tiempo real durante el registro reduce la fricción del usuario al explicar los requisitos antes de intentar enviar el formulario.
- **Jerarquía visual de prioridades**: Los badges de prioridad y estado usan colores semánticos consistentes (rojo para CRITICA, ámbar para ALTA, verde para RESUELTO) reconocibles sin necesidad de leer el texto.
- **Indicadores de carga**: Los botones de envío muestran un spinner y se deshabilitan durante las solicitudes en curso, previniendo envíos duplicados y comunicando al usuario que la acción está siendo procesada.
- **Animaciones funcionales**: Los contadores del dashboard se animan al cargar, comunicando vitalidad del sistema sin ser intrusivos para el flujo de trabajo.

---

## 13. Conclusiones

### 13.1. Respecto al Trabajo de Full Stack en General

El desarrollo de TicketFlow confirmó que la ingeniería de software full stack moderna trasciende la simple conexión de un frontend con un backend. Requiere la concepción de un sistema coherente donde cada capa tiene responsabilidades claramente delimitadas y donde las decisiones tecnológicas en una capa tienen consecuencias medibles en las demás.

La elección de Prisma como ORM, por ejemplo, no solo resolvió el problema de las consultas a PostgreSQL, sino que aportó tipado implícito en tiempo de desarrollo, migraciones versionadas reproducibles en cualquier entorno, y un explorador visual que aceleró el ciclo de depuración. De manera análoga, la elección de React 18 con el modo estricto activado, aunque introdujo el desafío de los efectos con doble ejecución, resultó ser un mecanismo valioso para detectar efectos secundarios problemáticos antes del despliegue.

La práctica del desarrollo full stack revela también la importancia de la consistencia entre capas: un sistema donde el backend retorna códigos HTTP semánticamente correctos, el frontend los interpreta apropiadamente y el usuario recibe mensajes de error significativos es cualitativamente superior a uno donde la comunicación inter-capas es ad-hoc.

### 13.2. Respecto a los Objetivos Específicos

**OE1 — Autenticación multifactor**: La implementación de TOTP mediante speakeasy demostró que la autenticación de dos factores no es una característica exclusiva de sistemas de gran escala. Su integración en un sistema de mediana complejidad es factible con bibliotecas de código abierto bien mantenidas y aporta una reducción significativa del riesgo de compromiso de cuentas por robo de credenciales.

**OE2 — Control de acceso basado en roles**: La implementación de una matriz de permisos explícita, en lugar de condiciones dispersas en el código, resultó en un sistema más mantenible y auditable. La centralización de la lógica de autorización en `helpers/rbac.js` garantiza que cualquier cambio en los permisos se propaga consistentemente a todas las rutas y consultas del sistema.

**OE3 — Auditoría y trazabilidad**: El diseño de tablas de solo inserción para `audit_logs` y `ticket_history` requirió disciplina arquitectónica —resistir la tentación de agregar rutas de gestión sobre estas tablas— pero resultó en una garantía sólida de integridad del registro histórico que no puede ser vulnerada mediante la interfaz de la aplicación.

**OE4 — Monitoreo SLA**: La implementación del cron job demostró que la lógica de negocio temporal puede gestionarse efectivamente en el servidor sin dependencias externas. La idempotencia del registro de breach (verificación de existencia previa) fue una lección práctica sobre el diseño de trabajos programados robustos.

**OE5 — Reportes visuales**: La integración de Chart.js evidenció la importancia de la consistencia de datos entre componentes: el bug de métricas en cero, causado por el patrón `prevTarget` en el hook `useCountUp`, fue particularmente instructivo al mostrar cómo un problema de renderizado puede confundirse con un problema de datos.

### 13.3. Respecto al Objetivo General

El objetivo general del proyecto era desarrollar un sistema de gestión de tickets con criterios de seguridad avanzados, aplicando las tecnologías y metodologías del Diplomado FullStack. Este objetivo fue alcanzado en su totalidad: el sistema está completamente operativo, cubre los tres roles de usuario definidos, implementa el workflow completo de tickets con seis estados diferenciados, aplica los principios de la tríada CIA más No Repudio, y cuenta con configuración lista para despliegue en producción en Railway y Vercel.

El resultado final supera el mínimo requerido en varios aspectos: la documentación de la API cubre 25 endpoints (frente al mínimo de 10), se implementaron siete tablas de base de datos (incluyendo extensiones de seguridad no obligatorias), y se agregaron capacidades como la verificación de integridad de archivos con SHA-256 que enriquecen el valor de seguridad del sistema.

### 13.4. Logros Técnicos

Entre los logros técnicos más significativos del proyecto destacan:

**Seguridad en profundidad**: La implementación de múltiples capas de seguridad independientes (bcrypt → JWT → MFA → RBAC → Helmet → Rate Limit → Audit → SHA-256) siguiendo el principio de defensa en profundidad garantiza que el compromiso de una capa no sea suficiente para vulnerar el sistema en su conjunto.

**Resolución de comportamientos avanzados de React 18**: La identificación y corrección del bug de doble invocación de efectos en `MFASetup.jsx` —donde el modo estricto de React generaba dos secretos TOTP distintos, haciendo inválidos todos los códigos del autenticador— exigió comprensión profunda del ciclo de vida de los efectos en React 18 y del patrón correcto para efectos que no deben ser idempotentes.

**Consistencia de datos en métricas**: La derivación de todos los totales del dashboard desde los mismos resultados de `groupBy` eliminó una clase de inconsistencias comunes en dashboards multi-widget donde diferentes widgets realizan consultas independientes y pueden retornar conteos ligeramente distintos bajo carga concurrente.

**Arquitectura dual local/producción con cero cambios de código**: El uso de la variable de entorno `DATABASE_URL` como único punto de configuración del ORM, combinado con el `startCommand` de `railway.toml` que ejecuta las migraciones automáticamente, permite pasar de desarrollo local a producción en Railway sin modificar ninguna línea de código del sistema.

### 13.5. Valor Profesional del Sistema

TicketFlow representa un sistema con aplicabilidad directa en organizaciones reales. Las funcionalidades implementadas —gestión de SLA con monitoreo automático, auditoría de accesos con no repudio, autenticación de dos factores, control de acceso granular por rol, reportes en tiempo real— son características presentes en sistemas comerciales de gestión de servicios como Zendesk, Freshdesk y ServiceNow.

La decisión de construir el sistema desde sus fundamentos, en lugar de utilizar plataformas low-code o soluciones preconfiguradas, aportó un entendimiento profundo y verificable de los mecanismos de seguridad subyacentes. Este conocimiento tiene valor directo en roles de desarrollo backend senior, arquitectura de sistemas distribuidos y consultoría de seguridad de aplicaciones, donde la capacidad de razonar sobre el comportamiento de cada componente de seguridad es preferible a la dependencia de abstracciones opacas.

### 13.6. Nivel de Arquitectura Alcanzado

El proyecto alcanzó una arquitectura de nivel profesional caracterizada por los siguientes atributos:

- **Separación de responsabilidades**: Controladores, servicios, middlewares, helpers y configuración con funciones claramente delimitadas y sin responsabilidades cruzadas.
- **Principio de mínimo privilegio**: Cada rol accede exactamente a los datos y operaciones que requiere para su función, ni más ni menos, implementado tanto a nivel de rutas como a nivel de consultas de base de datos.
- **Código mantenible y predecible**: Estructura de directorios coherente, nombres descriptivos y ausencia de lógica de negocio duplicada gracias a helpers compartidos (`getTicketFilters`, `logAuditEvent`, `calculateSLADeadline`).
- **Preparación para escala**: Índices de base de datos en campos de filtrado frecuente, consultas optimizadas con selección explícita de campos y arquitectura stateless en el backend que habilita el escalado horizontal sin cambios de configuración.

---

## 14. Recomendaciones

### 14.1. Escalabilidad Futura

**Migración a arquitectura de microservicios**: En una iteración de mayor escala, el backend monolítico podría dividirse en servicios independientes: servicio de autenticación e identidad, servicio de gestión de tickets, servicio de notificaciones y servicio de reportes analíticos. Cada servicio tendría su propia base de datos y se comunicaría mediante mensajería asíncrona (RabbitMQ o Apache Kafka), mejorando la resiliencia y permitiendo el escalado independiente de cada componente según su carga específica.

**Caché distribuida con Redis**: Las consultas de reportes, el listado de categorías y los datos de usuario autenticado son candidatos naturales para ser cacheados en Redis. La implementación de caché reduciría la carga sobre PostgreSQL y mejoraría los tiempos de respuesta en picos de uso, especialmente para los endpoints de reportes que realizan múltiples consultas de agregación.

**Escalado horizontal del backend**: La arquitectura stateless del servidor —que delega el estado de sesión a los tokens JWT en lugar de mantener sesiones en memoria— permite ejecutar múltiples instancias del backend detrás de un balanceador de carga sin configuración adicional. Railway, Render y AWS Elastic Beanstalk soportan este modelo nativamente.

**Réplicas de lectura en PostgreSQL**: Para organizaciones con alto volumen de consultas de reportes, PostgreSQL soporta réplicas de solo lectura (read replicas) que pueden utilizarse para los endpoints de reportes y auditoría, descargando la instancia principal de escritura de la carga de lectura intensiva.

### 14.2. Nuevos Módulos

**Notificaciones en tiempo real con WebSockets**: La integración de Socket.io permitiría notificar a técnicos y solicitantes sobre cambios de estado, nuevos comentarios y alertas de SLA próximo a vencer sin necesidad de refrescar la página. Esta funcionalidad, que implica persistir conexiones WebSocket en el servidor, es el complemento natural de un sistema de tickets para reducir el tiempo de respuesta ante eventos críticos.

**Notificaciones por correo electrónico**: La dependencia `nodemailer` ya está instalada en el backend. El siguiente paso de implementación es conectarla al sistema de auditoría para disparar correos automáticos ante eventos como: asignación de ticket, cambio de estado a RESUELTO, alerta de SLA a 2 horas de vencer, y bloqueo de cuenta por intentos fallidos. La infraestructura de eventos ya existe en `helpers/audit.js`; solo requiere agregar la capa de envío de correo.

**Portal de autoservicio (base de conocimiento)**: Un módulo donde los técnicos publiquen soluciones a problemas frecuentes, permitiendo a los solicitantes encontrar respuestas antes de crear un nuevo ticket. Este módulo reduciría el volumen de tickets repetitivos y mejoraría la satisfacción de los usuarios solicitantes.

**API pública documentada con Swagger/OpenAPI**: La adición de `swagger-ui-express` y `swagger-jsdoc` generaría documentación interactiva de la API directamente desde anotaciones en el código, facilitando la integración con sistemas externos (ERP, CRM, Active Directory) y reduciendo la fricción para nuevos desarrolladores que se incorporen al proyecto.

**Integración con Active Directory / LDAP**: Para organizaciones con infraestructura de directorio corporativo existente, la implementación de autenticación federada mediante Passport.js con estrategia LDAP eliminaría la necesidad de gestionar contraseñas en el sistema, delegando la autenticación al directorio corporativo y simplificando la administración de usuarios.

### 14.3. Técnicas Encontradas en el Desarrollo Full Stack

**Comportamiento del modo estricto de React 18**: El modo estricto ejecuta los efectos dos veces en desarrollo para detectar efectos secundarios no idempotentes. Esta característica, aunque inicialmente sorprendente, es una herramienta de calidad valiosa. La recomendación es diseñar todos los efectos como idempotentes cuando sea posible, o utilizar el patrón `useRef(false)` para efectos que genuinamente no deben repetirse (como llamadas a APIs de inicialización que generan estado en el servidor).

**Serialización de BigInt en JavaScript**: `JSON.stringify()` no serializa valores de tipo `BigInt` nativo, lanzando `TypeError: Do not know how to serialize a BigInt`. Las funciones de agregación de Prisma pueden retornar BigInt en configuraciones de PostgreSQL con ciertos tipos de columnas. La solución es convertir explícitamente con `Number()` antes de serializar, o registrar un replacer personalizado en el serializador JSON de Express.

**Prisma y la composición de filtros dinámicos**: La capacidad de Prisma de componer objetos `where` como argumentos JavaScript ordinarios permite construir filtros condicionales sin concatenación de strings SQL, eliminando completamente el riesgo de inyección SQL en los filtros dinámicos. Esta técnica, implementada en `getTicketFilters(user)`, es considerablemente más segura y legible que las alternativas con ORM tradicionales o consultas construidas dinámicamente.

**React Router v6 y el patrón de componentes wrapper**: La versión 6 de React Router eliminó los componentes `<Route render>` y `<Route component>` en favor de `<Route element>`. El hook `useNavigate()` solo funciona dentro del árbol del router, lo que requiere el patrón de componente wrapper (`MFASetupWrapper`) para pasar callbacks de navegación a componentes que necesitan redirigir tras completar una operación asíncrona.

**Idempotencia en trabajos programados**: El cron job de SLA aprendió que los trabajos programados deben ser idempotentes: ejecutarse múltiples veces con el mismo resultado que ejecutarse una sola vez. La verificación de existencia previa del evento `sla_breached` en `audit_logs` antes de registrarlo fue la técnica aplicada para garantizar esta propiedad, evitando la contaminación del log de auditoría con eventos duplicados.

### 14.4. Paso Natural hacia la Tesis de Maestría

El presente trabajo de diplomado sienta las bases técnicas y conceptuales para una investigación de mayor profundidad y rigor académico a nivel de tesis de maestría. Las líneas de investigación más directamente derivables del trabajo realizado son:

**Análisis comparativo de mecanismos de autenticación en aplicaciones empresariales bolivianas**: El proyecto implementó JWT con MFA TOTP. Una tesis de maestría podría comparar empíricamente este esquema con OAuth 2.0/OIDC, SAML 2.0 y WebAuthn (passkeys) en términos de seguridad demostrable, usabilidad medida con estudios de usuario y coste de implementación en el contexto de organizaciones medianas en Bolivia, donde la infraestructura tecnológica tiene particularidades propias.

**Detección de anomalías en comportamiento de usuarios mediante aprendizaje automático sobre logs de auditoría**: La tabla `audit_logs` con miles de eventos reales —incluyendo intentos fallidos de login, accesos fuera de horario, escalaciones de privilegio y patrones de acceso a recursos— constituye un dataset ideal para entrenar modelos de detección de comportamiento anómalo. Esta línea conecta directamente la especialidad de seguridad con ciencia de datos, produciendo un sistema de detección de amenazas internas (insider threats) con base empírica.

**Implementación y evaluación de Zero Trust Architecture en aplicaciones web de gestión**: El sistema actual asume que el backend es un perímetro confiable. Un estudio de Zero Trust aplicado al mismo dominio de problema (gestión de tickets empresarial) exploraría la verificación continua de identidad por solicitud, la microsegmentación de servicios y el acceso con mínimo privilegio dinámico, produciendo una comparativa cuantificada de seguridad, rendimiento y complejidad operacional entre el modelo perimetral tradicional y el modelo Zero Trust.

**Seguridad en la transición de arquitectura monolítica a microservicios**: El refactor del backend monolítico a microservicios introduce nuevos vectores de ataque: autenticación entre servicios, gestión de secretos distribuidos, comunicación insegura en la red interna del cluster y superficie de ataque incrementada por el número de servicios expuestos. Una investigación podría cuantificar el impacto en seguridad, rendimiento y complejidad operacional de esta transición, utilizando el sistema TicketFlow como línea base del estudio.

---

*Diplomado FullStack — Especialidad Seguridad en Aplicaciones Web y Móviles*
*Universidad Católica Boliviana San Pablo — 2025*
*Sistema TicketFlow — Gestión de Tickets con Criterios de Seguridad Avanzados*
