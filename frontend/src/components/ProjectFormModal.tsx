import { useState } from 'react';
import { X, Save, FolderKanban, Calendar, User, Hash, AlignLeft, Briefcase, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ZohoBackboneAPI } from '../api';
import { PROJECT_STATUS_OPTIONS, PROJECT_STATUS_COLORS, type Project, type ProjectStatus } from '../types';

interface Props {
  project: Project | null;
  managers: string[];
  onClose: () => void;
  onSaved: (project: Project) => void;
}

const STATUS_ICONS: Record<ProjectStatus, string> = {
  Planning: '📋',
  Active: '🚀',
  'On Hold': '⏸',
  Completed: '✅',
};

// ── Maroon palette ────────────────────────────────────────────────────────────
const M = {
  primary:       '#7c1d24',   // deep maroon
  primaryLight:  '#9b2335',   // mid maroon
  primaryBright: '#c0392b',   // vivid maroon-red
  accent:        '#e05c5c',   // warm rose accent
  glow:          'rgba(192,57,43,0.35)',
  glowSoft:      'rgba(192,57,43,0.15)',
  border:        'rgba(192,57,43,0.35)',
  borderSoft:    'rgba(192,57,43,0.18)',
  bg:            'linear-gradient(165deg, #120608 0%, #1a0a0c 60%, #0e0506 100%)',
  headerBg:      'linear-gradient(135deg, rgba(192,57,43,0.16) 0%, rgba(124,29,36,0.10) 100%)',
  inputBg:       'rgba(20, 5, 7, 0.97)',
  inputBorder:   'rgba(155,35,53,0.55)',
};

export default function ProjectFormModal({ project, managers, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: project?.name ?? '',
    code: project?.code ?? '',
    description: project?.description ?? '',
    startDate: project?.startDate ?? '',
    endDate: project?.endDate ?? '',
    status: (project?.status ?? 'Planning') as ProjectStatus,
    managerName: project?.managerName ?? '',
  });
  const [saving, setSaving] = useState(false);

  const isEdit = !!project;

  const save = async () => {
    if (!form.name.trim()) { toast.error('Project name is required'); return; }
    setSaving(true);
    try {
      let saved: Project;
      if (isEdit) {
        saved = await ZohoBackboneAPI.updateProject(project.id, form);
        toast.success('Project updated');
      } else {
        saved = await ZohoBackboneAPI.createProject(form);
        toast.success('Project created');
      }
      onSaved(saved);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save project');
    } finally {
      setSaving(false);
    }
  };

  const statusColor = PROJECT_STATUS_COLORS[form.status];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden flex flex-col"
        style={{
          background: M.bg,
          border: `1px solid ${M.border}`,
          borderRadius: '20px',
          boxShadow: `0 30px 80px rgba(0,0,0,0.75), 0 0 0 1px ${M.glowSoft}, 0 0 40px ${M.glow}`,
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{
            background: M.headerBg,
            borderBottom: `1px solid ${M.borderSoft}`,
          }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, rgba(192,57,43,0.3), rgba(124,29,36,0.25))`,
                border: `1px solid ${M.border}`,
                boxShadow: `0 0 18px ${M.glow}`,
              }}
            >
              <FolderKanban size={18} style={{ color: M.accent }} />
            </div>
            <div>
              <div className="text-[16px] font-extrabold text-white leading-tight">
                {isEdit ? 'Edit Project' : 'New Project'}
              </div>
              <div className="text-[10.5px] font-semibold mt-0.5" style={{ color: 'rgba(224,92,92,0.75)' }}>
                {isEdit ? `Editing: ${project.name}` : 'Fill in the project details below'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors"
            style={{
              border: `1px solid ${M.borderSoft}`,
              background: 'rgba(192,57,43,0.06)',
              color: M.accent,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(192,57,43,0.18)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(192,57,43,0.06)')}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Project Name */}
          <Field label="Project Name" icon={<IconBadge color={M.accent} glow="rgba(224,92,92,0.4)"><Briefcase size={10} style={{ color: M.accent }} /></IconBadge>}>
            <input
              className="modal-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Riverside Tower Block A"
              autoFocus
              style={{ background: M.inputBg, borderColor: M.inputBorder, caretColor: M.accent }}
            />
          </Field>

          {/* Code + Status */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Project Code" icon={<IconBadge color="#e05c5c" glow="rgba(224,92,92,0.4)"><Hash size={10} style={{ color: '#e05c5c' }} /></IconBadge>}>
              <input
                className="modal-input"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. RVT-2026"
                style={{ background: M.inputBg, borderColor: M.inputBorder, caretColor: M.accent }}
              />
            </Field>
            <Field label="Status" icon={<IconBadge color={statusColor} glow={`${statusColor}66`}><CheckCircle2 size={10} style={{ color: statusColor }} /></IconBadge>}>
              <div className="relative">
                <select
                  className="modal-input appearance-none pr-7"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
                  style={{ color: statusColor, background: M.inputBg, borderColor: M.inputBorder }}
                >
                  {PROJECT_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s} style={{ color: PROJECT_STATUS_COLORS[s] }}>
                      {STATUS_ICONS[s]} {s}
                    </option>
                  ))}
                </select>
                <span
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
                  style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }}
                />
              </div>
            </Field>
          </div>

          {/* Description */}
          <Field label="Description" icon={<IconBadge color="#e05c5c" glow="rgba(224,92,92,0.35)"><AlignLeft size={10} style={{ color: '#e05c5c' }} /></IconBadge>}>
            <textarea
              className="modal-input min-h-[80px] resize-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the project scope, objectives, and key deliverables…"
              style={{ background: M.inputBg, borderColor: M.inputBorder, caretColor: M.accent }}
            />
          </Field>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date" icon={<IconBadge color="#6ee7b7" glow="rgba(110,231,183,0.4)"><Calendar size={10} style={{ color: '#6ee7b7' }} /></IconBadge>}>
              <input
                type="date"
                className="modal-input"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                style={{ background: M.inputBg, borderColor: M.inputBorder, caretColor: M.accent }}
              />
            </Field>
            <Field label="End Date" icon={<IconBadge color={M.accent} glow="rgba(224,92,92,0.4)"><Calendar size={10} style={{ color: M.accent }} /></IconBadge>}>
              <input
                type="date"
                className="modal-input"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                style={{ background: M.inputBg, borderColor: M.inputBorder, caretColor: M.accent }}
              />
            </Field>
          </div>

          {/* Project Manager */}
          <Field label="Project Manager" icon={<IconBadge color="#fbbf24" glow="rgba(251,191,36,0.4)"><User size={10} style={{ color: '#fbbf24' }} /></IconBadge>}>
            <input
              className="modal-input"
              list="manager-suggestions"
              value={form.managerName}
              onChange={(e) => setForm({ ...form, managerName: e.target.value })}
              placeholder="e.g. Alice Kumar"
              style={{ background: M.inputBg, borderColor: M.inputBorder, caretColor: M.accent }}
            />
            <datalist id="manager-suggestions">
              {managers.map((m) => <option key={m} value={m} />)}
            </datalist>
          </Field>

          {/* Status quick-pick pills */}
          <div>
            <span
              className="block text-[10px] font-semibold uppercase tracking-wider mb-2"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              Quick Status
            </span>
            <div className="flex flex-wrap gap-2">
              {PROJECT_STATUS_OPTIONS.map((s) => {
                const c = PROJECT_STATUS_COLORS[s];
                const active = form.status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setForm({ ...form, status: s })}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
                    style={{
                      background: active ? `${c}25` : 'rgba(192,57,43,0.06)',
                      border: active ? `1.5px solid ${c}60` : `1.5px solid rgba(192,57,43,0.2)`,
                      color: active ? c : 'rgba(224,92,92,0.5)',
                      boxShadow: active ? `0 0 10px ${c}20` : 'none',
                    }}
                  >
                    <span>{STATUS_ICONS[s]}</span> {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div
          className="flex items-center gap-2.5 px-6 py-4"
          style={{
            borderTop: `1px solid ${M.borderSoft}`,
            background: 'rgba(10,2,3,0.35)',
          }}
        >
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[13px] text-white transition-all disabled:opacity-60"
            style={{
              background: saving
                ? M.primary
                : `linear-gradient(135deg, ${M.primaryLight}, ${M.primaryBright})`,
              boxShadow: saving ? 'none' : `0 4px 18px ${M.glow}`,
            }}
            onMouseEnter={(e) => { if (!saving) e.currentTarget.style.filter = 'brightness(1.12)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = ''; }}
          >
            <Save size={15} /> {saving ? 'Saving…' : isEdit ? 'Update Project' : 'Create Project'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-semibold text-[13px] transition-all"
            style={{
              background: 'rgba(192,57,43,0.08)',
              border: `1px solid rgba(192,57,43,0.22)`,
              color: 'rgba(224,92,92,0.7)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(192,57,43,0.16)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(192,57,43,0.08)')}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function IconBadge({ children, color, glow }: { children: React.ReactNode; color: string; glow: string }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-lg flex-shrink-0"
      style={{
        width: 20,
        height: 20,
        background: `linear-gradient(135deg, ${color}40 0%, ${color}18 100%)`,
        border: `1px solid ${color}60`,
        boxShadow: `0 2px 8px ${glow}, inset 0 1px 0 ${color}30`,
      }}
    >
      {children}
    </span>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wider mb-1.5"
        style={{ color: 'rgba(255,255,255,0.85)' }}>
        {icon} {label}
      </span>
      {children}
    </label>
  );
}
