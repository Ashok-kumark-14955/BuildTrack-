import { useState } from 'react';
import { X, Save, FileImage } from 'lucide-react';
import toast from 'react-hot-toast';
import { DrawingsAPI } from '../api';
import type { Drawing } from '../types';

interface Props {
  drawing: Drawing;
  onClose: () => void;
  onSaved: (drawing: Drawing) => void;
}

const M = {
  accent: '#e05c5c',
  glow: 'rgba(192,57,43,0.35)',
  glowSoft: 'rgba(192,57,43,0.15)',
  border: 'rgba(192,57,43,0.35)',
  borderSoft: 'rgba(192,57,43,0.18)',
  bg: 'linear-gradient(165deg, #120608 0%, #1a0a0c 60%, #0e0506 100%)',
  headerBg: 'linear-gradient(135deg, rgba(192,57,43,0.16) 0%, rgba(124,29,36,0.10) 100%)',
  inputBg: 'rgba(20, 5, 7, 0.97)',
  inputBorder: 'rgba(155,35,53,0.55)',
};

export default function DrawingEditModal({ drawing, onClose, onSaved }: Props) {
  const [name, setName] = useState(drawing.name);
  const [caption, setCaption] = useState(drawing.caption ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error('Drawing name is required'); return; }
    setSaving(true);
    try {
      const saved = await DrawingsAPI.update(drawing.id, {
        name: name.trim(),
        caption: caption.trim(),
        projectId: drawing.projectId,
      });
      toast.success('Drawing updated');
      onSaved(saved);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to update drawing');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden flex flex-col"
        style={{
          background: M.bg,
          border: `1px solid ${M.border}`,
          borderRadius: '20px',
          boxShadow: `0 30px 80px rgba(0,0,0,0.75), 0 0 0 1px ${M.glowSoft}, 0 0 40px ${M.glow}`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ background: M.headerBg, borderBottom: `1px solid ${M.borderSoft}` }}
        >
          <div className="flex items-center gap-3.5">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(192,57,43,0.3), rgba(124,29,36,0.25))',
                border: `1px solid ${M.border}`,
                boxShadow: `0 0 18px ${M.glow}`,
              }}
            >
              <FileImage size={18} style={{ color: M.accent }} />
            </div>
            <div>
              <div className="text-[16px] font-extrabold text-white leading-tight">Edit Drawing</div>
              <div className="text-[10.5px] font-semibold mt-0.5" style={{ color: 'rgba(224,92,92,0.75)' }}>
                Editing: {drawing.name}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-colors"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'rgba(224,92,92,0.75)' }}>
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-white outline-none"
              style={{ background: M.inputBg, border: `1px solid ${M.inputBorder}` }}
              autoFocus
            />
          </div>
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'rgba(224,92,92,0.75)' }}>
              Caption
            </label>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Excavation, footings, grade beams, plinth"
              className="mt-1.5 w-full px-3.5 py-2.5 rounded-xl text-[13px] font-medium text-white outline-none placeholder:text-white/30"
              style={{ background: M.inputBg, border: `1px solid ${M.inputBorder}` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4" style={{ borderTop: `1px solid ${M.borderSoft}` }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-[12.5px] font-bold transition-colors"
            style={{ color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-[12.5px] font-bold text-white transition-all"
            style={{
              background: 'linear-gradient(135deg, #9f1239 0%, #7c0a2a 55%, #4c0519 100%)',
              border: '1px solid rgba(159,18,57,0.5)',
              opacity: saving ? 0.6 : 1,
            }}
          >
            <Save size={13} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
