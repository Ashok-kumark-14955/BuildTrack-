import { useEffect, useRef, useState } from 'react';
import { HardHat, Loader2, LogIn, ChevronDown } from 'lucide-react';
import { waitForCatalystSDK, markLoginStarted } from '../utils/catalystAuth';
import { PAGE_GRADIENT } from '../theme';

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
/**
 * The SDK mounts its iframe with `style="height:100%"`, which can only resolve
 * against a parent with a *definite* height. Our container only sets a
 * min-height, so the percentage fails to resolve and the iframe collapses to
 * the browser's default replaced-element height (150px) — clipping the form
 * right below the email field, hiding the "Next" button entirely even though
 * it renders correctly underneath.
 *
 * The iframe is same-origin (Catalyst proxies the Zoho accounts flow through
 * our own domain), so instead of guessing a fixed height we measure its real
 * content height and keep the iframe sized to match — including across the
 * email -> password step transition and any error/CAPTCHA states, which all
 * change the content height without a full iframe reload.
 *
 * Measure `.signin_container` specifically, not `body`/`documentElement`:
 * Zoho's stylesheet has a `position:fixed` full-bleed background layer
 * (`.bg_one`, `height:100%` against the iframe's own viewport) that we
 * observed create a runaway feedback loop when body scrollHeight was used —
 * growing the iframe grew that layer, which grew scrollHeight, which grew
 * the iframe again (150px -> 5558px -> 25494px in three ticks). `.signin_container`
 * is a normal-flow element whose height doesn't depend on the iframe's own
 * size, so observing it can't feed back into itself. The height is clamped
 * as a defense-in-depth backstop given we've already seen this class of bug.
 */
function autoSizeEmbeddedIframe(container: HTMLElement): () => void {
  let resizeObserver: ResizeObserver | null = null;
  let iframeEl: HTMLIFrameElement | null = null;

  function measureAndApply() {
    if (!iframeEl) return;
    try {
      const doc = iframeEl.contentDocument;
      const content = doc?.querySelector('.signin_container') as HTMLElement | null;
      const height = content?.scrollHeight || doc?.body.scrollHeight || 0;
      if (height) iframeEl.style.height = `${Math.min(height + 8, 900)}px`;
    } catch {
      // Same-origin in practice; ignore if that ever changes rather than throw.
    }
  }

  function reobserveBody() {
    resizeObserver?.disconnect();
    measureAndApply();
    try {
      const target = (iframeEl?.contentDocument?.querySelector('.signin_container') as HTMLElement | null)
        ?? iframeEl?.contentDocument?.body ?? null;
      if (target) {
        resizeObserver = new ResizeObserver(measureAndApply);
        resizeObserver.observe(target);
      }
    } catch {
      // ignore
    }
  }

  function onIframeFound(iframe: HTMLIFrameElement) {
    if (iframeEl === iframe) return;
    iframeEl = iframe;
    // Re-run on every load in case a step transition is a full navigation
    // rather than an in-page DOM change (the ResizeObserver alone would miss that).
    iframe.addEventListener('load', reobserveBody);
    reobserveBody();
  }

  const existing = container.querySelector('iframe');
  if (existing) onIframeFound(existing as HTMLIFrameElement);

  const mutationObserver = new MutationObserver(() => {
    const iframe = container.querySelector('iframe');
    if (iframe) onIframeFound(iframe as HTMLIFrameElement);
  });
  mutationObserver.observe(container, { childList: true, subtree: true });

  return () => {
    mutationObserver.disconnect();
    resizeObserver?.disconnect();
    iframeEl?.removeEventListener('load', reobserveBody);
  };
}

export default function LoginPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkState, setSdkState] = useState<'loading' | 'ready' | 'unavailable'>('loading');

  useEffect(() => {
    let mounted = true;
    let stopAutoSize: (() => void) | null = null;

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
            // Re-themes the embedded form to match BuildTrack's dark UI instead
            // of Zoho's default light widget — see public/embedded_signin.css.
            css_url: '/embedded_signin.css',
          });
          stopAutoSize = autoSizeEmbeddedIframe(containerRef.current);
        } catch (e) {
          console.error('[LoginPage] catalyst.auth.signIn failed:', e);
          setSdkState('unavailable');
        }
      });
    });

    return () => {
      mounted = false;
      stopAutoSize?.();
    };
  }, []);

  // Fallback when SDK isn't available (plain Vite dev, or SDK failed to load).
  function handleFallbackSignIn() {
    markLoginStarted();
    window.location.href = '/__catalyst/auth/login';
  }

  return (
    <div
      className="relative flex min-h-screen w-screen items-center justify-center overflow-hidden px-4 py-12"
      style={{ background: PAGE_GRADIENT }}
    >
      {/* Ambient glow blobs, matching the accent treatment used across the app */}
      <div
        className="pointer-events-none absolute -top-32 -left-24 h-80 w-80 rounded-full opacity-40 blur-3xl"
        style={{ background: 'radial-gradient(circle, #d6486e 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(circle, #fb923c 0%, transparent 70%)' }}
      />

      <div className="animate-fade-in-up relative w-full max-w-md">
        <div
          className="overflow-hidden rounded-3xl shadow-2xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Top accent bar */}
          <div
            className="h-1 w-full shrink-0"
            style={{ background: 'linear-gradient(90deg, #8b0a2e, #d6486e, #fb923c, #d6486e, #8b0a2e)' }}
          />

          <div className="space-y-6 px-8 py-10 text-center text-white">
            {/* Logo + Title */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-xl"
                style={{
                  background: 'linear-gradient(145deg, #d6486e 0%, #8b0a2e 100%)',
                  border: '1px solid rgba(216,72,110,0.5)',
                  boxShadow: '0 0 24px rgba(214,72,110,0.4)',
                }}
              >
                <HardHat size={26} className="text-white" />
              </div>
              <div>
                <div className="text-xl font-bold tracking-tight">BuildTrack</div>
                <div className="text-sm text-white/50">Construction Drawing Management</div>
              </div>
            </div>

            {/* Embedded Catalyst auth widget — SDK mounts the Zoho iframe here */}
            {sdkState === 'loading' && (
              <div className="flex flex-col items-center gap-3 py-8" role="status" aria-live="polite">
                <Loader2 size={22} className="animate-spin text-white/40" />
                <span className="text-xs font-medium tracking-wide text-white/40">Connecting to sign-in…</span>
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
              <button className="btn btn-primary w-full py-3" onClick={handleFallbackSignIn}>
                <LogIn size={16} />
                Sign in with Zoho
              </button>
            )}
          </div>
        </div>

        {/* Troubleshooting hint — tucked behind a disclosure so it stays out of the way by default */}
        <details className="group mt-4">
          <summary className="flex cursor-pointer list-none items-center justify-center gap-1 text-xs text-white/30 transition-colors hover:text-white/50">
            Trouble signing in?
            <ChevronDown size={12} className="transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-2 text-center text-xs leading-relaxed text-white/30">
            If sign-in loops back here, check{' '}
            <span className="text-white/50">Console → Authentication → Whitelisting → Authorized Domains</span> and
            make sure <span className="text-white/50">buildtrack-withdrawing.onslate.in</span> is listed.
          </p>
        </details>

        <div className="mt-6 text-center text-[11px] text-white/20">BuildTrack &copy; 2026 · Built on Zoho Catalyst</div>
      </div>
    </div>
  );
}
