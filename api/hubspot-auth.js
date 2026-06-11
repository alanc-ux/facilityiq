// api/hubspot-auth.js
// Handles the one-time OAuth authorization flow
// Visit /api/hubspot-auth to start, /api/hubspot-auth/callback is the redirect

const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
const REDIRECT_URI = 'https://project-90gmq.vercel.app/api/hubspot-auth/callback';
const SCOPES = [
  'crm.objects.companies.read',
  'crm.objects.tickets.read',
  'crm.objects.tickets.write',
  'crm.objects.notes.read',
  'crm.objects.notes.write',
].join(' ');

export default async function handler(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const isCallback = url.pathname.endsWith('/callback');

  // ── STEP 1: Redirect to HubSpot authorization page ──────────────────────────
  if (!isCallback) {
    const authUrl = new URL('https://app.hubspot.com/oauth/authorize');
    authUrl.searchParams.set('client_id', CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('scope', SCOPES);
    return res.redirect(302, authUrl.toString());
  }

  // ── STEP 2: Exchange code for tokens ────────────────────────────────────────
  const code = url.searchParams.get('code');
  if (!code) {
    return res.status(400).send('Missing authorization code from HubSpot');
  }

  try {
    const tokenRes = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        redirect_uri: REDIRECT_URI,
        code,
      }),
    });

    const tokens = await tokenRes.json();

    if (!tokenRes.ok) {
      return res.status(500).send(`
        <h2>Token exchange failed</h2>
        <pre>${JSON.stringify(tokens, null, 2)}</pre>
      `);
    }

    // Show the refresh token — copy this into Vercel env vars as HUBSPOT_REFRESH_TOKEN
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head><title>FacilityIQ — HubSpot Connected</title>
      <style>
        body{font-family:sans-serif;background:#0C0D12;color:#E8EAF2;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
        .box{background:#181922;border:1px solid #252733;border-radius:12px;padding:32px;max-width:560px;width:100%}
        h2{color:#22C55E;margin-bottom:8px}
        p{color:#7B7F99;font-size:13px;margin-bottom:16px}
        .token{background:#0C0D12;border:1px solid #252733;border-radius:8px;padding:12px;font-family:monospace;font-size:12px;word-break:break-all;color:#6B96FF;margin-bottom:16px}
        .step{background:#252733;border-radius:8px;padding:12px 16px;font-size:13px;margin-bottom:8px}
        .step strong{color:#F59E0B}
      </style>
      </head>
      <body>
      <div class="box">
        <h2>✓ HubSpot Connected</h2>
        <p>Authorization successful. Copy the refresh token below and add it to your Vercel environment variables.</p>
        <div class="token">${tokens.refresh_token}</div>
        <div class="step"><strong>Step 1:</strong> Copy the token above</div>
        <div class="step"><strong>Step 2:</strong> Go to Vercel → Your Project → Settings → Environment Variables</div>
        <div class="step"><strong>Step 3:</strong> Add variable: <code>HUBSPOT_REFRESH_TOKEN</code> = the token above</div>
        <div class="step"><strong>Step 4:</strong> Redeploy — FacilityIQ is now syncing to HubSpot</div>
      </div>
      </body>
      </html>
    `);
  } catch (err) {
    return res.status(500).send(`Auth error: ${err.message}`);
  }
}
