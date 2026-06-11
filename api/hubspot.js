// api/hubspot.js — FacilityIQ → HubSpot push proxy
// Handles all writes: tickets, notes, PM items, walkthrough, QR feedback, satisfaction

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
  if (!res.ok) throw new Error(data.message || 'HubSpot error: ' + JSON.stringify(data));
  return data;
}

// Find company ID by name
async function findCompanyId(name) {
  try {
    const res = await hsRequest('/crm/v3/objects/companies/search', 'POST', {
      filterGroups: [{ filters: [{ propertyName: 'name', operator: 'CONTAINS_TOKEN', value: name.split(' ')[0] }] }],
      properties: ['name'],
      limit: 5,
    });
    const match = res.results?.find(r => r.properties.name?.toLowerCase().includes(name.toLowerCase().split(' ')[0]));
    return match?.id || res.results?.[0]?.id || null;
  } catch(e) { return null; }
}

// Associate any object to a company
async function associate(type, objId, companyId, assocLabel) {
  try {
    await hsRequest(`/crm/v3/objects/${type}/${objId}/associations/companies/${companyId}/${assocLabel}`, 'PUT');
  } catch(e) { console.warn('Association failed:', e.message); }
}

// Stage name → HubSpot pipeline stage key for deficiencies pipeline
const STAGE_MAP = {
  'Open':             'new',
  'Acknowledged':     'acknowledged',
  'In Progress':      'in_progress',
  'Waiting on Client':'waiting_on_client',
  'Resolved':         'resolved',
};
const PRIORITY_MAP = { 'High': 'HIGH', 'Medium': 'MEDIUM', 'Low': 'LOW' };

// ── PUSH ACTIONS ──────────────────────────────────────────────────────────────

// Create a deficiency ticket
async function createTicket({ title, priority, status, accountName, source, ticketId }) {
  const ticket = await hsRequest('/crm/v3/objects/tickets', 'POST', {
    properties: {
      subject: `[FacilityIQ] ${title}`,
      content: `Source: ${source}\nFacilityIQ ID: ${ticketId}\nAccount: ${accountName}`,
      hs_pipeline: 'deficiencies',
      hs_pipeline_stage: STAGE_MAP[status] || 'new',
      hs_ticket_priority: PRIORITY_MAP[priority] || 'MEDIUM',
    },
  });
  if (accountName) {
    const cid = await findCompanyId(accountName);
    if (cid) await associate('tickets', ticket.id, cid, 'ticket_to_company');
  }
  return { success: true, hsTicketId: ticket.id };
}

// Update ticket stage
async function updateTicket({ hsTicketId, status }) {
  await hsRequest(`/crm/v3/objects/tickets/${hsTicketId}`, 'PATCH', {
    properties: { hs_pipeline_stage: STAGE_MAP[status] || 'new' },
  });
  return { success: true };
}

// Push PM item as a ticket in deficiencies pipeline
async function createPMTicket({ task, accountName, due, freq, pmId }) {
  const ticket = await hsRequest('/crm/v3/objects/tickets', 'POST', {
    properties: {
      subject: `[FacilityIQ PM] ${task}`,
      content: `Preventive Maintenance Item\nAccount: ${accountName}\nDue: ${due}\nFrequency: ${freq}\nFacilityIQ PM ID: ${pmId}`,
      hs_pipeline: 'deficiencies',
      hs_pipeline_stage: 'new',
      hs_ticket_priority: 'MEDIUM',
    },
  });
  if (accountName) {
    const cid = await findCompanyId(accountName);
    if (cid) await associate('tickets', ticket.id, cid, 'ticket_to_company');
  }
  return { success: true, hsTicketId: ticket.id };
}

// Log a note (activity) on a company
async function createNote({ accountName, noteBody }) {
  const note = await hsRequest('/crm/v3/objects/notes', 'POST', {
    properties: {
      hs_note_body: noteBody,
      hs_timestamp: new Date().toISOString(),
    },
  });
  if (accountName) {
    const cid = await findCompanyId(accountName);
    if (cid) await associate('notes', note.id, cid, 'note_to_company');
  }
  return { success: true, noteId: note.id };
}

// Push walkthrough results as a formatted note
async function pushWalkthrough({ accountName, scores, autoTickets, submittedBy }) {
  const date = new Date().toLocaleDateString();
  const total = Object.keys(scores).length;
  const avg = total ? (Object.values(scores).reduce((a,b)=>a+b,0)/total).toFixed(1) : 'N/A';
  const lowItems = Object.entries(scores).filter(([,v])=>v<=2).map(([k,v])=>`  • ${k.replace('::',' — ')}: ${v}/5`).join('\n');

  const noteBody = [
    `[FacilityIQ] Building Walkthrough — ${accountName}`,
    `Date: ${date}  |  Submitted by: ${submittedBy || 'Pod Manager'}`,
    `Areas Inspected: ${total}  |  Avg Score: ${avg}/5  |  Auto-Tickets Created: ${autoTickets}`,
    lowItems ? `\nIssues Found (score ≤ 2):\n${lowItems}` : '\nNo issues found.',
  ].join('\n');

  const result = await createNote({ accountName, noteBody });

  // Also create tickets for each auto-ticket item
  if (autoTickets > 0) {
    const lowEntries = Object.entries(scores).filter(([,v])=>v<=2);
    await Promise.all(lowEntries.map(([key, score]) => {
      const [area, item] = key.split('::');
      return createTicket({
        title: `Walkthrough: ${area} — ${item} scored ${score}/5`,
        priority: score === 1 ? 'High' : 'Medium',
        status: 'Open',
        accountName,
        source: 'Walkthrough',
        ticketId: 'WALK-' + Date.now(),
      });
    }));
  }

  return result;
}

// Push QR feedback as note, create ticket if negative
async function pushQRFeedback({ accountName, location, rating, comment, time }) {
  const noteBody = [
    `[FacilityIQ] QR Feedback — ${accountName}`,
    `Location: ${location}  |  Rating: ${'★'.repeat(rating)}${'☆'.repeat(5-rating)} (${rating}/5)`,
    `Time: ${time}`,
    `Comment: "${comment}"`,
    rating <= 2 ? '\n⚠ Negative feedback — auto-ticket created' : '',
  ].filter(Boolean).join('\n');

  const noteResult = await createNote({ accountName, noteBody });

  // Auto-ticket for negative feedback
  if (rating <= 2) {
    await createTicket({
      title: `QR Feedback: ${location} rated ${rating}/5 — "${comment.slice(0, 60)}"`,
      priority: rating === 1 ? 'High' : 'Medium',
      status: 'Open',
      accountName,
      source: 'QR Feedback',
      ticketId: 'QR-' + Date.now(),
    });
  }

  return noteResult;
}

// Push QA task completion as note
async function pushQAComplete({ accountName, task, completedBy }) {
  const noteBody = [
    `[FacilityIQ] QA Task Completed — ${accountName}`,
    `Task: ${task}`,
    `Completed by: ${completedBy || 'Pod Manager'}`,
    `Date: ${new Date().toLocaleDateString()}`,
  ].join('\n');
  return createNote({ accountName, noteBody });
}

// Push call-out as note
async function pushCallout({ accountName, workerName, workerRole, calloutCount, shift }) {
  const noteBody = [
    `[FacilityIQ] Call-Out Recorded — ${accountName}`,
    `Worker: ${workerName} (${workerRole})`,
    `Shift: ${shift}  |  Total Call-outs This Period: ${calloutCount}`,
    `Date: ${new Date().toLocaleDateString()}`,
    calloutCount >= 5 ? '⚠ HR Review threshold reached (5+)' :
    calloutCount >= 3 ? '⚠ Verbal coaching threshold reached (3+)' : '',
  ].filter(Boolean).join('\n');
  return createNote({ accountName, noteBody });
}

// Push coverage request as note
async function pushCoverageRequest({ accountName, requestedWorkers, shift }) {
  const noteBody = [
    `[FacilityIQ] Coverage Request — ${accountName}`,
    `Shift: ${shift}`,
    `Contacted: ${requestedWorkers.join(', ')}`,
    `Requested: ${new Date().toLocaleString()}`,
  ].join('\n');
  return createNote({ accountName, noteBody });
}

// Push QR zone creation as note
async function pushQRZone({ accountName, zoneName }) {
  const noteBody = [
    `[FacilityIQ] QR Zone Created — ${accountName}`,
    `Zone: ${zoneName}`,
    `Created: ${new Date().toLocaleDateString()}`,
  ].join('\n');
  return createNote({ accountName, noteBody });
}

// Update satisfaction score on company record
async function updateSatisfaction({ accountName, score }) {
  const cid = await findCompanyId(accountName);
  if (!cid) return { success: false, error: 'Company not found' };
  await hsRequest(`/crm/v3/objects/companies/${cid}`, 'PATCH', {
    properties: { account_health: String(score) },
  });
  return { success: true };
}

// ── HANDLER ───────────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.HUBSPOT_REFRESH_TOKEN) {
    return res.status(500).json({
      error: 'Not authorized yet.',
      authUrl: 'https://project-90gmq.vercel.app/api/hubspot-auth'
    });
  }

  try {
    const { action, ...payload } = req.body;
    switch (action) {
      case 'create_ticket':        return res.json(await createTicket(payload));
      case 'update_ticket':        return res.json(await updateTicket(payload));
      case 'create_pm_ticket':     return res.json(await createPMTicket(payload));
      case 'create_note':          return res.json(await createNote(payload));
      case 'push_walkthrough':     return res.json(await pushWalkthrough(payload));
      case 'push_qr_feedback':     return res.json(await pushQRFeedback(payload));
      case 'push_qa_complete':     return res.json(await pushQAComplete(payload));
      case 'push_callout':         return res.json(await pushCallout(payload));
      case 'push_coverage_request':return res.json(await pushCoverageRequest(payload));
      case 'push_qr_zone':         return res.json(await pushQRZone(payload));
      case 'update_satisfaction':  return res.json(await updateSatisfaction(payload));
      default: return res.status(400).json({ error: 'Unknown action: ' + action });
    }
  } catch (err) {
    console.error('HubSpot push error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
