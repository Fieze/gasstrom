import { addDays, differenceInCalendarDays, format, parseISO, startOfDay, subYears } from 'date-fns';
import type { Reading, MonthlyStat } from '../types';

export interface ReadingIssue {
    type: 'duplicate_date' | 'meter_reset';
    date: string;
    previousDate?: string;
}
/** Duplicate dates are resolved deterministically by keeping the highest value. */
export function normalizeReadings(readings: Reading[]): Reading[] {
    const byDate = new Map<string, Reading>();
    for (const reading of readings) {
        const existing = byDate.get(reading.date);
        if (!existing || reading.value > existing.value || (reading.value === existing.value && reading.id.localeCompare(existing.id) > 0)) {
            byDate.set(reading.date, reading);
        }
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function findReadingIssues(readings: Reading[]): ReadingIssue[] {
    const issues: ReadingIssue[] = [];
    const dateCounts = new Map<string, number>();
    readings.forEach(reading => dateCounts.set(reading.date, (dateCounts.get(reading.date) || 0) + 1));
    for (const [date, count] of dateCounts) if (count > 1) issues.push({ type: 'duplicate_date', date });

    const normalized = normalizeReadings(readings);
    for (let index = 1; index < normalized.length; index += 1) {
        if (normalized[index].value < normalized[index - 1].value) {
            issues.push({ type: 'meter_reset', date: normalized[index].date, previousDate: normalized[index - 1].date });
        }
    }
    return issues;
}

/**
 * Distributes each monotonic meter interval evenly across calendar days.
 * Reset intervals are excluded because their unknown reset point cannot be reconstructed safely.
 */
export function calculateMonthlyConsumption(readings: Reading[]): MonthlyStat[] {
    const sorted = normalizeReadings(readings);
    if (sorted.length < 2) return [];
    const monthly = new Map<string, { consumption: number; days: number }>();

    for (let index = 0; index < sorted.length - 1; index += 1) {
        const startReading = sorted[index];
        const endReading = sorted[index + 1];
        const startDate = startOfDay(parseISO(startReading.date));
        const endDate = startOfDay(parseISO(endReading.date));
        const days = differenceInCalendarDays(endDate, startDate);
        const consumption = endReading.value - startReading.value;
        if (days <= 0 || consumption < 0) continue;

        const dailyAverage = consumption / days;
        for (let day = 0; day < days; day += 1) {
            const month = format(addDays(startDate, day), 'yyyy-MM');
            const current = monthly.get(month) || { consumption: 0, days: 0 };
            current.consumption += dailyAverage;
            current.days += 1;
            monthly.set(month, current);
        }
    }

    return [...monthly.entries()]
        .map(([month, values]) => ({ month, ...values }))
        .sort((a, b) => a.month.localeCompare(b.month));
}

export function getYearlyComparison(stats: MonthlyStat[], currentMonth: string): number | null {
    const previousYear = format(subYears(parseISO(`${currentMonth}-01`), 1), 'yyyy-MM');
    return stats.find(stat => stat.month === previousYear)?.consumption ?? null;
}

function readingValueAt(readings: Reading[], targetDate: Date): number | null {
    const targetTime = startOfDay(targetDate).getTime();
    const exact = readings.find(reading => startOfDay(parseISO(reading.date)).getTime() === targetTime);
    if (exact) return exact.value;
    const before = [...readings].reverse().find(reading => startOfDay(parseISO(reading.date)).getTime() < targetTime);
    const after = readings.find(reading => startOfDay(parseISO(reading.date)).getTime() > targetTime);
    if (!before || !after || after.value < before.value) return null;
    const beforeTime = startOfDay(parseISO(before.date)).getTime();
    const afterTime = startOfDay(parseISO(after.date)).getTime();
    return before.value + (after.value - before.value) * ((targetTime - beforeTime) / (afterTime - beforeTime));
}

/** Sums known positive segments and excludes the unknowable interval crossing a meter reset. */
export function calculateConsumptionBetween(readings: Reading[], start: Date, end: Date): number | null {
    const normalized = normalizeReadings(readings);
    const startValue = readingValueAt(normalized, start);
    const endValue = readingValueAt(normalized, end);
    if (startValue === null || endValue === null) return null;
    const startTime = startOfDay(start).getTime();
    const endTime = startOfDay(end).getTime();
    const points = [
        { date: startTime, value: startValue },
        ...normalized
            .map(reading => ({ date: startOfDay(parseISO(reading.date)).getTime(), value: reading.value }))
            .filter(point => point.date > startTime && point.date < endTime),
        { date: endTime, value: endValue }
    ].sort((a, b) => a.date - b.date);
    return points.slice(1).reduce((total, point, index) => {
        const delta = point.value - points[index].value;
        return total + (delta >= 0 ? delta : 0);
    }, 0);
}
