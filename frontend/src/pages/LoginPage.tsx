import { useEffect, useRef, useState } from 'react';
import { HardHat, Loader2 } from 'lucide-react';
import { waitForCatalystSDK, markLoginStarted } from '../utils/catalystAuth';

/**
 * Login page using the Catalyst Web SDK embedded auth widget.
 *
 * catalyst.auth.signIn(containerId, { service_url }) mounts Zoho's
 * credential iframe inside our page instead of navigating away.  After the
 * user authenticates, the SDK sets the session cookie and redirects the browser
 * to `service_url` — which we set to the app root so the app reloads as an
 * authenticated user.
 *
 * This avoids the full-page redirect approach (window.location.href =
 * '/__catalyst/auth/login') which had an empty REDIRECT_URL and therefore
 * never returned to the Slate app after login.
 *
 * Prerequisite: Console → Authentication → Login → Hosted Authentication enabled.
 * The SDK is loaded from index.html:
 *   <script src="https://static.zohocdn.com/catalyst/sdk/js/4.0.0/catalystWebSDK.js"></script>
 *   <script src="/__catalyst/sdk/init.js"></script>
 */
export default function LoginPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkState, setSdkState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    let mounted = true;

    waitForCatalystSDK(10_000).then((sdk) => {
      if (!mounted) return;

      if (!sdk) {
        // SDK not present — fall back to the direct redirect approach
        setSdkState('unavailable');
        return;
      }

      setSdkState('ready');

      // Give React a tick to render the container div before we mount into it.
      requestAnimationFrame(() => {
        if (!mounted || !containerRef.current) return;
        // Mark that login is starting so the auth hook retries on return.
        markLoginStarted();
        try {
          sdk.auth.signIn('catalyst-login-widget', {
            // After login the SDK redirects here.  Using the app root means
            // the browser reloads as an authenticated user.
            service_url: window.location.origin + '/',
          });
        } catch (e) {
          console.error('[LoginPage] catalyst.auth.signIn failed:', e);
          setSdkState('unavailable');
        }
      });
    });

    return () => { mounted = false; };
  }, []);

  // Fallback when SDK isn't available (plain Vite dev, or SDK failed to load).
  function handleFallbackSignIn() {
    markLoginStarted();
    window.location.href = '/__catalyst/auth/login';
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-black px-4">
      <div className="max-w-sm w-full text-center text-white space-y-6">

        {/* Logo + Title */}
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl shrink-0"
            style={{
              background: 'linear-gradient(145deg, #d6486e 0%, #8b0a2e 100%)',
              border: '1px solid rgba(216,72,110,0.5)',
            }}
          >
            <HardHat size={26} className="text-white" />
          </div>
          <div>
            <div className="text-xl font-bold tracking-tight">BuildTrack</div>
            <div className="text-white/50 text-sm">Construction Drawing Management</div>
          </div>
        </div>

        {/* Embedded Catalyst auth widget — SDK mounts the Zoho iframe here */}
        {sdkState === 'loading' && (
          <div className="flex justify-center py-6">
            <Loader2 size={24} className="animate-spin text-white/40" />
          </div>
        )}

        {/* The SDK mounts an iframe into this div by its id */}
        <div
          id="catalyst-login-widget"
          ref={containerRef}
          className={sdkState === 'ready' ? 'min-h-[300px]' : 'hidden'}
        />

        {/* Fallback button when SDK is unavailable */}
        {sdkState === 'unavailable' && (
          <button
            className="w-full rounded-xl bg-white/10 border border-white/10 px-4 py-3 text-sm font-medium hover:bg-white/20 transition-colors"
            onClick={handleFallbackSignIn}
          >
            Sign in with Zoho
          </button>
        )}

        {/* Troubleshooting hint */}
        <p className="text-white/25 text-xs leading-relaxed">
          If sign-in loops back here, check{' '}
          <span className="text-white/40">
            Console → Authentication → Whitelisting → Authorized Domains
          </span>{' '}
          and make sure <span className="text-white/40">buildtrack-withdrawing.onslate.in</span> is listed.
        </p>
      </div>
    </div>
  );
}
