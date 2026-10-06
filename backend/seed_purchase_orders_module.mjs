/**
 * seed_purchase_orders_module.mjs
 *
 * Seeds the "📦 Purchase Orders" custom module into the live app.
 *
 * Path: BuildTrack → Procurement → Purchase Orders
 *
 * Run with: node backend/seed_purchase_orders_module.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

// ── Field definitions ────────────────────────────────────────────────────────

function makePurchaseOrderFields() {
  return [
    { id: crypto.randomUUID(), label: 'PO Number', type: 'text' },
    { id: crypto.randomUUID(), label: 'Project', type: 'text' },
    { id: crypto.randomUUID(), label: 'Supplier', type: 'text' },
    { id: crypto.randomUUID(), label: 'Order Date', type: 'date' },
    { id: crypto.randomUUID(), label: 'Expected Delivery', type: 'date' },
    {
      id: crypto.randomUUID(), label: 'Material Category', type: 'select',
      options: [
        'Structural Steel', 'Cement & Concrete', 'Rebar / TMT Bars',
        'Electrical Materials', 'Plumbing Materials', 'Bricks & Blocks',
        'Formwork & Scaffolding', 'Finishing Materials', 'Equipment Rental', 'Other',
      ],
    },
    { id: crypto.randomUUID(), label: 'Item Description', type: 'text' },
    { id: crypto.randomUUID(), label: 'Quantity', type: 'number' },
    { id: crypto.randomUUID(), label: 'Unit', type: 'text' },
    { id: crypto.randomUUID(), label: 'Unit Price (₹)', type: 'number' },
    { id: crypto.randomUUID(), label: 'Total Amount (₹)', type: 'number' },
    {
      id: crypto.randomUUID(), label: 'Status', type: 'select',
      options: ['Draft', 'Submitted', 'Approved', 'Partially Delivered', 'Delivered', 'Cancelled'],
    },
    { id: crypto.randomUUID(), label: 'Requested By', type: 'text' },
    { id: crypto.randomUUID(), label: 'Approved By', type: 'text' },
    { id: crypto.randomUUID(), label: 'Notes', type: 'text' },
  ];
}

// ── Sample purchase order records ────────────────────────────────────────────

function makeSamplePurchaseOrders(fields) {
  const f = {};
  for (const field of fields) f[field.label] = field.id;

  return [
    {
      [f['PO Number']]: 'PO-2026-0041',
      [f['Project']]: 'GreenSteel Industrial Building',
      [f['Supplier']]: 'Tata Steel BSL Ltd.',
      [f['Order Date']]: '2026-08-02',
      [f['Expected Delivery']]: '2026-08-20',
      [f['Material Category']]: 'Structural Steel',
      [f['Item Description']]: 'S355 ISMB 400 beams – mill certified',
      [f['Quantity']]: 85,
      [f['Unit']]: 'Tonnes',
      [f['Unit Price (₹)']]: 68500,
      [f['Total Amount (₹)']]: 5822500,
      [f['Status']]: 'Delivered',
      [f['Requested By']]: 'Rajesh Nair',
      [f['Approved By']]: 'Anand Kumar (PM)',
      [f['Notes']]: 'CMR and mill test certificates received with shipment.',
    },
    {
      [f['PO Number']]: 'PO-2026-0042',
      [f['Project']]: 'GreenSteel Industrial Building',
      [f['Supplier']]: 'Ultratech Cement Ltd.',
      [f['Order Date']]: '2026-08-05',
      [f['Expected Delivery']]: '2026-08-12',
      [f['Material Category']]: 'Cement & Concrete',
      [f['Item Description']]: 'OPC 53 Grade Cement – 50kg bags',
      [f['Quantity']]: 2000,
      [f['Unit']]: 'Bags',
      [f['Unit Price (₹)']]: 385,
      [f['Total Amount (₹)']]: 770000,
      [f['Status']]: 'Delivered',
      [f['Requested By']]: 'Suresh Babu',
      [f['Approved By']]: 'Anand Kumar (PM)',
      [f['Notes']]: 'Delivered in 4 batches; stored in covered godown.',
    },
    {
      [f['PO Number']]: 'PO-2026-0043',
      [f['Project']]: 'GreenSteel Industrial Building',
      [f['Supplier']]: 'JSW Steel Coated Products',
      [f['Order Date']]: '2026-08-10',
      [f['Expected Delivery']]: '2026-08-28',
      [f['Material Category']]: 'Rebar / TMT Bars',
      [f['Item Description']]: 'Fe-500D TMT Bars – 12mm, 16mm, 20mm mix',
      [f['Quantity']]: 45,
      [f['Unit']]: 'Tonnes',
      [f['Unit Price (₹)']]: 59800,
      [f['Total Amount (₹)']]: 2691000,
      [f['Status']]: 'Approved',
      [f['Requested By']]: 'Karthik Murugan',
      [f['Approved By']]: 'Anand Kumar (PM)',
      [f['Notes']]: 'Awaiting dispatch confirmation from supplier.',
    },
    {
      [f['PO Number']]: 'PO-2026-0044',
      [f['Project']]: 'Prestige Lakeside Residency',
      [f['Supplier']]: 'Havells India Ltd.',
      [f['Order Date']]: '2026-08-14',
      [f['Expected Delivery']]: '2026-08-25',
      [f['Material Category']]: 'Electrical Materials',
      [f['Item Description']]: 'MCB distribution boards, cables (2.5/4/6 sq.mm)',
      [f['Quantity']]: 1,
      [f['Unit']]: 'Lot',
      [f['Unit Price (₹)']]: 412000,
      [f['Total Amount (₹)']]: 412000,
      [f['Status']]: 'Submitted',
      [f['Requested By']]: 'Arjun Venkatesh',
      [f['Approved By']]: '—',
      [f['Notes']]: 'Pending budget approval from project finance.',
    },
    {
      [f['PO Number']]: 'PO-2026-0045',
      [f['Project']]: 'Prestige Lakeside Residency',
      [f['Supplier']]: 'Supreme Industries Ltd.',
      [f['Order Date']]: '2026-08-15',
      [f['Expected Delivery']]: '2026-08-22',
      [f['Material Category']]: 'Plumbing Materials',
      [f['Item Description']]: 'CPVC pipes & fittings – 1/2" to 2"',
      [f['Quantity']]: 650,
      [f['Unit']]: 'Pieces',
      [f['Unit Price (₹)']]: 310,
      [f['Total Amount (₹)']]: 201500,
      [f['Status']]: 'Partially Delivered',
      [f['Requested By']]: 'Dinesh Kumar',
      [f['Approved By']]: 'Priya Nair (Engineer)',
      [f['Notes']]: '70% of order delivered; remainder delayed by transporter.',
    },
    {
      [f['PO Number']]: 'PO-2026-0046',
      [f['Project']]: 'GreenSteel Industrial Building',
      [f['Supplier']]: 'Jindal Fenner (India) Ltd.',
      [f['Order Date']]: '2026-08-18',
      [f['Expected Delivery']]: '2026-09-02',
      [f['Material Category']]: 'Formwork & Scaffolding',
      [f['Item Description']]: 'Steel ply shuttering sheets + couplers',
      [f['Quantity']]: 320,
      [f['Unit']]: 'Sheets',
      [f['Unit Price (₹)']]: 1450,
      [f['Total Amount (₹)']]: 464000,
      [f['Status']]: 'Draft',
      [f['Requested By']]: 'Rajesh Sharma',
      [f['Approved By']]: '—',
      [f['Notes']]: 'Awaiting final quantity sign-off from site engineer.',
    },
    {
      [f['PO Number']]: 'PO-2026-0047',
      [f['Project']]: 'Prestige Lakeside Residency',
      [f['Supplier']]: 'Kajaria Ceramics Ltd.',
      [f['Order Date']]: '2026-08-20',
      [f['Expected Delivery']]: '2026-09-10',
      [f['Material Category']]: 'Finishing Materials',
      [f['Item Description']]: 'Vitrified floor tiles – 600x600mm, matte finish',
      [f['Quantity']]: 4200,
      [f['Unit']]: 'Sq. ft.',
      [f['Unit Price (₹)']]: 68,
      [f['Total Amount (₹)']]: 285600,
      [f['Status']]: 'Submitted',
      [f['Requested By']]: 'Priya Nair',
      [f['Approved By']]: '—',
      [f['Notes']]: 'Sample board approved by client architect.',
    },
    {
      [f['PO Number']]: 'PO-2026-0048',
      [f['Project']]: 'GreenSteel Industrial Building',
      [f['Supplier']]: 'Ace Equipment Rentals',
      [f['Order Date']]: '2026-08-22',
      [f['Expected Delivery']]: '2026-08-24',
      [f['Material Category']]: 'Equipment Rental',
      [f['Item Description']]: 'Tower crane – 2-month rental, Zone B erection',
      [f['Quantity']]: 2,
      [f['Unit']]: 'Months',
      [f['Unit Price (₹)']]: 185000,
      [f['Total Amount (₹)']]: 370000,
      [f['Status']]: 'Approved',
      [f['Requested By']]: 'Anand Kumar (PM)',
      [f['Approved By']]: 'Site Director',
      [f['Notes']]: 'Crane mobilization scheduled on delivery date.',
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
  console.log('📦 BuildTrack — Purchase Orders Module Seeder\n');
  console.log(`Backend: ${BASE}\n`);

  const MODULE_NAME = '📦 Purchase Orders';

  console.log('Fetching existing custom modules…');
  const existingModules = await apiGet('/custom-modules');
  const existing = existingModules.find((m) => m.name === MODULE_NAME);

  const fields = makePurchaseOrderFields();
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

  const entries = makeSamplePurchaseOrders(savedFields);
  console.log(`\nSeeding ${entries.length} purchase order records…`);

  for (const entry of entries) {
    const rec = await apiPost(`/custom-modules/${module.id}/records`, entry);
    const poField = savedFields.find((f) => f.label === 'PO Number');
    const supplierField = savedFields.find((f) => f.label === 'Supplier');
    console.log(`    ➕ ${entry[poField.id]}  ${entry[supplierField.id]}  (record id=${rec.id})`);
  }

  console.log(`\n✅ Purchase Orders module seeding complete!`);
  console.log(`\nView in app: Navigate to Procurement → Purchase Orders`);
}

main().catch((err) => {
  console.error('\n❌ Seeding failed:', err.message || err);
  process.exit(1);
});
