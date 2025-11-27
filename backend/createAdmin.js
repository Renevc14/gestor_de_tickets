/**
 * Script para crear un usuario administrador
 * Úsalo así: node createAdmin.js
 */

const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./models/User');
const speakeasy = require('speakeasy');

async function createAdmin() {
  try {
    console.log('🔑 Conectando a MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado a MongoDB\n');

    // Datos del nuevo admin
    const adminData = {
      username: 'admin',
      email: 'admin@ticketsystem.com',
      password: 'Admin12345!@', // Contraseña segura (12+ caracteres)
      role: 'administrador',
      isActive: true
    };

    // Verificar si el usuario ya existe
    const existingUser = await User.findOne({ username: adminData.username });
    if (existingUser) {
      console.log('⚠️  El usuario "admin" ya existe.');
      console.log('   Eliminando usuario anterior...');
      await User.deleteOne({ username: adminData.username });
      console.log('   ✅ Usuario anterior eliminado\n');
    }

    // Crear nuevo admin
    console.log('📝 Creando usuario administrador...');
    const user = new User(adminData);

    // NO habilitar MFA aún - se configurará después del primer login
    user.mfaEnabled = false;
    user.mfaSecret = null;

    await user.save();

    console.log('✅ Usuario administrador creado exitosamente!\n');
    console.log('📋 CREDENCIALES:');
    console.log(`   Usuario: ${adminData.username}`);
    console.log(`   Contraseña: ${adminData.password}`);
    console.log(`   Rol: ${adminData.role}\n`);

    console.log('⚠️  IMPORTANTE:');
    console.log('   1. Este usuario NO tiene MFA habilitado aún');
    console.log('   2. Puedes hacer login normalmente');
    console.log('   3. En el dashboard verás opción "Configurar MFA"\n');

    console.log('🚀 Próximos pasos:');
    console.log('   1. Abre http://localhost:3000');
    console.log(`   2. Haz login con usuario: ${adminData.username}`);
    console.log(`   3. Contraseña: ${adminData.password}`);
    console.log('   4. En el dashboard, busca "Configurar MFA"');
    console.log('   5. Configura MFA con Google Authenticator cuando quieras\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creando admin:', error.message);
    process.exit(1);
  }
}

createAdmin();
