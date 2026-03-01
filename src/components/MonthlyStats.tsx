import { useMemo, useState } from 'react';
import type { Reading } from '../types';
import { calculateMonthlyConsumption } from '../utils/calculations';
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { format, parseISO, subYears } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { BarChart3, LineChart as LineChartIcon, Thermometer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { fetchMonthlyTemperature } from '../utils/weather';

interface MonthlyStatsProps {
    readings: Reading[];
    type: string;
    locationLat?: number | null;
    locationLon?: number | null;
}

type TimeRange = '3' | '6' | '12' | 'all';
type ChartType = 'bar' | 'line';

export function MonthlyStats({ readings, type, locationLat, locationLon }: MonthlyStatsProps) {
    const { t, i18n } = useTranslation();
    const [timeRange, setTimeRange] = useState<TimeRange>('all');
    const [chartType, setChartType] = useState<ChartType>('bar');
    const [tempData, setTempData] = useState<Record<string, number>>({});
    const stats = useMemo(() => calculateMonthlyConsumption(readings), [readings]);

    // Determine date-fns locale
    const dateLocale = i18n.resolvedLanguage === 'de' ? de : enUS;

    // Transform data for chart to include previous year and temperature
    const chartData = useMemo(() => {
        return stats.map(stat => {
            const date = parseISO(stat.month + '-01');
            const prevYearDate = subYears(date, 1);
            const prevYearKey = format(prevYearDate, 'yyyy-MM');
            const prevYearStat = stats.find(s => s.month === prevYearKey);

            return {
                month: format(date, 'MMM yy', { locale: dateLocale }),
                actualDate: stat.month,
                current: Number(stat.consumption.toFixed(2)),
                previousYear: prevYearStat ? Number(prevYearStat.consumption.toFixed(2)) : null,
                temperature: tempData[stat.month] !== undefined ? Number(tempData[stat.month].toFixed(1)) : null
            };
        });
    }, [stats, dateLocale, tempData]);

    // Fetch weather data when stats change and type is gas
    useMemo(() => {
        if (type !== 'gas' || locationLat == null || locationLon == null) return;

        async function loadTemperatures() {
            const newTempData: Record<string, number> = {};
            let hasNewData = false;

            for (const stat of stats) {
                if (tempData[stat.month] !== undefined) continue; // Already have it or it's currently failing/null

                const temp = await fetchMonthlyTemperature(locationLat as number, locationLon as number, stat.month);
                if (temp !== null) {
                    newTempData[stat.month] = temp;
                    hasNewData = true;
                }
            }

            if (hasNewData) {
                setTempData(prev => ({ ...prev, ...newTempData }));
            }
        }

        loadTemperatures();
    }, [stats, type, locationLat, locationLon]);

    const filteredData = useMemo(() => {
        if (timeRange === 'all') return chartData;
        const count = parseInt(timeRange);
        return chartData.slice(-count);
    }, [chartData, timeRange]);

    if (stats.length === 0) {
        return (
            <div className="card text-center p-8 text-muted">
                {t('stats.insufficientData')}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="card flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h3 className="text-lg font-semibold">{t('stats.monthlyAverage')}</h3>

                    <div className="flex bg-surface-hover p-1.5 rounded-lg gap-4">
                        <div className="flex bg-black/20 rounded-md p-1 gap-1">
                            <button
                                onClick={() => setChartType('bar')}
                                className={`p-2 rounded-md transition-all ${chartType === 'bar'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-muted hover:text-text'
                                    }`}
                                title={t('stats.chartBar')}
                            >
                                <BarChart3 size={18} />
                            </button>
                            <button
                                onClick={() => setChartType('line')}
                                className={`p-2 rounded-md transition-all ${chartType === 'line'
                                    ? 'bg-primary text-white shadow-sm'
                                    : 'text-muted hover:text-text'
                                    }`}
                                title={t('stats.chartLine')}
                            >
                                <LineChartIcon size={18} />
                            </button>
                        </div>

                        <div className="w-px bg-white/10 mx-1"></div>

                        <div className="flex gap-1">
                            {(['3', '6', '12', 'all'] as const).map((range) => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-4 py-1.5 text-sm rounded-md transition-all ${timeRange === range
                                        ? 'bg-primary text-white shadow-sm'
                                        : 'text-muted hover:text-text hover:bg-white/5 bg-transparent'
                                        }`}
                                >
                                    {range === 'all' ? t('stats.rangeAll') : range}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="w-full min-w-0">
                    <ResponsiveContainer width="100%" height={400} minWidth={0}>
                        {chartType === 'bar' ? (
                            <BarChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    yAxisId="left"
                                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                    unit={type === 'electricity' ? ' kWh' : ' m³'}
                                />
                                {type === 'gas' && locationLat && locationLon && (
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                        unit="°C"
                                    />
                                )}
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--surface)',
                                        borderColor: 'var(--border)',
                                        borderRadius: '8px',
                                        color: 'var(--text)'
                                    }}
                                    formatter={(value: number | undefined, name: string | undefined) => {
                                        if (name === t('stats.temp')) return [value?.toFixed(1) + '°C', name];
                                        return [value?.toFixed(2) + (type === 'electricity' ? ' kWh' : ' m³'), name];
                                    }}
                                    labelStyle={{ color: 'var(--text-muted)' }}
                                    cursor={{ fill: 'var(--surface-hover)' }}
                                />
                                <Legend />
                                <Bar
                                    yAxisId="left"
                                    dataKey="previousYear"
                                    name={t('stats.prevYear')}
                                    fill="var(--secondary)"
                                    radius={[4, 4, 0, 0]}
                                    barSize={32}
                                    opacity={0.6}
                                />
                                <Bar
                                    yAxisId="left"
                                    dataKey="current"
                                    name={t('stats.currentYear')}
                                    fill="var(--primary)"
                                    radius={[4, 4, 0, 0]}
                                    barSize={32}
                                />
                                {type === 'gas' && locationLat && locationLon && (
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="temperature"
                                        name={t('stats.temp')}
                                        stroke="#f97316"
                                        strokeWidth={2}
                                        dot={{ fill: '#f97316', r: 3 }}
                                        activeDot={{ r: 5 }}
                                    />
                                )}
                            </BarChart>
                        ) : (
                            <LineChart data={filteredData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} vertical={false} />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    yAxisId="left"
                                    tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                    axisLine={false}
                                    tickLine={false}
                                    unit={type === 'electricity' ? ' kWh' : ' m³'}
                                />
                                {type === 'gas' && locationLat && locationLon && (
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                                        axisLine={false}
                                        tickLine={false}
                                        unit="°C"
                                    />
                                )}
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--surface)',
                                        borderColor: 'var(--border)',
                                        borderRadius: '8px',
                                        color: 'var(--text)'
                                    }}
                                    formatter={(value: number | undefined, name: string | undefined) => {
                                        if (name === t('stats.temp')) return [value?.toFixed(1) + '°C', name];
                                        return [value?.toFixed(2) + (type === 'electricity' ? ' kWh' : ' m³'), name];
                                    }}
                                    labelStyle={{ color: 'var(--text-muted)' }}
                                />
                                <Legend />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="previousYear"
                                    name={t('stats.prevYear')}
                                    stroke="var(--secondary)"
                                    strokeWidth={3}
                                    strokeDasharray="5 5"
                                    dot={{ fill: 'var(--secondary)', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                                <Line
                                    yAxisId="left"
                                    type="monotone"
                                    dataKey="current"
                                    name={t('stats.currentYear')}
                                    stroke="var(--primary)"
                                    strokeWidth={3}
                                    dot={{ fill: 'var(--primary)', r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                                {type === 'gas' && locationLat && locationLon && (
                                    <Line
                                        yAxisId="right"
                                        type="monotone"
                                        dataKey="temperature"
                                        name={t('stats.temp')}
                                        stroke="#f97316"
                                        strokeWidth={2}
                                        dot={{ fill: '#f97316', r: 3 }}
                                        activeDot={{ r: 5 }}
                                    />
                                )}
                            </LineChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="card overflow-hidden p-0">
                <div className="max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-surface z-10 backdrop-blur-md">
                            <tr className="border-b border-white/10">
                                <th className="p-4 font-medium text-muted">{t('stats.month')}</th>
                                <th className="p-4 font-medium text-muted">{t('stats.consumption')}</th>
                                {type === 'gas' && locationLat && locationLon && (
                                    <th className="p-4 font-medium text-muted">{t('stats.temp')}</th>
                                )}
                                <th className="p-4 font-medium text-muted">{t('stats.comparison')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.slice().reverse().map((row) => {
                                const prev = row.previousYear;
                                const hasPrev = prev !== null;
                                const diff = hasPrev ? row.current - prev : 0;
                                const diffPercent = (hasPrev && prev !== 0) ? (diff / prev) * 100 : 0;

                                return (
                                    <tr key={row.actualDate} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                        <td className="p-4">{row.month}</td>
                                        <td className="p-4 font-medium">
                                            {row.current.toFixed(2)}
                                            <span className="text-xs text-muted ml-1">{type === 'electricity' ? 'kWh' : 'm³'}</span>
                                        </td>
                                        {type === 'gas' && locationLat && locationLon && (
                                            <td className="p-4 text-orange-400">
                                                {row.temperature !== null && row.temperature !== undefined ? (
                                                    <div className="flex items-center gap-1">
                                                        <Thermometer size={14} />
                                                        {row.temperature.toFixed(1)}°C
                                                    </div>
                                                ) : (
                                                    <span className="text-muted">-</span>
                                                )}
                                            </td>
                                        )}
                                        <td className="p-4">
                                            {hasPrev ? (
                                                <span className={`flex items-center gap-1 ${diff > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                    {diff > 0 ? '+' : ''}{diff.toFixed(2)} ({diff > 0 ? '+' : ''}{diffPercent.toFixed(1)}%)
                                                </span>
                                            ) : (
                                                <span className="text-muted">-</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
