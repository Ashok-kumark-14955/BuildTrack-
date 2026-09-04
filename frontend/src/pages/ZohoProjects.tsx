/**
 * Custom Modules Page
 *
 * A self-contained Zoho CRM-style custom module builder.
 * No connection to Zoho Projects — all data stored in the app's own backend.
 *
 * Features:
 *  - List / create / delete module definitions
 *  - Add / edit / delete records in each module
 *  - Configurable fields: text, number, date, select (dropdown), multiuser
 *  - Spreadsheet-style table view matching the Zoho CRM aesthetic
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { v4 as uuidv4 } from 'uuid';
import {
  CustomModulesAPI,
  type CustomField,
  type CustomModule,
  type CustomRecord,
} from '../api';
import { loadImage } from '../utils/imageStorage';
import { useApp } from '../AppContext';

// ─── Utility ────────────────────────────────────────────────────────────────

function cn(...classes: (string | false | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

// ─── Icons (inline SVG to avoid extra deps) ─────────────────────────────────

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─── Types ───────────────────────────────────────────────────────────────────

type FieldType = CustomField['type'];

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  name: 'Name',
  text: 'Text',
  number: 'Number',
  date: 'Date',
  select: 'Select (dropdown)',
  multiuser: 'Multi User',
  attachment: 'Attachment',
};

// Values that represent an "attention" state — get a small pulsing dot in the Status column.
const BADGE_ALERT_VALUES = new Set(['Denied', 'Blocked', 'Rejected', 'Expired', 'Terminated', 'Flagged', 'Delayed']);
// Values that represent an active/positive state — get a solid (non-pulsing) dot.
const BADGE_ACTIVE_VALUES = new Set(['On Site', 'Active', 'Approved', 'Checked In', 'Valid', 'Done', 'Completed']);
// Values that are informational/neutral-but-notable — a calmer amber accent.
const BADGE_CAUTION_VALUES = new Set(['Pending', 'On Leave', 'Review']);
// Values with specific fixed accent colors — checked before the generic sets.
const BADGE_CUSTOM_COLOR: Record<string, string> = {
  'Assigned':    '#3b82f6', // blue
  'In Progress': '#f97316', // orange
  'Delayed':     '#e11d48', // ruby red
};

/** Solid accent color for a status value — used for the row's left rail and the badge glow. */
function statusAccentColor(value: string): string | null {
  if (!value) return null;
  if (BADGE_CUSTOM_COLOR[value]) return BADGE_CUSTOM_COLOR[value];
  if (BADGE_ALERT_VALUES.has(value)) return '#e11d48';
  if (BADGE_ACTIVE_VALUES.has(value)) return '#34d399';
  if (BADGE_CAUTION_VALUES.has(value)) return '#fbbf24';
  return '#64748b'; // neutral (e.g. Exited, Inactive) — still worth a faint marker
}

// ─── Site-entry smart detector ───────────────────────────────────────────────
// Detects if the current module is a "Site Entry" module by checking field labels

function isSiteEntryModule(fields: CustomField[]): boolean {
  const labels = fields.map((f) => f.label.toLowerCase());
  const siteEntryKeywords = ['entry time', 'exit time', 'entry gate', 'work area', 'entry purpose', 'security'];
  return siteEntryKeywords.filter((kw) => labels.some((l) => l.includes(kw))).length >= 2;
}

// Parse a time string like "09:30 AM" or "14:30" into minutes since midnight
function parseTimeToMinutes(val: string): number | null {
  if (!val || typeof val !== 'string') return null;
  const trimmed = val.trim();
  // Handle HH:MM AM/PM
  const ampm = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = parseInt(ampm[2], 10);
    const period = ampm[3].toUpperCase();
    if (period === 'AM' && h === 12) h = 0;
    if (period === 'PM' && h !== 12) h += 12;
    return h * 60 + m;
  }
  // Handle HH:MM
  const hhmm = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmm) {
    return parseInt(hhmm[1], 10) * 60 + parseInt(hhmm[2], 10);
  }
  return null;
}

function formatDuration(entryVal: string, exitVal: string): string | null {
  const start = parseTimeToMinutes(entryVal);
  const end = parseTimeToMinutes(exitVal);
  if (start === null || end === null) return null;
  let diff = end - start;
  if (diff < 0) diff += 24 * 60; // overnight
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}
// Suppress unused warning — kept for potential future display
void formatDuration;

// ─── SelectOptionsEditor ─────────────────────────────────────────────────────

// Preset colour swatches for option chips
const PRESET_COLORS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#10b981', // emerald
  '#ef4444', // red
  '#3b82f6', // blue
  '#a855f7', // purple
  '#14b8a6', // teal
  '#f97316', // orange
  '#ec4899', // pink
  '#84cc16', // lime
  '#06b6d4', // cyan
  '#e11d48', // rose
];

/** Returns a stable default color for an option index */
function defaultOptionColor(idx: number): string {
  return PRESET_COLORS[idx % PRESET_COLORS.length];
}

/** Build a chip style from a hex color */
function chipStyleFromHex(hex: string): { bg: string; text: string; border: string } {
  return {
    bg: `${hex}2e`,
    text: hex,
    border: `${hex}55`,
  };
}

/** Circular initials avatar with a deterministic hue derived from the name — used for Worker cells */
function WorkerCellAvatar({ name }: { name: string }) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const initials = parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash) % 360;
  return (
    <span className="inline-flex items-center gap-2 min-w-0">
      <span
        className="flex-shrink-0 flex items-center justify-center rounded-full"
        style={{
          width: 24, height: 24,
          background: `hsl(${hue},55%,28%)`,
          border: `1.5px solid hsl(${hue},40%,22%)`,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: `hsl(${hue},70%,80%)`, letterSpacing: '-0.02em' }}>
          {initials}
        </span>
      </span>
      <span className="text-sm text-slate-200 font-medium truncate">{name}</span>
    </span>
  );
}

interface SelectOptionsEditorProps {
  options: string[];
  optionColors?: Record<string, string>;
  onChange: (opts: string[], colors: Record<string, string>) => void;
}

function SelectOptionsEditor({ options, optionColors = {}, onChange }: SelectOptionsEditorProps) {
  const [input, setInput] = useState('');
  const [colorPickerFor, setColorPickerFor] = useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  function add() {
    const v = input.trim();
    if (!v || options.includes(v)) return;
    const newColors = { ...optionColors, [v]: defaultOptionColor(options.length) };
    onChange([...options, v], newColors);
    setInput('');
    inputRef.current?.focus();
  }

  function remove(opt: string) {
    const newColors = { ...optionColors };
    delete newColors[opt];
    onChange(options.filter((o) => o !== opt), newColors);
  }

  function setColor(opt: string, color: string) {
    const newColors = { ...optionColors, [opt]: color };
    onChange(options, newColors);
    setColorPickerFor(null);
  }

  return (
    <div className="mt-3 rounded-xl overflow-hidden" style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(220,38,90,0.12)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: options.length > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
        <span className="text-[9px] font-black uppercase tracking-[0.18em] text-rose-400/50">Dropdown Options</span>
        {options.length > 0 && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(220,38,90,0.15)', color: '#fb7185' }}>
            {options.length}
          </span>
        )}
      </div>

      {/* Options list */}
      {options.length > 0 && (
        <div className="flex flex-col gap-1 px-3 py-2.5">
          {options.map((o, i) => {
            const hex = optionColors[o] ?? defaultOptionColor(i);
            const chipStyle = chipStyleFromHex(hex);
            const isPickingColor = colorPickerFor === o;
            return (
              <div key={o} className="flex flex-col gap-1">
                <div className="flex items-center gap-2 group">
                  {/* Color swatch button */}
                  <button
                    type="button"
                    title="Change colour"
                    onClick={() => setColorPickerFor(isPickingColor ? null : o)}
                    className="w-5 h-5 rounded-full flex-shrink-0 border-2 transition-all hover:scale-110"
                    style={{
                      background: hex,
                      borderColor: isPickingColor ? '#fff' : `${hex}88`,
                      boxShadow: isPickingColor ? `0 0 0 2px ${hex}55` : 'none',
                    }}
                  />
                  {/* Chip preview */}
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold flex-1 min-w-0"
                    style={{ background: chipStyle.bg, color: chipStyle.text, border: `1px solid ${chipStyle.border}` }}
                  >
                    <span className="truncate">{o}</span>
                  </span>
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => remove(o)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-red-400 flex-shrink-0 text-base leading-none"
                  >
                    ×
                  </button>
                </div>

                {/* Inline colour picker */}
                {isPickingColor && (
                  <div
                    className="ml-7 p-2.5 rounded-xl flex flex-col gap-2"
                    style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <span className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">Pick a colour</span>
                    {/* Preset swatches */}
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          title={c}
                          onClick={() => setColor(o, c)}
                          className="w-5 h-5 rounded-full border-2 transition-all hover:scale-110 flex-shrink-0"
                          style={{
                            background: c,
                            borderColor: hex === c ? '#fff' : 'transparent',
                            boxShadow: hex === c ? `0 0 0 2px ${c}55` : 'none',
                          }}
                        />
                      ))}
                    </div>
                    {/* Custom hex input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={hex}
                        onChange={(e) => setColor(o, e.target.value)}
                        className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
                        title="Custom colour"
                      />
                      <input
                        type="text"
                        value={hex}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setColor(o, v);
                        }}
                        className="flex-1 bg-transparent text-white text-[11px] font-mono focus:outline-none border-b border-slate-700 pb-0.5"
                        placeholder="#000000"
                        maxLength={7}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add option input */}
      <div className="flex gap-0 px-3 py-2.5" style={{ borderTop: options.length > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder="Type an option and press Enter…"
          className="flex-1 bg-transparent text-white text-xs focus:outline-none placeholder-slate-600"
          style={{ padding: '4px 0' }}
        />
        <button
          type="button"
          onClick={add}
          disabled={!input.trim()}
          className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-semibold transition-all disabled:opacity-30"
          style={{ background: 'rgba(220,38,90,0.2)', color: '#fb7185', border: '1px solid rgba(220,38,90,0.3)' }}
          onMouseEnter={(e) => { if (input.trim()) e.currentTarget.style.background = 'rgba(220,38,90,0.35)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(220,38,90,0.2)'; }}
        >
          + Add
        </button>
      </div>
    </div>
  );
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ value, showDot = false }: { value: string; showDot?: boolean }) {
  if (!value) return <span className="text-slate-500 text-sm italic">—</span>;
  const accentColor = statusAccentColor(value);
  const isAlert = BADGE_ALERT_VALUES.has(value);
  const isActive = BADGE_ACTIVE_VALUES.has(value);
  const isCaution = BADGE_CAUTION_VALUES.has(value);
  // Dot color: custom map first, then semantic sets, then neutral
  const dotColor = BADGE_CUSTOM_COLOR[value] ?? (isAlert ? '#e11d48' : isActive ? '#34d399' : isCaution ? '#fbbf24' : '#64748b');

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
      style={{
        background: accentColor ? `${accentColor}18` : 'rgba(100,116,139,0.15)',
        color: accentColor ?? '#94a3b8',
        border: `1px solid ${accentColor ? `${accentColor}30` : 'rgba(100,116,139,0.2)'}`,
      }}>
      {showDot && (
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isAlert ? 'animate-pulse' : ''}`}
          style={{ background: dotColor }} />
      )}
      {value}
    </span>
  );
}

// ─── StyledCheckbox ───────────────────────────────────────────────────────────

function StyledCheckbox({ checked, onChange, indeterminate = false }: { checked: boolean; onChange: () => void; indeterminate?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <label className="inline-flex items-center cursor-pointer">
      <input ref={ref} type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span
        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-all duration-150"
        style={{
          background: checked || indeterminate ? 'rgba(220,38,90,0.85)' : 'transparent',
          border: checked || indeterminate ? '1.5px solid rgba(220,38,90,0.9)' : '1.5px solid rgba(100,116,139,0.5)',
          boxShadow: checked || indeterminate ? '0 0 6px rgba(220,38,90,0.4)' : 'none',
        }}
      >
        {indeterminate && !checked ? (
          <svg width="8" height="2" viewBox="0 0 8 2" fill="none"><line x1="0" y1="1" x2="8" y2="1" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
        ) : checked ? (
          <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><polyline points="1,3.5 3.5,6 8,1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        ) : null}
      </span>
    </label>
  );
}

// ─── NewModuleModal (alias to CreateModuleModal) ──────────────────────────────

function NewModuleModal(props: CreateModuleModalProps) {
  return <CreateModuleModal {...props} />;
}

// ─── Create Module Modal ──────────────────────────────────────────────────────

interface CreateModuleModalProps {
  projectId: string;
  onClose: () => void;
  onCreated: (m: CustomModule) => void;
}

function CreateModuleModal({ projectId, onClose, onCreated }: CreateModuleModalProps) {
  const [name, setName] = useState('');
  const [fields, setFields] = useState<CustomField[]>([{ id: uuidv4(), label: 'Title', type: 'text' }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function addField() {
    setFields((f) => [...f, { id: uuidv4(), label: '', type: 'text' }]);
  }

  function updateField(idx: number, patch: Partial<CustomField>) {
    setFields((f) => f.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  }

  function removeField(idx: number) {
    setFields((f) => f.filter((_, i) => i !== idx));
  }

  async function handleCreate() {
    if (!name.trim()) { setError('Module name is required'); return; }
    setSaving(true);
    try {
      const created = await CustomModulesAPI.create(projectId, name.trim(), fields);
      onCreated(created);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'Failed to create module');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#120000] border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-white font-semibold text-lg">New Custom Module</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><XIcon /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          {/* Module name */}
          <div>
            <label className="block text-slate-400 text-xs mb-1 font-medium uppercase tracking-wide">Module Name</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Vendors, Inspections, Materials…"
              className="w-full bg-[#151827] border border-slate-600 rounded-lg px-3 py-2 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-700"
            />
          </div>

          {/* Fields */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-slate-400 text-xs font-medium uppercase tracking-wide">Fields</label>
              <button onClick={addField} className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors">
                <PlusIcon /> Add field
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {fields.map((field, idx) => (
                <div key={field.id} className="flex flex-col gap-1.5">
                  <div className="flex gap-2 items-center">
                    <input
                      value={field.label}
                      onChange={(e) => updateField(idx, { label: e.target.value })}
                      placeholder="Field label"
                      className="flex-1 bg-[#151827] border border-slate-600 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-700"
                    />
                    <select
                      value={field.type}
                      onChange={(e) => updateField(idx, { type: e.target.value as FieldType, options: e.target.value === 'select' ? (field.options ?? []) : undefined })}
                      className="bg-[#151827] border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-rose-700"
                    >
                      {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
                        <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeField(idx)}
                      disabled={fields.length <= 1}
                      className="p-1.5 text-slate-500 hover:text-red-400 disabled:opacity-30 transition-colors"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                  {field.type === 'select' && (
                    <SelectOptionsEditor
                      options={field.options ?? []}
                      optionColors={field.optionColors ?? {}}
                      onChange={(opts, colors) => updateField(idx, { options: opts, optionColors: colors })}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-700">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white transition-colors">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-rose-800 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
          >
            {saving ? 'Creating…' : 'Create Module'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Module Modal (rename + edit fields) ────────────────────────────────

interface EditModuleModalProps {
  projectId: string;
  module: CustomModule;
  onClose: () => void;
  onSaved: (m: CustomModule) => void;
}

function EditModuleModal({ projectId, module, onClose, onSaved }: EditModuleModalProps) {
  const [name, setName] = useState(module.name);
  const [fields, setFields] = useState<CustomField[]>(
    module.fields.length > 0 ? module.fields : [{ id: uuidv4(), label: 'Title', type: 'text' }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'fields'>('info');
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function reorderFields(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    setFields((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function addField() {
    setFields((f) => [...f, { id: uuidv4(), label: '', type: 'text' }]);
  }

  function updateField(idx: number, patch: Partial<CustomField>) {
    setFields((f) => f.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  }

  function removeField(idx: number) {
    if (fields.length <= 1) return;
    setFields((f) => f.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!name.trim()) { setError('Module name is required'); return; }
    setSaving(true);
    setError('');
    try {
      const updated = await CustomModulesAPI.update(projectId, module.id, {
        name: name.trim(),
        fields,
      });
      onSaved(updated);
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.error || e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}>
      <div
        className="w-full max-w-lg flex flex-col max-h-[90vh] rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #1a0006 0%, #0f0003 60%, #0b0002 100%)',
          border: '1px solid rgba(220,38,90,0.3)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(220,38,90,0.08), inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{
            background: 'linear-gradient(180deg, rgba(220,38,90,0.12) 0%, rgba(0,0,0,0) 100%)',
            borderBottom: '1px solid rgba(220,38,90,0.2)',
          }}
        >
          <div className="flex items-center gap-3">
            {/* Icon badge */}
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: 'linear-gradient(145deg, rgba(220,38,90,0.3) 0%, rgba(120,10,30,0.5) 100%)',
                border: '1px solid rgba(220,38,90,0.35)',
                boxShadow: '0 0 12px rgba(220,38,90,0.2)',
              }}
            >
              <EditIcon />
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-none">Edit Module</h2>
              <p className="text-rose-400/60 text-[10px] mt-0.5 font-medium tracking-wide">{module.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white transition-all duration-150"
            style={{ border: '1px solid rgba(100,30,50,0.4)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(220,38,90,0.15)'; e.currentTarget.style.borderColor = 'rgba(220,38,90,0.4)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(100,30,50,0.4)'; }}
          >
            <XIcon />
          </button>
        </div>

        {/* ── Tabs ── */}
        <div
          className="flex flex-shrink-0 px-6 gap-0"
          style={{ borderBottom: '1px solid rgba(220,38,90,0.15)' }}
        >
          {(['info', 'fields'] as const).map((tab) => {
            const isActive = activeTab === tab;
            const label = tab === 'info' ? 'Module Info' : 'Fields';
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="relative px-4 py-3 text-sm font-semibold transition-all duration-150 flex items-center gap-2"
                style={{ color: isActive ? '#fda4af' : 'rgba(148,163,184,0.7)' }}
              >
                {label}
                {tab === 'fields' && (
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={isActive
                      ? { background: 'rgba(220,38,90,0.25)', color: '#fb7185', border: '1px solid rgba(220,38,90,0.3)' }
                      : { background: 'rgba(255,255,255,0.06)', color: '#64748b' }
                    }
                  >
                    {fields.length}
                  </span>
                )}
                {/* Active underline */}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-2 right-2 h-[2px] rounded-t-full"
                    style={{ background: 'linear-gradient(90deg, transparent, #fb7185 30%, #e11d48 70%, transparent)', boxShadow: '0 0 6px rgba(251,113,133,0.5)' }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {activeTab === 'info' && (
            <div className="space-y-5">
              {/* Name field */}
              <div>
                <label className="block text-[10px] font-black text-rose-400/70 mb-2 uppercase tracking-[0.18em]">Module Name</label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder="Module name"
                  className="w-full rounded-xl px-4 py-3 text-white placeholder-slate-600 text-sm focus:outline-none transition-all"
                  style={{
                    background: 'rgba(220,38,90,0.05)',
                    border: '1px solid rgba(220,38,90,0.25)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(220,38,90,0.6)'; e.currentTarget.style.background = 'rgba(220,38,90,0.08)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(220,38,90,0.1)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(220,38,90,0.25)'; e.currentTarget.style.background = 'rgba(220,38,90,0.05)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Meta info grid */}
              <div
                className="rounded-xl p-4 grid grid-cols-2 gap-3"
                style={{ background: 'rgba(220,38,90,0.06)', border: '1px solid rgba(220,38,90,0.15)' }}
              >
                {[
                  { label: 'Module ID', value: module.id },
                  { label: 'Total Fields', value: `${fields.length} fields` },
                  { label: 'Created', value: new Date(Number(module.createdAt)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                  { label: 'Field Types', value: [...new Set(fields.map(f => f.type))].join(', ') || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-black uppercase tracking-[0.16em] text-rose-400/50">{label}</span>
                    <span className="text-xs text-slate-300 truncate font-medium">{value}</span>
                  </div>
                ))}
              </div>

              {/* Field type summary pills */}
              <div>
                <p className="text-[10px] font-black text-rose-400/50 uppercase tracking-[0.16em] mb-2">Field Composition</p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(
                    fields.reduce<Record<string, number>>((acc, f) => { acc[f.type] = (acc[f.type] ?? 0) + 1; return acc; }, {})
                  ).map(([type, count]) => (
                    <span
                      key={type}
                      className={cn('inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold', TYPE_PILL_COLOR[type as FieldType] ?? 'bg-slate-700/50 text-slate-400')}
                      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <FieldTypeIcon type={type as FieldType} />
                      {count} {FIELD_TYPE_LABELS[type as FieldType] ?? type}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fields' && (
            <div className="space-y-2">
              {/* Fields list header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-400/60">
                    {fields.length} {fields.length === 1 ? 'Field' : 'Fields'} Defined
                  </span>
                  <span className="text-[9px] text-slate-600">· drag to reorder</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(
                    fields.reduce<Record<string, number>>((acc, f) => { acc[f.type] = (acc[f.type] ?? 0) + 1; return acc; }, {})
                  ).map(([type, count]) => (
                    <span
                      key={type}
                      className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold', TYPE_PILL_COLOR[type as FieldType] ?? 'bg-slate-700/50 text-slate-400')}
                    >
                      <FieldTypeIcon type={type as FieldType} />
                      {count}
                    </span>
                  ))}
                </div>
              </div>

              {fields.map((field, idx) => {
                const accentColor = (() => {
                  switch (field.type) {
                    case 'name':       return '#34d399';
                    case 'text':       return '#94a3b8';
                    case 'number':     return '#60a5fa';
                    case 'date':       return '#a78bfa';
                    case 'select':     return '#fbbf24';
                    case 'multiuser':  return '#22d3ee';
                    case 'attachment': return '#fb7185';
                    default:           return '#64748b';
                  }
                })();
                const isDragging = dragOverIndex === idx;
                return (
                  <div
                    key={field.id}
                    draggable
                    onDragStart={() => { dragIndexRef.current = idx; }}
                    onDragOver={(e) => { e.preventDefault(); setDragOverIndex(idx); }}
                    onDragLeave={() => setDragOverIndex(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragIndexRef.current !== null) {
                        reorderFields(dragIndexRef.current, idx);
                        dragIndexRef.current = null;
                      }
                      setDragOverIndex(null);
                    }}
                    onDragEnd={() => { dragIndexRef.current = null; setDragOverIndex(null); }}
                    className="rounded-xl transition-all duration-150 overflow-hidden"
                    style={isDragging
                      ? { background: 'rgba(220,38,90,0.1)', border: '1px solid rgba(220,38,90,0.5)', boxShadow: '0 0 0 2px rgba(220,38,90,0.15)' }
                      : { background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)' }
                    }
                  >
                    {/* Coloured top rail indicating field type */}
                    <div className="h-[2px] w-full" style={{ background: `linear-gradient(90deg, ${accentColor}60, ${accentColor}20)` }} />

                    <div className="px-3 py-2.5">
                      {/* Row 1: drag handle + type icon + label input + type selector + delete */}
                      <div className="flex gap-2 items-center">
                        {/* Drag handle */}
                        <div
                          className="flex flex-col gap-[3px] cursor-grab active:cursor-grabbing flex-shrink-0 transition-colors"
                          style={{ color: isDragging ? accentColor : 'rgba(100,116,139,0.5)' }}
                          title="Drag to reorder"
                        >
                          <div className="w-3.5 h-0.5 bg-current rounded-full" />
                          <div className="w-3.5 h-0.5 bg-current rounded-full" />
                          <div className="w-3.5 h-0.5 bg-current rounded-full" />
                        </div>

                        {/* Type icon badge */}
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                          style={{
                            background: `${accentColor}18`,
                            border: `1px solid ${accentColor}35`,
                            color: accentColor,
                          }}
                          title={FIELD_TYPE_LABELS[field.type]}
                        >
                          <FieldTypeIcon type={field.type} />
                        </div>

                        {/* Field label input */}
                        <input
                          value={field.label}
                          onChange={(e) => updateField(idx, { label: e.target.value })}
                          placeholder="Field label…"
                          className="flex-1 rounded-lg px-3 py-1.5 text-white placeholder-slate-600 text-sm font-medium focus:outline-none transition-all"
                          style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(100,30,50,0.35)' }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = `${accentColor}70`;
                            e.currentTarget.style.boxShadow = `0 0 0 2px ${accentColor}15`;
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(100,30,50,0.35)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        />

                        {/* Type selector — styled pill */}
                        <div
                          className="relative flex-shrink-0"
                          style={{ minWidth: '8rem' }}
                        >
                          <select
                            value={field.type}
                            onChange={(e) => {
                              const newType = e.target.value as FieldType;
                              updateField(idx, {
                                type: newType,
                                options: newType === 'select' ? (field.options ?? []) : undefined,
                              });
                            }}
                            className="w-full appearance-none rounded-lg pl-2.5 pr-7 py-1.5 text-xs font-semibold focus:outline-none transition-all cursor-pointer"
                            style={{
                              background: `${accentColor}18`,
                              border: `1px solid ${accentColor}35`,
                              color: accentColor,
                            }}
                          >
                            {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
                              <option key={t} value={t} style={{ background: '#1a0006', color: '#e2e8f0' }}>
                                {FIELD_TYPE_LABELS[t]}
                              </option>
                            ))}
                          </select>
                          {/* Dropdown chevron */}
                          <svg
                            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
                            width="10" height="10" viewBox="0 0 24 24" fill="none"
                            stroke={accentColor} strokeWidth="2.5" strokeLinecap="round"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={() => removeField(idx)}
                          disabled={fields.length <= 1}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-600 hover:text-red-400 disabled:opacity-20 transition-all flex-shrink-0"
                          style={{ border: '1px solid transparent' }}
                          onMouseEnter={(e) => { if (fields.length > 1) { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; } }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
                          title="Remove field"
                        >
                          <TrashIcon />
                        </button>
                      </div>

                      {/* Row 2: index indicator + optional notes */}
                      <div className="flex items-center gap-2 mt-1.5 pl-[4.5rem]">
                        <span className="text-[9px] font-black" style={{ color: `${accentColor}60` }}>
                          f{idx + 1}
                        </span>
                        <span className="text-[9px] text-slate-700">
                          {field.type === 'select' && field.options && field.options.length > 0
                            ? `${field.options.length} option${field.options.length !== 1 ? 's' : ''}`
                            : field.type === 'select'
                            ? 'No options yet'
                            : FIELD_TYPE_LABELS[field.type]
                          }
                        </span>
                      </div>

                      {/* Select options editor */}
                      {field.type === 'select' && (
                        <div className="mt-2 pl-9">
                          <SelectOptionsEditor
                            options={field.options ?? []}
                            optionColors={field.optionColors ?? {}}
                            onChange={(opts, colors) => updateField(idx, { options: opts, optionColors: colors })}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Add Field button */}
              <button
                onClick={addField}
                className="flex items-center justify-center gap-2 text-xs font-semibold w-full mt-2 px-3 py-3 rounded-xl transition-all duration-150"
                style={{ color: '#fb7185', border: '1px dashed rgba(220,38,90,0.25)', background: 'rgba(220,38,90,0.03)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(220,38,90,0.08)'; e.currentTarget.style.borderColor = 'rgba(220,38,90,0.45)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(220,38,90,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(220,38,90,0.03)'; e.currentTarget.style.borderColor = 'rgba(220,38,90,0.25)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                Add new field
              </button>
            </div>
          )}

        </div>

        {error && (
          <div className="px-6 py-2 flex-shrink-0">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* ── Footer ── */}
        <div
          className="flex justify-between items-center px-6 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(220,38,90,0.15)', background: 'rgba(0,0,0,0.2)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
            style={{ border: '1px solid rgba(100,50,70,0.3)' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(150,80,100,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(100,50,70,0.3)'; e.currentTarget.style.background = 'transparent'; }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg text-white text-sm font-semibold transition-all duration-150 disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)',
              border: '1px solid rgba(220,38,90,0.5)',
              boxShadow: '0 0 16px rgba(220,38,90,0.2)',
            }}
            onMouseEnter={(e) => { if (!saving) { e.currentTarget.style.background = 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)'; e.currentTarget.style.boxShadow = '0 0 20px rgba(220,38,90,0.35)'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #be123c 0%, #9f1239 100%)'; e.currentTarget.style.boxShadow = '0 0 16px rgba(220,38,90,0.2)'; }}
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Field Settings Modal (edit module fields only — kept for compat) ─────────

interface FieldSettingsModalProps {
  projectId: string;
  module: CustomModule;
  onClose: () => void;
  onSaved: (m: CustomModule) => void;
}

function FieldSettingsModal({ projectId, module, onClose, onSaved }: FieldSettingsModalProps) {
  // Delegate to EditModuleModal opened on the fields tab. `projectId` must be
  // the real BuildTrack project id — passing an empty string here overwrites
  // the module's buildTrackProjectId server-side (see CustomModulesAPI.update
  // → PUT /:id), which silently drops it out of its project's module list on
  // the very next fetch even though nothing was actually deleted.
  return <EditModuleModal projectId={projectId} module={module} onClose={onClose} onSaved={onSaved} />;
}

// ─── Inline cell editor ───────────────────────────────────────────────────────

interface CellEditorProps {
  field: CustomField;
  value: any;
  onCommit: (value: any) => void;
  onCancel: () => void;
  projectId?: string;
  moduleId?: string;
  recordId?: string;
}

function CellEditor({ field, value, onCommit, onCancel, projectId = '', moduleId = '', recordId = '' }: CellEditorProps) {
  const [draft, setDraft] = useState<any>(value ?? '');
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  useEffect(() => { (inputRef.current as any)?.focus(); }, []);

  function commit() { onCommit(draft); }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commit();
    if (e.key === 'Escape') onCancel();
  }

  if (field.type === 'select') {
    return (
      <select
        ref={inputRef as any}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className="w-full bg-[#120000] border border-rose-700 rounded px-2 py-1 text-white text-sm focus:outline-none"
      >
        <option value="">— select —</option>
        {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  if (field.type === 'attachment') {
    return (
      <input
        ref={inputRef as any}
        type="file"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (file) {
            try {
              // Upload directly to Catalyst Stratus via backend
              const result = await CustomModulesAPI.uploadAttachment(projectId, moduleId, recordId, file);
              onCommit({ name: result.name, url: result.url });
            } catch (err) {
              console.error('[CellEditor] Attachment upload failed:', err);
              onCancel();
            }
          } else {
            onCancel();
          }
        }}
        onKeyDown={handleKeyDown}
        className="w-full bg-[#120000] border border-rose-700 rounded px-2 py-1 text-white text-sm focus:outline-none file:mr-2 file:text-xs file:bg-rose-800 file:text-white file:border-0 file:rounded file:px-2 file:py-0.5"
      />
    );
  }

  return (
    <input
      ref={inputRef as any}
      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      className="w-full bg-[#120000] border border-rose-700 rounded px-2 py-1 text-white text-sm focus:outline-none"
    />
  );
}

// ─── Attachment cell — resolves idb:// URLs asynchronously ───────────────────

function AttachmentCell({ val }: { val: any }) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!val?.url) return;
    if (val.url.startsWith('idb://')) {
      const key = val.url.slice('idb://'.length);
      loadImage(key).then(setResolvedUrl);
    } else {
      setResolvedUrl(val.url);
    }
  }, [val?.url]);

  if (!val?.name) return <span className="text-slate-500 text-sm">—</span>;

  const displayUrl = resolvedUrl ?? '';
  const isImage = val.type?.startsWith('image/');

  return (
    <a
      href={displayUrl || undefined}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 text-rose-400 hover:text-rose-300 text-sm underline underline-offset-2"
    >
      {isImage && displayUrl ? (
        <img src={displayUrl} alt={val.name} className="w-6 h-6 object-cover rounded" />
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
        </svg>
      )}
      <span className="max-w-[120px] truncate">{val.name}</span>
    </a>
  );
}

// ─── Record row props (shared interface) ─────────────────────────────────────

interface RecordRowProps {
  record: CustomRecord;
  fields: CustomField[];
  rowIndex: number;
  onUpdate: (data: Record<string, any>) => void;
  onDelete: () => void;
}


// ─── New Entry Slide-in Drawer ────────────────────────────────────────────────
// Renders exactly the fields defined on the module (same set shown in Fields
// settings and the sheet view) — no separate Title/Description/Status inputs.

interface NewEntryDrawerProps {
  projectId: string;
  module: CustomModule;
  onClose: () => void;
  onAdd: (data: Record<string, any>) => void;
  onAddMore: (data: Record<string, any>) => void;
  initialData?: Record<string, any>;
  onDelete?: () => void;
}

function NewEntryDrawer({ projectId, module, onClose, onAdd, onAddMore, initialData, onDelete }: NewEntryDrawerProps) {
  // draft is keyed by each field's own id
  const [draft, setDraft] = useState<Record<string, any>>(initialData ?? {});
  const [saving, setSaving] = useState(false);

  // Skip multi-user fields — not editable from this drawer yet
  const extraFields = module.fields.filter((f) => f.type !== 'multiuser');

  function setValue(fieldId: string, value: any) {
    setDraft((d) => ({ ...d, [fieldId]: value }));
  }

  // Build the data payload — one entry per module field, keyed by field id
  function buildPayload() {
    const payload: Record<string, any> = {};
    extraFields.forEach((f) => {
      const val = draft[f.id] ?? '';
      if (val && typeof val === 'object' && '_preview' in val) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { _preview, ...rest } = val as any;
        payload[f.id] = rest;
      } else {
        payload[f.id] = val;
      }
    });
    return payload;
  }

  // Require the module's first field to be filled, so a record always has an identifying value.
  const primaryField = extraFields[0];
  const titleIsEmpty = primaryField ? !String(draft[primaryField.id] ?? '').trim() : false;

  async function handleAdd() {
    setSaving(true);
    try {
      await onAdd(buildPayload());
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMore() {
    setSaving(true);
    try {
      await onAddMore(buildPayload());
      setDraft({});
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Slide-in panel */}
      <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-xl bg-[#0f0000] border-l border-slate-700 shadow-2xl flex flex-col animate-slide-in-right">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-white font-semibold text-lg">{initialData ? 'Edit' : 'New'} {module.name}</h2>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
              <XIcon />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── Fields from the module definition — same set shown in Fields settings and the sheet view ── */}
          {extraFields.map((field, i) => (
            <div key={field.id}>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">
                {field.label}
                {i === 0 && <span className="text-rose-500"> *</span>}
              </label>
              {field.type === 'select' ? (
                <select
                  value={draft[field.id] ?? ''}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  className="w-full bg-[#0b0000] border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-rose-600"
                >
                  <option value="">— select —</option>
                  {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : field.type === 'attachment' ? (
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-3 px-4 py-3 bg-[#0b0000] border border-dashed border-slate-600 rounded-lg cursor-pointer hover:border-rose-600 transition-colors group">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 group-hover:text-rose-400 flex-shrink-0">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.34a2 2 0 0 1-2.83-2.83l8.49-8.49"/>
                    </svg>
                    <span className="text-slate-400 text-sm group-hover:text-slate-300 transition-colors">
                      {draft[field.id]?.name ? draft[field.id].name : 'Click to attach a file'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        // Read a local data URL just for in-drawer preview
                        const previewUrl = await new Promise<string>((resolve) => {
                          const reader = new FileReader();
                          reader.onload = () => resolve(reader.result as string);
                          reader.readAsDataURL(file);
                        });
                        // Show the file name immediately with local preview
                        setValue(field.id, { name: file.name, url: previewUrl, type: file.type, size: file.size, _preview: previewUrl, _uploading: true });
                        try {
                        // Upload to Catalyst Stratus via backend
                          const result = await CustomModulesAPI.uploadAttachment(projectId, module.id, '', file);
                           // Replace with the real Stratus URL
                           setValue(field.id, { name: result.name, url: result.url, _preview: previewUrl });
                        } catch (err) {
                          console.error('[NewEntryDrawer] Attachment upload failed:', err);
                          setValue(field.id, null);
                        }
                      }}
                    />
                  </label>
                  {draft[field.id]?.name && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg">
                      {draft[field.id].type?.startsWith('image/') ? (
                        <img src={draft[field.id]._preview ?? draft[field.id].url} alt={draft[field.id].name} className="w-8 h-8 object-cover rounded" />
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-400 flex-shrink-0">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                        </svg>
                      )}
                      <span className="text-slate-300 text-sm truncate flex-1">{draft[field.id].name}</span>
                      <button
                        type="button"
                        onClick={() => setValue(field.id, null)}
                        className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0"
                      >
                        <XIcon />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                  value={draft[field.id] ?? ''}
                  onChange={(e) => setValue(field.id, e.target.value)}
                  className="w-full bg-[#0b0000] border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-600"
                />
              )}
            </div>
          ))}

        </div>

        {/* ── Footer ── */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-700 bg-[#0e0000]">
          <button
            onClick={handleAdd}
            disabled={saving || titleIsEmpty}
            className="px-5 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {saving ? 'Saving…' : initialData ? 'Save' : 'Add'}
          </button>
          {!initialData && (
            <button
              onClick={handleAddMore}
              disabled={saving || titleIsEmpty}
              className="px-5 py-2 rounded-lg border border-rose-700 hover:bg-rose-900/30 disabled:opacity-50 text-rose-300 text-sm font-medium transition-colors"
            >
              Add More
            </button>
          )}
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white text-sm font-medium transition-colors"
          >
            Cancel
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="ml-auto px-5 py-2 rounded-lg border border-red-800 hover:bg-red-900/30 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Add-Record inline row (kept for fallback / keyboard shortcut) ─────────────

interface AddRecordRowProps {
  fields: CustomField[];
  moduleName: string;
  onOpenDrawer: () => void;
}

function AddRecordRow({ fields, moduleName, onOpenDrawer }: AddRecordRowProps) {
  return (
    <tr>
      {/* +3: checkbox col + row number col + action col */}
      <td colSpan={fields.length + 3} className="px-4 py-2">
        <button
          onClick={onOpenDrawer}
          className="flex items-center gap-2 text-slate-500 hover:text-rose-400 text-sm transition-colors"
        >
          <PlusIcon /> Add {moduleName}
        </button>
      </td>
    </tr>
  );
}

// ─── Auto-fit column width helpers ───────────────────────────────────────────

/** Default min-width per field type (in px) */
const FIELD_DEFAULT_WIDTH: Record<FieldType, number> = {
  name:        320,
  text:        180,
  number:      100,
  date:        120,
  select:      140,
  multiuser:   280,
  attachment:  160,
};

/** Compute a sensible default width for a field */
function defaultColWidth(field: CustomField): number {
  const base = FIELD_DEFAULT_WIDTH[field.type] ?? 160;
  const labelBonus = Math.max(0, field.label.length - 10) * 5;

  // Select fields render as pills that must never wrap — size the column to
  // fit the longest option text (plus the pill's own padding/dot), not just
  // the label, or long option values like "Main Gate – Gate 01" wrap onto a
  // second line inside the pill.
  if (field.type === 'select' && field.options?.length) {
    const longestOption = Math.max(...field.options.map((o) => o.length));
    const optionWidth = longestOption * 7.2 + 48; // ~char width at text-xs + pill padding/dot
    return Math.min(Math.max(base + labelBonus, optionWidth), 320);
  }

  return Math.min(base + labelBonus, 400);
}

// ─── Column-resize hook ───────────────────────────────────────────────────────

function useResizableColumns(fields: CustomField[], moduleId: string) {
  const storageKey = `colWidths_${moduleId}`;

  // Load previously saved manual widths from localStorage
  const savedWidths = React.useMemo<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    fields.forEach((f) => {
      // Use saved manual width if available, otherwise compute default
      init[f.id] = savedWidths[f.id] ?? defaultColWidth(f);
    });
    return init;
  });

  // Track which columns were manually resized — auto-fit will skip these
  const manuallyResized = useRef<Set<string>>(new Set(Object.keys(savedWidths)));

  // Sync when fields change (new fields added / removed)
  useEffect(() => {
    setColWidths((prev) => {
      const next = { ...prev };
      fields.forEach((f) => {
        if (!(f.id in next)) next[f.id] = savedWidths[f.id] ?? defaultColWidth(f);
      });
      return next;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  const dragging = useRef<{ fieldId: string; startX: number; startW: number } | null>(null);

  function onResizeStart(e: React.MouseEvent, fieldId: string) {
    e.preventDefault();
    e.stopPropagation();
    dragging.current = {
      fieldId,
      startX: e.clientX,
      startW: colWidths[fieldId] ?? defaultColWidth(fields.find((f) => f.id === fieldId)!),
    };

    function onMouseMove(ev: MouseEvent) {
      if (!dragging.current) return;
      const delta = ev.clientX - dragging.current.startX;
      const newW = Math.max(60, dragging.current.startW + delta);
      setColWidths((prev) => ({ ...prev, [dragging.current!.fieldId]: newW }));
    }
    function onMouseUp() {
      if (dragging.current) {
        const { fieldId: fId } = dragging.current;
        // Mark as manually resized so auto-fit won't override it
        manuallyResized.current.add(fId);
        // Persist all current widths + this new one to localStorage
        setColWidths((prev) => {
          const updated = { ...prev };
          try {
            // Merge with existing saved widths so we only overwrite what changed
            const existing = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Record<string, number>;
            const merged = { ...existing, ...updated };
            localStorage.setItem(storageKey, JSON.stringify(merged));
          } catch {
            // ignore storage errors
          }
          return updated;
        });
      }
      dragging.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function resetWidth(fieldId: string) {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    // Remove from manual set so auto-fit can take over again
    manuallyResized.current.delete(fieldId);
    const defaultW = defaultColWidth(field);
    setColWidths((prev) => {
      const updated = { ...prev, [fieldId]: defaultW };
      try {
        const existing = JSON.parse(localStorage.getItem(storageKey) ?? '{}') as Record<string, number>;
        delete existing[fieldId];
        localStorage.setItem(storageKey, JSON.stringify(existing));
      } catch { /* ignore */ }
      return updated;
    });
  }

  function resetAllWidths() {
    manuallyResized.current.clear();
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    const next: Record<string, number> = {};
    fields.forEach((f) => { next[f.id] = defaultColWidth(f); });
    setColWidths(next);
  }

  function fitToContent(fieldId: string, records: CustomRecord[]) {
    // Skip columns the user has manually resized — honour their preference
    if (manuallyResized.current.has(fieldId)) return;
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    // Estimate content width based on max value length
    const maxLen = records.reduce((max, r) => {
      const val = r.data[fieldId];
      const len = val ? String(typeof val === 'object' ? val.name ?? '' : val).length : 0;
      return Math.max(max, len);
    }, field.label.length);
    // ~8px per char + padding (no max cap — columns expand to fit all content)
    const estimated = Math.max(80, maxLen * 8 + 32);
    setColWidths((prev) => ({ ...prev, [fieldId]: estimated }));
  }

  return { colWidths, onResizeStart, resetWidth, resetAllWidths, fitToContent };
}

// ─── Column header cell with resize handle + context menu ────────────────────

interface ResizableThProps {
  field: CustomField;
  width: number;
  onResizeStart: (e: React.MouseEvent) => void;
  onFitToContent: () => void;
  onResetWidth: () => void;
}

/** Maps field type → a small inline SVG icon element */
function FieldTypeIcon({ type }: { type: FieldType }) {
  const cls = 'flex-shrink-0';
  switch (type) {
    case 'name':
      return (
        <svg className={cls} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
      );
    case 'text':
      return (
        <svg className={cls} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
        </svg>
      );
    case 'number':
      return (
        <svg className={cls} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/>
          <line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>
        </svg>
      );
    case 'date':
      return (
        <svg className={cls} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
      );
    case 'select':
      return (
        <svg className={cls} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 5v14M5 12l7 7 7-7"/>
        </svg>
      );
    case 'multiuser':
      return (
        <svg className={cls} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      );
    case 'attachment':
      return (
        <svg className={cls} width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66L9.64 16.34a2 2 0 0 1-2.83-2.83l8.49-8.49"/>
        </svg>
      );
    default:
      return <span className="text-[10px] font-mono leading-none">T</span>;
  }
}

/** Background tint per field type for the type-icon pill */
const TYPE_PILL_COLOR: Record<FieldType, string> = {
  name:       'bg-emerald-800/50 text-emerald-300',
  text:       'bg-slate-600/60 text-slate-300',
  number:     'bg-blue-800/50 text-blue-300',
  date:       'bg-violet-800/50 text-violet-300',
  select:     'bg-amber-800/50 text-amber-300',
  multiuser:  'bg-cyan-800/50 text-cyan-300',
  attachment: 'bg-rose-800/50 text-rose-300',
};

/** Solid accent color per field type — used for the icon chip ring and the persistent column-identity underline. */
const TYPE_ACCENT_COLOR: Record<FieldType, string> = {
  name:       '#34d399',
  text:       '#64748b',
  number:     '#60a5fa',
  date:       '#a78bfa',
  select:     '#fbbf24',
  multiuser:  '#22d3ee',
  attachment: '#fb7185',
};

// ─── Sortable + Resizable column header ──────────────────────────────────────

interface SortableResizableThProps extends ResizableThProps {
  sortDir: 'asc' | 'desc' | null;
  onSort: () => void;
  sticky?: boolean;
  stickyLeft?: number;
}

function SortableResizableTh({ field, width, onResizeStart, onFitToContent, onResetWidth, sortDir, onSort, sticky, stickyLeft = 0 }: SortableResizableThProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    }
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const accentColor = TYPE_ACCENT_COLOR[field.type] ?? '#64748b';

  return (
    <th
      style={{
        width, minWidth: width, maxWidth: width,
        background: '#1e1e2e',
        ...(sticky ? {
          position: 'sticky',
          left: stickyLeft,
          zIndex: 5,
          boxShadow: '2px 0 8px rgba(0,0,0,0.5)',
        } : {}),
      }}
      className="relative px-0 py-0 text-left select-none group/th"
    >
      {/* Top accent line — persistent type-color identity; sort/menu feedback overrides it */}
      <div className="absolute top-0 left-0 right-0 h-[2px] z-20 transition-all duration-200"
        style={{ background: showMenu || sortDir ? '#fb7185' : `${accentColor}4d` }}
      />
      <div className="absolute inset-0 opacity-0 group-hover/th:opacity-100 transition-opacity duration-150 pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.05)' }}
      />

      {/* Header content — click label to sort */}
      <div
        className="relative flex items-center justify-center gap-2 px-3 py-2.5 overflow-hidden cursor-pointer"
        onClick={onSort}
      >
        <span className="text-[12.5px] font-semibold text-zinc-300 group-hover/th:text-white transition-colors duration-150 tracking-wide text-center">
          {field.label}
        </span>

      </div>

      {/* Right divider */}
      <div className="absolute top-[20%] right-0 bottom-[20%] w-px pointer-events-none"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      />

      {/* Context menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 z-50 mt-1 w-52 rounded-lg shadow-2xl overflow-hidden"
          style={{
            background: '#242426',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          <div className="px-3 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
            <p className="text-[11px] font-semibold text-zinc-300 truncate">{field.label}</p>
          </div>
          <div className="py-1">
            <button
              className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2.5"
              onMouseDown={(e) => { e.preventDefault(); onSort(); setShowMenu(false); }}
            >
              <span className="w-4 h-4 flex items-center justify-center text-zinc-500 flex-shrink-0 text-sm">↑↓</span>
              Sort {sortDir === 'asc' ? 'Descending' : 'Ascending'}
            </button>
            <button
              className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2.5"
              onMouseDown={(e) => { e.preventDefault(); onFitToContent(); setShowMenu(false); }}
            >
              <span className="w-4 h-4 flex items-center justify-center text-zinc-500 flex-shrink-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
              </span>
              Fit to Content
            </button>
            <button
              className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2.5"
              onMouseDown={(e) => { e.preventDefault(); onResetWidth(); setShowMenu(false); }}
            >
              <span className="w-4 h-4 flex items-center justify-center text-zinc-500 flex-shrink-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18M3 6h18M3 18h18"/>
                </svg>
              </span>
              Reset Width
            </button>
            <div className="mx-3 my-1 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
            <div className="px-3 py-1.5 flex items-center gap-2">
              <span className={cn('w-4 h-4 inline-flex items-center justify-center rounded flex-shrink-0', TYPE_PILL_COLOR[field.type] ?? 'bg-slate-600/60 text-slate-300')}>
                <FieldTypeIcon type={field.type} />
              </span>
              <span className="text-[10px] text-zinc-500 capitalize">{field.type} field</span>
            </div>
          </div>
        </div>
      )}

      {/* Drag resize handle */}
      <div
        onMouseDown={onResizeStart}
        className="absolute top-0 right-0 bottom-0 w-[3px] cursor-col-resize hover:!bg-rose-400 transition-colors duration-100 z-10"
        style={{ background: 'transparent' }}
        title="Drag to resize"
      />
    </th>
  );
}

// ─── Selectable Record Row ────────────────────────────────────────────────────

interface SelectableRecordRowProps extends RecordRowProps {
  selected: boolean;
  onToggleSelect: () => void;
  /** Site Entry: click row to open detail panel */
  onRowClick?: () => void;
}

function SelectableRecordRow({ record, fields, rowIndex, selected, onToggleSelect, onUpdate, onDelete, onRowClick }: SelectableRecordRowProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [data, setData] = useState<Record<string, any>>(record.data);

  function commitCell(fieldId: string, value: any) {
    const newData = { ...data, [fieldId]: value };
    setData(newData);
    onUpdate(newData);
    setEditingCell(null);
  }

  function renderCellValue(field: CustomField) {
    const val = data[field.id] ?? '';
    if (field.type === 'select') {
      if (!val) return <span className="text-slate-500 text-sm italic">—</span>;
      // Use custom option color if set, otherwise fall back to the same default
      // palette color SelectOptionsEditor previews for this option (by index) —
      // only options that aren't in the field's known option list drop to the
      // generic semantic StatusBadge below.
      const customHex = field.optionColors?.[val];
      const optionIdx = (field.options ?? []).indexOf(val);
      const hex = customHex ?? (optionIdx >= 0 ? defaultOptionColor(optionIdx) : null);
      if (hex) {
        const isStatusField = field.label.toLowerCase().includes('status');
        const cs = chipStyleFromHex(hex);
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              background: cs.bg,
              color: cs.text,
              border: `1px solid ${cs.border}`,
            }}
          >
            {isStatusField && (
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: hex }} />
            )}
            {val}
          </span>
        );
      }
      // Fallback: semantic StatusBadge for fields without custom colors
      const isStatusField = field.label.toLowerCase().includes('status');
      return <StatusBadge value={val} showDot={isStatusField} />;
    }
    if (field.type === 'multiuser') {
      return val
        ? <span className="text-slate-300 text-sm">{val}</span>
        : <span className="text-slate-500">—</span>;
    }
    if (field.type === 'attachment') return <AttachmentCell val={val} />;
    if (field.label.toLowerCase() === 'worker' && val) {
      return <WorkerCellAvatar name={String(val)} />;
    }
    const isNameField = /name/i.test(field.label);
    if (isNameField && val) {
      const nameStr = String(val);
      const initials = nameStr.split(/\s+/).filter(Boolean).map((w) => w[0].toUpperCase()).join('').slice(0, 3);
      return (
        <span className="inline-flex items-center gap-1.5 min-w-0">
          <span
            className="text-[10px] font-black tracking-wider flex-shrink-0 px-1 py-0.5 rounded"
            style={{ color: '#fb7185', background: 'rgba(220,38,90,0.12)', border: '1px solid rgba(220,38,90,0.2)', fontFamily: 'monospace' }}
          >{initials}</span>
          <span className="text-sm text-slate-200 truncate">{nameStr}</span>
        </span>
      );
    }
    return <span className={cn('text-sm', val ? 'text-slate-200 font-medium' : 'text-slate-600 italic')}>{val || '—'}</span>;
  }

  const isEven = rowIndex % 2 === 0;
  const rowBg = selected
    ? 'rgba(251,113,133,0.12)'
    : isEven
      ? '#111113'
      : '#161618';

  // Persistent left rail colored by this row's Status field, so state reads
  // at a glance without needing to scroll to the Status column or hover.
  const statusField = fields.find((f) => f.type === 'select' && f.label.toLowerCase().includes('status'));
  const statusValue = statusField ? (data[statusField.id] ?? '') : '';
  const railColor = !selected ? statusAccentColor(statusValue) : null;
  const restBoxShadow = railColor ? `inset 3px 0 0 ${railColor}` : 'none';

  return (
    <tr
      className="group transition-all duration-150"
      style={{
        background: rowBg,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        boxShadow: restBoxShadow,
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.045)';
        }
        (e.currentTarget as HTMLElement).style.boxShadow =
          `inset 3px 0 0 ${railColor ?? 'rgba(255,255,255,0.15)'}`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = rowBg;
        (e.currentTarget as HTMLElement).style.boxShadow = restBoxShadow;
      }}
    >
      {/* Checkbox — sticky col 1 */}
      <td
        className="px-0 py-0 w-9 text-center select-none"
        style={{
          borderRight: '1px solid rgba(255,255,255,0.06)',
          position: 'sticky', left: 0, zIndex: 2,
          background: selected ? 'rgba(251,113,133,0.12)' : isEven ? '#111113' : '#161618',
        }}
        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
      >
        <span className="flex items-center justify-center py-3">
          <StyledCheckbox checked={selected} onChange={onToggleSelect} />
        </span>
      </td>

      {/* Row number — sticky col 2 */}
      <td
        className="px-0 py-0 w-10 text-center select-none tabular-nums"
        style={{
          borderRight: '1px solid rgba(255,255,255,0.06)',
          position: 'sticky', left: 36, zIndex: 2,
          background: selected ? 'rgba(251,113,133,0.12)' : isEven ? '#111113' : '#161618',
        }}
      >
        <span
          className="flex items-center justify-center h-full py-3 text-[10px] font-mono font-medium"
          style={{ color: '#6b6b70' }}
        >
          {String(rowIndex + 1).padStart(2, '0')}
        </span>
      </td>

      {fields.map((field, fIdx) => (
        <td
          key={field.id}
          className="group/cell px-0 py-0 cursor-pointer relative overflow-hidden"
          style={{
            borderRight: fIdx < fields.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
            ...(fIdx === 0 ? { position: 'sticky', left: 36 + 40, zIndex: 2, background: selected ? 'rgba(251,113,133,0.12)' : isEven ? '#111113' : '#161618' } : {}),
          }}
          onClick={() => setEditingCell(field.id)}
        >
          {editingCell === field.id && (
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'rgba(251,113,133,0.08)', boxShadow: 'inset 0 0 0 2px rgba(251,113,133,0.5)' }}
            />
          )}
          <div className="relative px-3 py-3 pr-6">
            {editingCell === field.id ? (
              <CellEditor
                field={field}
                value={data[field.id] ?? ''}
                onCommit={(v) => commitCell(field.id, v)}
                onCancel={() => setEditingCell(null)}
              />
            ) : renderCellValue(field)}
            {editingCell !== field.id && (
              <svg
                className="absolute top-1/2 right-2 -translate-y-1/2 opacity-0 group-hover/cell:opacity-50 transition-opacity duration-150 pointer-events-none"
                width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            )}
          </div>
        </td>
      ))}

      {/* View detail (site entry) + Delete */}
      <td className="px-2 py-0 w-8" style={{ borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex flex-col items-center gap-1 py-2">
        {onRowClick && (
          <button
            onClick={(e) => { e.stopPropagation(); onRowClick(); }}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all duration-150"
            style={{ color: 'rgba(96,165,250,0.6)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#93c5fd'; e.currentTarget.style.background = 'rgba(59,130,246,0.15)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(96,165,250,0.6)'; e.currentTarget.style.background = 'transparent'; }}
            title="View details"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all duration-150"
          style={{ color: 'rgba(161,161,170,0.7)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fca5a5'; e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(161,161,170,0.7)'; e.currentTarget.style.background = 'transparent'; }}
          title="Delete record"
        >
          <TrashIcon />
        </button>
        </div>
      </td>
    </tr>
  );
}

// ─── Module Table view ────────────────────────────────────────────────────────

interface ModuleTableProps {
  projectId: string;
  module: CustomModule;
  onModuleUpdated: (m: CustomModule) => void;
  onModuleDeleted: (id: string) => void;
  /** Callback to report record count up to parent (for tab badges) */
  onRecordCountChange?: (count: number) => void;
}

function ModuleTable({ projectId, module, onModuleUpdated, onModuleDeleted, onRecordCountChange }: ModuleTableProps) {
  const [records, setRecords] = useState<CustomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showEntryDrawer, setShowEntryDrawer] = useState(false);
  // "More" dropdown is rendered via a portal (see MoreMenuPortal below) so it can
  // escape the module toolbar's `overflow-hidden` pill container — without this,
  // the toolbar's rounded-pill clipping silently hides the whole dropdown.
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const [moreMenuPos, setMoreMenuPos] = useState<{ top: number; right: number } | null>(null);
  function openMoreMenu() {
    const rect = moreButtonRef.current?.getBoundingClientRect();
    if (rect) setMoreMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    setShowMoreMenu(true);
  }

  function MoreMenuPortal() {
    if (!showMoreMenu || !moreMenuPos) return null;
    return createPortal(
      <>
        {/* Backdrop to close on outside click */}
        <div className="fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)} />
        <div
          className="fixed z-50 w-48 rounded-xl overflow-hidden shadow-2xl"
          style={{
            top: moreMenuPos.top,
            right: moreMenuPos.right,
            background: '#1e1e20',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 12px 40px rgba(0,0,0,0.7)',
          }}
        >
          <div className="px-3 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)' }}>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Module Options</p>
          </div>
          <div className="py-1">
            <button onClick={() => { setShowMoreMenu(false); setShowEditModal(true); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.25)' }}><EditIcon /></span>
              <div className="text-left"><p className="font-semibold leading-none text-slate-200">Edit Module</p><p className="text-[10px] text-slate-500 mt-0.5">Rename &amp; manage fields</p></div>
            </button>
            <button onClick={() => { setShowMoreMenu(false); setShowSettings(true); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-colors">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(20,184,166,0.15)', border: '1px solid rgba(20,184,166,0.25)' }}><SettingsIcon /></span>
              <div className="text-left"><p className="font-semibold leading-none text-slate-200">Field Settings</p><p className="text-[10px] text-slate-500 mt-0.5">Configure field types</p></div>
            </button>
            <div className="mx-3 my-1" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }} />
            <button onClick={() => { setShowMoreMenu(false); setConfirmDelete(true); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/15 transition-colors">
              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}><TrashIcon /></span>
              <div className="text-left"><p className="font-semibold leading-none">Delete Module</p><p className="text-[10px] text-red-500/70 mt-0.5">Permanently remove all data</p></div>
            </button>
          </div>
        </div>
      </>,
      document.body
    );
  }

  // ── Search & Sort ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  type SortDir = 'asc' | 'desc';
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // ── Bulk Select ────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  // ── Site Entry enhanced features ──────────────────────────
  const isSiteEntry = isSiteEntryModule(module.fields);

  // ── Column ordering: always put Worker field first after SL No ──────────────
  // For modules that have a "Worker" field (Safety Induction, Safety Training,
  // Site Entry, etc.) we pin the Worker column immediately after the row-number
  // column so it's always visible first without losing any other columns.
  const orderedFields = React.useMemo(() => {
    const workerIdx = module.fields.findIndex(
      (f) => f.label.toLowerCase() === 'worker'
    );
    if (workerIdx <= 0) return module.fields; // already first or not present
    const reordered = [...module.fields];
    const [workerField] = reordered.splice(workerIdx, 1);
    reordered.unshift(workerField);
    return reordered;
  }, [module.fields]);

  // Any module with a Status select field gets the ring-stats widget, not just Site Entry.
  const moduleStatusField = module.fields.find((f) => f.type === 'select' && f.label.toLowerCase().includes('status'));
  const [activeFilter, setActiveFilter] = useState<{ fieldId: string; value: string } | null>(null);
  const [detailRecord, setDetailRecord] = useState<{ record: CustomRecord; idx: number } | null>(null);

  const { colWidths, onResizeStart, resetWidth, resetAllWidths: _resetAllWidths, fitToContent } =
    useResizableColumns(module.fields, module.id);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await CustomModulesAPI.listRecords(projectId, module.id);
      setRecords(data);
      onRecordCountChange?.(data.length);
    } finally {
      setLoading(false);
    }
  }, [module.id]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  // Auto-fit all column widths to content whenever records change so that
  // every column is always as wide as its longest value (or its header label,
  // whichever is wider — fitToContent already handles the label fallback).
  useEffect(() => {
    if (records.length === 0) return;
    module.fields.forEach((f) => fitToContent(f.id, records));
  }, [records]); // eslint-disable-line react-hooks/exhaustive-deps

  // Report count whenever records change
  useEffect(() => { onRecordCountChange?.(records.length); }, [records.length]);

  // ── Keyboard shortcut: N → open drawer, / → focus search, Escape → clear search ──
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement)?.isContentEditable;
      if (e.key === 'n' && !isInput && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowEntryDrawer(true);
      }
      if (e.key === '/' && !isInput) {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
      }
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchQuery]);

  async function handleAddRecord(data: Record<string, any>) {
    const created = await CustomModulesAPI.createRecord(projectId, module.id, data);
    setRecords((r) => [...r, created]);
  }

  async function handleUpdateRecord(record: CustomRecord, data: Record<string, any>) {
    const updated = await CustomModulesAPI.updateRecord(projectId, module.id, record.id, data);
    setRecords((r) => r.map((x) => (x.id === record.id ? updated : x)));
  }

  async function handleDeleteRecord(record: CustomRecord) {
    await CustomModulesAPI.deleteRecord(projectId, module.id, record.id);
    setRecords((r) => r.filter((x) => x.id !== record.id));
    setSelectedIds((s) => { const n = new Set(s); n.delete(record.id); return n; });
  }

  async function handleDeleteModule() {
    await CustomModulesAPI.remove(projectId, module.id);
    onModuleDeleted(module.id);
  }

  async function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => {
      const rec = records.find((r) => r.id === id);
      if (rec) return CustomModulesAPI.deleteRecord(projectId, module.id, id);
    }));
    setRecords((r) => r.filter((x) => !selectedIds.has(x.id)));
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
  }

  // ── Column sort toggle ────────────────────────────────────
  function handleSortClick(fieldId: string) {
    if (sortCol === fieldId) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(fieldId);
      setSortDir('asc');
    }
  }

  // ── Export CSV ────────────────────────────────────────────
  function exportCSV() {
    const headers = module.fields.map((f) => f.label);
    const rows = filteredSortedRecords.map((rec) =>
      module.fields.map((f) => {
        const val = rec.data[f.id] ?? '';
        if (typeof val === 'object') return val?.name ?? JSON.stringify(val);
        return String(val);
      })
    );
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${module.name.replace(/\s+/g, '_')}_export.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Filtered + sorted records ─────────────────────────────
  const filteredSortedRecords = useMemo(() => {
    let result = records;
    // Active filter chip (Site Entry)
    if (activeFilter) {
      result = result.filter((rec) => rec.data[activeFilter.fieldId] === activeFilter.value);
    }
    // Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((rec) =>
        module.fields.some((f) => {
          const val = rec.data[f.id];
          if (!val) return false;
          const str = typeof val === 'object' ? (val?.name ?? JSON.stringify(val)) : String(val);
          return str.toLowerCase().includes(q);
        })
      );
    }
    // Sort
    if (sortCol) {
      result = [...result].sort((a, b) => {
        const aVal = a.data[sortCol] ?? '';
        const bVal = b.data[sortCol] ?? '';
        const aStr = typeof aVal === 'object' ? (aVal?.name ?? '') : String(aVal);
        const bStr = typeof bVal === 'object' ? (bVal?.name ?? '') : String(bVal);
        const cmp = aStr.localeCompare(bStr, undefined, { numeric: true, sensitivity: 'base' });
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [records, activeFilter, searchQuery, sortCol, sortDir, module.fields]);

  // Total table width for colgroup (extra 36px for checkbox column)
  const totalWidth = useMemo(() => {
    return 36 + 40 + module.fields.reduce((sum, f) => sum + (colWidths[f.id] ?? defaultColWidth(f)), 0) + 40;
  }, [colWidths, module.fields]);

  const allSelected = filteredSortedRecords.length > 0 && filteredSortedRecords.every((r) => selectedIds.has(r.id));
  const someSelected = selectedIds.size > 0;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSortedRecords.map((r) => r.id)));
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  return (
    <>
      {/* Module header — sticky sub-bar, visually part of the top nav */}
      <div
        className="flex items-center sticky top-0 z-20 px-6 py-0.5 gap-3 flex-wrap"
        style={{
          background: 'linear-gradient(180deg, #110204 0%, #0d0101 100%)',
          borderBottom: '1px solid rgba(220,38,90,0.15)',
          boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
          marginLeft: '-48px',
          marginRight: '-48px',
          marginBottom: '6px',
        }}
      >
        {/* Bulk delete — floats outside the pill so it's always visible */}
        {someSelected && (
          <button
            onClick={() => setConfirmBulkDelete(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-400 hover:text-white hover:bg-red-900/30 text-xs transition-colors shrink-0"
            style={{ border: '1px solid rgba(220,38,90,0.3)' }}
          >
            <TrashIcon /> Delete {selectedIds.size}
          </button>
        )}
        {/* ── Status ring stats — any module with a Status field gets this ── */}
        {/* Also wraps Search / New Entry / CSV / More inside the same pill ── */}
        {!loading && (() => {
          // When there's no status field (or no records), render a minimal pill
          // that still houses the toolbar actions.
          if (!moduleStatusField || records.length === 0) {
            return (
              <div
                className="flex items-center gap-0 overflow-hidden flex-1"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '9999px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              >
                {/* Module name badge */}
                <div
                  className="flex items-center px-3 py-1.5"
                  style={{ background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <span className="font-black text-[11px] uppercase tracking-[0.1em]" style={{ color: 'rgba(226,232,240,0.85)' }}>
                    {module.name}
                  </span>
                </div>
                {/* Search */}
                <div className="flex items-center px-2 py-1" style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="relative">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: searchQuery ? 'rgba(251,113,133,0.8)' : 'rgba(148,163,184,0.45)' }}
                      width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input ref={searchRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search…"
                      className="text-[11.5px] text-white placeholder-slate-600 focus:outline-none transition-all duration-200"
                      style={{ paddingLeft: '26px', paddingRight: searchQuery ? '24px' : '8px', paddingTop: '4px', paddingBottom: '4px', width: searchQuery ? '160px' : '110px', background: 'transparent', border: 'none' }}
                      onFocus={(e) => { e.currentTarget.style.width = '180px'; }}
                      onBlur={(e) => { e.currentTarget.style.width = searchQuery ? '160px' : '110px'; }}
                    />
                    {searchQuery ? (
                      <button onClick={() => setSearchQuery('')} className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded"
                        style={{ color: 'rgba(148,163,184,0.5)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#fb7185'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(148,163,184,0.5)'; }}>
                        <XIcon />
                      </button>
                    ) : (
                      <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-black tracking-widest pointer-events-none select-none px-1 py-0.5 rounded"
                        style={{ color: 'rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>/</span>
                    )}
                  </div>
                  {searchQuery && <span className="text-[10px] text-slate-500 ml-1 whitespace-nowrap">{filteredSortedRecords.length}</span>}
                </div>
                {/* Add Entry */}
                <div className="flex items-center px-2 py-1" style={{ borderRight: '1px solid rgba(255,255,255,0.07)' }}>
                  <button onClick={() => setShowEntryDrawer(true)}
                    className="flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full shrink-0 transition-all duration-200"
                    style={{ background: 'linear-gradient(135deg, #9f1239 0%, #7c0a2a 55%, #4c0519 100%)', color: '#fff', border: '1px solid rgba(159,18,57,0.5)', boxShadow: '0 1px 8px rgba(159,18,57,0.35), inset 0 1px 0 rgba(255,255,255,0.12)' }}
                    title="New entry (press N)"
                    onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.2)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Add Entry
                  </button>
                </div>
                {/* CSV + More */}
                <div className="flex items-center">
                  <button onClick={exportCSV}
                    className="flex items-center gap-1 px-3 py-2 text-[11px] font-semibold transition-all duration-150"
                    style={{ color: 'rgba(148,163,184,0.75)' }}
                    title="Export to CSV"
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(148,163,184,0.75)'; }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    CSV
                  </button>
                  <div className="w-px self-stretch my-1.5" style={{ background: 'rgba(255,255,255,0.07)' }} />
                  <div className="relative">
                    <button ref={moreButtonRef} onClick={() => (showMoreMenu ? setShowMoreMenu(false) : openMoreMenu())}
                      className="flex items-center gap-1 px-3 py-2 text-[11px] font-semibold transition-all duration-150"
                      style={{ color: showMoreMenu ? '#fff' : 'rgba(148,163,184,0.75)', background: showMoreMenu ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                      title="Module options"
                      onMouseEnter={(e) => { if (!showMoreMenu) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; }}}
                      onMouseLeave={(e) => { if (!showMoreMenu) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(148,163,184,0.75)'; }}}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none"/>
                        <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>
                        <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none"/>
                      </svg>
                      More
                    </button>
                    <MoreMenuPortal />
                  </div>
                </div>
              </div>
            );
          }

          // When there IS a status field with records → full pill with rings
          const statusField = moduleStatusField;
          return (() => {

            const total = records.length;
            // Same colour function the table's StatusBadge/row-rail use, so ring colours always match the badges.
            const statusCounts = (statusField?.options ?? []).map((opt) => ({
              label: opt,
              value: statusField ? records.filter((r) => r.data[statusField.id] === opt).length : 0,
              color: statusAccentColor(opt) ?? '#64748b',
            }));

            // Mini ring SVG component (inline) — colored dot badge sits above the ring, like a status marker
            const MiniRing = ({ value, color, size = 32 }: { value: number; color: string; size?: number }) => {
              const cx = size / 2, cy = size / 2, R = size / 2 - 4, sw = 3;
              const circ = 2 * Math.PI * R;
              const pct = total > 0 ? value / total : 0;
              const arcLen = pct * circ;
              return (
                <div className="relative" style={{ width: size, height: size }}>
                  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
                    <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(51,65,85,0.5)" strokeWidth={sw} />
                    <circle cx={cx} cy={cy} r={R} fill="none" stroke={color} strokeWidth={sw}
                      strokeDasharray={`${arcLen} ${circ - arcLen}`}
                      strokeDashoffset={circ * 0.25}
                      strokeLinecap="round" />
                    <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
                      fill="white" style={{ fontSize: 9, fontWeight: 900, fontFamily: 'inherit' }}>
                      {value}
                    </text>
                  </svg>
                  {/* Accent dot badge — top-right corner marker */}
                  {value > 0 && (
                    <span
                      className="absolute rounded-full"
                      style={{
                        width: 5, height: 5, top: -1, right: -1,
                        background: color,
                        boxShadow: `0 0 4px ${color}`,
                        border: '1px solid #0a0e1a',
                      }}
                    />
                  )}
                </div>
              );
            };

            // Big total ring
            const BigRing = () => {
              const size = 55, cx = 27.5, cy = 27.5, R = 21, sw = 4;
              const circ = 2 * Math.PI * R;
              const segs = statusCounts.filter((s) => s.value > 0);
              let offset = 0;
              const gap = total > 0 ? circ * 0.02 : 0;
              const dominant = segs.reduce((best, s) => (s.value > best.value ? s : best), segs[0] ?? { color: '#fb7185', value: 0, label: '' });
              // Tick marks around the ring, like a dial
              const ticks = Array.from({ length: 8 }, (_, i) => {
                const deg = i * 45;
                const rad = (deg - 90) * (Math.PI / 180);
                const inner = R + sw / 2 + 1.5;
                const outer = R + sw / 2 + 4;
                return {
                  x1: cx + inner * Math.cos(rad), y1: cy + inner * Math.sin(rad),
                  x2: cx + outer * Math.cos(rad), y2: cy + outer * Math.sin(rad),
                };
              });
              return (
                <div className="relative shrink-0" style={{ width: size, height: size }}>
                  {/* Ambient glow behind the ring, tinted to the dominant status colour */}
                  {dominant.value > 0 && (
                    <div
                      className="absolute rounded-full pointer-events-none"
                      style={{
                        inset: 6,
                        background: dominant.color,
                        opacity: 0.16,
                        filter: 'blur(10px)',
                      }}
                    />
                  )}
                  <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
                    <defs>
                      <radialGradient id={`bigring-fill-${module.id}`} cx="35%" cy="30%" r="75%">
                        <stop offset="0%" stopColor="#161f30" />
                        <stop offset="100%" stopColor="#0a0e1a" />
                      </radialGradient>
                    </defs>
                    {/* Dark badge fill behind the ring */}
                    <circle cx={cx} cy={cy} r={R - sw / 2 - 1} fill={`url(#bigring-fill-${module.id})`} />
                    {/* Tick marks */}
                    {ticks.map((t, i) => (
                      <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                        stroke="rgba(100,116,139,0.4)" strokeWidth={1} strokeLinecap="round" />
                    ))}
                    {/* Track ring */}
                    <circle cx={cx} cy={cy} r={R} fill="none" stroke="rgba(30,41,59,0.9)" strokeWidth={sw} />
                    {/* Coloured segments */}
                    {segs.map((seg, i) => {
                      const arcLen = Math.max(0, (seg.value / total) * circ - gap);
                      const dashoffset = circ * 0.25 - offset;
                      offset += (seg.value / total) * circ;
                      return (
                        <circle key={i} cx={cx} cy={cy} r={R} fill="none"
                          stroke={seg.color} strokeWidth={sw}
                          strokeDasharray={`${arcLen} ${circ - arcLen}`}
                          strokeDashoffset={dashoffset}
                          strokeLinecap="round"
                          style={{ transition: 'stroke-dasharray 500ms ease, stroke-dashoffset 500ms ease', filter: `drop-shadow(0 0 3px ${seg.color}66)` }} />
                      );
                    })}
                    {/* Total count — bright white with glow */}
                    <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle"
                      fill="white"
                      style={{ fontSize: 12, fontWeight: 900, fontFamily: 'inherit', letterSpacing: '-0.3px', filter: 'drop-shadow(0 0 3px rgba(255,255,255,0.55))' }}>
                      {total}
                    </text>
                  </svg>
                  {/* Accent dot badge — top marker showing the dominant status colour */}
                  {dominant.value > 0 && (
                    <span
                      className="absolute rounded-full"
                      style={{
                        width: 8, height: 8, top: -2, left: '50%', transform: 'translateX(-50%)',
                        background: dominant.color,
                        boxShadow: `0 0 6px ${dominant.color}`,
                        border: '2px solid #0a0e1a',
                      }}
                    />
                  )}
                </div>
              );
            };

            const topStatus = statusCounts.reduce(
              (best, s) => (s.value > best.value ? s : best),
              statusCounts[0] ?? { label: '', value: 0, color: '#fb7185' }
            );
            const topPct = total > 0 ? Math.round((topStatus.value / total) * 100) : 0;

            return (
              <div
                className="flex items-center gap-0 overflow-hidden flex-1"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)',
                  border: '1.5px solid rgba(255,255,255,0.18)',
                  borderRadius: '9999px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
                  marginLeft: '20px',
                  marginRight: '20px',
                }}
              >
                {/* ── Left section: Big ring + title + summary ── */}
                <div
                  className="relative flex items-center gap-2 pl-2 pr-2 py-0.5"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    borderRight: '1px solid rgba(255,255,255,0.07)',
                  }}
                >
                  {/* Accent rail — ties this card to the module's dominant status colour */}
                  <span
                    className="absolute left-0 top-1.5 bottom-1.5 rounded-full"
                    style={{ width: 2.5, background: topStatus.color, opacity: 0.7 }}
                  />
                  <BigRing />
                  <div className="flex flex-col gap-1">
                    <span
                      className="font-black text-[11.5px] uppercase tracking-[0.1em] leading-none"
                      style={{ color: 'rgba(241,245,249,0.95)', textShadow: '0 1px 2px rgba(0,0,0,0.4)' }}
                    >
                      {module.name}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] leading-none whitespace-nowrap font-medium" style={{ color: 'rgba(100,116,139,0.8)' }}>
                      <span className="text-white font-bold" style={{ fontSize: 11 }}>{total}</span>
                      <span style={{ color: 'rgba(71,85,105,0.7)' }}>entries</span>
                      {topStatus.value > 0 && (
                        <>
                          <span style={{ color: 'rgba(71,85,105,0.4)' }}>·</span>
                          <span
                            className="inline-block rounded-full shrink-0"
                            style={{ width: 5, height: 5, background: topStatus.color, boxShadow: `0 0 4px ${topStatus.color}` }}
                          />
                          <span style={{ color: topStatus.color, fontWeight: 700 }}>{topPct}%</span>
                          <span style={{ color: 'rgba(71,85,105,0.7)' }}>{topStatus.label.toLowerCase()}</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* ── Right section: individual status rings ── */}
                <div className="flex items-center px-1.5 py-1 gap-0.5">
                  {statusCounts.map((s, si) => {
                    const isActive = activeFilter?.fieldId === statusField!.id && activeFilter?.value === s.label;
                    return (
                      <button
                        key={s.label}
                        type="button"
                        onClick={() => setActiveFilter(isActive ? null : { fieldId: statusField!.id, value: s.label })}
                        className="flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition-all duration-150"
                        style={{
                          background: isActive
                            ? `${s.color}18`
                            : 'transparent',
                          border: isActive
                            ? `1px solid ${s.color}40`
                            : '1px solid transparent',
                          cursor: 'pointer',
                          minWidth: 36,
                        }}
                        onMouseEnter={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = `${s.color}0f`;
                            e.currentTarget.style.borderColor = `${s.color}25`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'transparent';
                          }
                        }}
                        title={`Filter by ${s.label} (${s.value})`}
                      >
                        <MiniRing value={s.value} color={s.color} />
                        <span
                          className="font-bold uppercase tracking-wide whitespace-nowrap leading-none"
                          style={{
                            fontSize: 7,
                            color: isActive ? s.color : `${s.color}cc`,
                            letterSpacing: '0.06em',
                          }}
                        >
                          {s.label}
                        </span>
                      </button>
                    );
                    void si;
                  })}
                </div>

                {/* ── Search section — grows to fill all remaining space ── */}
                <div
                  className="flex items-center flex-1 min-w-0 px-2 py-1"
                  style={{ borderLeft: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <div className="relative group flex-1 min-w-0">
                    {/* Search icon */}
                    <svg
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200"
                      style={{ color: searchQuery ? 'rgba(251,113,133,0.8)' : 'rgba(148,163,184,0.45)' }}
                      width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      ref={searchRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search…"
                      className="w-full text-[11.5px] text-white placeholder-slate-600 focus:outline-none transition-all duration-200"
                      style={{
                        paddingLeft: '26px',
                        paddingRight: searchQuery ? '24px' : '8px',
                        paddingTop: '4px',
                        paddingBottom: '4px',
                        background: 'transparent',
                        border: 'none',
                      }}
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-1 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center rounded transition-all duration-150"
                        style={{ color: 'rgba(148,163,184,0.5)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = '#fb7185'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(148,163,184,0.5)'; }}
                        title="Clear search (Esc)"
                      >
                        <XIcon />
                      </button>
                    )}
                    {!searchQuery && (
                      <span
                        className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] font-black tracking-widest pointer-events-none select-none px-1 py-0.5 rounded"
                        style={{ color: 'rgba(148,163,184,0.3)', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        /
                      </span>
                    )}
                  </div>
                  {searchQuery && (
                    <span className="text-[10px] text-slate-500 ml-1 whitespace-nowrap">
                      {filteredSortedRecords.length}
                    </span>
                  )}
                </div>

                {/* ── New Entry section ── */}
                <div
                  className="flex items-center px-2 py-1"
                  style={{ borderLeft: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <button
                    onClick={() => setShowEntryDrawer(true)}
                    className="flex items-center gap-1 text-[11px] font-bold px-3 py-1 rounded-full shrink-0 transition-all duration-200"
                    style={{
                      background: 'linear-gradient(135deg, #9f1239 0%, #7c0a2a 55%, #4c0519 100%)',
                      color: '#fff',
                      border: '1px solid rgba(159,18,57,0.5)',
                      boxShadow: '0 1px 8px rgba(159,18,57,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
                    }}
                    title="New entry (press N)"
                    onMouseEnter={(e) => { e.currentTarget.style.filter = 'brightness(1.2)'; e.currentTarget.style.boxShadow = '0 2px 14px rgba(159,18,57,0.5), inset 0 1px 0 rgba(255,255,255,0.12)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.filter = 'brightness(1)'; e.currentTarget.style.boxShadow = '0 1px 8px rgba(159,18,57,0.35), inset 0 1px 0 rgba(255,255,255,0.12)'; }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Add Entry
                  </button>
                </div>

                {/* ── CSV + More section ── */}
                <div
                  className="flex items-center"
                  style={{ borderLeft: '1px solid rgba(255,255,255,0.07)' }}
                >
                  {/* Export CSV */}
                  <button
                    onClick={exportCSV}
                    className="flex items-center gap-1 px-3 py-2 text-[11px] font-semibold transition-all duration-150"
                    style={{ color: 'rgba(148,163,184,0.75)' }}
                    title="Export to CSV"
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(148,163,184,0.75)'; }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    CSV
                  </button>
                  {/* Inner divider */}
                  <div className="w-px self-stretch my-1.5" style={{ background: 'rgba(255,255,255,0.07)' }} />
                  {/* More dropdown */}
                  <div className="relative">
                    <button
                      ref={moreButtonRef}
                      onClick={() => (showMoreMenu ? setShowMoreMenu(false) : openMoreMenu())}
                      className="flex items-center gap-1 px-3 py-2 text-[11px] font-semibold transition-all duration-150"
                      style={{ color: showMoreMenu ? '#fff' : 'rgba(148,163,184,0.75)', background: showMoreMenu ? 'rgba(255,255,255,0.08)' : 'transparent' }}
                      title="Module options"
                      onMouseEnter={(e) => { if (!showMoreMenu) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; }}}
                      onMouseLeave={(e) => { if (!showMoreMenu) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(148,163,184,0.75)'; }}}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <circle cx="5" cy="12" r="1.3" fill="currentColor" stroke="none"/>
                        <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/>
                        <circle cx="19" cy="12" r="1.3" fill="currentColor" stroke="none"/>
                      </svg>
                      More
                    </button>
                    <MoreMenuPortal />
                  </div>
          </div>
        </div>
            );
          })();
        })()}
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-auto max-h-[calc(100vh-230px)] mb-8"
        style={{
          border: '1px solid rgba(255,255,255,0.08)',
          background: '#19191b',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.02)',
        }}
      >
        <table style={{ width: totalWidth, minWidth: '100%', tableLayout: 'fixed' }}>
          {/* colgroup for explicit widths */}
          <colgroup>
            {/* Checkbox col */}
            <col style={{ width: 36, minWidth: 36 }} />
            <col style={{ width: 40, minWidth: 40 }} />
            {orderedFields.map((f) => (
              <col key={f.id} style={{ width: colWidths[f.id] ?? defaultColWidth(f), minWidth: colWidths[f.id] ?? defaultColWidth(f) }} />
            ))}
            <col style={{ width: 40, minWidth: 40 }} />
          </colgroup>

          <thead className="sticky top-0 z-10">
            <tr
              style={{
                background: '#242426',
                borderBottom: '1px solid rgba(255,255,255,0.09)',
                boxShadow: '0 1px 0 rgba(255,255,255,0.03)',
              }}
            >
              {/* Checkbox header — sticky col 1 */}
              <th
                className="px-0 py-0 text-center select-none"
                style={{
                  background: '#1e1e2e',
                  borderRight: '1px solid rgba(255,255,255,0.07)',
                  width: 36, minWidth: 36,
                  position: 'sticky', left: 0, zIndex: 6,
                }}
              >
                <span className="flex items-center justify-center py-3">
                  <StyledCheckbox
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    indeterminate={someSelected && !allSelected}
                  />
                </span>
              </th>
              {/* Row # column — sticky col 2 */}
              <th
                className="px-0 py-0 text-center select-none"
                style={{
                  background: '#1e1e2e',
                  borderRight: '1px solid rgba(255,255,255,0.07)',
                  width: 40,
                  minWidth: 40,
                  position: 'sticky', left: 36, zIndex: 6,
                }}
              >
                <span
                  className="flex items-center justify-center py-3 text-[10px] font-semibold"
                  style={{ color: '#6b6b70' }}
                >
                  #
                </span>
              </th>
              {orderedFields.map((field, fIdx) => (
                <SortableResizableTh
                  key={field.id}
                  field={field}
                  width={colWidths[field.id] ?? defaultColWidth(field)}
                  onResizeStart={(e) => onResizeStart(e, field.id)}
                  onFitToContent={() => fitToContent(field.id, records)}
                  onResetWidth={() => resetWidth(field.id)}
                  sortDir={sortCol === field.id ? sortDir : null}
                  onSort={() => handleSortClick(field.id)}
                  sticky={fIdx === 0}
                  stickyLeft={36 + 40}
                />
              ))}
              <th style={{ background: '#242426', width: 40, minWidth: 40 }} />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={module.fields.length + 3} className="px-4 py-8 text-center text-slate-500 text-sm">Loading…</td>
              </tr>
            ) : filteredSortedRecords.length === 0 ? (
              <tr>
                <td colSpan={module.fields.length + 3} className="px-4 py-10 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-500">
                        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
                      </svg>
                    </div>
                    {searchQuery ? (
                      <p className="text-slate-500 text-sm">No records match "<span className="text-rose-400">{searchQuery}</span>"</p>
                    ) : (
                      <>
                        <p className="text-slate-500 text-sm">No records yet.</p>
                        <button
                          onClick={() => setShowEntryDrawer(true)}
                          className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          <PlusIcon /> Add first {module.name}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredSortedRecords.map((record, idx) => (
                <SelectableRecordRow
                  key={record.id}
                  record={record}
                  fields={orderedFields}
                  rowIndex={idx}
                  selected={selectedIds.has(record.id)}
                  onToggleSelect={() => toggleSelect(record.id)}
                  onUpdate={(data) => handleUpdateRecord(record, data)}
                  onDelete={() => handleDeleteRecord(record)}
                  onRowClick={isSiteEntry ? () => setDetailRecord({ record, idx }) : undefined}
                />
              ))
            )}
            <AddRecordRow fields={orderedFields} moduleName={module.name} onOpenDrawer={() => setShowEntryDrawer(true)} />
          </tbody>
        </table>
      </div>

      {/* Status bar */}
      {!loading && records.length > 0 && (
        <div className="flex items-center justify-between px-2 pt-2 text-[10px] text-slate-600">
          <span>
            {someSelected ? <span className="text-rose-400">{selectedIds.size} selected · </span> : null}
            {filteredSortedRecords.length} of {records.length} records
            {sortCol && (
              <span className="ml-2 text-slate-700">
                · sorted by <span className="text-slate-500">{module.fields.find(f => f.id === sortCol)?.label}</span> {sortDir === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </span>
          <span className="text-slate-700">N · new entry &nbsp;|&nbsp; / · search &nbsp;|&nbsp; Esc · clear</span>
        </div>
      )}

      {/* Edit module modal (rename + fields) */}
      {showEditModal && (
        <EditModuleModal
          projectId={projectId}
          module={module}
          onClose={() => setShowEditModal(false)}
          onSaved={(updated) => { onModuleUpdated(updated); setShowEditModal(false); }}
        />
      )}

      {/* Field settings modal */}
      {showSettings && (
        <FieldSettingsModal
          projectId={projectId}
          module={module}
          onClose={() => setShowSettings(false)}
          onSaved={(updated) => { onModuleUpdated(updated); setShowSettings(false); }}
        />
      )}

      {/* Confirm delete module */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#120000] border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-semibold text-base mb-2">Delete "{module.name}"?</h3>
            <p className="text-slate-400 text-sm mb-5">All {records.length} records will be permanently deleted. This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white">Cancel</button>
              <button onClick={handleDeleteModule} className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm bulk delete */}
      {confirmBulkDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#120000] border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-semibold text-base mb-2">Delete {selectedIds.size} record{selectedIds.size !== 1 ? 's' : ''}?</h3>
            <p className="text-slate-400 text-sm mb-5">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmBulkDelete(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white">Cancel</button>
              <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* New Entry Drawer */}
      {showEntryDrawer && (
        <NewEntryDrawer
          projectId={projectId}
          module={module}
          onClose={() => setShowEntryDrawer(false)}
          onAdd={handleAddRecord}
          onAddMore={handleAddRecord}
        />
      )}

      {/* ── Site Entry: Record Detail Panel ── */}
      {isSiteEntry && detailRecord && (
        <NewEntryDrawer
          projectId={projectId}
          module={module}
          initialData={detailRecord.record.data}
          onClose={() => setDetailRecord(null)}
          onAdd={(data) => {
            handleUpdateRecord(detailRecord.record, data);
            setDetailRecord((prev) => prev ? { ...prev, record: { ...prev.record, data } } : null);
          }}
          onAddMore={(data) => {
            handleUpdateRecord(detailRecord.record, data);
            setDetailRecord((prev) => prev ? { ...prev, record: { ...prev.record, data } } : null);
          }}
          onDelete={() => {
            handleDeleteRecord(detailRecord.record);
            setDetailRecord(null);
          }}
        />
      )}
    </>
  );
}

// ─── Module accent colours — each tab gets a stable unique colour ─────────────

const MODULE_ACCENT_PALETTE = [
  '#f43f5e', // rose
  '#fb923c', // orange
  '#facc15', // yellow
  '#4ade80', // green
  '#34d399', // emerald
  '#22d3ee', // cyan
  '#60a5fa', // blue
  '#a78bfa', // violet
  '#e879f9', // fuchsia
  '#f472b6', // pink
  '#2dd4bf', // teal
  '#818cf8', // indigo
];

/** Returns a stable colour for a module at a given list index */
function moduleAccentColor(index: number): string {
  return MODULE_ACCENT_PALETTE[index % MODULE_ACCENT_PALETTE.length];
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomModulesPage() {
  const { activeProjectId } = useApp();
  const projectId = activeProjectId ?? '';
  const [modules, setModules] = useState<CustomModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModuleId, setActiveModuleIdRaw] = useState<string | null>(
    () => localStorage.getItem('activeModuleId')
  );
  const setActiveModuleId = useCallback((id: string | null) => {
    setActiveModuleIdRaw(id);
    if (id) localStorage.setItem('activeModuleId', id);
    else localStorage.removeItem('activeModuleId');
  }, []);
  const [showNewModal, setShowNewModal] = useState(false);

  useEffect(() => {
    CustomModulesAPI.list(projectId)
      .then((data) => {
        setModules(data);
        // Fall back to the first module if there's no selection yet, or the
        // persisted selection doesn't belong to this project's module list
        // (e.g. stale localStorage from a previous project).
        const hasValidSelection = activeModuleId && data.some((m) => m.id === activeModuleId);
        if (data.length > 0 && !hasValidSelection) setActiveModuleId(data[0].id);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  function handleModuleCreated(m: CustomModule) {
    setModules((prev) => [...prev, m]);
    setActiveModuleId(m.id);
  }

  function handleModuleUpdated(updated: CustomModule) {
    setModules((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }

  function handleModuleDeleted(id: string) {
    setModules((prev) => {
      const remaining = prev.filter((m) => m.id !== id);
      setActiveModuleId(remaining.length > 0 ? remaining[0].id : null);
      return remaining;
    });
  }

  const activeModule = modules.find((m) => m.id === activeModuleId) ?? null;

  return (
    <div className="flex flex-col h-full bg-[#0a0a0a] text-white">
      {/* ── Top navigation — module tabs ── */}
      <div
        className="flex-shrink-0 border-b border-rose-950/60"
        style={{
          background: 'linear-gradient(180deg, #160305 0%, #0e0001 100%)',
          boxShadow: '0 1px 0 rgba(220,38,90,0.12), 0 4px 16px rgba(0,0,0,0.4)',
        }}
      >
        <div className="flex items-stretch px-3 gap-0 h-11">

          {/* Module tabs — scrollable, underline style, with edge-fade to hint scrollability */}
          <nav
            className="flex items-stretch gap-0 overflow-x-auto flex-1 min-w-0"
            style={{
              scrollbarWidth: 'none',
              WebkitMaskImage: 'linear-gradient(90deg, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)',
              maskImage: 'linear-gradient(90deg, transparent 0, black 16px, black calc(100% - 16px), transparent 100%)',
            }}
          >
            {loading ? (
              <div className="flex items-center gap-2 px-4 text-slate-500 text-xs">
                <div className="w-3 h-3 rounded-full border-2 border-rose-800 border-t-transparent animate-spin" />
                Loading…
              </div>
            ) : modules.length === 0 ? (
              <div className="flex items-center px-4 text-slate-600 text-xs italic">
                No modules yet — create your first one →
              </div>
            ) : (
              modules.map((m, mIdx) => {
                const isActive = m.id === activeModuleId;
                const accent = moduleAccentColor(mIdx);
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveModuleId(m.id)}
                    className={cn(
                      'group/tab relative flex items-center gap-2 px-4 text-[13px] font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 select-none',
                      isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300',
                    )}
                  >
                    {/* Active: pill background — tinted with this module's accent colour */}
                    {isActive && (
                      <span
                        className="absolute inset-x-0 inset-y-[6px] pointer-events-none animate-in fade-in zoom-in-95 duration-200"
                        style={{
                          background: `linear-gradient(180deg, ${accent}28 0%, ${accent}0f 100%)`,
                          border: `1px solid ${accent}40`,
                          borderRadius: '999px',
                          boxShadow: `0 2px 10px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.05)`,
                        }}
                      />
                    )}
                    {/* Hover: subtle bg for inactive */}
                    {!isActive && (
                      <span
                        className="absolute inset-x-0 inset-y-[6px] rounded-full bg-white/0 group-hover/tab:bg-white/[0.04] transition-colors duration-200 pointer-events-none"
                        style={{ border: '1px solid transparent' }}
                      />
                    )}

                    {/* Accent dot — unique colour per module, glows when active */}
                    <span className="relative flex-shrink-0 flex items-center justify-center" style={{ width: 14, height: 14 }}>
                      {/* Outer glow ring */}
                      <span
                        className="absolute inset-0 rounded-full transition-all duration-300"
                        style={
                          isActive
                            ? {
                                background: `${accent}22`,
                                boxShadow: `0 0 0 3px ${accent}33, 0 0 12px ${accent}66`,
                                borderRadius: '50%',
                              }
                            : {
                                background: `${accent}11`,
                                boxShadow: `0 0 0 2px ${accent}22`,
                                borderRadius: '50%',
                              }
                        }
                      />
                      {/* Inner solid dot */}
                      <span
                        className={cn(
                          'relative rounded-full transition-all duration-300',
                          isActive && 'animate-pulse'
                        )}
                        style={
                          isActive
                            ? {
                                width: 8,
                                height: 8,
                                background: `radial-gradient(circle at 35% 35%, #fff8 0%, ${accent} 45%, ${accent}cc 100%)`,
                                boxShadow: `0 0 10px ${accent}, 0 0 4px ${accent}dd, inset 0 1px 1px rgba(255,255,255,0.35)`,
                                transform: 'scale(1.1)',
                              }
                            : {
                                width: 7,
                                height: 7,
                                background: `radial-gradient(circle at 35% 35%, ${accent}cc 0%, ${accent}88 100%)`,
                                boxShadow: `0 0 4px ${accent}66`,
                              }
                        }
                      />
                    </span>

                    {/* Label */}
                    <span className="relative font-semibold tracking-tight">{m.name}</span>

                    {/* Bottom active bar — same accent colour */}
                    {isActive && (
                      <span
                        className="absolute bottom-0 left-3 right-3 h-[2px] rounded-t-full"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${accent} 30%, ${accent}cc 70%, transparent)`,
                          boxShadow: `0 0 8px ${accent}99`,
                        }}
                      />
                    )}
                    {/* Bottom bar preview on hover */}
                    {!isActive && (
                      <span
                        className="absolute bottom-0 left-3 right-3 h-[2px] rounded-t-full opacity-0 group-hover/tab:opacity-50 transition-opacity duration-200"
                        style={{ background: `linear-gradient(90deg, transparent, ${accent}88 30%, ${accent}88 70%, transparent)` }}
                      />
                    )}
                  </button>
                );
              })
            )}
          </nav>

          {/* Divider + New Module button */}
          <div className="relative flex items-center gap-0 flex-shrink-0 pl-3 ml-1">
            {/* Fading divider instead of a hard line */}
            <span
              className="absolute left-0 top-1.5 bottom-1.5 w-px"
              style={{ background: 'linear-gradient(180deg, transparent, rgba(220,38,90,0.35) 50%, transparent)' }}
            />
            <button
              onClick={() => setShowNewModal(true)}
              className="group/new flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 relative overflow-hidden active:scale-95"
              style={{
                background: 'linear-gradient(145deg, rgba(220,38,90,0.2) 0%, rgba(100,10,30,0.3) 100%)',
                border: '1px solid rgba(220,38,90,0.3)',
                color: '#fda4af',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(220,38,90,0.35) 0%, rgba(120,10,35,0.45) 100%)';
                e.currentTarget.style.borderColor = 'rgba(220,38,90,0.55)';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.boxShadow = '0 2px 12px rgba(220,38,90,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(220,38,90,0.2) 0%, rgba(100,10,30,0.3) 100%)';
                e.currentTarget.style.borderColor = 'rgba(220,38,90,0.3)';
                e.currentTarget.style.color = '#fda4af';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Sheen sweep on hover */}
              <span
                className="absolute inset-0 -translate-x-full group-hover/new:translate-x-full transition-transform duration-700 ease-out pointer-events-none"
                style={{ background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)' }}
              />
              <svg className="relative transition-transform duration-200 group-hover/new:rotate-90" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span className="relative">New Module</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content area ── */}
      <main className="flex-1 overflow-auto px-6 pb-6 pt-0">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-500">Loading modules…</div>
        ) : modules.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-rose-900/30 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-rose-400">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <div>
              <h2 className="text-white font-semibold text-xl mb-2">No Custom Modules</h2>
              <p className="text-slate-400 text-sm max-w-sm">
                Custom modules let you track anything — vendors, inspections, materials, checklists — with your own fields and records.
              </p>
            </div>
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-800 hover:bg-rose-700 text-white font-medium transition-colors"
            >
              <PlusIcon /> Create First Module
            </button>
          </div>
        ) : activeModule ? (
          <ModuleTable
            projectId={projectId}
            key={activeModule.id}
            module={activeModule}
            onModuleUpdated={handleModuleUpdated}
            onModuleDeleted={handleModuleDeleted}
          />
        ) : null}
      </main>

      {/* New module modal */}
      {showNewModal && (
        <NewModuleModal
          projectId={projectId}
          onClose={() => setShowNewModal(false)}
          onCreated={handleModuleCreated}
        />
      )}
    </div>
  );
}
