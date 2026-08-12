"use strict";
/**
 * zohoAuth.ts
 * -----------
 * Manages Zoho OAuth 2.0 tokens for Zoho Projects API access.
 *
 * Architecture:
 *   This module delegates token refresh to the "zoho-token-rotator" Catalyst
 *   Function (Advanced I/O) rather than calling Zoho Accounts directly.
 *   This keeps the OAuth credentials isolated in the function environment and
 *   allows the function to be the single source of truth for token rotation.
 *
 * Function URL (Development):
 *   https://project-rainfall-60081725173.development.catalystserverless.in/server/zoho-token-rotator/
 *
 * Override via env var: ZOHO_TOKEN_ROTATOR_URL
 *
 * Fallback (if function URL not set):
 *   Falls back to direct Zoho Accounts refresh using ZOHO_CLIENT_ID,
 *   ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN env vars on the AppSail service.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAccessToken = getAccessToken;
exports.exchangeCodeForTokens = exchangeCodeForTokens;
const https_1 = __importDefault(require("https"));
const http_1 = __importDefault(require("http"));
// ─── Defaults ─────────────────────────────────────────────────────────────────
const DEFAULT_ROTATOR_URL = 'https://project-rainfall-60081725173.development.catalystserverless.in/server/zoho-token-rotator/';
const ZOHO_ACCOUNTS_URL = 'https://accounts.zoho.in';
const tokenStore = {
    accessToken: null,
    expiresAt: 0,
};
// ─── HTTP helpers ─────────────────────────────────────────────────────────────
function httpPost(url, body, headers) {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const isHttps = parsed.protocol === 'https:';
        const lib = isHttps ? https_1.default : http_1.default;
        const options = {
            hostname: parsed.hostname,
            port: parsed.port || (isHttps ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: 'POST',
            headers: {
                ...headers,
                'Content-Length': Buffer.byteLength(body),
            },
        };
        const req = lib.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => (data += chunk));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                }
                catch {
                    reject(new Error(`Non-JSON response (${res.statusCode}): ${data.slice(0, 300)}`));
                }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}
// ─── Strategy 1: Rotate via Catalyst Function ─────────────────────────────────
async function refreshViaFunction() {
    const rotatorUrl = (process.env.ZOHO_TOKEN_ROTATOR_URL || DEFAULT_ROTATOR_URL).replace(/\/$/, '') + '/';
    const result = await httpPost(rotatorUrl, '', // POST body not required; function reads creds from its own env vars
    { 'Content-Type': 'application/json' });
    if (result.error || !result.access_token) {
        throw new Error(`Token rotator function error: ${result.error || 'no access_token'} — ${result.message || ''}`);
    }
    // Update local cache with what the function returned
    const expiresIn = result.expires_in ?? 3600;
    tokenStore.accessToken = result.access_token;
    tokenStore.expiresAt = Date.now() + expiresIn * 1000;
    console.log(`[zohoAuth] Token rotated via Function (source: ${result.source || 'unknown'}). Expires in ${expiresIn}s.`);
    return tokenStore.accessToken;
}
// ─── Strategy 2: Rotate directly (fallback) ──────────────────────────────────
async function refreshDirect() {
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('Zoho OAuth credentials not set. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN, ' +
            'or set ZOHO_TOKEN_ROTATOR_URL to use the Catalyst Function.');
    }
    const payload = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
    }).toString();
    const result = await httpPost(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, payload, { 'Content-Type': 'application/x-www-form-urlencoded' });
    if (result.error || !result.access_token) {
        throw new Error(`Direct token refresh failed: ${result.error || 'no access_token'} — ${result.error_description || ''}`);
    }
    const expiresIn = result.expires_in ?? 3600;
    tokenStore.accessToken = result.access_token;
    tokenStore.expiresAt = Date.now() + expiresIn * 1000;
    console.log(`[zohoAuth] Token refreshed directly from Zoho Accounts. Expires in ${expiresIn}s.`);
    return tokenStore.accessToken;
}
// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Get a valid Zoho OAuth access token.
 *
 * Priority:
 *   1. Returns the cached token if it's still valid (60s safety buffer).
 *   2. Calls the zoho-token-rotator Catalyst Function (POST /).
 *   3. Falls back to a direct Zoho Accounts refresh if the function is
 *      unreachable or returns an error, and direct credentials are available.
 */
async function getAccessToken() {
    const now = Date.now();
    // Return cached token if still valid (60s buffer)
    if (tokenStore.accessToken && now < tokenStore.expiresAt - 60000) {
        return tokenStore.accessToken;
    }
    // Try via Catalyst Function first
    try {
        return await refreshViaFunction();
    }
    catch (fnErr) {
        console.warn(`[zohoAuth] Function refresh failed (${fnErr.message}), falling back to direct refresh.`);
    }
    // Fallback: direct refresh
    return refreshDirect();
}
/**
 * Exchange an authorization code for tokens (run once via the /exchange endpoint).
 */
async function exchangeCodeForTokens(code) {
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
        throw new Error('ZOHO_CLIENT_ID and ZOHO_CLIENT_SECRET env vars must be set');
    }
    const payload = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: 'https://www.zoho.in',
        code,
    }).toString();
    const result = await httpPost(`${ZOHO_ACCOUNTS_URL}/oauth/v2/token`, payload, { 'Content-Type': 'application/x-www-form-urlencoded' });
    if (result.error) {
        throw new Error(`Token exchange failed: ${result.error} — ${result.error_description || ''}`);
    }
    return result;
}
