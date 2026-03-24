# TicketFlow — Sistema de Gestión de Tickets

> Proyecto de grado — Diplomado FullStack UCB San Pablo
> Especialidad: Seguridad en Aplicaciones Web y Móviles

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Frontend | React.js | 18.2.0 |
| CSS | TailwindCSS | 3.4.0 |
| Gráficos | Chart.js + react-chartjs-2 | 4.4.0 |
| HTTP Client | Axios | 1.6.2 |
| Runtime | Node.js | 20.10 LTS |
| Framework | Express.js | 4.18.2 |
| ORM | Prisma | 5.7.0 |
| Base de datos | PostgreSQL | 15.5 |
| Autenticación | JWT + bcrypt + MFA (TOTP) | — |

---

## Instalación y configuración

### Prerrequisitos
- Node.js 20.x LTS
- PostgreSQL 15.x corriendo localmente

### 1. Instalar dependencias

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configurar variables de entorno

```bash
cp backend/.env.example backend/.env
# Editar backend/.env con la contraseña de PostgreSQL
```

Archivo `.env` mínimo:
```env
DATABASE_URL="postgresql://postgres:TU_PASSWORD@localhost:5432/ticketflow_dev"
JWT_SECRET=<64-chars-random>
REFRESH_TOKEN_SECRET=<64-chars-random>
ENCRYPTION_KEY=<64-hex-chars>
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000

# Notificaciones por email (opcional — si no se configura, se omiten silenciosamente)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu_email@gmail.com
SMTP_PASS=tu_app_password_de_gmail
SMTP_FROM=TicketFlow <tu_email@gmail.com>
```

Generar secretos:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. Inicializar base de datos

```bash
cd backend
npx prisma migrate dev --name init   # Crea las 7 tablas
npx prisma db seed                    # Inserta categorías y usuarios demo
```

### 4. Ejecutar la aplicación

```bash
# Terminal 1 — Backend (puerto 5000)
cd backend && npm run dev

# Terminal 2 — Frontend (puerto 3000)
cd frontend && npm start
```

---

## Credenciales de prueba (seed)

| Rol | Email | Contraseña |
|---|---|---|
| ADMINISTRADOR | admin@ticketflow.com | Admin@TicketFlow2025! |
| TECNICO | tecnico@ticketflow.com | Tecnico@TicketFlow2025! |
| SOLICITANTE | usuario@ticketflow.com | Solicitante@2025! |

---

## Roles y permisos

| Rol | Capacidades |
|---|---|
| `SOLICITANTE` | Crea tickets, ve solo los propios, agrega comentarios |
| `TECNICO` | Ve tickets asignados y sin asignar, cambia estado, comenta |
| `ADMINISTRADOR` | Acceso total: asigna, gestiona usuarios, categorías, reportes, auditoría |

---

## Estados de ticket

```
NUEVO → ASIGNADO → EN_PROCESO → RESUELTO → CERRADO
                                               ↑
                                          REABIERTO
```

---

## SLA por prioridad (RF06)

| Prioridad | Tiempo de resolución |
|---|---|
| CRITICA | 2 horas |
| ALTA | 8 horas |
| MEDIA | 24 horas |
| BAJA | 72 horas |

---

## API Endpoints

### Autenticación (`/api/auth`)

| Método | Endpoint | Descripción | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Registrar nuevo usuario (SOLICITANTE) | No |
| POST | `/api/auth/login` | Login con email y contraseña | No |
| POST | `/api/auth/login-mfa` | Verificar código MFA durante login | No |
| POST | `/api/auth/refresh` | Refrescar access token | Refresh JWT |
| GET | `/api/auth/profile` | Obtener perfil del usuario autenticado | JWT |
| PATCH | `/api/auth/change-password` | Cambiar contraseña propia | JWT |
| POST | `/api/auth/setup-mfa` | Generar QR para MFA (TOTP) | JWT |
| POST | `/api/auth/verify-mfa` | Activar MFA con código TOTP | JWT |
| POST | `/api/auth/disable-mfa` | Deshabilitar MFA | JWT |

**Ejemplo login:**
```json
POST /api/auth/login
{ "email": "admin@ticketflow.com", "password": "Admin@TicketFlow2025!" }
```

---

### Tickets (`/api/tickets`)

| Método | Endpoint | Descripción | Roles |
|---|---|---|---|
| POST | `/api/tickets` | Crear nuevo ticket | Todos |
| GET | `/api/tickets` | Listar tickets (filtrado por rol) | Todos |
| GET | `/api/tickets/:id` | Obtener detalle de ticket | Propietario/Asignado/Admin |
| PATCH | `/api/tickets/:id` | Actualizar título/descripción/prioridad | Técnico asignado/Admin |
| PATCH | `/api/tickets/:id/assign` | Asignar técnico | ADMINISTRADOR |
| PATCH | `/api/tickets/:id/status` | Cambiar estado del workflow | TECNICO/ADMIN/SOLICITANTE (solo RESUELTO→REABIERTO) |
| POST | `/api/tickets/:id/comments` | Agregar comentario | Propietario/Asignado/Admin |
| GET | `/api/tickets/:id/history` | Ver historial inmutable | Propietario/Asignado/Admin |
| DELETE | `/api/tickets/:id` | Eliminacion logica (soft delete) | ADMINISTRADOR |

**Query params (GET /api/tickets):** `status`, `priority`, `category_id`, `search`, `page`, `limit`

**Ejemplo crear ticket:**
```json
POST /api/tickets
Authorization: Bearer <token>
{
  "title": "Error en módulo de pagos",
  "description": "El sistema no procesa tarjetas Visa",
  "category_id": 1,
  "priority": "ALTA"
}
```

---

### Adjuntos (`/api/tickets/:ticketId/attachments`)

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/:ticketId/attachments` | Subir archivo (max 10 MB) |
| GET | `/:ticketId/attachments/:id/download` | Descargar con verificación SHA-256 |
| DELETE | `/:ticketId/attachments/:id` | Eliminar archivo |

---

### Usuarios (`/api/users`) — Solo ADMINISTRADOR

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/users` | Listar usuarios con filtros (role, status) |
| GET | `/api/users/:id` | Obtener usuario |
| POST | `/api/users` | Crear usuario con rol específico |
| PATCH | `/api/users/:id` | Actualizar nombre, rol o estado |
| POST | `/api/users/:id/unlock` | Desbloquear cuenta bloqueada |
| GET | `/api/users/technicians` | Listar técnicos activos |

---

### Categorías (`/api/categories`)

| Método | Endpoint | Descripción | Roles |
|---|---|---|---|
| GET | `/api/categories` | Listar todas las categorías | Todos |
| GET | `/api/categories/:id` | Obtener categoría | Todos |
| POST | `/api/categories` | Crear categoría con color hex | ADMINISTRADOR |
| PATCH | `/api/categories/:id` | Actualizar nombre/color | ADMINISTRADOR |
| DELETE | `/api/categories/:id` | Eliminar (solo si sin tickets) | ADMINISTRADOR |

---

### Reportes y Métricas (`/api/reports`) — Solo ADMINISTRADOR

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/reports/dashboard` | Resumen: totales, SLA breaches, datos para Chart.js |
| GET | `/api/reports/by-tech` | Carga de trabajo por técnico (asignados/resueltos) |
| GET | `/api/reports/by-category` | Distribución por categoría con colores |
| GET | `/api/reports/resolution-time` | Tiempo promedio de resolución por prioridad |
| GET | `/api/reports/export` | Exportar reporte completo en formato Excel (.xlsx) |

---

### Logs de Auditoría (`/api/audit-logs`) — Solo ADMINISTRADOR

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/audit-logs` | Listar logs con filtros (userId, action, startDate, endDate) |
| GET | `/api/audit-logs/stats` | Estadísticas agregadas por acción y recurso |
| GET | `/api/audit-logs/:id` | Obtener log específico |

---

### Health Check

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/health` | Estado del servidor y conexión a PostgreSQL |

---

## Tests automatizados

```bash
# Backend — tests de integracion contra base de datos real (Neon PostgreSQL)
cd backend && npm test -- --forceExit

# Frontend — tests de componentes (React Testing Library)
cd frontend && npm test -- --watchAll=false
```

| Suite | Tests | Cobertura |
|---|---|---|
| `ticket-lifecycle-rbac.test.js` | 63 tests | Ciclo de vida completo, RBAC por rol, busqueda, Excel, soft delete |
| `security-hardening.test.js` | 58 tests | Cifrado, JWT, rate limit, bloqueo de cuenta, MFA |
| `auth-flows.test.jsx` | 24 tests | Login, registro, validaciones de formularios |

---

## Seguridad implementada

- **JWT**: access token 30min + refresh token 7d
- **bcrypt**: factor de costo 12 para contraseñas
- **MFA/TOTP**: compatible con Google Authenticator (speakeasy)
- **Bloqueo de cuenta**: máx. 5 intentos fallidos, bloqueo 30 min
- **Política de contraseñas**: mín. 12 chars, upper/lower/números/especiales, historial de 6
- **RBAC**: 3 roles con matriz de permisos granular
- **Integridad de archivos**: checksum SHA-256 verificado en descarga
- **Auditoría completa**: tabla `audit_logs` inmutable (no-repudio)
- **Historial de tickets**: tabla `ticket_history` inmutable (trazabilidad RNF03)
- **Headers de seguridad**: Helmet (CSP, HSTS, X-Frame-Options, etc.)
- **Rate Limiting**: 100 req/15min por IP (express-rate-limit)
- **CORS**: configurado para dominio específico (`FRONTEND_URL`)

---

## Despliegue en produccion

### Frontend — Vercel

1. Importar el repositorio en Vercel, configurar el directorio raiz como `frontend/`
2. Agregar variable de entorno: `REACT_APP_API_URL=https://tu-backend.railway.app/api`
3. Vercel detecta React y construye con `npm run build` automaticamente

### Backend — Railway

1. Crear proyecto en Railway, agregar servicio PostgreSQL
2. Conectar el repositorio apuntando al directorio `backend/`
3. El `DATABASE_URL` se inyecta automaticamente en el entorno
4. Configurar las demas variables de entorno en Railway Dashboard
5. Push al branch conectado — Railway despliega automaticamente

```env
# Railway provee DATABASE_URL — solo agregar:
JWT_SECRET=...
REFRESH_TOKEN_SECRET=...
ENCRYPTION_KEY=...
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://tu-app.vercel.app
```

---

## Estructura del proyecto

```
GestorDeTickets/
├── backend/
│   ├── config/         # database.js (Prisma singleton), security.js
│   ├── controllers/    # auth, ticket, audit, attachment, user, category, report
│   ├── helpers/        # audit.js, rbac.js, validation.js
│   ├── middleware/     # auth.js (JWT), rbac.js (roles), mfa.js (TOTP)
│   ├── prisma/
│   │   ├── schema.prisma  # 7 tablas: users, tickets, categories, comments,
│   │   │                  # ticket_history, attachments, audit_logs
│   │   └── seed.js        # Categorías iniciales + usuarios demo
│   ├── routes/         # auth, tickets, users, categories, reports, audit
│   ├── services/       # slaService.js (cron cada 5min), emailService.js
│   └── server.js
└── frontend/
    └── src/
        ├── components/
        │   ├── admin/  # AdminPanel, UserManagement, CategoryManagement
        │   ├── Login.jsx, Register.jsx
        │   ├── Dashboard.jsx  # + Chart.js métricas RF06
        │   ├── CreateTicket.jsx  # Categorías dinámicas desde API
        │   ├── TicketDetail.jsx
        │   └── AuditLogs.jsx
        └── services/api.js   # Todos los endpoints documentados
```

---

*Diplomado FullStack UCB San Pablo — 2025*
