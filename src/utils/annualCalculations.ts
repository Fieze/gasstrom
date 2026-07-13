import { addDays, differenceInCalendarDays, format, getYear, isAfter, isBefore, parseISO, startOfDay } from 'date-fns';
import type { Reading } from '../types';
import { calculateConsumptionBetween, normalizeReadings } from './calculations';

export interface AnnualConsumption {
    periodStart: string;
    periodEnd: string;
    label: string;
    consumption: number;
    days: number;
    isCurrent: boolean;
}

export interface ForecastData {
    currentConsumption: number;
    projectedTotal: number;
    percentageChange: number | null;
    daysElapsed: number;
    projectedTotalKwh?: number;
    projectedCost?: number;
    annualPayment?: number;
    paymentDifference?: number;
    recommendedPayment?: number;
}

function billingDate(year: number, month: number, day: number) {
    const date = startOfDay(new Date(year, month, day));
    if (date.getMonth() === month && date.getDate() === day) return date;
    if (month === 1 && day === 29) return startOfDay(new Date(year, 1, 28));
    return null;
}

export function calculateAnnualConsumption(readings: Reading[], billingDateInput: string): AnnualConsumption[] {
    if (readings.length < 2 || !/^\d{1,2}\.\d{1,2}\.$/.test(billingDateInput)) return [];
    const [day, oneBasedMonth] = billingDateInput.split('.').map(Number);
    const month = oneBasedMonth - 1;
    const sorted = normalizeReadings(readings);
    const firstDate = startOfDay(parseISO(sorted[0].date));
    const lastDate = startOfDay(parseISO(sorted[sorted.length - 1].date));
    let periodStart = billingDate(firstDate.getFullYear(), month, day);
    if (!periodStart) return [];
    if (isAfter(periodStart, firstDate)) periodStart = billingDate(firstDate.getFullYear() - 1, month, day);
    if (!periodStart) return [];

    const periods: AnnualConsumption[] = [];
    const today = startOfDay(new Date());
    while (!isAfter(periodStart, lastDate)) {
        const nominalEnd = billingDate(periodStart.getFullYear() + 1, month, day);
        if (!nominalEnd) break;
        const effectiveEnd = isAfter(nominalEnd, lastDate) ? lastDate : nominalEnd;
        const consumption = calculateConsumptionBetween(sorted, periodStart, effectiveEnd);
        const current = !isBefore(today, periodStart) && isBefore(today, nominalEnd);
        const complete = !isAfter(nominalEnd, lastDate);
        if (consumption !== null && (complete || current)) {
            periods.push({
                periodStart: format(periodStart, 'yyyy-MM-dd'),
                periodEnd: format(nominalEnd, 'yyyy-MM-dd'),
                label: `${getYear(periodStart)}/${getYear(nominalEnd)}`,
                consumption,
                days: differenceInCalendarDays(nominalEnd, periodStart),
                isCurrent: current
            });
        }
        periodStart = nominalEnd;
    }
    return periods.reverse();
}

export function calculateForecast(
    readings: Reading[], billingDateInput: string, periods: AnnualConsumption[],
    priceKwh?: string, basePrice?: string, payment?: string, billingMonths?: string,
    gasConversionFactor?: string, type?: string
): ForecastData | null {
    if (readings.length < 2 || !billingDateInput || periods.length === 0) return null;
    const currentPeriod = periods.find(period => period.isCurrent);
    if (!currentPeriod) return null;
    const sorted = normalizeReadings(readings);
    const lastReadingDate = startOfDay(parseISO(sorted[sorted.length - 1].date));
    const periodStart = startOfDay(parseISO(currentPeriod.periodStart));
    const daysElapsed = differenceInCalendarDays(lastReadingDate, periodStart);
    if (daysElapsed <= 0) return null;
    const currentConsumption = calculateConsumptionBetween(sorted, periodStart, lastReadingDate);
    if (currentConsumption === null) return null;

    const completedPeriods = periods.filter(period => !period.isCurrent);
    let percentageChange: number | null = null;
    let projectedTotal = (currentConsumption / daysElapsed) * currentPeriod.days;
    if (completedPeriods.length > 0) {
        const previous = completedPeriods[0];
        const previousStart = startOfDay(parseISO(previous.periodStart));
        const comparableEnd = addDays(previousStart, daysElapsed);
        const historical = calculateConsumptionBetween(sorted, previousStart, comparableEnd);
        if (historical !== null && historical > 0) {
            percentageChange = ((currentConsumption - historical) / historical) * 100;
            projectedTotal = previous.consumption * (1 + percentageChange / 100);
        }
    }

    const forecast: ForecastData = { currentConsumption, projectedTotal: Math.max(0, projectedTotal), percentageChange, daysElapsed };
    if (priceKwh && basePrice && payment && billingMonths) {
        const unitPrice = Number(priceKwh) / 100;
        const monthlyBasePrice = Number(basePrice);
        const monthlyPayment = Number(payment);
        const numberOfPayments = Number(billingMonths);
        const conversionFactor = Number(gasConversionFactor || '10.5');
        if ([unitPrice, monthlyBasePrice, monthlyPayment, numberOfPayments, conversionFactor].every(Number.isFinite) && numberOfPayments > 0) {
            forecast.projectedTotalKwh = type === 'gas' ? forecast.projectedTotal * conversionFactor : forecast.projectedTotal;
            forecast.projectedCost = forecast.projectedTotalKwh * unitPrice + monthlyBasePrice * 12;
            forecast.annualPayment = monthlyPayment * numberOfPayments;
            forecast.paymentDifference = forecast.annualPayment - forecast.projectedCost;
            forecast.recommendedPayment = forecast.projectedCost / numberOfPayments;
        }
    }
    return forecast;
}
