import { createHash, randomBytes, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'gasstrom_session';
const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

function digest(value) {
    return createHash('sha256').update(value).digest();
}

export function safeTokenEqual(actual, expected) {
    if (typeof actual !== 'string' || typeof expected !== 'string') return false;
    return timingSafeEqual(digest(actual), digest(expected));
}

export function parseCookies(header = '') {
    return Object.fromEntries(header.split(';').map(part => part.trim()).filter(Boolean).map(part => {
        const separator = part.indexOf('=');
        if (separator < 0) return [part, ''];
        const rawValue = part.slice(separator + 1);
        try {
            return [part.slice(0, separator), decodeURIComponent(rawValue)];
        } catch {
            return [part.slice(0, separator), ''];
        }
    }));
}

export function createAuth({ accessToken, trustProxyAuth = false, secureCookie = false }) {
    const sessions = new Map();
    const required = Boolean(accessToken) && !trustProxyAuth;

    function removeExpiredSessions() {
        const now = Date.now();
        for (const [id, expiresAt] of sessions) {
            if (expiresAt <= now) sessions.delete(id);
        }
    }

    function isAuthenticated(req) {
        if (!required) return true;
        const sessionId = parseCookies(req.headers.cookie)[COOKIE_NAME];
        const expiresAt = sessionId ? sessions.get(sessionId) : undefined;
        if (!expiresAt || expiresAt <= Date.now()) {
            if (sessionId) sessions.delete(sessionId);
            return false;
        }
        return true;
    }

    function setSessionCookie(res, sessionId, maxAgeSeconds) {
        const attributes = [
            `${COOKIE_NAME}=${encodeURIComponent(sessionId)}`,
            'Path=/',
            'HttpOnly',
            'SameSite=Strict',
            `Max-Age=${maxAgeSeconds}`
        ];
        if (secureCookie) attributes.push('Secure');
        res.setHeader('Set-Cookie', attributes.join('; '));
    }

    return {
        required,
        status(req, res) {
            removeExpiredSessions();
            res.json({ required, authenticated: isAuthenticated(req) });
        },
        login(req, res) {
            if (!required) return res.json({ required: false, authenticated: true });
            if (typeof req.body?.token !== 'string' || req.body.token.length > 512 || !safeTokenEqual(req.body.token, accessToken)) {
                return res.status(401).json({ error: 'invalid_access_token' });
            }
            removeExpiredSessions();
            const sessionId = randomBytes(32).toString('base64url');
            sessions.set(sessionId, Date.now() + SESSION_DURATION_MS);
            setSessionCookie(res, sessionId, SESSION_DURATION_MS / 1000);
            return res.json({ required: true, authenticated: true });
        },
        logout(req, res) {
            const sessionId = parseCookies(req.headers.cookie)[COOKIE_NAME];
            if (sessionId) sessions.delete(sessionId);
            setSessionCookie(res, '', 0);
            res.status(204).end();
        },
        middleware(req, res, next) {
            if (isAuthenticated(req)) return next();
            return res.status(401).json({ error: 'authentication_required' });
        }
    };
}
