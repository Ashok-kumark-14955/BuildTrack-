import { useEffect, useState } from 'react';
import type { CatalystUser } from '../types';

// ─── Catalyst Web SDK surface (only the pieces we use) ────────────────────────

interface CatalystAuthSDK {
  signIn: (containerId: string, config: { service_url: string }) => void;
  signOut: (redirectUrl: string) => void;
  isUserAuthenticated: () => Promise<unknown>;
}

interface CatalystSDK {
  auth: CatalystAuthSDK;
}

declare global {
  interface Window {
    catalyst?: CatalystSDK;
  }
}

// ─── Post-login detection ─────────────────────────────────────────────────────
//
// The Catalyst hosted-auth flow is:
//   1. User clicks "Sign in" on our page.
//   2. Browser navigates to /__catalyst/auth/login (same Slate domain).
//   3. Catalyst redirects to its own auth domain (catalystserverless.in) for credentials.
//   4. After successful login, Catalyst sets an HttpOnly session cookie and
//      redirects back to the Slate origin (our app root).
//
// Between steps 3 and 4 the browser crosses a different domain, so
// `sessionStorage` is wiped — it does NOT survive cross-origin redirects.
// We use `localStorage` (with a short TTL) as the signal that we just
// initiated a login so the app knows to retry `isUserAuthenticated()` with
// back-off once we're back.
//
// NOTE: `localStorage` is also cleared in private/incognito between sessions,
// so we additionally use a short timestamp so a stale flag from a previous
// failed attempt doesn't falsely activate the retry path hours later.

const LOGIN_FLAG_KEY = '__bt_login_ts';
const LOGIN_FLAG_TTL_MS = 5 * 60 * 1000; // 5 minutes — more than enough for any redirect flow

/** Returns true if we just came back from a login redirect (within the TTL window). */
function isPostLoginRedirect(): boolean {
  const search = window.location.search;
  const hash = window.location.hash;

  // Catalyst may append these params on the return redirect.
  if (/[?&](code|catalyst_redirect|auth_token|access_token)=/.test(search)) return true;
  if (/#access_token=/.test(hash)) return true;

  // Our own localStorage timestamp flag.
  try {
    const ts = Number(localStorage.getItem(LOGIN_FLAG_KEY) ?? '0');
    if (ts && Date.now() - ts < LOGIN_FLAG_TTL_MS) return true;
  } catch {
    // localStorage may be blocked (private browsing strict mode, etc.) — non-fatal.
  }
  return false;
}

/** Set before navigating away to the Catalyst auth endpoint so `isPostLoginRedirect()` fires on return. */
export function markLoginStarted(): void {
  try {
    localStorage.setItem(LOGIN_FLAG_KEY, String(Date.now()));
  } catch {
    // non-fatal
  }
}

/** Clear the flag once we've successfully resolved the session. */
function clearLoginFlag(): void {
  try {
    localStorage.removeItem(LOGIN_FLAG_KEY);
  } catch {
    // non-fatal
  }
}

// Local dev (`vite dev`) never serves /__catalyst/sdk/init.js — only a real
// Catalyst environment (Slate, or `catalyst serve`) does, so there's no point
// waiting long locally. Either way, a timeout falls back to a local user
// instead of blocking the app — see FALLBACK_USER below.
//
// On a real Catalyst Slate environment, give the SDK more time after a login
// redirect because the Catalyst hosted-auth flow sets an HttpOnly cookie then
// redirects back — the SDK needs an extra round-trip to confirm the session.
const isPostLogin = isPostLoginRedirect();
const SDK_TIMEOUT_MS = import.meta.env.DEV
  ? 1500
  : isPostLogin
    ? 15_000   // extra time to settle after login redirect
    : 8_000;

const SDK_POLL_INTERVAL_MS = 100;

/** Polls for `window.catalyst` until it's ready or `timeoutMs` elapses (resolves null on timeout, never rejects). */
export function waitForCatalystSDK(timeoutMs = SDK_TIMEOUT_MS): Promise<CatalystSDK | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (window.catalyst?.auth?.signIn) {
        resolve(window.catalyst);
        return;
      }
      if (Date.now() - start >= timeoutMs) {
        resolve(null);
        return;
      }
      setTimeout(check, SDK_POLL_INTERVAL_MS);
    };
    check();
  });
}

/** Used whenever Catalyst sign-in can't be completed — SDK unreachable or no active session — so the app never blocks on login. */
const FALLBACK_USER: CatalystUser = {
  user_id: 'local',
  email_id: 'site.engineer@local',
  first_name: 'Site',
  last_name: 'Engineer',
  display_name: 'Site Engineer',
};

/** Normalizes whatever shape isUserAuthenticated() resolves with into our CatalystUser, keeping any extra fields (e.g. role_name) intact. */
function toCatalystUser(raw: any): CatalystUser {
  const u = (raw && (raw.content ?? raw.data ?? raw)) ?? {};
  const first = u.first_name ?? '';
  const last = u.last_name ?? '';
  return {
    ...u,
    user_id: String(u.user_id ?? u.zuid ?? ''),
    email_id: u.email_id ?? '',
    first_name: first,
    last_name: last,
    display_name: u.display_name || [first, last].filter(Boolean).join(' ') || u.email_id || 'User',
  };
}

/**
 * Retries `isUserAuthenticated()` up to `maxAttempts` times with an
 * exponential back-off starting at `baseDelayMs`.  Resolves with the user on
 * the first success; rejects only after all attempts have failed.
 *
 * This is specifically needed in the post-login redirect case where the
 * Catalyst session cookie is freshly set but the SDK's internal token state
 * hasn't caught up yet.
 */
async function authenticatedWithRetry(
  sdk: CatalystSDK,
  maxAttempts: number,
  baseDelayMs: number,
): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await sdk.auth.isUserAuthenticated();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

// 'unauthenticated' only fires when a real Catalyst SDK is present (i.e. running
// on Slate/Catalyst) AND isUserAuthenticated() rejects after all retries —
// local dev (no SDK) always falls straight through to 'ready' with FALLBACK_USER.
export type CatalystAuthStatus = 'checking' | 'ready' | 'unauthenticated';

/** Resolves the Catalyst SDK and current session. Only gates on login when a real Catalyst session check fails; never blocks local dev. */
export function useCatalystAuth(): { status: CatalystAuthStatus; user: CatalystUser | null; recheck: () => void } {
  const [status, setStatus] = useState<CatalystAuthStatus>('checking');
  const [user, setUser] = useState<CatalystUser | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    waitForCatalystSDK().then(async (sdk) => {
      if (cancelled) return;

      if (!sdk) {
        if (import.meta.env.DEV) {
          console.warn('[auth] Catalyst SDK not found — using local fallback user. Run via `catalyst serve` to test real login.');
        }
        setUser(FALLBACK_USER);
        setStatus('ready');
        return;
      }

      try {
        // After a login redirect give the session up to 5 retries with
        // exponential back-off (500ms → 1s → 2s → 4s → 8s) before declaring
        // unauthenticated. The flag is cleared on the first success so
        // subsequent page loads don't activate the retry path unnecessarily.
        // In the normal case (session already established) the first attempt
        // succeeds immediately.
        const postLogin = isPostLoginRedirect();
        const res = await authenticatedWithRetry(
          sdk,
          postLogin ? 5 : 1,
          500,
        );
        if (cancelled) return;
        // Session confirmed — clear the login flag so future normal loads
        // don't incur the extra retry overhead.
        clearLoginFlag();
        setUser(toCatalystUser(res));
        setStatus('ready');
      } catch {
        if (cancelled) return;
        setUser(null);
        setStatus('unauthenticated');
      }
    });

    return () => { cancelled = true; };
  }, [nonce]);

  return { status, user, recheck: () => setNonce((n) => n + 1) };
}

/** Ends the Catalyst session and redirects to the app root. */
export async function signOutOfCatalyst() {
  const sdk = await waitForCatalystSDK(2000);
  if (!sdk) {
    window.location.reload();
    return;
  }
  sdk.auth.signOut(window.location.origin);
}
