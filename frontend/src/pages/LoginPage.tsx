/**
 * LoginPage
 *
 * Shown when the user is not authenticated via Zoho Catalyst.
 * Clicking "Sign in with Zoho" redirects to Catalyst's built-in
 * Hosted Login route at /__catalyst/auth/login (NOT /__catalyst/login —
 * that path doesn't exist and trips the gateway's INVALID_URL_PATTERN error).
 *
 * IMPORTANT: /__catalyst/auth/login is served by the Catalyst Slate gateway
 * at the Slate origin (*.onslate.in), NOT by the AppSail backend.
 * So we always redirect to `window.location.origin + /__catalyst/auth/login`.
 */

export default function LoginPage() {
  function handleLogin() {
    // /__catalyst/auth/login is available on the Slate domain (*.onslate.in).
    // After OAuth completes, Catalyst redirects back to this same origin.
    window.location.href = `${window.location.origin}/__catalyst/auth/login`;
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen w-screen overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse 80% 60% at 10% 20%, rgba(190,24,93,0.45) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 90% 80%, rgba(157,23,77,0.35) 0%, transparent 60%), linear-gradient(135deg, #4a0020 0%, #6b0030 35%, #5a0028 65%, #3d001a 100%)',
      }}
    >
      {/* Decorative blurred circles */}
      <div className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full bg-rose-700/20 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-60px] right-[-60px] w-96 h-96 rounded-full bg-rose-900/20 blur-3xl pointer-events-none" />

      {/* Card */}
      <div
        className="relative z-10 w-full max-w-sm mx-4 rounded-2xl border border-rose-900/40 shadow-2xl overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #1a0010 0%, #0f0008 60%, #140010 100%)' }}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-rose-700 via-rose-500 to-rose-700" />

        <div className="px-8 py-10 flex flex-col items-center gap-6">
          {/* Logo / Icon */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-rose-900/50 border border-rose-700/50 flex items-center justify-center shadow-lg">
              <svg
                width="34"
                height="34"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-rose-300"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <div className="text-center">
              <h1 className="text-white text-xl font-bold tracking-tight">BuildTrack</h1>
              <p className="text-rose-300/70 text-xs mt-0.5 tracking-wide uppercase font-medium">
                Construction Management
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-rose-800/50 to-transparent" />

          {/* Sign-in prompt */}
          <div className="text-center space-y-1.5">
            <h2 className="text-slate-100 font-semibold text-base">Welcome back</h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              Sign in with your Zoho account to access your projects and drawings.
            </p>
          </div>

          {/* Sign in button */}
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 px-5 py-3 rounded-xl
                       bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500
                       text-white font-semibold text-sm transition-all duration-200
                       shadow-lg shadow-rose-900/40 hover:shadow-rose-800/50
                       border border-rose-600/40 hover:border-rose-500/60
                       active:scale-[0.98]"
          >
            {/* Zoho "Z" icon */}
            <span className="w-5 h-5 rounded bg-white/20 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
              Z
            </span>
            Sign in with Zoho
          </button>

          {/* Footer note */}
          <p className="text-slate-600 text-xs text-center leading-relaxed">
            Authenticated via Zoho Catalyst.{' '}
            <br />
            Your session is managed securely.
          </p>
        </div>
      </div>
    </div>
  );
}
