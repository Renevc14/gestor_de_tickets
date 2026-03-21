/**
 * SECURITY HARDENING TEST SUITE
 * Cubre: crypto (SHA-256, AES-256-GCM), validación de contraseñas (todas las reglas),
 *        validación de adjuntos (path traversal, MIME spoofing), matriz RBAC completa,
 *        y cálculos SLA por prioridad.
 */

// ─── Mocks deben declararse ANTES de cualquier require de los módulos que los usan
jest.mock('node-cron', () => ({ schedule: jest.fn() }));
jest.mock('../../config/database', () => ({}));
jest.mock('../../helpers/audit', () => ({ logAuditEvent: jest.fn() }));

const { calculateChecksum, encrypt, decrypt } = require('../../config/security');
const { validatePassword, validateAttachment } = require('../../helpers/validation');
const { hasPermission, canAccessTicket, canAccessAuditLogs, getTicketFilters } = require('../../helpers/rbac');
const { calculateSLADeadline, getTimeRemaining } = require('../../services/slaService');

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 1: CRYPTO — SHA-256 checksums y AES-256-GCM encrypt/decrypt
// ═══════════════════════════════════════════════════════════════════════════════

describe('Crypto — calculateChecksum (SHA-256)', () => {
  const bufferA = Buffer.from('contenido del archivo A');
  const bufferB = Buffer.from('contenido del archivo B — distinto');

  test('retorna exactamente 64 caracteres hexadecimales', () => {
    const hash = calculateChecksum(bufferA);
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('es determinístico: el mismo buffer siempre produce el mismo hash', () => {
    expect(calculateChecksum(bufferA)).toBe(calculateChecksum(bufferA));
  });

  test('buffers distintos producen hashes distintos', () => {
    expect(calculateChecksum(bufferA)).not.toBe(calculateChecksum(bufferB));
  });

  test('un cambio de un solo byte produce un hash completamente distinto', () => {
    const bufferC = Buffer.from('contenido del archivo A');
    const bufferD = Buffer.from('contenido del archivo B'); // solo difiere al final
    expect(calculateChecksum(bufferC)).not.toBe(calculateChecksum(bufferD));
  });
});

describe('Crypto — encrypt / decrypt (AES-256-GCM)', () => {
  test('encrypt produce formato correcto: iv:authTag:encryptedData (3 partes con :)', () => {
    const result = encrypt('dato secreto');
    const parts = result.split(':');
    expect(parts).toHaveLength(3);
    // IV = 16 bytes = 32 hex chars
    expect(parts[0]).toHaveLength(32);
    // authTag GCM = 16 bytes = 32 hex chars
    expect(parts[1]).toHaveLength(32);
  });

  test('dos cifrados del mismo texto producen ciphertexts distintos (IV aleatorio)', () => {
    const texto = 'mismo texto secreto';
    const enc1 = encrypt(texto);
    const enc2 = encrypt(texto);
    expect(enc1).not.toBe(enc2);
  });

  test('round-trip: decrypt(encrypt(text)) === text original', () => {
    const textos = ['hola mundo', 'contraseña123!', 'datos sensibles con ñ y acentos', '{"user":1}'];
    textos.forEach(texto => {
      expect(decrypt(encrypt(texto))).toBe(texto);
    });
  });

  test('decrypt lanza error con input malformado (menos de 3 partes)', () => {
    expect(() => decrypt('sin_separadores')).toThrow('Formato de datos cifrados inválido');
    expect(() => decrypt('solo:dos')).toThrow('Formato de datos cifrados inválido');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 2: VALIDACIÓN DE CONTRASEÑAS — todas las reglas de política
// ═══════════════════════════════════════════════════════════════════════════════

describe('validatePassword — política de seguridad', () => {
  // Tabla parametrizada: [password, esValida, erroresEsperados_o_cantidad]
  test.each([
    // Caso válido: cumple todas las reglas
    ['Admin@Test2024!', true, 0],
    // Demasiado corta (< 12 chars), falta mayúscula, número y especial
    ['short',          false, 4],
    // Solo falla minLength
    ['short@1A',       false, 1],
    // Solo falla hasUppercase
    ['nouppercase@2024!', false, 1],
    // Solo falla hasLowercase
    ['NOLOWERCASE@2024!', false, 1],
    // Solo falla hasNumbers
    ['NoNumbers@Special!', false, 1],
    // Solo falla hasSpecialChars
    ['NoSpecialChar1234A', false, 1],
    // Vacía: falla todas las 5 reglas
    ['',                false, 5],
  ])('password "%s" → isValid=%s, errores=%s', (password, expectedValid, expectedErrorCount) => {
    const result = validatePassword(password);
    expect(result.isValid).toBe(expectedValid);
    if (typeof expectedErrorCount === 'number') {
      expect(result.errors).toHaveLength(expectedErrorCount);
    }
  });

  test('retorna estructura correcta: { isValid, errors, requirements }', () => {
    const result = validatePassword('Admin@Test2024!');
    expect(result).toHaveProperty('isValid', true);
    expect(result).toHaveProperty('errors');
    expect(result.errors).toBeInstanceOf(Array);
    expect(result).toHaveProperty('requirements');
    expect(result.requirements).toMatchObject({
      minLength: true,
      hasUppercase: true,
      hasLowercase: true,
      hasNumbers: true,
      hasSpecialChars: true
    });
  });

  test('password corta: requirements.minLength es false, resto puede ser true', () => {
    const result = validatePassword('Short@1A'); // 8 chars, cumple todo excepto longitud
    expect(result.requirements.minLength).toBe(false);
    expect(result.errors.some(e => e.includes('12 caracteres'))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 3: VALIDACIÓN DE ADJUNTOS — path traversal, MIME spoofing, tamaño
// ═══════════════════════════════════════════════════════════════════════════════

describe('validateAttachment — vectores de seguridad OWASP', () => {
  test.each([
    // [descripcion, archivo, esValido, fragmento_de_error_esperado]
    ['archivo null',           null,                                                                    false, 'No se proporcionó'],
    ['archivo undefined',      undefined,                                                               false, 'No se proporcionó'],
    ['tamaño excede 10MB',     { size: 11 * 1024 * 1024, mimetype: 'image/jpeg', originalname: 'a.jpg' }, false, 'tamaño máximo'],
    ['MIME ejecutable .exe',   { size: 100, mimetype: 'application/x-executable', originalname: 'v.exe' }, false, 'no permitido'],
    ['MIME octet-stream',      { size: 100, mimetype: 'application/octet-stream', originalname: 'v.bin' }, false, 'no permitido'],
    ['path traversal ../',     { size: 100, mimetype: 'image/jpeg', originalname: '../../etc/passwd' },   false, 'inválido'],
    ['path traversal /',       { size: 100, mimetype: 'image/jpeg', originalname: 'folder/evil.jpg' },   false, 'inválido'],
    ['path traversal \\',      { size: 100, mimetype: 'image/jpeg', originalname: 'C:\\win\\evil.jpg' }, false, 'inválido'],
    ['archivo válido imagen',  { size: 1024, mimetype: 'image/jpeg', originalname: 'foto.jpg' },         true, null],
    ['archivo válido PDF',     { size: 500000, mimetype: 'application/pdf', originalname: 'doc.pdf' },   true, null],
    ['archivo CSV válido',     { size: 1024, mimetype: 'text/csv', originalname: 'datos.csv' },          true, null],
  ])('%s', (desc, file, expectedValid, expectedErrorFragment) => {
    const result = validateAttachment(file);
    expect(result.isValid).toBe(expectedValid);
    if (!expectedValid && expectedErrorFragment) {
      const allErrors = result.errors.join(' ');
      expect(allErrors.toLowerCase()).toContain(expectedErrorFragment.toLowerCase());
    }
  });

  test('archivo válido incluye sanitizedName limpio', () => {
    const file = { size: 1024, mimetype: 'image/png', originalname: 'mi foto (verano).png' };
    const result = validateAttachment(file);
    expect(result.isValid).toBe(true);
    expect(result.sanitizedName).toMatch(/^[a-zA-Z0-9._\-]+$/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 4: RBAC MATRIX — todas las combinaciones críticas de rol × recurso × acción
// ═══════════════════════════════════════════════════════════════════════════════

describe('hasPermission — matriz RBAC completa', () => {
  test.each([
    // [rol, recurso, accion, resultado_esperado]
    // SOLICITANTE
    ['SOLICITANTE', 'tickets',    'create',          true],
    ['SOLICITANTE', 'tickets',    'read_own',         true],
    ['SOLICITANTE', 'tickets',    'update_assigned',  false],
    ['SOLICITANTE', 'users',      'read_all',         false],
    ['SOLICITANTE', 'categories', 'create',           false],
    ['SOLICITANTE', 'auditLogs',  'view_all',         false],
    ['SOLICITANTE', 'reports',    'view',             false],
    // TECNICO
    ['TECNICO',     'tickets',    'read_assigned',    true],
    ['TECNICO',     'tickets',    'update_assigned',  true],
    ['TECNICO',     'tickets',    'read_unassigned',  true],
    ['TECNICO',     'users',      'read_all',         false],
    ['TECNICO',     'categories', 'create',           false],
    ['TECNICO',     'auditLogs',  'view_all',         false],
    // ADMINISTRADOR — comodín *
    ['ADMINISTRADOR', 'users',      'read_all',   true],
    ['ADMINISTRADOR', 'users',      'delete',     true],
    ['ADMINISTRADOR', 'categories', 'create',     true],
    ['ADMINISTRADOR', 'categories', 'delete',     true],
    ['ADMINISTRADOR', 'auditLogs',  'view_all',   true],
    ['ADMINISTRADOR', 'reports',    'view',       true],
    ['ADMINISTRADOR', 'tickets',    'close',      true],
    // Rol desconocido
    ['SUPERADMIN', 'tickets', 'create', false],
  ])('%s puede %s/%s → %s', (role, resource, action, expected) => {
    expect(hasPermission(role, resource, action)).toBe(expected);
  });
});

describe('canAccessTicket — acceso por ownership', () => {
  const admin     = { id: 1, role: 'ADMINISTRADOR' };
  const sol1      = { id: 2, role: 'SOLICITANTE' };
  const sol2      = { id: 3, role: 'SOLICITANTE' };
  const tech1     = { id: 4, role: 'TECNICO' };
  const tech2     = { id: 5, role: 'TECNICO' };

  test('ADMINISTRADOR: acceso total sin importar ownership', () => {
    const ticket = { user_id: sol2.id, tech_id: tech2.id };
    expect(canAccessTicket(ticket, admin, 'read_own')).toBe(true);
    expect(canAccessTicket(ticket, admin, 'update_assigned')).toBe(true);
    expect(canAccessTicket(ticket, admin, 'close')).toBe(true);
  });

  test('SOLICITANTE: accede a su propio ticket pero NO al de otro', () => {
    const propio = { user_id: sol1.id, tech_id: null };
    const ajeno  = { user_id: sol2.id, tech_id: null };
    expect(canAccessTicket(propio, sol1, 'read_own')).toBe(true);
    expect(canAccessTicket(ajeno,  sol1, 'read_own')).toBe(false);
  });

  test('SOLICITANTE: action=create siempre true', () => {
    expect(canAccessTicket({}, sol1, 'create')).toBe(true);
  });

  test('TECNICO: accede a ticket asignado a él', () => {
    const asignado = { user_id: sol1.id, tech_id: tech1.id };
    expect(canAccessTicket(asignado, tech1, 'read_assigned')).toBe(true);
  });

  test('TECNICO: NO accede a ticket asignado a otro técnico', () => {
    const deOtroTech = { user_id: sol1.id, tech_id: tech2.id };
    expect(canAccessTicket(deOtroTech, tech1, 'read_assigned')).toBe(false);
  });

  test('TECNICO: puede leer ticket sin asignar (read_unassigned)', () => {
    const sinAsignar = { user_id: sol1.id, tech_id: null };
    expect(canAccessTicket(sinAsignar, tech1, 'read_unassigned')).toBe(true);
  });

  test('rol desconocido: siempre false', () => {
    expect(canAccessTicket({}, { id: 99, role: 'GHOST' }, 'create')).toBe(false);
  });
});

describe('canAccessAuditLogs', () => {
  test('ADMINISTRADOR puede ver audit logs', () => {
    expect(canAccessAuditLogs({ role: 'ADMINISTRADOR' })).toBe(true);
  });

  test('TECNICO NO puede ver audit logs', () => {
    expect(canAccessAuditLogs({ role: 'TECNICO' })).toBe(false);
  });

  test('SOLICITANTE NO puede ver audit logs', () => {
    expect(canAccessAuditLogs({ role: 'SOLICITANTE' })).toBe(false);
  });
});

describe('getTicketFilters — filtros WHERE de Prisma por rol', () => {
  test('SOLICITANTE: filtra por user_id propio', () => {
    const user = { id: 42, role: 'SOLICITANTE' };
    expect(getTicketFilters(user)).toEqual({ user_id: 42 });
  });

  test('TECNICO: filtra tickets asignados a él O sin asignar', () => {
    const user = { id: 7, role: 'TECNICO' };
    const filter = getTicketFilters(user);
    expect(filter).toHaveProperty('OR');
    expect(filter.OR).toContainEqual({ tech_id: 7 });
    expect(filter.OR).toContainEqual({ tech_id: null });
  });

  test('ADMINISTRADOR: filtro vacío (ve todo)', () => {
    expect(getTicketFilters({ id: 1, role: 'ADMINISTRADOR' })).toEqual({});
  });

  test('rol desconocido: filtro { id: -1 } (acceso denegado)', () => {
    expect(getTicketFilters({ id: 1, role: 'GHOST' })).toEqual({ id: -1 });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// SECCIÓN 5: SLA DEADLINES — cálculo por prioridad
// ═══════════════════════════════════════════════════════════════════════════════

describe('calculateSLADeadline — plazos por prioridad (monografía UCB)', () => {
  const TOLERANCIA_MS = 10_000; // ±10 segundos para evitar flakiness

  test.each([
    ['CRITICA',  2  * 3600 * 1000],
    ['ALTA',     8  * 3600 * 1000],
    ['MEDIA',    24 * 3600 * 1000],
    ['BAJA',     72 * 3600 * 1000],
    ['INVALIDA', 24 * 3600 * 1000], // fallback a MEDIA
  ])('prioridad %s → deadline ≈ ahora + %d ms', (priority, expectedMs) => {
    const before = Date.now();
    const deadline = calculateSLADeadline(priority);
    const after = Date.now();

    expect(deadline).toBeInstanceOf(Date);
    const diff = deadline.getTime() - before;
    expect(diff).toBeGreaterThanOrEqual(expectedMs - TOLERANCIA_MS);
    expect(diff).toBeLessThanOrEqual(expectedMs + TOLERANCIA_MS + (after - before));
  });
});

describe('getTimeRemaining — estado del SLA', () => {
  test('deadline pasado retorna { expired: true, text: "SLA vencido" }', () => {
    const pasado = new Date(Date.now() - 60_000); // 1 minuto en el pasado
    const result = getTimeRemaining(pasado);
    expect(result.expired).toBe(true);
    expect(result.text).toBe('SLA vencido');
  });

  test('deadline futuro retorna { expired: false, hours, minutes, text }', () => {
    const futuro = new Date(Date.now() + 2 * 3600 * 1000 + 30 * 60 * 1000); // 2h 30m
    const result = getTimeRemaining(futuro);
    expect(result.expired).toBe(false);
    expect(result.hours).toBe(2);
    expect(result.minutes).toBe(30);
    expect(result.text).toBe('2h 30m');
  });

  test('deadline justo ahora retorna expired: false con hours y minutes en 0', () => {
    const ahoraPlus = new Date(Date.now() + 500); // 500ms en el futuro
    const result = getTimeRemaining(ahoraPlus);
    expect(result.expired).toBe(false);
    expect(result.hours).toBe(0);
    expect(result.minutes).toBe(0);
  });
});
