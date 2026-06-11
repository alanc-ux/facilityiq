const { createHash } = require('crypto');

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

// Upstash REST API — correct format
async function kvSet(key, value) {
  // Upstash expects the value as a JSON string in the body array
  const res = await fetch(`${KV_URL}/set/${encodeURIComponent(key)}/${encodeURIComponent(JSON.stringify(value))}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${KV_TOKEN}` },
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
  if (!KV_URL || !KV_TOKEN || !secret) {
    return res.status(500).json({ error: 'Missing env vars' });
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

    const setResult = await kvSet('user:alan_c@dscsolutionsfm.com', adminUser);
    const verify = await kvGet('user:alan_c@dscsolutionsfm.com');

    return res.status(200).json({
      setResult,
      verify,
      hasHash: !!verify?.passwordHash,
      match: verify?.passwordHash === passwordHash,
      computedHash: passwordHash.slice(0,16) + '...',
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
