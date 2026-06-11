// api/debug-auth.js — TEMPORARY, delete after login works
const { createHash } = require('crypto');

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

module.exports = async function handler(req, res) {
  try {
    // Read the stored user
    const getRes = await fetch(`${KV_URL}/get/${encodeURIComponent('user:alan_c@dscsolutionsfm.com')}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    });
    const getData = await getRes.json();
    const user = getData.result ? JSON.parse(getData.result) : null;

    // Compute what the hash should be
    const testHash = createHash('sha256')
      .update('FacilityIQ2025!' + process.env.AUTH_SECRET)
      .digest('hex');

    return res.status(200).json({
      userFound: !!user,
      storedHash: user?.passwordHash?.slice(0, 16) + '...',
      computedHash: testHash.slice(0, 16) + '...',
      hashMatch: user?.passwordHash === testHash,
      userEmail: user?.email,
      userName: user?.name,
      userRole: user?.role,
      userPod: user?.pod,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
