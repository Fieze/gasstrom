import test from 'node:test';
import assert from 'node:assert/strict';
import { isSafeBackupFilename, validateImage, validateReading, validateSettings } from './validation.js';

test('accepts a valid meter reading', () => {
    assert.equal(validateReading({
        id: '95eb04cf-9d4e-49b5-a66b-afc297aac55b',
        date: '2026-07-13',
        value: 1234.5,
        type: 'electricity'
    }).valid, true);
});
test('rejects malformed and unsafe meter readings', () => {
    const result = validateReading({ id: '../escape', date: '2026-02-30', value: -1, type: 'water' });
    assert.equal(result.valid, false);
    assert.equal(result.errors.length, 4);
});

test('does not allow the Gemini API key in settings', () => {
    const result = validateSettings({ gemini_api_key: 'secret' });
    assert.equal(result.valid, false);
    assert.match(result.errors[0], /not an allowed setting/);
});

test('validates billing and numeric settings', () => {
    assert.equal(validateSettings({ billing_date_gas: '29.02.', billing_months: '12' }).valid, true);
    assert.equal(validateSettings({ billing_date_gas: '31.02.', billing_months: '13' }).valid, false);
});

test('accepts supported base64 images within the limit', () => {
    assert.equal(validateImage({ mimeType: 'image/jpeg', data: 'YWJjZA==' }).valid, true);
    assert.equal(validateImage({ mimeType: 'image/svg+xml', data: 'YWJjZA==' }).valid, false);
});

test('allows only generated backup filenames', () => {
    assert.equal(isSafeBackupFilename('backup-2026-07-13T12-34-56-000Z.sqlite'), true);
    assert.equal(isSafeBackupFilename('../database.sqlite'), false);
    assert.equal(isSafeBackupFilename('backup.sqlite'), false);
});
