import sqlite3 from 'sqlite3';
import { copyFile, mkdir, rename, rm } from 'fs/promises';
import { dirname } from 'path';
import { migrate } from './migrations.js';

export class Database {
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.connection = null;
    }

    async open() {
        await mkdir(dirname(this.dbPath), { recursive: true });
        this.connection = await new Promise((resolve, reject) => {
            const connection = new sqlite3.Database(this.dbPath, error => error ? reject(error) : resolve(connection));
        });
        await this.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
        await migrate(this);
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => this.connection.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
    }

    async ping() {
        await this.all('SELECT 1');
    }

    run(sql, params = []) {
        return new Promise((resolve, reject) => this.connection.run(sql, params, function (error) {
            return error ? reject(error) : resolve({ changes: this.changes, lastID: this.lastID });
        }));
    }

    exec(sql) {
        return new Promise((resolve, reject) => this.connection.exec(sql, error => error ? reject(error) : resolve()));
    }

    backup(targetPath) {
        return new Promise((resolve, reject) => {
            const backup = this.connection.backup(targetPath);
            backup.step(-1, stepError => {
                backup.finish(finishError => {
                    const error = stepError || finishError;
                    return error ? reject(error) : resolve();
                });
            });
        });
    }

    async close() {
        if (!this.connection) return;
        const connection = this.connection;
        this.connection = null;
        await new Promise((resolve, reject) => connection.close(error => error ? reject(error) : resolve()));
    }

    async restore(sourcePath) {
        const temporaryPath = `${this.dbPath}.restore`;
        const previousPath = `${this.dbPath}.previous`;
        await copyFile(sourcePath, temporaryPath);
        await this.close();
        try {
            await rm(`${this.dbPath}-wal`, { force: true });
            await rm(`${this.dbPath}-shm`, { force: true });
            await rm(previousPath, { force: true });
            await rename(this.dbPath, previousPath);
            await rename(temporaryPath, this.dbPath);
            await this.open();
            await rm(previousPath, { force: true });
        } catch (error) {
            await rm(this.dbPath, { force: true });
            await rename(previousPath, this.dbPath).catch(() => undefined);
            await rm(temporaryPath, { force: true });
            await this.open();
            throw error;
        }
    }
}
