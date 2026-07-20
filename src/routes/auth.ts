/**
 * Authentication Routes
 * Login, Register, Session management
 */

import { Hono } from 'hono';
import { generateId } from '../db/helpers';
import type { Env } from '../db/helpers';

export const authRoute = new Hono<{ Bindings: Env }>();

// Simple password hashing (in production, use bcrypt or similar)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + 'plant-shop-salt-2024');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const newHash = await hashPassword(password);
  return newHash === hash;
}

// POST /api/auth/register
authRoute.post('/register', async (c) => {
  try {
    const { username, password, store_name, phone } = await c.req.json();

    if (!username || !password) {
      return c.json({ success: false, error: 'Username and password required' }, 400);
    }

    // Check if user exists
    const existing = await c.env.DB
      .prepare('SELECT id FROM users WHERE username = ?')
      .bind(username)
      .first();

    if (existing) {
      return c.json({ success: false, error: 'Username already exists' }, 400);
    }

    const password_hash = await hashPassword(password);
    const user_id = generateId('user');

    // Create user
    await c.env.DB
      .prepare(`
        INSERT INTO users (id, username, password_hash, store_name, phone, created_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
      `)
      .bind(user_id, username, password_hash, store_name || 'Cửa hàng cây cảnh', phone || '')
      .run();

    // Create session
    const session_id = generateId('sess');
    await c.env.DB
      .prepare(`
        INSERT INTO sessions (id, user_id, created_at, expires_at)
        VALUES (?, ?, datetime('now'), datetime('now', '+30 days'))
      `)
      .bind(session_id, user_id)
      .run();

    return c.json({
      success: true,
      data: {
        user: { id: user_id, username, store_name, phone },
        session_id
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    return c.json({ success: false, error: 'Registration failed' }, 500);
  }
});

// POST /api/auth/login
authRoute.post('/login', async (c) => {
  try {
    const { username, password } = await c.req.json();

    if (!username || !password) {
      return c.json({ success: false, error: 'Username and password required' }, 400);
    }

    // Find user
    const user = await c.env.DB
      .prepare('SELECT * FROM users WHERE username = ?')
      .bind(username)
      .first();

    if (!user) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      return c.json({ success: false, error: 'Invalid credentials' }, 401);
    }

    // Create session
    const session_id = generateId('sess');
    await c.env.DB
      .prepare(`
        INSERT INTO sessions (id, user_id, created_at, expires_at)
        VALUES (?, ?, datetime('now'), datetime('now', '+30 days'))
      `)
      .bind(session_id, user.id)
      .run();

    return c.json({
      success: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          store_name: user.store_name,
          phone: user.phone
        },
        session_id
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ success: false, error: 'Login failed' }, 500);
  }
});

// POST /api/auth/logout
authRoute.post('/logout', async (c) => {
  const session_id = c.req.header('X-Session-ID');

  if (session_id) {
    await c.env.DB
      .prepare('DELETE FROM sessions WHERE id = ?')
      .bind(session_id)
      .run();
  }

  return c.json({ success: true });
});

// GET /api/auth/me - Get current user
authRoute.get('/me', async (c) => {
  const session_id = c.req.header('X-Session-ID');

  if (!session_id) {
    return c.json({ success: false, error: 'Not authenticated' }, 401);
  }

  const session = await c.env.DB
    .prepare(`
      SELECT s.*, u.username, u.store_name, u.phone
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = ? AND s.expires_at > datetime('now')
    `)
    .bind(session_id)
    .first();

  if (!session) {
    return c.json({ success: false, error: 'Session expired' }, 401);
  }

  return c.json({
    success: true,
    data: {
      id: session.user_id,
      username: session.username,
      store_name: session.store_name,
      phone: session.phone
    }
  });
});
