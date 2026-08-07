/**
 * stratus.ts
 *
 * Catalyst Stratus helper — uploads files to object storage and returns a
 * time-limited (7-day) signed GET URL. Signed URLs are regenerated on every
 * GET request for a drawing, so the link is always fresh.
 *
 * Bucket name is read from STRATUS_BUCKET env var (default: "buildtrack").
 * The bucket must already exist in the Catalyst Console → Cloud Scale → Stratus,
 * OR you need to create it there before first use.
 */

import catalyst from 'zcatalyst-sdk-node';
import type { Request } from 'express';
import { v4 as uuid } from 'uuid';

const BUCKET_NAME = process.env.STRATUS_BUCKET || 'buildtrack';

/**
 * Returns a Catalyst SDK instance with admin scope.
 * In AppSail, passing null (no req) forces the SDK to use the service-account
 * credentials injected by the AppSail runtime — no user session needed.
 */
function adminApp() {
  return catalyst.initialize(null as any, { scope: 'admin' });
}

/**
 * Upload a buffer to Stratus and return the object key.
 * The key is stored in the DB; call getSignedUrl(key) to get a fresh link.
 */
export async function uploadFile(
  _req: Request,
  buffer: Buffer,
  mimetype: string,
  folder = 'uploads'
): Promise<string> {
  const ext = mimetype.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
  const key = `${folder}/${uuid()}.${ext}`;
  const bucket = adminApp().stratus().bucket(BUCKET_NAME);
  await bucket.putObject(key, buffer, { contentType: mimetype, overwrite: false });
  return key;
}

/**
 * Generate a 7-day signed GET URL for the given Stratus object key.
 * Call this whenever the frontend asks for a drawing/photo — the URL is
 * always fresh so it never 404s.
 */
export async function getSignedUrl(_req: Request, key: string): Promise<string> {
  const bucket = adminApp().stratus().bucket(BUCKET_NAME);
  // expiryIn must be a number (seconds). 7 days = 604800s.
  const res = await bucket.generatePreSignedUrl(key, 'GET', {
    expiryIn: 7 * 24 * 3600,
  } as any);

  // Log full response in case the property name ever changes between SDK versions
  console.log('[stratus] presign response keys:', Object.keys(res || {}));
  console.log('[stratus] presign signature:', res?.signature ? res.signature.slice(0, 80) : '(empty)');

  const url = res?.signature || '';
  if (!url) {
    console.error('[stratus] No signed URL found. Full response:', JSON.stringify(res));
  }
  return url;
}

/**
 * Returns true when we are running inside Catalyst (AppSail / Functions).
 *
 * Catalyst sets several environment variables on all managed runtimes.
 * We check multiple known ones so the detection is robust across
 * different Catalyst runtime versions.
 */
export function isStratusEnabled(): boolean {
  const enabled = Boolean(
    process.env.X_ZOHO_CATALYST_LISTEN_PORT ||
    process.env.CATALYST_PROJECT_ID ||
    process.env.X_ZOHO_CATALYST_PROJECT_ID ||
    process.env.ZOHO_CATALYST_PROJECT_ID ||
    process.env.X_CATALYST_ENVIRONMENT ||
    process.env.CATALYST_ENVIRONMENT ||
    // AppSail always injects an API domain variable
    process.env.X_ZOHO_CATALYST_API_DOMAIN ||
    // Explicit opt-in via env var (useful for testing)
    process.env.USE_STRATUS === 'true'
  );

  // Log once at startup so we can confirm the correct path is taken
  if (!_stratusLogged) {
    _stratusLogged = true;
    const keys = Object.keys(process.env).filter((k) =>
      k.includes('CATALYST') || k.includes('ZOHO') || k === 'USE_STRATUS'
    );
    console.log('[stratus] isStratusEnabled =', enabled, '| relevant env keys:', keys.join(', ') || '(none)');
  }

  return enabled;
}

let _stratusLogged = false;
