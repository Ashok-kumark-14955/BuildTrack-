/**
 * seed_more_sample_data.mjs
 *
 * Adds MORE sample records to Workers, Site Entry, and Safety Induction modules.
 * Targets module IDs directly (already known from the API).
 * Skips records whose unique ID already exists.
 *
 * Run with: node backend/seed_more_sample_data.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';

// ── Known module IDs ──────────────────────────────────────────────────────────
const MODULE_IDS = {
  workers:         ['476111000000091002', '476111000000092018'],
  siteEntry:       ['476111000000091003', '476111000000091006'],
  safetyInduction: ['476111000000101097', '476111000000101116'],
};

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiGet(path) {
  const r = await fetch(`${BASE}${path}`);
  const text = await r.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`GET ${path} returned non-JSON: ${text.slice(0, 300)}`); }
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
    throw new Error(`POST ${path} returned non-JSON: ${text.slice(0, 300)}`);
  }
}

// Build label→id lookup from a module's fields array
function fieldMap(fields) {
  const map = {};
  for (const field of fields) map[field.label] = field.id;
  return map;
}

// ── Workers sample records ────────────────────────────────────────────────────

function makeWorkerRecords(f) {
  return [
    {
      [f['Worker ID']]:         'WRK-2026-00006',
      [f['Full Name']]:         'Arjun Selvam',
      [f['Mobile Number']]:     '+91 98400 11223',
      [f['Worker Type']]:       'Skilled',
      [f['Trade']]:             'Carpenter',
      [f['Skill Level']]:       'Senior',
      [f['Experience']]:        '9 years',
      [f['Contractor']]:        'BuildPro Civil Works',
      [f['Subcontractor']]:     'Woodcraft Interiors',
      [f['Emergency Contact']]: 'Kavitha Selvam',
      [f['Emergency Phone']]:   '+91 98400 99887',
      [f['ID Proof Type']]:     'Aadhaar Card',
      [f['ID Number']]:         '6543 2109 8765',
      [f['Blood Group']]:       'B+',
      [f['Medical Fitness']]:   'Fit',
      [f['Status']]:            'Active',
      [f['Notes']]:             'Experienced formwork carpenter. OSHA certified.',
    },
    {
      [f['Worker ID']]:         'WRK-2026-00007',
      [f['Full Name']]:         'Preethi Devi',
      [f['Mobile Number']]:     '+91 97890 22334',
      [f['Worker Type']]:       'Semi-Skilled',
      [f['Trade']]:             'Painter',
      [f['Skill Level']]:       'Intermediate',
      [f['Experience']]:        '4 years',
      [f['Contractor']]:        'Shine Interiors',
      [f['Subcontractor']]:     '',
      [f['Emergency Contact']]: 'Rajan Devi',
      [f['Emergency Phone']]:   '+91 97890 55678',
      [f['ID Proof Type']]:     'Voter ID',
      [f['ID Number']]:         'TN/23/0098765',
      [f['Blood Group']]:       'O+',
      [f['Medical Fitness']]:   'Fit',
      [f['Status']]:            'Active',
      [f['Notes']]:             'Interior and exterior painting. Handles putty finishing.',
    },
    {
      [f['Worker ID']]:         'WRK-2026-00008',
      [f['Full Name']]:         'Murugan Pillai',
      [f['Mobile Number']]:     '+91 96780 33445',
      [f['Worker Type']]:       'Skilled',
      [f['Trade']]:             'Welder',
      [f['Skill Level']]:       'Senior',
      [f['Experience']]:        '12 years',
      [f['Contractor']]:        'ABC Steel Contractors',
      [f['Subcontractor']]:     '',
      [f['Emergency Contact']]: 'Selvi Pillai',
      [f['Emergency Phone']]:   '+91 96780 66778',
      [f['ID Proof Type']]:     'Aadhaar Card',
      [f['ID Number']]:         '3344 5566 7788',
      [f['Blood Group']]:       'A+',
      [f['Medical Fitness']]:   'Fit',
      [f['Status']]:            'Active',
      [f['Notes']]:             'Structural steel welding, SMAW & MIG certified.',
    },
    {
      [f['Worker ID']]:         'WRK-2026-00009',
      [f['Full Name']]:         'Radha Krishnan',
      [f['Mobile Number']]:     '+91 95670 44556',
      [f['Worker Type']]:       'Unskilled',
      [f['Trade']]:             'General Labour',
      [f['Skill Level']]:       'Junior',
      [f['Experience']]:        '1 year',
      [f['Contractor']]:        'Raj Masonry Works',
      [f['Subcontractor']]:     '',
      [f['Emergency Contact']]: 'Suganya R',
      [f['Emergency Phone']]:   '+91 95670 77889',
      [f['ID Proof Type']]:     'Driving License',
      [f['ID Number']]:         'TN-09-20231234567',
      [f['Blood Group']]:       'AB+',
      [f['Medical Fitness']]:   'Fit',
      [f['Status']]:            'Active',
      [f['Notes']]:             'Material handling and site cleaning duties.',
    },
    {
      [f['Worker ID']]:         'WRK-2026-00010',
      [f['Full Name']]:         'Senthilnathan A',
      [f['Mobile Number']]:     '+91 94560 55667',
      [f['Worker Type']]:       'Skilled',
      [f['Trade']]:             'Plumber',
      [f['Skill Level']]:       'Intermediate',
      [f['Experience']]:        '6 years',
      [f['Contractor']]:        'Vijay Plumbing',
      [f['Subcontractor']]:     '',
      [f['Emergency Contact']]: 'Meena A',
      [f['Emergency Phone']]:   '+91 94560 88990',
      [f['ID Proof Type']]:     'Aadhaar Card',
      [f['ID Number']]:         '9988 7766 5544',
      [f['Blood Group']]:       'O-',
      [f['Medical Fitness']]:   'Fit',
      [f['Status']]:            'Active',
      [f['Notes']]:             'Drainage and water supply line specialist.',
    },
    {
      [f['Worker ID']]:         'WRK-2026-00011',
      [f['Full Name']]:         'Gomathi Devi',
      [f['Mobile Number']]:     '+91 93450 66778',
      [f['Worker Type']]:       'Skilled',
      [f['Trade']]:             'Electrician',
      [f['Skill Level']]:       'Senior',
      [f['Experience']]:        '10 years',
      [f['Contractor']]:        'Arjun Electricals',
      [f['Subcontractor']]:     '',
      [f['Emergency Contact']]: 'Prakash G',
      [f['Emergency Phone']]:   '+91 93450 99001',
      [f['ID Proof Type']]:     'Voter ID',
      [f['ID Number']]:         'TN/12/0055432',
      [f['Blood Group']]:       'B-',
      [f['Medical Fitness']]:   'Fit',
      [f['Status']]:            'Active',
      [f['Notes']]:             'LT/HT wiring, panel installation and earthing.',
    },
    {
      [f['Worker ID']]:         'WRK-2026-00012',
      [f['Full Name']]:         'Balaraman S',
      [f['Mobile Number']]:     '+91 92340 77889',
      [f['Worker Type']]:       'Semi-Skilled',
      [f['Trade']]:             'Mason',
      [f['Skill Level']]:       'Intermediate',
      [f['Experience']]:        '5 years',
      [f['Contractor']]:        'Raj Masonry Works',
      [f['Subcontractor']]:     '',
      [f['Emergency Contact']]: 'Chandra S',
      [f['Emergency Phone']]:   '+91 92340 00112',
      [f['ID Proof Type']]:     'Aadhaar Card',
      [f['ID Number']]:         '1122 3344 5566',
      [f['Blood Group']]:       'A-',
      [f['Medical Fitness']]:   'Fit',
      [f['Status']]:            'On Leave',
      [f['Notes']]:             'Block laying and plastering. Currently on medical leave.',
    },
    {
      [f['Worker ID']]:         'WRK-2026-00013',
      [f['Full Name']]:         'Venkatesh P',
      [f['Mobile Number']]:     '+91 91230 88990',
      [f['Worker Type']]:       'Skilled',
      [f['Trade']]:             'Steel Fixer',
      [f['Skill Level']]:       'Senior',
      [f['Experience']]:        '15 years',
      [f['Contractor']]:        'ABC Steel Contractors',
      [f['Subcontractor']]:     '',
      [f['Emergency Contact']]: 'Vimala P',
      [f['Emergency Phone']]:   '+91 91230 11223',
      [f['ID Proof Type']]:     'Passport',
      [f['ID Number']]:         'P0123456',
      [f['Blood Group']]:       'O+',
      [f['Medical Fitness']]:   'Fit',
      [f['Status']]:            'Active',
      [f['Notes']]:             'Expert rebar binder and steel cage fabricator.',
    },
    {
      [f['Worker ID']]:         'WRK-2026-00014',
      [f['Full Name']]:         'Kavitha Suresh',
      [f['Mobile Number']]:     '+91 90120 99001',
      [f['Worker Type']]:       'Skilled',
      [f['Trade']]:             'Tile Layer',
      [f['Skill Level']]:       'Intermediate',
      [f['Experience']]:        '7 years',
      [f['Contractor']]:        'Shine Interiors',
      [f['Subcontractor']]:     '',
      [f['Emergency Contact']]: 'Suresh K',
      [f['Emergency Phone']]:   '+91 90120 22334',
      [f['ID Proof Type']]:     'Aadhaar Card',
      [f['ID Number']]:         '6677 8899 0011',
      [f['Blood Group']]:       'B+',
      [f['Medical Fitness']]:   'Fit',
      [f['Status']]:            'Active',
      [f['Notes']]:             'Vitrified, ceramic and mosaic tile work specialist.',
    },
    {
      [f['Worker ID']]:         'WRK-2026-00015',
      [f['Full Name']]:         'Durai Murugan',
      [f['Mobile Number']]:     '+91 89010 00112',
      [f['Worker Type']]:       'Unskilled',
      [f['Trade']]:             'General Labour',
      [f['Skill Level']]:       'Junior',
      [f['Experience']]:        '2 years',
      [f['Contractor']]:        'BuildPro Civil Works',
      [f['Subcontractor']]:     '',
      [f['Emergency Contact']]: 'Ammu D',
      [f['Emergency Phone']]:   '+91 89010 33445',
      [f['ID Proof Type']]:     'Voter ID',
      [f['ID Number']]:         'TN/05/0012349',
      [f['Blood Group']]:       'AB-',
      [f['Medical Fitness']]:   'Fit',
      [f['Status']]:            'Terminated',
      [f['Notes']]:             'Contract ended Aug 01 2026. Site cleanup crew.',
    },
  ];
}

// ── Site Entry sample records ─────────────────────────────────────────────────

function makeSiteEntryRecords(f) {
  return [
    {
      [f['Worker']]:           'Arjun Selvam',
      [f['Entry ID']]:         'ENT-2026-00148',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-14',
      [f['Entry Time']]:       '07:30 AM',
      [f['Exit Time']]:        '05:30 PM',
      [f['Entry Gate']]:       'Main Gate – Gate 01',
      [f['Contractor']]:       'BuildPro Civil Works',
      [f['Work Area']]:        'Second Floor Formwork',
      [f['Assigned Task']]:    'Formwork Carpentry',
      [f['Entry Purpose']]:    'Structural Erection',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'Exited',
    },
    {
      [f['Worker']]:           'Preethi Devi',
      [f['Entry ID']]:         'ENT-2026-00149',
      [f['Project']]:          'Prestige Heights Residential',
      [f['Site']]:             'Whitefield – Phase 2',
      [f['Date']]:             '2026-08-14',
      [f['Entry Time']]:       '08:00 AM',
      [f['Exit Time']]:        '04:30 PM',
      [f['Entry Gate']]:       'East Gate – Gate 02',
      [f['Contractor']]:       'Shine Interiors',
      [f['Work Area']]:        'Floors 1–3 Interior',
      [f['Assigned Task']]:    'Putty & Primer Coat',
      [f['Entry Purpose']]:    'Interior Work',
      [f['Security Officer']]: 'Ramesh P',
      [f['Status']]:           'Exited',
    },
    {
      [f['Worker']]:           'Murugan Pillai',
      [f['Entry ID']]:         'ENT-2026-00150',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-15',
      [f['Entry Time']]:       '07:00 AM',
      [f['Exit Time']]:        '06:00 PM',
      [f['Entry Gate']]:       'West Gate – Gate 03',
      [f['Contractor']]:       'ABC Steel Contractors',
      [f['Work Area']]:        'Roof Truss Welding – Bay B',
      [f['Assigned Task']]:    'Steel Weld & Grind',
      [f['Entry Purpose']]:    'Structural Erection',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'Exited',
    },
    {
      [f['Worker']]:           'Senthilnathan A',
      [f['Entry ID']]:         'ENT-2026-00151',
      [f['Project']]:          'Prestige Heights Residential',
      [f['Site']]:             'Whitefield – Phase 2',
      [f['Date']]:             '2026-08-15',
      [f['Entry Time']]:       '08:30 AM',
      [f['Exit Time']]:        '05:00 PM',
      [f['Entry Gate']]:       'North Gate – Gate 04',
      [f['Contractor']]:       'Vijay Plumbing',
      [f['Work Area']]:        'Basement – Drainage Chase',
      [f['Assigned Task']]:    'Drain Pipe Installation',
      [f['Entry Purpose']]:    'Plumbing & Drainage',
      [f['Security Officer']]: 'Ramesh P',
      [f['Status']]:           'Exited',
    },
    {
      [f['Worker']]:           'Gomathi Devi',
      [f['Entry ID']]:         'ENT-2026-00152',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-16',
      [f['Entry Time']]:       '08:00 AM',
      [f['Exit Time']]:        '—',
      [f['Entry Gate']]:       'South Gate – Gate 05',
      [f['Contractor']]:       'Arjun Electricals',
      [f['Work Area']]:        'Main Distribution Board Room',
      [f['Assigned Task']]:    'MDB Cable Termination',
      [f['Entry Purpose']]:    'Electrical Work',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'On Site',
    },
    {
      [f['Worker']]:           'Venkatesh P',
      [f['Entry ID']]:         'ENT-2026-00153',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-16',
      [f['Entry Time']]:       '07:15 AM',
      [f['Exit Time']]:        '—',
      [f['Entry Gate']]:       'Main Gate – Gate 01',
      [f['Contractor']]:       'ABC Steel Contractors',
      [f['Work Area']]:        'Column Grid – Row D',
      [f['Assigned Task']]:    'Rebar Cage Assembly',
      [f['Entry Purpose']]:    'Structural Erection',
      [f['Security Officer']]: 'Ramesh P',
      [f['Status']]:           'On Site',
    },
    {
      [f['Worker']]:           'Kavitha Suresh',
      [f['Entry ID']]:         'ENT-2026-00154',
      [f['Project']]:          'Prestige Heights Residential',
      [f['Site']]:             'Whitefield – Phase 2',
      [f['Date']]:             '2026-08-16',
      [f['Entry Time']]:       '09:00 AM',
      [f['Exit Time']]:        '04:00 PM',
      [f['Entry Gate']]:       'East Gate – Gate 02',
      [f['Contractor']]:       'Shine Interiors',
      [f['Work Area']]:        'Kitchen & Bathrooms – Floor 4',
      [f['Assigned Task']]:    'Floor Tile Laying',
      [f['Entry Purpose']]:    'Interior Work',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'Exited',
    },
    {
      [f['Worker']]:           'Radha Krishnan',
      [f['Entry ID']]:         'ENT-2026-00155',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-17',
      [f['Entry Time']]:       '07:30 AM',
      [f['Exit Time']]:        '03:30 PM',
      [f['Entry Gate']]:       'Rear Gate – Gate 06',
      [f['Contractor']]:       'Raj Masonry Works',
      [f['Work Area']]:        'Basement – Material Storage',
      [f['Assigned Task']]:    'Site Cleanup & Waste Disposal',
      [f['Entry Purpose']]:    'Site Maintenance',
      [f['Security Officer']]: 'Ramesh P',
      [f['Status']]:           'Exited',
    },
    {
      [f['Worker']]:           'Anand Selvaraj',
      [f['Entry ID']]:         'ENT-2026-00156',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-17',
      [f['Entry Time']]:       '06:45 AM',
      [f['Exit Time']]:        '05:45 PM',
      [f['Entry Gate']]:       'North Gate – Gate 04',
      [f['Contractor']]:       'Crane Masters Pvt Ltd',
      [f['Work Area']]:        'Crane Operations – Bay 2',
      [f['Assigned Task']]:    'Steel Beam Lift & Position',
      [f['Entry Purpose']]:    'Structural Erection',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'Exited',
    },
    {
      [f['Worker']]:           'Lakshmi Priya',
      [f['Entry ID']]:         'ENT-2026-00157',
      [f['Project']]:          'Prestige Heights Residential',
      [f['Site']]:             'Whitefield – Phase 2',
      [f['Date']]:             '2026-08-17',
      [f['Entry Time']]:       '08:15 AM',
      [f['Exit Time']]:        '—',
      [f['Entry Gate']]:       'West Gate – Gate 03',
      [f['Contractor']]:       'HighWorks Safety Solutions',
      [f['Work Area']]:        'External Scaffold – North Facade',
      [f['Assigned Task']]:    'Scaffold Inspection & Tagging',
      [f['Entry Purpose']]:    'Safety Inspection',
      [f['Security Officer']]: 'Ramesh P',
      [f['Status']]:           'On Site',
    },
    {
      [f['Worker']]:           'Site Engineer – QC',
      [f['Entry ID']]:         'ENT-2026-00158',
      [f['Project']]:          'GreenSteel Industrial Building',
      [f['Site']]:             'Chennai Industrial Site',
      [f['Date']]:             '2026-08-18',
      [f['Entry Time']]:       '—',
      [f['Exit Time']]:        '—',
      [f['Entry Gate']]:       'Main Gate – Gate 01',
      [f['Contractor']]:       'Client Representative',
      [f['Work Area']]:        'All Zones – QC Walk',
      [f['Assigned Task']]:    'Concrete Quality Inspection',
      [f['Entry Purpose']]:    'Inspection',
      [f['Security Officer']]: 'Suresh Kumar',
      [f['Status']]:           'Pending',
    },
    {
      [f['Worker']]:           'Balaraman S',
      [f['Entry ID']]:         'ENT-2026-00159',
      [f['Project']]:          'Prestige Heights Residential',
      [f['Site']]:             'Whitefield – Phase 2',
      [f['Date']]:             '2026-08-18',
      [f['Entry Time']]:       '—',
      [f['Exit Time']]:        '—',
      [f['Entry Gate']]:       'East Gate – Gate 02',
      [f['Contractor']]:       'Raj Masonry Works',
      [f['Work Area']]:        'Block B – Boundary Wall',
      [f['Assigned Task']]:    'Brick Masonry',
      [f['Entry Purpose']]:    'Structural Erection',
      [f['Security Officer']]: 'Ramesh P',
      [f['Status']]:           'Pending',
    },
  ];
}

// ── Safety Induction sample records ──────────────────────────────────────────

function makeSafetyInductionRecords(f) {
  return [
    {
      [f['Induction ID']]:         'IND-2026-00135',
      [f['Worker']]:               'Arjun Selvam',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'BuildPro Civil Works',
      [f['Induction Type']]:       'New Worker Site Induction',
      [f['Induction Date']]:       '2026-08-14',
      [f['Induction Time']]:       '07:00 AM',
      [f['Trainer']]:              'Arun Prakash – Safety Officer',
      [f['Work Area']]:            'Second Floor Formwork',
      [f['Job Role / Trade']]:     'Carpenter',
      [f['Induction Status']]:     'Completed',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '91%',
      [f['Assessment Result']]:    'Passed',
      [f['Certificate No.']]:      'SIC-2026-00135',
      [f['Valid From']]:           '2026-08-14',
      [f['Valid Until']]:          '2027-08-13',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Working at Height',
    },
    {
      [f['Induction ID']]:         'IND-2026-00136',
      [f['Worker']]:               'Preethi Devi',
      [f['Project']]:              'Prestige Heights Residential',
      [f['Site']]:                 'Whitefield – Phase 2',
      [f['Contractor']]:           'Shine Interiors',
      [f['Induction Type']]:       'New Worker Site Induction',
      [f['Induction Date']]:       '2026-08-14',
      [f['Induction Time']]:       '07:30 AM',
      [f['Trainer']]:              'Deepa Rao – HSE Manager',
      [f['Work Area']]:            'Floors 1–3 Interior',
      [f['Job Role / Trade']]:     'Painter',
      [f['Induction Status']]:     'Completed',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '85%',
      [f['Assessment Result']]:    'Passed',
      [f['Certificate No.']]:      'SIC-2026-00136',
      [f['Valid From']]:           '2026-08-14',
      [f['Valid Until']]:          '2027-08-13',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'PPE Requirements',
    },
    {
      [f['Induction ID']]:         'IND-2026-00137',
      [f['Worker']]:               'Murugan Pillai',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'ABC Steel Contractors',
      [f['Induction Type']]:       'Refresher Induction',
      [f['Induction Date']]:       '2026-08-15',
      [f['Induction Time']]:       '06:45 AM',
      [f['Trainer']]:              'Arun Prakash – Safety Officer',
      [f['Work Area']]:            'Roof Truss Welding – Bay B',
      [f['Job Role / Trade']]:     'Welder',
      [f['Induction Status']]:     'Completed',
      [f['Assessment Required']]:  'No',
      [f['Assessment Score']]:     '',
      [f['Assessment Result']]:    'Waived',
      [f['Certificate No.']]:      'SIC-2026-00137',
      [f['Valid From']]:           '2026-08-15',
      [f['Valid Until']]:          '2027-08-14',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Fire Safety',
    },
    {
      [f['Induction ID']]:         'IND-2026-00138',
      [f['Worker']]:               'Senthilnathan A',
      [f['Project']]:              'Prestige Heights Residential',
      [f['Site']]:                 'Whitefield – Phase 2',
      [f['Contractor']]:           'Vijay Plumbing',
      [f['Induction Type']]:       'New Worker Site Induction',
      [f['Induction Date']]:       '2026-08-15',
      [f['Induction Time']]:       '08:00 AM',
      [f['Trainer']]:              'Siva Shankar – Safety Supervisor',
      [f['Work Area']]:            'Basement – Drainage Chase',
      [f['Job Role / Trade']]:     'Plumber',
      [f['Induction Status']]:     'Completed',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '87%',
      [f['Assessment Result']]:    'Passed',
      [f['Certificate No.']]:      'SIC-2026-00138',
      [f['Valid From']]:           '2026-08-15',
      [f['Valid Until']]:          '2027-08-14',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Excavation Safety',
    },
    {
      [f['Induction ID']]:         'IND-2026-00139',
      [f['Worker']]:               'Gomathi Devi',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'Arjun Electricals',
      [f['Induction Type']]:       'Contractor Induction',
      [f['Induction Date']]:       '2026-08-16',
      [f['Induction Time']]:       '07:30 AM',
      [f['Trainer']]:              'Arun Prakash – Safety Officer',
      [f['Work Area']]:            'Main Distribution Board Room',
      [f['Job Role / Trade']]:     'Electrician',
      [f['Induction Status']]:     'Completed',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '96%',
      [f['Assessment Result']]:    'Passed',
      [f['Certificate No.']]:      'SIC-2026-00139',
      [f['Valid From']]:           '2026-08-16',
      [f['Valid Until']]:          '2027-08-15',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Electrical Safety',
    },
    {
      [f['Induction ID']]:         'IND-2026-00140',
      [f['Worker']]:               'Venkatesh P',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'ABC Steel Contractors',
      [f['Induction Type']]:       'Refresher Induction',
      [f['Induction Date']]:       '2026-08-16',
      [f['Induction Time']]:       '07:00 AM',
      [f['Trainer']]:              'Arun Prakash – Safety Officer',
      [f['Work Area']]:            'Column Grid – Row D',
      [f['Job Role / Trade']]:     'Steel Fixer',
      [f['Induction Status']]:     'Completed',
      [f['Assessment Required']]:  'No',
      [f['Assessment Score']]:     '',
      [f['Assessment Result']]:    'Waived',
      [f['Certificate No.']]:      'SIC-2026-00140',
      [f['Valid From']]:           '2026-08-16',
      [f['Valid Until']]:          '2027-08-15',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Lifting & Rigging Safety',
    },
    {
      [f['Induction ID']]:         'IND-2026-00141',
      [f['Worker']]:               'Kavitha Suresh',
      [f['Project']]:              'Prestige Heights Residential',
      [f['Site']]:                 'Whitefield – Phase 2',
      [f['Contractor']]:           'Shine Interiors',
      [f['Induction Type']]:       'Sub-Contractor Induction',
      [f['Induction Date']]:       '2026-08-16',
      [f['Induction Time']]:       '08:30 AM',
      [f['Trainer']]:              'Deepa Rao – HSE Manager',
      [f['Work Area']]:            'Kitchen & Bathrooms – Floor 4',
      [f['Job Role / Trade']]:     'Tile Layer',
      [f['Induction Status']]:     'Completed',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '82%',
      [f['Assessment Result']]:    'Passed',
      [f['Certificate No.']]:      'SIC-2026-00141',
      [f['Valid From']]:           '2026-08-16',
      [f['Valid Until']]:          '2027-08-15',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Site Rules & Regulations',
    },
    {
      [f['Induction ID']]:         'IND-2026-00142',
      [f['Worker']]:               'Radha Krishnan',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'Raj Masonry Works',
      [f['Induction Type']]:       'New Worker Site Induction',
      [f['Induction Date']]:       '2026-08-17',
      [f['Induction Time']]:       '07:15 AM',
      [f['Trainer']]:              'Arun Prakash – Safety Officer',
      [f['Work Area']]:            'Basement – Material Storage',
      [f['Job Role / Trade']]:     'General Labour',
      [f['Induction Status']]:     'Completed',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '78%',
      [f['Assessment Result']]:    'Passed',
      [f['Certificate No.']]:      'SIC-2026-00142',
      [f['Valid From']]:           '2026-08-17',
      [f['Valid Until']]:          '2027-08-16',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Emergency Procedures',
    },
    {
      [f['Induction ID']]:         'IND-2026-00143',
      [f['Worker']]:               'Balaraman S',
      [f['Project']]:              'Prestige Heights Residential',
      [f['Site']]:                 'Whitefield – Phase 2',
      [f['Contractor']]:           'Raj Masonry Works',
      [f['Induction Type']]:       'Refresher Induction',
      [f['Induction Date']]:       '2026-08-18',
      [f['Induction Time']]:       '08:00 AM',
      [f['Trainer']]:              'Siva Shankar – Safety Supervisor',
      [f['Work Area']]:            'Block B – Boundary Wall',
      [f['Job Role / Trade']]:     'Mason',
      [f['Induction Status']]:     'Pending',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '',
      [f['Assessment Result']]:    'Not Attempted',
      [f['Certificate No.']]:      '',
      [f['Valid From']]:           '',
      [f['Valid Until']]:          '',
      [f['Worker Signature']]:     'Pending',
      [f['Trainer Signature']]:    'Pending',
      [f['Induction Topics']]:     'First Aid',
    },
    {
      [f['Induction ID']]:         'IND-2026-00144',
      [f['Worker']]:               'Site Engineer – QC',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'Client Representative',
      [f['Induction Type']]:       'Visitor Induction',
      [f['Induction Date']]:       '2026-08-18',
      [f['Induction Time']]:       '09:00 AM',
      [f['Trainer']]:              'Arun Prakash – Safety Officer',
      [f['Work Area']]:            'All Zones',
      [f['Job Role / Trade']]:     'Quality Engineer',
      [f['Induction Status']]:     'Pending',
      [f['Assessment Required']]:  'No',
      [f['Assessment Score']]:     '',
      [f['Assessment Result']]:    'Not Attempted',
      [f['Certificate No.']]:      '',
      [f['Valid From']]:           '',
      [f['Valid Until']]:          '',
      [f['Worker Signature']]:     'Pending',
      [f['Trainer Signature']]:    'Pending',
      [f['Induction Topics']]:     'Emergency Procedures',
    },
    {
      [f['Induction ID']]:         'IND-2026-00145',
      [f['Worker']]:               'Durai Murugan',
      [f['Project']]:              'GreenSteel Industrial Building',
      [f['Site']]:                 'Chennai Industrial Site',
      [f['Contractor']]:           'BuildPro Civil Works',
      [f['Induction Type']]:       'New Worker Site Induction',
      [f['Induction Date']]:       '2026-07-15',
      [f['Induction Time']]:       '07:30 AM',
      [f['Trainer']]:              'Arun Prakash – Safety Officer',
      [f['Work Area']]:            'All Zones',
      [f['Job Role / Trade']]:     'General Labour',
      [f['Induction Status']]:     'Expired',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '74%',
      [f['Assessment Result']]:    'Passed',
      [f['Certificate No.']]:      'SIC-2026-00145',
      [f['Valid From']]:           '2026-07-15',
      [f['Valid Until']]:          '2026-08-14',
      [f['Worker Signature']]:     'Completed',
      [f['Trainer Signature']]:    'Completed',
      [f['Induction Topics']]:     'Site Rules & Regulations',
    },
    {
      [f['Induction ID']]:         'IND-2026-00146',
      [f['Worker']]:               'Prakash Nair',
      [f['Project']]:              'Prestige Heights Residential',
      [f['Site']]:                 'Whitefield – Phase 2',
      [f['Contractor']]:           'HighWorks Safety Solutions',
      [f['Induction Type']]:       'Contractor Induction',
      [f['Induction Date']]:       '2026-08-19',
      [f['Induction Time']]:       '08:00 AM',
      [f['Trainer']]:              'Deepa Rao – HSE Manager',
      [f['Work Area']]:            'Scaffold – South Facade',
      [f['Job Role / Trade']]:     'Scaffold Supervisor',
      [f['Induction Status']]:     'In Progress',
      [f['Assessment Required']]:  'Yes',
      [f['Assessment Score']]:     '',
      [f['Assessment Result']]:    'Not Attempted',
      [f['Certificate No.']]:      '',
      [f['Valid From']]:           '',
      [f['Valid Until']]:          '',
      [f['Worker Signature']]:     'Pending',
      [f['Trainer Signature']]:    'Pending',
      [f['Induction Topics']]:     'Working at Height',
    },
  ];
}

// ── Seed a single module ──────────────────────────────────────────────────────

// Cache the module list so we only fetch it once
let _allModules = null;
async function getAllModules() {
  if (!_allModules) _allModules = await apiGet('/custom-modules');
  return _allModules;
}

async function seedModule(moduleId, uniqueFieldLabel, getRecordsFn, label) {
  console.log(`\n  📂 Module ID: ${moduleId}`);

  // Fetch module details (fields) via the list endpoint
  const allModules = await getAllModules();
  const mod = allModules.find((m) => String(m.id) === String(moduleId));
  if (!mod) {
    console.log(`    ⚠  Module ${moduleId} not found in list, skipping.`);
    return { added: 0, skipped: 0 };
  }
  const fields = typeof mod.fields === 'string' ? JSON.parse(mod.fields) : mod.fields;
  if (!fields || fields.length === 0) {
    console.log('    ⚠  No fields found, skipping.');
    return { added: 0, skipped: 0 };
  }
  const f = fieldMap(fields);

  // Fetch existing records to detect duplicates
  const existing = await apiGet(`/custom-modules/${moduleId}/records`);
  const uniqueField = fields.find((x) => x.label === uniqueFieldLabel);
  const existingIds = new Set(existing.map((r) => r[uniqueField?.id] ?? ''));
  console.log(`    ℹ  ${existing.length} existing records. Duplicate check on "${uniqueFieldLabel}".`);

  // Build new records
  const newRecords = getRecordsFn(f);
  let added = 0;
  let skipped = 0;

  for (const record of newRecords) {
    const uid = record[f[uniqueFieldLabel]];
    if (existingIds.has(uid)) {
      console.log(`    ⏭  Skip (exists): ${uid}`);
      skipped++;
      continue;
    }
    const created = await apiPost(`/custom-modules/${moduleId}/records`, { data: record });
    console.log(`    ➕ ${uid}  (record id=${created.id})`);
    added++;
  }

  console.log(`    ✅ ${added} added, ${skipped} skipped. Total now: ${existing.length + added}`);
  return { added, skipped };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🏗  BuildTrack — Bulk Sample Data Seeder');
  console.log('   Workers · Site Entry · Safety Induction\n');
  console.log(`   Backend: ${BASE}\n`);

  const totals = { added: 0, skipped: 0 };

  // ── 👷 Workers ────────────────────────────────────────────────────────────
  console.log('👷 WORKERS');
  for (const id of MODULE_IDS.workers) {
    const r = await seedModule(id, 'Worker ID', makeWorkerRecords, 'Workers');
    totals.added += r.added;
    totals.skipped += r.skipped;
  }

  // ── 🚧 Site Entry ─────────────────────────────────────────────────────────
  console.log('\n🚧 SITE ENTRY');
  for (const id of MODULE_IDS.siteEntry) {
    const r = await seedModule(id, 'Entry ID', makeSiteEntryRecords, 'Site Entry');
    totals.added += r.added;
    totals.skipped += r.skipped;
  }

  // ── 🦺 Safety Induction ───────────────────────────────────────────────────
  console.log('\n🦺 SAFETY INDUCTION');
  for (const id of MODULE_IDS.safetyInduction) {
    const r = await seedModule(id, 'Induction ID', makeSafetyInductionRecords, 'Safety Induction');
    totals.added += r.added;
    totals.skipped += r.skipped;
  }

  console.log(`\n\n🎉 All done! Total added: ${totals.added}, skipped: ${totals.skipped}`);
}

main().catch((err) => {
  console.error('\n❌ Failed:', err.message || err);
  process.exit(1);
});
