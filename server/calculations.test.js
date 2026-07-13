import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import Module, { createRequire } from 'module';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const previousLoader = Module._extensions['.ts'];
Module._extensions['.ts'] = (module, filename) => {
    const source = readFileSync(filename, 'utf8');
    const output = ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true }
    }).outputText;
    module._compile(output, filename);
};

const { calculateMonthlyConsumption, calculateConsumptionBetween, findReadingIssues } = require('../src/utils/calculations.ts');
const { calculateAnnualConsumption, calculateForecast } = require('../src/utils/annualCalculations.ts');
const { analyzeReadingImport } = require('../src/utils/readingValidation.ts');

test.after(() => {
    if (previousLoader) Module._extensions['.ts'] = previousLoader;
    else delete Module._extensions['.ts'];
});

const reading = (id, date, value, type = 'electricity') => ({ id, date, value, type });

test('distributes consumption by calendar day across month boundaries', () => {
    const stats = calculateMonthlyConsumption([
        reading('a', '2026-01-15', 100),
        reading('b', '2026-02-15', 410)
    ]);
    assert.deepEqual(stats.map(stat => ({ month: stat.month, consumption: stat.consumption, days: stat.days })), [
        { month: '2026-01', consumption: 170, days: 17 },
        { month: '2026-02', consumption: 140, days: 14 }
    ]);
});

test('resolves duplicate dates and reports excluded meter reset intervals', () => {
    const readings = [
        reading('a', '2026-01-01', 90),
        reading('b', '2026-01-01', 100),
        reading('c', '2026-01-10', 200),
        reading('d', '2026-01-11', 10),
        reading('e', '2026-01-20', 50)
    ];
    const issues = findReadingIssues(readings);
    assert.deepEqual(issues.map(issue => issue.type), ['duplicate_date', 'meter_reset']);
    assert.ok(Math.abs(calculateMonthlyConsumption(readings)[0].consumption - 140) < 1e-9);
    assert.equal(calculateConsumptionBetween(readings, new Date(2026, 0, 1), new Date(2026, 0, 20)), 140);
});

test('uses calendar-safe leap-day billing boundaries', () => {
    const periods = calculateAnnualConsumption([
        reading('a', '2023-02-28', 0),
        reading('b', '2024-02-29', 366),
        reading('c', '2025-02-28', 731)
    ], '29.02.');
    assert.deepEqual(periods.map(period => ({ start: period.periodStart, end: period.periodEnd, days: period.days, consumption: period.consumption })), [
        { start: '2024-02-29', end: '2025-02-28', days: 365, consumption: 365 },
        { start: '2023-02-28', end: '2024-02-29', days: 366, consumption: 366 }
    ]);
    assert.deepEqual(calculateAnnualConsumption([reading('a', '2025-01-01', 0), reading('b', '2026-01-01', 1)], '31.02.'), []);
});

test('projects annual usage and financial values from a comparable prior period', () => {
    const year = new Date().getFullYear();
    const readings = [
        reading('a', `${year - 1}-01-01`, 0),
        reading('b', `${year - 1}-07-01`, 181),
        reading('c', `${year}-01-01`, 365),
        reading('d', `${year}-07-01`, 546)
    ];
    const periods = calculateAnnualConsumption(readings, '01.01.');
    const forecast = calculateForecast(readings, '01.01.', periods, '30', '10', '40', '12', '10.5', 'electricity');
    assert.ok(forecast);
    assert.ok(Math.abs(forecast.percentageChange) < 0.01);
    assert.ok(Math.abs(forecast.projectedTotal - 365) < 1);
    assert.ok(Math.abs(forecast.projectedCost - 229.5) < 1);
    assert.equal(forecast.annualPayment, 480);
});

test('previews import validation errors and replacement conflicts', () => {
    const existing = [reading('existing', '2026-01-01', 1)];
    const analysis = analyzeReadingImport([
        reading('existing', '2026-01-02', 2),
        reading('new', '2026-02-30', 3),
        reading('existing', '2026-01-03', 4)
    ], existing);
    assert.deepEqual(analysis.conflicts, ['existing']);
    assert.equal(analysis.readings.length, 1);
    assert.deepEqual(analysis.issues.map(issue => issue.message), ['invalid date', 'duplicate id inside import file']);
});
