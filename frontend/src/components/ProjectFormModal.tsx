import { useState } from 'react';
import { X, Save, FolderKanban, Calendar, User, Hash, AlignLeft, Briefcase, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { ProjectsAPI } from '../api';
import { PROJECT_STATUS_OPTIONS, PROJECT_STATUS_COLORS, type Project, type ProjectStatus } from '../types';

interface Props {
  project: Project | null;
  managers: string[];
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_ICONS: Record<ProjectStatus, string> = {
  Planning: '📋',
  Active: '🚀',
  'On Hold': '⏸',
  Completed: '✅',
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
      if (isEdit) {
        await ProjectsAPI.update(project.id, form);
        toast.success('Project updated');
      } else {
        await ProjectsAPI.create(form);
        toast.success('Project created');
      }
      onSaved();
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
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden flex flex-col"
        style={{
          background: 'linear-gradient(165deg, #0f111a 0%, #131824 60%, #0d1118 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '20px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)',
          maxHeight: '90vh',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{
            background: 'linear-gradient(135deg, rgba(96,165,250,0.12) 0%, rgba(139,92,246,0.08) 100%)',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(96,165,250,0.25), rgba(139,92,246,0.2))',
                border: '1px solid rgba(96,165,250,0.35)',
                boxShadow: '0 0 16px rgba(96,165,250,0.2)',
              }}
            >
              <FolderKanban size={18} className="text-blue-400" />
            </div>
            <div>
              <div className="text-[16px] font-extrabold text-white leading-tight">
                {isEdit ? 'Edit Project' : 'New Project'}
              </div>
              <div className="text-[10.5px] font-semibold mt-0.5" style={{ color: 'rgba(148,163,184,0.8)' }}>
                {isEdit ? `Editing: ${project.name}` : 'Fill in the project details below'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
            style={{ border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* Project Name */}
          <Field label="Project Name" icon={<Briefcase size={12} className="text-blue-400" />}>
            <input
              className="modal-input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Riverside Tower Block A"
              autoFocus
            />
          </Field>

          {/* Code + Status */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Project Code" icon={<Hash size={12} className="text-violet-400" />}>
              <input
                className="modal-input"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. RVT-2026"
              />
            </Field>
            <Field label="Status" icon={<CheckCircle2 size={12} style={{ color: statusColor }} />}>
              <div className="relative">
                <select
                  className="modal-input appearance-none pr-7"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}
                  style={{ color: statusColor }}
                >
                  {PROJECT_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s} style={{ color: PROJECT_STATUS_COLORS[s] }}>
                      {STATUS_ICONS[s]} {s}
                    </option>
                  ))}
                </select>
                {/* Color dot indicator */}
                <span
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none"
                  style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}` }}
                />
              </div>
            </Field>
          </div>

          {/* Description */}
          <Field label="Description" icon={<AlignLeft size={12} className="text-slate-400" />}>
            <textarea
              className="modal-input min-h-[80px] resize-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the project scope, objectives, and key deliverables…"
            />
          </Field>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date" icon={<Calendar size={12} className="text-emerald-400" />}>
              <input
                type="date"
                className="modal-input"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </Field>
            <Field label="End Date" icon={<Calendar size={12} className="text-rose-400" />}>
              <input
                type="date"
                className="modal-input"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </Field>
          </div>

          {/* Project Manager */}
          <Field label="Project Manager" icon={<User size={12} className="text-amber-400" />}>
            <input
              className="modal-input"
              list="manager-suggestions"
              value={form.managerName}
              onChange={(e) => setForm({ ...form, managerName: e.target.value })}
              placeholder="e.g. Alice Kumar"
            />
            <datalist id="manager-suggestions">
              {managers.map((m) => <option key={m} value={m} />)}
            </datalist>
          </Field>

          {/* Status quick-pick pills */}
          <div>
            <span className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Quick Status</span>
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
                      background: active ? `${c}25` : 'rgba(255,255,255,0.04)',
                      border: active ? `1.5px solid ${c}60` : '1.5px solid rgba(255,255,255,0.08)',
                      color: active ? c : 'rgba(255,255,255,0.45)',
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
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)' }}
        >
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-[13px] text-white transition-all disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
              boxShadow: saving ? 'none' : '0 4px 16px rgba(99,102,241,0.4)',
            }}
            onMouseEnter={(e) => { if (!saving) e.currentTarget.style.filter = 'brightness(1.1)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.filter = ''; }}
          >
            <Save size={15} /> {saving ? 'Saving…' : isEdit ? 'Update Project' : 'Create Project'}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl font-semibold text-[13px] transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
        {icon} {label}
      </span>
      {children}
    </label>
  );
}
