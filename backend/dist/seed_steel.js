"use strict";
/**
 * Steel Structure Building – Comprehensive Seed
 * -----------------------------------------------
 * Project  : Apex Steel Industrial Complex – Phase 1
 * Drawings : 5 (Foundation Plan, Column Erection, Beam Erection, Rafter Erection, Roof Sheet Layout)
 * Milestones: 5 (one per phase of construction)
 * Tasks    : ~12 per drawing, each with realistic attributes
 *
 * Run:
 *   cd backend
 *   npm run seed -- --file src/seed_steel.ts
 * or directly:
 *   node --experimental-sqlite -r ts-node/register/transpile-only src/seed_steel.ts
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSteelProject = seedSteelProject;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const db = __importStar(require("./db"));
// ─── Upload dir ────────────────────────────────────────────────────────────
const uploadDir = path_1.default.join(__dirname, '..', 'uploads');
if (!fs_1.default.existsSync(uploadDir))
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
const PROJECT_NAME = 'Apex Steel Industrial Complex – Phase 1';
// ─── Column position calibration helper ────────────────────────────────────
// Each drawing's SVG lays its grid out at a known originX/originY with fixed
// spacingX/spacingY inside a 1700x950 viewBox. DrawingCanvas falls back to
// naive edge-to-edge (0..1) spacing when no columnPositions are stored, which
// does NOT match these SVGs (grid is inset, not edge-to-edge). Precompute the
// exact normalized fractions here so markers land perfectly on the grid without
// requiring manual calibration.
const SVG_WIDTH = 1700;
const SVG_HEIGHT = 950;
let roofSheetPointMap = {};
function computeColumnPositions(cols, rows, originX, originY, spacingX, spacingY) {
    const positions = {};
    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < cols.length; c++) {
            const code = `${cols[c]}${rows[r]}`;
            const x = (originX + c * spacingX) / SVG_WIDTH;
            const y = (originY + r * spacingY) / SVG_HEIGHT;
            positions[code] = { x, y };
        }
    }
    return positions;
}
function computeGridPositions(cols, rows, points) {
    const positions = {};
    for (const row of rows) {
        for (const col of cols) {
            const code = `${col}${row}`;
            const point = points[code];
            if (point) {
                positions[code] = {
                    x: point.x / SVG_WIDTH,
                    y: point.y / SVG_HEIGHT,
                };
            }
        }
    }
    return positions;
}
// ─── Helpers ────────────────────────────────────────────────────────────────
function writeSvg(content) {
    const fileName = `${(0, uuid_1.v4)()}.svg`;
    fs_1.default.writeFileSync(path_1.default.join(uploadDir, fileName), content);
    return `/uploads/${fileName}`;
}
function writeSvgDataUrl(content) {
    return `data:image/svg+xml;base64,${Buffer.from(content).toString('base64')}`;
}
// ─── SVG Generators ─────────────────────────────────────────────────────────
/** DRAWING 1 – Basement Foundation Plan */
function foundationPlanSvg() {
    const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
    const rows = [1, 2, 3, 4, 5];
    const originX = 200, originY = 180, spacingX = 220, spacingY = 140;
    // Grid lines
    const vLines = cols.map((_, i) => `<line x1="${originX + i * spacingX}" y1="${originY - 50}"
           x2="${originX + i * spacingX}" y2="${originY + (rows.length - 1) * spacingY + 50}"
           stroke="#8B6914" stroke-width="1.5" stroke-dasharray="8 5"/>`).join('');
    const hLines = rows.map((_, i) => `<line x1="${originX - 50}" y1="${originY + i * spacingY}"
           x2="${originX + (cols.length - 1) * spacingX + 50}" y2="${originY + i * spacingY}"
           stroke="#8B6914" stroke-width="1.5" stroke-dasharray="8 5"/>`).join('');
    // Column labels (top + left)
    const colLabels = cols.map((c, i) => `<circle cx="${originX + i * spacingX}" cy="${originY - 70}" r="18" fill="#fff" stroke="#5c3d11" stroke-width="2"/>
     <text x="${originX + i * spacingX}" y="${originY - 64}" font-size="16" fill="#5c3d11" font-family="sans-serif" text-anchor="middle" font-weight="bold">${c}</text>`).join('');
    const rowLabels = rows.map((n, i) => `<circle cx="${originX - 70}" cy="${originY + i * spacingY}" r="18" fill="#fff" stroke="#5c3d11" stroke-width="2"/>
     <text x="${originX - 70}" y="${originY + i * spacingY + 6}" font-size="16" fill="#5c3d11" font-family="sans-serif" text-anchor="middle" font-weight="bold">${n}</text>`).join('');
    // Footing pads (large square + inner square)
    const footings = [];
    const pilings = [];
    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < cols.length; c++) {
            const x = originX + c * spacingX;
            const y = originY + r * spacingY;
            footings.push(`<rect x="${x - 30}" y="${y - 30}" width="60" height="60" fill="#d4b483" stroke="#5c3d11" stroke-width="2.5"/>
         <rect x="${x - 18}" y="${y - 18}" width="36" height="36" fill="#c8a45a" stroke="#5c3d11" stroke-width="1.5"/>
         <text x="${x + 36}" y="${y + 6}" font-size="12" fill="#1e3a5f" font-family="sans-serif" font-weight="bold">FP-${cols[c]}${rows[r]}</text>`);
            // Pile symbols at corners
            pilings.push(`<circle cx="${x - 22}" cy="${y - 22}" r="5" fill="none" stroke="#5c3d11" stroke-width="1.5"/>
         <circle cx="${x + 22}" cy="${y - 22}" r="5" fill="none" stroke="#5c3d11" stroke-width="1.5"/>
         <circle cx="${x - 22}" cy="${y + 22}" r="5" fill="none" stroke="#5c3d11" stroke-width="1.5"/>
         <circle cx="${x + 22}" cy="${y + 22}" r="5" fill="none" stroke="#5c3d11" stroke-width="1.5"/>`);
        }
    }
    // Grade beams
    const gradeBeams = rows.map((_, i) => `<line x1="${originX - 30}" y1="${originY + i * spacingY}"
           x2="${originX + (cols.length - 1) * spacingX + 30}" y2="${originY + i * spacingY}"
           stroke="#8B6914" stroke-width="8" stroke-linecap="round"/>`).join('') + cols.map((_, i) => `<line x1="${originX + i * spacingX}" y1="${originY - 30}"
           x2="${originX + i * spacingX}" y2="${originY + (rows.length - 1) * spacingY + 30}"
           stroke="#8B6914" stroke-width="8" stroke-linecap="round"/>`).join('');
    // Dimension labels
    const dimH = cols.slice(0, -1).map((_, i) => {
        const x1 = originX + i * spacingX;
        const x2 = originX + (i + 1) * spacingX;
        return `<line x1="${x1}" y1="${originY + (rows.length - 1) * spacingY + 70}" x2="${x2}" y2="${originY + (rows.length - 1) * spacingY + 70}" stroke="#333" stroke-width="1"/>
            <text x="${(x1 + x2) / 2}" y="${originY + (rows.length - 1) * spacingY + 65}" font-size="13" fill="#333" font-family="sans-serif" text-anchor="middle">7500</text>`;
    }).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1700" height="950" viewBox="0 0 1700 950">
  <rect width="1700" height="950" fill="#f9f4ea"/>
  <rect x="20" y="20" width="1660" height="910" fill="none" stroke="#5c3d11" stroke-width="3"/>
  <!-- Title Block -->
  <rect x="1300" y="20" width="380" height="910" fill="none" stroke="#5c3d11" stroke-width="2"/>
  <text x="1490" y="55" font-size="18" fill="#5c3d11" font-family="sans-serif" font-weight="bold" text-anchor="middle">PROJECT</text>
  <text x="1490" y="75" font-size="14" fill="#333" font-family="sans-serif" text-anchor="middle">APEX STEEL INDUSTRIAL COMPLEX</text>
  <line x1="1300" y1="90" x2="1680" y2="90" stroke="#5c3d11" stroke-width="1"/>
  <text x="1490" y="115" font-size="16" fill="#5c3d11" font-family="sans-serif" font-weight="bold" text-anchor="middle">DRAWING TITLE</text>
  <text x="1490" y="135" font-size="14" fill="#333" font-family="sans-serif" text-anchor="middle">BASEMENT FOUNDATION PLAN</text>
  <line x1="1300" y1="150" x2="1680" y2="150" stroke="#5c3d11" stroke-width="1"/>
  <text x="1310" y="175" font-size="12" fill="#333" font-family="sans-serif">Drawing No: STR-FND-001</text>
  <text x="1310" y="195" font-size="12" fill="#333" font-family="sans-serif">Scale: 1:100</text>
  <text x="1310" y="215" font-size="12" fill="#333" font-family="sans-serif">Rev: 03</text>
  <text x="1310" y="235" font-size="12" fill="#333" font-family="sans-serif">Date: 2026-03-15</text>
  <line x1="1300" y1="250" x2="1680" y2="250" stroke="#5c3d11" stroke-width="1"/>
  <text x="1310" y="270" font-size="12" fill="#333" font-family="sans-serif">LEGEND:</text>
  <rect x="1315" y="280" width="20" height="20" fill="#d4b483" stroke="#5c3d11" stroke-width="1.5"/>
  <text x="1345" y="295" font-size="11" fill="#333" font-family="sans-serif">Isolated Footing Pad</text>
  <circle cx="1325" cy="320" r="5" fill="none" stroke="#5c3d11" stroke-width="1.5"/>
  <text x="1345" y="325" font-size="11" fill="#333" font-family="sans-serif">Bored Pile (600 dia)</text>
  <line x1="1315" y1="350" x2="1345" y2="350" stroke="#8B6914" stroke-width="6"/>
  <text x="1355" y="355" font-size="11" fill="#333" font-family="sans-serif">Grade Beam GB-300x600</text>
  <text x="1310" y="400" font-size="11" fill="#333" font-family="sans-serif">NOTES:</text>
  <text x="1310" y="420" font-size="10" fill="#333" font-family="sans-serif">1. All dims in mm.</text>
  <text x="1310" y="438" font-size="10" fill="#333" font-family="sans-serif">2. Concrete: M30 grade.</text>
  <text x="1310" y="456" font-size="10" fill="#333" font-family="sans-serif">3. FOS bearing = 3.0 min.</text>
  <text x="1310" y="474" font-size="10" fill="#333" font-family="sans-serif">4. Pile cap reinf per Sch.</text>
  <text x="1310" y="492" font-size="10" fill="#333" font-family="sans-serif">5. Min. cover: 75mm.</text>
  <!-- Main Drawing Area -->
  <text x="640" y="60" font-size="26" fill="#5c3d11" font-family="sans-serif" font-weight="bold" text-anchor="middle">BASEMENT FOUNDATION PLAN  –  EL. (-) 3.500</text>
  ${vLines}
  ${hLines}
  ${gradeBeams}
  ${footings.join('')}
  ${pilings.join('')}
  ${colLabels}
  ${rowLabels}
  ${dimH}
  <!-- North Arrow -->
  <polygon points="80,870 90,840 100,870" fill="#333"/>
  <text x="90" y="895" font-size="14" fill="#333" font-family="sans-serif" text-anchor="middle" font-weight="bold">N</text>
</svg>`;
}
/** DRAWING 5 – Roof Sheet Layout Plan */
function roofSheetLayoutSvg() {
    const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
    const rows = [1, 2, 3, 4, 5];
    const originX = 210, originY = 180, spacingX = 200, spacingY = 135;
    const eaveLeft = originX - 40;
    const eaveRight = originX + (cols.length - 1) * spacingX + 40;
    const eaveTop = originY;
    const eaveBottom = originY + (rows.length - 1) * spacingY;
    const ridgeX = (eaveLeft + eaveRight) / 2;
    const vLines = cols.map((_, i) => {
        const x = originX + i * spacingX;
        return `<line x1="${x}" y1="${eaveTop - 60}" x2="${x}" y2="${eaveBottom + 60}" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="8 5"/>`;
    }).join('');
    const hLines = rows.map((_, i) => {
        const y = originY + i * spacingY;
        return `<line x1="${eaveLeft - 40}" y1="${y}" x2="${eaveRight + 40}" y2="${y}" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="8 5"/>`;
    }).join('');
    const roofOutline = `
    <polygon points="${eaveLeft},${eaveTop} ${ridgeX},${eaveTop - 55} ${eaveRight},${eaveTop} ${eaveRight},${eaveBottom} ${ridgeX},${eaveBottom + 55} ${eaveLeft},${eaveBottom}"
      fill="#f8fafc" stroke="#0f172a" stroke-width="3"/>
    <line x1="${ridgeX}" y1="${eaveTop - 55}" x2="${ridgeX}" y2="${eaveBottom + 55}" stroke="#7c2d12" stroke-width="4" stroke-dasharray="14 6"/>
    <text x="${ridgeX + 14}" y="${(eaveTop + eaveBottom) / 2}" font-size="12" fill="#7c2d12" font-family="sans-serif" font-weight="bold">RIDGE RL +18.450</text>`;
    const sheetLines = [];
    const sheetLabels = [];
    let sheetIndex = 1;
    for (let x = eaveLeft + 28; x < ridgeX - 18; x += 56) {
        sheetLines.push(`<line x1="${x}" y1="${eaveTop + 6}" x2="${x}" y2="${eaveBottom - 6}" stroke="#2563eb" stroke-width="1.2"/>`);
        sheetLabels.push(`<text x="${x + 8}" y="${eaveTop + 24}" font-size="9" fill="#1d4ed8" font-family="sans-serif">S${sheetIndex++}</text>`);
    }
    for (let x = ridgeX + 18; x < eaveRight - 18; x += 56) {
        sheetLines.push(`<line x1="${x}" y1="${eaveTop + 6}" x2="${x}" y2="${eaveBottom - 6}" stroke="#2563eb" stroke-width="1.2"/>`);
        sheetLabels.push(`<text x="${x + 8}" y="${eaveTop + 24}" font-size="9" fill="#1d4ed8" font-family="sans-serif">S${sheetIndex++}</text>`);
    }
    const lapLines = rows.slice(0, -1).map((_, i) => {
        const y = originY + i * spacingY + spacingY / 2;
        return `<line x1="${eaveLeft + 8}" y1="${y}" x2="${eaveRight - 8}" y2="${y}" stroke="#ea580c" stroke-width="1.5" stroke-dasharray="7 5"/>
      <text x="${eaveRight + 14}" y="${y + 4}" font-size="10" fill="#c2410c" font-family="sans-serif">End lap 200</text>`;
    }).join('');
    const fixingPoints = [];
    const pointMap = {};
    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < cols.length; c++) {
            const x = originX + c * spacingX;
            const y = originY + r * spacingY;
            fixingPoints.push(`<circle cx="${x}" cy="${y}" r="8" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
        <circle cx="${x}" cy="${y}" r="2.5" fill="#0f172a"/>
        <text x="${x + 10}" y="${y - 10}" font-size="10" fill="#0f172a" font-family="sans-serif" font-weight="bold">${cols[c]}${rows[r]}</text>`);
            pointMap[`${cols[c]}${rows[r]}`] = { x, y };
        }
    }
    const colLabels = cols.map((c, i) => `<circle cx="${originX + i * spacingX}" cy="${eaveTop - 85}" r="18" fill="#fff" stroke="#0f172a" stroke-width="2"/>
    <text x="${originX + i * spacingX}" y="${eaveTop - 79}" font-size="16" fill="#0f172a" font-family="sans-serif" text-anchor="middle" font-weight="bold">${c}</text>`).join('');
    const rowLabels = rows.map((n, i) => `<circle cx="${eaveLeft - 85}" cy="${originY + i * spacingY}" r="18" fill="#fff" stroke="#0f172a" stroke-width="2"/>
    <text x="${eaveLeft - 85}" y="${originY + i * spacingY + 6}" font-size="16" fill="#0f172a" font-family="sans-serif" text-anchor="middle" font-weight="bold">${n}</text>`).join('');
    const dims = `
    <line x1="${originX}" y1="${eaveBottom + 90}" x2="${originX + spacingX}" y2="${eaveBottom + 90}" stroke="#111827" stroke-width="1.4"/>
    <text x="${originX + spacingX / 2}" y="${eaveBottom + 82}" font-size="12" fill="#111827" font-family="sans-serif" text-anchor="middle">7500</text>
    <line x1="${eaveRight + 70}" y1="${originY}" x2="${eaveRight + 70}" y2="${originY + spacingY}" stroke="#111827" stroke-width="1.4"/>
    <text x="${eaveRight + 84}" y="${originY + spacingY / 2}" font-size="12" fill="#111827" font-family="sans-serif">6000</text>
    <line x1="${eaveLeft}" y1="${eaveTop - 110}" x2="${ridgeX}" y2="${eaveTop - 110}" stroke="#111827" stroke-width="1.4"/>
    <text x="${(eaveLeft + ridgeX) / 2}" y="${eaveTop - 118}" font-size="12" fill="#111827" font-family="sans-serif" text-anchor="middle">Roof slope run 9500</text>`;
    const notes = `
    <text x="1310" y="395" font-size="11" fill="#333" font-family="sans-serif">SHEET / FIXING NOTES:</text>
    <text x="1310" y="415" font-size="10" fill="#333" font-family="sans-serif">1. 0.58 BMT IBR Zincalume roof sheeting.</text>
    <text x="1310" y="433" font-size="10" fill="#333" font-family="sans-serif">2. Side lap: 1.5 corrugation minimum.</text>
    <text x="1310" y="451" font-size="10" fill="#333" font-family="sans-serif">3. End lap: 200mm with butyl tape seal.</text>
    <text x="1310" y="469" font-size="10" fill="#333" font-family="sans-serif">4. Crest fixing with 14g-65 screws @ each purlin.</text>
    <text x="1310" y="487" font-size="10" fill="#333" font-family="sans-serif">5. Ridge cap overlap 150mm min.</text>`;
    roofSheetPointMap = pointMap;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1700" height="950" viewBox="0 0 1700 950">
  <rect width="1700" height="950" fill="#f8fafc"/>
  <rect x="20" y="20" width="1660" height="910" fill="none" stroke="#0f172a" stroke-width="3"/>
  <rect x="1300" y="20" width="380" height="910" fill="none" stroke="#0f172a" stroke-width="2"/>
  <text x="1490" y="55" font-size="18" fill="#0f172a" font-family="sans-serif" font-weight="bold" text-anchor="middle">PROJECT</text>
  <text x="1490" y="75" font-size="13" fill="#333" font-family="sans-serif" text-anchor="middle">APEX STEEL INDUSTRIAL COMPLEX</text>
  <line x1="1300" y1="90" x2="1680" y2="90" stroke="#0f172a" stroke-width="1"/>
  <text x="1490" y="115" font-size="15" fill="#0f172a" font-family="sans-serif" font-weight="bold" text-anchor="middle">DRAWING TITLE</text>
  <text x="1490" y="135" font-size="13" fill="#333" font-family="sans-serif" text-anchor="middle">ROOF SHEET LAYOUT</text>
  <line x1="1300" y1="150" x2="1680" y2="150" stroke="#0f172a" stroke-width="1"/>
  <text x="1310" y="175" font-size="12" fill="#333" font-family="sans-serif">Drawing No: STR-RSL-005</text>
  <text x="1310" y="195" font-size="12" fill="#333" font-family="sans-serif">Scale: 1:100</text>
  <text x="1310" y="215" font-size="12" fill="#333" font-family="sans-serif">Rev: 00</text>
  <text x="1310" y="235" font-size="12" fill="#333" font-family="sans-serif">Date: 2026-05-16</text>
  <line x1="1300" y1="250" x2="1680" y2="250" stroke="#0f172a" stroke-width="1"/>
  <text x="1310" y="275" font-size="12" fill="#333" font-family="sans-serif">LEGEND:</text>
  <line x1="1315" y1="290" x2="1355" y2="290" stroke="#2563eb" stroke-width="1.5"/>
  <text x="1365" y="295" font-size="11" fill="#333" font-family="sans-serif">Sheet rib line</text>
  <line x1="1315" y1="318" x2="1355" y2="318" stroke="#ea580c" stroke-width="1.5" stroke-dasharray="7 5"/>
  <text x="1365" y="323" font-size="11" fill="#333" font-family="sans-serif">End lap line</text>
  <circle cx="1335" cy="348" r="8" fill="#fff" stroke="#0f172a" stroke-width="2"/>
  <circle cx="1335" cy="348" r="2.5" fill="#0f172a"/>
  <text x="1365" y="353" font-size="11" fill="#333" font-family="sans-serif">Grid fixing / support point</text>
  ${notes}
  <text x="640" y="60" font-size="26" fill="#0f172a" font-family="sans-serif" font-weight="bold" text-anchor="middle">ROOF SHEET LAYOUT PLAN – ROOF LEVEL</text>
  ${vLines}
  ${hLines}
  ${roofOutline}
  ${sheetLines.join('')}
  ${sheetLabels.join('')}
  ${lapLines}
  ${fixingPoints.join('')}
  ${colLabels}
  ${rowLabels}
  ${dims}
  <polygon points="80,870 90,840 100,870" fill="#0f172a"/>
  <text x="90" y="898" font-size="14" fill="#0f172a" font-family="sans-serif" text-anchor="middle" font-weight="bold">N</text>
 </svg>`;
}
/** DRAWING 2 – Steel Column Erection Plan */
function columnErectionSvg() {
    const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
    const rows = [1, 2, 3, 4, 5];
    const originX = 200, originY = 190, spacingX = 220, spacingY = 140;
    const vLines = cols.map((_, i) => `<line x1="${originX + i * spacingX}" y1="${originY - 60}"
           x2="${originX + i * spacingX}" y2="${originY + (rows.length - 1) * spacingY + 60}"
           stroke="#aab4be" stroke-width="1" stroke-dasharray="8 5"/>`).join('');
    const hLines = rows.map((_, i) => `<line x1="${originX - 60}" y1="${originY + i * spacingY}"
           x2="${originX + (cols.length - 1) * spacingX + 60}" y2="${originY + i * spacingY}"
           stroke="#aab4be" stroke-width="1" stroke-dasharray="8 5"/>`).join('');
    const colLabels = cols.map((c, i) => `<circle cx="${originX + i * spacingX}" cy="${originY - 80}" r="18" fill="#fff" stroke="#1e3a5f" stroke-width="2"/>
     <text x="${originX + i * spacingX}" y="${originY - 74}" font-size="16" fill="#1e3a5f" font-family="sans-serif" text-anchor="middle" font-weight="bold">${c}</text>`).join('');
    const rowLabels = rows.map((n, i) => `<circle cx="${originX - 80}" cy="${originY + i * spacingY}" r="18" fill="#fff" stroke="#1e3a5f" stroke-width="2"/>
     <text x="${originX - 80}" y="${originY + i * spacingY + 6}" font-size="16" fill="#1e3a5f" font-family="sans-serif" text-anchor="middle" font-weight="bold">${n}</text>`).join('');
    // Columns as H-section symbols
    const columns = [];
    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < cols.length; c++) {
            const x = originX + c * spacingX;
            const y = originY + r * spacingY;
            const section = (r + c) % 3 === 0 ? 'UC305x305x97' : (r + c) % 3 === 1 ? 'UC254x254x73' : 'UC203x203x60';
            // H-section: two flanges + web
            columns.push(`<rect x="${x - 14}" y="${y - 14}" width="28" height="4" fill="#1e3a5f"/>
         <rect x="${x - 14}" y="${y + 10}" width="28" height="4" fill="#1e3a5f"/>
         <rect x="${x - 2}" y="${y - 14}" width="4" height="28" fill="#1e3a5f"/>
         <text x="${x + 18}" y="${y - 4}" font-size="10" fill="#1e40af" font-family="sans-serif" font-weight="bold">${cols[c]}${rows[r]}</text>
         <text x="${x + 18}" y="${y + 10}" font-size="9" fill="#374151" font-family="sans-serif">${section}</text>`);
        }
    }
    // Base plate details (dashed circle)
    const basePlates = [];
    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < cols.length; c++) {
            const x = originX + c * spacingX;
            const y = originY + r * spacingY;
            basePlates.push(`<circle cx="${x}" cy="${y}" r="22" fill="none" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="5 4"/>`);
        }
    }
    // Level callouts on right side
    const levels = ['GL ± 0.000', '+4.500 (1F)', '+9.000 (2F)', '+13.500 (3F)', '+18.000 (Roof)'];
    const levelMarks = levels.map((lv, i) => `<line x1="${originX + (cols.length - 1) * spacingX + 70}" y1="${originY + i * spacingY}"
           x2="${originX + (cols.length - 1) * spacingX + 140}" y2="${originY + i * spacingY}"
           stroke="#dc2626" stroke-width="1.5"/>
     <text x="${originX + (cols.length - 1) * spacingX + 145}" y="${originY + i * spacingY + 5}" font-size="12" fill="#dc2626" font-family="sans-serif">${lv}</text>`).join('');
    // Anchor bolt callout
    const anchorNote = `<rect x="30" y="820" width="320" height="60" fill="#fff9db" stroke="#ca8a04" stroke-width="1.5" rx="4"/>
    <text x="190" y="840" font-size="12" fill="#92400e" font-family="sans-serif" text-anchor="middle" font-weight="bold">ANCHOR BOLT DETAIL</text>
    <text x="40" y="858" font-size="10" fill="#333" font-family="sans-serif">Type: M24 HD Bolts, 4 Nos. per column</text>
    <text x="40" y="874" font-size="10" fill="#333" font-family="sans-serif">Projection: 150mm above Fin. FL, Grade 8.8</text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1700" height="950" viewBox="0 0 1700 950">
  <rect width="1700" height="950" fill="#eef2f6"/>
  <rect x="20" y="20" width="1660" height="910" fill="none" stroke="#1e3a5f" stroke-width="3"/>
  <!-- Title Block -->
  <rect x="1300" y="20" width="380" height="910" fill="none" stroke="#1e3a5f" stroke-width="2"/>
  <text x="1490" y="55" font-size="18" fill="#1e3a5f" font-family="sans-serif" font-weight="bold" text-anchor="middle">PROJECT</text>
  <text x="1490" y="75" font-size="13" fill="#333" font-family="sans-serif" text-anchor="middle">APEX STEEL INDUSTRIAL COMPLEX</text>
  <line x1="1300" y1="90" x2="1680" y2="90" stroke="#1e3a5f" stroke-width="1"/>
  <text x="1490" y="115" font-size="15" fill="#1e3a5f" font-family="sans-serif" font-weight="bold" text-anchor="middle">DRAWING TITLE</text>
  <text x="1490" y="135" font-size="13" fill="#333" font-family="sans-serif" text-anchor="middle">STEEL COLUMN ERECTION PLAN</text>
  <line x1="1300" y1="150" x2="1680" y2="150" stroke="#1e3a5f" stroke-width="1"/>
  <text x="1310" y="175" font-size="12" fill="#333" font-family="sans-serif">Drawing No: STR-COL-002</text>
  <text x="1310" y="195" font-size="12" fill="#333" font-family="sans-serif">Scale: 1:100</text>
  <text x="1310" y="215" font-size="12" fill="#333" font-family="sans-serif">Rev: 04</text>
  <text x="1310" y="235" font-size="12" fill="#333" font-family="sans-serif">Date: 2026-04-01</text>
  <line x1="1300" y1="250" x2="1680" y2="250" stroke="#1e3a5f" stroke-width="1"/>
  <text x="1310" y="275" font-size="12" fill="#333" font-family="sans-serif">LEGEND:</text>
  <rect x="1315" y="285" width="10" height="20" fill="#1e3a5f"/>
  <text x="1335" y="300" font-size="11" fill="#333" font-family="sans-serif">UC H-Section Column</text>
  <circle cx="1325" cy="330" r="14" fill="none" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="4 3"/>
  <text x="1345" y="335" font-size="11" fill="#333" font-family="sans-serif">Base Plate (BPL)</text>
  <text x="1310" y="375" font-size="11" fill="#333" font-family="sans-serif">COLUMN SCHEDULE:</text>
  <text x="1310" y="395" font-size="10" fill="#333" font-family="sans-serif">C1: UC305x305x97 kg/m</text>
  <text x="1310" y="413" font-size="10" fill="#333" font-family="sans-serif">C2: UC254x254x73 kg/m</text>
  <text x="1310" y="431" font-size="10" fill="#333" font-family="sans-serif">C3: UC203x203x60 kg/m</text>
  <text x="1310" y="460" font-size="11" fill="#333" font-family="sans-serif">NOTES:</text>
  <text x="1310" y="478" font-size="10" fill="#333" font-family="sans-serif">1. Steel: S355 grade.</text>
  <text x="1310" y="496" font-size="10" fill="#333" font-family="sans-serif">2. Welding: E7018 electrodes.</text>
  <text x="1310" y="514" font-size="10" fill="#333" font-family="sans-serif">3. Bolts: ASTM A325, HSFG.</text>
  <text x="1310" y="532" font-size="10" fill="#333" font-family="sans-serif">4. Plumb tol: H/500 max.</text>
  <text x="1310" y="550" font-size="10" fill="#333" font-family="sans-serif">5. Grout base plate: 50mm.</text>
  <!-- Main Drawing Area -->
  <text x="640" y="60" font-size="26" fill="#1e3a5f" font-family="sans-serif" font-weight="bold" text-anchor="middle">STEEL COLUMN ERECTION PLAN  –  ALL LEVELS</text>
  ${vLines}
  ${hLines}
  ${basePlates.join('')}
  ${columns.join('')}
  ${colLabels}
  ${rowLabels}
  ${levelMarks}
  ${anchorNote}
  <!-- North Arrow -->
  <polygon points="80,870 90,840 100,870" fill="#1e3a5f"/>
  <text x="90" y="898" font-size="14" fill="#1e3a5f" font-family="sans-serif" text-anchor="middle" font-weight="bold">N</text>
</svg>`;
}
/** DRAWING 3 – Steel Beam Erection Plan */
function beamErectionSvg() {
    const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
    const rows = [1, 2, 3, 4, 5];
    const originX = 200, originY = 190, spacingX = 220, spacingY = 140;
    const vLines = cols.map((_, i) => `<line x1="${originX + i * spacingX}" y1="${originY - 60}"
           x2="${originX + i * spacingX}" y2="${originY + (rows.length - 1) * spacingY + 60}"
           stroke="#aab4be" stroke-width="1" stroke-dasharray="8 5"/>`).join('');
    const hLines = rows.map((_, i) => `<line x1="${originX - 60}" y1="${originY + i * spacingY}"
           x2="${originX + (cols.length - 1) * spacingX + 60}" y2="${originY + i * spacingY}"
           stroke="#aab4be" stroke-width="1" stroke-dasharray="8 5"/>`).join('');
    const colLabels = cols.map((c, i) => `<circle cx="${originX + i * spacingX}" cy="${originY - 80}" r="18" fill="#fff" stroke="#065f46" stroke-width="2"/>
     <text x="${originX + i * spacingX}" y="${originY - 74}" font-size="16" fill="#065f46" font-family="sans-serif" text-anchor="middle" font-weight="bold">${c}</text>`).join('');
    const rowLabels = rows.map((n, i) => `<circle cx="${originX - 80}" cy="${originY + i * spacingY}" r="18" fill="#fff" stroke="#065f46" stroke-width="2"/>
     <text x="${originX - 80}" y="${originY + i * spacingY + 6}" font-size="16" fill="#065f46" font-family="sans-serif" text-anchor="middle" font-weight="bold">${n}</text>`).join('');
    // Column stubs (small squares)
    const columnStubs = [];
    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < cols.length; c++) {
            const x = originX + c * spacingX;
            const y = originY + r * spacingY;
            columnStubs.push(`<rect x="${x - 8}" y="${y - 8}" width="16" height="16" fill="#9ca3af" stroke="#1e3a5f" stroke-width="2"/>`);
        }
    }
    // Primary beams (horizontal, bold blue line + section label)
    const primaryBeams = [];
    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < cols.length - 1; c++) {
            const x1 = originX + c * spacingX + 8;
            const x2 = originX + (c + 1) * spacingX - 8;
            const y = originY + r * spacingY;
            const section = r % 2 === 0 ? 'UB457x191x67' : 'UB406x178x60';
            primaryBeams.push(`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#065f46" stroke-width="6" stroke-linecap="round"/>
         <text x="${(x1 + x2) / 2}" y="${y - 8}" font-size="9" fill="#065f46" font-family="sans-serif" text-anchor="middle">${section}</text>`);
        }
    }
    // Secondary beams (vertical, thinner green line + label)
    const secondaryBeams = [];
    for (let r = 0; r < rows.length - 1; r++) {
        for (let c = 0; c < cols.length; c++) {
            const x = originX + c * spacingX;
            const y1 = originY + r * spacingY + 8;
            const y2 = originY + (r + 1) * spacingY - 8;
            secondaryBeams.push(`<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#0284c7" stroke-width="3.5" stroke-linecap="round"/>
         <text x="${x + 6}" y="${(y1 + y2) / 2 + 4}" font-size="9" fill="#0284c7" font-family="sans-serif">UB305x127x37</text>`);
        }
    }
    // Connection symbols (bolt group circles)
    const connections = [];
    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < cols.length; c++) {
            const x = originX + c * spacingX;
            const y = originY + r * spacingY;
            connections.push(`<circle cx="${x}" cy="${y}" r="10" fill="none" stroke="#dc2626" stroke-width="1.5"/>`);
        }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1700" height="950" viewBox="0 0 1700 950">
  <rect width="1700" height="950" fill="#f0fdf4"/>
  <rect x="20" y="20" width="1660" height="910" fill="none" stroke="#065f46" stroke-width="3"/>
  <!-- Title Block -->
  <rect x="1300" y="20" width="380" height="910" fill="none" stroke="#065f46" stroke-width="2"/>
  <text x="1490" y="55" font-size="18" fill="#065f46" font-family="sans-serif" font-weight="bold" text-anchor="middle">PROJECT</text>
  <text x="1490" y="75" font-size="13" fill="#333" font-family="sans-serif" text-anchor="middle">APEX STEEL INDUSTRIAL COMPLEX</text>
  <line x1="1300" y1="90" x2="1680" y2="90" stroke="#065f46" stroke-width="1"/>
  <text x="1490" y="115" font-size="15" fill="#065f46" font-family="sans-serif" font-weight="bold" text-anchor="middle">DRAWING TITLE</text>
  <text x="1490" y="135" font-size="13" fill="#333" font-family="sans-serif" text-anchor="middle">STEEL BEAM ERECTION PLAN</text>
  <line x1="1300" y1="150" x2="1680" y2="150" stroke="#065f46" stroke-width="1"/>
  <text x="1310" y="175" font-size="12" fill="#333" font-family="sans-serif">Drawing No: STR-BEA-003</text>
  <text x="1310" y="195" font-size="12" fill="#333" font-family="sans-serif">Scale: 1:100</text>
  <text x="1310" y="215" font-size="12" fill="#333" font-family="sans-serif">Rev: 02</text>
  <text x="1310" y="235" font-size="12" fill="#333" font-family="sans-serif">Date: 2026-04-20</text>
  <line x1="1300" y1="250" x2="1680" y2="250" stroke="#065f46" stroke-width="1"/>
  <text x="1310" y="270" font-size="12" fill="#333" font-family="sans-serif">LEGEND:</text>
  <line x1="1315" y1="288" x2="1365" y2="288" stroke="#065f46" stroke-width="6"/>
  <text x="1375" y="293" font-size="11" fill="#333" font-family="sans-serif">Primary Beam (PB)</text>
  <line x1="1315" y1="315" x2="1365" y2="315" stroke="#0284c7" stroke-width="3.5"/>
  <text x="1375" y="320" font-size="11" fill="#333" font-family="sans-serif">Secondary Beam (SB)</text>
  <circle cx="1330" cy="345" r="9" fill="none" stroke="#dc2626" stroke-width="1.5"/>
  <text x="1348" y="350" font-size="11" fill="#333" font-family="sans-serif">Bolted Connection</text>
  <text x="1310" y="385" font-size="11" fill="#333" font-family="sans-serif">BEAM SCHEDULE:</text>
  <text x="1310" y="403" font-size="10" fill="#333" font-family="sans-serif">PB1: UB457x191x67 kg/m</text>
  <text x="1310" y="421" font-size="10" fill="#333" font-family="sans-serif">PB2: UB406x178x60 kg/m</text>
  <text x="1310" y="439" font-size="10" fill="#333" font-family="sans-serif">SB1: UB305x127x37 kg/m</text>
  <text x="1310" y="468" font-size="11" fill="#333" font-family="sans-serif">NOTES:</text>
  <text x="1310" y="486" font-size="10" fill="#333" font-family="sans-serif">1. Steel grade: S355 J2.</text>
  <text x="1310" y="504" font-size="10" fill="#333" font-family="sans-serif">2. All connections per Conn. Sch.</text>
  <text x="1310" y="522" font-size="10" fill="#333" font-family="sans-serif">3. Beam camber: L/360.</text>
  <text x="1310" y="540" font-size="10" fill="#333" font-family="sans-serif">4. Stud shear connectors: 19ø.</text>
  <!-- Main Drawing -->
  <text x="640" y="60" font-size="26" fill="#065f46" font-family="sans-serif" font-weight="bold" text-anchor="middle">STEEL BEAM ERECTION PLAN  –  LEVEL +4.500 (1F)</text>
  ${vLines}
  ${hLines}
  ${primaryBeams.join('')}
  ${secondaryBeams.join('')}
  ${columnStubs.join('')}
  ${connections.join('')}
  ${colLabels}
  ${rowLabels}
  <!-- North Arrow -->
  <polygon points="80,870 90,840 100,870" fill="#065f46"/>
  <text x="90" y="898" font-size="14" fill="#065f46" font-family="sans-serif" text-anchor="middle" font-weight="bold">N</text>
</svg>`;
}
/** DRAWING 4 – Steel Rafter Erection Plan */
function rafterErectionSvg() {
    const cols = ['A', 'B', 'C', 'D', 'E', 'F'];
    const rows = [1, 2, 3, 4, 5];
    const originX = 200, originY = 200, spacingX = 220, spacingY = 130;
    // Rafter lines (diagonal from column top to ridge)
    const ridgeY = originY - 30;
    const ridgeX1 = originX;
    const ridgeX2 = originX + (cols.length - 1) * spacingX;
    // Ridge beam
    const ridgeBeam = `<line x1="${ridgeX1}" y1="${ridgeY + 15}" x2="${ridgeX2}" y2="${ridgeY + 15}" stroke="#7c3aed" stroke-width="7" stroke-linecap="round"/>
    <text x="${(ridgeX1 + ridgeX2) / 2}" y="${ridgeY}" font-size="12" fill="#7c3aed" font-family="sans-serif" text-anchor="middle" font-weight="bold">RIDGE BEAM RB1 – UB254x146x37</text>`;
    // Rafters from each column to ridge
    const rafters = [];
    for (let c = 0; c < cols.length; c++) {
        for (let r = 0; r < rows.length; r++) {
            const x = originX + c * spacingX;
            const y = originY + r * spacingY;
            // Rafter going up-right and up-left
            rafters.push(`<line x1="${x}" y1="${y}" x2="${x}" y2="${ridgeY + 15}" stroke="#a855f7" stroke-width="4" stroke-linecap="round"/>
         <text x="${x + 5}" y="${y - 20}" font-size="9" fill="#7c3aed" font-family="sans-serif">RF-${cols[c]}${rows[r]}</text>`);
        }
    }
    // Purlins (horizontal lines between rafters)
    const purlins = [];
    for (let p = 1; p < 5; p++) {
        const py = originY + (p - 1) * spacingY + spacingY / 2;
        purlins.push(`<line x1="${originX}" y1="${py}" x2="${originX + (cols.length - 1) * spacingX}" y2="${py}"
             stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="10 5"/>
       <text x="${originX + (cols.length - 1) * spacingX + 10}" y="${py + 5}" font-size="10" fill="#b45309" font-family="sans-serif">PL-${p} RHS100x50x4</text>`);
    }
    // Bracing diagonals
    const bracings = [];
    for (let r = 0; r < rows.length - 1; r++) {
        const y1 = originY + r * spacingY;
        const y2 = originY + (r + 1) * spacingY;
        bracings.push(`<line x1="${originX}" y1="${y1}" x2="${originX + spacingX}" y2="${y2}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="6 4"/>`, `<line x1="${originX + spacingX}" y1="${y1}" x2="${originX}" y2="${y2}" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="6 4"/>`);
    }
    // Grid labels
    const colLabels = cols.map((c, i) => `<circle cx="${originX + i * spacingX}" cy="${originY + (rows.length - 1) * spacingY + 60}" r="18" fill="#fff" stroke="#7c3aed" stroke-width="2"/>
     <text x="${originX + i * spacingX}" y="${originY + (rows.length - 1) * spacingY + 66}" font-size="16" fill="#7c3aed" font-family="sans-serif" text-anchor="middle" font-weight="bold">${c}</text>`).join('');
    const rowLabels = rows.map((n, i) => `<circle cx="${originX - 80}" cy="${originY + i * spacingY}" r="18" fill="#fff" stroke="#7c3aed" stroke-width="2"/>
     <text x="${originX - 80}" y="${originY + i * spacingY + 6}" font-size="16" fill="#7c3aed" font-family="sans-serif" text-anchor="middle" font-weight="bold">${n}</text>`).join('');
    // Slope callout
    const slopeArrow = `<line x1="100" y1="400" x2="170" y2="340" stroke="#dc2626" stroke-width="2" marker-end="url(#arrow)"/>
    <text x="55" y="420" font-size="13" fill="#dc2626" font-family="sans-serif">SLOPE: 1:10 (5.7°)</text>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="1700" height="950" viewBox="0 0 1700 950">
  <defs>
    <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
      <path d="M0,0 L8,4 L0,8 Z" fill="#dc2626"/>
    </marker>
  </defs>
  <rect width="1700" height="950" fill="#faf5ff"/>
  <rect x="20" y="20" width="1660" height="910" fill="none" stroke="#7c3aed" stroke-width="3"/>
  <!-- Title Block -->
  <rect x="1300" y="20" width="380" height="910" fill="none" stroke="#7c3aed" stroke-width="2"/>
  <text x="1490" y="55" font-size="18" fill="#7c3aed" font-family="sans-serif" font-weight="bold" text-anchor="middle">PROJECT</text>
  <text x="1490" y="75" font-size="13" fill="#333" font-family="sans-serif" text-anchor="middle">APEX STEEL INDUSTRIAL COMPLEX</text>
  <line x1="1300" y1="90" x2="1680" y2="90" stroke="#7c3aed" stroke-width="1"/>
  <text x="1490" y="115" font-size="15" fill="#7c3aed" font-family="sans-serif" font-weight="bold" text-anchor="middle">DRAWING TITLE</text>
  <text x="1490" y="135" font-size="13" fill="#333" font-family="sans-serif" text-anchor="middle">STEEL RAFTER ERECTION PLAN</text>
  <line x1="1300" y1="150" x2="1680" y2="150" stroke="#7c3aed" stroke-width="1"/>
  <text x="1310" y="175" font-size="12" fill="#333" font-family="sans-serif">Drawing No: STR-RAF-004</text>
  <text x="1310" y="195" font-size="12" fill="#333" font-family="sans-serif">Scale: 1:100</text>
  <text x="1310" y="215" font-size="12" fill="#333" font-family="sans-serif">Rev: 01</text>
  <text x="1310" y="235" font-size="12" fill="#333" font-family="sans-serif">Date: 2026-05-10</text>
  <line x1="1300" y1="250" x2="1680" y2="250" stroke="#7c3aed" stroke-width="1"/>
  <text x="1310" y="270" font-size="12" fill="#333" font-family="sans-serif">LEGEND:</text>
  <line x1="1315" y1="285" x2="1355" y2="285" stroke="#7c3aed" stroke-width="7"/>
  <text x="1365" y="290" font-size="11" fill="#333" font-family="sans-serif">Ridge Beam (RB)</text>
  <line x1="1315" y1="310" x2="1355" y2="310" stroke="#a855f7" stroke-width="4"/>
  <text x="1365" y="315" font-size="11" fill="#333" font-family="sans-serif">Rafter (RF)</text>
  <line x1="1315" y1="335" x2="1355" y2="335" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="8 4"/>
  <text x="1365" y="340" font-size="11" fill="#333" font-family="sans-serif">Purlin (PL)</text>
  <line x1="1315" y1="358" x2="1355" y2="368" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="5 3"/>
  <text x="1365" y="365" font-size="11" fill="#333" font-family="sans-serif">Bracing (BR)</text>
  <text x="1310" y="400" font-size="11" fill="#333" font-family="sans-serif">RAFTER SCHEDULE:</text>
  <text x="1310" y="418" font-size="10" fill="#333" font-family="sans-serif">RF1: UB203x133x25 kg/m</text>
  <text x="1310" y="436" font-size="10" fill="#333" font-family="sans-serif">RF2: CHS114.3x5 (hip)</text>
  <text x="1310" y="454" font-size="10" fill="#333" font-family="sans-serif">PL1-4: RHS100x50x4</text>
  <text x="1310" y="483" font-size="11" fill="#333" font-family="sans-serif">NOTES:</text>
  <text x="1310" y="501" font-size="10" fill="#333" font-family="sans-serif">1. Roof pitch: 1:10.</text>
  <text x="1310" y="519" font-size="10" fill="#333" font-family="sans-serif">2. Wind uplift per AS1170.2.</text>
  <text x="1310" y="537" font-size="10" fill="#333" font-family="sans-serif">3. All lap splices min. 2 bolts.</text>
  <text x="1310" y="555" font-size="10" fill="#333" font-family="sans-serif">4. Anti-sag bars: mid-span.</text>
  <!-- Main Drawing -->
  <text x="640" y="55" font-size="26" fill="#7c3aed" font-family="sans-serif" font-weight="bold" text-anchor="middle">STEEL RAFTER ERECTION PLAN  –  ROOF LEVEL</text>
  ${bracings.join('')}
  ${purlins.join('')}
  ${rafters.join('')}
  ${ridgeBeam}
  ${colLabels}
  ${rowLabels}
  ${slopeArrow}
  <!-- North Arrow -->
  <polygon points="80,870 90,840 100,870" fill="#7c3aed"/>
  <text x="90" y="898" font-size="14" fill="#7c3aed" font-family="sans-serif" text-anchor="middle" font-weight="bold">N</text>
</svg>`;
}
const roofSheetGridPositions = () => computeGridPositions(['A', 'B', 'C', 'D', 'E', 'F'], [1, 2, 3, 4, 5], roofSheetPointMap);
async function seedSteelProject(req) {
    const existing = await db.get(req, `SELECT id FROM projects WHERE name = ?`, [PROJECT_NAME]);
    if (existing)
        return;
    const now = new Date().toISOString();
    const projectId = (0, uuid_1.v4)();
    const projectNow = now;
    const localDb = db.default;
    // ─── Data: Project ──────────────────────────────────────────────────────────
    localDb.prepare(`INSERT INTO projects (id, name, code, description, startDate, endDate, status, managerName, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(projectId, 'Apex Steel Industrial Complex – Phase 1', 'ASIC-P1', 'Full steel structural building comprising basement foundation, steel column erection, primary/secondary beam erection, and roof rafter erection. Six-bay × five-bay grid, four storeys + roof.', '2026-03-01', '2026-12-31', 'In Progress', 'Rajesh Nair (Sr. Project Manager)', projectNow, projectNow);
    // ─── Data: Milestones ───────────────────────────────────────────────────────
    const milestoneIds = {
        m1: (0, uuid_1.v4)(),
        m2: (0, uuid_1.v4)(),
        m3: (0, uuid_1.v4)(),
        m4: (0, uuid_1.v4)(),
        m5: (0, uuid_1.v4)(),
    };
    const insertMilestone = localDb.prepare(`INSERT INTO milestones (id, projectId, name, description, dueDate, status, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    insertMilestone.run(milestoneIds.m1, projectId, 'M1 – Site Preparation & Earthworks', 'Topsoil removal, excavation to formation level, dewatering, and setting out of grid lines.', '2026-04-15', 'Completed', projectNow, projectNow);
    insertMilestone.run(milestoneIds.m2, projectId, 'M2 – Piling & Foundation', 'Bored pile installation (600 dia), pile caps, grade beams, and basement slab concrete works.', '2026-06-30', 'Active', projectNow, projectNow);
    insertMilestone.run(milestoneIds.m3, projectId, 'M3 – Steel Column Erection', 'Delivery, fabrication inspection, crane lifting, plumbing, and final bolting of all UC columns.', '2026-08-15', 'Active', projectNow, projectNow);
    insertMilestone.run(milestoneIds.m4, projectId, 'M4 – Steel Beam & Decking', 'Primary/secondary UB beam erection, shear stud installation, metal deck placement and composite slab.', '2026-10-31', 'Pending', projectNow, projectNow);
    insertMilestone.run(milestoneIds.m5, projectId, 'M5 – Roof Rafter & Cladding', 'Ridge beam, rafter, purlin, bracing erection; roof cladding, gutters, and weatherproofing.', '2026-12-15', 'Pending', projectNow, projectNow);
    // ─── Helpers to insert tasks ─────────────────────────────────────────────────
    const insertTask = localDb.prepare(`INSERT INTO tasks
     (id, drawingId, milestoneId, gridCode, name, description, category,
      priority, assignedTo, startDate, dueDate, status, progress,
      elementType, elementId, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insertActivity = localDb.prepare('INSERT INTO activity (id, taskId, drawingId, message, createdAt) VALUES (?, ?, ?, ?, ?)');
    const insertProjectTask = localDb.prepare(`INSERT INTO project_tasks
     (id, projectId, name, description, priority, status, assignee, dueDate,
      estimatedHours, tags, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    // ─── Drawing 1: Basement Foundation Plan ─────────────────────────────────────
    const foundDrawingId = (0, uuid_1.v4)();
    localDb.prepare(`INSERT INTO drawings (id, projectId, milestoneId, name, fileUrl, fileType, gridCols, gridRows, columnPositions, createdAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(foundDrawingId, projectId, milestoneIds.m2, 'STR-FND-001 Basement Foundation Plan', writeSvgDataUrl(foundationPlanSvg()), 'image', 6, 5, JSON.stringify(computeColumnPositions(['A', 'B', 'C', 'D', 'E', 'F'], [1, 2, 3, 4, 5], 200, 180, 220, 140)), projectNow);
    const foundationTasks = [
        { col: 'A', row: 1, name: 'FP-A1 Pile Cap Excavation', desc: 'Excavate pile cap pit to -3.5m RL, trim loose material, blind concrete 75mm.', category: 'Civil', priority: 'High', engineer: 'Rajesh Nair', start: '2026-04-16', due: '2026-04-25', status: 'Completed', progress: 100, elementType: 'footing', elementId: 'FP-A1', milestoneId: milestoneIds.m2 },
        { col: 'B', row: 1, name: 'FP-B1 Bored Pile Drilling', desc: 'Install 4 × 600mm dia bored piles to 18m depth, cage insertion, concreting with tremie.', category: 'Civil', priority: 'Critical', engineer: 'Anita Desai', start: '2026-04-20', due: '2026-05-10', status: 'Completed', progress: 100, elementType: 'pile', elementId: 'PILE-B1', milestoneId: milestoneIds.m2 },
        { col: 'C', row: 2, name: 'FP-C2 Pile Cap Formwork & Pour', desc: 'Erect formwork for pile cap PC-C2 (1800×1800×900), pour M30 concrete, vibrate and cure.', category: 'Structural', priority: 'High', engineer: 'Rajesh Nair', start: '2026-05-01', due: '2026-05-12', status: 'Completed', progress: 100, elementType: 'footing', elementId: 'FP-C2', milestoneId: milestoneIds.m2 },
        { col: 'D', row: 2, name: 'FP-D2 Grade Beam GB-300x600', desc: 'Cast grade beam between D2 and E2, 300w×600d, T20@150 top & bottom, M30 concrete.', category: 'Structural', priority: 'High', engineer: 'Suresh Pillai', start: '2026-05-15', due: '2026-05-30', status: 'In Progress', progress: 65, elementType: 'grade_beam', elementId: 'GB-D2-E2', milestoneId: milestoneIds.m2 },
        { col: 'E', row: 3, name: 'FP-E3 Holding Down Bolt Setting', desc: 'Position & cast HD M24 anchor bolts on template for column C1 at E3; verify by surveyor.', category: 'Structural', priority: 'Critical', engineer: 'Anita Desai', start: '2026-05-20', due: '2026-05-28', status: 'In Progress', progress: 50, elementType: 'anchor', elementId: 'HD-E3', milestoneId: milestoneIds.m2 },
        { col: 'F', row: 3, name: 'FP-F3 Waterproofing – Basement Wall', desc: 'Apply 2-coat bituminous tanking to basement wall at F3 bay, 2mm DPC membrane, protection board.', category: 'Civil', priority: 'Medium', engineer: 'Priya Sharma', start: '2026-06-01', due: '2026-06-10', status: 'Assigned', progress: 0, elementType: 'wall', elementId: 'BW-F3', milestoneId: milestoneIds.m2 },
        { col: 'A', row: 4, name: 'FP-A4 Basement Slab Reinforcement', desc: 'Lay T16@200 BW mesh reinforcement for 200mm basement raft slab at bay A4, anti-crack T8@300 top.', category: 'Structural', priority: 'High', engineer: 'Suresh Pillai', start: '2026-06-05', due: '2026-06-15', status: 'Assigned', progress: 0, elementType: 'slab', elementId: 'SLAB-A4', milestoneId: milestoneIds.m2 },
        { col: 'B', row: 4, name: 'FP-B4 Basement Slab Concrete Pour', desc: 'Pour M30 concrete for basement raft at B4 zone; pump concrete, power float finish, curing compound.', category: 'Structural', priority: 'High', engineer: 'Anita Desai', start: '2026-06-16', due: '2026-06-20', status: 'Assigned', progress: 0, elementType: 'slab', elementId: 'SLAB-B4', milestoneId: milestoneIds.m2 },
        { col: 'C', row: 5, name: 'FP-C5 Pile Integrity Testing', desc: 'Low-strain sonic echo test on all bored piles in C5 bay; submit PDA report within 5 days.', category: 'Quality', priority: 'Medium', engineer: 'Priya Sharma', start: '2026-05-12', due: '2026-05-18', status: 'Completed', progress: 100, elementType: 'pile', elementId: 'PILE-C5', milestoneId: milestoneIds.m2 },
        { col: 'D', row: 5, name: 'FP-D5 Backfill & Compaction', desc: 'Controlled granular backfill in 200mm layers to GL ± 0.000, 95% MDD compaction, plate test.', category: 'Civil', priority: 'Medium', engineer: 'Rajesh Nair', start: '2026-06-22', due: '2026-06-30', status: 'Delayed', progress: 20, elementType: 'earthworks', elementId: 'BF-D5', milestoneId: milestoneIds.m2 },
        { col: 'E', row: 5, name: 'FP-E5 Blinding Concrete 75mm', desc: 'Place 75mm C15 blinding concrete over compacted sub-base at E5 zone; level to ±10mm.', category: 'Civil', priority: 'Low', engineer: 'Suresh Pillai', start: '2026-04-28', due: '2026-04-30', status: 'Completed', progress: 100, elementType: 'slab', elementId: 'BL-E5', milestoneId: milestoneIds.m2 },
        { col: 'F', row: 5, name: 'FP-F5 Drainage Channel Installation', desc: 'Install 300mm wide perimeter drainage channel around basement perimeter at F-row, connect to sump.', category: 'Civil', priority: 'Low', engineer: 'Priya Sharma', start: '2026-06-25', due: '2026-07-05', status: 'Assigned', progress: 0, elementType: 'drainage', elementId: 'DR-F5', milestoneId: milestoneIds.m2 },
    ];
    for (const t of foundationTasks) {
        const taskId = (0, uuid_1.v4)();
        const gridCode = `${t.col}${t.row}`;
        insertTask.run(taskId, foundDrawingId, t.milestoneId, gridCode, t.name, t.desc, t.category, t.priority, t.engineer, t.start, t.due, t.status, t.progress, t.elementType, t.elementId, projectNow, projectNow);
        insertActivity.run((0, uuid_1.v4)(), taskId, foundDrawingId, `Task "${t.name}" created – status: ${t.status}`, projectNow);
        if (t.status === 'Completed') {
            insertActivity.run((0, uuid_1.v4)(), taskId, foundDrawingId, `Task "${t.name}" marked Completed by ${t.engineer}`, projectNow);
        }
    }
    insertActivity.run((0, uuid_1.v4)(), null, foundDrawingId, 'STR-FND-001 Basement Foundation Plan uploaded and tasks assigned', projectNow);
    // ─── Drawing 2: Steel Column Erection Plan ────────────────────────────────────
    const colDrawingId = (0, uuid_1.v4)();
    localDb.prepare(`INSERT INTO drawings (id, projectId, milestoneId, name, fileUrl, fileType, gridCols, gridRows, columnPositions, createdAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(colDrawingId, projectId, milestoneIds.m3, 'STR-COL-002 Steel Column Erection Plan', writeSvgDataUrl(columnErectionSvg()), 'image', 6, 5, JSON.stringify(computeColumnPositions(['A', 'B', 'C', 'D', 'E', 'F'], [1, 2, 3, 4, 5], 200, 190, 220, 140)), projectNow);
    const columnTasks = [
        { col: 'A', row: 1, name: 'COL-A1 Column Fabrication Inspection', desc: 'Mill cert verification, visual + dimensional check on UC305x305x97 column for A1; approve for dispatch.', category: 'Quality', priority: 'Critical', engineer: 'Arjun Mehta', start: '2026-07-01', due: '2026-07-05', status: 'Completed', progress: 100, elementType: 'column', elementId: 'COL-A1', milestoneId: milestoneIds.m3 },
        { col: 'B', row: 1, name: 'COL-B1 Base Plate Welding', desc: 'Weld 450×450×30 base plate to UC305 column B1, full penetration weld, NDT UT 10%.', category: 'Structural', priority: 'High', engineer: 'Arjun Mehta', start: '2026-07-06', due: '2026-07-10', status: 'Completed', progress: 100, elementType: 'base_plate', elementId: 'BPL-B1', milestoneId: milestoneIds.m3 },
        { col: 'C', row: 1, name: 'COL-C1 Column Crane Lift & Plumb', desc: 'Crane lift UC305x305x97 col at C1, install on anchor bolts, initial plumbing with optical level.', category: 'Structural', priority: 'Critical', engineer: 'Deepa Krishnan', start: '2026-07-15', due: '2026-07-18', status: 'Completed', progress: 100, elementType: 'column', elementId: 'COL-C1', milestoneId: milestoneIds.m3 },
        { col: 'D', row: 2, name: 'COL-D2 Column Final Alignment & Grouting', desc: 'Final theodolite plumb check (H/500 tol), tighten HD bolts to 340 Nm, grout base plate 50mm non-shrink.', category: 'Structural', priority: 'High', engineer: 'Deepa Krishnan', start: '2026-07-19', due: '2026-07-23', status: 'In Progress', progress: 70, elementType: 'column', elementId: 'COL-D2', milestoneId: milestoneIds.m3 },
        { col: 'E', row: 2, name: 'COL-E2 Temporary Bracing Installation', desc: 'Install X-bracing CHS88.9x4 between E2 & F2 cols during erection; remove after primary beams bolted.', category: 'Safety', priority: 'High', engineer: 'Arjun Mehta', start: '2026-07-20', due: '2026-07-25', status: 'In Progress', progress: 45, elementType: 'bracing', elementId: 'TBR-E2-F2', milestoneId: milestoneIds.m3 },
        { col: 'F', row: 2, name: 'COL-F2 Column Splices – Level 2', desc: 'Install column splice plates at +9.000 level for F2 column; 8-bolt friction grip HSFG M24 connection.', category: 'Structural', priority: 'High', engineer: 'Deepa Krishnan', start: '2026-07-26', due: '2026-07-31', status: 'Assigned', progress: 0, elementType: 'splice', elementId: 'CSPL-F2', milestoneId: milestoneIds.m3 },
        { col: 'A', row: 3, name: 'COL-A3 Column Protective Coating – Shop', desc: 'Apply 2-coat zinc phosphate primer (75µm DFT) to all surfaces in fabrication shop before dispatch.', category: 'Finishing', priority: 'Medium', engineer: 'Kiran Rao', start: '2026-07-08', due: '2026-07-14', status: 'Completed', progress: 100, elementType: 'column', elementId: 'COL-A3', milestoneId: milestoneIds.m3 },
        { col: 'B', row: 3, name: 'COL-B3 Column Erection – Bay B3', desc: 'Crane erect UC254x254x73 column B3; fit erection cleats, plumb and brace before crane release.', category: 'Structural', priority: 'High', engineer: 'Arjun Mehta', start: '2026-07-28', due: '2026-08-02', status: 'Assigned', progress: 0, elementType: 'column', elementId: 'COL-B3', milestoneId: milestoneIds.m3 },
        { col: 'C', row: 4, name: 'COL-C4 Fire Protection Sprayed', desc: 'Apply 30mm intumescent sprayed fire protection (2-hr FRR) to column C4 after erection sign-off.', category: 'Safety', priority: 'Medium', engineer: 'Kiran Rao', start: '2026-08-05', due: '2026-08-12', status: 'Assigned', progress: 0, elementType: 'column', elementId: 'COL-C4', milestoneId: milestoneIds.m3 },
        { col: 'D', row: 4, name: 'COL-D4 Surveyor Level Check', desc: 'Registered surveyor dimensional check of all erected columns in row 4; issue compliance certificate.', category: 'Quality', priority: 'Critical', engineer: 'Deepa Krishnan', start: '2026-08-03', due: '2026-08-06', status: 'Assigned', progress: 0, elementType: 'column', elementId: 'COL-D4', milestoneId: milestoneIds.m3 },
        { col: 'E', row: 5, name: 'COL-E5 Column Bolt Tensioning', desc: 'Snug-tighten then full torque (k=0.16) all HSFG M24 column connection bolts at E5 zone; record torques.', category: 'Structural', priority: 'High', engineer: 'Arjun Mehta', start: '2026-08-08', due: '2026-08-12', status: 'Assigned', progress: 0, elementType: 'column', elementId: 'COL-E5', milestoneId: milestoneIds.m3 },
        { col: 'F', row: 5, name: 'COL-F5 Column Erection Completion Report', desc: 'Compile as-built survey, mill certs, welding records, bolt torque log; submit to Structural Engineer.', category: 'Quality', priority: 'Medium', engineer: 'Kiran Rao', start: '2026-08-13', due: '2026-08-15', status: 'Assigned', progress: 0, elementType: 'column', elementId: 'COL-F5', milestoneId: milestoneIds.m3 },
    ];
    for (const t of columnTasks) {
        const taskId = (0, uuid_1.v4)();
        const gridCode = `${t.col}${t.row}`;
        insertTask.run(taskId, colDrawingId, t.milestoneId, gridCode, t.name, t.desc, t.category, t.priority, t.engineer, t.start, t.due, t.status, t.progress, t.elementType, t.elementId, projectNow, projectNow);
        insertActivity.run((0, uuid_1.v4)(), taskId, colDrawingId, `Task "${t.name}" created – status: ${t.status}`, projectNow);
        if (t.status === 'Completed') {
            insertActivity.run((0, uuid_1.v4)(), taskId, colDrawingId, `Task "${t.name}" marked Completed by ${t.engineer}`, projectNow);
        }
    }
    insertActivity.run((0, uuid_1.v4)(), null, colDrawingId, 'STR-COL-002 Steel Column Erection Plan uploaded and tasks assigned', projectNow);
    // ─── Drawing 3: Steel Beam Erection Plan ──────────────────────────────────────
    const beamDrawingId = (0, uuid_1.v4)();
    localDb.prepare(`INSERT INTO drawings (id, projectId, milestoneId, name, fileUrl, fileType, gridCols, gridRows, columnPositions, createdAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(beamDrawingId, projectId, milestoneIds.m4, 'STR-BEA-003 Steel Beam Erection Plan', writeSvgDataUrl(beamErectionSvg()), 'image', 6, 5, JSON.stringify(computeColumnPositions(['A', 'B', 'C', 'D', 'E', 'F'], [1, 2, 3, 4, 5], 200, 190, 220, 140)), projectNow);
    const beamTasks = [
        { col: 'A', row: 1, name: 'BEA-A1 Primary Beam PB1 Erection – A1-B1', desc: 'Crane lift UB457x191x67 primary beam between A1 and B1 columns at +4.500 level; bolt end connections.', category: 'Structural', priority: 'Critical', engineer: 'Vikram Singh', start: '2026-08-16', due: '2026-08-20', status: 'Assigned', progress: 0, elementType: 'beam', elementId: 'PB-A1-B1', milestoneId: milestoneIds.m4 },
        { col: 'B', row: 1, name: 'BEA-B1 Secondary Beam SB1 Erection – B1', desc: 'Install UB305x127x37 secondary beam at B1 frame; attach to primary beam web cleats, 4-bolt M20 HSFG.', category: 'Structural', priority: 'High', engineer: 'Meena Joshi', start: '2026-08-21', due: '2026-08-25', status: 'Assigned', progress: 0, elementType: 'beam', elementId: 'SB-B1', milestoneId: milestoneIds.m4 },
        { col: 'C', row: 2, name: 'BEA-C2 Shear Stud Welding', desc: 'Weld 19mm dia × 100mm headed shear studs to top flange of primary beams in bay C2; 150mm pitch.', category: 'Structural', priority: 'High', engineer: 'Vikram Singh', start: '2026-08-26', due: '2026-08-30', status: 'Assigned', progress: 0, elementType: 'shear_stud', elementId: 'SS-C2', milestoneId: milestoneIds.m4 },
        { col: 'D', row: 2, name: 'BEA-D2 Metal Deck – Type N75', desc: 'Lay LYSAGHT N75 metal deck over beams at D2 bay, lap and fix per design; seal ends with closer plates.', category: 'Structural', priority: 'High', engineer: 'Meena Joshi', start: '2026-09-01', due: '2026-09-07', status: 'Assigned', progress: 0, elementType: 'deck', elementId: 'DECK-D2', milestoneId: milestoneIds.m4 },
        { col: 'E', row: 2, name: 'BEA-E2 Composite Slab Reinforcement', desc: 'Place T12@200 BW anti-crack mesh on metal deck at E2; install service penetration sleeves before pour.', category: 'Structural', priority: 'Medium', engineer: 'Vikram Singh', start: '2026-09-08', due: '2026-09-14', status: 'Assigned', progress: 0, elementType: 'slab', elementId: 'CSLAB-E2', milestoneId: milestoneIds.m4 },
        { col: 'F', row: 3, name: 'BEA-F3 Composite Slab Concrete Pour', desc: 'Pour M35 concrete composite slab (130mm total depth) at F3 zone via concrete pump; vibrate and level.', category: 'Structural', priority: 'Critical', engineer: 'Meena Joshi', start: '2026-09-15', due: '2026-09-18', status: 'Assigned', progress: 0, elementType: 'slab', elementId: 'CSLAB-F3', milestoneId: milestoneIds.m4 },
        { col: 'A', row: 4, name: 'BEA-A4 Beam Connection Bolt Tensioning', desc: 'Full tension indicator (DTI) bolt torquing of all beam connection bolts in row-4 bays; record in log.', category: 'Structural', priority: 'High', engineer: 'Vikram Singh', start: '2026-09-20', due: '2026-09-24', status: 'Assigned', progress: 0, elementType: 'beam', elementId: 'BEA-A4', milestoneId: milestoneIds.m4 },
        { col: 'B', row: 4, name: 'BEA-B4 Beam Fire Protection', desc: 'Spray 2-hour intumescent fire protection to all UB beams in B4 bay after NDE and approval.', category: 'Safety', priority: 'Medium', engineer: 'Ritu Patel', start: '2026-10-01', due: '2026-10-08', status: 'Assigned', progress: 0, elementType: 'beam', elementId: 'BEA-B4', milestoneId: milestoneIds.m4 },
        { col: 'C', row: 5, name: 'BEA-C5 Flooring Camber Check', desc: 'Check mid-span deflection of beams in C5 bay using survey level; confirm within L/360 limit.', category: 'Quality', priority: 'Medium', engineer: 'Ritu Patel', start: '2026-09-25', due: '2026-09-28', status: 'Assigned', progress: 0, elementType: 'beam', elementId: 'BEA-C5', milestoneId: milestoneIds.m4 },
        { col: 'D', row: 5, name: 'BEA-D5 Beam Splice Level 2', desc: 'Install splice connection for D5 beam at +9.000 level; 8-bolt friction grip connection, aligned with column splice.', category: 'Structural', priority: 'High', engineer: 'Vikram Singh', start: '2026-10-10', due: '2026-10-15', status: 'Assigned', progress: 0, elementType: 'splice', elementId: 'BSPL-D5', milestoneId: milestoneIds.m4 },
        { col: 'E', row: 5, name: 'BEA-E5 Stair Core Beam Erection', desc: 'Erect stair core support beams at E5 (IDES section), install temporary decking for safe access.', category: 'Structural', priority: 'Medium', engineer: 'Meena Joshi', start: '2026-10-16', due: '2026-10-22', status: 'Assigned', progress: 0, elementType: 'beam', elementId: 'BEA-SC-E5', milestoneId: milestoneIds.m4 },
        { col: 'F', row: 5, name: 'BEA-F5 Beam Erection Completion ITP', desc: 'Raise Inspection & Test Plan sign-off for all beams in F5; obtain Structural Engineer approval.', category: 'Quality', priority: 'High', engineer: 'Ritu Patel', start: '2026-10-28', due: '2026-10-31', status: 'Assigned', progress: 0, elementType: 'beam', elementId: 'BEA-F5', milestoneId: milestoneIds.m4 },
    ];
    for (const t of beamTasks) {
        const taskId = (0, uuid_1.v4)();
        const gridCode = `${t.col}${t.row}`;
        insertTask.run(taskId, beamDrawingId, t.milestoneId, gridCode, t.name, t.desc, t.category, t.priority, t.engineer, t.start, t.due, t.status, t.progress, t.elementType, t.elementId, projectNow, projectNow);
        insertActivity.run((0, uuid_1.v4)(), taskId, beamDrawingId, `Task "${t.name}" created – status: ${t.status}`, projectNow);
    }
    insertActivity.run((0, uuid_1.v4)(), null, beamDrawingId, 'STR-BEA-003 Steel Beam Erection Plan uploaded and tasks assigned', projectNow);
    // ─── Drawing 4: Steel Rafter Erection Plan ─────────────────────────────────────
    const rafterDrawingId = (0, uuid_1.v4)();
    localDb.prepare(`INSERT INTO drawings (id, projectId, milestoneId, name, fileUrl, fileType, gridCols, gridRows, columnPositions, createdAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(rafterDrawingId, projectId, milestoneIds.m5, 'STR-RAF-004 Steel Rafter Erection Plan', writeSvgDataUrl(rafterErectionSvg()), 'image', 6, 5, JSON.stringify(computeColumnPositions(['A', 'B', 'C', 'D', 'E', 'F'], [1, 2, 3, 4, 5], 200, 200, 220, 130)), projectNow);
    const rafterTasks = [
        { col: 'A', row: 1, name: 'RAF-A1 Ridge Beam Erection', desc: 'Crane lift RB1 UB254x146x37 ridge beam from A1 to F1; install on column apex gusset plates.', category: 'Structural', priority: 'Critical', engineer: 'Nilesh Kumar', start: '2026-11-01', due: '2026-11-05', status: 'Assigned', progress: 0, elementType: 'ridge_beam', elementId: 'RB1', milestoneId: milestoneIds.m5 },
        { col: 'B', row: 1, name: 'RAF-B1 Rafter RF-B1 Erection', desc: 'Lift and install UB203x133x25 rafter at B1 pair, connect to ridge beam and eaves beam; 4-bolt M20.', category: 'Structural', priority: 'High', engineer: 'Nilesh Kumar', start: '2026-11-06', due: '2026-11-10', status: 'Assigned', progress: 0, elementType: 'rafter', elementId: 'RF-B1', milestoneId: milestoneIds.m5 },
        { col: 'C', row: 2, name: 'RAF-C2 Purlin PL1 Installation', desc: 'Bolt RHS100x50x4 purlins at mid-span on all rafters in C-row; align to ±10mm and fix to cleats.', category: 'Structural', priority: 'High', engineer: 'Sonal Shah', start: '2026-11-11', due: '2026-11-16', status: 'Assigned', progress: 0, elementType: 'purlin', elementId: 'PL1-C2', milestoneId: milestoneIds.m5 },
        { col: 'D', row: 2, name: 'RAF-D2 Roof Bracing Installation', desc: 'Install X-brace RHS75x50x3 between D2–E2 rafter pairs; tighten turnbuckles to remove slack.', category: 'Structural', priority: 'High', engineer: 'Nilesh Kumar', start: '2026-11-17', due: '2026-11-22', status: 'Assigned', progress: 0, elementType: 'bracing', elementId: 'RBR-D2', milestoneId: milestoneIds.m5 },
        { col: 'E', row: 3, name: 'RAF-E3 Eaves Beam & Gutter Bracket', desc: 'Install 150×75 eaves beam along E row; weld gutter support brackets at 1200mm centres.', category: 'Structural', priority: 'Medium', engineer: 'Sonal Shah', start: '2026-11-23', due: '2026-11-28', status: 'Assigned', progress: 0, elementType: 'eaves_beam', elementId: 'EB-E3', milestoneId: milestoneIds.m5 },
        { col: 'F', row: 3, name: 'RAF-F3 Hip Rafter Installation', desc: 'Install CHS114.3×5 hip rafter at corner F3; weld to ridge and eaves nodes per detail drawing.', category: 'Structural', priority: 'High', engineer: 'Nilesh Kumar', start: '2026-11-29', due: '2026-12-03', status: 'Assigned', progress: 0, elementType: 'rafter', elementId: 'HIP-F3', milestoneId: milestoneIds.m5 },
        { col: 'A', row: 4, name: 'RAF-A4 Anti-Sag Bar Installation', desc: 'Install T12 anti-sag bars at 1/3 points of all rafters between A4–B4; prevent lateral buckling.', category: 'Structural', priority: 'Medium', engineer: 'Sonal Shah', start: '2026-12-01', due: '2026-12-05', status: 'Assigned', progress: 0, elementType: 'purlin', elementId: 'ASB-A4', milestoneId: milestoneIds.m5 },
        { col: 'B', row: 4, name: 'RAF-B4 Roof Cladding – IBR Sheet', desc: 'Fix 0.58mm IBR Zincalume roof sheets from ridge to eaves at B4 bay; 2-screw-per-purlin fixing.', category: 'Finishing', priority: 'High', engineer: 'Pradeep Nair', start: '2026-12-04', due: '2026-12-09', status: 'Assigned', progress: 0, elementType: 'cladding', elementId: 'CLD-B4', milestoneId: milestoneIds.m5 },
        { col: 'C', row: 4, name: 'RAF-C4 Skylight Framing', desc: 'Install framing for 2400×1200 polycarbonate skylight panels at C4 ridge; seal laps with silicone.', category: 'Finishing', priority: 'Medium', engineer: 'Pradeep Nair', start: '2026-12-06', due: '2026-12-10', status: 'Assigned', progress: 0, elementType: 'skylight', elementId: 'SKY-C4', milestoneId: milestoneIds.m5 },
        { col: 'D', row: 5, name: 'RAF-D5 Roof Gutter & Downpipe', desc: 'Install Colorbond half-round gutter 150mm, 90mm downpipes at D5 column; connect to stormwater.', category: 'Civil', priority: 'Low', engineer: 'Pradeep Nair', start: '2026-12-10', due: '2026-12-13', status: 'Assigned', progress: 0, elementType: 'drainage', elementId: 'GUT-D5', milestoneId: milestoneIds.m5 },
        { col: 'E', row: 5, name: 'RAF-E5 Roof Weatherproofing Inspection', desc: 'Hose test all roof cladding, ridge caps, skylights; inspector sign-off; no ponding allowed.', category: 'Quality', priority: 'Critical', engineer: 'Sonal Shah', start: '2026-12-11', due: '2026-12-13', status: 'Assigned', progress: 0, elementType: 'cladding', elementId: 'WTP-E5', milestoneId: milestoneIds.m5 },
        { col: 'F', row: 5, name: 'RAF-F5 Roof Completion Handover', desc: 'As-built drawings, warranties, O&M manuals compiled; formal handover to client for roof structure.', category: 'Quality', priority: 'High', engineer: 'Nilesh Kumar', start: '2026-12-14', due: '2026-12-15', status: 'Assigned', progress: 0, elementType: 'rafter', elementId: 'HO-F5', milestoneId: milestoneIds.m5 },
    ];
    for (const t of rafterTasks) {
        const taskId = (0, uuid_1.v4)();
        const gridCode = `${t.col}${t.row}`;
        insertTask.run(taskId, rafterDrawingId, t.milestoneId, gridCode, t.name, t.desc, t.category, t.priority, t.engineer, t.start, t.due, t.status, t.progress, t.elementType, t.elementId, projectNow, projectNow);
        insertActivity.run((0, uuid_1.v4)(), taskId, rafterDrawingId, `Task "${t.name}" created – status: ${t.status}`, projectNow);
    }
    insertActivity.run((0, uuid_1.v4)(), null, rafterDrawingId, 'STR-RAF-004 Steel Rafter Erection Plan uploaded and tasks assigned', projectNow);
    // ─── Drawing 5: Roof Sheet Layout ─────────────────────────────────────────────
    const roofSheetDrawingId = (0, uuid_1.v4)();
    const roofSheetSvg = roofSheetLayoutSvg();
    localDb.prepare(`INSERT INTO drawings (id, projectId, milestoneId, name, fileUrl, fileType, gridCols, gridRows, columnPositions, createdAt)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(roofSheetDrawingId, projectId, milestoneIds.m5, 'STR-RSL-005 Roof Sheet Layout', writeSvgDataUrl(roofSheetSvg), 'image', 6, 5, JSON.stringify(roofSheetGridPositions()), projectNow);
    const roofSheetTasks = [
        { col: 'A', row: 1, name: 'RSL-A1 Roof Sheet Setting Out', desc: 'Set out first roof sheet run from grid A1 with survey control, check square to ridge and eaves before fixing.', category: 'Survey', priority: 'Critical', engineer: 'Pradeep Nair', start: '2026-12-02', due: '2026-12-03', status: 'Assigned', progress: 0, elementType: 'cladding', elementId: 'RSL-A1', milestoneId: milestoneIds.m5 },
        { col: 'B', row: 1, name: 'RSL-B1 Ridge Cap Starter Installation', desc: 'Install starter ridge cap and butyl tape seal at B1 zone, maintain 150mm overlap and straight alignment.', category: 'Finishing', priority: 'High', engineer: 'Pradeep Nair', start: '2026-12-03', due: '2026-12-04', status: 'Assigned', progress: 0, elementType: 'ridge_cap', elementId: 'RC-B1', milestoneId: milestoneIds.m5 },
        { col: 'C', row: 2, name: 'RSL-C2 Sheet Run Fixing', desc: 'Fix IBR roof sheets along C2 run with 14g-65 crest screws at each purlin support, verify washer compression.', category: 'Finishing', priority: 'High', engineer: 'Nilesh Kumar', start: '2026-12-04', due: '2026-12-06', status: 'Assigned', progress: 0, elementType: 'cladding', elementId: 'SHT-C2', milestoneId: milestoneIds.m5 },
        { col: 'D', row: 2, name: 'RSL-D2 Side Lap Sealant Application', desc: 'Apply continuous butyl sealant to side laps at D2 row, ensure minimum 1.5 corrugation overlap.', category: 'Finishing', priority: 'Medium', engineer: 'Pradeep Nair', start: '2026-12-05', due: '2026-12-06', status: 'Assigned', progress: 0, elementType: 'cladding', elementId: 'LAP-D2', milestoneId: milestoneIds.m5 },
        { col: 'E', row: 3, name: 'RSL-E3 End Lap Stitch Screws', desc: 'Install stitch screws at 450 c/c across end laps in E3 sheet band, inspect alignment and bite.', category: 'Finishing', priority: 'Medium', engineer: 'Sonal Shah', start: '2026-12-06', due: '2026-12-07', status: 'Assigned', progress: 0, elementType: 'cladding', elementId: 'ELS-E3', milestoneId: milestoneIds.m5 },
        { col: 'F', row: 3, name: 'RSL-F3 Translucent Sheet Panel Fixing', desc: 'Fix translucent daylight roof sheet panel at F3 bay with compatible fasteners and thermal expansion clearance.', category: 'Finishing', priority: 'High', engineer: 'Pradeep Nair', start: '2026-12-07', due: '2026-12-08', status: 'Assigned', progress: 0, elementType: 'skylight', elementId: 'TLS-F3', milestoneId: milestoneIds.m5 },
        { col: 'A', row: 4, name: 'RSL-A4 Eaves Closure Flashing', desc: 'Install eaves closure and bird-proof flashing at A4 line, secure beneath sheet profile without distortion.', category: 'Finishing', priority: 'Medium', engineer: 'Nilesh Kumar', start: '2026-12-08', due: '2026-12-09', status: 'Assigned', progress: 0, elementType: 'flashing', elementId: 'EFL-A4', milestoneId: milestoneIds.m5 },
        { col: 'B', row: 4, name: 'RSL-B4 Fastener Torque Inspection', desc: 'Inspect crest fastener seating and torque at B4 zone, replace damaged neoprene washers and record QA check.', category: 'Quality', priority: 'High', engineer: 'Sonal Shah', start: '2026-12-09', due: '2026-12-10', status: 'Assigned', progress: 0, elementType: 'fastener', elementId: 'FTQ-B4', milestoneId: milestoneIds.m5 },
        { col: 'C', row: 4, name: 'RSL-C4 Roof Penetration Flashing', desc: 'Flash around mechanical roof penetration at C4 with EPDM boot and sealant, ensure watertight termination.', category: 'Finishing', priority: 'High', engineer: 'Pradeep Nair', start: '2026-12-09', due: '2026-12-10', status: 'Assigned', progress: 0, elementType: 'flashing', elementId: 'RPF-C4', milestoneId: milestoneIds.m5 },
        { col: 'D', row: 5, name: 'RSL-D5 Sheet Alignment Survey', desc: 'Carry out final sheet alignment survey at D5 and verify cover widths against approved shop drawing.', category: 'Survey', priority: 'Medium', engineer: 'Sonal Shah', start: '2026-12-10', due: '2026-12-11', status: 'Assigned', progress: 0, elementType: 'cladding', elementId: 'ALS-D5', milestoneId: milestoneIds.m5 },
        { col: 'E', row: 5, name: 'RSL-E5 Water Tightness Hose Test', desc: 'Perform hose test over E5 roof sheet laps and ridge zone, inspect underside for leakage and issue punch list.', category: 'Quality', priority: 'Critical', engineer: 'Sonal Shah', start: '2026-12-11', due: '2026-12-12', status: 'Assigned', progress: 0, elementType: 'cladding', elementId: 'WTT-E5', milestoneId: milestoneIds.m5 },
        { col: 'F', row: 5, name: 'RSL-F5 Roof Sheet Layout As-Built', desc: 'Submit as-built roof sheet layout marking installed sheet runs, skylights, flashings, and completed QA records.', category: 'Documentation', priority: 'High', engineer: 'Pradeep Nair', start: '2026-12-13', due: '2026-12-15', status: 'Assigned', progress: 0, elementType: 'cladding', elementId: 'ABL-F5', milestoneId: milestoneIds.m5 },
    ];
    for (const t of roofSheetTasks) {
        const taskId = (0, uuid_1.v4)();
        const gridCode = `${t.col}${t.row}`;
        insertTask.run(taskId, roofSheetDrawingId, t.milestoneId, gridCode, t.name, t.desc, t.category, t.priority, t.engineer, t.start, t.due, t.status, t.progress, t.elementType, t.elementId, projectNow, projectNow);
        insertActivity.run((0, uuid_1.v4)(), taskId, roofSheetDrawingId, `Task "${t.name}" created – status: ${t.status}`, projectNow);
    }
    insertActivity.run((0, uuid_1.v4)(), null, roofSheetDrawingId, 'STR-RSL-005 Roof Sheet Layout uploaded and tasks assigned', projectNow);
    // ─── Project-level Tasks (high-level schedule) ─────────────────────────────
    const projectLevelTasks = [
        { name: 'Procurement – Structural Steel', desc: 'Issue purchase order for all S355 steel sections; ensure mill certs and CMR compliance.', priority: 'Critical', status: 'In Progress', assignee: 'Rajesh Nair', due: '2026-06-01', hours: 120, tags: 'Procurement,Steel' },
        { name: 'Shop Drawings Approval', desc: 'Review and approve all workshop fabrication drawings from steelwork sub-contractor.', priority: 'High', status: 'In Progress', assignee: 'Deepa Krishnan', due: '2026-06-15', hours: 80, tags: 'Drawings,Approval' },
        { name: 'Fabrication – Columns & Beams', desc: 'Workshop fabrication and trial assembly of all UC columns, UB beams, and base plates.', priority: 'High', status: 'In Progress', assignee: 'Arjun Mehta', due: '2026-07-10', hours: 400, tags: 'Fabrication' },
        { name: 'Site Crane Mobilisation', desc: 'Mobilise 100T crawler crane to site; erect on prepared crane pad at grid ref C3.', priority: 'High', status: 'Assigned', assignee: 'Vikram Singh', due: '2026-07-12', hours: 40, tags: 'Plant,Crane' },
        { name: 'HSE Induction & Toolbox Talks', desc: 'All steel erectors complete site HSE induction; weekly toolbox talks documented.', priority: 'Critical', status: 'In Progress', assignee: 'Kiran Rao', due: '2026-07-14', hours: 20, tags: 'Safety,HSE' },
        { name: 'Structural Engineer Site Inspection – Foundations', desc: 'SE to witness pile cap and grade beam works; issue ITP hold-point clearance.', priority: 'Critical', status: 'Completed', assignee: 'Rajesh Nair', due: '2026-06-25', hours: 16, tags: 'Quality,ITP' },
        { name: 'As-Built Survey – Foundation Level', desc: 'Registered surveyor as-built dimensional survey of all holding-down bolts and pile caps.', priority: 'High', status: 'Completed', assignee: 'Deepa Krishnan', due: '2026-07-01', hours: 24, tags: 'Survey,Quality' },
        { name: 'Column Erection Programme – 4-Week Look-Ahead', desc: 'Prepare detailed 4-week rolling programme for column erection sequence and crane picks.', priority: 'Medium', status: 'Assigned', assignee: 'Arjun Mehta', due: '2026-07-10', hours: 16, tags: 'Programme' },
        { name: 'Steel Beam Delivery Schedule', desc: 'Coordinate UB beam deliveries with fabricator to match erection sequence; just-in-time.', priority: 'Medium', status: 'Assigned', assignee: 'Meena Joshi', due: '2026-08-10', hours: 12, tags: 'Logistics,Procurement' },
        { name: 'Composite Slab Mix Design Approval', desc: 'Submit M35 concrete mix design with admixtures to SE; obtain approval before first pour.', priority: 'High', status: 'Assigned', assignee: 'Ritu Patel', due: '2026-09-01', hours: 8, tags: 'Concrete,Quality' },
        { name: 'Roof Cladding Sub-Contractor Award', desc: 'Evaluate three tenders for roof cladding; award contract for IBR sheeting and gutters.', priority: 'Medium', status: 'Assigned', assignee: 'Rajesh Nair', due: '2026-10-01', hours: 20, tags: 'Procurement' },
        { name: 'Project Completion Report', desc: 'Compile all as-builts, test records, warranties, and ITP sign-offs into final completion dossier.', priority: 'High', status: 'Assigned', assignee: 'Rajesh Nair', due: '2026-12-31', hours: 60, tags: 'Closeout' },
    ];
    for (const pt of projectLevelTasks) {
        insertProjectTask.run((0, uuid_1.v4)(), projectId, pt.name, pt.desc, pt.priority, pt.status, pt.assignee, pt.due, pt.hours, pt.tags, projectNow, projectNow);
    }
}
