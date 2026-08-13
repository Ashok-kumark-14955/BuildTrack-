import { Settings, User, LogOut } from 'lucide-react';
import { useApp } from '../AppContext';

export default function SettingsPage() {
  const { user, signOut } = useApp();

  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-4">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(145deg, rgba(216,72,110,0.2) 0%, rgba(0,0,0,0.3) 100%)',
          border: '1px solid rgba(216,72,110,0.3)',
        }}
      >
        <Settings size={24} className="text-rose-400" />
      </div>
      <div>
        <h2 className="text-white font-bold text-lg">Settings</h2>
        <p className="text-slate-400 text-sm mt-1">Account &amp; session</p>
      </div>

      <div
        className="w-full max-w-xs mt-2 p-4 rounded-2xl border border-rose-900/30 text-left"
        style={{ background: 'rgba(20,4,8,0.85)' }}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-rose-900/40 text-rose-300">
            <User size={16} />
          </div>
          <div className="min-w-0">
            <div className="text-white font-semibold text-sm truncate">{user?.display_name || 'Signed in'}</div>
            <div className="text-xs text-rose-300/70 truncate">{user?.email_id}</div>
          </div>
        </div>

        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm
                     text-white bg-rose-900/40 hover:bg-rose-900/60 border border-rose-800/50 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </div>
  );
}
