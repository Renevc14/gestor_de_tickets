# Sistema de Gestión de Tickets - Seguridad OWASP Top 10

Sistema web full stack para gestión de tickets de soporte técnico con implementación de criterios de seguridad basados en **OWASP Top 10 2021**.

> **Video Demostrativo:** https://www.youtube.com/watch?v=74cjc7YUyKE

## Características de Seguridad Implementadas

| OWASP | Descripción | Implementación |
|-------|-------------|----------------|
| **A01** | Pérdida de Control de Acceso | RBAC con 5 roles, verificación de propiedad |
| **A02** | Fallas Criptográficas | bcrypt (12 rounds), AES-256-GCM, JWT |
| **A03** | Inyección | Mongoose ODM, sanitización de inputs |
| **A07** | Fallas de Autenticación | MFA (TOTP), bloqueo por intentos, política de contraseñas |
| **A08** | Fallas de Integridad | Logs inmutables, checksums SHA-256 |

## Stack Tecnológico

- **Frontend:** React 18 + Tailwind CSS
- **Backend:** Node.js + Express 4
- **Base de Datos:** MongoDB Atlas
- **Autenticación:** JWT + bcrypt + TOTP (Google Authenticator)
- **Seguridad:** Helmet, CORS, Rate Limiting

---

## Instalación

### Requisitos Previos

- Node.js v18 o superior
- npm v9 o superior
- Cuenta en MongoDB Atlas (o MongoDB local)

### 1. Clonar el Repositorio

```bash
git clone https://github.com/Renevc14/gestor_de_tickets.git
cd gestor_de_tickets
```

### 2. Configurar Backend

```bash
cd backend

# Copiar archivo de configuración
cp .env.example .env
```

Editar `.env` con tus valores:

```env
MONGODB_URI=mongodb+srv://renevc:mongodatabase@cluster0.wiyvclx.mongodb.net/?appName=Cluster0
JWT_SECRET=<generar-64-caracteres-aleatorios>
REFRESH_TOKEN_SECRET=<generar-64-caracteres-aleatorios>
ENCRYPTION_KEY=<generar-64-caracteres-hex>
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
MFA_ISSUER=TicketSystemTelco
```

Para generar claves seguras:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Instalar dependencias e iniciar:
```bash
npm install
npm run dev
```

El backend estará en: **http://localhost:5000**

### 3. Configurar Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Iniciar aplicación
npm start
```

El frontend estará en: **http://localhost:3000**

---

## Usuarios de Prueba

El sistema viene con usuarios pre-configurados para pruebas:

| Rol | Usuario | Contraseña | Descripción |
|-----|---------|------------|-------------|
| **Administrador** | `admin` | `Admin@123456` | Acceso total al sistema |
| **Supervisor** | `supervisor` | `Supervisor@123456` | Ve todos los tickets y auditoría |
| **Agente N1** | `agente_nivel1` | `Agente1@123456` | Soporte nivel 1 |
| **Agente N2** | `agente_nivel2` | `Agente2@123456` | Soporte especializado |
| **Cliente** | `cliente_test_` | `Cliente@123456` | Solo ve sus propios tickets |

### Crear Usuarios Manualmente

Si necesitas crear usuarios nuevos, usa el endpoint de registro:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "nuevo_usuario",
    "email": "usuario@email.com",
    "password": "MiPassword123!",
    "confirmPassword": "MiPassword123!"
  }'
```

**Nota:** Los usuarios se registran como `cliente` por defecto. Para cambiar el rol, usa la pantalla de Administración de Usuarios (solo admin).

---

## Roles y Permisos

```
┌─────────────────┬─────────┬─────────┬─────────┬────────────┬───────────────┐
│ Funcionalidad   │ Cliente │ Agente1 │ Agente2 │ Supervisor │ Administrador │
├─────────────────┼─────────┼─────────┼─────────┼────────────┼───────────────┤
│ Ver sus tickets │    ✓    │    ✓    │    ✓    │     ✓      │       ✓       │
│ Ver asignados   │    -    │    ✓    │    ✓    │     ✓      │       ✓       │
│ Ver todos       │    -    │    -    │    -    │     ✓      │       ✓       │
│ Crear tickets   │    ✓    │    ✓    │    ✓    │     ✓      │       ✓       │
│ Comentar        │    ✓    │    ✓    │    ✓    │     ✓      │       ✓       │
│ Reasignar       │    -    │    ✓    │    ✓    │     ✓      │       ✓       │
│ Ver auditoría   │    -    │    -    │    -    │     ✓      │       ✓       │
│ Gestión usuarios│    -    │    -    │    -    │     -      │       ✓       │
└─────────────────┴─────────┴─────────┴─────────┴────────────┴───────────────┘
```

---

## API Endpoints

### Autenticación (`/api/auth`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/register` | Registrar nuevo usuario |
| POST | `/login` | Iniciar sesión |
| POST | `/login-mfa` | Verificar código MFA en login |
| GET | `/profile` | Obtener perfil del usuario |
| POST | `/refresh` | Renovar token JWT |
| POST | `/setup-mfa` | Configurar MFA (genera QR) |
| POST | `/verify-mfa` | Verificar y activar MFA |
| POST | `/disable-mfa` | Desactivar MFA |

### Tickets (`/api/tickets`)

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Listar tickets (filtrado por rol) |
| POST | `/` | Crear nuevo ticket |
| GET | `/:id` | Obtener detalle de ticket |
| PUT | `/:id` | Actualizar ticket |
| POST | `/:id/comments` | Agregar comentario |
| GET | `/:id/history` | Ver historial de cambios |
| GET | `/assignable-users` | Listar usuarios asignables |

### Usuarios (`/api/users`) - Solo Admin

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Listar todos los usuarios |
| GET | `/:id` | Obtener usuario por ID |
| PUT | `/:id/role` | Cambiar rol de usuario |
| PUT | `/:id/status` | Activar/desactivar usuario |

### Auditoría (`/api/audit-logs`) - Admin/Supervisor

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/` | Listar logs de auditoría |
| GET | `/stats` | Estadísticas de auditoría |
| GET | `/:id` | Detalle de log |

---

## Guía de Pruebas

### 1. Probar Autenticación

```bash
# Login exitoso
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "Admin123456!"}'

# Login fallido (5 intentos = bloqueo 30 min)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "incorrecta"}'
```

### 2. Probar Control de Acceso

```bash
# Obtener token de cliente
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "cliente1", "password": "Cliente123456!"}' | jq -r '.token')

# Intentar acceder a auditoría (debe fallar - 403)
curl -X GET http://localhost:5000/api/audit-logs \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Probar MFA

1. Login como cualquier usuario
2. Ir a Dashboard → Click en botón "MFA"
3. Escanear QR con Google Authenticator
4. Ingresar código de 6 dígitos
5. Hacer logout y login nuevamente
6. El sistema pedirá el código MFA

### 4. Probar Políticas de Contraseña

```bash
# Contraseña débil (debe fallar)
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test",
    "email": "test@test.com",
    "password": "123456",
    "confirmPassword": "123456"
  }'

# Respuesta esperada: error con requisitos de contraseña
```

---

## Estructura del Proyecto

```
gestor_de_tickets/
├── backend/
│   ├── config/
│   │   ├── database.js      # Conexión MongoDB
│   │   └── security.js      # Configuración de seguridad
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── ticketController.js
│   │   └── userController.js
│   ├── helpers/
│   │   ├── audit.js         # Funciones de auditoría
│   │   ├── rbac.js          # Control de acceso por roles
│   │   └── validation.js    # Validación y sanitización
│   ├── middleware/
│   │   ├── auth.js          # Middleware JWT
│   │   └── rbac.js          # Middleware de permisos
│   ├── models/
│   │   ├── User.js          # Modelo de usuario
│   │   ├── Ticket.js        # Modelo de ticket
│   │   └── AuditLog.js      # Modelo de auditoría
│   ├── routes/
│   │   ├── auth.js
│   │   ├── tickets.js
│   │   ├── users.js
│   │   └── audit.js
│   ├── server.js            # Punto de entrada
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── TicketDetail.jsx
│   │   │   ├── CreateTicket.jsx
│   │   │   ├── AuditLogs.jsx
│   │   │   ├── MFASetup.jsx
│   │   │   └── UserManagement.jsx
│   │   ├── services/
│   │   │   └── api.js       # Cliente API
│   │   ├── styles/
│   │   │   └── App.css      # Estilos Tailwind
│   │   └── App.js           # Rutas
│   └── package.json
└── README.md
```

---

## Verificar que Todo Funciona

1. **Health Check del Backend:**
   ```bash
   curl http://localhost:5000/health
   ```
   Respuesta esperada: `{"success": true, "message": "Sistema operativo"}`

2. **Frontend carga correctamente:**
   - Abrir http://localhost:3000
   - Debe mostrar pantalla de login

3. **Login funciona:**
   - Usuario: `admin`
   - Contraseña: `Admin@123456`
   - Debe redirigir al Dashboard

4. **Base de datos conectada:**
   - En el Dashboard deben aparecer tickets (si existen)
   - En Auditoría deben aparecer logs de login

---

## Solución de Problemas

### Error de conexión a MongoDB
- Verificar que `MONGODB_URI` en `.env` es correcta
- Verificar que la IP está en whitelist de MongoDB Atlas

### Error de CORS
- Verificar que `FRONTEND_URL` en `.env` del backend coincide con la URL del frontend

### Token expirado
- Los tokens JWT expiran en 30 minutos
- El refresh token dura 7 días
- Si hay problemas, hacer logout y login nuevamente

### MFA no funciona
- Verificar que la hora del dispositivo móvil esté sincronizada
- El código TOTP tiene ventana de ±60 segundos
