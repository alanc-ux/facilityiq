// api/auth.js — FacilityIQ Authentication
import { createHash, randomBytes } from 'crypto';

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

// ── KV HELPERS — exact same pattern as setup.js ───────────────────────────────
async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  const data = await res.json();
  if (!data.result) return null;
  try { return JSON.parse(data.result); } catch(e) { return data.result; }
}

async function kvSet(key, value, exSeconds = null) {
  const url = exSeconds
    ? `${KV_URL}/set/${encodeURIComponent(key)}?EX=${exSeconds}`
    : `${KV_URL}/set/${encodeURIComponent(key)}`;
  await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(JSON.stringify(value)),
  });
}

async function kvDel(key) {
  await fetch(`${KV_URL}/del/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
}

async function kvKeys(pattern) {
  const res = await fetch(`${KV_URL}/keys/${encodeURIComponent(pattern)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  const data = await res.json();
  return data.result || [];
}

// ── CRYPTO — exact same as setup.js ──────────────────────────────────────────
function hashPassword(password) {
  return createHash('sha256')
    .update(password + process.env.AUTH_SECRET)
    .digest('hex');
}

function generateToken() {
  return randomBytes(32).toString('hex');
}

// ── ACTIONS ───────────────────────────────────────────────────────────────────
async function login({ email, password }) {
  if (!email || !password) return { success: false, error: 'Email and password required' };

  const user = await kvGet('user:' + email.toLowerCase().trim());

  if (!user) return { success: false, error: 'Invalid email or password' };

  const hash = hashPassword(password);
  if (hash !== user.passwordHash) {
    return { success: false, error: 'Invalid email or password' };
  }

  const token = generateToken();
  await kvSet('session:' + token, {
    email: user.email,
    name: user.name,
    role: user.role,
    pod: user.pod,
  }, 60 * 60 * 8);

  return {
    success: true,
    token,
    user: { email: user.email, name: user.name, role: user.role, pod: user.pod },
  };
}

async function logout({ token }) {
  if (token) await kvDel('session:' + token);
  return { success: true };
}

async function validateSession({ token }) {
  if (!token) return { success: false, error: 'No token' };
  const session = await kvGet('session:' + token);
  if (!session) return { success: false, error: 'Session expired' };
  return { success: true, user: session };
}

async function listUsers({ token }) {
  const session = await kvGet('session:' + token);
  if (!session || session.role !== 'admin') return { success: false, error: 'Unauthorized' };
  const keys = await kvKeys('user:*');
  const users = await Promise.all(keys.map(k => kvGet(k)));
  return {
    success: true,
    users: users.filter(Boolean).map(u => ({
      email: u.email, name: u.name, role: u.role, pod: u.pod, createdAt: u.createdAt,
    })),
  };
}

async function createUser({ token, email, name, role, pod, password }) {
  const session = await kvGet('session:' + token);
  if (!session || session.role !== 'admin') return { success: false, error: 'Unauthorized' };
  const existing = await kvGet('user:' + email.toLowerCase().trim());
  if (existing) return { success: false, error: 'User already exists' };
  await kvSet('user:' + email.toLowerCase().trim(), {
    email: email.toLowerCase().trim(),
    name,
    role: role || 'pod_manager',
    pod,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  });
  return { success: true };
}

async function updateUser({ token, email, name, role, pod, password }) {
  const session = await kvGet('session:' + token);
  if (!session || session.role !== 'admin') return { success: false, error: 'Unauthorized' };
  const user = await kvGet('user:' + email.toLowerCase().trim());
  if (!user) return { success: false, error: 'User not found' };
  const updated = { ...user, name: name || user.name, role: role || user.role, pod: pod || user.pod };
  if (password) updated.passwordHash = hashPassword(password);
  await kvSet('user:' + email.toLowerCase().trim(), updated);
  return { success: true };
}

async function deleteUser({ token, email }) {
  const session = await kvGet('session:' + token);
  if (!session || session.role !== 'admin') return { success: false, error: 'Unauthorized' };
  if (email.toLowerCase() === 'alan_c@dscsolutionsfm.com') return { success: false, error: 'Cannot delete admin' };
  await kvDel('user:' + email.toLowerCase().trim());
  return { success: true };
}

// ── HANDLER ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { action, ...payload } = req.body;
    switch (action) {
      case 'login':            return res.json(await login(payload));
      case 'logout':           return res.json(await logout(payload));
      case 'validate_session': return res.json(await validateSession(payload));
      case 'list_users':       return res.json(await listUsers(payload));
      case 'create_user':      return res.json(await createUser(payload));
      case 'update_user':      return res.json(await updateUser(payload));
      case 'delete_user':      return res.json(await deleteUser(payload));
      default: return res.status(400).json({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
