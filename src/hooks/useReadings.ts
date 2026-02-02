
import { useState, useEffect } from 'react';
import type { Reading, MeterType } from '../types';

const API_URL = '/api/readings';

export function useReadings() {
    const [readings, setReadings] = useState<Reading[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch readings from API
    useEffect(() => {
        fetchReadings();
    }, []);

    const fetchReadings = async () => {
        try {
            const response = await fetch(API_URL);
            if (response.ok) {
                const data = await response.json();
                setReadings(data);
            } else {
                console.error('Failed to fetch readings');
            }
        } catch (error) {
            console.error('Error fetching readings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const addReading = async (reading: Reading) => {
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(reading),
            });

            if (response.ok) {
                // Optimistic update or refetch
                fetchReadings();
            }
        } catch (error) {
            console.error("Failed to add reading:", error);
        }
    };

    const removeReading = async (id: string) => {
        try {
            const response = await fetch(`${API_URL}/${id}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setReadings(prev => prev.filter(r => r.id !== id));
            }
        } catch (error) {
            console.error("Failed to delete reading:", error);
        }
    };

    const importReadings = async (newReadings: Reading[]) => {
        try {
            const response = await fetch('/api/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newReadings),
            });

            if (response.ok) {
                fetchReadings();
                return true;
            }
            return false;
        } catch (error) {
            console.error("Failed to import readings:", error);
            return false;
        }
    };

    const getReadingsByType = (type: MeterType) => {
        return readings
            .filter(r => r.type === type)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    return {
        readings,
        isLoading,
        addReading,
        removeReading,
        importReadings,
        getReadingsByType
    };
}
