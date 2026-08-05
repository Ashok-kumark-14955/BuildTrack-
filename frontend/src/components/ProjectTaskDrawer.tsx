import { useEffect, useState } from 'react';
import { X, Save, Trash2, MessageSquare, Send, ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';
import { ProjectTasksAPI } from '../api';
import {
  PRIORITY_OPTIONS, PROJECT_TASK_STATUS_OPTIONS,
  type ProjectTask, type ProjectTaskComment, type ProjectTaskStatus, type TaskPriority,
} from '../types';

interface Props {
  projectId: string;
  taskId: string | 'new' | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

const emptyForm = {
  name: '',
  description: '',
  priority: 'Medium' as TaskPriority,
  status: 'To Do' as ProjectTaskStatus,
  assignee: '',
  dueDate: '',
  estimatedHours: '',
  tagsText: '',
};

export default function ProjectTaskDrawer({ projectId, taskId, onClose, onSaved, onDeleted }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [comments, setComments] = useState<ProjectTaskComment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [saving, setSaving] = useState(false);

  const isNew = taskId === 'new';

  useEffect(() => {
    if (!taskId || isNew) { setForm(emptyForm); setComments([]); return; }
    ProjectTasksAPI.get(taskId).then((t: ProjectTask) => {
      setForm({
        name: t.name,
        description: t.description,
        priority: t.priority,
        status: t.status,
        assignee: t.assignee,
        dueDate: t.dueDate,
        estimatedHours: t.estimatedHours != null ? String(t.estimatedHours) : '',
        tagsText: t.tags.join(', '),
      });
    });
    ProjectTasksAPI.comments(taskId).then(setComments).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  if (!taskId) return null;

  const tags = form.tagsText.split(',').map((t) => t.trim()).filter(Boolean);

  const save = async () => {
    if (!form.name.trim()) { toast.error('Task name is required'); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        priority: form.priority,
        status: form.status,
        assignee: form.assignee,
        dueDate: form.dueDate,
        estimatedHours: form.estimatedHours === '' ? null : Number(form.estimatedHours),
        tags,
      };
      if (isNew) {
        await ProjectTasksAPI.create({ ...payload, projectId });
        toast.success('Task created');
      } else {
        await ProjectTasksAPI.update(taskId, payload);
        toast.success('Task updated');
      }
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (isNew) return;
    if (!confirm(`Delete task "${form.name}"?`)) return;
    await ProjectTasksAPI.remove(taskId);
    toast.success('Task deleted');
    onDeleted();
  };

  const postComment = async () => {
    if (isNew || !commentText.trim()) return;
    const c = await ProjectTasksAPI.addComment(taskId, { author: 'You', message: commentText });
    setComments((prev) => [...prev, c]);
    setCommentText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-white shadow-elevated border-l border-slate-200 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
              <ListChecks size={16} className="text-blue-600" />
            </div>
            <div className="text-lg font-bold text-slate-800 font-display leading-tight">{isNew ? 'New Task' : 'Edit Task'}</div>
          </div>
          <button onClick={onClose} className="icon-btn w-8 h-8"><X size={17} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <Field label="Task Name">
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Prepare cost estimate" />
          </Field>
          <Field label="Description">
            <textarea className="input min-h-20 resize-none" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority">
              <select className="input" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}>
                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ProjectTaskStatus })}>
                {PROJECT_TASK_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Assignee">
            <input className="input" value={form.assignee} onChange={(e) => setForm({ ...form, assignee: e.target.value })} placeholder="Who's responsible" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Due Date">
              <input type="date" className="input" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
            </Field>
            <Field label="Estimated Hours">
              <input type="number" min={0} step={0.5} className="input" value={form.estimatedHours} onChange={(e) => setForm({ ...form, estimatedHours: e.target.value })} />
            </Field>
          </div>
          <Field label="Tags (comma separated)">
            <input className="input" value={form.tagsText} onChange={(e) => setForm({ ...form, tagsText: e.target.value })} placeholder="e.g. urgent, design-review" />
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map((t) => (
                  <span key={t} className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{t}</span>
                ))}
              </div>
            )}
          </Field>

          <div className="flex items-center gap-2 pt-2">
            <button onClick={save} disabled={saving} className="btn btn-primary flex-1 py-2.5">
              <Save size={16} /> {isNew ? 'Create Task' : 'Update Task'}
            </button>
            {!isNew && (
              <button onClick={remove} className="btn bg-red-50 hover:bg-red-100 text-red-600 w-11 h-11">
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {!isNew && (
            <div className="pt-5 border-t border-slate-200 mt-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                <MessageSquare size={15} /> Comments
              </div>
              <div className="space-y-2.5 max-h-40 overflow-y-auto mb-3 pr-1">
                {comments.map((c) => (
                  <div key={c.id} className="text-sm bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                    <div className="flex justify-between text-xs text-slate-400 mb-0.5">
                      <span className="font-medium text-slate-500">{c.author}</span>
                      <span>{new Date(c.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-700">{c.message}</div>
                  </div>
                ))}
                {comments.length === 0 && <div className="text-xs text-slate-400 text-center py-2">No comments yet</div>}
              </div>
              <div className="flex gap-2">
                <input
                  className="input flex-1"
                  placeholder="Add a comment…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && postComment()}
                />
                <button onClick={postComment} className="btn btn-secondary w-10 shrink-0">
                  <Send size={15} />
                </button>
              </div>
            </div>
          )}
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
