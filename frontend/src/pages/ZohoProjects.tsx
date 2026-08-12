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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  CustomModulesAPI,
  type CustomField,
  type CustomModule,
  type CustomRecord,
} from '../api';

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
};

// ─── Status badge colours ────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  'Not Started': 'bg-slate-700 text-slate-300',
  'In Progress': 'bg-blue-900 text-blue-300',
  'Done': 'bg-emerald-900 text-emerald-300',
  'Blocked': 'bg-red-900 text-red-300',
  'Review': 'bg-rose-900 text-rose-300',
};

function StatusBadge({ value }: { value: string }) {
  const color = STATUS_COLORS[value] ?? 'bg-slate-700 text-slate-300';
  return (
    <span className={cn('inline-block px-2 py-0.5 rounded text-xs font-medium', color)}>
      {value || '—'}
    </span>
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
      <div className="bg-[#1e2130] border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg">
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
                <div key={field.id} className="flex gap-2 items-start">
                  <input
                    value={field.label}
                    onChange={(e) => updateField(idx, { label: e.target.value })}
                    placeholder="Field label"
                    className="flex-1 bg-[#151827] border border-slate-600 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-700"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateField(idx, { type: e.target.value as FieldType })}
                    className="bg-[#151827] border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-rose-700"
                  >
                    {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
                      <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => removeField(idx)}
                    disabled={fields.length <= 1}
                    className="p-1.5 text-slate-500 hover:text-red-400 disabled:opacity-30 transition-colors mt-0.5"
                  >
                    <TrashIcon />
                  </button>
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

// ─── Field Settings Modal (edit module fields) ────────────────────────────────

interface FieldSettingsModalProps {
  module: CustomModule;
  onClose: () => void;
  onSaved: (m: CustomModule) => void;
}

function FieldSettingsModal({ module, onClose, onSaved }: FieldSettingsModalProps) {
  const [fields, setFields] = useState<CustomField[]>(module.fields);
  const [saving, setSaving] = useState(false);

  function addField() {
    setFields((f) => [...f, { id: uuidv4(), label: '', type: 'text' }]);
  }

  function updateField(idx: number, patch: Partial<CustomField>) {
    setFields((f) => f.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  }

  function removeField(idx: number) {
    setFields((f) => f.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await CustomModulesAPI.update(module.id, { fields });
      onSaved(updated);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#1e2130] border border-slate-700 rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-white font-semibold text-lg">Fields — {module.name}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><XIcon /></button>
        </div>

        <div className="px-6 py-4 space-y-2 max-h-96 overflow-y-auto">
          {fields.map((field, idx) => (
            <div key={field.id} className="flex gap-2 items-start">
              <input
                value={field.label}
                onChange={(e) => updateField(idx, { label: e.target.value })}
                placeholder="Field label"
                className="flex-1 bg-[#151827] border border-slate-600 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-700"
              />
              <select
                value={field.type}
                onChange={(e) => updateField(idx, { type: e.target.value as FieldType })}
                className="bg-[#151827] border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-rose-700"
              >
                {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((t) => (
                  <option key={t} value={t}>{FIELD_TYPE_LABELS[t]}</option>
                ))}
              </select>
              <button
                onClick={() => removeField(idx)}
                disabled={fields.length <= 1}
                className="p-1.5 text-slate-500 hover:text-red-400 disabled:opacity-30 transition-colors mt-0.5"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>

        <div className="px-6 pb-2">
          <button onClick={addField} className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors">
            <PlusIcon /> Add field
          </button>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-700">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 rounded-lg bg-rose-800 hover:bg-rose-700 disabled:opacity-60 text-white text-sm font-medium">
            {saving ? 'Saving…' : 'Save Fields'}
          </button>
        </div>
      </div>
    </div>
  );
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
        className="w-full bg-[#1e2130] border border-rose-700 rounded px-2 py-1 text-white text-sm focus:outline-none"
      >
        <option value="">— select —</option>
        {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
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
      className="w-full bg-[#1e2130] border border-rose-700 rounded px-2 py-1 text-white text-sm focus:outline-none"
    />
  );
}

// ─── Record row ───────────────────────────────────────────────────────────────

interface RecordRowProps {
  record: CustomRecord;
  fields: CustomField[];
  onUpdate: (data: Record<string, any>) => void;
  onDelete: () => void;
}

function RecordRow({ record, fields, onUpdate, onDelete }: RecordRowProps) {
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
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-rose-800 text-white text-xs font-bold uppercase">
              {String(val)[0]}
            </span>
          ) : <span className="text-slate-500">—</span>}
          {val && <span className="text-slate-300 text-sm">{val}</span>}
        </span>
      );
    }
    return <span className={cn('text-sm', val ? 'text-slate-200' : 'text-slate-500')}>{val || '—'}</span>;
  }

  return (
    <tr className="group border-b border-slate-700/50 hover:bg-slate-800/40 transition-colors">
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

// ─── Add-Record inline row ────────────────────────────────────────────────────

interface AddRecordRowProps {
  fields: CustomField[];
  moduleName: string;
  onAdd: (data: Record<string, any>) => void;
}

function AddRecordRow({ fields, moduleName, onAdd }: AddRecordRowProps) {
  const [active, setActive] = useState(false);
  const [draft, setDraft] = useState<Record<string, any>>({});

  function handleAdd() {
    onAdd({ ...draft });
    setDraft({});
    setActive(false);
  }

  if (!active) {
    return (
      <tr>
        <td colSpan={fields.length + 1} className="px-4 py-2">
          <button
            onClick={() => setActive(true)}
            className="flex items-center gap-2 text-slate-500 hover:text-rose-400 text-sm transition-colors"
          >
            <PlusIcon /> Add {moduleName}
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-slate-700/50 bg-slate-800/30">
      {fields.map((field) => (
        <td key={field.id} className="px-4 py-2">
          {field.type === 'select' ? (
            <select
              value={draft[field.id] ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, [field.id]: e.target.value }))}
              className="w-full bg-[#151827] border border-slate-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-rose-700"
            >
              <option value="">— select —</option>
              {(field.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              autoFocus={field === fields[0]}
              type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
              value={draft[field.id] ?? ''}
              placeholder={field.label}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') setActive(false); }}
              onChange={(e) => setDraft((d) => ({ ...d, [field.id]: e.target.value }))}
              className="w-full bg-[#151827] border border-slate-600 rounded px-2 py-1 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-rose-700"
            />
          )}
        </td>
      ))}
      <td className="px-2 py-2">
        <div className="flex gap-1">
          <button onClick={handleAdd} className="px-2 py-1 bg-rose-800 hover:bg-rose-700 text-white rounded text-xs font-medium transition-colors">Add</button>
          <button onClick={() => setActive(false)} className="px-2 py-1 text-slate-400 hover:text-white rounded text-xs transition-colors">✕</button>
        </div>
      </td>
    </tr>
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
  const [confirmDelete, setConfirmDelete] = useState(false);

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
      <div className="rounded-xl border border-slate-700/60 overflow-hidden bg-[#181c2a]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700 bg-[#1a1f30]">
              {module.fields.map((field) => (
                <th key={field.id} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  {field.label}
                  <span className="ml-1.5 text-slate-600 font-normal normal-case">{FIELD_TYPE_LABELS[field.type]}</span>
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={module.fields.length + 1} className="px-4 py-8 text-center text-slate-500 text-sm">Loading…</td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={module.fields.length + 1} className="px-4 py-8 text-center text-slate-500 text-sm">
                  No records yet. Click <strong className="text-slate-400">Add {module.name}</strong> below to get started.
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <RecordRow
                  key={record.id}
                  record={record}
                  fields={module.fields}
                  onUpdate={(data) => handleUpdateRecord(record, data)}
                  onDelete={() => handleDeleteRecord(record)}
                />
              ))
            )}
            <AddRecordRow fields={module.fields} moduleName={module.name} onAdd={handleAddRecord} />
          </tbody>
        </table>
      </div>

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
          <div className="bg-[#1e2130] border border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-white font-semibold text-base mb-2">Delete "{module.name}"?</h3>
            <p className="text-slate-400 text-sm mb-5">All {records.length} records will be permanently deleted. This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-sm text-slate-300 hover:text-white">Cancel</button>
              <button onClick={handleDeleteModule} className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CustomModulesPage() {
  const [modules, setModules] = useState<CustomModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModuleId, setActiveModuleId] = useState<string | null>(null);
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
    <div className="flex h-full bg-[#141726] text-white">
      {/* ── Left sidebar — module list ── */}
      <aside className="w-56 border-r border-slate-700/60 flex flex-col bg-[#10131e] flex-shrink-0">
        <div className="px-4 py-4 border-b border-slate-700/60">
          <h1 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Custom Modules</h1>
        </div>

        <nav className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="px-4 py-6 text-slate-500 text-sm">Loading…</div>
          ) : modules.length === 0 ? (
            <div className="px-4 py-6 text-slate-500 text-xs text-center leading-relaxed">
              No modules yet.<br />Create your first one.
            </div>
          ) : (
            modules.map((m) => (
              <button
                key={m.id}
                onClick={() => setActiveModuleId(m.id)}
                className={cn(
                  'w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2',
                  m.id === activeModuleId
                    ? 'bg-rose-900/30 text-rose-300 border-r-2 border-rose-700'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/30',
                )}
              >
                <div className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', m.id === activeModuleId ? 'bg-rose-500' : 'bg-slate-600')} />
                <span className="truncate">{m.name}</span>
              </button>
            ))
          )}
        </nav>

        <div className="p-3 border-t border-slate-700/60">
          <button
            onClick={() => setShowNewModal(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-rose-800 hover:bg-rose-700 text-white text-sm font-medium transition-colors"
          >
            <PlusIcon /> New Module
          </button>
        </div>
      </aside>

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
