import { useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import ExifReader from 'exifreader';
import { parse, isValid } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface PhotoAnalyzerProps {
    onAnalysisComplete: (result: { date: string | null; value: number | null }) => void;
    enabled: boolean;
}

export function PhotoAnalyzer({ onAnalysisComplete, enabled }: PhotoAnalyzerProps) {
    const { t } = useTranslation();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [statusText, setStatusText] = useState('');

    const fileToImage = async (file: File) => new Promise<{ data: string; mimeType: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result;
            if (typeof result !== 'string' || !result.includes(',')) return reject(new Error('Could not read image'));
            resolve({ data: result.split(',')[1], mimeType: file.type });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!enabled) {
            alert(t('photoAnalyzer.alertKeyMissing'));
            event.target.value = '';
            return;
        }

        setIsAnalyzing(true);
        setStatusText(t('photoAnalyzer.statusReading'));
        try {
            let detectedDate: string | null = null;
            try {
                const tags = await ExifReader.load(file);
                const dateTag = tags.DateTimeOriginal || tags.CreateDate || tags.DateCreated;
                if (dateTag?.description) {
                    const dateString = dateTag.description.split(' ')[0].replace(/:/g, '-');
                    if (isValid(parse(dateString, 'yyyy-MM-dd', new Date()))) detectedDate = dateString;
                }
            } catch (error) {
                console.warn('Could not read EXIF data', error);
            }

            setStatusText(t('photoAnalyzer.statusSending'));
            const response = await fetch('/api/ai/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: await fileToImage(file) })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
            onAnalysisComplete({
                date: detectedDate,
                value: typeof data.value === 'number' ? data.value : null
            });
        } catch (error: unknown) {
            console.error('Analysis failed', error);
            const message = error instanceof Error ? error.message : t('photoAnalyzer.alertError');
            alert(`${t('photoAnalyzer.alertError')}: ${message}`);
        } finally {
            setIsAnalyzing(false);
            setStatusText('');
            event.target.value = '';
        }
    };

    return (
        <div className="w-full space-y-4">
            <label className={`flex items-center justify-center gap-2 w-full p-4 rounded-lg border border-dashed transition-all cursor-pointer relative overflow-hidden ${
                isAnalyzing ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30 text-muted hover:text-white'
            }`}>
                {isAnalyzing ? (
                    <><Loader2 className="animate-spin" size={24} /><span className="font-medium">{statusText}</span></>
                ) : (
                    <><Camera size={24} className="flex-shrink-0" /><div className="text-center min-w-0 flex-1"><span className="block font-medium truncate">{t('photoAnalyzer.photoPlaceholder')}</span><span className="text-xs opacity-70 block truncate">{t('photoAnalyzer.poweredBy')}</span></div></>
                )}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" capture="environment" onChange={handleFileChange} disabled={isAnalyzing} className="hidden" />
            </label>
        </div>
    );
}
