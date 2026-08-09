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
    id: MS3, projectId: P2, name: 'Column Erection',
    description: 'All steel columns erected, plumbed and grouted.',
    dueDate: '2026-05-31', status: 'Completed',
    createdAt: '2026-02-20T09:00:00.000Z', updatedAt: '2026-06-01T09:00:00.000Z',
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
    id: 'drw-col-001', projectId: P2, milestoneId: MS3,
    name: 'Steel Column Erection Plan', svg: STEEL_COLUMN_SVG,
    gridCols: 4, gridRows: 2, createdAt: '2026-08-06T08:43:37.000Z',
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
  // Steel Column tasks
  { id: 'task-col-a1', drawingId: 'drw-col-001', milestoneId: MS3, elementType: 'column', elementId: 'A1', gridCode: 'A1', name: 'Column C-A1 Erection', description: '', category: 'Structural', priority: 'High', assignedTo: 'Steel Team', startDate: '2026-06-01', dueDate: '2026-09-30', status: 'Completed', progress: 100, createdAt: '2026-07-15T08:00:00.000Z', updatedAt: '2026-07-15T08:00:00.000Z' },
  { id: 'task-col-b1', drawingId: 'drw-col-001', milestoneId: MS3, elementType: 'column', elementId: 'B1', gridCode: 'B1', name: 'Column C-B1 Plumbing & Grouting', description: '', category: 'Structural', priority: 'High', assignedTo: 'Steel Team', startDate: '2026-06-01', dueDate: '2026-09-30', status: 'Completed', progress: 100, createdAt: '2026-07-15T08:00:00.000Z', updatedAt: '2026-07-15T08:00:00.000Z' },
  { id: 'task-col-c1', drawingId: 'drw-col-001', milestoneId: MS3, elementType: 'column', elementId: 'C1', gridCode: 'C1', name: 'Column C-C1 Erection', description: '', category: 'Structural', priority: 'High', assignedTo: 'Steel Team', startDate: '2026-06-01', dueDate: '2026-09-30', status: 'In Progress', progress: 70, createdAt: '2026-07-15T08:00:00.000Z', updatedAt: '2026-07-15T08:00:00.000Z' },
  { id: 'task-col-d1', drawingId: 'drw-col-001', milestoneId: MS3, elementType: 'column', elementId: 'D1', gridCode: 'D1', name: 'Column C-D1 QA Check', description: '', category: 'Structural', priority: 'Medium', assignedTo: 'QA Team', startDate: '2026-06-01', dueDate: '2026-09-30', status: 'Assigned', progress: 0, createdAt: '2026-07-15T08:00:00.000Z', updatedAt: '2026-07-15T08:00:00.000Z' },
];

const SAMPLE_PROJECT_TASKS: ProjectTask[] = [
  { id: 'pt-house-01', projectId: P1, name: 'Procure cement and aggregate', description: '', priority: 'High', status: 'Done', assignee: 'Rajesh Kumar', dueDate: '2026-03-15', estimatedHours: 8, tags: ['procurement'], createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'pt-house-02', projectId: P1, name: 'Arrange scaffolding for column work', description: '', priority: 'Medium', status: 'Done', assignee: 'Site Team', dueDate: '2026-05-01', estimatedHours: 16, tags: ['scaffolding'], createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'pt-house-03', projectId: P1, name: 'Plumbing rough-in — ground floor', description: '', priority: 'High', status: 'In Progress', assignee: 'Plumbing Team', dueDate: '2026-09-15', estimatedHours: 40, tags: ['plumbing'], createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'pt-house-04', projectId: P1, name: 'Electrical conduit layout approval', description: '', priority: 'Medium', status: 'To Do', assignee: 'Elec. Team', dueDate: '2026-09-30', estimatedHours: 8, tags: ['electrical', 'approval'], createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'pt-house-05', projectId: P1, name: 'Window and door frame installation', description: '', priority: 'Low', status: 'To Do', assignee: 'Carpenter', dueDate: '2026-10-15', estimatedHours: 32, tags: ['finishing'], createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'pt-steel-01', projectId: P2, name: 'Anchor bolt procurement', description: '', priority: 'High', status: 'Done', assignee: 'Priya Menon', dueDate: '2026-04-01', estimatedHours: 4, tags: ['procurement'], createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'pt-steel-02', projectId: P2, name: 'Column base plate welding inspection', description: '', priority: 'Critical', status: 'Done', assignee: 'QA Team', dueDate: '2026-05-15', estimatedHours: 16, tags: ['welding', 'QA'], createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'pt-steel-03', projectId: P2, name: 'Beam splicing design review', description: '', priority: 'High', status: 'In Progress', assignee: 'Structural Eng.', dueDate: '2026-08-20', estimatedHours: 24, tags: ['design'], createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
  { id: 'pt-steel-04', projectId: P2, name: 'Roofing sheet procurement', description: '', priority: 'Medium', status: 'To Do', assignee: 'Procurement', dueDate: '2026-09-01', estimatedHours: 8, tags: ['procurement'], createdAt: '2026-08-01T08:00:00.000Z', updatedAt: '2026-08-01T08:00:00.000Z' },
];

const SAMPLE_ACTIVITY: ActivityItem[] = [
  { id: 'act-gf-001', taskId: null, drawingId: 'drw-gf-001', message: 'Ground Floor Plan added', createdAt: '2026-08-09T06:07:29.000Z' },
  { id: 'act-fp-001', taskId: null, drawingId: 'drw-fp-001', message: 'Foundation Plan added', createdAt: '2026-08-09T06:07:27.000Z' },
  { id: 'act-rp-001', taskId: null, drawingId: 'drw-rp-001', message: 'Roof Plan added', createdAt: '2026-08-09T06:07:32.000Z' },
  { id: 'act-el-001', taskId: null, drawingId: 'drw-el-001', message: 'Electrical Layout Plan added', createdAt: '2026-08-09T06:07:35.000Z' },
  { id: 'act-col-001', taskId: null, drawingId: 'drw-col-001', message: 'Steel Column Erection Plan added', createdAt: '2026-08-06T08:43:37.000Z' },
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
        columnPositions: {},
        columnLabels: {},
        elementTypeLabels: {},
        lat: null,
        lng: null,
        createdAt: def.createdAt,
      });
    }
    await upsertMissing(db, 'drawings', drawingRecords);
    console.log(`[BuildTrack/seedData] ✓ ${drawingRecords.length} drawings`);

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
