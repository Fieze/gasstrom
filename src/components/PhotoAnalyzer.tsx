import { useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ExifReader from 'exifreader';
import { parse, isValid } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface PhotoAnalyzerProps {
    onAnalysisComplete: (result: { date: string | null; value: number | null }) => void;
    apiKey: string;
    model: string;
}

export function PhotoAnalyzer({ onAnalysisComplete, apiKey, model }: PhotoAnalyzerProps) {
    const { t } = useTranslation();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [statusText, setStatusText] = useState('');

    const fileToGenerativePart = async (file: File) => {
        return new Promise<{ inlineData: { data: string; mimeType: string } }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Data = reader.result as string;
                const base64Content = base64Data.split(',')[1];
                resolve({
                    inlineData: {
                        data: base64Content,
                        mimeType: file.type,
                    },
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!apiKey) {
            alert(t('photoAnalyzer.alertKeyMissing'));
            return;
        }

        setIsAnalyzing(true);
        setStatusText(t('photoAnalyzer.statusReading'));

        try {
            // 1. Extract Date from EXIF
            let detectedDate: string | null = null;
            try {
                const tags = await ExifReader.load(file);
                const dateTag = tags['DateTimeOriginal'] || tags['CreateDate'] || tags['DateCreated'];

                if (dateTag && dateTag.description) {
                    const dateStr = dateTag.description.split(' ')[0].replace(/:/g, '-');
                    if (isValid(parse(dateStr, 'yyyy-MM-dd', new Date()))) {
                        detectedDate = dateStr;
                    }
                }
            } catch (e) {
                console.warn('Could not read EXIF data', e);
            }

            // 2. Analyze with Gemini
            setStatusText(t('photoAnalyzer.statusSending'));
            const genAI = new GoogleGenerativeAI(apiKey);
            console.log(`Using model: ${model}`);
            const generativeModel = genAI.getGenerativeModel({ model: model });

            const imagePart = await fileToGenerativePart(file);
            const prompt = `
        Analyze this image of a utility meter (electricity or gas).
        Identify the numeric reading value.
        - Ignore serial numbers or other identifiers.
        - The value is likely a number with 5-7 digits, possibly with decimal places.
        - Return ONLY a JSON object with this format (no markdown):
        { "value": number | null, "type": "electricity" | "gas" | "unknown" }
      `;

            const result = await generativeModel.generateContent([prompt, imagePart]);
            const response = await result.response;
            const text = response.text();

            console.log("Gemini Response:", text);

            let detectedValue: number | null = null;
            try {
                const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
                const data = JSON.parse(jsonStr);
                if (data.value !== null && typeof data.value === 'number') {
                    detectedValue = data.value;
                }
            } catch (e) {
                console.error("Failed to parse Gemini JSON", e);
            }

            onAnalysisComplete({ date: detectedDate, value: detectedValue });

        } catch (error: any) {
            console.error('Analysis failed', error);
            const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

            if (errorMessage.includes('400') || errorMessage.includes('API key')) {
                alert(`${t('photoAnalyzer.alertKeyInvalid')} (${errorMessage})`);
            } else if (errorMessage.includes('404')) {
                alert(`${t('photoAnalyzer.alertModelNotFound')} (${model}).`);
            } else {
                alert(`${t('photoAnalyzer.alertError')}: ${errorMessage}`);
            }

            setStatusText(`Error: ${errorMessage.substring(0, 30)}...`);
        } finally {
            setIsAnalyzing(false);
            setStatusText('');
            event.target.value = '';
        }
    };

    return (
        <div className="w-full space-y-4">
            <label className={`
        flex items-center justify-center gap-2 w-full p-4 rounded-lg border border-dashed transition-all cursor-pointer relative overflow-hidden
        ${isAnalyzing
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                    : 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-white/30 text-muted hover:text-white'
                }
      `}>
                {isAnalyzing ? (
                    <>
                        <Loader2 className="animate-spin" size={24} />
                        <span className="font-medium">{statusText}</span>
                    </>
                ) : (
                    <>
                        <Camera size={24} className="flex-shrink-0" />
                        <div className="text-center min-w-0 flex-1">
                            <span className="block font-medium truncate">{t('photoAnalyzer.photoPlaceholder')}</span>
                            <span className="text-xs opacity-70 block truncate">{t('photoAnalyzer.poweredBy')}</span>
                        </div>
                    </>
                )}

                <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileChange}
                    disabled={isAnalyzing}
                    className="hidden"
                />
            </label>
        </div>
    );
}
