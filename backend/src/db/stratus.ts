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

function app(req: Request) {
  return catalyst.initialize(req as any, { scope: 'admin' });
}

/**
 * Upload a buffer to Stratus and return the object key.
 * The key is stored in the DB; call getSignedUrl(req, key) to get a fresh link.
 */
export async function uploadFile(
  req: Request,
  buffer: Buffer,
  mimetype: string,
  folder = 'uploads'
): Promise<string> {
  const ext = mimetype.split('/')[1]?.replace('jpeg', 'jpg') || 'bin';
  const key = `${folder}/${uuid()}.${ext}`;
  const bucket = app(req).stratus().bucket(BUCKET_NAME);
  await bucket.putObject(key, buffer, { contentType: mimetype, overwrite: false });
  return key;
}

/**
 * Generate a 7-day signed GET URL for the given Stratus object key.
 * Call this whenever the frontend asks for a drawing/photo — the URL is
 * always fresh so it never 404s.
 */
export async function getSignedUrl(req: Request, key: string): Promise<string> {
  const bucket = app(req).stratus().bucket(BUCKET_NAME);
  const res = await bucket.generatePreSignedUrl(key, 'GET', {
    expiryIn: String(7 * 24 * 3600), // 7 days — must be a string per SDK
  });

  // Log the full response so we can see every property the SDK returns.
  // This will appear in the AppSail function logs in Catalyst Console.
  console.log('[stratus] generatePreSignedUrl raw response:', JSON.stringify(res));

  // The SDK TypeScript type declares `res.signature` but the actual API
  // response may use a different key. Use the first truthy string we find.
  const url = (res as any).signed_url
    || (res as any).signedUrl
    || (res as any).url
    || (res as any).link
    || res.signature
    || '';

  if (!url) {
    console.error('[stratus] No signed URL found in response. Full response:', JSON.stringify(res));
  }

  return url as string;
}

/**
 * Returns true when we are running inside Catalyst (AppSail).
 */
export function isStratusEnabled(): boolean {
  return Boolean(process.env.X_ZOHO_CATALYST_LISTEN_PORT);
}
