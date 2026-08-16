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

// ─── Badge colour helpers ────────────────────────────────────────────────────

// Maps specific values to tailwind colour classes
const BADGE_COLORS: Record<string, string> = {
  // Status
  'Not Started':   'bg-slate-700/80 text-slate-300 border border-slate-600',
  'In Progress':   'bg-blue-900/60 text-blue-300 border border-blue-700/60',
  'Done':          'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60',
  'Blocked':       'bg-red-900/60 text-red-300 border border-red-700/60',
  'Review':        'bg-amber-900/60 text-amber-300 border border-amber-700/60',
  'Active':        'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60',
  'Inactive':      'bg-slate-700/80 text-slate-400 border border-slate-600',
  'On Leave':      'bg-amber-900/60 text-amber-300 border border-amber-700/60',
  'Terminated':    'bg-red-900/60 text-red-400 border border-red-700/60',
  // Skill
  'Unskilled':     'bg-slate-700/80 text-slate-400 border border-slate-600',
  'Semi-Skilled':  'bg-sky-900/60 text-sky-300 border border-sky-700/60',
  'Skilled':       'bg-blue-900/60 text-blue-300 border border-blue-700/60',
  'Highly Skilled':'bg-violet-900/60 text-violet-300 border border-violet-700/60',
  // Worker type
  'Labour':         'bg-orange-900/60 text-orange-300 border border-orange-700/60',
  'Skilled Worker': 'bg-blue-900/60 text-blue-300 border border-blue-700/60',
  'Supervisor':     'bg-violet-900/60 text-violet-300 border border-violet-700/60',
  'Engineer':       'bg-cyan-900/60 text-cyan-300 border border-cyan-700/60',
  'Contractor Staff':'bg-rose-900/60 text-rose-300 border border-rose-700/60',
  // Medical
  'Valid':    'bg-emerald-900/60 text-emerald-300 border border-emerald-700/60',
  'Expired':  'bg-red-900/60 text-red-300 border border-red-700/60',
  'Pending':  'bg-amber-900/60 text-amber-300 border border-amber-700/60',
};

// ─── Styled Checkbox ─────────────────────────────────────────────────────────

function StyledCheckbox({
  checked,
  onChange,
  indeterminate,
}: {
  checked: boolean;
  onChange: () => void;
  indeterminate?: boolean;
}) {
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate ?? false;
    }
  }, [indeterminate]);

  return (
    <label
      className="relative flex items-center justify-center cursor-pointer"
      style={{ width: 16, height: 16 }}
      onClick={(e) => e.stopPropagation()}
    >
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      {/* Custom box */}
      <span
        className="flex items-center justify-center rounded transition-all duration-150"
        style={{
          width: 15,
          height: 15,
          background: checked
            ? 'linear-gradient(135deg, #e11d48 0%, #9f1239 100%)'
            : indeterminate
            ? 'linear-gradient(135deg, #be123c 0%, #881337 100%)'
            : 'rgba(220,38,90,0.06)',
          border: checked || indeterminate
            ? '1.5px solid rgba(251,113,133,0.7)'
            : '1.5px solid rgba(220,38,90,0.3)',
          boxShadow: checked
            ? '0 0 8px rgba(225,29,72,0.45), inset 0 1px 0 rgba(255,255,255,0.15)'
            : indeterminate
            ? '0 0 6px rgba(190,18,60,0.3)'
            : 'none',
        }}
      >
        {checked && (
          <svg
            width="9"
            height="9"
            viewBox="0 0 12 12"
            fill="none"
            stroke="white"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="2,6 5,9 10,3" />
          </svg>
        )}
        {!checked && indeterminate && (
          <svg
            width="8"
            height="2"
            viewBox="0 0 8 2"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <line x1="1" y1="1" x2="7" y2="1" />
          </svg>
        )}
      </span>
    </label>
  );
}

function StatusBadge({ value }: { value: string }) {
  const color = BADGE_COLORS[value] ?? 'bg-slate-700/80 text-slate-300 border border-slate-600';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', color)}>
      {value || '—'}
    </span>
  );
}


// ─── Select Options Editor ───────────────────────────────────────────────────

interface SelectOptionsEditorProps {
  options: string[];
  onChange: (opts: string[]) => void;
}

function SelectOptionsEditor({ options, onChange }: SelectOptionsEditorProps) {
  const [inputVal, setInputVal] = useState('');

  function addOption() {
    const trimmed = inputVal.trim();
    if (!trimmed || options.includes(trimmed)) return;
    onChange([...options, trimmed]);
    setInputVal('');
  }

  function removeOption(opt: string) {
    onChange(options.filter((o) => o !== opt));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); addOption(); }
    if (e.key === 'Escape') setInputVal('');
  }

  return (
    <div className="ml-2 pl-3 border-l-2 border-slate-700 space-y-1.5">
      {/* existing chips */}
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => (
            <span
              key={opt}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-700 text-slate-200 text-xs"
            >
              {opt}
              <button
                type="button"
                onClick={() => removeOption(opt)}
                className="text-slate-400 hover:text-red-400 transition-colors leading-none"
                title="Remove"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      {/* add new option */}
      <div className="flex items-center gap-1.5">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add option…"
          className="flex-1 bg-[#0a0000] border border-slate-600 rounded px-2 py-1 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-rose-700"
        />
        <button
          type="button"
          onClick={addOption}
          disabled={!inputVal.trim()}
          className="px-2 py-1 rounded bg-rose-900 hover:bg-rose-800 disabled:opacity-40 text-white text-xs transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ─── New Module Modal ─────────────────────────────────────────────────────────

interface NewModuleModalProps {
  projectId: string;
  onClose: () => void;
  onCreated: (m: CustomModule) => void;
}

function NewModuleModal({ projectId, onClose, onCreated }: NewModuleModalProps) {
  const [name, setName] = useState('');
  const [fields, setFields] = useState<CustomField[]>([
    { id: uuidv4(), label: 'Title', type: 'text' },
    { id: uuidv4(), label: 'Status', type: 'select', options: ['Not Started', 'In Progress', 'Done', 'Blocked', 'Review'] },
  ]);
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
                      onChange={(opts) => updateField(idx, { options: opts })}
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
            <div className="space-y-1">
              {fields.map((field, idx) => (
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
                  className="flex flex-col gap-1.5 rounded-xl px-3 py-2 transition-all duration-150"
                  style={dragOverIndex === idx
                    ? { background: 'rgba(220,38,90,0.12)', border: '1px solid rgba(220,38,90,0.4)' }
                    : { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }
                  }
                >
                  <div className="flex gap-2 items-center">
                    {/* Drag handle */}
                    <div className="flex flex-col gap-[3px] cursor-grab active:cursor-grabbing text-slate-600 hover:text-rose-500 flex-shrink-0 transition-colors">
                      <div className="w-3 h-0.5 bg-current rounded-full" />
                      <div className="w-3 h-0.5 bg-current rounded-full" />
                      <div className="w-3 h-0.5 bg-current rounded-full" />
                    </div>
                    {/* Index badge */}
                    <span
                      className="text-[9px] font-black w-5 h-5 flex items-center justify-center rounded flex-shrink-0"
                      style={{ background: 'rgba(220,38,90,0.15)', color: 'rgba(251,113,133,0.7)' }}
                    >
                      {idx + 1}
                    </span>
                    <input
                      value={field.label}
                      onChange={(e) => updateField(idx, { label: e.target.value })}
                      placeholder="Field label"
                      className="flex-1 rounded-lg px-3 py-1.5 text-white placeholder-slate-600 text-sm focus:outline-none transition-all"
                      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(100,30,50,0.4)' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(220,38,90,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(220,38,90,0.08)'; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(100,30,50,0.4)'; e.currentTarget.style.boxShadow = 'none'; }}
                    />
                    <select
                      value={field.type}
                      onChange={(e) => {
                        const newType = e.target.value as FieldType;
                        updateField(idx, {
                          type: newType,
                          options: newType === 'select' ? (field.options ?? []) : undefined,
                        });
                      }}
                      className="rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none w-36"
                      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(100,30,50,0.4)' }}
                    >
                      {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
                        <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeField(idx)}
                      disabled={fields.length <= 1}
                      className="p-1.5 text-slate-600 hover:text-red-400 disabled:opacity-30 transition-colors flex-shrink-0 rounded-lg"
                      style={{ border: '1px solid transparent' }}
                      onMouseEnter={(e) => { if (fields.length > 1) e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      title="Remove field"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                  {field.type === 'select' && (
                    <div className="pl-10">
                      <SelectOptionsEditor
                        options={field.options ?? []}
                        onChange={(opts) => updateField(idx, { options: opts })}
                      />
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={addField}
                className="flex items-center gap-2 text-xs font-semibold w-full mt-3 px-3 py-2.5 rounded-xl transition-all duration-150"
                style={{ color: '#fb7185', border: '1px dashed rgba(220,38,90,0.3)', background: 'rgba(220,38,90,0.04)' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(220,38,90,0.1)'; e.currentTarget.style.borderColor = 'rgba(220,38,90,0.5)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(220,38,90,0.04)'; e.currentTarget.style.borderColor = 'rgba(220,38,90,0.3)'; }}
              >
                <PlusIcon /> Add new field
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
  module: CustomModule;
  onClose: () => void;
  onSaved: (m: CustomModule) => void;
}

function FieldSettingsModal({ module, onClose, onSaved }: FieldSettingsModalProps) {
  // Delegate to EditModuleModal opened on the fields tab
  return <EditModuleModal projectId="" module={module} onClose={onClose} onSaved={onSaved} />;
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
// Mirrors the Zoho Projects "New <module>" form exactly:
//   Always shows: Title (required), Description (textarea)
//   Always shows in "<Module> Information" section: Status (dropdown w/ green dot, default "Active"), Multi User
//   Then appends any extra custom fields from the module definition

// Stable IDs for the 4 always-present Zoho-default fields
const ZOHO_TITLE_ID       = '__zoho_title__';
const ZOHO_DESC_ID        = '__zoho_description__';
const ZOHO_STATUS_ID      = '__zoho_status__';

const ZOHO_STATUS_OPTIONS = ['Active', 'Inactive'];

interface NewEntryDrawerProps {
  projectId: string;
  module: CustomModule;
  onClose: () => void;
  onAdd: (data: Record<string, any>) => void;
  onAddMore: (data: Record<string, any>) => void;
}

function NewEntryDrawer({ projectId, module, onClose, onAdd, onAddMore }: NewEntryDrawerProps) {
  // draft uses stable Zoho keys + field.id keys for custom fields
  const [draft, setDraft] = useState<Record<string, any>>({
    [ZOHO_STATUS_ID]: 'Active',
  });
  const [saving, setSaving] = useState(false);

  // Custom fields that are NOT one of the 4 default Zoho fields
  // (we skip module fields that look like duplicates of the defaults)
  const extraFields = module.fields.filter((f) => {
    const lbl = f.label.toLowerCase();
    if (lbl === 'title') return false;
    if (lbl === 'description' || lbl === 'desc') return false;
    if (f.type === 'select' && lbl.includes('status')) return false;
    if (f.type === 'multiuser') return false;
    return true;
  });

  function setValue(fieldId: string, value: any) {
    setDraft((d) => ({ ...d, [fieldId]: value }));
  }

  // Build the data payload: merge Zoho defaults + custom field values
  function buildPayload() {
    const payload: Record<string, any> = {
      _title:  draft[ZOHO_TITLE_ID] ?? '',
      _desc:   draft[ZOHO_DESC_ID] ?? '',
      _status: draft[ZOHO_STATUS_ID] ?? 'Active',
    };
    // Also include any extra custom fields — strip _preview from attachment objects
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

  const titleIsEmpty = !String(draft[ZOHO_TITLE_ID] ?? '').trim();

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
      // Reset form but keep status default
      setDraft({ [ZOHO_STATUS_ID]: 'Active' });
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
          <h2 className="text-white font-semibold text-lg">New {module.name}</h2>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
              <XIcon />
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* ── 1. Title (always shown, required) ── */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">
              Title <span className="text-rose-500">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={draft[ZOHO_TITLE_ID] ?? ''}
              onChange={(e) => setValue(ZOHO_TITLE_ID, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !titleIsEmpty && handleAdd()}
              placeholder=""
              className="w-full bg-[#0b0000] border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-600 transition-colors"
            />
          </div>

          {/* ── 2. Description (always shown, textarea with toolbar look) ── */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">Description</label>
            {/* Toolbar strip mimicking Zoho's rich-text bar */}
            <div className="flex items-center gap-1 px-2 py-1 bg-[#130000] border border-slate-600 border-b-0 rounded-t-lg">
              {['B','I','U'].map((t) => (
                <button key={t} type="button" className="px-1.5 py-0.5 text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors">{t}</button>
              ))}
              <div className="w-px h-4 bg-slate-700 mx-1" />
              {['≡','•'].map((t) => (
                <button key={t} type="button" className="px-1.5 py-0.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors">{t}</button>
              ))}
            </div>
            <textarea
              rows={6}
              value={draft[ZOHO_DESC_ID] ?? ''}
              onChange={(e) => setValue(ZOHO_DESC_ID, e.target.value)}
              placeholder=""
              className="w-full bg-[#0b0000] border border-slate-600 border-t-0 rounded-b-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-600 resize-none transition-colors"
            />
          </div>

          {/* ── 3. Extra custom fields (from module definition) ── */}
          {extraFields.map((field) => (
            <div key={field.id}>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">{field.label}</label>
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

          {/* ── 4. "<Module> Information" section — Status + Multi User (always shown) ── */}
          <div className="pt-2">
            <button
              type="button"
              className="flex items-center gap-2 mb-4 w-full text-left"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-slate-400"><path d="M19 9l-7 7-7-7"/></svg>
              <span className="text-slate-300 text-sm font-semibold">{module.name} Information</span>
            </button>

            <div className="space-y-4 pl-1">
              {/* Status */}
              <div>
                <label className="block text-slate-400 text-sm mb-1.5">Status</label>
                <div className="relative inline-block">
                  <select
                    value={draft[ZOHO_STATUS_ID] ?? 'Active'}
                    onChange={(e) => setValue(ZOHO_STATUS_ID, e.target.value)}
                    className="appearance-none bg-[#0b0000] border border-slate-600 rounded-lg pl-8 pr-8 py-2.5 text-white text-sm focus:outline-none focus:border-rose-600 cursor-pointer min-w-[160px]"
                  >
                    {ZOHO_STATUS_OPTIONS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                  {/* Green dot */}
                  <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-emerald-400 pointer-events-none" />
                  <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-slate-700 bg-[#0e0000]">
          <button
            onClick={handleAdd}
            disabled={saving || titleIsEmpty}
            className="px-5 py-2 rounded-lg bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white text-sm font-semibold transition-colors"
          >
            {saving ? 'Adding…' : 'Add'}
          </button>
          <button
            onClick={handleAddMore}
            disabled={saving || titleIsEmpty}
            className="px-5 py-2 rounded-lg border border-rose-700 hover:bg-rose-900/30 disabled:opacity-50 text-rose-300 text-sm font-medium transition-colors"
          >
            Add More
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white text-sm font-medium transition-colors"
          >
            Cancel
          </button>
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
  name:        200,
  text:        180,
  number:      100,
  date:        120,
  select:      140,
  multiuser:   160,
  attachment:  160,
};

/** Compute a sensible default width for a field */
function defaultColWidth(field: CustomField): number {
  // If label is very long, widen a bit
  const base = FIELD_DEFAULT_WIDTH[field.type] ?? 160;
  const labelBonus = Math.max(0, field.label.length - 10) * 5;
  return Math.min(base + labelBonus, 280);
}

// ─── Column-resize hook ───────────────────────────────────────────────────────

function useResizableColumns(fields: CustomField[]) {
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    fields.forEach((f) => { init[f.id] = defaultColWidth(f); });
    return init;
  });

  // Sync when fields change (new fields added / removed)
  useEffect(() => {
    setColWidths((prev) => {
      const next = { ...prev };
      fields.forEach((f) => {
        if (!(f.id in next)) next[f.id] = defaultColWidth(f);
      });
      return next;
    });
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
      dragging.current = null;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }

  function resetWidth(fieldId: string) {
    const field = fields.find((f) => f.id === fieldId);
    if (field) setColWidths((prev) => ({ ...prev, [fieldId]: defaultColWidth(field) }));
  }

  function resetAllWidths() {
    const next: Record<string, number> = {};
    fields.forEach((f) => { next[f.id] = defaultColWidth(f); });
    setColWidths(next);
  }

  function fitToContent(fieldId: string, records: CustomRecord[]) {
    const field = fields.find((f) => f.id === fieldId);
    if (!field) return;
    // Estimate content width based on max value length
    const maxLen = records.reduce((max, r) => {
      const val = r.data[fieldId];
      const len = val ? String(typeof val === 'object' ? val.name ?? '' : val).length : 0;
      return Math.max(max, len);
    }, field.label.length);
    // ~7px per char + padding
    const estimated = Math.max(80, Math.min(maxLen * 8 + 32, 400));
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

// ─── Sortable + Resizable column header ──────────────────────────────────────

interface SortableResizableThProps extends ResizableThProps {
  sortDir: 'asc' | 'desc' | null;
  onSort: () => void;
}

function SortableResizableTh({ field, width, onResizeStart, onFitToContent, onResetWidth, sortDir, onSort }: SortableResizableThProps) {
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

  const pillColor = TYPE_PILL_COLOR[field.type] ?? 'bg-slate-600/60 text-slate-300';

  return (
    <th
      style={{ width, minWidth: width, maxWidth: width, background: 'linear-gradient(180deg, #1a0005 0%, #130003 100%)' }}
      className="relative px-0 py-0 text-left select-none group/th"
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] z-20 transition-all duration-200"
        style={{ background: showMenu || sortDir ? 'linear-gradient(90deg, transparent, #fb7185 30%, #e11d48 70%, transparent)' : 'transparent' }}
      />
      <div className="absolute top-0 left-0 right-0 h-[2px] z-20 opacity-0 group-hover/th:opacity-100 transition-opacity duration-150"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(251,113,133,0.6) 30%, rgba(225,29,72,0.8) 70%, transparent)' }}
      />
      <div className="absolute inset-0 opacity-0 group-hover/th:opacity-100 transition-opacity duration-150 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(220,38,90,0.08) 0%, rgba(100,10,30,0.04) 100%)' }}
      />

      {/* Header content — click label to sort */}
      <div
        className="relative flex items-center gap-2 px-3 py-2.5 overflow-hidden cursor-pointer"
        onClick={onSort}
      >
        <span
          className={cn(
            'inline-flex items-center justify-center w-[18px] h-[18px] rounded flex-shrink-0 transition-all duration-150',
            showMenu ? 'bg-rose-700/60 text-rose-200' : pillColor,
          )}
          style={showMenu ? { boxShadow: '0 0 8px rgba(251,113,133,0.4)' } : undefined}
        >
          <FieldTypeIcon type={field.type} />
        </span>

        <span className="text-[11px] font-bold text-slate-300 group-hover/th:text-white uppercase tracking-widest truncate flex-1 transition-colors duration-150"
          style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>
          {field.label}
        </span>

        {/* Sort indicator */}
        {sortDir ? (
          <span className="flex-shrink-0 text-rose-400 text-[10px] font-black">
            {sortDir === 'asc' ? '↑' : '↓'}
          </span>
        ) : (
          <span className="flex-shrink-0 text-slate-700 text-[10px] opacity-0 group-hover/th:opacity-100 transition-opacity">↕</span>
        )}

        {/* Context menu trigger — stop click from triggering sort */}
        <button
          onMouseDown={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'flex-shrink-0 w-5 h-5 flex items-center justify-center rounded transition-all duration-150',
            showMenu
              ? 'opacity-100 text-rose-200'
              : 'opacity-0 group-hover/th:opacity-100 text-slate-400 hover:text-white',
          )}
          style={showMenu ? { background: 'rgba(225,29,72,0.4)', boxShadow: '0 0 6px rgba(251,113,133,0.3)' } : undefined}
          title="Column options"
        >
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </div>

      {/* Right divider */}
      <div className="absolute top-[20%] right-0 bottom-[20%] w-px pointer-events-none"
        style={{ background: 'linear-gradient(180deg, transparent, rgba(220,38,90,0.2) 40%, rgba(220,38,90,0.2) 60%, transparent)' }}
      />

      {/* Context menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 z-50 mt-1 w-52 rounded-lg shadow-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #1e0008, #160005)',
            border: '1px solid rgba(220,38,90,0.35)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(220,38,90,0.1)',
          }}
        >
          <div className="px-3 py-2 border-b border-rose-900/40" style={{ background: 'rgba(220,38,90,0.08)' }}>
            <p className="text-[10px] font-bold text-rose-300/70 uppercase tracking-widest truncate">{field.label}</p>
          </div>
          <div className="py-1">
            <button
              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-rose-900/30 hover:text-white transition-colors flex items-center gap-2.5"
              onMouseDown={(e) => { e.preventDefault(); onSort(); setShowMenu(false); }}
            >
              <span className="w-4 h-4 flex items-center justify-center text-slate-500 flex-shrink-0 text-sm">↑↓</span>
              Sort {sortDir === 'asc' ? 'Descending' : 'Ascending'}
            </button>
            <button
              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-rose-900/30 hover:text-white transition-colors flex items-center gap-2.5"
              onMouseDown={(e) => { e.preventDefault(); onFitToContent(); setShowMenu(false); }}
            >
              <span className="w-4 h-4 flex items-center justify-center text-slate-500 flex-shrink-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
              </span>
              Fit to Content
            </button>
            <button
              className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-rose-900/30 hover:text-white transition-colors flex items-center gap-2.5"
              onMouseDown={(e) => { e.preventDefault(); onResetWidth(); setShowMenu(false); }}
            >
              <span className="w-4 h-4 flex items-center justify-center text-slate-500 flex-shrink-0">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12h18M3 6h18M3 18h18"/>
                </svg>
              </span>
              Reset Width
            </button>
            <div className="mx-3 my-1 border-t border-rose-900/30" />
            <div className="px-3 py-1.5 flex items-center gap-2">
              <span className={cn('w-4 h-4 inline-flex items-center justify-center rounded flex-shrink-0', pillColor)}>
                <FieldTypeIcon type={field.type} />
              </span>
              <span className="text-[10px] text-slate-500 capitalize">{field.type} field</span>
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
}

function SelectableRecordRow({ record, fields, rowIndex, selected, onToggleSelect, onUpdate, onDelete }: SelectableRecordRowProps) {
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
    if (field.type === 'select') return <StatusBadge value={val} />;
    if (field.type === 'multiuser') {
      return val
        ? <span className="text-slate-300 text-sm">{val}</span>
        : <span className="text-slate-500">—</span>;
    }
    if (field.type === 'attachment') return <AttachmentCell val={val} />;
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
    return <span className={cn('text-sm', val ? 'text-slate-200' : 'text-slate-500')}>{val || '—'}</span>;
  }

  const isEven = rowIndex % 2 === 0;
  const rowBg = selected
    ? 'linear-gradient(135deg, rgba(220,38,90,0.18) 0%, rgba(120,5,30,0.25) 100%)'
    : isEven
      ? 'linear-gradient(135deg, rgba(18,0,4,0.95) 0%, rgba(10,0,2,0.98) 100%)'
      : 'linear-gradient(135deg, rgba(26,0,7,0.97) 0%, rgba(16,0,4,0.99) 100%)';

  return (
    <tr
      className="group transition-all duration-150"
      style={{
        background: rowBg,
        borderBottom: '1px solid rgba(80,5,25,0.4)',
      }}
      onMouseEnter={(e) => {
        if (!selected) {
          (e.currentTarget as HTMLElement).style.background =
            'linear-gradient(135deg, rgba(220,38,90,0.13) 0%, rgba(40,3,12,0.97) 50%, rgba(20,0,5,0.95) 100%)';
        }
        (e.currentTarget as HTMLElement).style.borderBottomColor = 'rgba(220,38,90,0.5)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'inset 3px 0 0 rgba(220,38,90,0.6), 0 1px 12px rgba(220,38,90,0.08)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = rowBg;
        (e.currentTarget as HTMLElement).style.borderBottomColor = 'rgba(80,5,25,0.4)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
    >
      {/* Checkbox */}
      <td
        className="px-0 py-0 w-9 text-center select-none"
        style={{ borderRight: '1px solid rgba(80,5,25,0.5)' }}
        onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
      >
        <span className="flex items-center justify-center py-4">
          <StyledCheckbox checked={selected} onChange={onToggleSelect} />
        </span>
      </td>

      {/* Row number */}
      <td
        className="px-0 py-0 w-10 text-center select-none tabular-nums"
        style={{ borderRight: '1px solid rgba(80,5,25,0.5)' }}
      >
        <span
          className="flex items-center justify-center h-full py-4 text-[10px] font-mono font-black tracking-wider"
          style={{ color: 'rgba(220,38,90,0.45)', textShadow: '0 0 10px rgba(220,38,90,0.3)' }}
        >
          {String(rowIndex + 1).padStart(2, '0')}
        </span>
      </td>

      {fields.map((field, fIdx) => (
        <td
          key={field.id}
          className="px-0 py-0 cursor-pointer relative overflow-hidden"
          style={{ borderRight: fIdx < fields.length - 1 ? '1px solid rgba(60,5,20,0.5)' : 'none' }}
          onClick={() => setEditingCell(field.id)}
        >
          {editingCell === field.id && (
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: 'rgba(220,38,90,0.1)', boxShadow: 'inset 0 0 0 2px rgba(220,38,90,0.5)' }}
            />
          )}
          <div className="relative px-3 py-4">
            {editingCell === field.id ? (
              <CellEditor
                field={field}
                value={data[field.id] ?? ''}
                onCommit={(v) => commitCell(field.id, v)}
                onCancel={() => setEditingCell(null)}
              />
            ) : renderCellValue(field)}
          </div>
        </td>
      ))}

      {/* Delete */}
      <td className="px-2 py-0 w-8" style={{ borderLeft: '1px solid rgba(60,5,20,0.5)' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all duration-150"
          style={{ color: 'rgba(150,80,100,0.6)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#fca5a5'; e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.boxShadow = '0 0 8px rgba(239,68,68,0.2)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(150,80,100,0.6)'; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.boxShadow = 'none'; }}
          title="Delete record"
        >
          <TrashIcon />
        </button>
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
  const [showEntryDrawer, setShowEntryDrawer] = useState(false);

  // ── Search & Sort ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  type SortDir = 'asc' | 'desc';
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // ── Bulk Select ────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const { colWidths, onResizeStart, resetWidth, resetAllWidths, fitToContent } =
    useResizableColumns(module.fields);

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
  }, [records, searchQuery, sortCol, sortDir, module.fields]);

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
      {/* Module header */}
      <div className="flex items-center justify-between mb-3 px-1 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-rose-700 flex-shrink-0" />
          <h2 className="text-white font-semibold text-base">{module.name}</h2>
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(220,38,90,0.15)', color: '#fb7185', border: '1px solid rgba(220,38,90,0.25)' }}
          >
            {records.length}
          </span>
          {searchQuery && (
            <span className="text-slate-500 text-xs">
              · {filteredSortedRecords.length} match{filteredSortedRecords.length !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search bar */}
          <div className="relative">
            <svg
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              ref={searchRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search… ( / )'
              className="pl-7 pr-7 py-1.5 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none transition-all w-44 focus:w-56"
              style={{
                background: 'rgba(220,38,90,0.06)',
                border: '1px solid rgba(220,38,90,0.2)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'rgba(220,38,90,0.5)'; e.currentTarget.style.background = 'rgba(220,38,90,0.1)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(220,38,90,0.2)'; e.currentTarget.style.background = 'rgba(220,38,90,0.06)'; }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                <XIcon />
              </button>
            )}
          </div>

          {/* Bulk delete (shown only when items selected) */}
          {someSelected && (
            <button
              onClick={() => setConfirmBulkDelete(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-red-400 hover:text-white hover:bg-red-900/30 text-xs transition-colors"
              style={{ border: '1px solid rgba(220,38,90,0.3)' }}
            >
              <TrashIcon /> Delete {selectedIds.size}
            </button>
          )}

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 text-xs transition-colors"
            title="Export to CSV"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export
          </button>

          <button
            onClick={() => setShowEntryDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-700 text-white text-xs font-medium transition-colors"
            title="New entry (press N)"
          >
            <PlusIcon /> New Entry
          </button>
          <button
            onClick={resetAllWidths}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 text-xs transition-colors"
            title="Reset all column widths"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            Fit Cols
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 text-xs transition-colors"
            title="Edit module name & fields"
          >
            <EditIcon /> Edit
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 text-xs transition-colors"
            title="Field settings"
          >
            <SettingsIcon /> Fields
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-900/20 text-xs transition-colors"
            title="Delete module"
          >
            <TrashIcon /> Delete
          </button>
        </div>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl overflow-auto max-h-[calc(100vh-230px)]"
        style={{
          border: '1px solid rgba(140,10,40,0.4)',
          background: 'linear-gradient(160deg, #0d0002 0%, #080001 100%)',
          boxShadow:
            '0 8px 48px rgba(0,0,0,0.7), 0 2px 0 rgba(220,38,90,0.06), inset 0 1px 0 rgba(255,255,255,0.03)',
        }}
      >
        <table style={{ width: totalWidth, minWidth: '100%', tableLayout: 'fixed' }}>
          {/* colgroup for explicit widths */}
          <colgroup>
            {/* Checkbox col */}
            <col style={{ width: 36, minWidth: 36 }} />
            <col style={{ width: 40, minWidth: 40 }} />
            {module.fields.map((f) => (
              <col key={f.id} style={{ width: colWidths[f.id] ?? defaultColWidth(f), minWidth: colWidths[f.id] ?? defaultColWidth(f) }} />
            ))}
            <col style={{ width: 40, minWidth: 40 }} />
          </colgroup>

          <thead className="sticky top-0 z-10">
            <tr
              style={{
                background: 'linear-gradient(180deg, #200008 0%, #160004 50%, #0f0002 100%)',
                borderBottom: '1px solid rgba(220,38,90,0.3)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.6), 0 1px 0 rgba(220,38,90,0.15)',
              }}
            >
              {/* Checkbox header */}
              <th
                className="px-0 py-0 text-center select-none"
                style={{
                  background: 'linear-gradient(180deg, #200008 0%, #160004 100%)',
                  borderRight: '1px solid rgba(60,5,18,0.5)',
                  width: 36, minWidth: 36,
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
              {/* Row # column */}
              <th
                className="px-0 py-0 text-center select-none"
                style={{
                  background: 'linear-gradient(180deg, #200008 0%, #160004 100%)',
                  borderRight: '1px solid rgba(60,5,18,0.5)',
                  width: 40,
                  minWidth: 40,
                }}
              >
                <span
                  className="flex items-center justify-center py-3 text-[9px] font-black uppercase tracking-[0.25em]"
                  style={{ color: 'rgba(220,38,90,0.4)', textShadow: '0 0 10px rgba(220,38,90,0.2)' }}
                >
                  #
                </span>
              </th>
              {module.fields.map((field) => (
                <SortableResizableTh
                  key={field.id}
                  field={field}
                  width={colWidths[field.id] ?? defaultColWidth(field)}
                  onResizeStart={(e) => onResizeStart(e, field.id)}
                  onFitToContent={() => fitToContent(field.id, records)}
                  onResetWidth={() => resetWidth(field.id)}
                  sortDir={sortCol === field.id ? sortDir : null}
                  onSort={() => handleSortClick(field.id)}
                />
              ))}
              <th style={{ background: 'linear-gradient(180deg, #200008 0%, #160004 100%)', width: 40, minWidth: 40 }} />
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
                  fields={module.fields}
                  rowIndex={idx}
                  selected={selectedIds.has(record.id)}
                  onToggleSelect={() => toggleSelect(record.id)}
                  onUpdate={(data) => handleUpdateRecord(record, data)}
                  onDelete={() => handleDeleteRecord(record)}
                />
              ))
            )}
            <AddRecordRow fields={module.fields} moduleName={module.name} onOpenDrawer={() => setShowEntryDrawer(true)} />
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
    </>
  );
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
        if (data.length > 0 && !activeModuleId) setActiveModuleId(data[0].id);
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

          {/* Module tabs — scrollable, underline style */}
          <nav
            className="flex items-stretch gap-0 overflow-x-auto flex-1 min-w-0"
            style={{ scrollbarWidth: 'none' }}
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
              modules.map((m) => {
                const isActive = m.id === activeModuleId;
                return (
                  <button
                    key={m.id}
                    onClick={() => setActiveModuleId(m.id)}
                    className={cn(
                      'group/tab relative flex items-center gap-2 px-4 text-[13px] font-medium transition-all duration-150 whitespace-nowrap flex-shrink-0 select-none',
                      isActive
                        ? 'text-white'
                        : 'text-slate-500 hover:text-slate-300',
                    )}
                  >
                    {/* Active: pill background */}
                    {isActive && (
                      <span
                        className="absolute inset-x-0 inset-y-[6px] rounded-lg pointer-events-none"
                        style={{
                          background: 'linear-gradient(180deg, rgba(220,38,90,0.18) 0%, rgba(150,10,40,0.1) 100%)',
                          border: '1px solid rgba(220,38,90,0.22)',
                        }}
                      />
                    )}
                    {/* Hover: subtle bg for inactive */}
                    {!isActive && (
                      <span className="absolute inset-0 rounded-none bg-white/0 group-hover/tab:bg-white/[0.03] transition-colors pointer-events-none" />
                    )}

                    {/* Status dot */}
                    <span
                      className="relative w-[7px] h-[7px] rounded-full flex-shrink-0 transition-all duration-200"
                      style={
                        isActive
                          ? { background: 'radial-gradient(circle, #fb7185 0%, #e11d48 100%)', boxShadow: '0 0 6px rgba(251,113,133,0.7)' }
                          : { background: '#374151' }
                      }
                    />

                    {/* Label */}
                    <span className="relative font-semibold tracking-tight">{m.name}</span>

                    {/* Bottom active bar */}
                    {isActive && (
                      <span
                        className="absolute bottom-0 left-3 right-3 h-[2px] rounded-t-full"
                        style={{
                          background: 'linear-gradient(90deg, transparent, #fb7185 30%, #e11d48 70%, transparent)',
                          boxShadow: '0 0 8px rgba(251,113,133,0.5)',
                        }}
                      />
                    )}
                  </button>
                );
              })
            )}
          </nav>

          {/* Divider + New Module button */}
          <div className="flex items-center gap-0 flex-shrink-0 pl-2 border-l border-rose-900/30 ml-1">
            <button
              onClick={() => setShowNewModal(true)}
              className="group/new flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 relative overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, rgba(220,38,90,0.2) 0%, rgba(100,10,30,0.3) 100%)',
                border: '1px solid rgba(220,38,90,0.3)',
                color: '#fda4af',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(220,38,90,0.35) 0%, rgba(120,10,35,0.45) 100%)';
                e.currentTarget.style.borderColor = 'rgba(220,38,90,0.55)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(145deg, rgba(220,38,90,0.2) 0%, rgba(100,10,30,0.3) 100%)';
                e.currentTarget.style.borderColor = 'rgba(220,38,90,0.3)';
                e.currentTarget.style.color = '#fda4af';
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span>New Module</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Main content area ── */}
      <main className="flex-1 overflow-auto p-6">
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
