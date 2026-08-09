/**
 * upload_ground_floor_cad.mjs
 *
 * Creates a professional CAD-style ground floor plan SVG and uploads it
 * to replace the existing Ground Floor Plan drawing.
 *
 * Run: node upload_ground_floor_cad.mjs
 */

const BASE = 'https://construction-backend-50044693287.development.catalystappsail.in/api';
const DRAWING_ID = 'ded710c4-2eb9-41c3-a235-d24ee29263d6';

const W = 1800, H = 1100;

function makeCADGroundFloorSVG() {
  // Grid references — 4 columns (A–D), 3 rows (1–3)
  // All positions are in SVG pixels within 1800×1100 canvas
  // Layout: left margin 120, right margin 120, top 80, bottom (title block) 70

  const WALL = 8;        // exterior wall thickness
  const IWALL = 5;       // interior wall thickness
  const BG = '#f8f9fa';
  const WALL_COL = '#1a1a2e';
  const DIM_COL = '#2c3e50';
  const HATCH = '#c8c8c8';
  const GRID_COL = '#3a3aaa';

  // ── Room geometry (x, y, w, h) in canvas coords ──
  // Overall building footprint: x=120 y=90 w=1280 h=820 (excl title block)
  const BX = 140, BY = 90, BW = 1280, BH = 820;

  // Vertical dividers (x positions inside building)
  const v1 = BX + 290;   // after living/dining
  const v2 = BX + 560;   // after master bedroom col
  const v3 = BX + 820;   // after bath col
  const v4 = BX + 1070;  // after bedroom 2 col
  // Horizontal divider
  const h1 = BY + 550;   // separates upper rooms from kitchen/utility

  // Column (structural) positions
  const colXs = [BX, v1, v2, v3, v4, BX + BW];
  const rowYs  = [BY, h1, BY + BH];

  // Grid label bubble positions (top and left margin)
  const gridCols = [BX, v1, v2, v3, v4, BX + BW];
  const gridRows = [BY, h1, BY + BH];

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Arial,Helvetica,sans-serif">
  <defs>
    <filter id="sd" x="-5%" y="-5%" width="110%" height="110%">
      <feDropShadow dx="1.5" dy="1.5" stdDeviation="2.5" flood-opacity="0.22"/>
    </filter>
    <!-- Wall hatch pattern -->
    <pattern id="wallhatch" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="8" height="8" fill="#e0ddd8"/>
      <line x1="0" y1="0" x2="0" y2="8" stroke="${HATCH}" stroke-width="1.2"/>
    </pattern>
    <!-- Tile pattern for floors -->
    <pattern id="tile600" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
      <rect width="24" height="24" fill="none" stroke="#ccd4cc" stroke-width="0.5"/>
    </pattern>
    <pattern id="woodfloor" x="0" y="0" width="20" height="80" patternUnits="userSpaceOnUse">
      <rect width="20" height="80" fill="none" stroke="#c8a87a" stroke-width="0.6"/>
      <line x1="10" y1="0" x2="10" y2="80" stroke="#c8a87a" stroke-width="0.4"/>
    </pattern>
    <marker id="arro" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="${DIM_COL}"/>
    </marker>
    <marker id="arrl" markerWidth="7" markerHeight="7" refX="1" refY="3" orient="auto">
      <path d="M7,0 L7,6 L0,3 z" fill="${DIM_COL}"/>
    </marker>
  </defs>

  <!-- ── Background ── -->
  <rect width="${W}" height="${H}" fill="${BG}"/>

  <!-- ── Sheet border ── -->
  <rect x="10" y="10" width="${W-20}" height="${H-20}" fill="none" stroke="${WALL_COL}" stroke-width="2"/>
  <rect x="15" y="15" width="${W-30}" height="${H-30}" fill="none" stroke="${WALL_COL}" stroke-width="0.8"/>

  <!-- ── Drawing title (top) ── -->
  <text x="${W/2}" y="52" font-size="26" fill="${WALL_COL}" text-anchor="middle" font-weight="900" letter-spacing="2">GROUND FLOOR PLAN</text>
  <text x="${W/2}" y="74" font-size="13" fill="#5a6a80" text-anchor="middle" letter-spacing="1">HOUSE BUILDING PROJECT   |   Drawing No: HBP-GF-002   |   Scale 1:50   |   Sheet 1 of 1</text>

  <!-- ═══════════════════════════════════════════════════════
       ROOM FLOOR FILLS
  ════════════════════════════════════════════════════════ -->

  <!-- Living / Dining -->
  <rect x="${BX+WALL}" y="${BY+WALL}" width="${v1-BX-WALL}" height="${h1-BY-WALL}" fill="url(#tile600)" opacity="0.7"/>
  <rect x="${BX+WALL}" y="${BY+WALL}" width="${v1-BX-WALL}" height="${h1-BY-WALL}" fill="#e8f5e9" opacity="0.55"/>

  <!-- Master Bedroom -->
  <rect x="${v1+IWALL/2}" y="${BY+WALL}" width="${v2-v1-IWALL}" height="${h1-BY-WALL}" fill="url(#woodfloor)" opacity="0.6"/>
  <rect x="${v1+IWALL/2}" y="${BY+WALL}" width="${v2-v1-IWALL}" height="${h1-BY-WALL}" fill="#ede7f6" opacity="0.5"/>

  <!-- Bathroom 1 -->
  <rect x="${v2+IWALL/2}" y="${BY+WALL}" width="${v3-v2-IWALL}" height="${h1-BY-WALL}" fill="#e1f5fe" opacity="0.7"/>

  <!-- Bedroom 2 -->
  <rect x="${v3+IWALL/2}" y="${BY+WALL}" width="${v4-v3-IWALL}" height="${h1-BY-WALL}" fill="url(#woodfloor)" opacity="0.5"/>
  <rect x="${v3+IWALL/2}" y="${BY+WALL}" width="${v4-v3-IWALL}" height="${h1-BY-WALL}" fill="#fff3e0" opacity="0.45"/>

  <!-- Garage -->
  <rect x="${v4+IWALL/2}" y="${BY+WALL}" width="${BX+BW-v4-WALL-IWALL/2}" height="${h1-BY-WALL}" fill="#f3e5f5" opacity="0.6"/>

  <!-- Kitchen -->
  <rect x="${v1+IWALL/2}" y="${h1+IWALL/2}" width="${v3-v1-IWALL}" height="${BY+BH-h1-WALL-IWALL/2}" fill="#fffde7" opacity="0.75"/>

  <!-- Utility / Laundry -->
  <rect x="${v3+IWALL/2}" y="${h1+IWALL/2}" width="${v4-v3-IWALL}" height="${BY+BH-h1-WALL-IWALL/2}" fill="#e8eaf6" opacity="0.65"/>

  <!-- Corridor (left lower) -->
  <rect x="${BX+WALL}" y="${h1+IWALL/2}" width="${v1-BX-WALL}" height="${BY+BH-h1-WALL-IWALL/2}" fill="#fce4ec" opacity="0.5"/>

  <!-- Store -->
  <rect x="${v4+IWALL/2}" y="${h1+IWALL/2}" width="${BX+BW-v4-WALL-IWALL/2}" height="${BY+BH-h1-WALL-IWALL/2}" fill="#e0f2f1" opacity="0.65"/>

  <!-- ═══════════════════════════════════════════════════════
       WALLS (drawn as thick filled rectangles / lines)
  ════════════════════════════════════════════════════════ -->

  <!-- Outer walls – hatched fill to simulate masonry -->
  <!-- TOP wall -->
  <rect x="${BX}" y="${BY}" width="${BW}" height="${WALL}" fill="url(#wallhatch)" stroke="${WALL_COL}" stroke-width="1.5"/>
  <!-- BOTTOM wall -->
  <rect x="${BX}" y="${BY+BH-WALL}" width="${BW}" height="${WALL}" fill="url(#wallhatch)" stroke="${WALL_COL}" stroke-width="1.5"/>
  <!-- LEFT wall -->
  <rect x="${BX}" y="${BY}" width="${WALL}" height="${BH}" fill="url(#wallhatch)" stroke="${WALL_COL}" stroke-width="1.5"/>
  <!-- RIGHT wall -->
  <rect x="${BX+BW-WALL}" y="${BY}" width="${WALL}" height="${BH}" fill="url(#wallhatch)" stroke="${WALL_COL}" stroke-width="1.5"/>

  <!-- Outer wall outlines (bold) -->
  <rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" fill="none" stroke="${WALL_COL}" stroke-width="${WALL}" stroke-linejoin="miter"/>

  <!-- Interior vertical walls -->
  <line x1="${v1}" y1="${BY+WALL}" x2="${v1}" y2="${BY+BH-WALL}" stroke="${WALL_COL}" stroke-width="${IWALL}"/>
  <line x1="${v2}" y1="${BY+WALL}" x2="${v2}" y2="${h1}" stroke="${WALL_COL}" stroke-width="${IWALL}"/>
  <line x1="${v3}" y1="${BY+WALL}" x2="${v3}" y2="${BY+BH-WALL}" stroke="${WALL_COL}" stroke-width="${IWALL}"/>
  <line x1="${v4}" y1="${BY+WALL}" x2="${v4}" y2="${BY+BH-WALL}" stroke="${WALL_COL}" stroke-width="${IWALL}"/>

  <!-- Interior horizontal wall -->
  <line x1="${BX+WALL}" y1="${h1}" x2="${BX+BW-WALL}" y2="${h1}" stroke="${WALL_COL}" stroke-width="${IWALL}"/>

  <!-- ═══════════════════════════════════════════════════════
       DOOR SYMBOLS (swing arcs + opening gap in wall)
  ════════════════════════════════════════════════════════ -->

  <!-- Main entrance door (left wall, lower section) -->
  <rect x="${BX-2}" y="${h1+80}" width="${WALL+4}" height="80" fill="${BG}" stroke="none"/>
  <line x1="${BX}" y1="${h1+80}" x2="${BX}" y2="${h1+160}" stroke="${WALL_COL}" stroke-width="1.5" stroke-dasharray="3,3"/>
  <line x1="${BX+WALL}" y1="${h1+80}" x2="${BX+WALL}" y2="${h1+80+80}" stroke="${WALL_COL}" stroke-width="1.8"/>
  <path d="M ${BX+WALL} ${h1+80} A 80,80 0 0,0 ${BX+WALL+80} ${h1+80+80}" fill="none" stroke="${WALL_COL}" stroke-width="1.4" stroke-dasharray="5,4"/>

  <!-- Bedroom door (v1 wall) -->
  <rect x="${v1-3}" y="${BY+WALL+30}" width="${IWALL+6}" height="80" fill="${BG}" stroke="none"/>
  <line x1="${v1}" y1="${BY+WALL+30}" x2="${v1}" y2="${BY+WALL+110}" stroke="${WALL_COL}" stroke-width="1.5" stroke-dasharray="3,3"/>
  <line x1="${v1+IWALL/2}" y1="${BY+WALL+30}" x2="${v1+IWALL/2}" y2="${BY+WALL+110}" stroke="${WALL_COL}" stroke-width="1.8"/>
  <path d="M ${v1+IWALL/2} ${BY+WALL+30} A 80,80 0 0,1 ${v1+IWALL/2+80} ${BY+WALL+30+80}" fill="none" stroke="${WALL_COL}" stroke-width="1.4" stroke-dasharray="5,4"/>

  <!-- Bathroom door (v2 wall) -->
  <rect x="${v2-3}" y="${BY+WALL+40}" width="${IWALL+6}" height="70" fill="${BG}" stroke="none"/>
  <path d="M ${v2+IWALL/2} ${BY+WALL+40} A 70,70 0 0,1 ${v2+IWALL/2+70} ${BY+WALL+40+70}" fill="none" stroke="${WALL_COL}" stroke-width="1.4" stroke-dasharray="5,4"/>
  <line x1="${v2+IWALL/2}" y1="${BY+WALL+40}" x2="${v2+IWALL/2}" y2="${BY+WALL+110}" stroke="${WALL_COL}" stroke-width="1.8"/>

  <!-- Bedroom2 door (v3 wall) -->
  <rect x="${v3-3}" y="${BY+WALL+30}" width="${IWALL+6}" height="80" fill="${BG}" stroke="none"/>
  <path d="M ${v3+IWALL/2} ${BY+WALL+30} A 80,80 0 0,1 ${v3+IWALL/2+80} ${BY+WALL+30+80}" fill="none" stroke="${WALL_COL}" stroke-width="1.4" stroke-dasharray="5,4"/>
  <line x1="${v3+IWALL/2}" y1="${BY+WALL+30}" x2="${v3+IWALL/2}" y2="${BY+WALL+110}" stroke="${WALL_COL}" stroke-width="1.8"/>

  <!-- Garage door (top wall – roller) -->
  <rect x="${v4+IWALL/2+20}" y="${BY-2}" width="${BX+BW-v4-WALL-IWALL/2-40}" height="${WALL+4}" fill="#b0c4de" stroke="${WALL_COL}" stroke-width="1.5"/>
  <text x="${(v4+IWALL/2+20 + BX+BW-WALL)/2}" y="${BY+WALL-1}" font-size="10" fill="${WALL_COL}" text-anchor="middle" font-weight="bold">ROLLER SHUTTER</text>

  <!-- Kitchen door (h1 wall) -->
  <rect x="${v1+IWALL/2+40}" y="${h1-3}" width="70" height="${IWALL+6}" fill="${BG}" stroke="none"/>
  <path d="M ${v1+IWALL/2+40} ${h1+IWALL/2} A 70,70 0 0,0 ${v1+IWALL/2+40+70} ${h1+IWALL/2-70}" fill="none" stroke="${WALL_COL}" stroke-width="1.4" stroke-dasharray="5,4"/>
  <line x1="${v1+IWALL/2+40}" y1="${h1+IWALL/2}" x2="${v1+IWALL/2+110}" y2="${h1+IWALL/2}" stroke="${WALL_COL}" stroke-width="1.8"/>

  <!-- ═══════════════════════════════════════════════════════
       WINDOW SYMBOLS (triple-line in-wall)
  ════════════════════════════════════════════════════════ -->

  <!-- Windows on left wall (Living) -->
  <rect x="${BX-2}" y="${BY+WALL+100}" width="${WALL+4}" height="120" fill="white" stroke="${WALL_COL}" stroke-width="1.5"/>
  <line x1="${BX}" y1="${BY+WALL+100}" x2="${BX}" y2="${BY+WALL+220}" stroke="#60c8ff" stroke-width="3"/>
  <line x1="${BX+WALL}" y1="${BY+WALL+100}" x2="${BX+WALL}" y2="${BY+WALL+220}" stroke="#60c8ff" stroke-width="3"/>
  <line x1="${BX+WALL/2}" y1="${BY+WALL+100}" x2="${BX+WALL/2}" y2="${BY+WALL+220}" stroke="#60c8ff" stroke-width="1.5"/>

  <rect x="${BX-2}" y="${BY+WALL+270}" width="${WALL+4}" height="120" fill="white" stroke="${WALL_COL}" stroke-width="1.5"/>
  <line x1="${BX}" y1="${BY+WALL+270}" x2="${BX}" y2="${BY+WALL+390}" stroke="#60c8ff" stroke-width="3"/>
  <line x1="${BX+WALL}" y1="${BY+WALL+270}" x2="${BX+WALL}" y2="${BY+WALL+390}" stroke="#60c8ff" stroke-width="3"/>
  <line x1="${BX+WALL/2}" y1="${BY+WALL+270}" x2="${BX+WALL/2}" y2="${BY+WALL+390}" stroke="#60c8ff" stroke-width="1.5"/>

  <!-- Window on top wall (Master Bedroom) -->
  <rect x="${v1+IWALL/2+30}" y="${BY-2}" width="150" height="${WALL+4}" fill="white" stroke="${WALL_COL}" stroke-width="1.5"/>
  <line x1="${v1+IWALL/2+30}" y1="${BY}" x2="${v1+IWALL/2+180}" y2="${BY}" stroke="#60c8ff" stroke-width="3"/>
  <line x1="${v1+IWALL/2+30}" y1="${BY+WALL}" x2="${v1+IWALL/2+180}" y2="${BY+WALL}" stroke="#60c8ff" stroke-width="3"/>
  <line x1="${v1+IWALL/2+30}" y1="${BY+WALL/2}" x2="${v1+IWALL/2+180}" y2="${BY+WALL/2}" stroke="#60c8ff" stroke-width="1.5"/>

  <!-- Window on top wall (Bedroom 2) -->
  <rect x="${v3+IWALL/2+30}" y="${BY-2}" width="130" height="${WALL+4}" fill="white" stroke="${WALL_COL}" stroke-width="1.5"/>
  <line x1="${v3+IWALL/2+30}" y1="${BY}" x2="${v3+IWALL/2+160}" y2="${BY}" stroke="#60c8ff" stroke-width="3"/>
  <line x1="${v3+IWALL/2+30}" y1="${BY+WALL}" x2="${v3+IWALL/2+160}" y2="${BY+WALL}" stroke="#60c8ff" stroke-width="3"/>
  <line x1="${v3+IWALL/2+30}" y1="${BY+WALL/2}" x2="${v3+IWALL/2+160}" y2="${BY+WALL/2}" stroke="#60c8ff" stroke-width="1.5"/>

  <!-- Window on right wall (Garage) -->
  <rect x="${BX+BW-WALL-2}" y="${BY+WALL+120}" width="${WALL+4}" height="100" fill="white" stroke="${WALL_COL}" stroke-width="1.5"/>
  <line x1="${BX+BW-WALL}" y1="${BY+WALL+120}" x2="${BX+BW-WALL}" y2="${BY+WALL+220}" stroke="#60c8ff" stroke-width="3"/>
  <line x1="${BX+BW}" y1="${BY+WALL+120}" x2="${BX+BW}" y2="${BY+WALL+220}" stroke="#60c8ff" stroke-width="3"/>

  <!-- ═══════════════════════════════════════════════════════
       STRUCTURAL COLUMNS (solid square at intersections)
  ════════════════════════════════════════════════════════ -->

  ${[
    [BX, BY], [v1, BY], [v2, BY], [v3, BY], [v4, BY], [BX+BW, BY],
    [BX, h1], [v1, h1], [v3, h1], [v4, h1], [BX+BW, h1],
    [BX, BY+BH], [v1, BY+BH], [v2, BY+BH], [v3, BY+BH], [v4, BY+BH], [BX+BW, BY+BH],
  ].map(([cx, cy]) =>
    `<rect x="${cx-14}" y="${cy-14}" width="28" height="28" fill="${WALL_COL}" stroke="${WALL_COL}" stroke-width="1.5"/>
     <rect x="${cx-10}" y="${cy-10}" width="20" height="20" fill="none" stroke="#ffffff" stroke-width="1" opacity="0.5"/>`
  ).join('\n  ')}

  <!-- ═══════════════════════════════════════════════════════
       FURNITURE (simplified CAD symbols)
  ════════════════════════════════════════════════════════ -->

  <!-- Sofa in Living (L-shape) -->
  <rect x="${BX+WALL+20}" y="${BY+WALL+40}" width="180" height="70" rx="12" fill="#b0bec5" stroke="${WALL_COL}" stroke-width="1.5" opacity="0.7"/>
  <rect x="${BX+WALL+20}" y="${BY+WALL+40}" width="30" height="70" rx="8" fill="#90a4ae" stroke="${WALL_COL}" stroke-width="1" opacity="0.7"/>
  <rect x="${BX+WALL+170}" y="${BY+WALL+40}" width="30" height="70" rx="8" fill="#90a4ae" stroke="${WALL_COL}" stroke-width="1" opacity="0.7"/>
  <text x="${BX+WALL+110}" y="${BY+WALL+82}" font-size="11" fill="#37474f" text-anchor="middle">3-SEATER SOFA</text>

  <!-- Coffee table -->
  <rect x="${BX+WALL+60}" y="${BY+WALL+130}" width="100" height="60" rx="5" fill="#eceff1" stroke="${WALL_COL}" stroke-width="1.5" opacity="0.75"/>
  <text x="${BX+WALL+110}" y="${BY+WALL+165}" font-size="10" fill="#37474f" text-anchor="middle">COFFEE TBL</text>

  <!-- Dining table + chairs -->
  <rect x="${BX+WALL+30}" y="${BY+WALL+280}" width="200" height="120" rx="6" fill="#d7ccc8" stroke="${WALL_COL}" stroke-width="1.5" opacity="0.8"/>
  <text x="${BX+WALL+130}" y="${BY+WALL+345}" font-size="11" fill="#37474f" text-anchor="middle">DINING TABLE</text>
  <!-- Chairs around table -->
  <rect x="${BX+WALL+50}" y="${BY+WALL+265}" width="35" height="18" rx="4" fill="#bcaaa4" stroke="${WALL_COL}" stroke-width="1" opacity="0.8"/>
  <rect x="${BX+WALL+110}" y="${BY+WALL+265}" width="35" height="18" rx="4" fill="#bcaaa4" stroke="${WALL_COL}" stroke-width="1" opacity="0.8"/>
  <rect x="${BX+WALL+165}" y="${BY+WALL+265}" width="35" height="18" rx="4" fill="#bcaaa4" stroke="${WALL_COL}" stroke-width="1" opacity="0.8"/>
  <rect x="${BX+WALL+50}" y="${BY+WALL+398}" width="35" height="18" rx="4" fill="#bcaaa4" stroke="${WALL_COL}" stroke-width="1" opacity="0.8"/>
  <rect x="${BX+WALL+165}" y="${BY+WALL+398}" width="35" height="18" rx="4" fill="#bcaaa4" stroke="${WALL_COL}" stroke-width="1" opacity="0.8"/>

  <!-- Master Bedroom – Bed -->
  <rect x="${v1+IWALL/2+20}" y="${BY+WALL+30}" width="220" height="180" rx="8" fill="#ce93d8" stroke="${WALL_COL}" stroke-width="1.5" opacity="0.55"/>
  <rect x="${v1+IWALL/2+20}" y="${BY+WALL+30}" width="220" height="50" rx="8" fill="#ab47bc" stroke="${WALL_COL}" stroke-width="1" opacity="0.65"/>
  <text x="${v1+IWALL/2+130}" y="${BY+WALL+135}" font-size="12" fill="#4a148c" text-anchor="middle" font-weight="bold">QUEEN BED</text>
  <text x="${v1+IWALL/2+130}" y="${BY+WALL+152}" font-size="11" fill="#4a148c" text-anchor="middle">1500×2000mm</text>

  <!-- Master Wardrobe -->
  <rect x="${v1+IWALL/2+20}" y="${h1-80}" width="220" height="55" rx="3" fill="#d7ccc8" stroke="${WALL_COL}" stroke-width="1.5"/>
  <line x1="${v1+IWALL/2+130}" y1="${h1-80}" x2="${v1+IWALL/2+130}" y2="${h1-25}" stroke="${WALL_COL}" stroke-width="1" stroke-dasharray="4,3"/>
  <text x="${v1+IWALL/2+130}" y="${h1-47}" font-size="11" fill="#37474f" text-anchor="middle">BUILT-IN WARDROBE</text>

  <!-- Bathroom 1 – WC + Basin + Shower -->
  <ellipse cx="${v2+IWALL/2+60}" cy="${BY+WALL+80}" rx="28" ry="38" fill="white" stroke="${WALL_COL}" stroke-width="1.8"/>
  <ellipse cx="${v2+IWALL/2+60}" cy="${BY+WALL+60}" rx="20" ry="14" fill="#bbdefb" stroke="${WALL_COL}" stroke-width="1.5"/>
  <text x="${v2+IWALL/2+60}" y="${BY+WALL+125}" font-size="10" fill="#1a2744" text-anchor="middle">WC</text>

  <ellipse cx="${v2+IWALL/2+60}" cy="${BY+WALL+220}" rx="30" ry="20" fill="white" stroke="${WALL_COL}" stroke-width="1.8"/>
  <circle cx="${v2+IWALL/2+60}" cy="${BY+WALL+220}" r="6" fill="none" stroke="${WALL_COL}" stroke-width="1.5"/>
  <text x="${v2+IWALL/2+60}" y="${BY+WALL+256}" font-size="10" fill="#1a2744" text-anchor="middle">BASIN</text>

  <rect x="${v2+IWALL/2+30}" y="${BY+WALL+330}" width="70" height="70" rx="35" fill="#e1f5fe" stroke="${WALL_COL}" stroke-width="1.8"/>
  <circle cx="${v2+IWALL/2+65}" cy="${BY+WALL+365}" r="12" fill="none" stroke="${WALL_COL}" stroke-width="1.5"/>
  <text x="${v2+IWALL/2+65}" y="${BY+WALL+420}" font-size="10" fill="#1a2744" text-anchor="middle">SHOWER</text>

  <!-- Bedroom 2 – Bed -->
  <rect x="${v3+IWALL/2+20}" y="${BY+WALL+30}" width="200" height="160" rx="8" fill="#ffe0b2" stroke="${WALL_COL}" stroke-width="1.5" opacity="0.6"/>
  <rect x="${v3+IWALL/2+20}" y="${BY+WALL+30}" width="200" height="45" rx="8" fill="#ffb74d" stroke="${WALL_COL}" stroke-width="1" opacity="0.7"/>
  <text x="${v3+IWALL/2+120}" y="${BY+WALL+125}" font-size="12" fill="#e65100" text-anchor="middle" font-weight="bold">DOUBLE BED</text>
  <text x="${v3+IWALL/2+120}" y="${BY+WALL+142}" font-size="11" fill="#e65100" text-anchor="middle">1400×2000mm</text>

  <!-- Bedroom 2 – Wardrobe -->
  <rect x="${v3+IWALL/2+20}" y="${h1-75}" width="200" height="50" rx="3" fill="#d7ccc8" stroke="${WALL_COL}" stroke-width="1.5"/>
  <text x="${v3+IWALL/2+120}" y="${h1-44}" font-size="11" fill="#37474f" text-anchor="middle">WARDROBE</text>

  <!-- Garage – Car outline -->
  <rect x="${v4+IWALL/2+25}" y="${BY+WALL+60}" width="340" height="180" rx="18" fill="none" stroke="${WALL_COL}" stroke-width="2" stroke-dasharray="8,5" opacity="0.5"/>
  <text x="${v4+IWALL/2+195}" y="${BY+WALL+155}" font-size="15" fill="#4a148c" text-anchor="middle" font-weight="bold">GARAGE</text>
  <text x="${v4+IWALL/2+195}" y="${BY+WALL+175}" font-size="11" fill="#5e35b1" text-anchor="middle">1 Car Parking</text>

  <!-- Kitchen – cabinets + sink -->
  <rect x="${v1+IWALL/2+10}" y="${h1+IWALL/2+10}" width="${v3-v1-IWALL-20}" height="55" rx="3" fill="#fff9c4" stroke="${WALL_COL}" stroke-width="1.5"/>
  <text x="${(v1+v3)/2}" y="${h1+IWALL/2+42}" font-size="11" fill="#37474f" text-anchor="middle">KITCHEN COUNTER</text>
  <!-- Sink -->
  <rect x="${v1+IWALL/2+120}" y="${h1+IWALL/2+15}" width="60" height="40" rx="4" fill="white" stroke="${WALL_COL}" stroke-width="1.5"/>
  <circle cx="${v1+IWALL/2+150}" cy="${h1+IWALL/2+35}" r="5" fill="${WALL_COL}" opacity="0.5"/>
  <text x="${v1+IWALL/2+150}" y="${h1+IWALL/2+88}" font-size="10" fill="#37474f" text-anchor="middle">KITCHEN SINK</text>

  <!-- Utility / Washing machine -->
  <rect x="${v3+IWALL/2+25}" y="${h1+IWALL/2+20}" width="70" height="70" rx="8" fill="white" stroke="${WALL_COL}" stroke-width="1.8"/>
  <circle cx="${v3+IWALL/2+60}" cy="${h1+IWALL/2+55}" r="25" fill="none" stroke="${WALL_COL}" stroke-width="1.5"/>
  <circle cx="${v3+IWALL/2+60}" cy="${h1+IWALL/2+55}" r="10" fill="none" stroke="${WALL_COL}" stroke-width="1"/>
  <text x="${v3+IWALL/2+60}" y="${h1+IWALL/2+110}" font-size="10" fill="#37474f" text-anchor="middle">W/M</text>

  <!-- Store – Shelves -->
  <rect x="${v4+IWALL/2+20}" y="${h1+IWALL/2+20}" width="160" height="30" rx="3" fill="#d0f0e8" stroke="${WALL_COL}" stroke-width="1.5"/>
  <rect x="${v4+IWALL/2+20}" y="${h1+IWALL/2+60}" width="160" height="30" rx="3" fill="#d0f0e8" stroke="${WALL_COL}" stroke-width="1.5"/>
  <rect x="${v4+IWALL/2+20}" y="${h1+IWALL/2+100}" width="160" height="30" rx="3" fill="#d0f0e8" stroke="${WALL_COL}" stroke-width="1.5"/>
  <text x="${v4+IWALL/2+100}" y="${h1+IWALL/2+170}" font-size="11" fill="#37474f" text-anchor="middle">STORAGE SHELVES</text>

  <!-- Staircase in corridor (schematic) -->
  ${[0,1,2,3,4,5,6,7].map(i =>
    `<rect x="${BX+WALL+20}" y="${h1+IWALL/2+20+i*30}" width="90" height="28" fill="none" stroke="${WALL_COL}" stroke-width="1.2" opacity="0.5"/>`
  ).join('\n  ')}
  <text x="${BX+WALL+65}" y="${h1+IWALL/2+280}" font-size="10" fill="#1a2744" text-anchor="middle">STAIRCASE UP</text>

  <!-- ═══════════════════════════════════════════════════════
       ROOM LABELS (large, centred, semi-transparent)
  ════════════════════════════════════════════════════════ -->

  <text x="${BX+WALL+(v1-BX-WALL)/2}" y="${BY+WALL+170}" font-size="20" fill="${WALL_COL}" text-anchor="middle" font-weight="900" opacity="0.18">LIVING</text>
  <text x="${BX+WALL+(v1-BX-WALL)/2}" y="${BY+WALL+194}" font-size="20" fill="${WALL_COL}" text-anchor="middle" font-weight="900" opacity="0.18">&amp; DINING</text>
  <text x="${BX+WALL+(v1-BX-WALL)/2}" y="${BY+WALL+215}" font-size="13" fill="#2e7d32" text-anchor="middle" opacity="0.6">28.5 m²</text>

  <text x="${(v1+v2)/2}" y="${BY+WALL+280}" font-size="17" fill="${WALL_COL}" text-anchor="middle" font-weight="900" opacity="0.2">MASTER</text>
  <text x="${(v1+v2)/2}" y="${BY+WALL+300}" font-size="17" fill="${WALL_COL}" text-anchor="middle" font-weight="900" opacity="0.2">BEDROOM</text>
  <text x="${(v1+v2)/2}" y="${BY+WALL+320}" font-size="13" fill="#4527a0" text-anchor="middle" opacity="0.6">18.0 m²</text>

  <text x="${(v2+v3)/2}" y="${BY+WALL+460}" font-size="15" fill="${WALL_COL}" text-anchor="middle" font-weight="900" opacity="0.2">BATHROOM 1</text>
  <text x="${(v2+v3)/2}" y="${BY+WALL+480}" font-size="12" fill="#01579b" text-anchor="middle" opacity="0.6">5.5 m²</text>

  <text x="${(v3+v4)/2}" y="${BY+WALL+280}" font-size="17" fill="${WALL_COL}" text-anchor="middle" font-weight="900" opacity="0.2">BEDROOM 2</text>
  <text x="${(v3+v4)/2}" y="${BY+WALL+300}" font-size="13" fill="#e65100" text-anchor="middle" opacity="0.6">16.0 m²</text>

  <text x="${(v4+BX+BW)/2}" y="${BY+WALL+330}" font-size="18" fill="${WALL_COL}" text-anchor="middle" font-weight="900" opacity="0.18">GARAGE</text>
  <text x="${(v4+BX+BW)/2}" y="${BY+WALL+350}" font-size="13" fill="#6a1b9a" text-anchor="middle" opacity="0.6">22.0 m²</text>

  <text x="${(v1+v3)/2}" y="${h1+IWALL/2+145}" font-size="17" fill="${WALL_COL}" text-anchor="middle" font-weight="900" opacity="0.22">KITCHEN</text>
  <text x="${(v1+v3)/2}" y="${h1+IWALL/2+165}" font-size="12" fill="#f57f17" text-anchor="middle" opacity="0.6">12.0 m²</text>

  <text x="${(v3+v4)/2}" y="${h1+IWALL/2+145}" font-size="14" fill="${WALL_COL}" text-anchor="middle" font-weight="900" opacity="0.22">UTILITY</text>
  <text x="${(v3+v4)/2}" y="${h1+IWALL/2+165}" font-size="11" fill="#283593" text-anchor="middle" opacity="0.6">6.0 m²</text>

  <text x="${(v4+BX+BW)/2}" y="${h1+IWALL/2+145}" font-size="14" fill="${WALL_COL}" text-anchor="middle" font-weight="900" opacity="0.22">STORE</text>
  <text x="${(v4+BX+BW)/2}" y="${h1+IWALL/2+165}" font-size="11" fill="#00695c" text-anchor="middle" opacity="0.6">5.5 m²</text>

  <text x="${BX+WALL+(v1-BX-WALL)/2}" y="${h1+IWALL/2+130}" font-size="14" fill="${WALL_COL}" text-anchor="middle" font-weight="900" opacity="0.22">CORRIDOR</text>
  <text x="${BX+WALL+(v1-BX-WALL)/2}" y="${h1+IWALL/2+150}" font-size="11" fill="#880e4f" text-anchor="middle" opacity="0.6">8.0 m²</text>

  <!-- ═══════════════════════════════════════════════════════
       GRID REFERENCE BUBBLES (top and left margin)
  ════════════════════════════════════════════════════════ -->

  <!-- Column refs: A B C D E F -->
  ${['A','B','C','D','E','F'].map((ltr, i) => {
    const x = gridCols[i];
    return `<circle cx="${x}" cy="60" r="16" fill="${GRID_COL}" stroke="white" stroke-width="2"/>
    <text x="${x}" y="65" font-size="14" fill="white" text-anchor="middle" font-weight="bold">${ltr}</text>
    <line x1="${x}" y1="76" x2="${x}" y2="${BY+BH+10}" stroke="${GRID_COL}" stroke-width="1.2" stroke-dasharray="5,6" opacity="0.3"/>`;
  }).join('\n  ')}

  <!-- Row refs: 1 2 3 -->
  ${['1','2','3'].map((num, i) => {
    const y = gridRows[i];
    return `<circle cx="85" cy="${y}" r="16" fill="${GRID_COL}" stroke="white" stroke-width="2"/>
    <text x="85" y="${y+5}" font-size="14" fill="white" text-anchor="middle" font-weight="bold">${num}</text>
    <line x1="101" y1="${y}" x2="${BX+BW+10}" y2="${y}" stroke="${GRID_COL}" stroke-width="1.2" stroke-dasharray="5,6" opacity="0.3"/>`;
  }).join('\n  ')}

  <!-- ═══════════════════════════════════════════════════════
       DIMENSION LINES
  ════════════════════════════════════════════════════════ -->

  <!-- Overall width -->
  <line x1="${BX}" y1="${BY-36}" x2="${BX+BW}" y2="${BY-36}" stroke="${DIM_COL}" stroke-width="1.5" marker-start="url(#arrl)" marker-end="url(#arro)"/>
  <line x1="${BX}" y1="${BY-28}" x2="${BX}" y2="${BY-46}" stroke="${DIM_COL}" stroke-width="1.2"/>
  <line x1="${BX+BW}" y1="${BY-28}" x2="${BX+BW}" y2="${BY-46}" stroke="${DIM_COL}" stroke-width="1.2"/>
  <text x="${BX+BW/2}" y="${BY-48}" font-size="13" fill="${DIM_COL}" text-anchor="middle" font-weight="bold">12 800 mm</text>

  <!-- Bay widths (top) -->
  ${[[BX,v1,'2900'],[v1,v2,'2700'],[v2,v3,'2600'],[v3,v4,'2500'],[v4,BX+BW,'2100']].map(([x1,x2,label]) =>
    `<line x1="${x1}" y1="${BY-16}" x2="${x2}" y2="${BY-16}" stroke="${DIM_COL}" stroke-width="1.2" marker-start="url(#arrl)" marker-end="url(#arro)" opacity="0.7"/>
     <text x="${(x1+x2)/2}" y="${BY-20}" font-size="10" fill="${DIM_COL}" text-anchor="middle">${label}</text>`
  ).join('\n  ')}

  <!-- Overall height (right side) -->
  <line x1="${BX+BW+36}" y1="${BY}" x2="${BX+BW+36}" y2="${BY+BH}" stroke="${DIM_COL}" stroke-width="1.5" marker-start="url(#arrl)" marker-end="url(#arro)"/>
  <line x1="${BX+BW+28}" y1="${BY}" x2="${BX+BW+46}" y2="${BY}" stroke="${DIM_COL}" stroke-width="1.2"/>
  <line x1="${BX+BW+28}" y1="${BY+BH}" x2="${BX+BW+46}" y2="${BY+BH}" stroke="${DIM_COL}" stroke-width="1.2"/>
  <text x="${BX+BW+60}" y="${BY+BH/2}" font-size="13" fill="${DIM_COL}" text-anchor="middle" font-weight="bold" transform="rotate(-90,${BX+BW+60},${BY+BH/2})">8 200 mm</text>

  <!-- Bay heights (right) -->
  ${[[BY,h1,'5500'],[h1,BY+BH,'2700']].map(([y1,y2,label]) =>
    `<line x1="${BX+BW+16}" y1="${y1}" x2="${BX+BW+16}" y2="${y2}" stroke="${DIM_COL}" stroke-width="1.2" marker-start="url(#arrl)" marker-end="url(#arro)" opacity="0.7"/>
     <text x="${BX+BW+26}" y="${(y1+y2)/2}" font-size="10" fill="${DIM_COL}" text-anchor="middle" transform="rotate(-90,${BX+BW+26},${(y1+y2)/2})">${label}</text>`
  ).join('\n  ')}

  <!-- ═══════════════════════════════════════════════════════
       LEGEND (right panel)
  ════════════════════════════════════════════════════════ -->

  <rect x="${BX+BW+80}" y="${BY}" width="320" height="560" rx="10" fill="white" stroke="#d0d8e0" stroke-width="1.8" filter="url(#sd)"/>
  <rect x="${BX+BW+80}" y="${BY}" width="320" height="40" rx="10" fill="${WALL_COL}"/>
  <text x="${BX+BW+240}" y="${BY+26}" font-size="14" fill="white" text-anchor="middle" font-weight="bold">ROOM SCHEDULE</text>

  ${[
    ['#e8f5e9','Living / Dining','28.5 m²'],
    ['#ede7f6','Master Bedroom','18.0 m²'],
    ['#e1f5fe','Bathroom 1','5.5 m²'],
    ['#fff3e0','Bedroom 2','16.0 m²'],
    ['#f3e5f5','Garage','22.0 m²'],
    ['#fffde7','Kitchen','12.0 m²'],
    ['#e8eaf6','Utility / Laundry','6.0 m²'],
    ['#fce4ec','Corridor / Stair','8.0 m²'],
    ['#e0f2f1','Store','5.5 m²'],
  ].map(([color, name, area], i) =>
    `<rect x="${BX+BW+95}" y="${BY+50+i*52}" width="22" height="16" fill="${color}" stroke="${WALL_COL}" stroke-width="1.2"/>
     <text x="${BX+BW+125}" y="${BY+62+i*52}" font-size="12" fill="#1a2744" font-weight="bold">${name}</text>
     <text x="${BX+BW+125}" y="${BY+77+i*52}" font-size="11" fill="#5a6a80">${area}</text>`
  ).join('\n  ')}

  <line x1="${BX+BW+90}" y1="${BY+530}" x2="${BX+BW+390}" y2="${BY+530}" stroke="#d0d8e0" stroke-width="1"/>

  <!-- Symbol legend -->
  <text x="${BX+BW+100}" y="${BY+548}" font-size="12" fill="${WALL_COL}" font-weight="bold">SYMBOLS</text>
  <!-- Window -->
  <line x1="${BX+BW+100}" y1="${BY+564}" x2="${BX+BW+130}" y2="${BY+564}" stroke="#60c8ff" stroke-width="4"/>
  <text x="${BX+BW+140}" y="${BY+568}" font-size="11" fill="#37474f">Window (glazed)</text>
  <!-- Column -->
  <rect x="${BX+BW+100}" y="${BY+578}" width="18" height="18" fill="${WALL_COL}"/>
  <text x="${BX+BW+126}" y="${BY+591}" font-size="11" fill="#37474f">RCC Column 300×300</text>
  <!-- Door -->
  <path d="M ${BX+BW+100} ${BY+612} A 20,20 0 0,1 ${BX+BW+120} ${BY+632}" fill="none" stroke="${WALL_COL}" stroke-width="1.4" stroke-dasharray="4,3"/>
  <line x1="${BX+BW+100}" y1="${BY+612}" x2="${BX+BW+100}" y2="${BY+632}" stroke="${WALL_COL}" stroke-width="1.8"/>
  <text x="${BX+BW+132}" y="${BY+625}" font-size="11" fill="#37474f">Door swing</text>

  <!-- ═══════════════════════════════════════════════════════
       NORTH ARROW + SCALE BAR
  ════════════════════════════════════════════════════════ -->

  <g transform="translate(${BX+BW+240},${BY+BH-100})">
    <circle cx="0" cy="0" r="28" fill="white" stroke="${WALL_COL}" stroke-width="2"/>
    <polygon points="0,-22 7,10 0,5 -7,10" fill="${WALL_COL}"/>
    <polygon points="0,-22 -7,10 0,5 7,10" fill="#9eb1c8"/>
    <text x="0" y="-26" font-size="13" fill="${WALL_COL}" text-anchor="middle" font-weight="bold">N</text>
  </g>

  <!-- Scale bar -->
  <g transform="translate(${BX+BW+100},${BY+BH-70})">
    <rect x="0" y="0" width="50" height="12" fill="${WALL_COL}"/>
    <rect x="50" y="0" width="50" height="12" fill="white" stroke="${WALL_COL}" stroke-width="1.5"/>
    <rect x="100" y="0" width="50" height="12" fill="${WALL_COL}"/>
    <text x="0" y="26" font-size="11" fill="${WALL_COL}">0</text>
    <text x="48" y="26" font-size="11" fill="${WALL_COL}">5m</text>
    <text x="98" y="26" font-size="11" fill="${WALL_COL}">10m</text>
    <text x="75" y="-4" font-size="11" fill="#5a6a80" text-anchor="middle">Scale 1:50</text>
  </g>

  <!-- ═══════════════════════════════════════════════════════
       TITLE BLOCK (bottom strip)
  ════════════════════════════════════════════════════════ -->

  <rect x="10" y="${H-78}" width="${W-20}" height="68" fill="${WALL_COL}"/>
  <line x1="10" y1="${H-78}" x2="${W-10}" y2="${H-78}" stroke="#4a6a90" stroke-width="1"/>
  <!-- Left: Project info -->
  <text x="30" y="${H-55}" font-size="17" fill="white" font-weight="900">GROUND FLOOR PLAN</text>
  <text x="30" y="${H-33}" font-size="12" fill="#a0c0e0">Drawing No: HBP-GF-002  |  House Building Project  |  Scale 1:50  |  Date: 09 Aug 2026</text>
  <!-- Centre: client -->
  <text x="${W/2}" y="${H-55}" font-size="13" fill="#d0e4f8" text-anchor="middle" font-weight="bold">CLIENT: HOUSE BUILDING PROJECT</text>
  <text x="${W/2}" y="${H-34}" font-size="11" fill="#8ab0cc" text-anchor="middle">Drawn by: Arch. Division  |  Checked by: Structural Eng.  |  Approved by: Project Manager</text>
  <!-- Right: logo/company -->
  <text x="${W-30}" y="${H-55}" font-size="13" fill="#d0e4f8" text-anchor="end" font-weight="bold">BUILDTRACK</text>
  <text x="${W-30}" y="${H-34}" font-size="11" fill="#8ab0cc" text-anchor="end">Construction Management Platform</text>

</svg>`;

  return svg;
}

async function main() {
  console.log('Generating professional CAD-style Ground Floor Plan...\n');

  const svg = makeCADGroundFloorSVG();
  console.log(`  📐 SVG size: ${Math.round(svg.length / 1024)} KB`);

  // Save locally
  import('fs').then(({ default: fs }) => {
    fs.writeFileSync('./assets/improved-drawings/ground-floor-plan-cad.svg', svg, 'utf8');
    console.log('  💾 Saved to ./assets/improved-drawings/ground-floor-plan-cad.svg');
  });

  // Upload
  console.log(`  ☁️  Uploading to backend (drawing id: ${DRAWING_ID})...`);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const fd = new FormData();
  fd.append('file', blob, 'ground-floor-plan.svg');

  const r = await fetch(`${BASE}/drawings/${DRAWING_ID}/image`, {
    method: 'POST',
    body: fd,
  });

  if (!r.ok) {
    const body = await r.text();
    throw new Error(`Upload failed (${r.status}): ${body.slice(0, 400)}`);
  }

  const result = await r.json();
  console.log('  ✅ Upload succeeded!');
  console.log('  fileUrl prefix:', (result.fileUrl || '').slice(0, 80));
  console.log('\n✅ Done. Open https://buildtrack-withdrawing.onslate.in/ to see the updated Ground Floor Plan.');
}

main().catch(err => {
  console.error('\n❌ Failed:', err.message || err);
  process.exit(1);
});
