const POD_INTERNAL = {
  'Strategic Accounts':        'true',
  'Route/Low Touch':           'false',
  'Multi-Family/Multi-Tenant': 'Multi-Family/Multi-Tenant',
  'Grounds & Exterior':        'Grounds & Exterior',
  'Launch and Recovery':       'Launch and Recovery',
};

// api/hubspot-accounts.js
// Pulls companies, tickets, and workers from HubSpot for FacilityIQ
// Only returns name + address for companies, no personal contact data except workers

const CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
const HS_BASE = 'https://api.hubapi.com';

let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry - 60000) return cachedToken;
  const refreshToken = process.env.HUBSPOT_REFRESH_TOKEN;
  if (!refreshToken) throw new Error('HUBSPOT_REFRESH_TOKEN not set');
  const res = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error('Token refresh failed: ' + JSON.stringify(data));
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);
  return cachedToken;
}

async function hsRequest(path, method = 'GET', body = null) {
  const token = await getAccessToken();
  const opts = {
    method,
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${HS_BASE}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'HubSpot error');
  return data;
}

// Pull companies where pod = Pod 3, return name + address only
async function fetchAccounts(podValue) {
  const res = await hsRequest('/crm/v3/objects/companies/search', 'POST', {
    filterGroups: [{
      filters: [{
        propertyName: 'pod',
        operator: 'EQ',
        value: POD_INTERNAL[podValue] || podValue,
      }]
    }],
    properties: ['name', 'address', 'city', 'state', 'hs_object_id', 'account_health'],
    limit: 100,
  });

  return (res.results || []).map(c => ({
    hsId: c.id,
    name: c.properties.name || '',
    addr: [c.properties.address, c.properties.city, c.properties.state].filter(Boolean).join(', '),
    score: parseFloat(c.properties.account_health) || 0,
  }));
}

// Pull open/in-progress tickets from the deficiencies pipeline
async function fetchTickets() {
  // Stage IDs for deficiencies pipeline — new, acknowledged, in progress, waiting on client
  // We pull everything except resolved
  const res = await hsRequest('/crm/v3/objects/tickets/search', 'POST', {
    filterGroups: [{
      filters: [{
        propertyName: 'hs_pipeline',
        operator: 'EQ',
        value: 'deficiencies', // HubSpot uses pipeline internal name
      }]
    }],
    properties: [
      'subject', 'content', 'hs_pipeline_stage', 'hs_ticket_priority',
      'hs_object_id', 'createdate', 'hubspot_owner_id'
    ],
    limit: 100,
  });

  // Map HubSpot stage names → FacilityIQ status
  const stageMap = {
    'new': 'Open',
    'acknowledged': 'Open',
    'in_progress': 'In Progress',
    'waiting_on_client': 'In Progress',
    'resolved': 'Resolved',
  };

  const tickets = res.results || [];

  // For each ticket, fetch associated company
  const enriched = await Promise.all(tickets.map(async t => {
    let acctHsId = null;
    try {
      const assoc = await hsRequest(`/crm/v3/objects/tickets/${t.id}/associations/companies`);
      acctHsId = assoc.results?.[0]?.id || null;
    } catch(e) { /* no association */ }

    const stageName = t.properties.hs_pipeline_stage || 'new';
    return {
      hsId: t.id,
      title: t.properties.subject?.replace('[FacilityIQ] ', '') || 'Untitled',
      priority: t.properties.hs_ticket_priority === 'HIGH' ? 'High'
              : t.properties.hs_ticket_priority === 'MEDIUM' ? 'Medium' : 'Low',
      status: stageMap[stageName] || 'Open',
      acctHsId,
      created: t.properties.createdate
        ? new Date(t.properties.createdate).toLocaleDateString()
        : '',
      source: 'HubSpot',
      hubspot: true,
      comments: [],
    };
  }));

  return enriched;
}

// Pull contacts where contact_type = Employee, associated to pod companies
async function fetchWorkers(accountHsIds) {
  if (!accountHsIds.length) return [];

  const res = await hsRequest('/crm/v3/objects/contacts/search', 'POST', {
    filterGroups: [{
      filters: [{
        propertyName: 'contact_type',
        operator: 'EQ',
        value: 'Employee',
      }]
    }],
    properties: ['firstname', 'lastname', 'jobtitle', 'hs_object_id'],
    limit: 100,
  });

  const contacts = res.results || [];

  // For each contact fetch their associated company
  const enriched = await Promise.all(contacts.map(async c => {
    let acctHsId = null;
    try {
      const assoc = await hsRequest(`/crm/v3/objects/contacts/${c.id}/associations/companies`);
      acctHsId = assoc.results?.[0]?.id || null;
    } catch(e) { /* no association */ }

    // Only include if associated to one of our pod companies
    if (!acctHsId || !accountHsIds.includes(acctHsId)) return null;

    const name = [c.properties.firstname, c.properties.lastname].filter(Boolean).join(' ');
    return {
      hsId: c.id,
      name: name || 'Unknown',
      role: c.properties.jobtitle || 'Staff',
      acctHsId,
      status: 'On Site', // Default — FacilityIQ manages live status locally
      shift: '',
      callouts: 0,
      bench: false,
      trained: [acctHsId],
    };
  }));

  return enriched.filter(Boolean);
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!process.env.HUBSPOT_REFRESH_TOKEN) {
    return res.status(500).json({
      error: 'Not authorized. Visit /api/hubspot-auth first.',
      authUrl: 'https://project-90gmq.vercel.app/api/hubspot-auth'
    });
  }

  const podValue = req.query.pod || 'Pod 3';

  try {
    // Pull accounts first
    const accounts = await fetchAccounts(podValue);
    const accountHsIds = accounts.map(a => a.hsId);

    // Pull tickets and workers in parallel
    const [tickets, workers] = await Promise.all([
      fetchTickets(),
      fetchWorkers(accountHsIds),
    ]);

    // Map ticket acctHsId → account index for FacilityIQ
    const hsIdToAcct = {};
    accounts.forEach((a, i) => { hsIdToAcct[a.hsId] = i + 1; });

    const mappedTickets = tickets.map((t, i) => ({
      ...t,
      id: 'TKT-' + (1000 + i),
      acct: hsIdToAcct[t.acctHsId] || 1,
    }));

    const mappedWorkers = workers.map((w, i) => ({
      ...w,
      id: i + 1,
      site: hsIdToAcct[w.acctHsId] || null,
      color: ['#4F7EFF','#22C55E','#A78BFA','#F59E0B','#22D3EE','#F472B6','#EF4444'][i % 7],
    }));

    const mappedAccounts = accounts.map((a, i) => ({
      ...a,
      id: i + 1,
      tier: 'Active',
      status: 'Active',
      pod: podValue,
      industry: 'General',
      workers: mappedWorkers.filter(w => w.site === i + 1).map(w => w.id),
      areas: [],
    }));

    return res.status(200).json({
      accounts: mappedAccounts,
      tickets: mappedTickets,
      workers: mappedWorkers,
      pulledAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error('HubSpot fetch error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
