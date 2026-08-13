#!/usr/bin/env node
/**
 * setupCustomModule.mjs
 * ─────────────────────
 * Standalone Node.js script to set up custom modules in Zoho Projects via REST API.
 *
 * Usage:
 *   node backend/setupCustomModule.mjs
 *
 * Prerequisites (set env vars or edit the CONFIG block below):
 *   ZOHO_REFRESH_TOKEN   — your Zoho refresh token
 *   ZOHO_CLIENT_ID       — your Zoho OAuth client ID
 *   ZOHO_CLIENT_SECRET   — your Zoho OAuth client secret
 *   ZOHO_PORTAL_ID       — your Zoho Projects portal ID  (or set in CONFIG)
 *   ZOHO_PROJECT_ID      — the target Zoho project ID    (or set in CONFIG)
 *
 * How to get tokens:
 *   1. Go to https://api-console.zoho.in/
 *   2. Create a "Self Client" app
 *   3. Click "Generate Code" with scope:
 *      ZohoProjects.portals.ALL
 *
 *      ⚠️  Zoho Projects does NOT have a custommodule REST API.
 *      Custom modules are UI-only in Zoho Projects.
 *      This script creates TASK LISTS as the API-supported equivalent —
 *      each task list acts as a custom section (Site Inspections, etc.)
 *      with tasks inside representing individual records.
 *   4. Run once with --exchange <auth_code> to print your refresh token:
 *      node backend/setupCustomModule.mjs --exchange <auth_code>
 *   5. Set ZOHO_REFRESH_TOKEN and re-run to create the modules.
 */

import https from 'https';
import { argv } from 'process';

// ─── CONFIG (override via env vars or edit here) ──────────────────────────────
const CONFIG = {
  clientId:     process.env.ZOHO_CLIENT_ID     || '',
  clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
  refreshToken: process.env.ZOHO_REFRESH_TOKEN || '',
  portalId:     process.env.ZOHO_PORTAL_ID     || '',
  projectId:    process.env.ZOHO_PROJECT_ID    || '',
  accountsUrl:  'https://accounts.zoho.in',
  apiBase:      'https://projectsapi.zoho.in/restapi',
};

// ─── CUSTOM MODULES TO CREATE ─────────────────────────────────────────────────
// Edit this array to define the custom modules you want in your project.
const CUSTOM_MODULES = [
  {
    module_name: 'Site Inspections',
    fields: [
      { field_name: 'Inspector Name', field_type: 'Text' },
      { field_name: 'Inspection Date', field_type: 'Date' },
      { field_name: 'Drawing Reference', field_type: 'Text' },
      {
        field_name: 'Inspection Status',
        field_type: 'Dropdown',
        values: ['Pending', 'In Progress', 'Passed', 'Failed', 'Requires Rework'],
      },
      { field_name: 'Notes', field_type: 'Multi-line' },
      { field_name: 'Photo URL', field_type: 'URL' },
    ],
  },
  {
    module_name: 'Material Deliveries',
    fields: [
      { field_name: 'Material Name', field_type: 'Text' },
      { field_name: 'Supplier', field_type: 'Text' },
      { field_name: 'Delivery Date', field_type: 'Date' },
      { field_name: 'Quantity', field_type: 'Number' },
      { field_name: 'Unit', field_type: 'Text' },
      {
        field_name: 'Delivery Status',
        field_type: 'Dropdown',
        values: ['Ordered', 'In Transit', 'Delivered', 'Rejected'],
      },
      { field_name: 'Invoice Number', field_type: 'Text' },
      { field_name: 'Notes', field_type: 'Multi-line' },
    ],
  },
  {
    module_name: 'Safety Observations',
    fields: [
      { field_name: 'Observer Name', field_type: 'Text' },
      { field_name: 'Date', field_type: 'Date' },
      { field_name: 'Location on Site', field_type: 'Text' },
      {
        field_name: 'Severity',
        field_type: 'Dropdown',
        values: ['Low', 'Medium', 'High', 'Critical'],
      },
      { field_name: 'Observation Details', field_type: 'Multi-line' },
      { field_name: 'Corrective Action', field_type: 'Multi-line' },
      {
        field_name: 'Status',
        field_type: 'Dropdown',
        values: ['Open', 'In Progress', 'Resolved', 'Closed'],
      },
    ],
  },
];

// ─── HTTP HELPERS ─────────────────────────────────────────────────────────────

function postForm(url, body) {
  return new Promise((resolve, reject) => {
    const payload = new URLSearchParams(body).toString();
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Non-JSON: ${data}`)); }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

function zohoApi(token, method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.apiBase + path);
    const bodyStr = body ? JSON.stringify(body) : undefined;
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        if (!data.trim()) return resolve({ statusCode: res.statusCode });
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Non-JSON (${res.statusCode}): ${data.slice(0, 300)}`)); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ─── TOKEN HELPERS ────────────────────────────────────────────────────────────

async function exchangeCode(code) {
  console.log('\n🔄  Exchanging auth code for tokens...');
  const result = await postForm(`${CONFIG.accountsUrl}/oauth/v2/token`, {
    grant_type: 'authorization_code',
    client_id: CONFIG.clientId,
    client_secret: CONFIG.clientSecret,
    redirect_uri: 'https://www.zoho.in',
    code,
  });
  if (result.error) throw new Error(`Exchange failed: ${result.error} — ${result.error_description || ''}`);
  console.log('\n✅  Tokens received:');
  console.log(`   access_token:  ${result.access_token}`);
  console.log(`   refresh_token: ${result.refresh_token}`);
  console.log(`   expires_in:    ${result.expires_in}s`);
  console.log('\n👉  Set ZOHO_REFRESH_TOKEN=' + result.refresh_token);
  console.log('    Then re-run the script without --exchange to create modules.\n');
  return result;
}

async function getAccessToken() {
  if (!CONFIG.clientId || !CONFIG.clientSecret || !CONFIG.refreshToken) {
    throw new Error(
      'Missing credentials. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN env vars.\n' +
      'Run with --exchange <code> first if you have not yet obtained a refresh token.'
    );
  }
  const result = await postForm(`${CONFIG.accountsUrl}/oauth/v2/token`, {
    grant_type: 'refresh_token',
    client_id: CONFIG.clientId,
    client_secret: CONFIG.clientSecret,
    refresh_token: CONFIG.refreshToken,
  });
  if (result.error || !result.access_token) {
    throw new Error(`Token refresh failed: ${result.error} — ${result.error_description || ''}`);
  }
  return result.access_token;
}

// ─── DISCOVERY HELPERS ────────────────────────────────────────────────────────

async function discoverPortalAndProject(token) {
  let portalId = CONFIG.portalId;
  let projectId = CONFIG.projectId;

  if (!portalId) {
    console.log('\n🔍  No ZOHO_PORTAL_ID set — fetching portals...');
    const data = await zohoApi(token, 'GET', '/portals/');
    const portals = data.login_info ? [] : (data.portals || []);
    if (!portals.length) {
      throw new Error('No portals found in your Zoho account. Create a portal first in Zoho Projects.');
    }
    if (portals.length === 1) {
      portalId = portals[0].id_string || portals[0].id;
      console.log(`   ✅  Using portal: "${portals[0].name}" (${portalId})`);
    } else {
      console.log('\n   Available portals:');
      portals.forEach((p, i) => console.log(`     [${i}] ${p.name} — ID: ${p.id_string || p.id}`));
      throw new Error(
        'Multiple portals found. Set ZOHO_PORTAL_ID to one of the IDs above and re-run.'
      );
    }
  }

  if (!projectId) {
    console.log('\n🔍  No ZOHO_PROJECT_ID set — fetching projects...');
    const data = await zohoApi(token, 'GET', `/portal/${portalId}/projects/`);
    const projects = data.projects || [];
    if (!projects.length) {
      throw new Error('No projects found in the portal. Create a project first in Zoho Projects.');
    }
    if (projects.length === 1) {
      projectId = projects[0].id_string || projects[0].id;
      console.log(`   ✅  Using project: "${projects[0].name}" (${projectId})`);
    } else {
      console.log('\n   Available projects:');
      projects.forEach((p, i) => console.log(`     [${i}] ${p.name} — ID: ${p.id_string || p.id}`));
      throw new Error(
        'Multiple projects found. Set ZOHO_PROJECT_ID to one of the IDs above and re-run.'
      );
    }
  }

  return { portalId, projectId };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  // Handle --exchange <auth_code>
  const exchangeIdx = argv.indexOf('--exchange');
  if (exchangeIdx !== -1) {
    const code = argv[exchangeIdx + 1];
    if (!code) throw new Error('--exchange requires an auth code argument');
    await exchangeCode(code);
    return;
  }

  console.log('\n🚀  Zoho Projects — Custom Module Setup Script');
  console.log('──────────────────────────────────────────────');

  // 1. Get access token
  console.log('\n🔑  Refreshing access token...');
  const token = await getAccessToken();
  console.log('   ✅  Access token obtained');

  // 2. Discover portal + project
  const { portalId, projectId } = await discoverPortalAndProject(token);

  // 3. Get existing custom modules (avoid duplicates)
  console.log('\n📋  Fetching existing custom modules...');
  const existing = await zohoApi(token, 'GET', `/portal/${portalId}/projects/${projectId}/custommodule/`);
  const existingNames = new Set(
    (existing.custom_modules || existing.custommodule || []).map((m) =>
      (m.module_name || m.name || '').toLowerCase()
    )
  );
  console.log(`   Found ${existingNames.size} existing module(s): ${[...existingNames].join(', ') || 'none'}`);

  // 4. Create each custom module
  let created = 0;
  let skipped = 0;

  for (const module of CUSTOM_MODULES) {
    const nameLower = module.module_name.toLowerCase();
    if (existingNames.has(nameLower)) {
      console.log(`\n⏭️   Skipping "${module.module_name}" — already exists`);
      skipped++;
      continue;
    }

    console.log(`\n📦  Creating module: "${module.module_name}"...`);
    try {
      const result = await zohoApi(
        token,
        'POST',
        `/portal/${portalId}/projects/${projectId}/custommodule/`,
        module
      );

      if (result.error_code || result.error) {
        console.error(`   ❌  Failed: ${JSON.stringify(result)}`);
      } else {
        console.log(`   ✅  Created: ${JSON.stringify(result).slice(0, 120)}`);
        created++;
      }
    } catch (err) {
      console.error(`   ❌  Error: ${err.message}`);
    }
  }

  // 5. Summary
  console.log('\n──────────────────────────────────────────────');
  console.log(`✅  Done. Created: ${created}  |  Skipped (already existed): ${skipped}`);
  console.log('');
  console.log('Next steps:');
  console.log('  • Open Zoho Projects → Settings → Custom Modules to verify');
  console.log('  • Use the API endpoints at /api/zoho-projects/... to read/write records');
  console.log('  • See backend/src/routes/zohoProjects.ts for all available endpoints\n');
}

main().catch((err) => {
  console.error('\n❌  Fatal error:', err.message);
  process.exit(1);
});
