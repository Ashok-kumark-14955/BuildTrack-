import { useState } from 'react';
import { X, Save, FolderKanban } from 'lucide-react';
import toast from 'react-hot-toast';
import { ProjectsAPI } from '../api';
import { PROJECT_STATUS_OPTIONS, type Project, type ProjectStatus } from '../types';

interface Props {
  project: Project | null;
  managers: string[];
  onClose: () => void;
  onSaved: () => void;
}

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

  const save = async () => {
    if (!form.name.trim()) { toast.error('Project name is required'); return; }
    setSaving(true);
    try {
      if (project) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
              <FolderKanban size={16} className="text-blue-600" />
            </div>
            <div className="text-lg font-bold text-slate-800 font-display">{project ? 'Edit Project' : 'New Project'}</div>
          </div>
          <button onClick={onClose} className="icon-btn w-8 h-8"><X size={17} /></button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <Field label="Project Name">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Riverside Tower" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Project Code">
              <input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. RVT-2026" />
            </Field>
            <Field label="Status">
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectStatus })}>
                {PROJECT_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Description">
            <textarea
              className="input min-h-20 resize-none"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date">
              <input type="date" className="input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
            </Field>
            <Field label="End Date">
              <input type="date" className="input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
            </Field>
          </div>
          <Field label="Project Manager">
            <input
              className="input"
              list="manager-suggestions"
              value={form.managerName}
              onChange={(e) => setForm({ ...form, managerName: e.target.value })}
              placeholder="e.g. Alice Kumar"
            />
            <datalist id="manager-suggestions">
              {managers.map((m) => <option key={m} value={m} />)}
            </datalist>
          </Field>
        </div>

        <div className="flex items-center gap-2 px-5 py-4 border-t border-slate-200">
          <button onClick={save} disabled={saving} className="btn btn-primary flex-1 py-2.5">
            <Save size={16} /> {project ? 'Update Project' : 'Create Project'}
          </button>
          <button onClick={onClose} className="btn btn-ghost px-4 py-2.5">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">{label}</span>
      {children}
    </label>
  );
}
