/**
 * add_id_columns.mjs
 * 
 * Uses the Catalyst SDK (which reads credentials from ~/.zcc or the CLI config)
 * to add the `id` (varchar 255) column to custom_modules and custom_records tables.
 *
 * Run: node add_id_columns.mjs
 */

import catalyst from 'zcatalyst-sdk-node';
import https from 'https';

const PROJECT_ID = '59125000000013030';
const PROJECT_KEY = '50044693287';
const BASE_URL = 'https://api.catalyst.zoho.in';
const ENVIRONMENT = 'Development';

// Table IDs
const TABLES = {
  custom_modules: '59125000000061005',
  custom_records: '59125000000052013',
};

function catalystRequest(accessToken, method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/baas/v1/project/${PROJECT_ID}${path}`);
    const bodyStr = body ? JSON.stringify(body) : undefined;
    const headers = {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'PROJECT_ID': PROJECT_KEY,
      'X-Catalyst-Environment': ENVIRONMENT,
      'X-CATALYST-USER': 'admin',
      'Content-Type': 'application/json',
    };
    if (bodyStr) headers['Content-Length'] = Buffer.byteLength(bodyStr);

    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method,
      headers,
    };

    const req = https.request(options, (resp) => {
      let data = '';
      resp.on('data', (chunk) => { data += chunk; });
      resp.on('end', () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  // Initialize catalyst SDK to get token
  let accessToken;
  try {
    const app = catalyst.initialize({ env: 'development' });
    accessToken = app?.config?.accessToken;
    console.log('SDK token:', accessToken ? accessToken.substring(0, 30) + '...' : 'none');
  } catch (e) {
    console.log('SDK init error:', e.message);
  }

  if (!accessToken) {
    // Try to read token from CLI config
    const { readFileSync } = await import('fs');
    try {
      const cliConfig = JSON.parse(
        readFileSync('/Users/ashok-14955/Library/Preferences/zcatalyst-cli-nodejs/zcatalyst-cli-v1.json', 'utf8')
      );
      console.log('CLI config user:', cliConfig?.in?.user?.Email);
      // The credential is encrypted, can't use directly
    } catch(e) {
      console.log('Could not read CLI config:', e.message);
    }
    console.error('ERROR: No access token available. Please provide ZOHO_ACCESS_TOKEN env var.');
    console.log('\nTo get a fresh token, run:');
    console.log('  ZOHO_ACCESS_TOKEN=<your_token> node add_id_columns.mjs');
    process.exit(1);
  }

  console.log(`\nUsing token: ${accessToken.substring(0, 20)}...`);

  for (const [tableName, tableId] of Object.entries(TABLES)) {
    console.log(`\n--- Adding 'id' column to ${tableName} (tableId: ${tableId}) ---`);

    // Check existing columns
    const colsResp = await catalystRequest(accessToken, 'GET', `/table/${tableId}/column`);
    const existingCols = (colsResp?.data || []).map(c => c.column_name?.toLowerCase());
    console.log('Existing columns:', existingCols);

    if (existingCols.includes('id')) {
      console.log(`  ✓ 'id' column already exists in ${tableName}`);
      continue;
    }

    // Add the id column
    const addResp = await catalystRequest(
      accessToken,
      'POST',
      `/table/${tableId}/column`,
      [{ column_name: 'id', data_type: 'varchar', max_length: 255 }]
    );
    
    if (addResp?.status === 'success') {
      console.log(`  ✓ Successfully added 'id' column to ${tableName}`);
    } else {
      console.log(`  ✗ Failed to add 'id' column to ${tableName}:`, JSON.stringify(addResp));
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
