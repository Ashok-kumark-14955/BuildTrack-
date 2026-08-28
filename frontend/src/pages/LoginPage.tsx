import { useEffect, useState } from 'react';
import { HardHat, Loader2 } from 'lucide-react';

const PAGE_GRADIENT =
  'radial-gradient(ellipse 80% 60% at 10% 20%, rgba(160,18,72,0.50) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 90% 80%, rgba(130,15,60,0.40) 0%, transparent 60%), linear-gradient(135deg, #360016 0%, #520024 35%, #42001e 65%, #2a0012 100%)';

export default function LoginPage() {
  const [state, setState] = useState<'redirecting' | 'error'>('redirecting');

  useEffect(() => {
    // Catalyst Slate serves all pages with x-frame-options: DENY, which
    // causes the embedded iframe login widget (sdk.auth.signIn) to be blocked
    // by the browser ("refused to connect"). Instead, we do a full-page
    // redirect to the Catalyst-hosted sign-in page at /__catalyst/auth/login,
    // which handles auth and redirects back to the app after login.
    try {
      // Small delay so the user sees the "redirecting" state before navigation
      setTimeout(() => {
        window.location.href = '/__catalyst/auth/login';
      }, 300);
    } catch {
      setState('error');
    }
  }, []);

  return (
    <div
      className="flex h-screen w-screen items-center justify-center p-4"
      style={{ background: PAGE_GRADIENT }}
    >
      <div
        className="w-full max-w-[400px] rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: 'rgba(20,4,8,0.92)', border: '1px solid rgba(216,72,110,0.3)' }}
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-3 px-8 pt-8 pb-6 text-center">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
            style={{
              background: 'linear-gradient(145deg, #d6486e 0%, #8b0a2e 100%)',
              border: '1px solid rgba(216,72,110,0.6)',
              boxShadow: '0 0 16px rgba(214,72,110,0.4)',
            }}
          >
            <HardHat size={22} className="text-white" />
          </div>
          <div>
            <div className="text-white font-extrabold text-xl tracking-tight">BuildTrack</div>
            <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: '#e88aa5' }}>
              Site Operations
            </div>
          </div>
          <p className="text-slate-400 text-xs mt-1">Sign in with your Zoho account to continue</p>
        </div>

        {/* Status */}
        <div className="px-6 pb-8">
          <div
            className="relative rounded-xl overflow-hidden flex flex-col items-center justify-center gap-3 py-12"
            style={{ minHeight: 160, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {state === 'error' ? (
              <>
                <span className="text-sm text-red-300 font-medium text-center px-4">
                  Sign-in is unavailable right now. Please refresh the page.
                </span>
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs font-bold px-4 py-2 rounded-lg text-white mt-2"
                  style={{ background: 'linear-gradient(135deg, #d6486e 0%, #8b0a2e 100%)' }}
                >
                  Reload
                </button>
              </>
            ) : (
              <>
                <Loader2 size={24} className="animate-spin text-rose-400" />
                <span className="text-xs text-slate-400">
                  {state === 'redirecting' ? 'Redirecting to sign-in…' : 'Preparing sign-in…'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
