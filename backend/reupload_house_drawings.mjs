/**
 * reupload_house_drawings.mjs
 *
 * Re-uploads all 6 House Building Project drawings via multipart POST /api/drawings/upload
 * so they are stored in Stratus (not truncated base64 in DataStore).
 *
 * After each upload a new drawing ID is created.  We then:
 *   1. Copy over the milestoneId from the old drawing.
 *   2. Re-link all tasks from the old drawing to the new drawing.
 *   3. Copy columnPositions from the old drawing (if any).
 *   4. Delete the old drawing.
 *
 * Run: node reupload_house_drawings.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';
const PID  = 'b0af18f2-99dc-4ab8-8496-09d779343c8b';   // House Building Project

// ── SVG generators (compact but complete) ─────────────────────────────────────

function foundationSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="950" viewBox="0 0 1600 950">
<rect width="1600" height="950" fill="#f9f4ea"/>
<rect x="20" y="20" width="1560" height="910" fill="none" stroke="#5c3d11" stroke-width="3"/>
<text x="620" y="65" font-size="26" fill="#5c3d11" font-family="sans-serif" font-weight="bold" text-anchor="middle">FOUNDATION PLAN – HOUSE BUILDING PROJECT  HBP-FND-001</text>
<!-- grid dashed lines -->
<line x1="200" y1="100" x2="200" y2="820" stroke="#8B6914" stroke-width="1.5" stroke-dasharray="8 5"/>
<line x1="580" y1="100" x2="580" y2="820" stroke="#8B6914" stroke-width="1.5" stroke-dasharray="8 5"/>
<line x1="960" y1="100" x2="960" y2="820" stroke="#8B6914" stroke-width="1.5" stroke-dasharray="8 5"/>
<line x1="150" y1="200" x2="1050" y2="200" stroke="#8B6914" stroke-width="1.5" stroke-dasharray="8 5"/>
<line x1="150" y1="600" x2="1050" y2="600" stroke="#8B6914" stroke-width="1.5" stroke-dasharray="8 5"/>
<!-- grade beams -->
<line x1="230" y1="200" x2="550" y2="200" stroke="#8B6914" stroke-width="10" stroke-linecap="round"/>
<line x1="610" y1="200" x2="930" y2="200" stroke="#8B6914" stroke-width="10" stroke-linecap="round"/>
<line x1="230" y1="600" x2="550" y2="600" stroke="#8B6914" stroke-width="10" stroke-linecap="round"/>
<line x1="610" y1="600" x2="930" y2="600" stroke="#8B6914" stroke-width="10" stroke-linecap="round"/>
<line x1="200" y1="230" x2="200" y2="570" stroke="#8B6914" stroke-width="10" stroke-linecap="round"/>
<line x1="580" y1="230" x2="580" y2="570" stroke="#8B6914" stroke-width="10" stroke-linecap="round"/>
<line x1="960" y1="230" x2="960" y2="570" stroke="#8B6914" stroke-width="10" stroke-linecap="round"/>
<!-- footings -->
<rect x="170" y="170" width="60" height="60" fill="#d4b483" stroke="#5c3d11" stroke-width="2.5"/>
<rect x="182" y="182" width="36" height="36" fill="#c8a45a" stroke="#5c3d11" stroke-width="1.5"/>
<rect x="550" y="170" width="60" height="60" fill="#d4b483" stroke="#5c3d11" stroke-width="2.5"/>
<rect x="562" y="182" width="36" height="36" fill="#c8a45a" stroke="#5c3d11" stroke-width="1.5"/>
<rect x="930" y="170" width="60" height="60" fill="#d4b483" stroke="#5c3d11" stroke-width="2.5"/>
<rect x="942" y="182" width="36" height="36" fill="#c8a45a" stroke="#5c3d11" stroke-width="1.5"/>
<rect x="170" y="570" width="60" height="60" fill="#d4b483" stroke="#5c3d11" stroke-width="2.5"/>
<rect x="182" y="582" width="36" height="36" fill="#c8a45a" stroke="#5c3d11" stroke-width="1.5"/>
<rect x="550" y="570" width="60" height="60" fill="#d4b483" stroke="#5c3d11" stroke-width="2.5"/>
<rect x="562" y="582" width="36" height="36" fill="#c8a45a" stroke="#5c3d11" stroke-width="1.5"/>
<rect x="930" y="570" width="60" height="60" fill="#d4b483" stroke="#5c3d11" stroke-width="2.5"/>
<rect x="942" y="582" width="36" height="36" fill="#c8a45a" stroke="#5c3d11" stroke-width="1.5"/>
<!-- col labels -->
<circle cx="200" cy="110" r="18" fill="#fff" stroke="#5c3d11" stroke-width="2"/>
<text x="200" y="116" font-size="16" fill="#5c3d11" font-family="sans-serif" text-anchor="middle" font-weight="bold">A</text>
<circle cx="580" cy="110" r="18" fill="#fff" stroke="#5c3d11" stroke-width="2"/>
<text x="580" y="116" font-size="16" fill="#5c3d11" font-family="sans-serif" text-anchor="middle" font-weight="bold">B</text>
<circle cx="960" cy="110" r="18" fill="#fff" stroke="#5c3d11" stroke-width="2"/>
<text x="960" y="116" font-size="16" fill="#5c3d11" font-family="sans-serif" text-anchor="middle" font-weight="bold">C</text>
<!-- row labels -->
<circle cx="110" cy="200" r="18" fill="#fff" stroke="#5c3d11" stroke-width="2"/>
<text x="110" y="206" font-size="16" fill="#5c3d11" font-family="sans-serif" text-anchor="middle" font-weight="bold">1</text>
<circle cx="110" cy="600" r="18" fill="#fff" stroke="#5c3d11" stroke-width="2"/>
<text x="110" y="606" font-size="16" fill="#5c3d11" font-family="sans-serif" text-anchor="middle" font-weight="bold">2</text>
<!-- dim lines -->
<line x1="200" y1="845" x2="580" y2="845" stroke="#333" stroke-width="1"/>
<line x1="580" y1="845" x2="960" y2="845" stroke="#333" stroke-width="1"/>
<text x="390" y="838" font-size="12" fill="#333" font-family="sans-serif" text-anchor="middle">7200</text>
<text x="770" y="838" font-size="12" fill="#333" font-family="sans-serif" text-anchor="middle">7200</text>
<text x="60" y="870" font-size="14" fill="#555" font-family="sans-serif">Scale 1:100  |  All dims in mm  |  Concrete M25  |  Footing depth 1500 BGL</text>
</svg>`;
}

function groundFloorSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="950" viewBox="0 0 1600 950">
<rect width="1600" height="950" fill="#fafaf8"/>
<rect x="20" y="20" width="1560" height="910" fill="none" stroke="#333" stroke-width="3"/>
<text x="620" y="65" font-size="26" fill="#333" font-family="sans-serif" font-weight="bold" text-anchor="middle">GROUND FLOOR PLAN – HOUSE BUILDING PROJECT  HBP-GF-002</text>
<!-- rooms -->
<rect x="170" y="170" width="260" height="350" fill="#fff8f0" stroke="#555" stroke-width="2.5"/>
<text x="300" y="355" font-size="16" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">Living / Dining</text>
<rect x="450" y="170" width="250" height="170" fill="#f0f8ff" stroke="#555" stroke-width="2.5"/>
<text x="575" y="260" font-size="14" fill="#333" font-family="sans-serif" text-anchor="middle">Master Bedroom</text>
<rect x="720" y="170" width="260" height="170" fill="#f0fff0" stroke="#555" stroke-width="2.5"/>
<text x="850" y="260" font-size="14" fill="#333" font-family="sans-serif" text-anchor="middle">Bedroom 2</text>
<rect x="450" y="360" width="105" height="160" fill="#fff0f0" stroke="#555" stroke-width="2.5"/>
<text x="502" y="445" font-size="13" fill="#333" font-family="sans-serif" text-anchor="middle">Toilet</text>
<rect x="565" y="360" width="145" height="160" fill="#f5f0ff" stroke="#555" stroke-width="2.5"/>
<text x="637" y="445" font-size="13" fill="#333" font-family="sans-serif" text-anchor="middle">Bathroom</text>
<rect x="720" y="360" width="260" height="160" fill="#f0ffff" stroke="#555" stroke-width="2.5"/>
<text x="850" y="445" font-size="14" fill="#333" font-family="sans-serif" text-anchor="middle">Bedroom 3</text>
<rect x="170" y="560" width="175" height="220" fill="#fffdf0" stroke="#555" stroke-width="2.5"/>
<text x="257" y="675" font-size="14" fill="#333" font-family="sans-serif" text-anchor="middle">Kitchen</text>
<rect x="355" y="560" width="620" height="220" fill="#fff0f8" stroke="#555" stroke-width="2.5"/>
<text x="665" y="675" font-size="16" fill="#333" font-family="sans-serif" text-anchor="middle">Garage</text>
<!-- walls / grid -->
<line x1="170" y1="170" x2="1000" y2="170" stroke="#333" stroke-width="10" stroke-linecap="round"/>
<line x1="170" y1="550" x2="1000" y2="550" stroke="#333" stroke-width="10" stroke-linecap="round"/>
<line x1="170" y1="780" x2="1000" y2="780" stroke="#333" stroke-width="10" stroke-linecap="round"/>
<line x1="170" y1="170" x2="170" y2="780" stroke="#333" stroke-width="10" stroke-linecap="round"/>
<line x1="440" y1="170" x2="440" y2="780" stroke="#333" stroke-width="10" stroke-linecap="round"/>
<line x1="710" y1="170" x2="710" y2="780" stroke="#333" stroke-width="10" stroke-linecap="round"/>
<line x1="1000" y1="170" x2="1000" y2="780" stroke="#333" stroke-width="10" stroke-linecap="round"/>
<!-- col labels -->
<circle cx="200" cy="110" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
<text x="200" y="116" font-size="16" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">A</text>
<circle cx="510" cy="110" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
<text x="510" y="116" font-size="16" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">B</text>
<circle cx="780" cy="110" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
<text x="780" y="116" font-size="16" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">C</text>
<circle cx="1050" cy="110" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
<text x="1050" y="116" font-size="16" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">D</text>
<!-- row labels -->
<circle cx="110" cy="355" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
<text x="110" y="361" font-size="16" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">1</text>
<circle cx="110" cy="660" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
<text x="110" y="666" font-size="16" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">2</text>
<text x="60" y="880" font-size="14" fill="#555" font-family="sans-serif">Scale 1:100  |  All dims in mm  |  Walls 230mm brick CM 1:6</text>
</svg>`;
}

function roofSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="950" viewBox="0 0 1600 950">
<rect width="1600" height="950" fill="#f8f4ee"/>
<rect x="20" y="20" width="1560" height="910" fill="none" stroke="#333" stroke-width="3"/>
<text x="620" y="65" font-size="26" fill="#333" font-family="sans-serif" font-weight="bold" text-anchor="middle">ROOF PLAN – HOUSE BUILDING PROJECT  HBP-RF-003</text>
<!-- roof outline diamond -->
<polygon points="600,100 1050,440 600,820 150,440" fill="#e8d8c0" stroke="#7a5c2e" stroke-width="4"/>
<!-- ridge line -->
<line x1="600" y1="100" x2="600" y2="820" stroke="#5c4324" stroke-width="3" stroke-dasharray="10 5"/>
<!-- rafters -->
<line x1="600" y1="150" x2="1020" y2="440" stroke="#a08060" stroke-width="1.5" stroke-dasharray="5 4"/>
<line x1="600" y1="240" x2="1020" y2="440" stroke="#a08060" stroke-width="1.5" stroke-dasharray="5 4"/>
<line x1="600" y1="340" x2="1020" y2="440" stroke="#a08060" stroke-width="1.5" stroke-dasharray="5 4"/>
<line x1="600" y1="540" x2="1020" y2="440" stroke="#a08060" stroke-width="1.5" stroke-dasharray="5 4"/>
<line x1="600" y1="640" x2="1020" y2="440" stroke="#a08060" stroke-width="1.5" stroke-dasharray="5 4"/>
<line x1="600" y1="740" x2="1020" y2="440" stroke="#a08060" stroke-width="1.5" stroke-dasharray="5 4"/>
<line x1="600" y1="150" x2="180" y2="440" stroke="#a08060" stroke-width="1.5" stroke-dasharray="5 4"/>
<line x1="600" y1="240" x2="180" y2="440" stroke="#a08060" stroke-width="1.5" stroke-dasharray="5 4"/>
<line x1="600" y1="340" x2="180" y2="440" stroke="#a08060" stroke-width="1.5" stroke-dasharray="5 4"/>
<line x1="600" y1="540" x2="180" y2="440" stroke="#a08060" stroke-width="1.5" stroke-dasharray="5 4"/>
<line x1="600" y1="640" x2="180" y2="440" stroke="#a08060" stroke-width="1.5" stroke-dasharray="5 4"/>
<line x1="600" y1="740" x2="180" y2="440" stroke="#a08060" stroke-width="1.5" stroke-dasharray="5 4"/>
<!-- grid -->
<line x1="340" y1="100" x2="340" y2="820" stroke="#bbb" stroke-width="1" stroke-dasharray="6 4"/>
<line x1="600" y1="100" x2="600" y2="820" stroke="#bbb" stroke-width="1" stroke-dasharray="6 4"/>
<line x1="860" y1="100" x2="860" y2="820" stroke="#bbb" stroke-width="1" stroke-dasharray="6 4"/>
<line x1="150" y1="220" x2="1050" y2="220" stroke="#bbb" stroke-width="1" stroke-dasharray="6 4"/>
<line x1="150" y1="440" x2="1050" y2="440" stroke="#bbb" stroke-width="1" stroke-dasharray="6 4"/>
<line x1="150" y1="660" x2="1050" y2="660" stroke="#bbb" stroke-width="1" stroke-dasharray="6 4"/>
<!-- col labels -->
<circle cx="340" cy="110" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
<text x="340" y="116" font-size="16" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">A</text>
<circle cx="600" cy="110" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
<text x="600" y="116" font-size="16" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">B</text>
<circle cx="860" cy="110" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
<text x="860" y="116" font-size="16" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">C</text>
<!-- row labels -->
<circle cx="110" cy="220" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
<text x="110" y="226" font-size="16" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">1</text>
<circle cx="110" cy="440" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
<text x="110" y="446" font-size="16" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">2</text>
<circle cx="110" cy="660" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
<text x="110" y="666" font-size="16" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">3</text>
<text x="60" y="880" font-size="14" fill="#555" font-family="sans-serif">Scale 1:100  |  Pitch 30 deg  |  Clay tiles  |  Overhang 600mm</text>
</svg>`;
}

function electricalSvg() {
  const symbols = [
    {x:150,y:180,label:'DB1'},{x:380,y:180,label:'L1'},{x:600,y:180,label:'L2'},
    {x:820,y:180,label:'Fan'},{x:1040,y:180,label:'L3'},{x:1260,y:180,label:'AC1'},
    {x:150,y:440,label:'L4'},{x:380,y:440,label:'S1'},{x:600,y:440,label:'L5'},
    {x:820,y:440,label:'S2'},{x:1040,y:440,label:'DB2'},{x:1260,y:440,label:'L6'},
    {x:150,y:700,label:'AC2'},{x:380,y:700,label:'L7'},{x:600,y:700,label:'S3'},
    {x:820,y:700,label:'Fan2'},{x:1040,y:700,label:'L8'},{x:1260,y:700,label:'EXT'},
  ];
  const circles = symbols.map(s =>
    `<circle cx="${s.x}" cy="${s.y}" r="28" fill="#fef9c3" stroke="#ca8a04" stroke-width="3"/>` +
    `<text x="${s.x}" y="${s.y+6}" font-size="14" fill="#92400e" font-family="sans-serif" text-anchor="middle" font-weight="bold">${s.label}</text>`
  ).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="950" viewBox="0 0 1600 950">
<rect width="1600" height="950" fill="#fefce8"/>
<rect x="20" y="20" width="1560" height="910" fill="none" stroke="#ca8a04" stroke-width="3"/>
<text x="620" y="65" font-size="24" fill="#92400e" font-family="sans-serif" font-weight="bold" text-anchor="middle">ELECTRICAL LAYOUT PLAN – HOUSE BUILDING PROJECT  HBP-EL-004</text>
<line x1="150" y1="180" x2="1260" y2="180" stroke="#ca8a04" stroke-width="2"/>
<line x1="150" y1="440" x2="1260" y2="440" stroke="#ca8a04" stroke-width="2"/>
<line x1="150" y1="700" x2="1260" y2="700" stroke="#ca8a04" stroke-width="2"/>
${circles}
<line x1="150" y1="100" x2="150" y2="800" stroke="#aaa" stroke-width="1" stroke-dasharray="6 4"/>
<line x1="380" y1="100" x2="380" y2="800" stroke="#aaa" stroke-width="1" stroke-dasharray="6 4"/>
<line x1="600" y1="100" x2="600" y2="800" stroke="#aaa" stroke-width="1" stroke-dasharray="6 4"/>
<line x1="820" y1="100" x2="820" y2="800" stroke="#aaa" stroke-width="1" stroke-dasharray="6 4"/>
<line x1="1040" y1="100" x2="1040" y2="800" stroke="#aaa" stroke-width="1" stroke-dasharray="6 4"/>
<line x1="1260" y1="100" x2="1260" y2="800" stroke="#aaa" stroke-width="1" stroke-dasharray="6 4"/>
<circle cx="150" cy="110" r="18" fill="#fff" stroke="#ca8a04" stroke-width="2"/>
<text x="150" y="116" font-size="14" fill="#92400e" font-family="sans-serif" text-anchor="middle" font-weight="bold">A</text>
<circle cx="380" cy="110" r="18" fill="#fff" stroke="#ca8a04" stroke-width="2"/>
<text x="380" y="116" font-size="14" fill="#92400e" font-family="sans-serif" text-anchor="middle" font-weight="bold">B</text>
<circle cx="600" cy="110" r="18" fill="#fff" stroke="#ca8a04" stroke-width="2"/>
<text x="600" y="116" font-size="14" fill="#92400e" font-family="sans-serif" text-anchor="middle" font-weight="bold">C</text>
<circle cx="820" cy="110" r="18" fill="#fff" stroke="#ca8a04" stroke-width="2"/>
<text x="820" y="116" font-size="14" fill="#92400e" font-family="sans-serif" text-anchor="middle" font-weight="bold">D</text>
<circle cx="1040" cy="110" r="18" fill="#fff" stroke="#ca8a04" stroke-width="2"/>
<text x="1040" y="116" font-size="14" fill="#92400e" font-family="sans-serif" text-anchor="middle" font-weight="bold">E</text>
<circle cx="1260" cy="110" r="18" fill="#fff" stroke="#ca8a04" stroke-width="2"/>
<text x="1260" y="116" font-size="14" fill="#92400e" font-family="sans-serif" text-anchor="middle" font-weight="bold">F</text>
<circle cx="100" cy="180" r="18" fill="#fff" stroke="#ca8a04" stroke-width="2"/>
<text x="100" y="186" font-size="14" fill="#92400e" font-family="sans-serif" text-anchor="middle" font-weight="bold">1</text>
<circle cx="100" cy="440" r="18" fill="#fff" stroke="#ca8a04" stroke-width="2"/>
<text x="100" y="446" font-size="14" fill="#92400e" font-family="sans-serif" text-anchor="middle" font-weight="bold">2</text>
<circle cx="100" cy="700" r="18" fill="#fff" stroke="#ca8a04" stroke-width="2"/>
<text x="100" y="706" font-size="14" fill="#92400e" font-family="sans-serif" text-anchor="middle" font-weight="bold">3</text>
<text x="60" y="880" font-size="13" fill="#555" font-family="sans-serif">L=Light  S=Socket  DB=Distribution Board  AC=Air Conditioner  Fan=Ceiling Fan  EXT=External</text>
</svg>`;
}

function plumbingSvg() {
  const fixtures = [
    {x:200,y:230,label:'WC1',color:'#60a5fa'},{x:480,y:230,label:'Basin1',color:'#60a5fa'},
    {x:760,y:230,label:'WC2',color:'#60a5fa'},{x:1040,y:230,label:'Shower',color:'#60a5fa'},
    {x:200,y:560,label:'Sink',color:'#34d399'},{x:480,y:560,label:'Drain',color:'#34d399'},
    {x:760,y:560,label:'Bath',color:'#34d399'},{x:1040,y:560,label:'Basin2',color:'#34d399'},
    {x:200,y:720,label:'Geyser',color:'#fbbf24'},{x:480,y:720,label:'Sump',color:'#fbbf24'},
    {x:760,y:720,label:'Tank',color:'#fbbf24'},{x:1040,y:720,label:'Pump',color:'#fbbf24'},
  ];
  const rects = fixtures.map(f =>
    `<rect x="${f.x-42}" y="${f.y-26}" width="84" height="52" rx="6" fill="${f.color}" stroke="#1e40af" stroke-width="2"/>` +
    `<text x="${f.x}" y="${f.y+7}" font-size="14" fill="#1e3a8a" font-family="sans-serif" text-anchor="middle" font-weight="bold">${f.label}</text>`
  ).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="950" viewBox="0 0 1600 950">
<rect width="1600" height="950" fill="#f0f8ff"/>
<rect x="20" y="20" width="1560" height="910" fill="none" stroke="#1e40af" stroke-width="3"/>
<text x="620" y="65" font-size="23" fill="#1e40af" font-family="sans-serif" font-weight="bold" text-anchor="middle">PLUMBING AND DRAINAGE PLAN – HOUSE BUILDING PROJECT  HBP-PL-005</text>
<line x1="100" y1="460" x2="1200" y2="460" stroke="#3b82f6" stroke-width="5"/>
<line x1="640" y1="120" x2="640" y2="820" stroke="#3b82f6" stroke-width="5"/>
<line x1="100" y1="540" x2="1200" y2="540" stroke="#16a34a" stroke-width="4" stroke-dasharray="14 6"/>
<line x1="480" y1="120" x2="480" y2="820" stroke="#16a34a" stroke-width="4" stroke-dasharray="14 6"/>
${rects}
<line x1="200" y1="120" x2="200" y2="820" stroke="#bbb" stroke-width="1" stroke-dasharray="6 4"/>
<line x1="480" y1="120" x2="480" y2="820" stroke="#bbb" stroke-width="1" stroke-dasharray="3 3"/>
<line x1="760" y1="120" x2="760" y2="820" stroke="#bbb" stroke-width="1" stroke-dasharray="6 4"/>
<line x1="1040" y1="120" x2="1040" y2="820" stroke="#bbb" stroke-width="1" stroke-dasharray="6 4"/>
<circle cx="200" cy="110" r="18" fill="#fff" stroke="#1e40af" stroke-width="2"/>
<text x="200" y="116" font-size="14" fill="#1e40af" font-family="sans-serif" text-anchor="middle" font-weight="bold">A</text>
<circle cx="480" cy="110" r="18" fill="#fff" stroke="#1e40af" stroke-width="2"/>
<text x="480" y="116" font-size="14" fill="#1e40af" font-family="sans-serif" text-anchor="middle" font-weight="bold">B</text>
<circle cx="760" cy="110" r="18" fill="#fff" stroke="#1e40af" stroke-width="2"/>
<text x="760" y="116" font-size="14" fill="#1e40af" font-family="sans-serif" text-anchor="middle" font-weight="bold">C</text>
<circle cx="1040" cy="110" r="18" fill="#fff" stroke="#1e40af" stroke-width="2"/>
<text x="1040" y="116" font-size="14" fill="#1e40af" font-family="sans-serif" text-anchor="middle" font-weight="bold">D</text>
<circle cx="100" cy="230" r="18" fill="#fff" stroke="#1e40af" stroke-width="2"/>
<text x="100" y="236" font-size="14" fill="#1e40af" font-family="sans-serif" text-anchor="middle" font-weight="bold">1</text>
<circle cx="100" cy="560" r="18" fill="#fff" stroke="#1e40af" stroke-width="2"/>
<text x="100" y="566" font-size="14" fill="#1e40af" font-family="sans-serif" text-anchor="middle" font-weight="bold">2</text>
<circle cx="100" cy="720" r="18" fill="#fff" stroke="#1e40af" stroke-width="2"/>
<text x="100" y="726" font-size="14" fill="#1e40af" font-family="sans-serif" text-anchor="middle" font-weight="bold">3</text>
<text x="60" y="880" font-size="14" fill="#555" font-family="sans-serif">Blue = Water Supply  |  Dashed Green = Drainage  |  All pipes CPVC/uPVC</text>
</svg>`;
}

function finishingSvg() {
  const rooms = [
    {x:170,y:170,w:250,h:350,color:'#fff8f0',label:'Living / Dining'},{x:440,y:170,w:240,h:170,color:'#f0f8ff',label:'Master Bedroom'},
    {x:700,y:170,w:250,h:170,color:'#f0fff0',label:'Bedroom 2'},{x:440,y:360,w:105,h:160,color:'#fff0f0',label:'Toilet'},
    {x:555,y:360,w:145,h:160,color:'#f5f0ff',label:'Bathroom'},{x:700,y:360,w:250,h:160,color:'#f0ffff',label:'Bedroom 3'},
    {x:170,y:550,w:175,h:210,color:'#fffdf0',label:'Kitchen'},{x:355,y:550,w:610,h:210,color:'#fff0f8',label:'Garage'},
  ];
  const roomsSvg = rooms.map(r =>
    `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="${r.color}" stroke="#888" stroke-width="2.5"/>` +
    `<text x="${r.x + r.w/2}" y="${r.y + r.h/2 + 6}" font-size="13" fill="#444" font-family="sans-serif" text-anchor="middle">${r.label}</text>`
  ).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="950" viewBox="0 0 1600 950">
<rect width="1600" height="950" fill="#fafaf8"/>
<rect x="20" y="20" width="1560" height="910" fill="none" stroke="#333" stroke-width="3"/>
<text x="620" y="65" font-size="24" fill="#333" font-family="sans-serif" font-weight="bold" text-anchor="middle">INTERIOR FINISHING PLAN – HOUSE BUILDING PROJECT  HBP-INT-006</text>
${roomsSvg}
<line x1="170" y1="170" x2="980" y2="170" stroke="#333" stroke-width="9" stroke-linecap="round"/>
<line x1="170" y1="540" x2="980" y2="540" stroke="#333" stroke-width="9" stroke-linecap="round"/>
<line x1="170" y1="760" x2="980" y2="760" stroke="#333" stroke-width="9" stroke-linecap="round"/>
<line x1="170" y1="170" x2="170" y2="760" stroke="#333" stroke-width="9" stroke-linecap="round"/>
<line x1="430" y1="170" x2="430" y2="760" stroke="#333" stroke-width="9" stroke-linecap="round"/>
<line x1="700" y1="170" x2="700" y2="760" stroke="#333" stroke-width="9" stroke-linecap="round"/>
<line x1="980" y1="170" x2="980" y2="760" stroke="#333" stroke-width="9" stroke-linecap="round"/>
<circle cx="200" cy="110" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
<text x="200" y="116" font-size="16" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">A</text>
<circle cx="480" cy="110" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
<text x="480" y="116" font-size="16" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">B</text>
<circle cx="760" cy="110" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
<text x="760" y="116" font-size="16" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">C</text>
<circle cx="1020" cy="110" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
<text x="1020" y="116" font-size="16" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">D</text>
<circle cx="110" cy="355" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
<text x="110" y="361" font-size="16" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">1</text>
<circle cx="110" cy="640" r="18" fill="#fff" stroke="#333" stroke-width="2"/>
<text x="110" y="646" font-size="16" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">2</text>
<text x="60" y="870" font-size="14" fill="#555" font-family="sans-serif">Tiles: Kajaria vitrified 600x600  |  Paint: Asian Paints Royale  |  Doors: Teak wood main, HDF internal</text>
</svg>`;
}

// ── Milestones from first seed ──────────────────────────────────────────────────
const MS = {
  foundation: '3d9bae5a-3965-4467-b707-f131e2e1cec6',
  structural:  '79c443f3-517c-4099-a47b-69dca2905298',
  roofing:     '6883bb07-59c3-41ef-a319-7dc224835380',
  mep:         '8bed5e93-c85f-446a-a830-7c6ea24de401',
  finishing:   '47cc2711-099b-4e68-8ffb-6c35284372fa',
};

const OLD_DRAWINGS = {
  foundation:  'e59af3f9-846c-4b0b-9aaf-438fb01a77e5',
  groundFloor: '13cafecc-9ebb-4822-8f32-25357a29df89',
  roof:        'fa786584-1129-4b72-9abc-309716a40124',
  electrical:  '32367211-4d21-42e6-8912-af455f0b46f4',
  plumbing:    '59ee9c04-cb62-414b-84d2-08092b5a6788',
  finishing:   '87c4e225-6a5d-4f64-b1ec-fc5e74f59918',
};

const PLAN = [
  { key: 'foundation',  name: 'Foundation Plan',           svg: foundationSvg,  msId: MS.foundation, gridCols: 3, gridRows: 2 },
  { key: 'groundFloor', name: 'Ground Floor Plan',          svg: groundFloorSvg, msId: MS.structural, gridCols: 4, gridRows: 2 },
  { key: 'roof',        name: 'Roof Plan',                  svg: roofSvg,        msId: MS.roofing,    gridCols: 3, gridRows: 3 },
  { key: 'electrical',  name: 'Electrical Layout Plan',     svg: electricalSvg,  msId: MS.mep,        gridCols: 6, gridRows: 3 },
  { key: 'plumbing',    name: 'Plumbing and Drainage Plan', svg: plumbingSvg,    msId: MS.mep,        gridCols: 4, gridRows: 3 },
  { key: 'finishing',   name: 'Interior Finishing Plan',    svg: finishingSvg,   msId: MS.finishing,  gridCols: 4, gridRows: 3 },
];

async function json(url, opts = {}) {
  const r = await fetch(url, opts);
  const text = await r.text();
  try { return JSON.parse(text); } catch { throw new Error(`Non-JSON from ${url}: ${text.slice(0,200)}`); }
}

async function main() {
  console.log('Re-uploading House Building Project drawings via multipart (Stratus)...\n');

  for (const plan of PLAN) {
    const oldId = OLD_DRAWINGS[plan.key];
    process.stdout.write(`  ${plan.name}... `);

    // 1. Upload new drawing via multipart
    const svgContent = plan.svg();
    const fd = new FormData();
    fd.set('file', new Blob([svgContent], { type: 'image/svg+xml' }), `${plan.name.replace(/\s+/g,'_')}.svg`);
    fd.set('projectId', PID);
    fd.set('name', plan.name);
    fd.set('gridCols', String(plan.gridCols));
    fd.set('gridRows', String(plan.gridRows));

    const newDrawing = await json(`${BASE}/drawings/upload`, { method: 'POST', body: fd });
    if (!newDrawing.id) throw new Error(`Upload failed: ${JSON.stringify(newDrawing)}`);
    const newId = newDrawing.id;

    // 2. Attach milestone to new drawing
    await json(`${BASE}/drawings/${newId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestoneId: plan.msId }),
    });

    // 3. Re-link tasks from old drawing to new drawing
    const tasks = await json(`${BASE}/tasks?drawingId=${oldId}`);
    let relinked = 0;
    for (const t of tasks) {
      const r = await fetch(`${BASE}/tasks/${t.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drawingId: newId }),
      });
      if (r.ok) relinked++;
    }

    // 4. Delete old drawing
    await fetch(`${BASE}/drawings/${oldId}`, { method: 'DELETE' });

    console.log(`✓  new id: ${newId}  (${relinked}/${tasks.length} tasks relinked, old drawing deleted)`);
  }

  console.log('\n✅ All drawings re-uploaded to Stratus!');
  console.log('Open: https://buildtrack-withdrawing.onslate.in/projects');
}

main().catch(err => { console.error('\nFailed:', err.message || err); process.exit(1); });
