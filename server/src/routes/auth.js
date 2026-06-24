const { Router } = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const db = require('../config/database');
const { supabaseAdmin } = require('../config/supabase');
const { jwtSecret, jwtExpiresIn } = require('../config/auth');
const { loginRules, registerRules } = require('../validators');
const { authenticate } = require('../middleware/auth');

const router = Router();

/**
 * POST /api/auth/login
 * Autentica un usuario y devuelve un token JWT.
 * Soporta tanto login local como via Supabase Auth.
 */
router.post('/login', loginRules, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Buscar usuario en nuestra tabla
    const { data: users, error } = await db
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    const user = users?.[0];

    if (!user || error) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Si el usuario tiene password_hash, validar con bcrypt (login local)
    if (user.password_hash) {
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
    } else {
      // Usuario creado via Supabase Auth — validar contra Supabase
      const { data: signInData, error: signInError } =
        await supabaseAdmin.auth.signInWithPassword({ email, password });

      if (signInError) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/register
 * Crea un nuevo usuario local.
 */
router.post('/register', registerRules, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role } = req.body;

    // Verificar si el email ya existe
    const { data: existing } = await db
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1);

    if (existing?.length) {
      return res.status(409).json({ error: 'Este email ya está registrado' });
    }

    const userRole = role || 'asistente';
    if (userRole === 'admin') {
      return res.status(403).json({ error: 'No puedes asignar rol admin directamente' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const { data: users, error } = await db
      .from('users')
      .insert({
        name,
        email,
        password_hash,
        role: userRole,
      })
      .select('id, name, email, role, created_at');

    if (error) throw error;
    const user = users?.[0];

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      jwtSecret,
      { expiresIn: jwtExpiresIn }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Devuelve el perfil del usuario autenticado.
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { data: users, error } = await db
      .from('users')
      .select('id, name, email, role, created_at, updated_at')
      .eq('id', req.user.id)
      .limit(1);

    const user = users?.[0];
    if (!user || error) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/auth/me
 * Actualiza el perfil del usuario autenticado.
 */
router.put('/me', authenticate, async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    const { data: users, error } = await db
      .from('users')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', req.user.id)
      .select('id, name, email, role, created_at, updated_at');

    if (error) throw error;
    res.json(users?.[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
