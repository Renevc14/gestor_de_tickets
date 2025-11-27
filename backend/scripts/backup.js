/**
 * DISPONIBILIDAD - Script de Backup de MongoDB
 * Realiza dump de la base de datos y la comprime
 * Ejecutar: node scripts/backup.js
 *
 * Para automatizar (Linux/Mac): Agregar a crontab
 * 0 2 * * * cd /ruta/al/proyecto && node backend/scripts/backup.js
 */

require('dotenv').config();
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const zlib = require('zlib');
const { createWriteStream, createReadStream } = require('fs');

const BACKUP_DIR = path.join(__dirname, '../backups');
const RETENTION_DAYS = 7;

/**
 * DISPONIBILIDAD - Crear directorio de backups si no existe
 */
async function ensureBackupDirectory() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creando directorio de backups:', error);
  }
}

/**
 * DISPONIBILIDAD - Obtener nombre de la base de datos desde URI
 */
function getDatabaseNameFromURI(uri) {
  try {
    const url = new URL(uri);
    const pathname = url.pathname;
    // Extraer nombre de la BD después del último /
    const dbName = pathname.split('/').pop();
    return dbName || 'ticket_system';
  } catch (error) {
    return 'ticket_system';
  }
}

/**
 * DISPONIBILIDAD - Realizar backup de la base de datos
 */
async function performBackup() {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const dbName = getDatabaseNameFromURI(process.env.MONGODB_URI);
    const tempDir = path.join(BACKUP_DIR, `temp_${timestamp}`);
    const backupFile = path.join(BACKUP_DIR, `backup_${timestamp}.tar.gz`);

    console.log(`[${new Date().toISOString()}] Iniciando backup de MongoDB...`);
    console.log(`Base de datos: ${dbName}`);
    console.log(`Directorio temporal: ${tempDir}`);
    console.log(`Archivo de salida: ${backupFile}`);

    // Crear directorio temporal
    await fs.mkdir(tempDir, { recursive: true });

    // Ejecutar mongodump
    return new Promise((resolve, reject) => {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ticket_system';

      const dumpCommand = `mongodump --uri="${mongoUri}" --out="${tempDir}"`;

      console.log('Ejecutando: mongodump...');

      exec(dumpCommand, async (error, stdout, stderr) => {
        if (error) {
          console.error('Error ejecutando mongodump:', error.message);
          reject(error);
          return;
        }

        console.log('Dump completado. Comprimiendo...');

        // Comprimir directorio
        try {
          await compressDirectory(tempDir, backupFile);

          // Eliminar directorio temporal
          await fs.rm(tempDir, { recursive: true, force: true });

          // Obtener tamaño del archivo
          const stats = await fs.stat(backupFile);
          const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

          console.log(`Backup completado exitosamente`);
          console.log(`Archivo: ${path.basename(backupFile)}`);
          console.log(`Tamaño: ${sizeInMB} MB`);
          console.log(`Timestamp: ${new Date().toISOString()}`);

          // Limpiar backups antiguos
          await cleanOldBackups();

          resolve({
            success: true,
            file: backupFile,
            size: sizeInMB,
            timestamp: new Date()
          });
        } catch (compressError) {
          console.error('Error comprimiendo backup:', compressError);
          reject(compressError);
        }
      });
    });

  } catch (error) {
    console.error('Error en backup:', error);
    throw error;
  }
}

/**
 * DISPONIBILIDAD - Comprimir directorio usando tar.gz
 */
async function compressDirectory(sourceDir, outputFile) {
  return new Promise((resolve, reject) => {
    const { exec } = require('child_process');

    // Usar tar para comprimir (funciona en Linux/Mac)
    // Para Windows, usar PowerShell o herramientas alternativas
    const isWindows = process.platform === 'win32';

    if (isWindows) {
      // Para Windows: usar PowerShell Compress-Archive
      const psCommand = `powershell -Command "Compress-Archive -Path '${sourceDir}\\*' -DestinationPath '${outputFile.replace(/\.tar\.gz$/, '.zip')}'`;
      exec(psCommand, (error) => {
        if (error) reject(error);
        else resolve();
      });
    } else {
      // Para Linux/Mac: usar tar
      const tarCommand = `cd "${path.dirname(sourceDir)}" && tar -czf "${outputFile}" "${path.basename(sourceDir)}"`;
      exec(tarCommand, (error) => {
        if (error) reject(error);
        else resolve();
      });
    }
  });
}

/**
 * DISPONIBILIDAD - Limpiar backups más antiguos que RETENTION_DAYS
 */
async function cleanOldBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files.filter(f => f.startsWith('backup_'));

    const now = Date.now();
    const retentionMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

    for (const file of backupFiles) {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = await fs.stat(filePath);
      const age = now - stats.mtime.getTime();

      if (age > retentionMs) {
        await fs.unlink(filePath);
        console.log(`Backup antiguo eliminado: ${file}`);
      }
    }

  } catch (error) {
    console.error('Error limpiando backups antiguos:', error);
  }
}

/**
 * DISPONIBILIDAD - Listar backups disponibles
 */
async function listBackups() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files.filter(f => f.startsWith('backup_')).sort().reverse();

    if (backupFiles.length === 0) {
      console.log('No hay backups disponibles');
      return;
    }

    console.log('Backups disponibles:');
    console.log('');

    for (const file of backupFiles) {
      const filePath = path.join(BACKUP_DIR, file);
      const stats = await fs.stat(filePath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      const date = stats.mtime.toISOString();

      console.log(`  ${file}`);
      console.log(`    Tamaño: ${sizeInMB} MB`);
      console.log(`    Fecha: ${date}`);
      console.log('');
    }

  } catch (error) {
    console.error('Error listando backups:', error);
  }
}

/**
 * DISPONIBILIDAD - Restaurar desde backup
 */
async function restoreBackup(backupFile) {
  try {
    const filePath = path.join(BACKUP_DIR, backupFile);

    // Verificar que el archivo existe
    await fs.stat(filePath);

    const tempDir = path.join(BACKUP_DIR, `restore_${Date.now()}`);

    console.log(`[${new Date().toISOString()}] Iniciando restauración desde: ${backupFile}`);
    console.log(`Directorio temporal: ${tempDir}`);

    // Crear directorio temporal
    await fs.mkdir(tempDir, { recursive: true });

    // Descomprimir
    return new Promise((resolve, reject) => {
      const isWindows = process.platform === 'win32';
      const { exec } = require('child_process');

      if (isWindows) {
        const psCommand = `powershell -Command "Expand-Archive -Path '${filePath.replace(/\.gz$/, '.zip')}' -DestinationPath '${tempDir}'"`;
        exec(psCommand, (error) => {
          if (error) {
            reject(error);
            return;
          }
          performRestore(tempDir, resolve, reject);
        });
      } else {
        const tarCommand = `cd "${tempDir}" && tar -xzf "${filePath}"`;
        exec(tarCommand, (error) => {
          if (error) {
            reject(error);
            return;
          }
          performRestore(tempDir, resolve, reject);
        });
      }
    });

  } catch (error) {
    console.error('Error en restauración:', error);
    throw error;
  }
}

async function performRestore(dumpDir, resolve, reject) {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ticket_system';

  // Encontrar la carpeta dump
  const dumpPath = path.join(dumpDir, 'dump');

  const restoreCommand = `mongorestore --uri="${mongoUri}" --dir="${dumpPath}" --drop`;

  console.log('Restaurando base de datos...');

  exec(restoreCommand, async (error, stdout, stderr) => {
    if (error) {
      console.error('Error restaurando:', error.message);
      reject(error);
      return;
    }

    // Limpiar directorio temporal
    try {
      await fs.rm(dumpDir, { recursive: true, force: true });
    } catch (err) {
      console.warn('Error eliminando directorio temporal:', err);
    }

    console.log('Restauración completada exitosamente');
    resolve({ success: true });
  });
}

// Ejecutar según argumentos
async function main() {
  await ensureBackupDirectory();

  const action = process.argv[2] || 'backup';

  switch (action) {
    case 'backup':
      await performBackup();
      break;
    case 'list':
      await listBackups();
      break;
    case 'restore':
      const backupName = process.argv[3];
      if (!backupName) {
        console.log('Uso: node backup.js restore <nombre_archivo>');
        console.log('Ejemplo: node backup.js restore backup_2025-11-26T12-00-00.tar.gz');
        process.exit(1);
      }
      await restoreBackup(backupName);
      break;
    default:
      console.log('Uso: node backup.js [backup|list|restore]');
      process.exit(1);
  }
}

main().catch(error => {
  console.error('Error fatal:', error);
  process.exit(1);
});
