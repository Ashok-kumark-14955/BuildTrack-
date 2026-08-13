/**
 * seed_workers_module.mjs
 * 
 * Seeds the "👷 Workers" custom module into sample projects via the live API.
 * 
 * Run with: node seed_workers_module.mjs
 * 
 * Creates:
 *   - A "👷 Workers" custom module (keyed as "projectId:<id>") for each sample project
 *   - All 18 fields matching the Workers specification
 *   - 5 sample worker records per module
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

// ── Field definitions matching the spec ─────────────────────────────────────

function makeWorkersFields() {
  return [
    { id: crypto.randomUUID(), label: 'Worker ID',        type: 'text' },
    { id: crypto.randomUUID(), label: 'Photo',            type: 'attachment' },
    { id: crypto.randomUUID(), label: 'Full Name',        type: 'text' },
    { id: crypto.randomUUID(), label: 'Mobile Number',    type: 'text' },
    {
      id: crypto.randomUUID(), label: 'Worker Type', type: 'select',
      options: ['Labour', 'Skilled Worker', 'Supervisor', 'Engineer', 'Contractor Staff'],
    },
    {
      id: crypto.randomUUID(), label: 'Trade', type: 'select',
      options: [
        'Steel Erector', 'Mason', 'Carpenter', 'Electrician', 'Plumber',
        'Welder', 'Painter', 'Tiler', 'Foreman', 'Crane Operator', 'General Labour',
      ],
    },
    {
      id: crypto.randomUUID(), label: 'Skill Level', type: 'select',
      options: ['Unskilled', 'Semi-Skilled', 'Skilled', 'Highly Skilled'],
    },
    { id: crypto.randomUUID(), label: 'Experience',       type: 'text' },
    { id: crypto.randomUUID(), label: 'Contractor',       type: 'text' },
    { id: crypto.randomUUID(), label: 'Subcontractor',    type: 'text' },
    { id: crypto.randomUUID(), label: 'Emergency Contact',type: 'text' },
    { id: crypto.randomUUID(), label: 'Emergency Phone',  type: 'text' },
    {
      id: crypto.randomUUID(), label: 'ID Proof Type', type: 'select',
      options: ['Aadhaar', 'Passport', 'Driving Licence', 'Voter ID', 'Other'],
    },
    { id: crypto.randomUUID(), label: 'ID Number',        type: 'text' },
    {
      id: crypto.randomUUID(), label: 'Blood Group', type: 'select',
      options: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    {
      id: crypto.randomUUID(), label: 'Medical Fitness', type: 'select',
      options: ['Valid', 'Expired', 'Pending', 'Not Required'],
    },
    {
      id: crypto.randomUUID(), label: 'Status', type: 'select',
      options: ['Active', 'Inactive', 'On Leave', 'Terminated'],
    },
    { id: crypto.randomUUID(), label: 'Notes',            type: 'text' },
  ];
}

// ── Sample worker records ────────────────────────────────────────────────────

function makeSampleWorkers(fields) {
  // Build a lookup: label -> field id
  const f = {};
  for (const field of fields) {
    f[field.label] = field.id;
  }

  return [
    {
      [f['Worker ID']]:        'WRK-00125',
      [f['Full Name']]:        'Ravi Kumar',
      [f['Mobile Number']]:    '9876543210',
      [f['Worker Type']]:      'Labour',
      [f['Trade']]:            'Steel Erector',
      [f['Skill Level']]:      'Skilled',
      [f['Experience']]:       '8 years',
      [f['Contractor']]:       'ABC Construction',
      [f['Subcontractor']]:    'XYZ Steel Works',
      [f['Emergency Contact']]: 'Kumar',
      [f['Emergency Phone']]:  '9876543211',
      [f['ID Proof Type']]:    'Aadhaar',
      [f['ID Number']]:        '****1234',
      [f['Blood Group']]:      'B+',
      [f['Medical Fitness']]:  'Valid',
      [f['Status']]:           'Active',
      [f['Notes']]:            'Senior steel fixer, team lead for erection bay.',
    },
    {
      [f['Worker ID']]:        'WRK-00126',
      [f['Full Name']]:        'Suresh Babu',
      [f['Mobile Number']]:    '9845001234',
      [f['Worker Type']]:      'Skilled Worker',
      [f['Trade']]:            'Mason',
      [f['Skill Level']]:      'Highly Skilled',
      [f['Experience']]:       '12 years',
      [f['Contractor']]:       'ABC Construction',
      [f['Subcontractor']]:    'Raj Masonry Works',
      [f['Emergency Contact']]: 'Babu S',
      [f['Emergency Phone']]:  '9845001235',
      [f['ID Proof Type']]:    'Aadhaar',
      [f['ID Number']]:        '****5678',
      [f['Blood Group']]:      'O+',
      [f['Medical Fitness']]:  'Valid',
      [f['Status']]:           'Active',
      [f['Notes']]:            'Expert in RCC formwork and brick coursing.',
    },
    {
      [f['Worker ID']]:        'WRK-00127',
      [f['Full Name']]:        'Priya Nair',
      [f['Mobile Number']]:    '9900112233',
      [f['Worker Type']]:      'Supervisor',
      [f['Trade']]:            'Foreman',
      [f['Skill Level']]:      'Highly Skilled',
      [f['Experience']]:       '15 years',
      [f['Contractor']]:       'ABC Construction',
      [f['Subcontractor']]:    '',
      [f['Emergency Contact']]: 'Nair P',
      [f['Emergency Phone']]:  '9900112234',
      [f['ID Proof Type']]:    'Passport',
      [f['ID Number']]:        'P****321',
      [f['Blood Group']]:      'A+',
      [f['Medical Fitness']]:  'Valid',
      [f['Status']]:           'Active',
      [f['Notes']]:            'Site supervisor for civil & structural work.',
    },
    {
      [f['Worker ID']]:        'WRK-00128',
      [f['Full Name']]:        'Karthik M',
      [f['Mobile Number']]:    '9988776655',
      [f['Worker Type']]:      'Skilled Worker',
      [f['Trade']]:            'Electrician',
      [f['Skill Level']]:      'Skilled',
      [f['Experience']]:       '6 years',
      [f['Contractor']]:       'Arjun Electricals',
      [f['Subcontractor']]:    '',
      [f['Emergency Contact']]: 'Murugan',
      [f['Emergency Phone']]:  '9988776656',
      [f['ID Proof Type']]:    'Driving Licence',
      [f['ID Number']]:        'TN****8899',
      [f['Blood Group']]:      'AB+',
      [f['Medical Fitness']]:  'Valid',
      [f['Status']]:           'Active',
      [f['Notes']]:            'Handles all LT panel wiring and earthing.',
    },
    {
      [f['Worker ID']]:        'WRK-00129',
      [f['Full Name']]:        'Vijay Kumar',
      [f['Mobile Number']]:    '9123456780',
      [f['Worker Type']]:      'Skilled Worker',
      [f['Trade']]:            'Plumber',
      [f['Skill Level']]:      'Semi-Skilled',
      [f['Experience']]:       '4 years',
      [f['Contractor']]:       'Vijay Plumbing',
      [f['Subcontractor']]:    '',
      [f['Emergency Contact']]: 'Radha',
      [f['Emergency Phone']]:  '9123456781',
      [f['ID Proof Type']]:    'Aadhaar',
      [f['ID Number']]:        '****9900',
      [f['Blood Group']]:      'B-',
      [f['Medical Fitness']]:  'Pending',
      [f['Status']]:           'Active',
      [f['Notes']]:            'CPVC and uPVC pipe fitting specialist.',
    },
  ];
}

// ── API helpers ──────────────────────────────────────────────────────────────

async function apiGet(path) {
  const r = await fetch(`${BASE}${path}`);
  const text = await r.text();
  try { return JSON.parse(text); } catch { throw new Error(`GET ${path} returned non-JSON: ${text.slice(0, 200)}`); }
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

async function seedWorkersModuleForProject(project) {
  const moduleName = `projectId:${project.id}`;

  console.log(`\n📋 Project: "${project.name}" (${project.id})`);

  // Check if module already exists
  const existingModules = await apiGet('/custom-modules');
  const existing = existingModules.find(m => m.name === moduleName);

  let module;
  const fields = makeWorkersFields();

  if (existing) {
    console.log(`  ⚠  Module "${moduleName}" already exists (id=${existing.id}). Updating fields...`);
    module = await fetch(`${BASE}/custom-modules/${existing.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    }).then(r => r.json());
    console.log(`  ✓ Fields updated on module id=${module.id}`);
  } else {
    module = await apiPost('/custom-modules', { name: moduleName, fields });
    console.log(`  ✓ Created Workers module id=${module.id} with ${fields.length} fields`);
  }

  // Use the fields from the module response (which may have been re-parsed)
  const savedFields = typeof module.fields === 'string' ? JSON.parse(module.fields) : module.fields;
  const workers = makeSampleWorkers(savedFields);

  // Check existing records — skip seeding if already has records
  const existingRecords = await apiGet(`/custom-modules/${module.id}/records`);
  if (existingRecords.length > 0) {
    console.log(`  ℹ  Module already has ${existingRecords.length} records. Skipping record seeding.`);
    return;
  }

  // Create worker records
  for (const worker of workers) {
    const rec = await apiPost(`/custom-modules/${module.id}/records`, worker);
    // Find Full Name field id
    const nameField = savedFields.find(f => f.label === 'Full Name');
    const workerName = nameField ? worker[nameField.id] : 'Worker';
    console.log(`    ➕ Added worker: ${workerName} (record id=${rec.id})`);
  }
  console.log(`  ✓ ${workers.length} sample workers added`);
}

async function main() {
  console.log('🔨 BuildTrack — Workers Module Seeder\n');
  console.log(`Backend: ${BASE}\n`);

  // Fetch all projects
  console.log('Fetching projects...');
  const projects = await apiGet('/projects');

  if (!projects || projects.length === 0) {
    console.error('❌ No projects found. Seed projects first.');
    process.exit(1);
  }

  console.log(`Found ${projects.length} project(s):`);
  for (const p of projects) {
    console.log(`  • ${p.name} (${p.id})`);
  }

  // Seed Workers module for each project
  for (const project of projects) {
    await seedWorkersModuleForProject(project);
  }

  console.log('\n\n✅ Workers module seeding complete!');
  console.log(`\nView in app: https://buildtrack-withdrawing.onslate.in/projects`);
  console.log(`Navigate to any project → Custom Modules tab → "👷 Workers"`);
}

main().catch(err => {
  console.error('\n❌ Seeding failed:', err.message || err);
  process.exit(1);
});
