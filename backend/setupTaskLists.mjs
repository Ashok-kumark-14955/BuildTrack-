#!/usr/bin/env node
/**
 * setupTaskLists.mjs
 * ──────────────────
 * Creates Task Lists in Zoho Projects to represent custom module sections:
 *   • Site Inspections
 *   • Material Deliveries
 *   • Safety Observations
 *
 * Usage:
 *   # Step 1: Exchange auth code (need ZohoProjects.portals.ALL scope)
 *   ZOHO_CLIENT_ID=xxx ZOHO_CLIENT_SECRET=yyy \
 *     node backend/setupTaskLists.mjs --exchange <auth_code>
 *
 *   # Step 2: Create task lists
 *   ZOHO_CLIENT_ID=xxx ZOHO_CLIENT_SECRET=yyy ZOHO_REFRESH_TOKEN=zzz \
 *     node backend/setupTaskLists.mjs
 *
 * Required scope (generate at https://api-console.zoho.in/ → Self Client → Generate Code):
 *   ZohoProjects.portals.ALL
 */

import https from 'https';
import { argv } from 'process';

const CONFIG = {
  clientId:     process.env.ZOHO_CLIENT_ID     || '',
  clientSecret: process.env.ZOHO_CLIENT_SECRET || '',
  refreshToken: process.env.ZOHO_REFRESH_TOKEN || '',
  portalId:     process.env.ZOHO_PORTAL_ID     || '',
  projectId:    process.env.ZOHO_PROJECT_ID    || '',
  accountsUrl:  'https://accounts.zoho.in',
  apiBase:      'https://projectsapi.zoho.in/restapi',
};

// Task list names to create (these become the "custom module" sections)
const TASK_LISTS = [
  'Site Inspections',
  'Material Deliveries',
  'Safety Observations',
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

function zohoGet(token, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(CONFIG.apiBase + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'GET',
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error(`Non-JSON (${res.statusCode}): ${data.slice(0, 200)}`)); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function zohoPostForm(token, path, body) {
  return new Promise((resolve, reject) => {
    const payload = new URLSearchParams(body).toString();
    const url = new URL(CONFIG.apiBase + path);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
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
    req.write(payload);
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
  if (result.error) {
    throw new Error(`Exchange failed: ${result.error} — ${result.error_description || ''}`);
  }
  console.log('\n✅  Tokens received!');
  console.log(`   access_token:  ${result.access_token}`);
  console.log(`   refresh_token: ${result.refresh_token}`);
  console.log(`   expires_in:    ${result.expires_in}s`);
  console.log(`\n👉  Now run:\n`);
  console.log(
    `   ZOHO_CLIENT_ID=${CONFIG.clientId} \\\n` +
    `   ZOHO_CLIENT_SECRET=${CONFIG.clientSecret} \\\n` +
    `   ZOHO_REFRESH_TOKEN=${result.refresh_token} \\\n` +
    `   node backend/setupTaskLists.mjs\n`
  );
  return result;
}

async function getAccessToken() {
  if (!CONFIG.clientId || !CONFIG.clientSecret || !CONFIG.refreshToken) {
    throw new Error(
      'Missing credentials.\n' +
      'Set: ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN\n\n' +
      'To get a refresh token, run:\n' +
      '  ZOHO_CLIENT_ID=xxx ZOHO_CLIENT_SECRET=yyy \\\n' +
      '  node backend/setupTaskLists.mjs --exchange <auth_code>\n\n' +
      'Get the auth code from https://api-console.zoho.in/ with scope: ZohoProjects.portals.ALL'
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

// ─── DISCOVERY ────────────────────────────────────────────────────────────────

async function discoverPortalAndProject(token) {
  let portalId = CONFIG.portalId;
  let projectId = CONFIG.projectId;

  if (!portalId) {
    console.log('\n🔍  Fetching portals...');
    const data = await zohoGet(token, '/portals/');
    const portals = data.portals || [];
    if (!portals.length) throw new Error('No portals found. Create one at projects.zoho.in first.');
    if (portals.length === 1) {
      portalId = portals[0].id_string || String(portals[0].id);
      console.log(`   ✅  Portal: "${portals[0].name}" (${portalId})`);
    } else {
      console.log('\n   Available portals:');
      portals.forEach((p, i) => console.log(`     [${i}] ${p.name} — ID: ${p.id_string || p.id}`));
      throw new Error('Multiple portals found. Set ZOHO_PORTAL_ID and re-run.');
    }
  }

  if (!projectId) {
    console.log('\n🔍  Fetching projects...');
    const data = await zohoGet(token, `/portal/${portalId}/projects/`);
    const projects = data.projects || [];
    if (!projects.length) throw new Error('No projects found. Create one at projects.zoho.in first.');
    if (projects.length === 1) {
      projectId = projects[0].id_string || String(projects[0].id);
      console.log(`   ✅  Project: "${projects[0].name}" (${projectId})`);
    } else {
      console.log('\n   Available projects:');
      projects.forEach((p, i) => console.log(`     [${i}] ${p.name} — ID: ${p.id_string || p.id}`));
      throw new Error('Multiple projects found. Set ZOHO_PROJECT_ID and re-run.');
    }
  }

  return { portalId, projectId };
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  // --exchange mode
  const exchangeIdx = argv.indexOf('--exchange');
  if (exchangeIdx !== -1) {
    const code = argv[exchangeIdx + 1];
    if (!code) throw new Error('--exchange requires an auth code argument');
    await exchangeCode(code);
    return;
  }

  console.log('\n🚀  Zoho Projects — Task List Setup (Custom Module Equivalent)');
  console.log('────────────────────────────────────────────────────────────────');

  // 1. Token
  console.log('\n🔑  Getting access token...');
  const token = await getAccessToken();
  console.log('   ✅  Token obtained');

  // 2. Discover portal + project
  const { portalId, projectId } = await discoverPortalAndProject(token);

  // 3. Get existing task lists
  console.log('\n📋  Fetching existing task lists...');
  const existingData = await zohoGet(token, `/portal/${portalId}/projects/${projectId}/tasklists/`);
  const existingNames = new Set(
    (existingData.tasklists || []).map((tl) => (tl.name || '').toLowerCase())
  );
  console.log(`   Found ${existingNames.size} existing: ${[...existingNames].join(', ') || 'none'}`);

  // 4. Create task lists
  let created = 0;
  let skipped = 0;

  for (const name of TASK_LISTS) {
    if (existingNames.has(name.toLowerCase())) {
      console.log(`\n⏭️   Skipping "${name}" — already exists`);
      skipped++;
      continue;
    }

    console.log(`\n📦  Creating task list: "${name}"...`);
    try {
      const result = await zohoPostForm(
        token,
        `/portal/${portalId}/projects/${projectId}/tasklists/`,
        { name, flag: 'internal' }
      );

      if (result.error) {
        console.error(`   ❌  Failed: ${JSON.stringify(result.error)}`);
      } else {
        const tl = (result.tasklists || [])[0];
        console.log(`   ✅  Created! ID: ${tl?.id_string || tl?.id || 'unknown'}, Name: "${tl?.name || name}"`);
        created++;
      }
    } catch (err) {
      console.error(`   ❌  Error: ${err.message}`);
    }
  }

  // 5. Summary
  console.log('\n────────────────────────────────────────────────────────────────');
  console.log(`✅  Done. Created: ${created}  |  Skipped: ${skipped}`);
  console.log('');
  console.log('Your Zoho Project now has these task list sections:');
  TASK_LISTS.forEach((n) => console.log(`  • ${n}`));
  console.log('');
  console.log('Next steps:');
  console.log('  • Open Zoho Projects → your project to see the task lists');
  console.log('  • Add tasks inside each list to represent records');
  console.log('  • Use /api/zoho-projects/... endpoints to manage them via the backend API\n');
}

main().catch((err) => {
  console.error('\n❌  Fatal error:', err.message);
  process.exit(1);
});
