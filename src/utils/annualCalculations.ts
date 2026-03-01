import { isBefore, isAfter, differenceInDays, parseISO, startOfDay, addYears, getYear } from 'date-fns';
import type { Reading } from '../types';

export interface AnnualConsumption {
    periodStart: string; // ISO date string
    periodEnd: string;   // ISO date string
    label: string;       // e.g. "2023/2024"
    consumption: number;
    days: number;
    isCurrent: boolean;
}

export interface ForecastData {
    currentConsumption: number;
    projectedTotal: number;
    percentageChange: number | null; // null if no previous data to compare
    daysElapsed: number;
    projectedTotalKwh?: number;
    projectedCost?: number;
    annualPayment?: number;
    paymentDifference?: number;
    recommendedPayment?: number;
}

/**
 * Calculates historical annual consumption periods based on a billing date (DD.MM.).
 */
export function calculateAnnualConsumption(readings: Reading[], billingDateInput: string): AnnualConsumption[] {
    if (!readings || readings.length < 2 || !billingDateInput) return [];

    // Parse the billing date input (expecting "DD.MM.")
    const parts = billingDateInput.split('.');
    if (parts.length < 2) return [];

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS months are 0-indexed

    if (isNaN(day) || isNaN(month)) return [];

    const sortedReadings = [...readings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstReadingDate = startOfDay(parseISO(sortedReadings[0].date));
    const lastReadingDate = startOfDay(parseISO(sortedReadings[sortedReadings.length - 1].date));

    // Find the very first generic billing Date *before or equal to* the first reading
    let currentPeriodStart = new Date(firstReadingDate);
    currentPeriodStart.setMonth(month, day);
    if (isAfter(currentPeriodStart, firstReadingDate)) {
        currentPeriodStart = addYears(currentPeriodStart, -1);
    }

    const periods: AnnualConsumption[] = [];

    // Iterate through years until we pass the last reading
    while (isBefore(currentPeriodStart, lastReadingDate) || currentPeriodStart.getTime() === lastReadingDate.getTime()) {
        const periodEnd = addYears(currentPeriodStart, 1);

        const periodReadingStart = interpolateReading(sortedReadings, currentPeriodStart);
        const periodReadingEnd = interpolateReading(sortedReadings, periodEnd);

        // Only add periods where we actually have SOME data coverage
        if (periodReadingStart !== null && periodReadingEnd !== null) {
            const consumption = periodReadingEnd - periodReadingStart;
            const days = differenceInDays(periodEnd, currentPeriodStart);

            periods.push({
                periodStart: currentPeriodStart.toISOString(),
                periodEnd: periodEnd.toISOString(),
                label: `${getYear(currentPeriodStart)}/${getYear(periodEnd)}`,
                consumption: Math.max(0, consumption),
                days,
                isCurrent: isAfter(new Date(), currentPeriodStart) && isBefore(new Date(), periodEnd)
            });
        }

        currentPeriodStart = periodEnd;
    }

    // Reverse so newest is first
    return periods.reverse();
}

/**
 * Calculates a forecast for the current ongoing billing period.
 */
export function calculateForecast(
    readings: Reading[],
    billingDateInput: string,
    periods: AnnualConsumption[],
    priceKwh?: string,
    basePrice?: string,
    payment?: string,
    billingMonths?: string,
    gasConversionFactor?: string,
    type?: string
): ForecastData | null {
    if (!readings || readings.length < 2 || !billingDateInput || !periods || periods.length === 0) return null;

    const currentPeriod = periods.find(p => p.isCurrent);
    if (!currentPeriod) return null; // No active period

    const sortedReadings = [...readings].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const lastReadingDate = startOfDay(parseISO(sortedReadings[sortedReadings.length - 1].date));

    const periodStart = parseISO(currentPeriod.periodStart);

    if (isBefore(lastReadingDate, periodStart)) return null; // Last reading is before the current period started

    const daysElapsed = differenceInDays(lastReadingDate, periodStart);
    if (daysElapsed <= 0) return null;

    // Get current consumption so far
    const currentValStart = interpolateReading(sortedReadings, periodStart) ?? 0;
    const currentValEnd = sortedReadings[sortedReadings.length - 1].value;
    const currentConsumption = Math.max(0, currentValEnd - currentValStart);

    // Look at previous completed periods to find average historical consumption
    const completedPeriods = periods.filter(p => !p.isCurrent);

    // We need at least one completed year to do a solid comparison
    if (completedPeriods.length === 0) {
        // Fallback: simple linear extrapolation if no history
        const projectedTotal = (currentConsumption / daysElapsed) * currentPeriod.days;
        return {
            currentConsumption,
            projectedTotal,
            percentageChange: null,
            daysElapsed
        };
    }

    // 1. Find consumption in the EXACT same timeframe in the previous year
    const lastYearPeriod = completedPeriods[0]; // most recent completed year
    const lastYearStart = parseISO(lastYearPeriod.periodStart);
    const lastYearComparisonEnd = new Date(lastYearStart);
    lastYearComparisonEnd.setDate(lastYearComparisonEnd.getDate() + daysElapsed);

    const valLastYearStart = interpolateReading(sortedReadings, lastYearStart) ?? 0;
    const valLastYearEnd = interpolateReading(sortedReadings, lastYearComparisonEnd) ?? valLastYearStart;

    const historicalConsumptionSoFar = Math.max(0, valLastYearEnd - valLastYearStart);

    // 2. Calculate percentage change
    let percentageChange = null;
    let projectedTotal = 0;

    if (historicalConsumptionSoFar > 0) {
        percentageChange = ((currentConsumption - historicalConsumptionSoFar) / historicalConsumptionSoFar) * 100;

        // 3. Apply percentage change to the total of the previous year
        projectedTotal = lastYearPeriod.consumption * (1 + (percentageChange / 100));
    } else {
        // Fallback to linear if we can't comparably extrapolate
        projectedTotal = (currentConsumption / daysElapsed) * currentPeriod.days;
    }

    // Add financial projections if parameters are available
    let financialData = {};
    if (priceKwh && basePrice && payment && billingMonths) {
        const pKwh = parseFloat(priceKwh) / 100; // Cent to Euro
        const bPrice = parseFloat(basePrice);
        const pmt = parseFloat(payment);
        const bMonths = parseFloat(billingMonths);
        const factor = parseFloat(gasConversionFactor || '10.5');

        if (!isNaN(pKwh) && !isNaN(bPrice) && !isNaN(pmt) && !isNaN(bMonths)) {
            const projectedTotalKwh = type === 'gas' ? projectedTotal * factor : projectedTotal;
            const projectedCost = (projectedTotalKwh * pKwh) + (bPrice * 12);
            const annualPayment = pmt * bMonths;
            const paymentDifference = annualPayment - projectedCost; // positive means refund, negative means owe
            const recommendedPayment = projectedCost / bMonths;

            financialData = {
                projectedTotalKwh,
                projectedCost,
                annualPayment,
                paymentDifference,
                recommendedPayment
            };
        }
    }

    return {
        currentConsumption,
        projectedTotal: Math.max(0, projectedTotal),
        percentageChange,
        daysElapsed,
        ...financialData
    };
}

/**
 * Helper to interpolate a meter reading at a specific exact date.
 */
function interpolateReading(readings: Reading[], targetDate: Date): number | null {
    if (readings.length === 0) return null;

    const targetTime = targetDate.getTime();

    // Exact match?
    const exactMatch = readings.find(r => startOfDay(parseISO(r.date)).getTime() === targetTime);
    if (exactMatch) return exactMatch.value;

    // Find closest before and after
    let before: Reading | null = null;
    let after: Reading | null = null;

    for (const r of readings) {
        const t = startOfDay(parseISO(r.date)).getTime();
        if (t < targetTime) {
            if (!before || t > startOfDay(parseISO(before.date)).getTime()) {
                before = r;
            }
        }
        if (t > targetTime) {
            if (!after || t < startOfDay(parseISO(after.date)).getTime()) {
                after = r;
            }
        }
    }

    // Extrapolate if outside bounds
    if (!before && after) return after.value; // Clamp to first known value
    if (before && !after) return before.value; // Clamp to last known value
    if (!before || !after) return null;

    // Interpolate between bounds
    const tBefore = startOfDay(parseISO(before.date)).getTime();
    const tAfter = startOfDay(parseISO(after.date)).getTime();

    const ratio = (targetTime - tBefore) / (tAfter - tBefore);
    return before.value + (after.value - before.value) * ratio;
}
