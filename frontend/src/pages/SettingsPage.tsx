import { useState } from 'react';
import {
  Settings, Shield, Bell, Palette, Info,
  ChevronRight, Mail, Building2, CheckCircle2,
} from 'lucide-react';
import { useApp } from '../AppContext';
import { signOutOfCatalyst } from '../utils/catalystAuth';

// ─── Section Card ────────────────────────────────────────────────────────────
function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border border-rose-900/30 overflow-hidden"
      style={{ background: 'rgba(20,4,8,0.80)' }}
    >
      <div className="flex items-center gap-2 px-5 py-3 border-b border-rose-900/20"
           style={{ background: 'rgba(216,72,110,0.06)' }}>
        <span className="text-rose-400">{icon}</span>
        <span className="text-white font-semibold text-sm tracking-wide">{title}</span>
      </div>
      <div className="divide-y divide-rose-900/20">{children}</div>
    </div>
  );
}

// ─── Row item ────────────────────────────────────────────────────────────────
function SettingRow({
  label,
  value,
  sub,
  onClick,
  danger,
  right,
}: {
  label: string;
  value?: string;
  sub?: string;
  onClick?: () => void;
  danger?: boolean;
  right?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick && !right}
      className={`w-full flex items-center justify-between gap-3 px-5 py-3.5
                  text-left transition-colors group
                  ${onClick ? 'cursor-pointer hover:bg-rose-900/10' : 'cursor-default'}
                  ${danger ? 'hover:bg-red-900/20' : ''}`}
    >
      <div className="min-w-0">
        <div className={`text-sm font-medium ${danger ? 'text-red-400' : 'text-slate-200'}`}>
          {label}
        </div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {value && <span className="text-xs text-slate-400">{value}</span>}
        {right}
        {onClick && (
          <ChevronRight
            size={14}
            className={`${danger ? 'text-red-500' : 'text-slate-600'} group-hover:text-rose-400 transition-colors`}
          />
        )}
      </div>
    </button>
  );
}

// ─── Toggle pill ─────────────────────────────────────────────────────────────
function Toggle({ on }: { on: boolean }) {
  return (
    <div
      className={`w-10 h-5 rounded-full relative transition-colors ${on ? 'bg-rose-600' : 'bg-slate-700'}`}
    >
      <div
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
          on ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </div>
  );
}

// ─── Avatar initials ─────────────────────────────────────────────────────────
function AvatarInitials({ name, email }: { name?: string; email?: string }) {
  const initials = name
    ? name
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : (email?.[0] ?? 'U').toUpperCase();

  return (
    <div
      className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg"
      style={{
        background: 'linear-gradient(135deg, #be185d 0%, #9f1239 60%, #4c0519 100%)',
        boxShadow: '0 0 0 4px rgba(216,72,110,0.2), 0 8px 24px rgba(0,0,0,0.5)',
      }}
    >
      {initials}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, projects } = useApp();

  const [notifTasks, setNotifTasks] = useState(true);
  const [notifMilestones, setNotifMilestones] = useState(true);
  const [notifDrawings, setNotifDrawings] = useState(false);
  const [darkMode] = useState(true); // always dark

  const displayName = user?.display_name || user?.email_id?.split('@')[0] || 'User';
  const email = user?.email_id ?? '—';
  const role = (user as any)?.role_name ?? 'Member';
  const joined = (user as any)?.created_time
    ? new Date((user as any).created_time).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
      })
    : null;

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-5">

      {/* ── Page header ── */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: 'linear-gradient(145deg, rgba(216,72,110,0.25) 0%, rgba(0,0,0,0.3) 100%)',
            border: '1px solid rgba(216,72,110,0.35)',
          }}
        >
          <Settings size={18} className="text-rose-400" />
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">Settings</h1>
          <p className="text-slate-500 text-xs">Account, preferences &amp; app info</p>
        </div>
      </div>

      {/* ── Profile hero ── */}
      <div
        className="rounded-2xl border border-rose-900/30 p-6"
        style={{ background: 'rgba(20,4,8,0.80)' }}
      >
        <div className="flex items-center gap-5">
          <AvatarInitials name={user?.display_name} email={email} />
          <div className="min-w-0 flex-1">
            <div className="text-white font-bold text-lg truncate">{displayName}</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Mail size={11} className="text-rose-400 shrink-0" />
              <span className="text-xs text-slate-400 truncate">{email}</span>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <span
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium"
                style={{ background: 'rgba(216,72,110,0.15)', color: '#f9a8d4', border: '1px solid rgba(216,72,110,0.25)' }}
              >
                <Shield size={10} />
                {role}
              </span>
              {joined && (
                <span
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  Joined {joined}
                </span>
              )}
              <span
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <Building2 size={10} />
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Verified badge */}
        <div
          className="mt-4 flex items-center gap-2 rounded-xl px-4 py-2.5"
          style={{ background: 'rgba(22,163,74,0.10)', border: '1px solid rgba(22,163,74,0.20)' }}
        >
          <CheckCircle2 size={14} className="text-green-400 shrink-0" />
          <span className="text-xs text-green-300 font-medium">
            Authenticated via Zoho Catalyst — session active
          </span>
        </div>
      </div>

      {/* ── Account ── */}
      <SectionCard title="Account" icon={<Shield size={15} />}>
        <SettingRow
          label="Sign Out"
          sub="End your session on this device"
          danger
          onClick={() => signOutOfCatalyst()}
        />
      </SectionCard>

      {/* ── Appearance ── */}
      <SectionCard title="Appearance" icon={<Palette size={15} />}>
        <SettingRow
          label="Dark Mode"
          sub="Always active — optimised for site use"
          right={<Toggle on={darkMode} />}
        />
        <SettingRow
          label="Accent Color"
          sub="Rose / Maroon (default)"
          right={
            <div className="flex gap-1.5">
              {['#be185d', '#d97706', '#0891b2', '#16a34a'].map((c) => (
                <div
                  key={c}
                  className="w-4 h-4 rounded-full border-2"
                  style={{
                    background: c,
                    borderColor: c === '#be185d' ? '#fff' : 'transparent',
                  }}
                />
              ))}
            </div>
          }
        />
        <SettingRow
          label="Interface density"
          value="Comfortable"
        />
      </SectionCard>

      {/* ── Notifications ── */}
      <SectionCard title="Notifications" icon={<Bell size={15} />}>
        <button
          onClick={() => setNotifTasks((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-rose-900/10 transition-colors"
        >
          <div className="text-left">
            <div className="text-sm font-medium text-slate-200">Task updates</div>
            <div className="text-xs text-slate-500 mt-0.5">Status changes &amp; assignments</div>
          </div>
          <Toggle on={notifTasks} />
        </button>
        <button
          onClick={() => setNotifMilestones((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-rose-900/10 transition-colors"
        >
          <div className="text-left">
            <div className="text-sm font-medium text-slate-200">Milestone alerts</div>
            <div className="text-xs text-slate-500 mt-0.5">Due date reminders</div>
          </div>
          <Toggle on={notifMilestones} />
        </button>
        <button
          onClick={() => setNotifDrawings((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-rose-900/10 transition-colors"
        >
          <div className="text-left">
            <div className="text-sm font-medium text-slate-200">Drawing uploads</div>
            <div className="text-xs text-slate-500 mt-0.5">New drawing notifications</div>
          </div>
          <Toggle on={notifDrawings} />
        </button>
      </SectionCard>

      {/* ── App info ── */}
      <SectionCard title="About BuildTrack" icon={<Info size={15} />}>
        <SettingRow label="Version" value="1.0.0" />
        <SettingRow label="Platform" value="Zoho Catalyst AppSail" />
        <SettingRow label="Runtime" value="Node.js · Express · React" />
        <SettingRow
          label="Canvas Engine"
          value="Konva.js"
        />
      </SectionCard>

      {/* ── Footer ── */}
      <p className="text-center text-xs text-slate-700 pb-2">
        BuildTrack &copy; 2026 · Built on Zoho Catalyst
      </p>

    </div>
  );
}
