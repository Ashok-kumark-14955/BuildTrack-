import { useEffect, useRef, useState } from 'react';
import { HardHat, Loader2 } from 'lucide-react';
import { waitForCatalystSDK } from '../utils/catalystAuth';

const PAGE_GRADIENT =
  'radial-gradient(ellipse 80% 60% at 10% 20%, rgba(160,18,72,0.50) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 90% 80%, rgba(130,15,60,0.40) 0%, transparent 60%), linear-gradient(135deg, #360016 0%, #520024 35%, #42001e 65%, #2a0012 100%)';

export default function LoginPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [widgetLoading, setWidgetLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let observer: MutationObserver | null = null;

    waitForCatalystSDK().then((sdk) => {
      if (!sdk) {
        setError("Sign-in isn't available right now. Please refresh the page.");
        return;
      }

      const el = containerRef.current;
      if (el) {
        // The widget mounts an iframe into this div asynchronously — swap the
        // spinner out as soon as it actually appears rather than guessing a delay.
        observer = new MutationObserver(() => {
          if (el.childElementCount > 0) setWidgetLoading(false);
        });
        observer.observe(el, { childList: true });
      }

      try {
        sdk.auth.signIn('login-container', {
          login_redirect: window.location.origin + '/',
        });
      } catch (err) {
        console.error('[LoginPage] signIn failed:', err);
        setError('Something went wrong loading sign-in. Please refresh the page.');
      }
    });

    return () => observer?.disconnect();
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
          <p className="text-slate-400 text-xs mt-1">Sign in with your Zoho Catalyst account to continue</p>
        </div>

        {/* Widget */}
        <div className="px-6 pb-8">
          <div
            className="relative rounded-xl overflow-hidden"
            style={{ minHeight: 300, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {error ? (
              <div className="flex flex-col items-center justify-center gap-3 text-center px-6 py-16">
                <span className="text-sm text-red-300 font-medium">{error}</span>
                <button
                  onClick={() => window.location.reload()}
                  className="text-xs font-bold px-4 py-2 rounded-lg text-white"
                  style={{ background: 'linear-gradient(135deg, #d6486e 0%, #8b0a2e 100%)' }}
                >
                  Reload
                </button>
              </div>
            ) : (
              <>
                {widgetLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 pointer-events-none">
                    <Loader2 size={20} className="animate-spin text-rose-400" />
                    <span className="text-xs text-slate-500">Loading sign-in…</span>
                  </div>
                )}
                <div id="login-container" ref={containerRef} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
