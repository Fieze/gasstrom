import { parseISO, startOfMonth } from 'date-fns';

const CACHE_PREFIX = 'weather_cache_';
const MAX_RETRIES = 3;

interface WeatherResponse {
    daily?: {
        time: string[];
        temperature_2m_mean?: number[];
    };
}

export async function fetchMonthlyTemperature(lat: number, lon: number, monthStr: string): Promise<number | null> {
    // monthStr format: "YYYY-MM"
    const cacheKey = `${CACHE_PREFIX}${lat}_${lon}_${monthStr}`;
    const cachedData = localStorage.getItem(cacheKey);

    // Consider the month ended if it's strictly in the past (we cache completely past months permanently)
    const currentMonth = startOfMonth(new Date());
    const queryMonth = parseISO(`${monthStr}-01`);
    const isPastMonth = queryMonth < currentMonth;

    if (cachedData) {
        try {
            const parsed = JSON.parse(cachedData);
            // If it's a past month and we have it cached, just return it
            if (isPastMonth) {
                return parsed.value;
            }
            // For the current month, cache for 24 hours to avoid spamming
            const cacheTime = parsed.timestamp || 0;
            const now = Date.now();
            if (now - cacheTime < 24 * 60 * 60 * 1000) {
                return parsed.value;
            }
        } catch (e) {
            console.error('Failed to parse cached weather', e);
        }
    }

    // Determine start and end dates for the API query
    const startDate = `${monthStr}-01`;
    // Approximate end date for the month (Open-Meteo handles dates past current gracefully)
    // To be precise:
    const year = parseInt(monthStr.split('-')[0]);
    const month = parseInt(monthStr.split('-')[1]);
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${monthStr}-${lastDay.toString().padStart(2, '0')}`;

    const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_mean&timezone=auto`;

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 429) {
                    // Too many requests, wait and retry
                    await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
                    continue;
                }
                throw new Error(`Weather API error: ${res.status}`);
            }

            const data: WeatherResponse = await res.json();

            if (data.daily && data.daily.temperature_2m_mean) {
                const temps = data.daily.temperature_2m_mean.filter((t): t is number => t !== null && typeof t === 'number');
                if (temps.length > 0) {
                    const sum = temps.reduce((acc, val) => acc + val, 0);
                    const avg = sum / temps.length;

                    // Save to cache
                    localStorage.setItem(cacheKey, JSON.stringify({
                        value: avg,
                        timestamp: Date.now()
                    }));

                    return avg;
                }
            }

            // If we successfully fetched but no data (e.g., future month), return null
            return null;

        } catch (error) {
            console.error(`Failed to fetch weather for ${monthStr}:`, error);
            if (i === MAX_RETRIES - 1) return null; // Last retry failed
        }
    }

    return null;
}
