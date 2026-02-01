import { useState } from 'react';
import type { MeterType, Reading } from '../types';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { PhotoAnalyzer } from './PhotoAnalyzer';
import { useTranslation } from 'react-i18next';

interface ReadingFormProps {
    type: MeterType;
    onSubmit: (reading: Reading) => void;
}

export function ReadingForm({ type, onSubmit }: ReadingFormProps) {
    const { t } = useTranslation();
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [value, setValue] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!value || !date) return;

        onSubmit({
            id: crypto.randomUUID(),
            date,
            value: parseFloat(value),
            type
        });

        setValue('');
        // Optionally keep date or reset to today
        // setDate(format(new Date(), 'yyyy-MM-dd'));
    };

    const handleAnalysisResult = (result: { date: string | null; value: number | null }) => {
        if (result.date) {
            setDate(result.date);
        }
        if (result.value !== null) {
            setValue(result.value.toString());
        }
        // Maybe show a toast or message saying "Data detected!"
    };

    return (
        <div className="card space-y-6">
            <PhotoAnalyzer onAnalysisComplete={handleAnalysisResult} />

            <div className="w-full h-px bg-white/10" />

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-muted mb-1">{t('readingForm.date')}</label>
                    <input
                        type="date"
                        required
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-muted mb-1">
                        {t('readingForm.reading')} ({type === 'electricity' ? 'kWh' : 'm³'})
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        required
                        placeholder="0.00"
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary-hover text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-lg"
                >
                    <Plus size={20} />
                    {t('readingForm.add')}
                </button>
            </form>
        </div>
    );
}
