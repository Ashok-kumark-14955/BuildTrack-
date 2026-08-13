/**
 * FieldsModal — Custom field builder for a project's Custom Module.
 *
 * Each project maps 1-to-1 with a custom module (matched by project name).
 * The modal lets users add / rename / retype / remove fields and saves them
 * back to the backend via CustomModulesAPI (which ultimately persists them
 * in the Catalyst DataStore custom_modules table).
 *
 * UI spec: dark theme (#1e2130 / #151827), rose-700 accent — matches the
 * design provided in the task.
 */

import { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, X, Save, Layers } from 'lucide-react';
import toast from 'react-hot-toast';
import { CustomModulesAPI, type CustomField, type CustomModule } from '../api';

// ── Types ──────────────────────────────────────────────────────────────────

type FieldType = CustomField['type'];

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: 'text',        label: 'Text' },
  { value: 'number',      label: 'Number' },
  { value: 'date',        label: 'Date' },
  { value: 'select',      label: 'Select (dropdown)' },
  { value: 'multiuser',   label: 'Multi User' },
  { value: 'attachment',  label: 'Attachment' },
];

// A draft field (label + type) used while editing in the modal
interface DraftField {
  id: string;   // client-side uuid (preserved from existing fields, new = crypto.randomUUID())
  label: string;
  type: FieldType;
}

function makeDraft(f: CustomField): DraftField {
  return { id: f.id, label: f.label, type: f.type };
}

function newDraftField(): DraftField {
  return { id: crypto.randomUUID(), label: '', type: 'text' };
}

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  /** The project this Fields modal is editing fields for */
  projectId: string;
  projectName: string;
  onClose: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function FieldsModal({ projectId, projectName, onClose }: Props) {
  const [module, setModule] = useState<CustomModule | null>(null);
  const [fields, setFields] = useState<DraftField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Track which field ids were originally "Title" — disallow deleting them (first field guard)
  const firstFieldId = useRef<string | null>(null);

  // ── Load (or create) the module for this project ─────────────────────────

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const modules = await CustomModulesAPI.list();
        // Match module by projectId stored in name as "projectId:<id>"
        // OR by legacy name equality for backwards compat
        let found = modules.find(
          (m) =>
            m.name === `projectId:${projectId}` ||
            m.name === projectName
        );

        if (!found) {
          // First time: create the module with sensible default fields
          const defaultFields: CustomField[] = [
            { id: crypto.randomUUID(), label: 'Title',  type: 'text' },
            { id: crypto.randomUUID(), label: 'Status', type: 'select' },
          ];
          found = await CustomModulesAPI.create(`projectId:${projectId}`, defaultFields);
        }

        if (!cancelled) {
          setModule(found);
          const drafts = found.fields.map(makeDraft);
          setFields(drafts.length > 0 ? drafts : [newDraftField()]);
          firstFieldId.current = drafts[0]?.id ?? null;
        }
      } catch (err: any) {
        toast.error('Failed to load fields: ' + (err?.message ?? 'Unknown error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // ── Field mutations ───────────────────────────────────────────────────────

  const addField = () =>
    setFields((prev) => [...prev, newDraftField()]);

  const removeField = (id: string) =>
    setFields((prev) => prev.filter((f) => f.id !== id));

  const updateLabel = (id: string, label: string) =>
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, label } : f)));

  const updateType = (id: string, type: FieldType) =>
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, type } : f)));

  // ── Save ──────────────────────────────────────────────────────────────────

  const save = async () => {
    // Basic validation
    for (const f of fields) {
      if (!f.label.trim()) {
        toast.error('All fields must have a label');
        return;
      }
    }

    setSaving(true);
    try {
      const payload: CustomField[] = fields.map((f) => ({
        id: f.id,
        label: f.label.trim(),
        type: f.type,
      }));

      if (module) {
        await CustomModulesAPI.update(module.id, { fields: payload });
      } else {
        await CustomModulesAPI.create(`projectId:${projectId}`, payload);
      }

      toast.success('Fields saved');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save fields');
    } finally {
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg flex flex-col rounded-xl shadow-2xl"
        style={{
          background: '#1e2130',
          border: '1px solid rgba(100,116,139,0.45)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.75)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: '1px solid rgba(100,116,139,0.3)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(190,18,60,0.25), rgba(159,18,57,0.15))',
                border: '1px solid rgba(190,18,60,0.4)',
              }}
            >
              <Layers size={15} className="text-rose-400" />
            </div>
            <h2 className="text-white font-semibold text-[15px]">
              Fields — <span className="text-slate-400 font-normal">{projectName}</span>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-4 space-y-2 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-400 text-sm">
              Loading fields…
            </div>
          ) : (
            <>
              {fields.map((field, idx) => {
                const isFirst = idx === 0;
                return (
                  <div key={field.id} className="flex gap-2 items-start">
                    {/* Label input */}
                    <input
                      placeholder="Field label"
                      value={field.label}
                      onChange={(e) => updateLabel(field.id, e.target.value)}
                      className="flex-1 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 text-sm focus:outline-none transition-colors"
                      style={{
                        background: '#151827',
                        border: '1px solid rgba(100,116,139,0.5)',
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.borderColor = 'rgba(190,18,60,0.7)')
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.borderColor = 'rgba(100,116,139,0.5)')
                      }
                    />

                    {/* Type select */}
                    <select
                      value={field.type}
                      onChange={(e) => updateType(field.id, e.target.value as FieldType)}
                      className="rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none transition-colors"
                      style={{
                        background: '#151827',
                        border: '1px solid rgba(100,116,139,0.5)',
                      }}
                      onFocus={(e) =>
                        (e.currentTarget.style.borderColor = 'rgba(190,18,60,0.7)')
                      }
                      onBlur={(e) =>
                        (e.currentTarget.style.borderColor = 'rgba(100,116,139,0.5)')
                      }
                    >
                      {FIELD_TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    {/* Delete button — disabled for the first (Title) field */}
                    <button
                      disabled={isFirst}
                      onClick={() => removeField(field.id)}
                      title={isFirst ? 'The first field cannot be removed' : 'Remove field'}
                      className="p-1.5 text-slate-500 hover:text-red-400 disabled:opacity-30 transition-colors mt-0.5 rounded-lg hover:bg-red-400/10"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* ── Add field ── */}
        {!loading && (
          <div className="px-6 pb-2">
            <button
              onClick={addField}
              className="flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 transition-colors"
            >
              <Plus size={16} /> Add field
            </button>
          </div>
        )}

        {/* ── Footer ── */}
        <div
          className="flex justify-end gap-3 px-6 py-4"
          style={{ borderTop: '1px solid rgba(100,116,139,0.3)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:text-white transition-colors hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="flex items-center gap-2 px-5 py-2 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-60"
            style={{
              background: saving || loading ? '#9f1239' : undefined,
              backgroundColor: saving || loading ? undefined : '#9f1239',
              backgroundImage:
                saving || loading
                  ? 'none'
                  : 'linear-gradient(135deg, #be123c, #9f1239)',
              boxShadow: saving || loading ? 'none' : '0 4px 14px rgba(190,18,60,0.35)',
            }}
            onMouseEnter={(e) => {
              if (!saving && !loading)
                e.currentTarget.style.filter = 'brightness(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = '';
            }}
          >
            <Save size={14} />
            {saving ? 'Saving…' : 'Save Fields'}
          </button>
        </div>
      </div>
    </div>
  );
}
