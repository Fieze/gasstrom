import { differenceInDays, addDays, format, parseISO, subYears } from 'date-fns';
import type { Reading, MonthlyStat } from '../types';

/**
 * Calculates monthly consumption based on daily average distribution.
 * 
 * @param readings List of meter readings.
 * @returns Array of MonthlyStat objects.
 */
export function calculateMonthlyConsumption(readings: Reading[]): MonthlyStat[] {
    if (readings.length < 2) return [];

    // Sort readings by date
    const sortedReadings = [...readings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const monthlyMap = new Map<string, number>();

    // Iterate through consecutive pairs
    for (let i = 0; i < sortedReadings.length - 1; i++) {
        const startReading = sortedReadings[i];
        const endReading = sortedReadings[i + 1];

        const startDate = parseISO(startReading.date);
        const endDate = parseISO(endReading.date);

        const consumption = endReading.value - startReading.value;
        const daysDiff = differenceInDays(endDate, startDate);

        if (daysDiff <= 0) continue; // Skip invalid intervals

        const dailyAverage = consumption / daysDiff;

        // Distribute daily average to each day in the interval
        // We go from startDate up to (but not including) endDate
        // Because the reading on endDate is the "end state" for that period? 
        // Usually, if I read on Jan 1 and Feb 1. The usage happened in Jan. 
        // Feb 1 reading covers the period up to Feb 1.
        // So days are Jan 1, Jan 2, ... Jan 31. (31 days). 
        // differenceInDays(Feb 1, Jan 1) is 31.
        // So loop 0 to 30.

        let currentDate = startDate;
        for (let d = 0; d < daysDiff; d++) {
            const monthKey = format(currentDate, 'yyyy-MM');
            const currentTotal = monthlyMap.get(monthKey) || 0;
            monthlyMap.set(monthKey, currentTotal + dailyAverage);

            currentDate = addDays(currentDate, 1);
        }
    }

    // Convert map to array and sort
    const stats: MonthlyStat[] = Array.from(monthlyMap.entries()).map(([month, consumption]) => {
        // Calculate approximate days in month coverage? 
        // For now we just return the consumption total.
        return {
            month,
            consumption,
            days: 0 // We could track days covered if needed, but consumption is the main metric
        };
    }).sort((a, b) => a.month.localeCompare(b.month));

    return stats;
}

/**
 * Compares current month stats with the same month from the previous year.
 */
export function getYearlyComparison(stats: MonthlyStat[], currentMonth: string): number | null {
    const currentDate = parseISO(currentMonth + '-01');
    const lastYearDate = subYears(currentDate, 1);
    const lastYearMonthKey = format(lastYearDate, 'yyyy-MM');

    const lastYearStat = stats.find(s => s.month === lastYearMonthKey);
    if (!lastYearStat) return null;

    return lastYearStat.consumption;
}
