/**
 * Script para crear usuarios de prueba con diferentes rangos
 * Ejecutar: node createUsers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const User = require('./models/User');

const usersToCreate = [
  {
    username: 'admin',
    email: 'admin@telco.com',
    password: 'Admin@123456',
    role: 'administrador',
    description: 'Usuario Administrador - Control total del sistema'
  },
  {
    username: 'supervisor',
    email: 'supervisor@telco.com',
    password: 'Supervisor@12345',
    role: 'supervisor',
    description: 'Usuario Supervisor - Supervisa operaciones y ve logs'
  },
  {
    username: 'agente_nivel2',
    email: 'agente2@telco.com',
    password: 'Agente2@123456',
    role: 'agente_n2',
    description: 'Usuario Agente Nivel 2 - Soporte avanzado'
  },
  {
    username: 'agente_nivel1',
    email: 'agente1@telco.com',
    password: 'Agente1@123456',
    role: 'agente_n1',
    description: 'Usuario Agente Nivel 1 - Soporte básico'
  },
  {
    username: 'cliente_test',
    email: 'cliente@telco.com',
    password: 'Cliente@123456',
    role: 'cliente',
    description: 'Usuario Cliente - Crea y ve sus propios tickets'
  }
];

async function createUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('\n✓ Conectado a MongoDB\n');

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║         CREANDO USUARIOS CON DIFERENTES RANGOS         ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    let createdCount = 0;
    let skippedCount = 0;

    for (const userData of usersToCreate) {
      try {
        // Verificar si usuario ya existe
        const existingUser = await User.findOne({
          $or: [{ username: userData.username }, { email: userData.email }]
        });

        if (existingUser) {
          console.log(`⏭️  SALTADO: ${userData.username} (${userData.role})`);
          console.log(`   Razón: Ya existe en la base de datos\n`);
          skippedCount++;
          continue;
        }

        // Hashear contraseña
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(userData.password, salt);

        // Crear usuario
        const user = new User({
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
          mfaEnabled: false,
          isActive: true
        });

        await user.save();
        createdCount++;

        console.log(`✅ CREADO: ${userData.username}`);
        console.log(`   Rol: ${userData.role}`);
        console.log(`   Email: ${userData.email}`);
        console.log(`   Contraseña: ${userData.password}`);
        console.log(`   Descripción: ${userData.description}\n`);

      } catch (error) {
        console.log(`❌ ERROR creando ${userData.username}: ${error.message}\n`);
      }
    }

    // Estadísticas finales
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║                   RESUMEN DE CREACIÓN                  ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log(`✅ Usuarios creados: ${createdCount}`);
    console.log(`⏭️  Usuarios saltados: ${skippedCount}`);

    // Mostrar todos los usuarios
    const allUsers = await User.find({}).select('-password -passwordHistory -mfaSecret');
    console.log(`\n📊 Total de usuarios en BD: ${allUsers.length}\n`);

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║              USUARIOS DISPONIBLES PARA LOGIN            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. USERNAME: ${user.username}`);
      console.log(`   ROL: ${user.role}`);
      console.log(`   EMAIL: ${user.email}`);
      console.log(`   ACTIVO: ${user.isActive ? 'Sí ✓' : 'No ✗'}\n`);
    });

    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║            CREDENCIALES PARA PRUEBAS EN UI             ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('ADMINISTRADOR:');
    console.log('  Usuario: admin');
    console.log('  Contraseña: Admin@123456');
    console.log('  Acceso: Dashboard + Audit Logs\n');

    console.log('SUPERVISOR:');
    console.log('  Usuario: supervisor');
    console.log('  Contraseña: Supervisor@12345');
    console.log('  Acceso: Dashboard + Audit Logs\n');

    console.log('AGENTE NIVEL 2:');
    console.log('  Usuario: agente_nivel2');
    console.log('  Contraseña: Agente2@123456');
    console.log('  Acceso: Solo Dashboard\n');

    console.log('AGENTE NIVEL 1:');
    console.log('  Usuario: agente_nivel1');
    console.log('  Contraseña: Agente1@123456');
    console.log('  Acceso: Solo Dashboard\n');

    console.log('CLIENTE:');
    console.log('  Usuario: cliente_test');
    console.log('  Contraseña: Cliente@123456');
    console.log('  Acceso: Solo Dashboard\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

createUsers();
