
import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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
}

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
