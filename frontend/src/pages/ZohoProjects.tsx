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

function StatusBadge({ value }: { value: string }) {
  const color = BADGE_COLORS[value] ?? 'bg-slate-700/80 text-slate-300 border border-slate-600';
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', color)}>
      {value || '—'}
    </span>
  );
}

// Avatar circle for a name string
function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'md' }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  // Pick a colour from a palette based on char codes
  const PALETTES = [
    'bg-rose-700', 'bg-violet-700', 'bg-blue-700', 'bg-cyan-700',
    'bg-emerald-700', 'bg-amber-700', 'bg-orange-700', 'bg-pink-700',
  ];
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % PALETTES.length;
  const szClass = size === 'md' ? 'w-9 h-9 text-sm' : 'w-7 h-7 text-xs';
  return (
    <span className={cn('inline-flex items-center justify-center rounded-full font-bold text-white flex-shrink-0', PALETTES[idx], szClass)}>
      {initials || '?'}
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
  onClose: () => void;
  onCreated: (m: CustomModule) => void;
}

function NewModuleModal({ onClose, onCreated }: NewModuleModalProps) {
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
      const created = await CustomModulesAPI.create(name.trim(), fields);
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
  module: CustomModule;
  onClose: () => void;
  onSaved: (m: CustomModule) => void;
}

function EditModuleModal({ module, onClose, onSaved }: EditModuleModalProps) {
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
      const updated = await CustomModulesAPI.update(module.id, {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#120000] border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-white font-semibold text-lg flex items-center gap-2">
            <EditIcon />
            Edit Module
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><XIcon /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700 flex-shrink-0">
          <button
            onClick={() => setActiveTab('info')}
            className={cn(
              'px-5 py-2.5 text-sm font-medium transition-colors border-b-2',
              activeTab === 'info'
                ? 'border-rose-600 text-rose-300'
                : 'border-transparent text-slate-400 hover:text-white'
            )}
          >
            Module Info
          </button>
          <button
            onClick={() => setActiveTab('fields')}
            className={cn(
              'px-5 py-2.5 text-sm font-medium transition-colors border-b-2',
              activeTab === 'fields'
                ? 'border-rose-600 text-rose-300'
                : 'border-transparent text-slate-400 hover:text-white'
            )}
          >
            Fields <span className="ml-1 text-xs bg-slate-700 text-slate-300 rounded-full px-1.5 py-0.5">{fields.length}</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {activeTab === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs mb-1.5 font-medium uppercase tracking-wide">Module Name</label>
                <input
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                  placeholder="Module name"
                  className="w-full bg-[#0a0000] border border-slate-600 rounded-lg px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-700 transition-colors"
                />
              </div>
              <div className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/50">
                <p className="text-slate-400 text-xs">
                  <span className="text-slate-300 font-medium">ID:</span> {module.id}
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  <span className="text-slate-300 font-medium">Fields:</span> {fields.length} &nbsp;•&nbsp;
                  <span className="text-slate-300 font-medium">Created:</span> {new Date(Number(module.createdAt)).toLocaleDateString()}
                </p>
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
                  className={cn(
                    'flex flex-col gap-1.5 rounded-lg px-2 py-1.5 transition-colors',
                    dragOverIndex === idx
                      ? 'bg-rose-900/25 border border-rose-700/50'
                      : 'border border-transparent hover:bg-slate-800/30',
                  )}
                >
                  <div className="flex gap-2 items-center">
                    {/* Drag handle — now functional */}
                    <div className="flex flex-col gap-0.5 cursor-grab active:cursor-grabbing text-slate-500 hover:text-rose-400 flex-shrink-0 pt-0.5 transition-colors">
                      <div className="w-3.5 h-0.5 bg-current rounded" />
                      <div className="w-3.5 h-0.5 bg-current rounded" />
                      <div className="w-3.5 h-0.5 bg-current rounded" />
                    </div>
                    <span className="text-slate-500 text-xs w-5 text-center flex-shrink-0">{idx + 1}</span>
                    <input
                      value={field.label}
                      onChange={(e) => updateField(idx, { label: e.target.value })}
                      placeholder="Field label"
                      className="flex-1 bg-[#0a0000] border border-slate-600 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-700"
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
                      className="bg-[#0a0000] border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-rose-700 w-36"
                    >
                      {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
                        <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => removeField(idx)}
                      disabled={fields.length <= 1}
                      className="p-1.5 text-slate-500 hover:text-red-400 disabled:opacity-30 transition-colors flex-shrink-0"
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
                className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors mt-3 pt-2 border-t border-slate-700/50 w-full"
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

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-700 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-lg bg-rose-800 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-medium transition-colors"
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
  return <EditModuleModal module={module} onClose={onClose} onSaved={onSaved} />;
}

// ─── Inline cell editor ───────────────────────────────────────────────────────

interface CellEditorProps {
  field: CustomField;
  value: any;
  onCommit: (value: any) => void;
  onCancel: () => void;
}

function CellEditor({ field, value, onCommit, onCancel }: CellEditorProps) {
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
              const result = await CustomModulesAPI.uploadAttachment(file);
              onCommit({ name: result.name, url: result.url, type: result.type, size: result.size });
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

// ─── Record row ───────────────────────────────────────────────────────────────

interface RecordRowProps {
  record: CustomRecord;
  fields: CustomField[];
  rowIndex: number;
  onUpdate: (data: Record<string, any>) => void;
  onDelete: () => void;
}

function RecordRow({ record, fields, rowIndex, onUpdate, onDelete }: RecordRowProps) {
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
      return (
        <span className="inline-flex items-center gap-1.5">
          {val ? (
            <>
              <Avatar name={String(val)} size="sm" />
              <span className="text-slate-300 text-sm">{val}</span>
            </>
          ) : <span className="text-slate-500">—</span>}
        </span>
      );
    }
    if (field.type === 'attachment') {
      return <AttachmentCell val={val} />;
    }
    // Name fields get an avatar prefix
    const isNameField = /name/i.test(field.label);
    if (isNameField && val) {
      return (
        <span className="inline-flex items-center gap-2">
          <Avatar name={String(val)} size="sm" />
          <span className="text-sm text-slate-200">{val}</span>
        </span>
      );
    }
    return <span className={cn('text-sm', val ? 'text-slate-200' : 'text-slate-500')}>{val || '—'}</span>;
  }

  return (
    <tr className="group border-b border-slate-700/50 hover:bg-slate-800/40 transition-colors">
      {/* Row number */}
      <td className="px-3 py-2.5 w-10 text-center text-xs text-slate-600 select-none tabular-nums">
        {rowIndex + 1}
      </td>
      {fields.map((field) => (
        <td
          key={field.id}
          className="px-4 py-2.5 cursor-pointer relative"
          onClick={() => setEditingCell(field.id)}
        >
          {editingCell === field.id ? (
            <CellEditor
              field={field}
              value={data[field.id] ?? ''}
              onCommit={(v) => commitCell(field.id, v)}
              onCancel={() => setEditingCell(null)}
            />
          ) : renderCellValue(field)}
        </td>
      ))}

      {/* Delete action */}
      <td className="px-3 py-2.5 w-8">
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-red-400 transition-all"
          title="Delete record"
        >
          <TrashIcon />
        </button>
      </td>
    </tr>
  );
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
  module: CustomModule;
  onClose: () => void;
  onAdd: (data: Record<string, any>) => void;
  onAddMore: (data: Record<string, any>) => void;
}

function NewEntryDrawer({ module, onClose, onAdd, onAddMore }: NewEntryDrawerProps) {
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
                          const result = await CustomModulesAPI.uploadAttachment(file);
                          // Replace with the real Stratus URL
                          setValue(field.id, { name: result.name, url: result.url, type: result.type, size: result.size, _preview: previewUrl });
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
      {/* +2: one for row number column, one for the action column */}
      <td colSpan={fields.length + 2} className="px-4 py-2">
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

function ResizableTh({ field, width, onResizeStart, onFitToContent, onResetWidth }: ResizableThProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!showMenu) return;
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [showMenu]);

  // Field type icon
  const TYPE_ICONS: Partial<Record<FieldType, string>> = {
    text: 'T',
    number: '#',
    date: '📅',
    select: '▾',
    multiuser: '👤',
    attachment: '📎',
  };

  return (
    <th
      style={{ width, minWidth: width, maxWidth: width }}
      className="relative px-3 py-0 text-left bg-[#100000] select-none group/th"
    >
      <div className="flex items-center gap-1.5 py-3 overflow-hidden">
        {/* Type icon */}
        <span className="text-slate-600 text-[10px] font-mono flex-shrink-0 leading-none">
          {TYPE_ICONS[field.type] ?? 'T'}
        </span>
        {/* Label */}
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide truncate flex-1">
          {field.label}
        </span>
        {/* Context menu trigger (chevron) */}
        <button
          onMouseDown={(e) => { e.stopPropagation(); setShowMenu((v) => !v); }}
          className="opacity-0 group-hover/th:opacity-100 flex-shrink-0 text-slate-500 hover:text-slate-300 transition-opacity"
          title="Column options"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M6 9l6 6 6-6" /></svg>
        </button>
      </div>

      {/* Context menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 z-50 mt-1 w-44 bg-[#1a0000] border border-slate-700 rounded-lg shadow-xl overflow-hidden"
        >
          <button
            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-rose-900/30 hover:text-white transition-colors flex items-center gap-2"
            onMouseDown={(e) => { e.preventDefault(); onFitToContent(); setShowMenu(false); }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
            Fit to Content
          </button>
          <button
            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-rose-900/30 hover:text-white transition-colors flex items-center gap-2"
            onMouseDown={(e) => { e.preventDefault(); onResetWidth(); setShowMenu(false); }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            Reset Width
          </button>
        </div>
      )}

      {/* Drag resize handle */}
      <div
        onMouseDown={onResizeStart}
        className="absolute top-0 right-0 bottom-0 w-1 cursor-col-resize group-hover/th:bg-rose-800/60 hover:!bg-rose-600 transition-colors z-10"
        title="Drag to resize"
      />
    </th>
  );
}

// ─── Module Table view ────────────────────────────────────────────────────────

interface ModuleTableProps {
  module: CustomModule;
  onModuleUpdated: (m: CustomModule) => void;
  onModuleDeleted: (id: string) => void;
}

function ModuleTable({ module, onModuleUpdated, onModuleDeleted }: ModuleTableProps) {
  const [records, setRecords] = useState<CustomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showEntryDrawer, setShowEntryDrawer] = useState(false);

  const { colWidths, onResizeStart, resetWidth, resetAllWidths, fitToContent } =
    useResizableColumns(module.fields);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await CustomModulesAPI.listRecords(module.id);
      setRecords(data);
    } finally {
      setLoading(false);
    }
  }, [module.id]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  async function handleAddRecord(data: Record<string, any>) {
    const created = await CustomModulesAPI.createRecord(module.id, data);
    setRecords((r) => [...r, created]);
  }

  async function handleUpdateRecord(record: CustomRecord, data: Record<string, any>) {
    const updated = await CustomModulesAPI.updateRecord(module.id, record.id, data);
    setRecords((r) => r.map((x) => (x.id === record.id ? updated : x)));
  }

  async function handleDeleteRecord(record: CustomRecord) {
    await CustomModulesAPI.deleteRecord(module.id, record.id);
    setRecords((r) => r.filter((x) => x.id !== record.id));
  }

  async function handleDeleteModule() {
    await CustomModulesAPI.remove(module.id);
    onModuleDeleted(module.id);
  }

  // Total table width for colgroup
  const totalWidth = useMemo(() => {
    return 40 + module.fields.reduce((sum, f) => sum + (colWidths[f.id] ?? defaultColWidth(f)), 0) + 40;
  }, [colWidths, module.fields]);

  return (
    <>
      {/* Module header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-rose-700" />
          <h2 className="text-white font-semibold text-base">{module.name}</h2>
          <span className="text-slate-500 text-xs">({records.length} records)</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEntryDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-700 text-white text-xs font-medium transition-colors"
          >
            <PlusIcon /> New Entry
          </button>
          <button
            onClick={resetAllWidths}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 text-xs transition-colors"
            title="Reset all column widths"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
            Fit Columns
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
      <div className="rounded-xl border border-slate-700/60 overflow-auto bg-[#0c0000] max-h-[calc(100vh-220px)]">
        <table style={{ width: totalWidth, minWidth: '100%', tableLayout: 'fixed' }}>
          {/* colgroup for explicit widths */}
          <colgroup>
            <col style={{ width: 40, minWidth: 40 }} />
            {module.fields.map((f) => (
              <col key={f.id} style={{ width: colWidths[f.id] ?? defaultColWidth(f), minWidth: colWidths[f.id] ?? defaultColWidth(f) }} />
            ))}
            <col style={{ width: 40, minWidth: 40 }} />
          </colgroup>

          <thead className="sticky top-0 z-10">
            <tr className="border-b border-slate-700 bg-[#100000]">
              {/* Row # column */}
              <th className="px-3 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wide select-none bg-[#100000]">
                #
              </th>
              {module.fields.map((field) => (
                <ResizableTh
                  key={field.id}
                  field={field}
                  width={colWidths[field.id] ?? defaultColWidth(field)}
                  onResizeStart={(e) => onResizeStart(e, field.id)}
                  onFitToContent={() => fitToContent(field.id, records)}
                  onResetWidth={() => resetWidth(field.id)}
                />
              ))}
              <th className="bg-[#100000]" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={module.fields.length + 2} className="px-4 py-8 text-center text-slate-500 text-sm">Loading…</td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={module.fields.length + 2} className="px-4 py-10 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-500">
                        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
                      </svg>
                    </div>
                    <p className="text-slate-500 text-sm">No records yet.</p>
                    <button
                      onClick={() => setShowEntryDrawer(true)}
                      className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors"
                    >
                      <PlusIcon /> Add first {module.name}
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              records.map((record, idx) => (
                <RecordRow
                  key={record.id}
                  record={record}
                  fields={module.fields}
                  rowIndex={idx}
                  onUpdate={(data) => handleUpdateRecord(record, data)}
                  onDelete={() => handleDeleteRecord(record)}
                />
              ))
            )}
            <AddRecordRow fields={module.fields} moduleName={module.name} onOpenDrawer={() => setShowEntryDrawer(true)} />
          </tbody>
        </table>
      </div>

      {/* Edit module modal (rename + fields) */}
      {showEditModal && (
        <EditModuleModal
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

      {/* Confirm delete */}
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

      {/* New Entry Drawer */}
      {showEntryDrawer && (
        <NewEntryDrawer
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
    CustomModulesAPI.list()
      .then((data) => {
        setModules(data);
        if (data.length > 0 && !activeModuleId) setActiveModuleId(data[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

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
      <div className="flex-shrink-0 border-b border-slate-800" style={{ background: 'linear-gradient(180deg, #130000 0%, #0e0000 100%)' }}>
        <div className="flex items-stretch px-4 gap-0 h-12">

          {/* Page label — left anchor */}
          <div className="flex items-center pr-4 mr-2 border-r border-slate-700/50 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-rose-900/60 border border-rose-800/60 flex items-center justify-center flex-shrink-0">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-rose-400">
                  <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  <rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>
                </svg>
              </div>
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                Modules
              </span>
            </div>
          </div>

          {/* Module tabs — scrollable, underline style */}
          <nav
            className="flex items-stretch gap-0 overflow-x-auto flex-1 min-w-0"
            style={{ scrollbarWidth: 'none' }}
          >
            {loading ? (
              <div className="flex items-center gap-2 px-3 text-slate-500 text-xs">
                <div className="w-3 h-3 rounded-full border-2 border-rose-800 border-t-transparent animate-spin" />
                Loading modules…
              </div>
            ) : modules.length === 0 ? (
              <div className="flex items-center px-3 text-slate-600 text-xs italic">
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
                      'relative flex items-center gap-2 px-4 text-sm font-medium transition-all whitespace-nowrap flex-shrink-0 select-none',
                      isActive
                        ? 'text-rose-200'
                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/[0.03]',
                    )}
                  >
                    {/* Active: tinted background strip */}
                    {isActive && (
                      <span className="absolute inset-0 bg-rose-900/20 border-x border-slate-700/30" />
                    )}
                    {/* Dot */}
                    <span className={cn(
                      'relative w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors',
                      isActive ? 'bg-rose-400' : 'bg-slate-700',
                    )} />
                    {/* Label */}
                    <span className="relative">{m.name}</span>
                    {/* Bottom active bar */}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-600 via-rose-400 to-rose-600" />
                    )}
                  </button>
                );
              })
            )}
          </nav>

          {/* Spacer */}
          <div className="flex-shrink-0 w-2" />

          {/* New Module button */}
          <div className="flex items-center flex-shrink-0">
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all
                         bg-rose-900/50 hover:bg-rose-800/80 text-rose-200 hover:text-white
                         border border-rose-800/60 hover:border-rose-600/80 shadow-sm"
            >
              <PlusIcon />
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
          onClose={() => setShowNewModal(false)}
          onCreated={handleModuleCreated}
        />
      )}
    </div>
  );
}
