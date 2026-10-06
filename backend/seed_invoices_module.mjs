/**
 * seed_invoices_module.mjs
 *
 * Seeds the "🧾 Invoices" custom module into the live app.
 *
 * Path: BuildTrack → Procurement → Invoices
 *
 * Run with: node backend/seed_invoices_module.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

// ── Field definitions ────────────────────────────────────────────────────────

function makeInvoiceFields() {
  return [
    { id: crypto.randomUUID(), label: 'Invoice Number', type: 'text' },
    { id: crypto.randomUUID(), label: 'Related PO Number', type: 'text' },
    { id: crypto.randomUUID(), label: 'Project', type: 'text' },
    { id: crypto.randomUUID(), label: 'Vendor / Supplier', type: 'text' },
    { id: crypto.randomUUID(), label: 'Invoice Date', type: 'date' },
    { id: crypto.randomUUID(), label: 'Due Date', type: 'date' },
    {
      id: crypto.randomUUID(), label: 'Invoice Type', type: 'select',
      options: ['Material Supply', 'Labour Contract', 'Equipment Rental', 'Subcontractor Work', 'Professional Services', 'Other'],
    },
    { id: crypto.randomUUID(), label: 'Amount (₹)', type: 'number' },
    { id: crypto.randomUUID(), label: 'Tax / GST (₹)', type: 'number' },
    { id: crypto.randomUUID(), label: 'Total Payable (₹)', type: 'number' },
    {
      id: crypto.randomUUID(), label: 'Payment Status', type: 'select',
      options: ['Pending', 'Approved for Payment', 'Partially Paid', 'Paid', 'Overdue', 'Disputed'],
    },
    { id: crypto.randomUUID(), label: 'Payment Date', type: 'date' },
    { id: crypto.randomUUID(), label: 'Payment Mode', type: 'text' },
    { id: crypto.randomUUID(), label: 'Submitted By', type: 'text' },
    { id: crypto.randomUUID(), label: 'Notes', type: 'text' },
  ];
}

// ── Sample invoice records ───────────────────────────────────────────────────

function makeSampleInvoices(fields) {
  const f = {};
  for (const field of fields) f[field.label] = field.id;

  return [
    {
      [f['Invoice Number']]: 'INV-2026-1041',
      [f['Related PO Number']]: 'PO-2026-0041',
      [f['Project']]: 'GreenSteel Industrial Building',
      [f['Vendor / Supplier']]: 'Tata Steel BSL Ltd.',
      [f['Invoice Date']]: '2026-08-21',
      [f['Due Date']]: '2026-09-20',
      [f['Invoice Type']]: 'Material Supply',
      [f['Amount (₹)']]: 5822500,
      [f['Tax / GST (₹)']]: 1047650,
      [f['Total Payable (₹)']]: 6870150,
      [f['Payment Status']]: 'Paid',
      [f['Payment Date']]: '2026-09-05',
      [f['Payment Mode']]: 'Bank Transfer (NEFT)',
      [f['Submitted By']]: 'Rajesh Nair',
      [f['Notes']]: 'Paid against delivered steel consignment, verified with GRN.',
    },
    {
      [f['Invoice Number']]: 'INV-2026-1042',
      [f['Related PO Number']]: 'PO-2026-0042',
      [f['Project']]: 'GreenSteel Industrial Building',
      [f['Vendor / Supplier']]: 'Ultratech Cement Ltd.',
      [f['Invoice Date']]: '2026-08-13',
      [f['Due Date']]: '2026-09-12',
      [f['Invoice Type']]: 'Material Supply',
      [f['Amount (₹)']]: 770000,
      [f['Tax / GST (₹)']]: 138600,
      [f['Total Payable (₹)']]: 908600,
      [f['Payment Status']]: 'Paid',
      [f['Payment Date']]: '2026-08-30',
      [f['Payment Mode']]: 'Bank Transfer (NEFT)',
      [f['Submitted By']]: 'Suresh Babu',
      [f['Notes']]: 'Payment released after cement test reports cleared.',
    },
    {
      [f['Invoice Number']]: 'INV-2026-1043',
      [f['Related PO Number']]: '—',
      [f['Project']]: 'GreenSteel Industrial Building',
      [f['Vendor / Supplier']]: 'BuildPro Civil Works (Subcontractor)',
      [f['Invoice Date']]: '2026-08-31',
      [f['Due Date']]: '2026-09-30',
      [f['Invoice Type']]: 'Subcontractor Work',
      [f['Amount (₹)']]: 1250000,
      [f['Tax / GST (₹)']]: 0,
      [f['Total Payable (₹)']]: 1250000,
      [f['Payment Status']]: 'Approved for Payment',
      [f['Payment Date']]: '—',
      [f['Payment Mode']]: '—',
      [f['Submitted By']]: 'Anand Kumar (PM)',
      [f['Notes']]: 'Monthly RA bill for foundation & formwork labour, Zone B.',
    },
    {
      [f['Invoice Number']]: 'INV-2026-1044',
      [f['Related PO Number']]: 'PO-2026-0045',
      [f['Project']]: 'Prestige Lakeside Residency',
      [f['Vendor / Supplier']]: 'Supreme Industries Ltd.',
      [f['Invoice Date']]: '2026-08-23',
      [f['Due Date']]: '2026-09-22',
      [f['Invoice Type']]: 'Material Supply',
      [f['Amount (₹)']]: 141050,
      [f['Tax / GST (₹)']]: 25389,
      [f['Total Payable (₹)']]: 166439,
      [f['Payment Status']]: 'Partially Paid',
      [f['Payment Date']]: '2026-09-01',
      [f['Payment Mode']]: 'Cheque',
      [f['Submitted By']]: 'Dinesh Kumar',
      [f['Notes']]: 'Partial payment released for 70% delivered quantity.',
    },
    {
      [f['Invoice Number']]: 'INV-2026-1045',
      [f['Related PO Number']]: '—',
      [f['Project']]: 'Prestige Lakeside Residency',
      [f['Vendor / Supplier']]: 'Arjun Electricals (Subcontractor)',
      [f['Invoice Date']]: '2026-08-28',
      [f['Due Date']]: '2026-09-27',
      [f['Invoice Type']]: 'Subcontractor Work',
      [f['Amount (₹)']]: 480000,
      [f['Tax / GST (₹)']]: 0,
      [f['Total Payable (₹)']]: 480000,
      [f['Payment Status']]: 'Pending',
      [f['Payment Date']]: '—',
      [f['Payment Mode']]: '—',
      [f['Submitted By']]: 'Priya Nair (Engineer)',
      [f['Notes']]: 'Awaiting site measurement sign-off before approval.',
    },
    {
      [f['Invoice Number']]: 'INV-2026-1046',
      [f['Related PO Number']]: 'PO-2026-0048',
      [f['Project']]: 'GreenSteel Industrial Building',
      [f['Vendor / Supplier']]: 'Ace Equipment Rentals',
      [f['Invoice Date']]: '2026-08-24',
      [f['Due Date']]: '2026-09-23',
      [f['Invoice Type']]: 'Equipment Rental',
      [f['Amount (₹)']]: 370000,
      [f['Tax / GST (₹)']]: 66600,
      [f['Total Payable (₹)']]: 436600,
      [f['Payment Status']]: 'Overdue',
      [f['Payment Date']]: '—',
      [f['Payment Mode']]: '—',
      [f['Submitted By']]: 'Anand Kumar (PM)',
      [f['Notes']]: 'Overdue by 6 days; finance team flagged for follow-up.',
    },
    {
      [f['Invoice Number']]: 'INV-2026-1047',
      [f['Related PO Number']]: '—',
      [f['Project']]: 'Prestige Lakeside Residency',
      [f['Vendor / Supplier']]: 'Skyline Structural Consultants',
      [f['Invoice Date']]: '2026-08-29',
      [f['Due Date']]: '2026-09-28',
      [f['Invoice Type']]: 'Professional Services',
      [f['Amount (₹)']]: 215000,
      [f['Tax / GST (₹)']]: 38700,
      [f['Total Payable (₹)']]: 253700,
      [f['Payment Status']]: 'Disputed',
      [f['Payment Date']]: '—',
      [f['Payment Mode']]: '—',
      [f['Submitted By']]: 'Priya Nair (Engineer)',
      [f['Notes']]: 'Scope of structural review disputed; under discussion with consultant.',
    },
    {
      [f['Invoice Number']]: 'INV-2026-1048',
      [f['Related PO Number']]: 'PO-2026-0043',
      [f['Project']]: 'GreenSteel Industrial Building',
      [f['Vendor / Supplier']]: 'JSW Steel Coated Products',
      [f['Invoice Date']]: '2026-09-01',
      [f['Due Date']]: '2026-10-01',
      [f['Invoice Type']]: 'Material Supply',
      [f['Amount (₹)']]: 2691000,
      [f['Tax / GST (₹)']]: 484380,
      [f['Total Payable (₹)']]: 3175380,
      [f['Payment Status']]: 'Pending',
      [f['Payment Date']]: '—',
      [f['Payment Mode']]: '—',
      [f['Submitted By']]: 'Karthik Murugan',
      [f['Notes']]: 'Invoice raised on dispatch; delivery pending inspection.',
    },
  ];
}

// ── API helpers ──────────────────────────────────────────────────────────────

async function apiGet(path) {
  const r = await fetch(`${BASE}${path}`);
  const text = await r.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`GET ${path} returned non-JSON: ${text.slice(0, 200)}`); }
}

async function apiPost(path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  try {
    const data = JSON.parse(text);
    if (!r.ok) throw new Error(`POST ${path} failed (${r.status}): ${JSON.stringify(data)}`);
    return data;
  } catch (e) {
    if (e.message.startsWith('POST')) throw e;
    throw new Error(`POST ${path} returned non-JSON: ${text.slice(0, 200)}`);
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🧾 BuildTrack — Invoices Module Seeder\n');
  console.log(`Backend: ${BASE}\n`);

  const MODULE_NAME = '🧾 Invoices';

  console.log('Fetching existing custom modules…');
  const existingModules = await apiGet('/custom-modules');
  const existing = existingModules.find((m) => m.name === MODULE_NAME);

  const fields = makeInvoiceFields();
  let module;

  if (existing) {
    console.log(`  ⚠  Module "${MODULE_NAME}" already exists (id=${existing.id}). Updating fields…`);
    const r = await fetch(`${BASE}/custom-modules/${existing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    module = await r.json();
    console.log(`  ✓ Fields updated on module id=${module.id}`);
  } else {
    module = await apiPost('/custom-modules', { name: MODULE_NAME, fields });
    console.log(`  ✓ Created "${MODULE_NAME}" module id=${module.id} with ${fields.length} fields`);
  }

  const savedFields = typeof module.fields === 'string'
    ? JSON.parse(module.fields)
    : module.fields;

  const existingRecords = await apiGet(`/custom-modules/${module.id}/records`);
  if (existingRecords.length > 0) {
    console.log(`\n  ℹ  Module already has ${existingRecords.length} records. Skipping record seeding.`);
    console.log('\n✅ Done — no duplicate records created.');
    return;
  }

  const entries = makeSampleInvoices(savedFields);
  console.log(`\nSeeding ${entries.length} invoice records…`);

  for (const entry of entries) {
    const rec = await apiPost(`/custom-modules/${module.id}/records`, entry);
    const invField = savedFields.find((f) => f.label === 'Invoice Number');
    const vendorField = savedFields.find((f) => f.label === 'Vendor / Supplier');
    console.log(`    ➕ ${entry[invField.id]}  ${entry[vendorField.id]}  (record id=${rec.id})`);
  }

  console.log(`\n✅ Invoices module seeding complete!`);
  console.log(`\nView in app: Navigate to Procurement → Invoices`);
}

main().catch((err) => {
  console.error('\n❌ Seeding failed:', err.message || err);
  process.exit(1);
});
