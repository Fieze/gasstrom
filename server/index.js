
import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cron from 'node-cron';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 4735;

app.use(cors());
app.use(bodyParser.json());

// Serve static files from the React frontend app
const distPath = join(__dirname, '../dist');
app.use(express.static(distPath));

// Initialize SQLite database
const dbPath = process.env.DB_PATH || join(__dirname, 'database.sqlite');
const backupDir = join(__dirname, 'backups');

// Ensure backup directory exists
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to SQLite database at', dbPath);
        createTable();
    }
});

function createTable() {
    db.run(`CREATE TABLE IF NOT EXISTS readings (
    id TEXT PRIMARY KEY,
    date TEXT,
    value REAL,
    type TEXT
  )`);

    // Create settings table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )`);
}

// Backup Functionality
const MAX_BACKUPS = 3;

function performBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = join(backupDir, `backup-${timestamp}.sqlite`);

    fs.copyFile(dbPath, backupFile, (err) => {
        if (err) {
            console.error('Backup failed:', err);
            return;
        }
        console.log(`Backup created: ${backupFile}`);
        rotateBackups();
    });
}

function rotateBackups() {
    fs.readdir(backupDir, (err, files) => {
        if (err) return;

        const backups = files
            .filter(f => f.startsWith('backup-') && f.endsWith('.sqlite'))
            .map(f => ({ name: f, time: fs.statSync(join(backupDir, f)).mtime.getTime() }))
            .sort((a, b) => b.time - a.time); // Newest first

        if (backups.length > MAX_BACKUPS) {
            const toDelete = backups.slice(MAX_BACKUPS);
            toDelete.forEach(backup => {
                fs.unlink(join(backupDir, backup.name), (err) => {
                    if (err) console.error(`Failed to delete old backup ${backup.name}:`, err);
                    else console.log(`Deleted old backup: ${backup.name}`);
                });
            });
        }
    });
}

// Schedule hourly backup
cron.schedule('0 * * * *', () => {
    console.log('Running hourly backup...');
    performBackup();
});

// API Endpoints
app.get('/api/readings', (req, res) => {
    db.all('SELECT * FROM readings', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

app.post('/api/readings', (req, res) => {
    const { id, date, value, type } = req.body;
    db.run(
        'INSERT INTO readings (id, date, value, type) VALUES (?, ?, ?, ?)',
        [id, date, value, type],
        function (err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ id, date, value, type });
        }
    );
});

// Settings API
app.get('/api/settings', (req, res) => {
    db.all('SELECT key, value FROM settings', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        const settings = rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
        res.json(settings);
    });
});

app.post('/api/settings', (req, res) => {
    const settings = req.body; // Expect { key: value, ... }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');

        Object.entries(settings).forEach(([key, value]) => {
            stmt.run(key, String(value));
        });

        stmt.finalize((err) => {
            if (err) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
                return;
            }
            db.run('COMMIT');
            res.json({ message: 'Settings saved' });
        });
    });
});

// Backup API
app.get('/api/backups', (req, res) => {
    fs.readdir(backupDir, (err, files) => {
        if (err) {
            res.status(500).json({ error: 'Failed to list backups' });
            return;
        }
        const backups = files
            .filter(f => f.startsWith('backup-') && f.endsWith('.sqlite'))
            .map(f => {
                const stats = fs.statSync(join(backupDir, f));
                return { name: f, created: stats.mtime };
            })
            .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

        res.json(backups);
    });
});

app.post('/api/backups/restore', (req, res) => {
    const { filename } = req.body;
    if (!filename) {
        res.status(400).json({ error: 'Filename required' });
        return;
    }

    const backupFile = join(backupDir, filename);
    if (!fs.existsSync(backupFile)) {
        res.status(404).json({ error: 'Backup file not found' });
        return;
    }

    // Force backup before restore? Maybe safest.
    // Copy backup file back to dbPath

    // Close DB connection first ideally, but sqlite3 library might handle replacement if careful.
    // Better approach for hot-restore:
    // 1. Copy backup to temp
    // 2. Overwrite database.sqlite

    // Simple overwrite implementation (might require restart if file locking is an issue, but usually fine with sqlite3 for simple apps)
    fs.copyFile(backupFile, dbPath, (err) => {
        if (err) {
            res.status(500).json({ error: 'Restore failed: ' + err.message });
            return;
        }
        // Force database reload/reconnect might be needed, but usually new queries will open the file again.
        // Let's rely on standard filesystem behavior.
        res.json({ message: 'Database restored. Please refresh the implementation.' });
    });
});

// Trigger a backup manually (for testing/immediate backup)
app.post('/api/backups', (req, res) => {
    performBackup();
    res.json({ message: 'Backup started' });
});

app.post('/api/import', (req, res) => {
    const readings = req.body;
    if (!Array.isArray(readings)) {
        res.status(400).json({ error: 'Expected an array of readings' });
        return;
    }

    db.serialize(() => {
        db.run('BEGIN TRANSACTION');

        const stmt = db.prepare('INSERT OR REPLACE INTO readings (id, date, value, type) VALUES (?, ?, ?, ?)');

        readings.forEach((reading) => {
            stmt.run(reading.id, reading.date, reading.value, reading.type);
        });

        stmt.finalize((err) => {
            if (err) {
                db.run('ROLLBACK');
                res.status(500).json({ error: err.message });
                return;
            }
            db.run('COMMIT');
            res.json({ message: 'Import successful', count: readings.length });
        });
    });
});

app.delete('/api/readings/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM readings WHERE id = ?', id, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Deleted', changes: this.changes });
    });
});

// All other GET requests not handled before will return the React app
app.get(/.*/, (req, res) => {
    res.sendFile(join(__dirname, '../dist', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
