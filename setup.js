#!/usr/bin/env node

/**
 * Script de Setup para Sistema de Gestión de Tickets
 * Configura variables de entorno, genera secretos y prepara la aplicación
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function setup() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║  Sistema de Gestión de Tickets - Setup Inicial                  ║');
  console.log('║  Configuración de Seguridad y Variables de Entorno              ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  try {
    // 1. Preguntar por tipo de ambiente
    console.log('📋 Seleccionar ambiente:');
    console.log('   1. Desarrollo (desarrollo local)');
    console.log('   2. Producción (servidor en línea)');
    const envType = await question('\nElige una opción (1 o 2): ');
    const NODE_ENV = envType === '2' ? 'production' : 'development';

    // 2. Configuración de MongoDB
    console.log('\n📦 Configuración de Base de Datos:');
    console.log('   1. MongoDB Local (localhost:27017)');
    console.log('   2. MongoDB Atlas (Cloud)');
    console.log('   3. Otra');
    const dbType = await question('\nElige una opción (1, 2 o 3): ');

    let MONGODB_URI;
    if (dbType === '1') {
      MONGODB_URI = 'mongodb://localhost:27017/ticket_system';
    } else if (dbType === '2') {
      MONGODB_URI = await question('Ingresa tu MongoDB Atlas connection string: ');
    } else {
      MONGODB_URI = await question('Ingresa tu MongoDB connection string: ');
    }

    // 3. Puerto
    const PORT = await question('\n🔌 Puerto del servidor (presiona Enter para 5000): ') || '5000';

    // 4. Frontend URL
    const FRONTEND_URL = await question('🌐 URL del Frontend (presiona Enter para http://localhost:3000): ') || 'http://localhost:3000';

    // 5. Generar secretos seguros
    console.log('\n🔐 Generando secretos aleatorios seguros...');
    const JWT_SECRET = crypto.randomBytes(32).toString('hex');
    const REFRESH_TOKEN_SECRET = crypto.randomBytes(32).toString('hex');
    const ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');

    console.log('   ✅ JWT_SECRET generado');
    console.log('   ✅ REFRESH_TOKEN_SECRET generado');
    console.log('   ✅ ENCRYPTION_KEY generado');

    // 6. MFA Issuer
    const MFA_ISSUER = await question('\n🔑 MFA Issuer (presiona Enter para "TicketSystemTelco"): ') || 'TicketSystemTelco';

    // 7. Crear archivo .env
    const envContent = `# ===== CONFIGURACIÓN AUTOMÁTICA DEL SETUP =====
# Generado: ${new Date().toISOString()}
# Ambiente: ${NODE_ENV}

# ===== BASE DE DATOS =====
MONGODB_URI=${MONGODB_URI}

# ===== AUTENTICACIÓN JWT (SECRETOS SEGUROS GENERADOS ALEATORIAMENTE) =====
# ⚠️ NO compartir estos valores, cambiar en producción
JWT_SECRET=${JWT_SECRET}
REFRESH_TOKEN_SECRET=${REFRESH_TOKEN_SECRET}

# ===== ENCRIPTACIÓN (AES-256-GCM) =====
ENCRYPTION_KEY=${ENCRYPTION_KEY}

# ===== ENTORNO Y PUERTO =====
NODE_ENV=${NODE_ENV}
PORT=${PORT}

# ===== FRONTEND =====
FRONTEND_URL=${FRONTEND_URL}

# ===== MFA (TOTP) =====
MFA_ISSUER=${MFA_ISSUER}

# ===== EMAIL (OPCIONAL - Configurar si quieres notificaciones) =====
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=tu_email@gmail.com
# SMTP_PASS=tu_contraseña_app
# SMTP_FROM_EMAIL=noreply@ticketsystem.com
# EMAIL_PROVIDER=smtp

# O usar SendGrid:
# SENDGRID_API_KEY=sk-xxxx

# ===== NOTAS DE SEGURIDAD =====
# - Cambiar JWT_SECRET y ENCRYPTION_KEY en producción
# - Usar HTTPS/TLS obligatoriamente en producción
# - Guardar este archivo en .gitignore (NO subir a Git)
# - Usar gestor de secretos en producción (AWS Secrets Manager, Vault, etc.)
`;

    const envPath = path.join(__dirname, 'backend', '.env');

    // Verificar si .env ya existe
    if (fs.existsSync(envPath)) {
      const overwrite = await question(`\n⚠️  El archivo .env ya existe. ¿Sobrescribir? (s/n): `);
      if (overwrite.toLowerCase() !== 's') {
        console.log('❌ Setup cancelado. No se sobrescribió .env');
        rl.close();
        return;
      }
    }

    fs.writeFileSync(envPath, envContent);
    console.log(`\n✅ Archivo .env creado en: ${envPath}`);

    // 8. Crear .env para frontend
    const frontendEnvContent = `REACT_APP_API_URL=http://localhost:5000/api
`;
    const frontendEnvPath = path.join(__dirname, 'frontend', '.env');
    fs.writeFileSync(frontendEnvPath, frontendEnvContent);
    console.log(`✅ Archivo .env del frontend creado en: ${frontendEnvPath}`);

    // 9. Mostrar resumen
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    ✅ SETUP COMPLETADO                           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('📋 RESUMEN DE CONFIGURACIÓN:');
    console.log(`   Ambiente: ${NODE_ENV}`);
    console.log(`   Base de datos: ${MONGODB_URI.substring(0, 50)}...`);
    console.log(`   Puerto: ${PORT}`);
    console.log(`   Frontend URL: ${FRONTEND_URL}`);
    console.log(`   MFA Issuer: ${MFA_ISSUER}`);

    console.log('\n🔐 SECRETOS GENERADOS (32 bytes = 256 bits):');
    console.log(`   JWT_SECRET: ${JWT_SECRET}`);
    console.log(`   REFRESH_TOKEN_SECRET: ${REFRESH_TOKEN_SECRET}`);
    console.log(`   ENCRYPTION_KEY: ${ENCRYPTION_KEY}`);

    console.log('\n📁 Archivos creados:');
    console.log(`   ✅ backend/.env`);
    console.log(`   ✅ frontend/.env`);

    console.log('\n🚀 PRÓXIMOS PASOS:');
    console.log('   1. npm install (en backend)');
    console.log('   2. npm install (en frontend)');
    console.log('   3. node backend/createUsers.js (crear usuarios de prueba)');
    console.log('   4. npm run dev (en backend) - en una terminal');
    console.log('   5. npm start (en frontend) - en otra terminal');

    console.log('\n⚠️  RECORDATORIOS IMPORTANTES:');
    console.log('   - NO subir .env a Git (está en .gitignore)');
    console.log('   - Cambiar secretos en PRODUCCIÓN');
    console.log('   - Usar HTTPS/TLS en producción');
    console.log('   - Documentación: CONFIGURACION_SECRETOS.md\n');

    rl.close();

  } catch (error) {
    console.error('\n❌ Error durante el setup:', error.message);
    rl.close();
    process.exit(1);
  }
}

// Ejecutar setup
setup();
