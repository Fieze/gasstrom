import { useEffect, useState } from 'react';
import type { Reading, MeterType } from '../types';
import { apiRequest } from '../api/client';

const API_URL = '/api/readings';

export function useReadings(enabled = true) {
    const [readings, setReadings] = useState<Reading[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    useEffect(() => {
        if (enabled) void fetchReadings();
    }, [enabled]);

    async function fetchReadings() {
        try {
            setIsLoading(true);
            setError(null);
            setReadings(await apiRequest<Reading[]>(API_URL));
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Failed to load readings');
        } finally {
            setIsLoading(false);
        }
    }

    const addReading = async (reading: Reading) => {
        try {
            setError(null);
            await apiRequest<Reading>(API_URL, { method: 'POST', body: JSON.stringify(reading) });
            await fetchReadings();
            setNotice('feedback.readingAdded');
            return true;
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Failed to add reading');
            return false;
        }
    };

    const removeReading = async (id: string) => {
        try {
            setError(null);
            await apiRequest<void>(`${API_URL}/${encodeURIComponent(id)}`, { method: 'DELETE' });
            setReadings(previous => previous.filter(reading => reading.id !== id));
            setNotice('feedback.readingDeleted');
            return true;
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Failed to delete reading');
            return false;
        }
    };

    const updateReading = async (reading: Reading) => {
        try {
            setError(null);
            const updated = await apiRequest<Reading>(`${API_URL}/${encodeURIComponent(reading.id)}`, { method: 'PUT', body: JSON.stringify(reading) });
            setReadings(previous => previous.map(item => item.id === updated.id ? updated : item));
            setNotice('feedback.readingUpdated');
            return true;
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Failed to update reading');
            return false;
        }
    };

    const importReadings = async (newReadings: Reading[]) => {
        try {
            setError(null);
            await apiRequest<{ count: number }>('/api/import', { method: 'POST', body: JSON.stringify(newReadings) });
            await fetchReadings();
            setNotice('feedback.importCompleted');
            return true;
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : 'Failed to import readings');
            return false;
        }
    };

    const getReadingsByType = (type: MeterType) => readings
        .filter(reading => reading.type === type)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { readings, isLoading, error, notice, setNotice, addReading, updateReading, removeReading, importReadings, getReadingsByType };
}
