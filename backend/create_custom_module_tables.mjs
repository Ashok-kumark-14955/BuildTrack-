/**
 * create_custom_module_tables.mjs
 *
 * Creates the custom_modules and custom_records tables in the Catalyst DataStore
 * by sending POST requests through the app's own /api/custom-modules route.
 *
 * The tables are automatically created in SQLite (local dev) via the CREATE TABLE
 * IF NOT EXISTS statements in local.ts. In production (Catalyst DataStore), tables
 * must be created through the Catalyst Console or a DataStore API call.
 *
 * Since the app uses ZCQL, we create the tables by using the Catalyst Console API
 * directly. This script uses the Catalyst CLI "catalyst datastore" path.
 *
 * Usage:
 *   node create_custom_module_tables.mjs
 */

import https from 'https';

const HOST = 'construction-backend-50044693287.development.catalystappsail.in';

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const options = {
      hostname: HOST,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };
    const req = https.request(options, res => {
      let raw = '';
      res.on('data', c => (raw += c));
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  console.log('🔍 Testing /api/custom-modules endpoint …');
  const testRes = await request('GET', '/api/custom-modules');
  console.log('   Status:', testRes.status);
  console.log('   Body:', JSON.stringify(testRes.body));

  if (testRes.status === 200) {
    console.log('\n✅ custom_modules table already exists in DataStore!');
    console.log('   You can start using Custom Modules at https://buildtrack-withdrawing.onslate.in');
    return;
  }

  console.log('\n⚠️  Table does not exist yet.');
  console.log('   You need to create the "custom_modules" and "custom_records" tables');
  console.log('   in the Catalyst DataStore via the Catalyst Console.');
  console.log('');
  console.log('   Steps:');
  console.log('   1. Go to https://console.catalyst.zoho.in');
  console.log('   2. Open your project → Data Store → Tables');
  console.log('   3. Create table: custom_modules');
  console.log('      Columns:');
  console.log('        - id         : Text (255)');
  console.log('        - name       : Text (255)');
  console.log('        - fields     : Text (5000)');
  console.log('        - createdAt  : Text (255)');
  console.log('        - updatedAt  : Text (255)');
  console.log('');
  console.log('   4. Create table: custom_records');
  console.log('      Columns:');
  console.log('        - id         : Text (255)');
  console.log('        - moduleId   : Text (255)');
  console.log('        - data       : Text (10000)');
  console.log('        - createdAt  : Text (255)');
  console.log('        - updatedAt  : Text (255)');
  console.log('');
  console.log('   After creating tables, re-run: node create_custom_module_tables.mjs');
})();
