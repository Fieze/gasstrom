export const migrations = [
    {
        version: 1,
        sql: `
            CREATE TABLE IF NOT EXISTS readings (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL,
                value REAL NOT NULL CHECK(value >= 0),
                type TEXT NOT NULL CHECK(type IN ('electricity', 'gas'))
            );
            CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );
        `
    },
    {
        version: 2,
        sql: `
            DROP TABLE IF EXISTS readings_migration;
            CREATE TABLE readings_migration (
                id TEXT PRIMARY KEY,
                date TEXT NOT NULL CHECK(date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
                value REAL NOT NULL CHECK(value >= 0),
                type TEXT NOT NULL CHECK(type IN ('electricity', 'gas'))
            );
            INSERT INTO readings_migration (id, date, value, type)
                SELECT id, date, value, type FROM readings;
            DROP TABLE readings;
            ALTER TABLE readings_migration RENAME TO readings;
            CREATE INDEX idx_readings_type_date ON readings(type, date);
            DELETE FROM settings WHERE key = 'gemini_api_key';
        `
    }
];

export async function migrate(database) {
    const row = (await database.all('PRAGMA user_version'))[0];
    let currentVersion = row.user_version;
    for (const migration of migrations) {
        if (migration.version <= currentVersion) continue;
        await database.exec('BEGIN IMMEDIATE');
        try {
            await database.exec(migration.sql);
            await database.exec(`PRAGMA user_version = ${migration.version}`);
            await database.exec('COMMIT');
            currentVersion = migration.version;
        } catch (error) {
            await database.exec('ROLLBACK');
            throw new Error(`Database migration ${migration.version} failed`, { cause: error });
        }
    }
}
