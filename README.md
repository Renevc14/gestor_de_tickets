# Sistema de Gestión de Tickets con Criterios de Seguridad Avanzados

```

## 🚀 Instalación y Configuración

### Requisitos Previos
- **Node.js** (v16 o superior)
- **MongoDB** (local o Atlas)
- **npm** o **yarn**

### 1. Clonar el Repositorio
```bash
cd GestorDeTickets
```

### 2. Configurar Backend

```bash
cd backend

# Copiar archivo de configuración
cp .env.example .env

# Editar .env con tus valores
# Asegúrate de configurar:
# - MONGODB_URI
# - JWT_SECRET (generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
# - ENCRYPTION_KEY (generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")

# Instalar dependencias
npm install

# Iniciar servidor (desarrollo)
npm run dev

# O para producción
npm start
```

El servidor estará disponible en: **http://localhost:5000**

### 3. Configurar Frontend

```bash
cd frontend

# Crear archivo .env
echo "REACT_APP_API_URL=http://localhost:5000/api" > .env

# Instalar dependencias
npm install

# Iniciar aplicación
npm start
```

La aplicación estará disponible en: **http://localhost:3000**


## Credenciales de Prueba (después de instalar)

### Script de Seed (Crear usuarios de prueba)
```javascript
// En backend, crear archivo seed.js:
const User = require('./models/User');
const { connectDB } = require('./config/database');

const seedUsers = async () => {
  await connectDB();

  const users = [
    { username: 'admin', email: 'admin@test.com', password: 'SecurePass123!', role: 'administrador' },
    { username: 'supervisor', email: 'supervisor@test.com', password: 'SecurePass123!', role: 'supervisor' },
    { username: 'agente_n1', email: 'agente1@test.com', password: 'SecurePass123!', role: 'agente_n1' },
    { username: 'cliente', email: 'cliente@test.com', password: 'SecurePass123!', role: 'cliente' }
  ];

  for (const u of users) {
    const user = new User(u);
    await user.save();
  }

  console.log('✓ Usuarios creados');
  process.exit(0);
};

seedUsers();
```

Ejecutar: `node seed.js`

## 🔧 Variables de Entorno

### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/ticket_system
JWT_SECRET=generar_secreto_aleatorio_de_64_caracteres
REFRESH_TOKEN_SECRET=otro_secreto_aleatorio_de_64_caracteres
NODE_ENV=development
PORT=5000
FRONTEND_URL=http://localhost:3000
MFA_ISSUER=TicketSystemTelco
ENCRYPTION_KEY=generar_clave_de_32_bytes_en_hexadecimal
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 📝 Comentarios en Código

Todos los archivos incluyen comentarios indicando qué criterio de seguridad se está implementando:

```javascript
// CONFIDENCIALIDAD - Cifrado de datos sensibles
const encrypt = (text) => { ... }

// INTEGRIDAD - Registro inmutable de auditoría
auditLogSchema.pre('save', function(next) { ... })

// AUTENTICACIÓN - Verificar JWT token
const authenticateToken = async (req, res, next) => { ... }

// NO REPUDIO - Registrar evento en log
await logAuditEvent(...);
```