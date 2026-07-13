import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { mkdir, readdir, stat, rm } from 'fs/promises';
import cron from 'node-cron';
import { Database } from './database.js';
import { GasStromRepository } from './repository.js';
import { createAuth } from './auth.js';
import { ALLOWED_SETTING_KEYS, isSafeBackupFilename, validateImage, validateReading, validateSettings } from './validation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const port = Number(process.env.PORT || 4735);
const host = process.env.HOST || (isProduction ? '0.0.0.0' : '127.0.0.1');
const dbPath = resolve(process.env.DB_PATH || join(__dirname, 'database.sqlite'));
const backupDir = resolve(process.env.BACKUP_DIR || join(dirname(dbPath), 'backups'));
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const defaultGeminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const maxImportRows = Number(process.env.MAX_IMPORT_ROWS || 10_000);
const accessToken = process.env.ACCESS_TOKEN || '';
const trustProxyAuth = process.env.TRUST_PROXY_AUTH === 'true';
const secureCookie = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE !== 'false' : isProduction;
const isLoopbackHost = ['127.0.0.1', 'localhost', '::1'].includes(host);

if (accessToken && accessToken.length < 16) throw new Error('ACCESS_TOKEN must contain at least 16 characters');
if (isProduction && !isLoopbackHost && !accessToken && !trustProxyAuth) {
    throw new Error('Refusing unauthenticated public binding: configure ACCESS_TOKEN or TRUST_PROXY_AUTH=true');
}

const app = express();
const database = new Database(dbPath);
await mkdir(backupDir, { recursive: true });
await database.open();
const repository = new GasStromRepository(database);
const auth = createAuth({ accessToken, trustProxyAuth, secureCookie });

app.disable('x-powered-by');
app.use((req, res, next) => {
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'no-referrer',
        'Permissions-Policy': 'camera=(self), geolocation=()'
    });
    next();
});
app.use(cors({
    origin(origin, callback) {
        if (!origin || !isProduction || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));
app.use(express.json({ limit: '9mb', strict: true }));

function rateLimit({ windowMs, max }) {
    const buckets = new Map();
    return (req, res, next) => {
        const key = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        if (buckets.size > 1_000) {
            for (const [bucketKey, value] of buckets) {
                if (value.resetAt <= now) buckets.delete(bucketKey);
            }
        }
        const bucket = buckets.get(key);
        if (!bucket || bucket.resetAt <= now) {
            buckets.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }
        bucket.count += 1;
        if (bucket.count > max) return res.status(429).json({ error: 'rate_limit_exceeded' });
        return next();
    };
}
app.use('/api', rateLimit({ windowMs: 60_000, max: 300 }));
app.use('/api/ai', rateLimit({ windowMs: 60_000, max: 10 }));

const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const validationError = (res, errors) => res.status(400).json({ error: 'validation_failed', details: errors });

function backupPath(filename) {
    if (!isSafeBackupFilename(filename)) return null;
    const path = resolve(backupDir, filename);
    return dirname(path) === backupDir ? path : null;
}

async function rotateBackups() {
    const entries = await readdir(backupDir);
    const backups = await Promise.all(entries.filter(isSafeBackupFilename).map(async name => ({ name, time: (await stat(join(backupDir, name))).mtimeMs })));
    backups.sort((a, b) => b.time - a.time);
    await Promise.all(backups.slice(3).map(backup => rm(join(backupDir, backup.name), { force: true })));
}

async function performBackup(shouldRotate = true) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.sqlite`;
    await database.backup(join(backupDir, filename));
    if (shouldRotate) await rotateBackups();
    return filename;
}

app.get('/api/health', asyncRoute(async (req, res) => {
    await database.ping();
    res.json({ status: 'ok' });
}));

app.get('/api/auth/status', (req, res) => auth.status(req, res));
app.post('/api/auth/login', rateLimit({ windowMs: 60_000, max: 5 }), (req, res) => auth.login(req, res));
app.post('/api/auth/logout', (req, res) => auth.logout(req, res));
app.use('/api', auth.middleware);

app.get('/api/readings', asyncRoute(async (req, res) => {
    res.json(await repository.listReadings());
}));

app.post('/api/readings', asyncRoute(async (req, res) => {
    const result = validateReading(req.body);
    if (!result.valid) return validationError(res, result.errors);
    const { id, date, value, type } = req.body;
    res.status(201).json(await repository.createReading({ id, date, value, type }));
}));

app.put('/api/readings/:id', asyncRoute(async (req, res) => {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(req.params.id)) return validationError(res, ['id is invalid']);
    const result = validateReading(req.body);
    if (!result.valid) return validationError(res, result.errors);
    if (req.body.id !== req.params.id) return validationError(res, ['body id must match path id']);
    const reading = await repository.updateReading(req.body);
    if (!reading) return res.status(404).json({ error: 'reading_not_found' });
    res.json(reading);
}));

app.delete('/api/readings/:id', asyncRoute(async (req, res) => {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(req.params.id)) return validationError(res, ['id is invalid']);
    if (!await repository.deleteReading(req.params.id)) return res.status(404).json({ error: 'reading_not_found' });
    res.status(204).end();
}));

app.post('/api/import', asyncRoute(async (req, res) => {
    if (!Array.isArray(req.body)) return validationError(res, ['body must be an array']);
    if (req.body.length > maxImportRows) return validationError(res, [`import is limited to ${maxImportRows} readings`]);
    const errors = req.body.flatMap((reading, index) => validateReading(reading).errors.map(error => `row ${index + 1}: ${error}`));
    if (errors.length) return validationError(res, errors.slice(0, 100));
    await repository.importReadings(req.body);
    res.json({ message: 'Import successful', count: req.body.length });
}));

app.get('/api/settings', asyncRoute(async (req, res) => {
    const settings = await repository.getSettings(ALLOWED_SETTING_KEYS);
    res.json({ ...settings, gemini_configured: Boolean(geminiApiKey) });
}));

app.post('/api/settings', asyncRoute(async (req, res) => {
    const result = validateSettings(req.body);
    if (!result.valid) return validationError(res, result.errors);
    await repository.saveSettings(req.body);
    res.json({ message: 'Settings saved' });
}));

app.get('/api/ai/models', asyncRoute(async (req, res) => {
    if (!geminiApiKey) return res.status(503).json({ error: 'gemini_not_configured' });
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(geminiApiKey)}`);
    if (!response.ok) return res.status(502).json({ error: 'gemini_request_failed', status: response.status });
    const data = await response.json();
    const models = (data.models || []).filter(model => model.supportedGenerationMethods?.includes('generateContent')).map(model => model.name.replace('models/', ''));
    res.json({ models });
}));

app.post('/api/ai/analyze', asyncRoute(async (req, res) => {
    if (!geminiApiKey) return res.status(503).json({ error: 'gemini_not_configured' });
    const result = validateImage(req.body?.image);
    if (!result.valid) return validationError(res, result.errors);
    const client = new GoogleGenerativeAI(geminiApiKey);
    const model = client.getGenerativeModel({ model: await repository.getSetting('gemini_model') || defaultGeminiModel });
    const prompt = 'Analyze this image of an electricity or gas utility meter. Return only JSON with this shape: {"value": number | null, "type": "electricity" | "gas" | "unknown"}. Ignore serial numbers and other identifiers.';
    const response = await model.generateContent([prompt, { inlineData: req.body.image }]);
    const rawText = response.response.text().replace(/```json|```/g, '').trim();
    let analysis;
    try {
        analysis = JSON.parse(rawText);
    } catch {
        return res.status(502).json({ error: 'invalid_gemini_response' });
    }
    const validType = ['electricity', 'gas', 'unknown'].includes(analysis.type);
    const validValue = analysis.value === null || (typeof analysis.value === 'number' && Number.isFinite(analysis.value) && analysis.value >= 0);
    if (!validType || !validValue) return res.status(502).json({ error: 'invalid_gemini_response' });
    res.json({ value: analysis.value, type: analysis.type });
}));

app.get('/api/backups', asyncRoute(async (req, res) => {
    const entries = await readdir(backupDir);
    const backups = await Promise.all(entries.filter(isSafeBackupFilename).map(async name => ({ name, created: (await stat(join(backupDir, name))).mtime })));
    backups.sort((a, b) => new Date(b.created) - new Date(a.created));
    res.json(backups);
}));

app.post('/api/backups', asyncRoute(async (req, res) => {
    res.status(201).json({ message: 'Backup created', filename: await performBackup() });
}));

app.post('/api/backups/restore', asyncRoute(async (req, res) => {
    const sourcePath = backupPath(req.body?.filename);
    if (!sourcePath) return validationError(res, ['filename is invalid']);
    const sourceStat = await stat(sourcePath).catch(() => null);
    if (!sourceStat?.isFile()) return res.status(404).json({ error: 'backup_not_found' });
    await performBackup(false);
    await database.restore(sourcePath);
    await rotateBackups();
    res.json({ message: 'Database restored' });
}));

cron.schedule('0 * * * *', () => performBackup().catch(error => console.error('Scheduled backup failed', error)));

app.use('/api', (req, res) => res.status(404).json({ error: 'api_endpoint_not_found' }));

const distPath = join(__dirname, '../dist');
app.use(express.static(distPath, { fallthrough: true }));
app.get(/.*/, (req, res) => res.sendFile(join(distPath, 'index.html')));
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status = error.status || error.statusCode || (error.type === 'entity.too.large' ? 413 : 500);
    if (status >= 500) console.error('Request failed', { method: req.method, path: req.path, error: error.message });
    return res.status(status).json({ error: status >= 500 ? 'internal_server_error' : error.message });
});

const server = app.listen(port, host, () => console.log(`Server running at http://${host}:${port}`));
async function shutdown(signal) {
    console.log(`Received ${signal}, shutting down`);
    server.close(async () => {
        await database.close().catch(error => console.error('Failed to close database', error));
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
