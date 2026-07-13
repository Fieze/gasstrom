export class GasStromRepository {
    constructor(database) {
        this.database = database;
    }

    listReadings() {
        return this.database.all('SELECT id, date, value, type FROM readings ORDER BY date DESC');
    }

    async createReading(reading) {
        await this.database.run(
            'INSERT INTO readings (id, date, value, type) VALUES (?, ?, ?, ?)',
            [reading.id, reading.date, reading.value, reading.type]
        );
        return reading;
    }

    async deleteReading(id) {
        return (await this.database.run('DELETE FROM readings WHERE id = ?', [id])).changes > 0;
    }

    async updateReading(reading) {
        const result = await this.database.run(
            'UPDATE readings SET date = ?, value = ?, type = ? WHERE id = ?',
            [reading.date, reading.value, reading.type, reading.id]
        );
        return result.changes > 0 ? reading : null;
    }

    async importReadings(readings) {
        await this.database.exec('BEGIN IMMEDIATE');
        try {
            for (const reading of readings) {
                await this.database.run(
                    'INSERT OR REPLACE INTO readings (id, date, value, type) VALUES (?, ?, ?, ?)',
                    [reading.id, reading.date, reading.value, reading.type]
                );
            }
            await this.database.exec('COMMIT');
        } catch (error) {
            await this.database.exec('ROLLBACK');
            throw error;
        }
    }

    async getSettings(allowedKeys) {
        const rows = await this.database.all('SELECT key, value FROM settings');
        return Object.fromEntries(rows.filter(row => allowedKeys.has(row.key)).map(row => [row.key, row.value]));
    }

    async getSetting(key) {
        return (await this.database.all('SELECT value FROM settings WHERE key = ?', [key]))[0]?.value;
    }

    async saveSettings(settings) {
        await this.database.exec('BEGIN IMMEDIATE');
        try {
            for (const [key, value] of Object.entries(settings)) {
                await this.database.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]);
            }
            await this.database.exec('COMMIT');
        } catch (error) {
            await this.database.exec('ROLLBACK');
            throw error;
        }
    }
}
