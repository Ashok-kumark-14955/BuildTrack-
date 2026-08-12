'use strict';

/**
 * zoho-token-rotator — Catalyst Advanced I/O Function
 * ─────────────────────────────────────────────────────
 * Rotates (refreshes) the Zoho OAuth access token on demand.
 *
 * Endpoints:
 *   GET  /  → health check → { ok: true }
 *   POST /  → refresh token → { access_token, expires_in, token_type }
 *
 * Required environment variables (set in Catalyst console → Functions → zoho-token-rotator):
 *   ZOHO_CLIENT_ID
 *   ZOHO_CLIENT_SECRET
 *   ZOHO_REFRESH_TOKEN
 *
 * The AppSail backend calls POST / each time it needs a fresh access token.
 * A simple in-memory cache (inside the function instance) avoids hammering
 * the Zoho accounts server on every request.
 */

const https = require('https');

// ─── In-memory token cache ──────────────────────────────────────────────────
// Each Catalyst function instance has its own cache; if the instance is cold-
// started it will fetch a new token. That is fine — Zoho allows many refreshes.
let cachedToken = null;
let cacheExpiresAt = 0; // unix ms

// ─── Helper: POST application/x-www-form-urlencoded ────────────────────────
function postForm(url, body) {
  return new Promise((resolve, reject) => {
    const payload = new URLSearchParams(body).toString();
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          reject(new Error(`Non-JSON response (${res.statusCode}): ${data.slice(0, 300)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─── Helper: send JSON response ─────────────────────────────────────────────
function sendJSON(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
  });
  res.end(body);
}

// ─── Main handler ────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  // OPTIONS pre-flight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    return res.end();
  }

  // Health check
  if (req.method === 'GET') {
    return sendJSON(res, 200, { ok: true, service: 'zoho-token-rotator' });
  }

  // Token rotation — POST /
  if (req.method === 'POST') {
    try {
      const clientId     = process.env.ZOHO_CLIENT_ID;
      const clientSecret = process.env.ZOHO_CLIENT_SECRET;
      const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

      if (!clientId || !clientSecret || !refreshToken) {
        return sendJSON(res, 500, {
          error: 'missing_env',
          message: 'ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN must be set as function environment variables.',
        });
      }

      const now = Date.now();

      // Return cached token if still valid (buffer of 90 seconds)
      if (cachedToken && now < cacheExpiresAt - 90_000) {
        return sendJSON(res, 200, {
          access_token: cachedToken,
          expires_in: Math.floor((cacheExpiresAt - now) / 1000),
          token_type: 'Bearer',
          source: 'cache',
        });
      }

      // Refresh the token from Zoho Accounts India DC
      const result = await postForm('https://accounts.zoho.in/oauth/v2/token', {
        grant_type:    'refresh_token',
        client_id:     clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
      });

      const data = result.body;

      if (data.error || !data.access_token) {
        console.error('[zoho-token-rotator] Zoho returned error:', JSON.stringify(data));
        return sendJSON(res, 502, {
          error:   data.error || 'no_access_token',
          message: data.error_description || 'Zoho token refresh failed',
          zoho:    data,
        });
      }

      // Cache the new token
      const expiresIn = data.expires_in ?? 3600; // seconds
      cachedToken    = data.access_token;
      cacheExpiresAt = now + expiresIn * 1000;

      console.log(`[zoho-token-rotator] Token refreshed. Expires in ${expiresIn}s.`);

      return sendJSON(res, 200, {
        access_token: data.access_token,
        expires_in:   expiresIn,
        token_type:   data.token_type || 'Bearer',
        source:       'zoho',
      });
    } catch (err) {
      console.error('[zoho-token-rotator] Unexpected error:', err);
      return sendJSON(res, 500, {
        error:   'internal_error',
        message: err.message,
      });
    }
  }

  // Method not allowed
  return sendJSON(res, 405, { error: 'method_not_allowed' });
};
