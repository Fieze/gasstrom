import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { Calendar, TrendingUp, TrendingDown, Info } from 'lucide-react';
import type { Reading } from '../types';
import { calculateAnnualConsumption, calculateForecast } from '../utils/annualCalculations';

interface AnnualStatsProps {
    readings: Reading[];
    type: string;
    billingDateInput: string;
    priceKwh?: string;
    basePrice?: string;
    payment?: string;
    billingMonths?: string;
    gasConversionFactor?: string;
}

export function AnnualStats({
    readings,
    type,
    billingDateInput,
    priceKwh,
    basePrice,
    payment,
    billingMonths,
    gasConversionFactor
}: AnnualStatsProps) {
    const { t } = useTranslation();

    const periods = useMemo(() => calculateAnnualConsumption(readings, billingDateInput), [readings, billingDateInput]);
    const forecast = useMemo(() => calculateForecast(
        readings,
        billingDateInput,
        periods,
        priceKwh,
        basePrice,
        payment,
        billingMonths,
        gasConversionFactor,
        type
    ), [readings, billingDateInput, periods, priceKwh, basePrice, payment, billingMonths, gasConversionFactor, type]);

    if (!billingDateInput || periods.length === 0) {
        return (
            <div className="bg-surface border border-glass-border rounded-lg p-6 flex flex-col items-center justify-center text-center text-muted min-h-[300px]">
                <Calendar size={48} className="mb-4 opacity-50" />
                <p>{t('annual.noHistory') || 'Noch nicht genug Daten für eine Jahresprognose.'}</p>
                {!billingDateInput && (
                    <p className="text-sm mt-2 opacity-70">
                        ({t('annual.configureSettings') || 'Bitte trage in den Einstellungen einen Stichtag für die Jahresabrechnung ein.'})
                    </p>
                )}
            </div>
        );
    }

    // Prepare chart data
    const chartData = [...periods]
        .filter(p => !p.isCurrent) // Only show completed years as solid bars
        .slice(-5); // Keep the last 5 years maximum

    // Add the forecast bar at the end
    if (forecast && periods.some(p => p.isCurrent)) {
        const currentPeriodKey = periods.find(p => p.isCurrent)?.label || 'Current';
        chartData.push({
            label: currentPeriodKey + ' (Prog.)',
            consumption: 0,
            forecast: forecast.projectedTotal,
            current: forecast.currentConsumption
        } as any);
    }

    const unit = type === 'electricity' ? 'kWh' : 'm³';

    return (
        <div className="bg-surface border border-glass-border rounded-lg p-6">
            <h3 className="text-lg font-medium mb-6 flex items-center gap-2">
                <Calendar size={20} className="text-primary" />
                {t('annual.title') || 'Jahresverbrauch & Prognose'}
            </h3>

            {forecast && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-black/20 rounded-lg p-4 border border-white/5 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10 flex flex-col h-full">
                            <span className="text-sm text-muted mb-1 flex items-center gap-1">
                                {t('annual.currentPeriod') || 'Bisheriger Verbrauch'}
                            </span>
                            <div className="flex items-baseline gap-2 mt-auto">
                                <span className="text-3xl font-bold font-mono">
                                    {forecast.currentConsumption.toFixed(0)}
                                </span>
                                <span className="text-muted text-sm">{unit}</span>
                            </div>
                            <span className="text-xs text-muted mt-2">({forecast.daysElapsed} Tage)</span>
                        </div>
                    </div>

                    <div className="bg-black/20 rounded-lg p-4 border border-white/5 relative overflow-hidden group md:col-span-2">
                        <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10 flex flex-col h-full">
                            <span className="text-sm text-muted mb-1 flex items-center gap-1">
                                {t('annual.forecast') || 'Prognose'}
                            </span>
                            <div className="flex items-end justify-between mt-auto">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-3xl font-bold font-mono text-white">
                                        {forecast.projectedTotal.toFixed(0)}
                                    </span>
                                    <span className="text-muted text-sm">{unit}</span>
                                </div>

                                {forecast.percentageChange !== null && (
                                    <div className={`flex items-center gap-1 ${forecast.percentageChange <= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {forecast.percentageChange <= 0 ? <TrendingDown size={18} /> : <TrendingUp size={18} />}
                                        <span className="font-medium text-lg">
                                            {Math.abs(forecast.percentageChange).toFixed(1)}%
                                        </span>
                                    </div>
                                )}
                            </div>
                            {forecast.percentageChange !== null && (
                                <span className="text-xs text-muted mt-2">
                                    {t('annual.comparison') || 'Vergleich zum Vorjahr im selben Zeitraum'}
                                </span>
                            )}
                        </div>
                    </div>

                    {forecast.projectedCost !== undefined && (
                        <div className="bg-black/20 rounded-lg p-4 border border-white/5 relative overflow-hidden group md:col-span-3 lg:col-span-1">
                            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative z-10 flex flex-col h-full">
                                <span className="text-sm text-muted mb-1 flex items-center gap-1 group/tooltip">
                                    {t('annual.projectedCost') || 'Erwartete Kosten'}
                                    <div className="relative ml-1 cursor-help group-hover/tooltip:opacity-100 opacity-50 transition-opacity">
                                        <Info size={14} />
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-800 text-xs text-white rounded opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all z-20 pointer-events-none">
                                            {t('annual.projectedCostHelp') || 'Basierend auf der Prognose und deinen eingegebenen Vertragskonditionen'}
                                        </div>
                                    </div>
                                </span>
                                <div className="flex items-baseline gap-1 mt-auto">
                                    <span className="text-3xl font-bold font-mono">
                                        {forecast.projectedCost.toFixed(2)}
                                    </span>
                                    <span className="text-muted text-sm">€</span>
                                </div>

                                {forecast.paymentDifference !== undefined && forecast.annualPayment !== undefined && (
                                    <div className="flex flex-col mt-2 gap-1 border-t border-white/10 pt-2">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="text-muted">{forecast.paymentDifference >= 0 ? (t('annual.refund') || 'Rückerstattung') : (t('annual.paymentDue') || 'Nachzahlung')}:</span>
                                            <span className={`font-medium ${forecast.paymentDifference >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {forecast.paymentDifference >= 0 ? '+' : ''}{forecast.paymentDifference.toFixed(2)} €
                                            </span>
                                        </div>
                                        {forecast.recommendedPayment !== undefined && forecast.annualPayment > 0 && (
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-muted flex items-center group/rectooltip relative">
                                                    {t('annual.recommendedPayment') || 'Empfohlener Abschlag'}:
                                                    <div className="relative ml-1 cursor-help group-hover/rectooltip:opacity-100 opacity-50 transition-opacity">
                                                        <Info size={12} />
                                                        <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-gray-800 text-xs text-white rounded opacity-0 invisible group-hover/rectooltip:opacity-100 group-hover/rectooltip:visible transition-all z-20 pointer-events-none">
                                                            {t('annual.recommendedPaymentHelp') || 'Um Nachzahlungen zu vermeiden (Gesamtkosten / Abschläge pro Jahr)'}
                                                        </div>
                                                    </div>
                                                </span>
                                                <span className="font-medium text-white">
                                                    {Math.ceil(forecast.recommendedPayment)} €
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="h-[300px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                        <XAxis dataKey="label" stroke="rgba(255,255,255,0.4)" tick={{ fill: 'var(--text-muted)' }} />
                        <YAxis stroke="rgba(255,255,255,0.4)" tick={{ fill: 'var(--text-muted)' }} unit={` ${unit}`} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--surface)',
                                borderColor: 'var(--border)',
                                borderRadius: '8px',
                                color: 'var(--text)'
                            }}
                            formatter={(value: number | undefined, name: string | undefined) => {
                                if (value === undefined) return ['', ''];
                                if (name === 'forecast') return [`${value.toFixed(0)} ${unit}`, t('annual.forecast') || 'Prognose'];
                                if (name === 'current') return [`${value.toFixed(0)} ${unit}`, t('annual.currentPeriod') || 'Bisheriger Verbrauch'];
                                return [`${value.toFixed(0)} ${unit}`, t('stats.consumption')];
                            }}
                            labelStyle={{ color: 'var(--text-muted)' }}
                            cursor={{ fill: 'var(--surface-hover)' }}
                        />
                        <Legend />

                        {/* Completed Years */}
                        <Bar
                            dataKey="consumption"
                            name={t('stats.prevYear') || 'Verbrauch'}
                            fill="var(--primary)"
                            radius={[4, 4, 0, 0]}
                        />

                        {/* Current Period (what they actually used so far) */}
                        <Bar
                            dataKey="current"
                            name={t('annual.currentPeriod') || 'Bisher'}
                            stackId="a"
                            fill="var(--secondary)"
                            radius={[0, 0, 0, 0]}
                        />

                        {/* Forecast Extrapolation Line/Dashed Bar on top */}
                        <Bar
                            dataKey="forecast"
                            name={t('annual.forecast') || 'Prognose'}
                            stackId="b"
                            fill="transparent"
                            stroke="var(--secondary)"
                            strokeWidth={2}
                            strokeDasharray="4 4"
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
