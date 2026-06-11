// api/setup.js — One-time admin seeding
// Visit /api/setup once to create the admin account, then delete this file

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
  return data.result ? JSON.parse(data.result) : null;
}

module.exports = async function handler(req, res) {
  const secret = process.env.AUTH_SECRET;

  // Diagnostic — check env vars
  const diagnostics = {
    KV_URL: !!KV_URL ? 'SET' : 'MISSING',
    KV_TOKEN: !!KV_TOKEN ? 'SET' : 'MISSING',
    AUTH_SECRET: !!secret ? 'SET' : 'MISSING',
  };

  if (!KV_URL || !KV_TOKEN) {
    return res.status(500).send(`
      <h2>KV not connected</h2>
      <pre>${JSON.stringify(diagnostics, null, 2)}</pre>
      <p>Go to Vercel → Storage → connect your KV database to this project</p>
    `);
  }

  if (!secret) {
    return res.status(500).send(`
      <h2>AUTH_SECRET missing</h2>
      <pre>${JSON.stringify(diagnostics, null, 2)}</pre>
      <p>Add AUTH_SECRET to your Vercel environment variables</p>
    `);
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

    await kvSet('user:alan_c@dscsolutionsfm.com', adminUser);

    // Verify it was written
    const verify = await kvGet('user:alan_c@dscsolutionsfm.com');

    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head><title>FacilityIQ Setup</title>
      <style>
        body{font-family:sans-serif;background:#0C0D12;color:#E8EAF2;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
        .box{background:#181922;border:1px solid #252733;border-radius:12px;padding:32px;max-width:500px;width:100%}
        h2{color:#22C55E;margin-bottom:8px}p{color:#7B7F99;font-size:13px;margin-bottom:12px}
        .step{background:#252733;border-radius:8px;padding:12px 16px;font-size:13px;margin-bottom:8px}
        .step strong{color:#F59E0B}
        .env{background:#0C0D12;border:1px solid #252733;border-radius:6px;padding:10px;font-family:monospace;font-size:11px;margin-bottom:12px}
        .ok{color:#22C55E}.miss{color:#EF4444}
      </style>
      </head>
      <body>
      <div class="box">
        <h2>✓ Admin Account Created</h2>
        <p>Your FacilityIQ admin account has been seeded successfully.</p>
        <div class="env">
          ${Object.entries(diagnostics).map(([k,v])=>`<div class="${v==='SET'?'ok':'miss'}">${k}: ${v}</div>`).join('')}
          <div class="ok">User written: ${verify ? '✓' : '✗'}</div>
        </div>
        <div class="step"><strong>Email:</strong> alan_c@dscsolutionsfm.com</div>
        <div class="step"><strong>Password:</strong> FacilityIQ2025!</div>
        <div class="step"><strong>Next:</strong> <a href="/" style="color:#6B96FF">Go to FacilityIQ →</a></div>
        <p style="margin-top:16px;font-size:11px;color:#4E5270">Change your password via the Admin panel after logging in.</p>
      </div>
      </body>
      </html>
    `);
  } catch (err) {
    return res.status(500).send(`
      <h2>Error</h2>
      <pre style="color:#EF4444">${err.message}</pre>
      <pre>${JSON.stringify(diagnostics, null, 2)}</pre>
    `);
  }
}
