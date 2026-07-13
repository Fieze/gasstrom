import type { Reading } from '../types';

export interface ImportIssue {
    row: number;
    message: string;
}
export interface ImportAnalysis {
    readings: Reading[];
    issues: ImportIssue[];
    conflicts: string[];
}

const allowedFields = new Set(['id', 'date', 'value', 'type']);

function isValidDate(value: unknown): value is string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateReadingCandidate(candidate: unknown): string[] {
    if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) return ['entry must be an object'];
    const value = candidate as Record<string, unknown>;
    const errors: string[] = [];
    const unknown = Object.keys(value).filter(key => !allowedFields.has(key));
    if (unknown.length) errors.push(`unknown fields: ${unknown.join(', ')}`);
    if (typeof value.id !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(value.id)) errors.push('invalid id');
    if (!isValidDate(value.date)) errors.push('invalid date');
    if (typeof value.value !== 'number' || !Number.isFinite(value.value) || value.value < 0) errors.push('invalid value');
    if (value.type !== 'electricity' && value.type !== 'gas') errors.push('invalid meter type');
    return errors;
}

export function analyzeReadingImport(candidates: unknown[], existing: Reading[]): ImportAnalysis {
    const issues: ImportIssue[] = [];
    const readings: Reading[] = [];
    const seenIds = new Set<string>();
    const existingIds = new Set(existing.map(reading => reading.id));
    const conflicts = new Set<string>();

    candidates.forEach((candidate, index) => {
        const errors = validateReadingCandidate(candidate);
        const id = candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? (candidate as Record<string, unknown>).id : undefined;
        if (typeof id === 'string' && seenIds.has(id)) errors.push('duplicate id inside import file');
        if (typeof id === 'string') seenIds.add(id);
        errors.forEach(message => issues.push({ row: index + 1, message }));
        if (errors.length === 0) {
            const reading = candidate as Reading;
            readings.push(reading);
            if (existingIds.has(reading.id)) conflicts.add(reading.id);
        }
    });

    return { readings, issues, conflicts: [...conflicts] };
}
