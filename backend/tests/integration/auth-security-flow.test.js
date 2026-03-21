/**
 * AUTH SECURITY FLOW — Test de integración completo
 *
 * Cubre los siguientes flujos encadenados:
 *   1. Registro con validación de política de contraseñas
 *   2. Login y bloqueo progresivo de cuenta (5 intentos → bloqueado)
 *   3. Cambio de contraseña + historial (no reutilizar)
 *   4. Ataques JWT (payload manipulado, firma inválida, sin header)
 *   5. Refresh token flow
 *
 * Requiere PostgreSQL corriendo con DATABASE_URL en las variables de entorno.
 * En CI usa el service container de GitHub Actions.
 */

const request = require('supertest');
const app = require('../../server');
const prisma = require('../../config/database');
const { generateToken, generateRefreshToken } = require('../../middleware/auth');

// Sufijo único para que varios runs de CI no colisionen
const SUFFIX = `${Date.now()}`;
const TEST_EMAIL = `flow.test.${SUFFIX}@test.tf`;
const TEST_PASSWORD = 'Admin@FlowTest2024!';
const TEST_NAME = 'Test Flow User';

let testUserId = null;
let validToken = null;
let validRefreshToken = null;

// ─── Limpieza ────────────────────────────────────────────────────────────────

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { user_id: testUserId } }).catch(() => {});
  await prisma.user.deleteMany({ where: { email: { endsWith: '@test.tf' } } }).catch(() => {});
  // No llamar $disconnect() aquí: el singleton de Prisma es compartido entre archivos de test
  // Jest cerrará el proceso con --forceExit
});

// ═══════════════════════════════════════════════════════════════════════════════
// ESCENARIO 1: Registro con política de contraseñas
// ═══════════════════════════════════════════════════════════════════════════════

describe('Escenario 1 — Registro y política de contraseñas', () => {
  test('400 cuando faltan campos obligatorios (name, email, password)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('400 con errors[] cuando password tiene solo 3 chars (falla 4 reglas)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: `short.${SUFFIX}@test.tf`, password: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.length).toBeGreaterThanOrEqual(4);
  });

  test('400 cuando password cumple longitud pero no caracteres especiales', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: `nospec.${SUFFIX}@test.tf`, password: 'NoSpecialChar1234A' });
    expect(res.status).toBe(400);
    expect(res.body.errors.some(e => e.toLowerCase().includes('especial'))).toBe(true);
  });

  test('201 con datos de usuario válidos — password NO incluido en respuesta', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: TEST_NAME, email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(TEST_EMAIL);
    expect(res.body.user.role).toBe('SOLICITANTE');
    // NUNCA debe retornar el hash de contraseña
    expect(res.body.user.password).toBeUndefined();
    testUserId = res.body.user.id;
  });

  test('409 cuando se intenta registrar el mismo email dos veces', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: TEST_NAME, email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(res.status).toBe(409);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ESCENARIO 2: Login y bloqueo progresivo de cuenta
// ═══════════════════════════════════════════════════════════════════════════════

describe('Escenario 2 — Login y bloqueo de cuenta', () => {
  test('200: credenciales correctas → token, refreshToken, user sin password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    expect(res.body.user.password).toBeUndefined();
    // Guardar para tests posteriores
    validToken = res.body.token;
    validRefreshToken = res.body.refreshToken;
  });

  test('400 cuando faltan email o password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL });
    expect(res.status).toBe(400);
  });

  test('401 para email que no existe en el sistema', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nadie@test.tf', password: 'cualquier_cosa' });
    expect(res.status).toBe(401);
    // El mensaje no debe revelar si el email existe o no
    expect(res.body.message).toMatch(/email o contraseña/i);
  });

  test('401 × 4 intentos con password incorrecta (sin bloquear aún)', async () => {
    for (let i = 0; i < 4; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: 'WrongPass@2024!' });
      expect(res.status).toBe(401);
    }
    // La cuenta aún no debe estar bloqueada
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    expect(user.login_attempts).toBe(4);
    expect(user.lock_until).toBeNull();
  });

  test('5to intento fallido → cuenta bloqueada (lock_until seteado)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: 'WrongPass@2024!' });
    expect(res.status).toBe(401);

    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    expect(user.login_attempts).toBe(5);
    expect(user.lock_until).not.toBeNull();
    expect(user.lock_until.getTime()).toBeGreaterThan(Date.now());
  });

  test('403 cuando se intenta login correcto con cuenta bloqueada', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/bloqueada/i);
  });

  test('Desbloquear la cuenta manualmente para continuar los siguientes tests', async () => {
    // Reset manual para que los siguientes escenarios puedan funcionar
    await prisma.user.update({
      where: { email: TEST_EMAIL },
      data: { login_attempts: 0, lock_until: null }
    });
    const user = await prisma.user.findUnique({ where: { email: TEST_EMAIL } });
    expect(user.lock_until).toBeNull();

    // Re-login para obtener token fresco
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(res.status).toBe(200);
    validToken = res.body.token;
    validRefreshToken = res.body.refreshToken;
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ESCENARIO 3: Cambio de contraseña + historial
// ═══════════════════════════════════════════════════════════════════════════════

describe('Escenario 3 — Cambio de contraseña y política de historial', () => {
  const NEW_PASSWORD = 'NewAdmin@Secure2025!';

  test('401 al intentar cambiar contraseña sin token de autenticación', async () => {
    const res = await request(app)
      .patch('/api/auth/change-password')
      .send({ currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD });
    expect(res.status).toBe(401);
  });

  test('401 cuando currentPassword es incorrecta', async () => {
    const res = await request(app)
      .patch('/api/auth/change-password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ currentPassword: 'WrongCurrent@2024!', newPassword: NEW_PASSWORD });
    expect(res.status).toBe(401);
  });

  test('400 cuando nueva contraseña no cumple política', async () => {
    const res = await request(app)
      .patch('/api/auth/change-password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'weak' });
    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
  });

  test('200: cambio exitoso con contraseña válida', async () => {
    const res = await request(app)
      .patch('/api/auth/change-password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ currentPassword: TEST_PASSWORD, newPassword: NEW_PASSWORD });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('login con contraseña NUEVA funciona correctamente', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: NEW_PASSWORD });
    expect(res.status).toBe(200);
    validToken = res.body.token;
    validRefreshToken = res.body.refreshToken;
  });

  test('login con contraseña ANTERIOR ya NO funciona (401)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
    expect(res.status).toBe(401);
  });

  test('400 al intentar reusar la misma contraseña (historial)', async () => {
    const res = await request(app)
      .patch('/api/auth/change-password')
      .set('Authorization', `Bearer ${validToken}`)
      .send({ currentPassword: NEW_PASSWORD, newPassword: NEW_PASSWORD });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/reutilizar/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ESCENARIO 4: JWT attacks — manipulación y tokens inválidos
// ═══════════════════════════════════════════════════════════════════════════════

describe('Escenario 4 — Seguridad JWT y ataques de token', () => {
  test('200: GET /profile con token válido — password NUNCA retornada', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${validToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.password).toBeUndefined();
    expect(res.body.user.id).toBe(testUserId);
  });

  test('401 cuando no hay header Authorization', async () => {
    const res = await request(app)
      .get('/api/auth/profile');
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/no proporcionado/i);
  });

  test('403 con token que tiene firma inválida (key incorrecta)', async () => {
    const jwt = require('jsonwebtoken');
    const tamperedToken = jwt.sign(
      { userId: testUserId, name: 'Hacker', role: 'ADMINISTRADOR' },
      'wrong-secret-key-to-test-signature-validation'
    );
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${tamperedToken}`);
    expect(res.status).toBe(403);
  });

  test('403 con token cuyo payload fue manipulado (base64 decode/encode)', async () => {
    // Separar el token en 3 partes y modificar el payload
    const parts = validToken.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    payload.role = 'ADMINISTRADOR'; // escalada de privilegios
    parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const manipulatedToken = parts.join('.');

    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', `Bearer ${manipulatedToken}`);
    // La firma es inválida → rechaza
    expect(res.status).toBe(403);
  });

  test('403 con token malformado (no es un JWT)', async () => {
    const res = await request(app)
      .get('/api/auth/profile')
      .set('Authorization', 'Bearer esto.no.es.un.jwt.valido');
    expect(res.status).toBe(403);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// ESCENARIO 5: Refresh token
// ═══════════════════════════════════════════════════════════════════════════════

describe('Escenario 5 — Refresh token flow', () => {
  test('200: refresh con refreshToken válido → nuevo token y refreshToken', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: validRefreshToken });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.refreshToken).toBeDefined();
    // Los nuevos tokens deben ser strings JWT válidos
    expect(res.body.token.split('.')).toHaveLength(3);
    expect(res.body.refreshToken.split('.')).toHaveLength(3);
  });

  test('401 cuando no se envía refreshToken', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({});
    expect(res.status).toBe(401);
  });

  test('403 con refreshToken inválido o manipulado', async () => {
    const res = await request(app)
      .post('/api/auth/refresh')
      .send({ refreshToken: 'token.invalido.firmado' });
    expect(res.status).toBe(403);
  });
});
