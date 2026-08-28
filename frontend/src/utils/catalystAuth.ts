import { useEffect, useState } from 'react';
import type { CatalystUser } from '../types';

// ─── Catalyst Web SDK surface (only the pieces we use) ────────────────────────

interface CatalystAuthSDK {
  signIn: (containerId: string, config: { login_redirect: string }) => void;
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

// Local dev (`vite dev`) never serves /__catalyst/sdk/init.js — only a real
// Catalyst environment (Slate, or `catalyst serve`) does, so there's no point
// waiting long locally. Either way, a timeout falls back to a local user
// instead of blocking the app — see FALLBACK_USER below.
const SDK_TIMEOUT_MS = import.meta.env.DEV ? 1500 : 8000;
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

export type CatalystAuthStatus = 'checking' | 'ready';

/** Resolves the Catalyst SDK and current session, but never blocks the app — falls back to FALLBACK_USER if sign-in can't be completed. */
export function useCatalystAuth(): { status: CatalystAuthStatus; user: CatalystUser | null } {
  const [status, setStatus] = useState<CatalystAuthStatus>('checking');
  const [user, setUser] = useState<CatalystUser | null>(null);

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
        const res = await sdk.auth.isUserAuthenticated();
        if (cancelled) return;
        setUser(toCatalystUser(res));
        setStatus('ready');
      } catch {
        if (cancelled) return;
        setUser(FALLBACK_USER);
        setStatus('ready');
      }
    });

    return () => { cancelled = true; };
  }, []);

  return { status, user };
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
