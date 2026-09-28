import type { CatalystUser } from '../types';

// Login has been removed — the app always runs as this local user, no sign-in/out flow.
const FALLBACK_USER: CatalystUser = {
  user_id: 'local',
  email_id: 'site.engineer@local',
  first_name: 'Site',
  last_name: 'Engineer',
  display_name: 'Site Engineer',
};

export type CatalystAuthStatus = 'ready';

/** Kept for API compatibility with callers — always resolves immediately with the local user. */
export function useCatalystAuth(): { status: CatalystAuthStatus; user: CatalystUser | null; recheck: () => void } {
  return { status: 'ready', user: FALLBACK_USER, recheck: () => {} };
}
