import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Reading } from '../types';

interface ReadingEditDialogProps {
    reading: Reading;
    onSave: (reading: Reading) => Promise<boolean>;
    onClose: () => void;
}
export function ReadingEditDialog({ reading, onSave, onClose }: ReadingEditDialogProps) {
    const { t } = useTranslation();
    const [date, setDate] = useState(reading.date);
    const [value, setValue] = useState(String(reading.value));
    const [isSaving, setIsSaving] = useState(false);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setIsSaving(true);
        const saved = await onSave({ ...reading, date, value: Number(value) });
        setIsSaving(false);
        if (saved) onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
            <form onSubmit={submit} className="card w-full max-w-md space-y-5">
                <div className="flex justify-between items-center"><h2 className="text-xl font-bold">{t('readingForm.edit')}</h2><button type="button" onClick={onClose} className="p-2"><X size={20} /></button></div>
                <label className="block text-sm text-muted">{t('readingForm.date')}<input type="date" required value={date} onChange={event => setDate(event.target.value)} className="mt-1 w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white" /></label>
                <label className="block text-sm text-muted">{t('readingForm.reading')}<input type="number" min="0" step="0.01" required value={value} onChange={event => setValue(event.target.value)} className="mt-1 w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 text-white" /></label>
                <button type="submit" disabled={isSaving} className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white py-3 rounded-lg flex items-center justify-center gap-2"><Save size={18} />{isSaving ? t('common.loading') : t('common.save')}</button>
            </form>
        </div>
    );
}
