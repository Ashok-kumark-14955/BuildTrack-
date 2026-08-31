/**
 * seedData.ts
 *
 * Ensures the browser IndexedDB always contains the sample project data.
 * This is IDEMPOTENT — it uses fixed IDs for all sample records and upserts
 * them on every app startup (via `ensureSampleData`). User-created data is
 * never touched.
 *
 * Fixed IDs used:
 *   Projects  : proj-house-001, proj-steel-001
 *   Milestones: ms-house-foundation, ms-house-structure, ms-steel-columns, ms-steel-roof
 *   Drawings  : drw-gf-001, drw-fp-001, drw-rp-001, drw-el-001, drw-col-001
 *   Tasks     : task-gf-a1, task-gf-b1, … (fixed prefix + grid code)
 *   ProjectTasks: pt-house-01 … pt-steel-04
 */

import {
  openBuildTrackDb,
  saveDrawingFile,
  loadDrawingFile,
  drawingGet,
  drawingUpdate,
} from './browserDb';
import type { Project, Drawing, Task, Milestone, ActivityItem, ProjectTask } from '../types';

// ─── Inline SVG drawings ──────────────────────────────────────────────────────

const GROUND_FLOOR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1100" viewBox="0 0 1800 1100" font-family="Arial,Helvetica,sans-serif">
  <defs>
    <pattern id="wallhatch" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="8" height="8" fill="#e0ddd8"/>
      <line x1="0" y1="0" x2="0" y2="8" stroke="#c8c8c8" stroke-width="1.2"/>
    </pattern>
    <pattern id="tile600" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
      <rect width="24" height="24" fill="none" stroke="#ccd4cc" stroke-width="0.5"/>
    </pattern>
    <marker id="arro" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#2c3e50"/>
    </marker>
    <marker id="arrl" markerWidth="7" markerHeight="7" refX="1" refY="3" orient="auto">
      <path d="M7,0 L7,6 L0,3 z" fill="#2c3e50"/>
    </marker>
  </defs>
  <rect width="1800" height="1100" fill="#f8f9fa"/>
  <rect x="10" y="10" width="1780" height="1080" fill="none" stroke="#1a1a2e" stroke-width="2"/>
  <rect x="15" y="15" width="1770" height="1070" fill="none" stroke="#1a1a2e" stroke-width="0.8"/>
  <text x="900" y="52" font-size="26" fill="#1a1a2e" text-anchor="middle" font-weight="900" letter-spacing="2">GROUND FLOOR PLAN</text>
  <text x="900" y="74" font-size="13" fill="#5a6a80" text-anchor="middle" letter-spacing="1">HOUSE BUILDING PROJECT — SCALE 1:100</text>
  <!-- Outer walls -->
  <rect x="120" y="120" width="1560" height="860" fill="url(#wallhatch)" stroke="#1a1a2e" stroke-width="8"/>
  <rect x="160" y="160" width="1480" height="780" fill="white"/>
  <!-- Floor tile -->
  <rect x="160" y="160" width="1480" height="780" fill="url(#tile600)"/>
  <!-- Living Room -->
  <rect x="160" y="160" width="600" height="400" fill="none" stroke="#2c3e50" stroke-width="1.5"/>
  <text x="460" y="370" font-size="16" fill="#2c3e50" text-anchor="middle" font-weight="700">LIVING ROOM</text>
  <text x="460" y="390" font-size="12" fill="#5a6a80" text-anchor="middle">6.0 × 4.0 m</text>
  <!-- Kitchen -->
  <rect x="760" y="160" width="400" height="380" fill="none" stroke="#2c3e50" stroke-width="1.5"/>
  <text x="960" y="350" font-size="16" fill="#2c3e50" text-anchor="middle" font-weight="700">KITCHEN</text>
  <text x="960" y="370" font-size="12" fill="#5a6a80" text-anchor="middle">4.0 × 3.8 m</text>
  <!-- Master Bedroom -->
  <rect x="1160" y="160" width="480" height="420" fill="none" stroke="#2c3e50" stroke-width="1.5"/>
  <text x="1400" y="360" font-size="16" fill="#2c3e50" text-anchor="middle" font-weight="700">MASTER BEDROOM</text>
  <text x="1400" y="380" font-size="12" fill="#5a6a80" text-anchor="middle">4.8 × 4.2 m</text>
  <!-- Bedroom 2 -->
  <rect x="160" y="560" width="400" height="380" fill="none" stroke="#2c3e50" stroke-width="1.5"/>
  <text x="360" y="755" font-size="16" fill="#2c3e50" text-anchor="middle" font-weight="700">BEDROOM 2</text>
  <text x="360" y="775" font-size="12" fill="#5a6a80" text-anchor="middle">4.0 × 3.8 m</text>
  <!-- Bathroom -->
  <rect x="560" y="560" width="200" height="200" fill="none" stroke="#2c3e50" stroke-width="1.5"/>
  <text x="660" y="660" font-size="13" fill="#2c3e50" text-anchor="middle" font-weight="700">BATH</text>
  <!-- Corridor -->
  <rect x="560" y="760" width="600" height="180" fill="none" stroke="#2c3e50" stroke-width="1.5"/>
  <text x="860" y="855" font-size="14" fill="#2c3e50" text-anchor="middle" font-weight="700">CORRIDOR</text>
  <!-- Study -->
  <rect x="1160" y="580" width="480" height="360" fill="none" stroke="#2c3e50" stroke-width="1.5"/>
  <text x="1400" y="765" font-size="16" fill="#2c3e50" text-anchor="middle" font-weight="700">STUDY / HOME OFFICE</text>
  <text x="1400" y="785" font-size="12" fill="#5a6a80" text-anchor="middle">4.8 × 3.6 m</text>
  <!-- Columns -->
  <rect x="148" y="148" width="24" height="24" fill="#1a1a2e"/>
  <rect x="748" y="148" width="24" height="24" fill="#1a1a2e"/>
  <rect x="1148" y="148" width="24" height="24" fill="#1a1a2e"/>
  <rect x="1628" y="148" width="24" height="24" fill="#1a1a2e"/>
  <rect x="148" y="548" width="24" height="24" fill="#1a1a2e"/>
  <rect x="748" y="548" width="24" height="24" fill="#1a1a2e"/>
  <rect x="1148" y="548" width="24" height="24" fill="#1a1a2e"/>
  <rect x="1628" y="548" width="24" height="24" fill="#1a1a2e"/>
  <rect x="148" y="928" width="24" height="24" fill="#1a1a2e"/>
  <rect x="748" y="928" width="24" height="24" fill="#1a1a2e"/>
  <rect x="1148" y="928" width="24" height="24" fill="#1a1a2e"/>
  <rect x="1628" y="928" width="24" height="24" fill="#1a1a2e"/>
  <!-- Grid labels X -->
  <text x="160" y="108" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">A</text>
  <text x="760" y="108" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">B</text>
  <text x="1160" y="108" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">C</text>
  <text x="1640" y="108" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">D</text>
  <!-- Grid labels Y -->
  <text x="90" y="164" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">1</text>
  <text x="90" y="564" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">2</text>
  <text x="90" y="944" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">3</text>
  <!-- Dimensions -->
  <line x1="160" y1="1010" x2="1640" y2="1010" stroke="#2c3e50" stroke-width="1" marker-start="url(#arrl)" marker-end="url(#arro)"/>
  <text x="900" y="1030" font-size="13" fill="#2c3e50" text-anchor="middle">16.0 m</text>
  <line x1="60" y1="160" x2="60" y2="940" stroke="#2c3e50" stroke-width="1" marker-start="url(#arrl)" marker-end="url(#arro)"/>
  <text x="35" y="550" font-size="13" fill="#2c3e50" text-anchor="middle" transform="rotate(-90,35,550)">9.0 m</text>
  <!-- Title block -->
  <rect x="1400" y="1020" width="370" height="55" fill="#1a1a2e"/>
  <text x="1585" y="1045" font-size="11" fill="white" text-anchor="middle">DWG NO: HBP-GF-001</text>
  <text x="1585" y="1063" font-size="11" fill="white" text-anchor="middle">REV: A | DATE: 2026-08-09</text>
</svg>`;

const FOUNDATION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1100" viewBox="0 0 1800 1100" font-family="Arial,Helvetica,sans-serif">
  <defs>
    <pattern id="hatch" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <rect width="10" height="10" fill="#d4c9b0"/>
      <line x1="0" y1="5" x2="10" y2="5" stroke="#b8a882" stroke-width="1"/>
    </pattern>
    <marker id="arro" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#2c3e50"/>
    </marker>
    <marker id="arrl" markerWidth="7" markerHeight="7" refX="1" refY="3" orient="auto">
      <path d="M7,0 L7,6 L0,3 z" fill="#2c3e50"/>
    </marker>
  </defs>
  <rect width="1800" height="1100" fill="#f0ece4"/>
  <rect x="10" y="10" width="1780" height="1080" fill="none" stroke="#1a1a2e" stroke-width="2"/>
  <text x="900" y="52" font-size="26" fill="#1a1a2e" text-anchor="middle" font-weight="900" letter-spacing="2">FOUNDATION PLAN</text>
  <text x="900" y="74" font-size="13" fill="#5a6a80" text-anchor="middle" letter-spacing="1">HOUSE BUILDING PROJECT — SCALE 1:100</text>
  <!-- Foundation pad -->
  <rect x="100" y="100" width="1600" height="900" fill="url(#hatch)" stroke="#7a6a4a" stroke-width="3"/>
  <!-- Strip footings -->
  <rect x="140" y="140" width="1520" height="820" fill="none" stroke="#4a3a2a" stroke-width="6"/>
  <rect x="740" y="140" width="10" height="820" fill="#4a3a2a"/>
  <rect x="1140" y="140" width="10" height="820" fill="#4a3a2a"/>
  <rect x="140" y="540" width="1520" height="10" fill="#4a3a2a"/>
  <!-- Footing pads at column positions -->
  <rect x="118" y="118" width="64" height="64" fill="#c8b892" stroke="#4a3a2a" stroke-width="3" rx="4"/>
  <rect x="718" y="118" width="64" height="64" fill="#c8b892" stroke="#4a3a2a" stroke-width="3" rx="4"/>
  <rect x="1118" y="118" width="64" height="64" fill="#c8b892" stroke="#4a3a2a" stroke-width="3" rx="4"/>
  <rect x="1618" y="118" width="64" height="64" fill="#c8b892" stroke="#4a3a2a" stroke-width="3" rx="4"/>
  <rect x="118" y="518" width="64" height="64" fill="#c8b892" stroke="#4a3a2a" stroke-width="3" rx="4"/>
  <rect x="718" y="518" width="64" height="64" fill="#c8b892" stroke="#4a3a2a" stroke-width="3" rx="4"/>
  <rect x="1118" y="518" width="64" height="64" fill="#c8b892" stroke="#4a3a2a" stroke-width="3" rx="4"/>
  <rect x="1618" y="518" width="64" height="64" fill="#c8b892" stroke="#4a3a2a" stroke-width="3" rx="4"/>
  <rect x="118" y="918" width="64" height="64" fill="#c8b892" stroke="#4a3a2a" stroke-width="3" rx="4"/>
  <rect x="718" y="918" width="64" height="64" fill="#c8b892" stroke="#4a3a2a" stroke-width="3" rx="4"/>
  <rect x="1118" y="918" width="64" height="64" fill="#c8b892" stroke="#4a3a2a" stroke-width="3" rx="4"/>
  <rect x="1618" y="918" width="64" height="64" fill="#c8b892" stroke="#4a3a2a" stroke-width="3" rx="4"/>
  <!-- Labels -->
  <text x="900" y="350" font-size="14" fill="#4a3a2a" text-anchor="middle">STRIP FOOTING — 600 × 600mm COLUMN PAD</text>
  <text x="900" y="375" font-size="12" fill="#7a6a4a" text-anchor="middle">ALL FOOTINGS: PCC 1:3:6 | DEPTH: 1200mm BELOW NGL</text>
  <!-- Grid labels -->
  <text x="150" y="95" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">A</text>
  <text x="750" y="95" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">B</text>
  <text x="1150" y="95" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">C</text>
  <text x="1650" y="95" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">D</text>
  <text x="80" y="155" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">1</text>
  <text x="80" y="555" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">2</text>
  <text x="80" y="955" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">3</text>
  <!-- Title block -->
  <rect x="1400" y="1020" width="370" height="55" fill="#1a1a2e"/>
  <text x="1585" y="1045" font-size="11" fill="white" text-anchor="middle">DWG NO: HBP-FP-001</text>
  <text x="1585" y="1063" font-size="11" fill="white" text-anchor="middle">REV: A | DATE: 2026-08-09</text>
</svg>`;

const ROOF_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1100" viewBox="0 0 1800 1100" font-family="Arial,Helvetica,sans-serif">
  <defs>
    <pattern id="roof-tile" x="0" y="0" width="40" height="20" patternUnits="userSpaceOnUse">
      <rect width="40" height="20" fill="#c8735a"/>
      <ellipse cx="20" cy="10" rx="18" ry="8" fill="#d4836a" stroke="#b8634a" stroke-width="0.5"/>
    </pattern>
    <marker id="arro" markerWidth="7" markerHeight="7" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L7,3 z" fill="#2c3e50"/>
    </marker>
    <marker id="arrl" markerWidth="7" markerHeight="7" refX="1" refY="3" orient="auto">
      <path d="M7,0 L7,6 L0,3 z" fill="#2c3e50"/>
    </marker>
  </defs>
  <rect width="1800" height="1100" fill="#f8f4f0"/>
  <rect x="10" y="10" width="1780" height="1080" fill="none" stroke="#1a1a2e" stroke-width="2"/>
  <text x="900" y="52" font-size="26" fill="#1a1a2e" text-anchor="middle" font-weight="900" letter-spacing="2">ROOF PLAN</text>
  <text x="900" y="74" font-size="13" fill="#5a6a80" text-anchor="middle" letter-spacing="1">HOUSE BUILDING PROJECT — SCALE 1:100</text>
  <!-- Roof outline -->
  <polygon points="900,100 1700,500 1700,950 100,950 100,500" fill="url(#roof-tile)" stroke="#8a4a3a" stroke-width="3"/>
  <!-- Ridge line -->
  <line x1="900" y1="100" x2="900" y2="950" stroke="#1a1a2e" stroke-width="3" stroke-dasharray="12,6"/>
  <!-- Hip lines -->
  <line x1="900" y1="100" x2="100" y2="500" stroke="#1a1a2e" stroke-width="2" stroke-dasharray="8,4"/>
  <line x1="900" y1="100" x2="1700" y2="500" stroke="#1a1a2e" stroke-width="2" stroke-dasharray="8,4"/>
  <!-- Eave lines -->
  <line x1="100" y1="500" x2="100" y2="950" stroke="#8a4a3a" stroke-width="2"/>
  <line x1="1700" y1="500" x2="1700" y2="950" stroke="#8a4a3a" stroke-width="2"/>
  <line x1="100" y1="950" x2="1700" y2="950" stroke="#8a4a3a" stroke-width="2"/>
  <!-- Rain water pipe symbols -->
  <circle cx="100" cy="950" r="16" fill="#5a8a8a" stroke="#3a6a6a" stroke-width="2"/>
  <text x="100" y="954" font-size="10" fill="white" text-anchor="middle">RWP</text>
  <circle cx="1700" cy="950" r="16" fill="#5a8a8a" stroke="#3a6a6a" stroke-width="2"/>
  <text x="1700" y="954" font-size="10" fill="white" text-anchor="middle">RWP</text>
  <!-- Annotations -->
  <text x="900" y="560" font-size="18" fill="#1a1a2e" text-anchor="middle" font-weight="700">HIP ROOF</text>
  <text x="900" y="584" font-size="13" fill="#5a6a80" text-anchor="middle">PITCH: 30° | CLAY TILES ON TIMBER TRUSS</text>
  <text x="900" y="604" font-size="12" fill="#5a6a80" text-anchor="middle">RIDGE HEIGHT: +5.5m FROM FINISHED FLOOR LEVEL</text>
  <!-- Title block -->
  <rect x="1400" y="1020" width="370" height="55" fill="#1a1a2e"/>
  <text x="1585" y="1045" font-size="11" fill="white" text-anchor="middle">DWG NO: HBP-RP-001</text>
  <text x="1585" y="1063" font-size="11" fill="white" text-anchor="middle">REV: A | DATE: 2026-08-09</text>
</svg>`;

const ELECTRICAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1100" viewBox="0 0 1800 1100" font-family="Arial,Helvetica,sans-serif">
  <rect width="1800" height="1100" fill="#f8f9fa"/>
  <rect x="10" y="10" width="1780" height="1080" fill="none" stroke="#1a1a2e" stroke-width="2"/>
  <text x="900" y="52" font-size="26" fill="#1a1a2e" text-anchor="middle" font-weight="900" letter-spacing="2">ELECTRICAL LAYOUT PLAN</text>
  <text x="900" y="74" font-size="13" fill="#5a6a80" text-anchor="middle" letter-spacing="1">HOUSE BUILDING PROJECT — GROUND FLOOR</text>
  <!-- Room outlines (same as GF plan) -->
  <rect x="120" y="120" width="1560" height="860" fill="none" stroke="#c0c0c0" stroke-width="6"/>
  <rect x="160" y="160" width="1480" height="780" fill="white"/>
  <rect x="160" y="160" width="600" height="400" fill="#f0f4ff" stroke="#b0b8d0" stroke-width="1"/>
  <text x="460" y="340" font-size="14" fill="#7a8aaa" text-anchor="middle">LIVING ROOM</text>
  <rect x="760" y="160" width="400" height="380" fill="#f0f4ff" stroke="#b0b8d0" stroke-width="1"/>
  <text x="960" y="340" font-size="14" fill="#7a8aaa" text-anchor="middle">KITCHEN</text>
  <rect x="1160" y="160" width="480" height="420" fill="#f0f4ff" stroke="#b0b8d0" stroke-width="1"/>
  <text x="1400" y="340" font-size="14" fill="#7a8aaa" text-anchor="middle">MASTER BEDROOM</text>
  <rect x="160" y="560" width="400" height="380" fill="#f0f4ff" stroke="#b0b8d0" stroke-width="1"/>
  <text x="360" y="740" font-size="14" fill="#7a8aaa" text-anchor="middle">BEDROOM 2</text>
  <rect x="1160" y="580" width="480" height="360" fill="#f0f4ff" stroke="#b0b8d0" stroke-width="1"/>
  <text x="1400" y="760" font-size="14" fill="#7a8aaa" text-anchor="middle">STUDY</text>
  <!-- Electrical circuits (red dashed lines) -->
  <polyline points="180,200 460,200 460,300 760,300" fill="none" stroke="#e03030" stroke-width="2" stroke-dasharray="8,4"/>
  <polyline points="760,300 960,300 960,200 1160,200 1400,200" fill="none" stroke="#e03030" stroke-width="2" stroke-dasharray="8,4"/>
  <polyline points="180,600 360,600 360,760 560,760 860,760 1160,760 1400,760" fill="none" stroke="#e03030" stroke-width="2" stroke-dasharray="8,4"/>
  <!-- Light point symbols -->
  <circle cx="460" cy="280" r="14" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
  <line x1="460" y1="266" x2="460" y2="294" stroke="#f59e0b" stroke-width="2"/>
  <line x1="446" y1="280" x2="474" y2="280" stroke="#f59e0b" stroke-width="2"/>
  <circle cx="960" cy="280" r="14" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
  <line x1="960" y1="266" x2="960" y2="294" stroke="#f59e0b" stroke-width="2"/>
  <line x1="946" y1="280" x2="974" y2="280" stroke="#f59e0b" stroke-width="2"/>
  <circle cx="1400" cy="320" r="14" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
  <line x1="1400" y1="306" x2="1400" y2="334" stroke="#f59e0b" stroke-width="2"/>
  <line x1="1386" y1="320" x2="1414" y2="320" stroke="#f59e0b" stroke-width="2"/>
  <circle cx="360" cy="720" r="14" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
  <line x1="360" y1="706" x2="360" y2="734" stroke="#f59e0b" stroke-width="2"/>
  <line x1="346" y1="720" x2="374" y2="720" stroke="#f59e0b" stroke-width="2"/>
  <circle cx="1400" cy="720" r="14" fill="none" stroke="#f59e0b" stroke-width="2.5"/>
  <line x1="1400" y1="706" x2="1400" y2="734" stroke="#f59e0b" stroke-width="2"/>
  <line x1="1386" y1="720" x2="1414" y2="720" stroke="#f59e0b" stroke-width="2"/>
  <!-- Socket symbols -->
  <rect x="230" y="270" width="20" height="20" fill="none" stroke="#3b82f6" stroke-width="2" rx="2"/>
  <line x1="235" y1="278" x2="235" y2="284" stroke="#3b82f6" stroke-width="1.5"/>
  <line x1="245" y1="278" x2="245" y2="284" stroke="#3b82f6" stroke-width="1.5"/>
  <rect x="1230" y="270" width="20" height="20" fill="none" stroke="#3b82f6" stroke-width="2" rx="2"/>
  <line x1="1235" y1="278" x2="1235" y2="284" stroke="#3b82f6" stroke-width="1.5"/>
  <line x1="1245" y1="278" x2="1245" y2="284" stroke="#3b82f6" stroke-width="1.5"/>
  <!-- MCB / DB panel -->
  <rect x="140" y="310" width="60" height="80" fill="#1a1a2e" stroke="#444" stroke-width="2" rx="4"/>
  <text x="170" y="353" font-size="9" fill="white" text-anchor="middle">MAIN</text>
  <text x="170" y="365" font-size="9" fill="white" text-anchor="middle">DB</text>
  <!-- Legend -->
  <rect x="1450" y="150" width="310" height="200" fill="white" stroke="#c0c0c0" stroke-width="1" rx="4"/>
  <text x="1605" y="172" font-size="13" fill="#1a1a2e" text-anchor="middle" font-weight="700">LEGEND</text>
  <circle cx="1480" cy="198" r="10" fill="none" stroke="#f59e0b" stroke-width="2"/>
  <text x="1500" y="202" font-size="11" fill="#1a1a2e">Light Point</text>
  <rect x="1470" y="220" width="16" height="16" fill="none" stroke="#3b82f6" stroke-width="1.5" rx="1"/>
  <text x="1500" y="231" font-size="11" fill="#1a1a2e">Power Socket</text>
  <line x1="1470" y1="255" x2="1510" y2="255" stroke="#e03030" stroke-width="2" stroke-dasharray="6,3"/>
  <text x="1520" y="259" font-size="11" fill="#1a1a2e">Circuit Run</text>
  <rect x="1470" y="273" width="20" height="28" fill="#1a1a2e" rx="2"/>
  <text x="1500" y="291" font-size="11" fill="#1a1a2e">Distribution Board</text>
  <!-- Title block -->
  <rect x="1400" y="1020" width="370" height="55" fill="#1a1a2e"/>
  <text x="1585" y="1045" font-size="11" fill="white" text-anchor="middle">DWG NO: HBP-EL-001</text>
  <text x="1585" y="1063" font-size="11" fill="white" text-anchor="middle">REV: A | DATE: 2026-08-09</text>
</svg>`;

const STEEL_COLUMN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" font-family="Arial,Helvetica,sans-serif">
  <rect width="1600" height="1000" fill="#f4f6f8"/>
  <rect x="10" y="10" width="1580" height="980" fill="none" stroke="#1a1a2e" stroke-width="2"/>
  <text x="800" y="48" font-size="24" fill="#1a1a2e" text-anchor="middle" font-weight="900" letter-spacing="2">STEEL COLUMN ERECTION PLAN</text>
  <text x="800" y="68" font-size="12" fill="#5a6a80" text-anchor="middle">STEEL STRUCTURE PROJECT — SCALE 1:50</text>
  <!-- Grid lines -->
  <line x1="200" y1="120" x2="200" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="600" y1="120" x2="600" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="1000" y1="120" x2="1000" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="1400" y1="120" x2="1400" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="120" y1="200" x2="1480" y2="200" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="120" y1="550" x2="1480" y2="550" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="120" y1="900" x2="1480" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <!-- Column symbols (I-section view from top) -->
  <g transform="translate(200,200)">
    <rect x="-20" y="-30" width="40" height="8" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <rect x="-6" y="-22" width="12" height="44" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <rect x="-20" y="22" width="40" height="8" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <text x="0" y="50" font-size="11" fill="#1a1a2e" text-anchor="middle">C-A1</text>
  </g>
  <g transform="translate(600,200)">
    <rect x="-20" y="-30" width="40" height="8" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <rect x="-6" y="-22" width="12" height="44" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <rect x="-20" y="22" width="40" height="8" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <text x="0" y="50" font-size="11" fill="#1a1a2e" text-anchor="middle">C-B1</text>
  </g>
  <g transform="translate(1000,200)">
    <rect x="-20" y="-30" width="40" height="8" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <rect x="-6" y="-22" width="12" height="44" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <rect x="-20" y="22" width="40" height="8" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <text x="0" y="50" font-size="11" fill="#1a1a2e" text-anchor="middle">C-C1</text>
  </g>
  <g transform="translate(1400,200)">
    <rect x="-20" y="-30" width="40" height="8" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <rect x="-6" y="-22" width="12" height="44" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <rect x="-20" y="22" width="40" height="8" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <text x="0" y="50" font-size="11" fill="#1a1a2e" text-anchor="middle">C-D1</text>
  </g>
  <g transform="translate(200,550)">
    <rect x="-20" y="-30" width="40" height="8" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <rect x="-6" y="-22" width="12" height="44" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <rect x="-20" y="22" width="40" height="8" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <text x="0" y="50" font-size="11" fill="#1a1a2e" text-anchor="middle">C-A2</text>
  </g>
  <g transform="translate(600,550)">
    <rect x="-20" y="-30" width="40" height="8" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <rect x="-6" y="-22" width="12" height="44" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <rect x="-20" y="22" width="40" height="8" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <text x="0" y="50" font-size="11" fill="#1a1a2e" text-anchor="middle">C-B2</text>
  </g>
  <g transform="translate(1000,550)">
    <rect x="-20" y="-30" width="40" height="8" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <rect x="-6" y="-22" width="12" height="44" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <rect x="-20" y="22" width="40" height="8" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <text x="0" y="50" font-size="11" fill="#1a1a2e" text-anchor="middle">C-C2</text>
  </g>
  <g transform="translate(1400,550)">
    <rect x="-20" y="-30" width="40" height="8" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <rect x="-6" y="-22" width="12" height="44" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <rect x="-20" y="22" width="40" height="8" fill="#2c6ea6" stroke="#1a4a7a" stroke-width="1.5"/>
    <text x="0" y="50" font-size="11" fill="#1a1a2e" text-anchor="middle">C-D2</text>
  </g>
  <!-- Grid labels -->
  <text x="200" y="105" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">A</text>
  <text x="600" y="105" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">B</text>
  <text x="1000" y="105" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">C</text>
  <text x="1400" y="105" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">D</text>
  <text x="80" y="205" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">1</text>
  <text x="80" y="555" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">2</text>
  <text x="80" y="905" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">3</text>
  <!-- Note -->
  <text x="800" y="760" font-size="14" fill="#1a1a2e" text-anchor="middle">COLUMN SECTION: ISHB 250 | GRADE: Fe 415</text>
  <text x="800" y="780" font-size="12" fill="#5a6a80" text-anchor="middle">BASE PLATE: 400×400×20mm | ANCHOR BOLTS: M24 × 4 Nos.</text>
  <!-- Title block -->
  <rect x="1200" y="930" width="370" height="55" fill="#1a1a2e"/>
  <text x="1385" y="955" font-size="11" fill="white" text-anchor="middle">DWG NO: STR-COL-002</text>
  <text x="1385" y="973" font-size="11" fill="white" text-anchor="middle">REV: A | DATE: 2026-08-06</text>
</svg>`;

// All steel-project drawings below share the exact grid metrics of
// STEEL_COLUMN_SVG (viewBox 1600×1000, columns A–D at x=200/600/1000/1400,
// rows 1–2 at y=200/550) so a beam/rafter/sheet grid point lands on the same
// pixel as the real column it connects to — see STEEL_GRID_POSITIONS below.

const STEEL_FOUNDATION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" font-family="Arial,Helvetica,sans-serif">
  <rect width="1600" height="1000" fill="#f4f6f8"/>
  <rect x="10" y="10" width="1580" height="980" fill="none" stroke="#1a1a2e" stroke-width="2"/>
  <text x="800" y="48" font-size="24" fill="#1a1a2e" text-anchor="middle" font-weight="900" letter-spacing="2">FOUNDATION PLAN</text>
  <text x="800" y="68" font-size="12" fill="#5a6a80" text-anchor="middle">STEEL STRUCTURE PROJECT — SCALE 1:50</text>
  <!-- Grid lines -->
  <line x1="200" y1="120" x2="200" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="600" y1="120" x2="600" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="1000" y1="120" x2="1000" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="1400" y1="120" x2="1400" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="120" y1="200" x2="1480" y2="200" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="120" y1="550" x2="1480" y2="550" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <!-- Grade beams -->
  <line x1="170" y1="200" x2="1430" y2="200" stroke="#8B6914" stroke-width="8" stroke-linecap="round"/>
  <line x1="170" y1="550" x2="1430" y2="550" stroke="#8B6914" stroke-width="8" stroke-linecap="round"/>
  <line x1="200" y1="170" x2="200" y2="580" stroke="#8B6914" stroke-width="8" stroke-linecap="round"/>
  <line x1="600" y1="170" x2="600" y2="580" stroke="#8B6914" stroke-width="8" stroke-linecap="round"/>
  <line x1="1000" y1="170" x2="1000" y2="580" stroke="#8B6914" stroke-width="8" stroke-linecap="round"/>
  <line x1="1400" y1="170" x2="1400" y2="580" stroke="#8B6914" stroke-width="8" stroke-linecap="round"/>
  <!-- Footing pads -->
  <g>
    <rect x="170" y="170" width="60" height="60" fill="#d4b483" stroke="#5c3d11" stroke-width="2.5"/>
    <rect x="182" y="182" width="36" height="36" fill="#c8a45a" stroke="#5c3d11" stroke-width="1.5"/>
    <text x="236" y="196" font-size="11" fill="#1a1a2e" font-weight="700">FP-A1</text>
  </g>
  <g>
    <rect x="570" y="170" width="60" height="60" fill="#d4b483" stroke="#5c3d11" stroke-width="2.5"/>
    <rect x="582" y="182" width="36" height="36" fill="#c8a45a" stroke="#5c3d11" stroke-width="1.5"/>
    <text x="636" y="196" font-size="11" fill="#1a1a2e" font-weight="700">FP-B1</text>
  </g>
  <g>
    <rect x="970" y="170" width="60" height="60" fill="#d4b483" stroke="#5c3d11" stroke-width="2.5"/>
    <rect x="982" y="182" width="36" height="36" fill="#c8a45a" stroke="#5c3d11" stroke-width="1.5"/>
    <text x="1036" y="196" font-size="11" fill="#1a1a2e" font-weight="700">FP-C1</text>
  </g>
  <g>
    <rect x="1370" y="170" width="60" height="60" fill="#d4b483" stroke="#5c3d11" stroke-width="2.5"/>
    <rect x="1382" y="182" width="36" height="36" fill="#c8a45a" stroke="#5c3d11" stroke-width="1.5"/>
    <text x="1330" y="196" font-size="11" fill="#1a1a2e" font-weight="700" text-anchor="end">FP-D1</text>
  </g>
  <g>
    <rect x="170" y="520" width="60" height="60" fill="#d4b483" stroke="#5c3d11" stroke-width="2.5"/>
    <rect x="182" y="532" width="36" height="36" fill="#c8a45a" stroke="#5c3d11" stroke-width="1.5"/>
    <text x="236" y="546" font-size="11" fill="#1a1a2e" font-weight="700">FP-A2</text>
  </g>
  <g>
    <rect x="570" y="520" width="60" height="60" fill="#d4b483" stroke="#5c3d11" stroke-width="2.5"/>
    <rect x="582" y="532" width="36" height="36" fill="#c8a45a" stroke="#5c3d11" stroke-width="1.5"/>
    <text x="636" y="546" font-size="11" fill="#1a1a2e" font-weight="700">FP-B2</text>
  </g>
  <g>
    <rect x="970" y="520" width="60" height="60" fill="#d4b483" stroke="#5c3d11" stroke-width="2.5"/>
    <rect x="982" y="532" width="36" height="36" fill="#c8a45a" stroke="#5c3d11" stroke-width="1.5"/>
    <text x="1036" y="546" font-size="11" fill="#1a1a2e" font-weight="700">FP-C2</text>
  </g>
  <g>
    <rect x="1370" y="520" width="60" height="60" fill="#d4b483" stroke="#5c3d11" stroke-width="2.5"/>
    <rect x="1382" y="532" width="36" height="36" fill="#c8a45a" stroke="#5c3d11" stroke-width="1.5"/>
    <text x="1330" y="546" font-size="11" fill="#1a1a2e" font-weight="700" text-anchor="end">FP-D2</text>
  </g>
  <!-- Grid labels -->
  <text x="200" y="105" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">A</text>
  <text x="600" y="105" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">B</text>
  <text x="1000" y="105" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">C</text>
  <text x="1400" y="105" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">D</text>
  <text x="80" y="205" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">1</text>
  <text x="80" y="555" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">2</text>
  <!-- Note -->
  <text x="800" y="760" font-size="14" fill="#1a1a2e" text-anchor="middle">FOOTING: 900×900×450mm ISOLATED PAD | GRADE BEAM: 300×450mm</text>
  <text x="800" y="780" font-size="12" fill="#5a6a80" text-anchor="middle">CONCRETE: M25 | REINFORCEMENT: Fe 500 TMT BARS | MIN. COVER: 50mm</text>
  <!-- Title block -->
  <rect x="1200" y="930" width="370" height="55" fill="#1a1a2e"/>
  <text x="1385" y="955" font-size="11" fill="white" text-anchor="middle">DWG NO: STR-FND-001</text>
  <text x="1385" y="973" font-size="11" fill="white" text-anchor="middle">REV: A | DATE: 2026-08-06</text>
</svg>`;

const STEEL_BEAM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" font-family="Arial,Helvetica,sans-serif">
  <rect width="1600" height="1000" fill="#f0f6f4"/>
  <rect x="10" y="10" width="1580" height="980" fill="none" stroke="#065f46" stroke-width="2"/>
  <text x="800" y="48" font-size="24" fill="#065f46" text-anchor="middle" font-weight="900" letter-spacing="2">STEEL BEAM ERECTION PLAN</text>
  <text x="800" y="68" font-size="12" fill="#5a6a80" text-anchor="middle">STEEL STRUCTURE PROJECT — SCALE 1:50</text>
  <!-- Grid lines -->
  <line x1="200" y1="120" x2="200" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="600" y1="120" x2="600" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="1000" y1="120" x2="1000" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="1400" y1="120" x2="1400" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="120" y1="200" x2="1480" y2="200" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="120" y1="550" x2="1480" y2="550" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <!-- Primary beams (row 1 and row 2, spanning A→D) -->
  <line x1="200" y1="200" x2="1400" y2="200" stroke="#065f46" stroke-width="7" stroke-linecap="round"/>
  <text x="800" y="188" font-size="11" fill="#065f46" text-anchor="middle" font-weight="700">PB1 – ISMB 300 (GRID 1)</text>
  <line x1="200" y1="550" x2="1400" y2="550" stroke="#065f46" stroke-width="7" stroke-linecap="round"/>
  <text x="800" y="538" font-size="11" fill="#065f46" text-anchor="middle" font-weight="700">PB1 – ISMB 300 (GRID 2)</text>
  <!-- Secondary beams (columns A–D, spanning row 1→2) -->
  <line x1="200" y1="200" x2="200" y2="550" stroke="#0284c7" stroke-width="4.5" stroke-linecap="round"/>
  <text x="150" y="380" font-size="10" fill="#0284c7" text-anchor="middle" transform="rotate(-90 150 380)">SB-A ISMB 200</text>
  <line x1="600" y1="200" x2="600" y2="550" stroke="#0284c7" stroke-width="4.5" stroke-linecap="round"/>
  <text x="550" y="380" font-size="10" fill="#0284c7" text-anchor="middle" transform="rotate(-90 550 380)">SB-B ISMB 200</text>
  <line x1="1000" y1="200" x2="1000" y2="550" stroke="#0284c7" stroke-width="4.5" stroke-linecap="round"/>
  <text x="950" y="380" font-size="10" fill="#0284c7" text-anchor="middle" transform="rotate(-90 950 380)">SB-C ISMB 200</text>
  <line x1="1400" y1="200" x2="1400" y2="550" stroke="#0284c7" stroke-width="4.5" stroke-linecap="round"/>
  <text x="1350" y="380" font-size="10" fill="#0284c7" text-anchor="middle" transform="rotate(-90 1350 380)">SB-D ISMB 200</text>
  <!-- Column stubs + bolted connections at every node -->
  <g transform="translate(200,200)"><rect x="-9" y="-9" width="18" height="18" fill="#9ca3af" stroke="#1a1a2e" stroke-width="2"/><circle r="12" fill="none" stroke="#dc2626" stroke-width="1.5"/></g>
  <g transform="translate(600,200)"><rect x="-9" y="-9" width="18" height="18" fill="#9ca3af" stroke="#1a1a2e" stroke-width="2"/><circle r="12" fill="none" stroke="#dc2626" stroke-width="1.5"/></g>
  <g transform="translate(1000,200)"><rect x="-9" y="-9" width="18" height="18" fill="#9ca3af" stroke="#1a1a2e" stroke-width="2"/><circle r="12" fill="none" stroke="#dc2626" stroke-width="1.5"/></g>
  <g transform="translate(1400,200)"><rect x="-9" y="-9" width="18" height="18" fill="#9ca3af" stroke="#1a1a2e" stroke-width="2"/><circle r="12" fill="none" stroke="#dc2626" stroke-width="1.5"/></g>
  <g transform="translate(200,550)"><rect x="-9" y="-9" width="18" height="18" fill="#9ca3af" stroke="#1a1a2e" stroke-width="2"/><circle r="12" fill="none" stroke="#dc2626" stroke-width="1.5"/></g>
  <g transform="translate(600,550)"><rect x="-9" y="-9" width="18" height="18" fill="#9ca3af" stroke="#1a1a2e" stroke-width="2"/><circle r="12" fill="none" stroke="#dc2626" stroke-width="1.5"/></g>
  <g transform="translate(1000,550)"><rect x="-9" y="-9" width="18" height="18" fill="#9ca3af" stroke="#1a1a2e" stroke-width="2"/><circle r="12" fill="none" stroke="#dc2626" stroke-width="1.5"/></g>
  <g transform="translate(1400,550)"><rect x="-9" y="-9" width="18" height="18" fill="#9ca3af" stroke="#1a1a2e" stroke-width="2"/><circle r="12" fill="none" stroke="#dc2626" stroke-width="1.5"/></g>
  <!-- Grid labels -->
  <text x="200" y="105" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">A</text>
  <text x="600" y="105" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">B</text>
  <text x="1000" y="105" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">C</text>
  <text x="1400" y="105" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">D</text>
  <text x="80" y="205" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">1</text>
  <text x="80" y="555" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">2</text>
  <!-- Note -->
  <text x="800" y="760" font-size="14" fill="#1a1a2e" text-anchor="middle">PRIMARY BEAM (PB): ISMB 300 | SECONDARY BEAM (SB): ISMB 200</text>
  <text x="800" y="780" font-size="12" fill="#5a6a80" text-anchor="middle">CONNECTIONS: BOLTED HSFG, M20 GRADE 8.8 | STEEL GRADE: Fe 415</text>
  <!-- Title block -->
  <rect x="1200" y="930" width="370" height="55" fill="#1a1a2e"/>
  <text x="1385" y="955" font-size="11" fill="white" text-anchor="middle">DWG NO: STR-BEA-003</text>
  <text x="1385" y="973" font-size="11" fill="white" text-anchor="middle">REV: A | DATE: 2026-08-06</text>
</svg>`;

const STEEL_RAFTER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" font-family="Arial,Helvetica,sans-serif">
  <rect width="1600" height="1000" fill="#faf7ff"/>
  <rect x="10" y="10" width="1580" height="980" fill="none" stroke="#7c3aed" stroke-width="2"/>
  <text x="800" y="48" font-size="24" fill="#7c3aed" text-anchor="middle" font-weight="900" letter-spacing="2">STEEL RAFTER / ROOF FRAMING PLAN</text>
  <text x="800" y="68" font-size="12" fill="#5a6a80" text-anchor="middle">STEEL STRUCTURE PROJECT — SCALE 1:50</text>
  <!-- Grid lines -->
  <line x1="200" y1="120" x2="200" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="600" y1="120" x2="600" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="1000" y1="120" x2="1000" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="1400" y1="120" x2="1400" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="120" y1="200" x2="1480" y2="200" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="120" y1="550" x2="1480" y2="550" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <!-- Purlins (parallel to ridge) -->
  <line x1="180" y1="270" x2="1420" y2="270" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="10,5"/>
  <line x1="180" y1="310" x2="1420" y2="310" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="10,5"/>
  <line x1="180" y1="440" x2="1420" y2="440" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="10,5"/>
  <line x1="180" y1="480" x2="1420" y2="480" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="10,5"/>
  <text x="1430" y="274" font-size="9" fill="#b45309">PL-1 C150×65×20×2.5</text>
  <text x="1430" y="484" font-size="9" fill="#b45309">PL-4 C150×65×20×2.5</text>
  <!-- Rafters: each column bay from eave to ridge -->
  <line x1="200" y1="200" x2="200" y2="375" stroke="#a855f7" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="200" y1="375" x2="200" y2="550" stroke="#a855f7" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="600" y1="200" x2="600" y2="375" stroke="#a855f7" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="600" y1="375" x2="600" y2="550" stroke="#a855f7" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="1000" y1="200" x2="1000" y2="375" stroke="#a855f7" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="1000" y1="375" x2="1000" y2="550" stroke="#a855f7" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="1400" y1="200" x2="1400" y2="375" stroke="#a855f7" stroke-width="4.5" stroke-linecap="round"/>
  <line x1="1400" y1="375" x2="1400" y2="550" stroke="#a855f7" stroke-width="4.5" stroke-linecap="round"/>
  <text x="212" y="290" font-size="9" fill="#7c3aed" font-weight="700">RF-A</text>
  <text x="612" y="290" font-size="9" fill="#7c3aed" font-weight="700">RF-B</text>
  <text x="1012" y="290" font-size="9" fill="#7c3aed" font-weight="700">RF-C</text>
  <text x="1412" y="290" font-size="9" fill="#7c3aed" font-weight="700">RF-D</text>
  <!-- Ridge beam -->
  <line x1="180" y1="375" x2="1420" y2="375" stroke="#7c3aed" stroke-width="8" stroke-linecap="round"/>
  <text x="800" y="365" font-size="12" fill="#7c3aed" text-anchor="middle" font-weight="700">RIDGE BEAM RB1 – ISMB 250</text>
  <!-- Bracing -->
  <line x1="200" y1="200" x2="600" y2="375" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="6,4"/>
  <line x1="600" y1="200" x2="200" y2="375" stroke="#ef4444" stroke-width="1.5" stroke-dasharray="6,4"/>
  <!-- Slope arrow -->
  <line x1="120" y1="330" x2="180" y2="290" stroke="#dc2626" stroke-width="2"/>
  <text x="60" y="345" font-size="12" fill="#dc2626">SLOPE 1:10</text>
  <!-- Grid labels -->
  <text x="200" y="105" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">A</text>
  <text x="600" y="105" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">B</text>
  <text x="1000" y="105" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">C</text>
  <text x="1400" y="105" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">D</text>
  <text x="80" y="205" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">1</text>
  <text x="80" y="555" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">2</text>
  <!-- Note -->
  <text x="800" y="760" font-size="14" fill="#1a1a2e" text-anchor="middle">RAFTER (RF): ISMC 200 | RIDGE BEAM (RB): ISMB 250</text>
  <text x="800" y="780" font-size="12" fill="#5a6a80" text-anchor="middle">PURLIN: C150×65×20×2.5mm @ 1200 c/c | ROOF SLOPE: 1:10</text>
  <!-- Title block -->
  <rect x="1200" y="930" width="370" height="55" fill="#1a1a2e"/>
  <text x="1385" y="955" font-size="11" fill="white" text-anchor="middle">DWG NO: STR-RAF-004</text>
  <text x="1385" y="973" font-size="11" fill="white" text-anchor="middle">REV: A | DATE: 2026-08-06</text>
</svg>`;

const WALL_DRAWING_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" font-family="Arial,Helvetica,sans-serif">
  <rect width="1600" height="1000" fill="#f5f3ef"/>
  <rect x="10" y="10" width="1580" height="980" fill="none" stroke="#1a1a2e" stroke-width="2"/>
  <rect x="15" y="15" width="1570" height="970" fill="none" stroke="#1a1a2e" stroke-width="0.7"/>
  <text x="800" y="50" font-size="24" fill="#1a1a2e" text-anchor="middle" font-weight="900" letter-spacing="2">WALL LAYOUT PLAN</text>
  <text x="800" y="70" font-size="12" fill="#5a6a80" text-anchor="middle" letter-spacing="1">HOUSE BUILDING PROJECT — GROUND FLOOR — SCALE 1:50</text>
  <!-- Grid lines (dashed, light) -->
  <line x1="200" y1="120" x2="200" y2="880" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="600" y1="120" x2="600" y2="880" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="1000" y1="120" x2="1000" y2="880" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="1400" y1="120" x2="1400" y2="880" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="120" y1="200" x2="1480" y2="200" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="120" y1="550" x2="1480" y2="550" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="120" y1="880" x2="1480" y2="880" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <!-- ── Outer boundary walls (thick hatched walls) ── -->
  <!-- Top wall A1–D1 -->
  <rect x="180" y="180" width="1240" height="40" fill="#c8c0b0" stroke="#3a2e1a" stroke-width="2.5"/>
  <line x1="188" y1="188" x2="1412" y2="188" stroke="#7a6a50" stroke-width="0.8" stroke-dasharray="6,4"/>
  <!-- Bottom wall A3–D3 -->
  <rect x="180" y="860" width="1240" height="40" fill="#c8c0b0" stroke="#3a2e1a" stroke-width="2.5"/>
  <!-- Left wall A1–A3 -->
  <rect x="180" y="200" width="40" height="680" fill="#c8c0b0" stroke="#3a2e1a" stroke-width="2.5"/>
  <!-- Right wall D1–D3 -->
  <rect x="1380" y="200" width="40" height="680" fill="#c8c0b0" stroke="#3a2e1a" stroke-width="2.5"/>
  <!-- ── Internal partition walls ── -->
  <!-- Horizontal partition @ grid row 2 (y=550), B1–C2 span -->
  <rect x="220" y="536" width="760" height="28" fill="#d8d0c0" stroke="#5a4a30" stroke-width="1.5"/>
  <!-- Vertical partition @ grid col B (x=600), row 2–3 -->
  <rect x="586" y="550" width="28" height="310" fill="#d8d0c0" stroke="#5a4a30" stroke-width="1.5"/>
  <!-- Vertical partition @ grid col C (x=1000), row 1–3 -->
  <rect x="986" y="200" width="28" height="660" fill="#d8d0c0" stroke="#5a4a30" stroke-width="1.5"/>
  <!-- ── Door openings ── -->
  <!-- Door in left wall (A1–A2 span, y~350) -->
  <rect x="180" y="340" width="40" height="90" fill="#f5f3ef" stroke="none"/>
  <line x1="180" y1="340" x2="220" y2="340" stroke="#3a2e1a" stroke-width="2.5"/>
  <line x1="180" y1="430" x2="220" y2="430" stroke="#3a2e1a" stroke-width="2.5"/>
  <path d="M220,340 Q260,385 220,430" fill="none" stroke="#7a6a50" stroke-width="1" stroke-dasharray="4,3"/>
  <!-- Door in top wall (B1–C1 span, x~750) -->
  <rect x="740" y="180" width="100" height="40" fill="#f5f3ef" stroke="none"/>
  <line x1="740" y1="180" x2="740" y2="220" stroke="#3a2e1a" stroke-width="2.5"/>
  <line x1="840" y1="180" x2="840" y2="220" stroke="#3a2e1a" stroke-width="2.5"/>
  <path d="M740,220 Q790,175 840,220" fill="none" stroke="#7a6a50" stroke-width="1" stroke-dasharray="4,3"/>
  <!-- Door in internal partition (vertical col C, y~400) -->
  <rect x="986" y="390" width="28" height="80" fill="#f5f3ef" stroke="none"/>
  <line x1="986" y1="390" x2="1014" y2="390" stroke="#5a4a30" stroke-width="1.5"/>
  <line x1="986" y1="470" x2="1014" y2="470" stroke="#5a4a30" stroke-width="1.5"/>
  <!-- ── Window openings ── -->
  <!-- Window in top wall (A1–B1 span, x~350) -->
  <rect x="310" y="180" width="130" height="40" fill="#cce8f4" stroke="none"/>
  <line x1="310" y1="180" x2="310" y2="220" stroke="#3a2e1a" stroke-width="2.5"/>
  <line x1="440" y1="180" x2="440" y2="220" stroke="#3a2e1a" stroke-width="2.5"/>
  <line x1="310" y1="200" x2="440" y2="200" stroke="#1a7aad" stroke-width="1.2"/>
  <line x1="375" y1="180" x2="375" y2="220" stroke="#1a7aad" stroke-width="1.2"/>
  <!-- Window in right wall (D2–D3 span, y~700) -->
  <rect x="1380" y="670" width="40" height="130" fill="#cce8f4" stroke="none"/>
  <line x1="1380" y1="670" x2="1420" y2="670" stroke="#3a2e1a" stroke-width="2.5"/>
  <line x1="1380" y1="800" x2="1420" y2="800" stroke="#3a2e1a" stroke-width="2.5"/>
  <line x1="1400" y1="670" x2="1400" y2="800" stroke="#1a7aad" stroke-width="1.2"/>
  <line x1="1380" y1="735" x2="1420" y2="735" stroke="#1a7aad" stroke-width="1.2"/>
  <!-- ── Column stubs at grid intersections ── -->
  <rect x="188" y="188" width="24" height="24" fill="#1a1a2e"/>
  <rect x="588" y="188" width="24" height="24" fill="#1a1a2e"/>
  <rect x="988" y="188" width="24" height="24" fill="#1a1a2e"/>
  <rect x="1388" y="188" width="24" height="24" fill="#1a1a2e"/>
  <rect x="188" y="538" width="24" height="24" fill="#1a1a2e"/>
  <rect x="588" y="538" width="24" height="24" fill="#1a1a2e"/>
  <rect x="988" y="538" width="24" height="24" fill="#1a1a2e"/>
  <rect x="1388" y="538" width="24" height="24" fill="#1a1a2e"/>
  <rect x="188" y="868" width="24" height="24" fill="#1a1a2e"/>
  <rect x="588" y="868" width="24" height="24" fill="#1a1a2e"/>
  <rect x="988" y="868" width="24" height="24" fill="#1a1a2e"/>
  <rect x="1388" y="868" width="24" height="24" fill="#1a1a2e"/>
  <!-- ── Room labels ── -->
  <text x="480" y="380" font-size="13" fill="#2c3e50" text-anchor="middle" font-weight="700">LIVING ROOM</text>
  <text x="480" y="398" font-size="10" fill="#5a6a80" text-anchor="middle">CAVITY BRICK WALL, 230mm</text>
  <text x="800" y="380" font-size="13" fill="#2c3e50" text-anchor="middle" font-weight="700">DINING / KITCHEN</text>
  <text x="800" y="398" font-size="10" fill="#5a6a80" text-anchor="middle">SOLID BLOCK, 200mm</text>
  <text x="1200" y="380" font-size="13" fill="#2c3e50" text-anchor="middle" font-weight="700">MASTER BEDROOM</text>
  <text x="1200" y="398" font-size="10" fill="#5a6a80" text-anchor="middle">CAVITY BRICK WALL, 230mm</text>
  <text x="400" y="720" font-size="13" fill="#2c3e50" text-anchor="middle" font-weight="700">BEDROOM 2</text>
  <text x="400" y="738" font-size="10" fill="#5a6a80" text-anchor="middle">SOLID BLOCK, 200mm</text>
  <text x="800" y="720" font-size="13" fill="#2c3e50" text-anchor="middle" font-weight="700">CORRIDOR</text>
  <text x="1200" y="720" font-size="13" fill="#2c3e50" text-anchor="middle" font-weight="700">STUDY</text>
  <text x="1200" y="738" font-size="10" fill="#5a6a80" text-anchor="middle">SOLID BLOCK, 200mm</text>
  <!-- ── Wall type legend ── -->
  <rect x="30" y="870" width="460" height="100" fill="white" stroke="#c0c0c0" stroke-width="1" rx="4"/>
  <text x="260" y="888" font-size="12" fill="#1a1a2e" text-anchor="middle" font-weight="700">WALL LEGEND</text>
  <rect x="45" y="898" width="30" height="14" fill="#c8c0b0" stroke="#3a2e1a" stroke-width="1.5"/>
  <text x="83" y="910" font-size="10" fill="#1a1a2e">Outer Brick Wall (230mm)</text>
  <rect x="45" y="920" width="30" height="14" fill="#d8d0c0" stroke="#5a4a30" stroke-width="1.5"/>
  <text x="83" y="932" font-size="10" fill="#1a1a2e">Internal Partition (200mm)</text>
  <rect x="240" y="898" width="30" height="14" fill="#cce8f4" stroke="#3a2e1a" stroke-width="1.5"/>
  <text x="278" y="910" font-size="10" fill="#1a1a2e">Window Opening</text>
  <rect x="240" y="920" width="30" height="14" fill="#f5f3ef" stroke="#3a2e1a" stroke-width="1.5"/>
  <text x="278" y="932" font-size="10" fill="#1a1a2e">Door Opening</text>
  <!-- ── Grid labels ── -->
  <text x="200" y="108" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">A</text>
  <text x="600" y="108" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">B</text>
  <text x="1000" y="108" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">C</text>
  <text x="1400" y="108" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">D</text>
  <text x="90" y="205" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">1</text>
  <text x="90" y="555" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">2</text>
  <text x="90" y="885" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">3</text>
  <!-- ── Dimensions ── -->
  <line x1="200" y1="950" x2="1400" y2="950" stroke="#2c3e50" stroke-width="1" marker-start="url(#arrl)" marker-end="url(#arro)"/>
  <text x="800" y="968" font-size="11" fill="#2c3e50" text-anchor="middle">12.0 m</text>
  <line x1="50" y1="200" x2="50" y2="880" stroke="#2c3e50" stroke-width="1" marker-start="url(#arrl)" marker-end="url(#arro)"/>
  <text x="28" y="545" font-size="11" fill="#2c3e50" text-anchor="middle" transform="rotate(-90,28,545)">6.8 m</text>
  <!-- Title block -->
  <rect x="1200" y="930" width="370" height="55" fill="#1a1a2e"/>
  <text x="1385" y="954" font-size="11" fill="white" text-anchor="middle">DWG NO: HBP-WL-001</text>
  <text x="1385" y="972" font-size="11" fill="white" text-anchor="middle">REV: A | DATE: 2026-08-18</text>
</svg>`;

const STEEL_ROOF_SHEET_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000" font-family="Arial,Helvetica,sans-serif">
  <rect width="1600" height="1000" fill="#f8fafc"/>
  <rect x="10" y="10" width="1580" height="980" fill="none" stroke="#0f172a" stroke-width="2"/>
  <text x="800" y="48" font-size="24" fill="#0f172a" text-anchor="middle" font-weight="900" letter-spacing="2">ROOF SHEET LAYOUT PLAN</text>
  <text x="800" y="68" font-size="12" fill="#5a6a80" text-anchor="middle">STEEL STRUCTURE PROJECT — SCALE 1:50</text>
  <!-- Grid lines -->
  <line x1="200" y1="120" x2="200" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="600" y1="120" x2="600" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="1000" y1="120" x2="1000" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="1400" y1="120" x2="1400" y2="900" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="120" y1="200" x2="1480" y2="200" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <line x1="120" y1="550" x2="1480" y2="550" stroke="#c0c8d0" stroke-width="1" stroke-dasharray="6,4"/>
  <!-- Roof outline -->
  <rect x="170" y="170" width="1260" height="410" fill="#f8fafc" stroke="#0f172a" stroke-width="3"/>
  <!-- Ridge -->
  <line x1="170" y1="375" x2="1430" y2="375" stroke="#7c2d12" stroke-width="4" stroke-dasharray="14,6"/>
  <text x="1440" y="379" font-size="11" fill="#7c2d12" font-weight="700">RIDGE</text>
  <!-- Sheet rib lines (vertical, run from eave to ridge on each slope) -->
  <line x1="230" y1="176" x2="230" y2="369" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="290" y1="176" x2="290" y2="369" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="350" y1="176" x2="350" y2="369" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="410" y1="176" x2="410" y2="369" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="470" y1="176" x2="470" y2="369" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="530" y1="176" x2="530" y2="369" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="590" y1="176" x2="590" y2="369" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="650" y1="176" x2="650" y2="369" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="710" y1="176" x2="710" y2="369" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="770" y1="176" x2="770" y2="369" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="830" y1="176" x2="830" y2="369" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="890" y1="176" x2="890" y2="369" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="950" y1="176" x2="950" y2="369" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="1010" y1="176" x2="1010" y2="369" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="1070" y1="176" x2="1070" y2="369" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="1130" y1="176" x2="1130" y2="369" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="1190" y1="176" x2="1190" y2="369" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="1250" y1="176" x2="1250" y2="369" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="1310" y1="176" x2="1310" y2="369" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="1370" y1="176" x2="1370" y2="369" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="230" y1="381" x2="230" y2="574" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="290" y1="381" x2="290" y2="574" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="350" y1="381" x2="350" y2="574" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="410" y1="381" x2="410" y2="574" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="470" y1="381" x2="470" y2="574" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="530" y1="381" x2="530" y2="574" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="590" y1="381" x2="590" y2="574" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="650" y1="381" x2="650" y2="574" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="710" y1="381" x2="710" y2="574" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="770" y1="381" x2="770" y2="574" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="830" y1="381" x2="830" y2="574" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="890" y1="381" x2="890" y2="574" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="950" y1="381" x2="950" y2="574" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="1010" y1="381" x2="1010" y2="574" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="1070" y1="381" x2="1070" y2="574" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="1130" y1="381" x2="1130" y2="574" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="1190" y1="381" x2="1190" y2="574" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="1250" y1="381" x2="1250" y2="574" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="1310" y1="381" x2="1310" y2="574" stroke="#2563eb" stroke-width="1.2"/>
  <line x1="1370" y1="381" x2="1370" y2="574" stroke="#2563eb" stroke-width="1.2"/>
  <!-- End lap lines -->
  <line x1="178" y1="280" x2="1422" y2="280" stroke="#ea580c" stroke-width="1.5" stroke-dasharray="7,5"/>
  <text x="1440" y="284" font-size="9" fill="#c2410c">END LAP 200</text>
  <line x1="178" y1="470" x2="1422" y2="470" stroke="#ea580c" stroke-width="1.5" stroke-dasharray="7,5"/>
  <text x="1440" y="474" font-size="9" fill="#c2410c">END LAP 200</text>
  <!-- Fixing / grid points -->
  <g transform="translate(200,200)"><circle r="8" fill="#fff" stroke="#0f172a" stroke-width="2"/><circle r="2.5" fill="#0f172a"/><text x="10" y="-10" font-size="10" fill="#0f172a" font-weight="700">A1</text></g>
  <g transform="translate(600,200)"><circle r="8" fill="#fff" stroke="#0f172a" stroke-width="2"/><circle r="2.5" fill="#0f172a"/><text x="10" y="-10" font-size="10" fill="#0f172a" font-weight="700">B1</text></g>
  <g transform="translate(1000,200)"><circle r="8" fill="#fff" stroke="#0f172a" stroke-width="2"/><circle r="2.5" fill="#0f172a"/><text x="10" y="-10" font-size="10" fill="#0f172a" font-weight="700">C1</text></g>
  <g transform="translate(1400,200)"><circle r="8" fill="#fff" stroke="#0f172a" stroke-width="2"/><circle r="2.5" fill="#0f172a"/><text x="-30" y="-10" font-size="10" fill="#0f172a" font-weight="700">D1</text></g>
  <g transform="translate(200,550)"><circle r="8" fill="#fff" stroke="#0f172a" stroke-width="2"/><circle r="2.5" fill="#0f172a"/><text x="10" y="-10" font-size="10" fill="#0f172a" font-weight="700">A2</text></g>
  <g transform="translate(600,550)"><circle r="8" fill="#fff" stroke="#0f172a" stroke-width="2"/><circle r="2.5" fill="#0f172a"/><text x="10" y="-10" font-size="10" fill="#0f172a" font-weight="700">B2</text></g>
  <g transform="translate(1000,550)"><circle r="8" fill="#fff" stroke="#0f172a" stroke-width="2"/><circle r="2.5" fill="#0f172a"/><text x="10" y="-10" font-size="10" fill="#0f172a" font-weight="700">C2</text></g>
  <g transform="translate(1400,550)"><circle r="8" fill="#fff" stroke="#0f172a" stroke-width="2"/><circle r="2.5" fill="#0f172a"/><text x="-30" y="-10" font-size="10" fill="#0f172a" font-weight="700">D2</text></g>
  <!-- Grid labels -->
  <text x="200" y="105" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">A</text>
  <text x="600" y="105" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">B</text>
  <text x="1000" y="105" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">C</text>
  <text x="1400" y="105" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">D</text>
  <text x="80" y="205" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">1</text>
  <text x="80" y="555" font-size="14" fill="#1a1a2e" text-anchor="middle" font-weight="700">2</text>
  <!-- Note -->
  <text x="800" y="760" font-size="14" fill="#1a1a2e" text-anchor="middle">ROOF SHEETING: 0.5mm PROFILED GI SHEET (TRAPEZOIDAL)</text>
  <text x="800" y="780" font-size="12" fill="#5a6a80" text-anchor="middle">FIXING: SELF-DRILLING SCREWS @ EVERY PURLIN | SIDE LAP: 1.5 CORRUGATION MIN.</text>
  <!-- Title block -->
  <rect x="1200" y="930" width="370" height="55" fill="#1a1a2e"/>
  <text x="1385" y="955" font-size="11" fill="white" text-anchor="middle">DWG NO: STR-RSL-005</text>
  <text x="1385" y="973" font-size="11" fill="white" text-anchor="middle">REV: A | DATE: 2026-08-06</text>
</svg>`;

// ─── Helper ───────────────────────────────────────────────────────────────────

function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

// ─── Fixed IDs for all sample data ────────────────────────────────────────────

const P1 = 'proj-house-001';
const P2 = 'proj-steel-001';

const MS1 = 'ms-house-foundation';
const MS2 = 'ms-house-structure';
const MS3 = 'ms-steel-columns';
const MS4 = 'ms-steel-roof';
const MS5 = 'ms-steel-foundation';
const MS6 = 'ms-steel-beams';

// Precise calibration for every steel-project drawing: normalized (0–1) grid
// positions computed from the exact pixel grid (viewBox 1600×1000, columns
// A–D at x=200/600/1000/1400, rows 1–2 at y=200/550) shared by all five SVGs
// above, so markers land exactly on the drawn column/beam/rafter nodes
// instead of falling back to DrawingCanvas's naive edge-to-edge grid.
const STEEL_GRID_POSITIONS: Record<string, { x: number; y: number }> = {
  A1: { x: 200 / 1600, y: 200 / 1000 }, B1: { x: 600 / 1600, y: 200 / 1000 },
  C1: { x: 1000 / 1600, y: 200 / 1000 }, D1: { x: 1400 / 1600, y: 200 / 1000 },
  A2: { x: 200 / 1600, y: 550 / 1000 }, B2: { x: 600 / 1600, y: 550 / 1000 },
  C2: { x: 1000 / 1600, y: 550 / 1000 }, D2: { x: 1400 / 1600, y: 550 / 1000 },
};

// ─── Sample data definitions (fully typed, fixed IDs) ─────────────────────────

const SAMPLE_PROJECTS: Project[] = [
  {
    id: P1,
    name: 'House Building Project',
    code: 'HBP-2026',
    description: 'Residential 3-bedroom single-storey house with foundation, structure, and finishing works.',
    startDate: '2026-01-15',
    endDate: '2026-12-31',
    status: 'Active',
    managerName: 'Rajesh Kumar',
    archived: 0,
    createdAt: '2026-01-10T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z',
  },
  {
    id: P2,
    name: 'Industrial Steel Structure',
    code: 'STR-2026',
    description: 'Pre-engineered steel building for warehouse use. Columns, beams, and roof rafters.',
    startDate: '2026-03-01',
    endDate: '2026-09-30',
    status: 'Active',
    managerName: 'Priya Menon',
    archived: 0,
    createdAt: '2026-02-20T08:00:00.000Z',
    updatedAt: '2026-07-15T08:00:00.000Z',
  },
];

const SAMPLE_MILESTONES: Milestone[] = [
  {
    id: MS1, projectId: P1, name: 'Foundation Complete',
    description: 'All column footings and strip footings cast and cured.',
    dueDate: '2026-04-30', status: 'Completed',
    createdAt: '2026-01-10T09:00:00.000Z', updatedAt: '2026-05-01T09:00:00.000Z',
  },
  {
    id: MS2, projectId: P1, name: 'Structure Complete',
    description: 'Columns, beams, slabs and roof structure finished.',
    dueDate: '2026-08-31', status: 'Active',
    createdAt: '2026-01-10T09:00:00.000Z', updatedAt: '2026-08-01T09:00:00.000Z',
  },
  {
    id: MS5, projectId: P2, name: 'Foundation Complete',
    description: 'Isolated footing pads and grade beams cast and cured for all column bases.',
    dueDate: '2026-04-15', status: 'Completed',
    createdAt: '2026-02-20T09:00:00.000Z', updatedAt: '2026-04-20T09:00:00.000Z',
  },
  {
    id: MS3, projectId: P2, name: 'Column Erection',
    description: 'All steel columns erected, plumbed and grouted.',
    dueDate: '2026-05-31', status: 'Completed',
    createdAt: '2026-02-20T09:00:00.000Z', updatedAt: '2026-06-01T09:00:00.000Z',
  },
  {
    id: MS6, projectId: P2, name: 'Beam Erection',
    description: 'Primary and secondary beams erected and bolted between all columns.',
    dueDate: '2026-07-15', status: 'Active',
    createdAt: '2026-02-20T09:00:00.000Z', updatedAt: '2026-06-15T09:00:00.000Z',
  },
  {
    id: MS4, projectId: P2, name: 'Roof Completion',
    description: 'Beams, rafters, purlins and roofing sheet installation.',
    dueDate: '2026-09-15', status: 'Active',
    createdAt: '2026-02-20T09:00:00.000Z', updatedAt: '2026-07-15T09:00:00.000Z',
  },
];

const SAMPLE_DRAWING_DEFS: Array<{
  id: string; projectId: string; milestoneId: string | null; name: string;
  svg: string; gridCols: number; gridRows: number; createdAt: string;
  columnPositions?: Record<string, { x: number; y: number }>;
}> = [
  {
    id: 'drw-gf-001', projectId: P1, milestoneId: MS2,
    name: 'Ground Floor Plan', svg: GROUND_FLOOR_SVG,
    gridCols: 4, gridRows: 3, createdAt: '2026-08-09T06:07:29.000Z',
  },
  {
    id: 'drw-fp-001', projectId: P1, milestoneId: MS1,
    name: 'Foundation Plan', svg: FOUNDATION_SVG,
    gridCols: 4, gridRows: 3, createdAt: '2026-08-09T06:07:27.000Z',
  },
  {
    id: 'drw-rp-001', projectId: P1, milestoneId: MS2,
    name: 'Roof Plan', svg: ROOF_SVG,
    gridCols: 4, gridRows: 3, createdAt: '2026-08-09T06:07:32.000Z',
  },
  {
    id: 'drw-el-001', projectId: P1, milestoneId: MS2,
    name: 'Electrical Layout Plan', svg: ELECTRICAL_SVG,
    gridCols: 4, gridRows: 3, createdAt: '2026-08-09T06:07:35.000Z',
  },
  {
    id: 'drw-wl-001', projectId: P1, milestoneId: MS2,
    name: 'Wall Layout Plan', svg: WALL_DRAWING_SVG,
    gridCols: 4, gridRows: 3, createdAt: '2026-08-09T06:07:31.000Z',
  },
  {
    id: 'drw-col-001', projectId: P2, milestoneId: MS3,
    name: 'Steel Column Erection Plan', svg: STEEL_COLUMN_SVG,
    gridCols: 4, gridRows: 2, createdAt: '2026-08-06T08:43:37.000Z',
    columnPositions: STEEL_GRID_POSITIONS,
  },
  {
    id: 'drw-sfd-001', projectId: P2, milestoneId: MS5,
    name: 'Foundation Plan', svg: STEEL_FOUNDATION_SVG,
    gridCols: 4, gridRows: 2, createdAt: '2026-08-09T22:00:00.000Z',
    columnPositions: STEEL_GRID_POSITIONS,
  },
  {
    id: 'drw-sbe-001', projectId: P2, milestoneId: MS6,
    name: 'Steel Beam Erection Plan', svg: STEEL_BEAM_SVG,
    gridCols: 4, gridRows: 2, createdAt: '2026-08-09T22:00:01.000Z',
    columnPositions: STEEL_GRID_POSITIONS,
  },
  {
    id: 'drw-sra-001', projectId: P2, milestoneId: MS4,
    name: 'Steel Rafter / Roof Framing Plan', svg: STEEL_RAFTER_SVG,
    gridCols: 4, gridRows: 2, createdAt: '2026-08-09T22:00:02.000Z',
    columnPositions: STEEL_GRID_POSITIONS,
  },
  {
    id: 'drw-srs-001', projectId: P2, milestoneId: MS4,
    name: 'Roof Sheet Layout Plan', svg: STEEL_ROOF_SHEET_SVG,
    gridCols: 4, gridRows: 2, createdAt: '2026-08-09T22:00:03.000Z',
    columnPositions: STEEL_GRID_POSITIONS,
  },
];

const SAMPLE_TASKS: Task[] = [
  // Ground Floor Plan tasks
  { id: 'task-gf-a1', drawingId: 'drw-gf-001', milestoneId: MS2, elementType: 'column', elementId: 'A1', gridCode: 'A1', name: 'Column A1 Concreting', description: '', category: 'Structural', priority: 'High', assignedTo: 'Suresh P.', startDate: '2026-06-01', dueDate: '2026-09-30', status: 'Completed', progress: 100, createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'task-gf-b1', drawingId: 'drw-gf-001', milestoneId: MS2, elementType: 'column', elementId: 'B1', gridCode: 'B1', name: 'Column B1 Reinforcement', description: '', category: 'Structural', priority: 'High', assignedTo: 'Ramesh K.', startDate: '2026-06-01', dueDate: '2026-09-30', status: 'In Progress', progress: 60, createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'task-gf-c1', drawingId: 'drw-gf-001', milestoneId: MS2, elementType: 'column', elementId: 'C1', gridCode: 'C1', name: 'Column C1 Shuttering', description: '', category: 'Structural', priority: 'Medium', assignedTo: 'Vikram M.', startDate: '2026-06-01', dueDate: '2026-09-30', status: 'Assigned', progress: 20, createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'task-gf-d1', drawingId: 'drw-gf-001', milestoneId: MS2, elementType: 'column', elementId: 'D1', gridCode: 'D1', name: 'Column D1 QA Inspection', description: '', category: 'Structural', priority: 'Critical', assignedTo: 'QA Team', startDate: '2026-06-01', dueDate: '2026-09-30', status: 'Blocked', progress: 0, createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'task-gf-a2', drawingId: 'drw-gf-001', milestoneId: MS2, elementType: 'column', elementId: 'A2', gridCode: 'A2', name: 'Beam A1-B1 Concreting', description: '', category: 'Structural', priority: 'High', assignedTo: 'Suresh P.', startDate: '2026-06-01', dueDate: '2026-09-30', status: 'Completed', progress: 100, createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'task-gf-b2', drawingId: 'drw-gf-001', milestoneId: MS2, elementType: 'column', elementId: 'B2', gridCode: 'B2', name: 'Slab B Zone Finishing', description: '', category: 'Finishing', priority: 'Medium', assignedTo: 'Mohan R.', startDate: '2026-06-01', dueDate: '2026-09-30', status: 'In Progress', progress: 45, createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  // Foundation Plan tasks
  { id: 'task-fp-a1', drawingId: 'drw-fp-001', milestoneId: MS1, elementType: 'column', elementId: 'A1', gridCode: 'A1', name: 'Footing A1 Excavation', description: '', category: 'Civil', priority: 'High', assignedTo: 'Suresh P.', startDate: '2026-06-01', dueDate: '2026-09-30', status: 'Completed', progress: 100, createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'task-fp-b1', drawingId: 'drw-fp-001', milestoneId: MS1, elementType: 'column', elementId: 'B1', gridCode: 'B1', name: 'Footing B1 PCC', description: '', category: 'Civil', priority: 'High', assignedTo: 'Ramesh K.', startDate: '2026-06-01', dueDate: '2026-09-30', status: 'Completed', progress: 100, createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'task-fp-c1', drawingId: 'drw-fp-001', milestoneId: MS1, elementType: 'column', elementId: 'C1', gridCode: 'C1', name: 'Footing C1 Reinforcement', description: '', category: 'Structural', priority: 'Medium', assignedTo: 'Vikram M.', startDate: '2026-06-01', dueDate: '2026-09-30', status: 'Completed', progress: 100, createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'task-fp-d1', drawingId: 'drw-fp-001', milestoneId: MS1, elementType: 'column', elementId: 'D1', gridCode: 'D1', name: 'Footing D1 Concreting', description: '', category: 'Structural', priority: 'Medium', assignedTo: 'Suresh P.', startDate: '2026-06-01', dueDate: '2026-09-30', status: 'Completed', progress: 100, createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  // Electrical Plan tasks
  { id: 'task-el-a1', drawingId: 'drw-el-001', milestoneId: MS2, elementType: 'column', elementId: 'A1', gridCode: 'A1', name: 'Conduit Laying — Living Room', description: '', category: 'Electrical', priority: 'Medium', assignedTo: 'Elec. Team', startDate: '2026-06-01', dueDate: '2026-09-30', status: 'In Progress', progress: 50, createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'task-el-b1', drawingId: 'drw-el-001', milestoneId: MS2, elementType: 'column', elementId: 'B1', gridCode: 'B1', name: 'Wiring — Kitchen Circuit', description: '', category: 'Electrical', priority: 'High', assignedTo: 'Elec. Team', startDate: '2026-06-01', dueDate: '2026-09-30', status: 'Assigned', progress: 0, createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  // Wall Layout Plan tasks
  { id: 'task-wl-a1', drawingId: 'drw-wl-001', milestoneId: MS2, elementType: 'wall', elementId: 'OW-A1-D1', gridCode: 'A1', name: 'Outer Wall A1–D1 Brickwork (Row 1)', description: 'Lay 230mm cavity brick outer wall along grid row 1 from A to D — from DPC level to lintel at +2.7m. Ensure English bond, 10mm mortar joints, and 50mm cavity maintained throughout.', category: 'Structural', priority: 'High', assignedTo: 'Ramesh K.', startDate: '2026-06-15', dueDate: '2026-07-05', status: 'Completed', progress: 100, createdAt: '2026-08-09T06:07:31.000Z', updatedAt: '2026-08-09T06:07:31.000Z' },
  { id: 'task-wl-b1', drawingId: 'drw-wl-001', milestoneId: MS2, elementType: 'wall', elementId: 'OW-A1-A3', gridCode: 'B1', name: 'Left Outer Wall A1–A3 Brickwork (Col A)', description: 'Lay 230mm cavity brick outer wall along grid column A from row 1 to row 3 — plumb and level every 600mm course. Insert wall ties at 450mm vertical spacing in cavity.', category: 'Structural', priority: 'High', assignedTo: 'Mohan R.', startDate: '2026-06-20', dueDate: '2026-07-10', status: 'Completed', progress: 100, createdAt: '2026-08-09T06:07:31.000Z', updatedAt: '2026-08-09T06:07:31.000Z' },
  { id: 'task-wl-c1', drawingId: 'drw-wl-001', milestoneId: MS2, elementType: 'wall', elementId: 'IW-C1-C3', gridCode: 'C1', name: 'Internal Partition Wall C1–C3 Block Work', description: 'Lay 200mm solid concrete block internal partition wall along grid column C from row 1 to row 3. Install door frame at C1–C2 junction (900×2100mm). Verify block coursing aligns with adjacent masonry.', category: 'Structural', priority: 'Medium', assignedTo: 'Vikram M.', startDate: '2026-07-15', dueDate: '2026-08-01', status: 'In Progress', progress: 60, createdAt: '2026-08-09T06:07:31.000Z', updatedAt: '2026-08-09T06:07:31.000Z' },
  { id: 'task-wl-d1', drawingId: 'drw-wl-001', milestoneId: MS2, elementType: 'wall', elementId: 'OW-D1-D3', gridCode: 'D1', name: 'Right Outer Wall D1–D3 QA Inspection', description: 'Full QA inspection of outer wall along grid column D — check plumb (max. 5mm/m), bond pattern correctness, mortar joint consistency, cavity integrity, and wall tie installation. Issue NCR for any defects found before plastering commences.', category: 'Quality', priority: 'Critical', assignedTo: 'QA Team', startDate: '2026-07-20', dueDate: '2026-07-28', status: 'Blocked', progress: 0, createdAt: '2026-08-09T06:07:31.000Z', updatedAt: '2026-08-09T06:07:31.000Z' },
  { id: 'task-wl-a2', drawingId: 'drw-wl-001', milestoneId: MS2, elementType: 'wall', elementId: 'IW-A2-B2', gridCode: 'A2', name: 'Internal Partition A2–B2 Block Laying (Row 2)', description: 'Lay 200mm solid concrete block horizontal partition between grid A and B along row 2 — connecting the Living Room and Bedroom 2 zones. Embed MS bar starter at 600mm c/c into adjacent RC columns before block laying.', category: 'Structural', priority: 'High', assignedTo: 'Suresh P.', startDate: '2026-08-01', dueDate: '2026-08-18', status: 'Delayed', progress: 25, createdAt: '2026-08-09T06:07:31.000Z', updatedAt: '2026-08-09T06:07:31.000Z' },
  { id: 'task-wl-b2', drawingId: 'drw-wl-001', milestoneId: MS2, elementType: 'wall', elementId: 'OW-A3-D3', gridCode: 'B2', name: 'Outer Wall A3–D3 Plastering & Waterproofing (Row 3)', description: 'Apply 15mm cement-sand (1:4) plaster on bottom outer wall (row 3 — A to D). Follow with 2-coat acrylic waterproofing treatment on the external face. Allow 7-day cure between coats. Finish with sponge float texture.', category: 'Finishing', priority: 'Medium', assignedTo: 'Site Team', startDate: '2026-08-20', dueDate: '2026-09-05', status: 'Assigned', progress: 0, createdAt: '2026-08-09T06:07:31.000Z', updatedAt: '2026-08-09T06:07:31.000Z' },
  // Steel Column tasks
  { id: 'task-col-a1', drawingId: 'drw-col-001', milestoneId: MS3, elementType: 'column', elementId: 'A1', gridCode: 'A1', name: 'Column C-A1 Erection', description: '', category: 'Structural', priority: 'High', assignedTo: 'Steel Team', startDate: '2026-06-01', dueDate: '2026-09-30', status: 'Completed', progress: 100, createdAt: '2026-07-15T08:00:00.000Z', updatedAt: '2026-07-15T08:00:00.000Z' },
  { id: 'task-col-b1', drawingId: 'drw-col-001', milestoneId: MS3, elementType: 'column', elementId: 'B1', gridCode: 'B1', name: 'Column C-B1 Plumbing & Grouting', description: '', category: 'Structural', priority: 'High', assignedTo: 'Steel Team', startDate: '2026-06-01', dueDate: '2026-09-30', status: 'Completed', progress: 100, createdAt: '2026-07-15T08:00:00.000Z', updatedAt: '2026-07-15T08:00:00.000Z' },
  { id: 'task-col-c1', drawingId: 'drw-col-001', milestoneId: MS3, elementType: 'column', elementId: 'C1', gridCode: 'C1', name: 'Column C-C1 Erection', description: '', category: 'Structural', priority: 'High', assignedTo: 'Steel Team', startDate: '2026-06-01', dueDate: '2026-09-30', status: 'In Progress', progress: 70, createdAt: '2026-07-15T08:00:00.000Z', updatedAt: '2026-07-15T08:00:00.000Z' },
  { id: 'task-col-d1', drawingId: 'drw-col-001', milestoneId: MS3, elementType: 'column', elementId: 'D1', gridCode: 'D1', name: 'Column C-D1 QA Check', description: '', category: 'Structural', priority: 'Medium', assignedTo: 'QA Team', startDate: '2026-06-01', dueDate: '2026-09-30', status: 'Assigned', progress: 0, createdAt: '2026-07-15T08:00:00.000Z', updatedAt: '2026-07-15T08:00:00.000Z' },
  // Steel Foundation Plan tasks
  { id: 'task-sfd-a1', drawingId: 'drw-sfd-001', milestoneId: MS5, elementType: 'footing', elementId: 'FP-A1', gridCode: 'A1', name: 'Footing FP-A1 Excavation & PCC', description: 'Excavate to founding level, blind with 75mm PCC.', category: 'Civil', priority: 'High', assignedTo: 'Suresh P.', startDate: '2026-03-05', dueDate: '2026-03-15', status: 'Completed', progress: 100, createdAt: '2026-08-09T22:00:00.000Z', updatedAt: '2026-08-09T22:00:00.000Z' },
  { id: 'task-sfd-b1', drawingId: 'drw-sfd-001', milestoneId: MS5, elementType: 'footing', elementId: 'FP-B1', gridCode: 'B1', name: 'Footing FP-B1 Reinforcement', description: 'Fix footing pad reinforcement cage, verify cover blocks.', category: 'Structural', priority: 'High', assignedTo: 'Ramesh K.', startDate: '2026-03-10', dueDate: '2026-03-18', status: 'Completed', progress: 100, createdAt: '2026-08-09T22:00:00.000Z', updatedAt: '2026-08-09T22:00:00.000Z' },
  { id: 'task-sfd-c1', drawingId: 'drw-sfd-001', milestoneId: MS5, elementType: 'footing', elementId: 'FP-C1', gridCode: 'C1', name: 'Footing FP-C1 Concreting', description: 'Pour M25 concrete for isolated pad, vibrate and cure.', category: 'Structural', priority: 'Medium', assignedTo: 'Vikram M.', startDate: '2026-03-15', dueDate: '2026-03-22', status: 'Completed', progress: 100, createdAt: '2026-08-09T22:00:00.000Z', updatedAt: '2026-08-09T22:00:00.000Z' },
  { id: 'task-sfd-d1', drawingId: 'drw-sfd-001', milestoneId: MS5, elementType: 'anchor', elementId: 'HD-D1', gridCode: 'D1', name: 'Anchor Bolt Template Setting — D1', description: 'Position and cast M24 holding-down bolts on template, verify by survey.', category: 'Structural', priority: 'Critical', assignedTo: 'QA Team', startDate: '2026-03-18', dueDate: '2026-03-25', status: 'Completed', progress: 100, createdAt: '2026-08-09T22:00:00.000Z', updatedAt: '2026-08-09T22:00:00.000Z' },
  { id: 'task-sfd-a2', drawingId: 'drw-sfd-001', milestoneId: MS5, elementType: 'grade_beam', elementId: 'GB-A1-A2', gridCode: 'A2', name: 'Grade Beam GB-A1/A2 Casting', description: 'Cast tie/grade beam 300×450mm between A1 and A2.', category: 'Structural', priority: 'Medium', assignedTo: 'Suresh P.', startDate: '2026-03-22', dueDate: '2026-04-01', status: 'Completed', progress: 100, createdAt: '2026-08-09T22:00:00.000Z', updatedAt: '2026-08-09T22:00:00.000Z' },
  { id: 'task-sfd-b2', drawingId: 'drw-sfd-001', milestoneId: MS5, elementType: 'footing', elementId: 'FP-B2', gridCode: 'B2', name: 'Footing FP-B2 Backfill & Compaction', description: 'Controlled backfill in 200mm layers, 95% MDD compaction.', category: 'Civil', priority: 'Low', assignedTo: 'Ramesh K.', startDate: '2026-04-01', dueDate: '2026-04-10', status: 'Completed', progress: 100, createdAt: '2026-08-09T22:00:00.000Z', updatedAt: '2026-08-09T22:00:00.000Z' },
  // Steel Beam Erection Plan tasks
  { id: 'task-sbe-a1', drawingId: 'drw-sbe-001', milestoneId: MS6, elementType: 'beam', elementId: 'PB1-A1-B1', gridCode: 'A1', name: 'Primary Beam PB1 (A1–B1) Erection', description: 'Crane-lift ISMB 300 primary beam, align and tack bolt.', category: 'Structural', priority: 'High', assignedTo: 'Steel Team', startDate: '2026-05-01', dueDate: '2026-05-10', status: 'Completed', progress: 100, createdAt: '2026-08-09T22:00:01.000Z', updatedAt: '2026-08-09T22:00:01.000Z' },
  { id: 'task-sbe-b1', drawingId: 'drw-sbe-001', milestoneId: MS6, elementType: 'beam', elementId: 'PB1-B1-C1', gridCode: 'B1', name: 'Primary Beam PB1 (B1–C1) Erection', description: 'Crane-lift ISMB 300 primary beam, align and tack bolt.', category: 'Structural', priority: 'High', assignedTo: 'Steel Team', startDate: '2026-05-05', dueDate: '2026-05-14', status: 'In Progress', progress: 65, createdAt: '2026-08-09T22:00:01.000Z', updatedAt: '2026-08-09T22:00:01.000Z' },
  { id: 'task-sbe-c1', drawingId: 'drw-sbe-001', milestoneId: MS6, elementType: 'beam', elementId: 'SB-C', gridCode: 'C1', name: 'Secondary Beam SB-C Erection', description: 'Erect ISMB 200 secondary beam between C1 and C2, HSFG bolt.', category: 'Structural', priority: 'Medium', assignedTo: 'Steel Team', startDate: '2026-05-10', dueDate: '2026-05-18', status: 'Assigned', progress: 0, createdAt: '2026-08-09T22:00:01.000Z', updatedAt: '2026-08-09T22:00:01.000Z' },
  { id: 'task-sbe-d1', drawingId: 'drw-sbe-001', milestoneId: MS6, elementType: 'connection', elementId: 'CONN-D1', gridCode: 'D1', name: 'Bolted Connection Torque Check — D1', description: 'Torque-check M20 HSFG bolts at D1 node, record QA sheet.', category: 'Quality', priority: 'High', assignedTo: 'QA Team', startDate: '2026-05-15', dueDate: '2026-05-20', status: 'Assigned', progress: 0, createdAt: '2026-08-09T22:00:01.000Z', updatedAt: '2026-08-09T22:00:01.000Z' },
  // Steel Rafter / Roof Framing Plan tasks
  { id: 'task-sra-a1', drawingId: 'drw-sra-001', milestoneId: MS4, elementType: 'ridge_beam', elementId: 'RB1', gridCode: 'A1', name: 'Ridge Beam RB1 Erection', description: 'Crane-lift ISMB 250 ridge beam A→D, bolt to column apex gussets.', category: 'Structural', priority: 'Critical', assignedTo: 'Steel Team', startDate: '2026-07-01', dueDate: '2026-07-08', status: 'In Progress', progress: 40, createdAt: '2026-08-09T22:00:02.000Z', updatedAt: '2026-08-09T22:00:02.000Z' },
  { id: 'task-sra-b1', drawingId: 'drw-sra-001', milestoneId: MS4, elementType: 'rafter', elementId: 'RF-B', gridCode: 'B1', name: 'Rafter RF-B Installation', description: 'Install ISMC 200 rafter from B1/B2 eaves to ridge, bolt connections.', category: 'Structural', priority: 'High', assignedTo: 'Steel Team', startDate: '2026-07-05', dueDate: '2026-07-12', status: 'Assigned', progress: 0, createdAt: '2026-08-09T22:00:02.000Z', updatedAt: '2026-08-09T22:00:02.000Z' },
  { id: 'task-sra-c1', drawingId: 'drw-sra-001', milestoneId: MS4, elementType: 'purlin', elementId: 'PL-1', gridCode: 'C1', name: 'Purlin PL-1 Row Installation', description: 'Bolt C150×65×20×2.5 purlins at 1200 c/c across all rafters.', category: 'Structural', priority: 'Medium', assignedTo: 'Steel Team', startDate: '2026-07-10', dueDate: '2026-07-18', status: 'Assigned', progress: 0, createdAt: '2026-08-09T22:00:02.000Z', updatedAt: '2026-08-09T22:00:02.000Z' },
  { id: 'task-sra-d1', drawingId: 'drw-sra-001', milestoneId: MS4, elementType: 'bracing', elementId: 'BR-A-B', gridCode: 'D1', name: 'Roof Bracing Installation', description: 'Install diagonal bracing between column bays, tension to remove slack.', category: 'Structural', priority: 'Medium', assignedTo: 'Steel Team', startDate: '2026-07-15', dueDate: '2026-07-22', status: 'Assigned', progress: 0, createdAt: '2026-08-09T22:00:02.000Z', updatedAt: '2026-08-09T22:00:02.000Z' },
  // Roof Sheet Layout Plan tasks
  { id: 'task-srs-a1', drawingId: 'drw-srs-001', milestoneId: MS4, elementType: 'cladding', elementId: 'SHT-A1', gridCode: 'A1', name: 'Roof Sheet Setting Out — A1', description: 'Set out first sheet run from A1 with survey control, check square to ridge.', category: 'Survey', priority: 'Critical', assignedTo: 'Pradeep Nair', startDate: '2026-08-20', dueDate: '2026-08-22', status: 'Assigned', progress: 0, createdAt: '2026-08-09T22:00:03.000Z', updatedAt: '2026-08-09T22:00:03.000Z' },
  { id: 'task-srs-b1', drawingId: 'drw-srs-001', milestoneId: MS4, elementType: 'cladding', elementId: 'SHT-B1', gridCode: 'B1', name: 'Sheet Fixing — B1 Run', description: 'Fix profiled GI sheets with self-drilling screws at every purlin.', category: 'Finishing', priority: 'High', assignedTo: 'Pradeep Nair', startDate: '2026-08-22', dueDate: '2026-08-26', status: 'Assigned', progress: 0, createdAt: '2026-08-09T22:00:03.000Z', updatedAt: '2026-08-09T22:00:03.000Z' },
  { id: 'task-srs-c1', drawingId: 'drw-srs-001', milestoneId: MS4, elementType: 'ridge_cap', elementId: 'RC-C1', gridCode: 'C1', name: 'Ridge Cap Installation — C1', description: 'Install ridge cap flashing with 150mm min. overlap and sealant.', category: 'Finishing', priority: 'Medium', assignedTo: 'Nilesh Kumar', startDate: '2026-08-27', dueDate: '2026-08-30', status: 'Assigned', progress: 0, createdAt: '2026-08-09T22:00:03.000Z', updatedAt: '2026-08-09T22:00:03.000Z' },
  { id: 'task-srs-d1', drawingId: 'drw-srs-001', milestoneId: MS4, elementType: 'cladding', elementId: 'WTT-D1', gridCode: 'D1', name: 'Water Tightness Hose Test — D1', description: 'Hose-test roof sheet laps and ridge zone, issue punch list for leaks.', category: 'Quality', priority: 'Critical', assignedTo: 'QA Team', startDate: '2026-09-01', dueDate: '2026-09-03', status: 'Assigned', progress: 0, createdAt: '2026-08-09T22:00:03.000Z', updatedAt: '2026-08-09T22:00:03.000Z' },
];

const SAMPLE_PROJECT_TASKS: ProjectTask[] = [
  { id: 'pt-house-01', projectId: P1, milestoneId: null, name: 'Procure cement and aggregate', description: '', priority: 'High', status: 'Done', assignee: 'Rajesh Kumar', dueDate: '2026-03-15', estimatedHours: 8, tags: ['procurement'], createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'pt-house-02', projectId: P1, milestoneId: null, name: 'Arrange scaffolding for column work', description: '', priority: 'Medium', status: 'Done', assignee: 'Site Team', dueDate: '2026-05-01', estimatedHours: 16, tags: ['scaffolding'], createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'pt-house-03', projectId: P1, milestoneId: null, name: 'Plumbing rough-in — ground floor', description: '', priority: 'High', status: 'In Progress', assignee: 'Plumbing Team', dueDate: '2026-09-15', estimatedHours: 40, tags: ['plumbing'], createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'pt-house-04', projectId: P1, milestoneId: null, name: 'Electrical conduit layout approval', description: '', priority: 'Medium', status: 'To Do', assignee: 'Elec. Team', dueDate: '2026-09-30', estimatedHours: 8, tags: ['electrical', 'approval'], createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'pt-house-05', projectId: P1, milestoneId: null, name: 'Window and door frame installation', description: '', priority: 'Low', status: 'To Do', assignee: 'Carpenter', dueDate: '2026-10-15', estimatedHours: 32, tags: ['finishing'], createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'pt-steel-01', projectId: P2, milestoneId: null, name: 'Anchor bolt procurement', description: '', priority: 'High', status: 'Done', assignee: 'Priya Menon', dueDate: '2026-04-01', estimatedHours: 4, tags: ['procurement'], createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'pt-steel-02', projectId: P2, milestoneId: null, name: 'Column base plate welding inspection', description: '', priority: 'Critical', status: 'Done', assignee: 'QA Team', dueDate: '2026-05-15', estimatedHours: 16, tags: ['welding', 'QA'], createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'pt-steel-03', projectId: P2, milestoneId: null, name: 'Beam splicing design review', description: '', priority: 'High', status: 'In Progress', assignee: 'Structural Eng.', dueDate: '2026-08-20', estimatedHours: 24, tags: ['design'], createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'pt-steel-04', projectId: P2, milestoneId: null, name: 'Roofing sheet procurement', description: '', priority: 'Medium', status: 'To Do', assignee: 'Procurement', dueDate: '2026-09-01', estimatedHours: 8, tags: ['procurement'], createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
];

const SAMPLE_ACTIVITY: ActivityItem[] = [
  { id: 'act-gf-001', taskId: null, drawingId: 'drw-gf-001', message: 'Ground Floor Plan added', createdAt: '2026-08-09T06:07:29.000Z' },
  { id: 'act-fp-001', taskId: null, drawingId: 'drw-fp-001', message: 'Foundation Plan added', createdAt: '2026-08-09T06:07:27.000Z' },
  { id: 'act-rp-001', taskId: null, drawingId: 'drw-rp-001', message: 'Roof Plan added', createdAt: '2026-08-09T06:07:32.000Z' },
  { id: 'act-el-001', taskId: null, drawingId: 'drw-el-001', message: 'Electrical Layout Plan added', createdAt: '2026-08-09T06:07:35.000Z' },
  { id: 'act-wl-001', taskId: null, drawingId: 'drw-wl-001', message: 'Wall Layout Plan added', createdAt: '2026-08-09T06:07:31.000Z' },
  { id: 'act-col-001', taskId: null, drawingId: 'drw-col-001', message: 'Steel Column Erection Plan added', createdAt: '2026-08-06T08:43:37.000Z' },
  { id: 'act-sfd-001', taskId: null, drawingId: 'drw-sfd-001', message: 'Foundation Plan added', createdAt: '2026-08-09T22:00:00.000Z' },
  { id: 'act-sbe-001', taskId: null, drawingId: 'drw-sbe-001', message: 'Steel Beam Erection Plan added', createdAt: '2026-08-09T22:00:01.000Z' },
  { id: 'act-sra-001', taskId: null, drawingId: 'drw-sra-001', message: 'Steel Rafter / Roof Framing Plan added', createdAt: '2026-08-09T22:00:02.000Z' },
  { id: 'act-srs-001', taskId: null, drawingId: 'drw-srs-001', message: 'Roof Sheet Layout Plan added', createdAt: '2026-08-09T22:00:03.000Z' },
  { id: 'act-proj-001', taskId: null, drawingId: null, message: 'Project "House Building Project" created', createdAt: '2026-01-10T08:00:00.000Z' },
  { id: 'act-proj-002', taskId: null, drawingId: null, message: 'Project "Industrial Steel Structure" created', createdAt: '2026-02-20T08:00:00.000Z' },
];

// ─── Idempotent upsert helper ─────────────────────────────────────────────────

/**
 * Upserts a list of items into the given store ONLY if the record does not
 * already exist. Uses a single readwrite transaction: reads all existing IDs
 * first, then puts only missing ones — no race between get & put.
 */
async function upsertMissing(db: IDBDatabase, storeName: string, items: { id: string }[]): Promise<void> {
  if (items.length === 0) return;
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    // 1. Get all existing keys in one shot
    const keysReq = store.getAllKeys();
    keysReq.onsuccess = () => {
      const existingKeys = new Set(keysReq.result.map(String));
      // 2. Put each item that is not already present
      for (const item of items) {
        if (!existingKeys.has(item.id)) {
          store.put(item);
        }
      }
      // tx.oncomplete will resolve
    };
    keysReq.onerror = () => reject(keysReq.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(new Error(`Transaction aborted on store ${storeName}`));
  });
}

/**
 * Upserts drawing image into IDB images store ONLY if the key doesn't exist.
 * This avoids re-encoding large SVGs on every startup.
 */
async function upsertDrawingImage(idbKey: string, svg: string): Promise<void> {
  try {
    const existing = await loadDrawingFile(idbKey);
    if (!existing) {
      await saveDrawingFile(idbKey, svgToDataUrl(svg));
    }
  } catch (error) {
    console.error(`[BuildTrack/seedData] Error upserting image ${idbKey}:`, error);
    throw error;
  }
}

// ─── Main export: ensureSampleData ───────────────────────────────────────────

/**
 * Ensures all sample project data is present in IndexedDB.
 * Safe to call on every app startup — it uses fixed IDs and only inserts
 * records that are missing. It never overwrites or deletes user data.
 */
export async function ensureSampleData(): Promise<void> {
  console.log('[BuildTrack/seedData] Starting ensureSampleData...');
  try {
    const db = await openBuildTrackDb();
    console.log('[BuildTrack/seedData] DB opened successfully');

    // 1. Upsert projects (only insert if missing)
    console.log('[BuildTrack/seedData] Upserting projects...');
    await upsertMissing(db, 'projects', SAMPLE_PROJECTS);
    console.log(`[BuildTrack/seedData] ✓ ${SAMPLE_PROJECTS.length} projects`);

    // 2. Upsert milestones
    console.log('[BuildTrack/seedData] Upserting milestones...');
    await upsertMissing(db, 'milestones', SAMPLE_MILESTONES);
    console.log(`[BuildTrack/seedData] ✓ ${SAMPLE_MILESTONES.length} milestones`);

    // 3. Upsert drawing images (SVG data URLs) and drawing records
    console.log('[BuildTrack/seedData] Upserting drawings...');
    const drawingRecords: Drawing[] = [];
    for (const def of SAMPLE_DRAWING_DEFS) {
      const idbKey = `drawing-${def.id}`;
      await upsertDrawingImage(idbKey, def.svg);
      drawingRecords.push({
        id: def.id,
        projectId: def.projectId,
        milestoneId: def.milestoneId,
        name: def.name,
        fileUrl: `idb://${idbKey}`,
        fileType: 'image',
        gridCols: def.gridCols,
        gridRows: def.gridRows,
        columnPositions: def.columnPositions ?? {},
        deletedNodes: [],
        manualNodes: [],
        customBeams: [],
        deletedBeams: [],
        columnLabels: {},
        elementTypeLabels: {},
        annotations: [],
        lat: null,
        lng: null,
        createdAt: def.createdAt,
      });
    }
    await upsertMissing(db, 'drawings', drawingRecords);
    console.log(`[BuildTrack/seedData] ✓ ${drawingRecords.length} drawings`);

    // 3b. One-time sortOrder backfill — organise drawings hierarchically by floor.
    const SORT_ORDER_MAP: Record<string, number> = {
      'drw-gf-001': 0,  // Ground Floor Plan — first (floor drawing)
      'drw-wl-001': 1,  // Wall Layout Plan
      'drw-el-001': 2,  // Electrical Layout Plan
      'drw-rp-001': 3,  // Roof Plan
      'drw-fp-001': 4,  // Foundation Plan
      'drw-sfd-001': 0, // Foundation Plan (Steel) — first
      'drw-col-001': 1, // Steel Column Erection Plan
      'drw-sbe-001': 2, // Steel Beam Erection Plan
      'drw-sra-001': 3, // Steel Rafter / Roof Framing Plan
      'drw-srs-001': 4, // Roof Sheet Layout Plan
    };
    for (const [drawingId, order] of Object.entries(SORT_ORDER_MAP)) {
      const existingDrawing = await drawingGet(drawingId);
      if (existingDrawing && (existingDrawing.sortOrder == null || existingDrawing.sortOrder === 9999)) {
        await drawingUpdate(drawingId, { sortOrder: order });
      }
    }
    console.log('[BuildTrack/seedData] ✓ sortOrder backfill complete');

    // 3c. One-time calibration backfill for 'Steel Column Erection Plan'.
    // Early seeds of this drawing shipped with columnPositions: {}, which made
    // DrawingCanvas fall back to a naive edge-to-edge grid that doesn't match
    // this SVG's inset column symbols. Only patch it if it still has that
    // untouched empty default — never overwrite a user's own calibration.
    const existingSteelCol = await drawingGet('drw-col-001');
    if (existingSteelCol && Object.keys(existingSteelCol.columnPositions ?? {}).length === 0) {
      await drawingUpdate('drw-col-001', { columnPositions: STEEL_GRID_POSITIONS });
      console.log('[BuildTrack/seedData] ✓ backfilled calibration for Steel Column Erection Plan');
    }

    // 3d. v6 wall-task quality refresh — force-overwrite the 6 wall tasks with
    // improved descriptions and element IDs. Safe: these are fixed sample IDs.
    const WALL_TASK_IDS = ['task-wl-a1','task-wl-b1','task-wl-c1','task-wl-d1','task-wl-a2','task-wl-b2'];
    const wallTaskMap = new Map(SAMPLE_TASKS.filter(t => WALL_TASK_IDS.includes(t.id)).map(t => [t.id, t]));
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('tasks', 'readwrite');
      const store = tx.objectStore('tasks');
      for (const [, task] of wallTaskMap) {
        store.put(task);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(new Error('Wall task refresh aborted'));
    });
    console.log('[BuildTrack/seedData] ✓ wall task quality refresh complete (v6)');

    // 4. Upsert tasks
    console.log('[BuildTrack/seedData] Upserting tasks...');
    await upsertMissing(db, 'tasks', SAMPLE_TASKS);
    console.log(`[BuildTrack/seedData] ✓ ${SAMPLE_TASKS.length} tasks`);

    // 5. Upsert project tasks
    console.log('[BuildTrack/seedData] Upserting projectTasks...');
    await upsertMissing(db, 'projectTasks', SAMPLE_PROJECT_TASKS);
    console.log(`[BuildTrack/seedData] ✓ ${SAMPLE_PROJECT_TASKS.length} projectTasks`);

    // 6. Upsert activity items
    console.log('[BuildTrack/seedData] Upserting activity...');
    await upsertMissing(db, 'activity', SAMPLE_ACTIVITY);
    console.log(`[BuildTrack/seedData] ✓ ${SAMPLE_ACTIVITY.length} activity items`);

    console.log('[BuildTrack/seedData] ✅ Sample data verified in IndexedDB.');
  } catch (error) {
    console.error('[BuildTrack/seedData] ❌ ERROR in ensureSampleData:', error);
    throw error;
  }
}

// Keep backward compatibility — old seedIfNeeded callers will now use ensureSampleData
export const seedIfNeeded = ensureSampleData;
