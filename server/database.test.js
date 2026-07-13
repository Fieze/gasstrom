import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { Database } from './database.js';
import { GasStromRepository } from './repository.js';

async function withDatabase(run) {
    const directory = await mkdtemp(join(tmpdir(), 'gasstrom-'));
    const database = new Database(join(directory, 'database.sqlite'));
    await database.open();
    try {
        await run({ database, directory, repository: new GasStromRepository(database) });
    } finally {
        await database.close();
        await rm(directory, { recursive: true, force: true });
    }
}

test('migrates a new database and enforces reading constraints', () => withDatabase(async ({ database, repository }) => {
    const version = (await database.all('PRAGMA user_version'))[0].user_version;
    assert.equal(version, 2);
    await database.close();
    await database.open();
    assert.equal((await database.all('PRAGMA user_version'))[0].user_version, 2);
    await assert.rejects(
        repository.createReading({ id: 'invalid', date: '2026-07-13', value: -1, type: 'electricity' }),
        /CHECK constraint failed/
    );
}));

test('backs up, changes and restores the database', () => withDatabase(async ({ database, directory, repository }) => {
    const reading = { id: 'reading-1', date: '2026-07-13', value: 123.45, type: 'gas' };
    await repository.createReading(reading);
    const backupPath = join(directory, 'backup.sqlite');
    await database.backup(backupPath);
    assert.equal(await repository.deleteReading(reading.id), true);
    assert.equal((await repository.listReadings()).length, 0);

    await database.restore(backupPath);
    assert.deepEqual(await repository.listReadings(), [reading]);
}));

test('imports readings atomically', () => withDatabase(async ({ repository }) => {
    await assert.rejects(repository.importReadings([
        { id: 'valid', date: '2026-07-13', value: 1, type: 'gas' },
        { id: 'invalid', date: '2026-07-14', value: -1, type: 'gas' }
    ]));
    assert.deepEqual(await repository.listReadings(), []);
}));

test('updates an existing reading without changing its identity', () => withDatabase(async ({ repository }) => {
    await repository.createReading({ id: 'reading-1', date: '2026-07-13', value: 1, type: 'gas' });
    const updated = await repository.updateReading({ id: 'reading-1', date: '2026-07-14', value: 2, type: 'electricity' });
    assert.deepEqual(updated, { id: 'reading-1', date: '2026-07-14', value: 2, type: 'electricity' });
    assert.deepEqual(await repository.listReadings(), [updated]);
}));
