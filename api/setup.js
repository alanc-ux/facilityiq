const { createHash } = require('crypto');

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvSet(key, value) {
  const res = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KV_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(JSON.stringify(value)),
  });
  return res.json();
}

async function kvGet(key) {
  const res = await fetch(`${KV_URL}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
  });
  const data = await res.json();
  if (!data.result) return null;
  try { return JSON.parse(data.result); } catch(e) { return data.result; }
}

module.exports = async function handler(req, res) {
  const secret = process.env.AUTH_SECRET;

  const diagnostics = {
    KV_URL: !!KV_URL ? 'SET' : 'MISSING',
    KV_TOKEN: !!KV_TOKEN ? 'SET' : 'MISSING',
    AUTH_SECRET: !!secret ? 'SET (' + secret.slice(0,4) + '...)' : 'MISSING',
  };

  if (!KV_URL || !KV_TOKEN || !secret) {
    return res.status(500).json({ error: 'Missing env vars', diagnostics });
  }

  try {
    const passwordHash = createHash('sha256')
      .update('FacilityIQ2025!' + secret)
      .digest('hex');

    const adminUser = {
      email: 'alan_c@dscsolutionsfm.com',
      name: 'Alan K.',
      role: 'admin',
      pod: 'Strategic Accounts',
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    // Force overwrite
    await kvSet('user:alan_c@dscsolutionsfm.com', adminUser);

    // Read back to verify
    const verify = await kvGet('user:alan_c@dscsolutionsfm.com');

    return res.status(200).json({
      success: true,
      diagnostics,
      written: {
        email: verify?.email,
        hasPasswordHash: !!verify?.passwordHash,
        hashPreview: verify?.passwordHash?.slice(0, 16) + '...',
        computedHashPreview: passwordHash.slice(0, 16) + '...',
        match: verify?.passwordHash === passwordHash,
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message, diagnostics });
  }
};
