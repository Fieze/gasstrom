
import { useState, useEffect } from 'react';
import { Camera, Loader2, Settings, Save, RefreshCw } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import ExifReader from 'exifreader';
import { parse, isValid } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface PhotoAnalyzerProps {
    onAnalysisComplete: (result: { date: string | null; value: number | null }) => void;
}

export function PhotoAnalyzer({ onAnalysisComplete }: PhotoAnalyzerProps) {
    const { t } = useTranslation();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash');
    const [isLoadingModels, setIsLoadingModels] = useState(false);

    useEffect(() => {
        const storedKey = localStorage.getItem('gemini_api_key');
        const storedModel = localStorage.getItem('gemini_model');
        if (storedKey) {
            setApiKey(storedKey);
            if (storedModel) setSelectedModel(storedModel);
            fetchModels(storedKey);
        } else {
            setShowSettings(true);
        }
    }, []);

    const saveApiKey = (key: string) => {
        localStorage.setItem('gemini_api_key', key);
        setApiKey(key);
        fetchModels(key);
        setShowSettings(false);
    };

    const handleModelSelect = (model: string) => {
        setSelectedModel(model);
        localStorage.setItem('gemini_model', model);
    };

    const fetchModels = async (key: string) => {
        if (!key) return;
        setIsLoadingModels(true);
        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
            if (response.ok) {
                const data = await response.json();
                if (data.models) {
                    // Filter for models that support generateContent and are likely valid
                    // Common convention: match "gemini" and "generateContent" in supportedGenerationMethods
                    const models = data.models
                        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
                        .map((m: any) => m.name.replace('models/', ''));

                    setAvailableModels(models);

                    // If current selected model is not in list, try to pick a good default
                    if (!models.includes(selectedModel)) {
                        const fallback = models.find((m: string) => m.includes('flash')) || models[0];
                        if (fallback) setSelectedModel(fallback);
                    }
                }
            }
        } catch (e) {
            console.error("Failed to list models", e);
        } finally {
            setIsLoadingModels(false);
        }
    };

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
            setShowSettings(true);
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
            console.log(`Using model: ${selectedModel}`);
            const model = genAI.getGenerativeModel({ model: selectedModel });

            const imagePart = await fileToGenerativePart(file);
            const prompt = `
        Analyze this image of a utility meter (electricity or gas).
        Identify the numeric reading value.
        - Ignore serial numbers or other identifiers.
        - The value is likely a number with 5-7 digits, possibly with decimal places.
        - Return ONLY a JSON object with this format (no markdown):
        { "value": number | null, "type": "electricity" | "gas" | "unknown" }
      `;

            const result = await model.generateContent([prompt, imagePart]);
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
                alert(`${t('photoAnalyzer.alertModelNotFound')} (${selectedModel}).`);
                setShowSettings(true);
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
            {/* Settings / API Key Input */}
            {showSettings ? (
                <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-primary mb-2">
                        <Settings size={20} />
                        <h3 className="font-semibold">{t('photoAnalyzer.config')}</h3>
                    </div>

                    <p className="text-sm text-muted">
                        {t('photoAnalyzer.apiKeyRequired')} (<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{t('photoAnalyzer.apiKeyLink')}</a>).
                    </p>

                    <div className="flex gap-4">
                        <input
                            type="password"
                            placeholder={t('photoAnalyzer.insertKey')}
                            className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                            onChange={(e) => setApiKey(e.target.value)}
                            value={apiKey}
                        />
                        <button
                            onClick={() => saveApiKey(apiKey)}
                            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded flex items-center gap-2"
                        >
                            <Save size={18} />
                        </button>
                    </div>

                    {/* Model Selection */}
                    {apiKey && (
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-muted">{t('photoAnalyzer.model')}:</label>
                                <button onClick={() => fetchModels(apiKey)} className="text-xs text-blue-400 flex items-center gap-1">
                                    <RefreshCw size={12} className={isLoadingModels ? 'animate-spin' : ''} /> {t('photoAnalyzer.refresh')}
                                </button>
                            </div>
                            {availableModels.length > 0 ? (
                                <select
                                    value={selectedModel}
                                    onChange={(e) => handleModelSelect(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                                >
                                    {availableModels.map(m => (
                                        <option key={m} value={m} className="bg-gray-800">{m}</option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-xs text-yellow-500">
                                    {isLoadingModels ? t('photoAnalyzer.loadingModels') : t('photoAnalyzer.noModels')}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="flex justify-end">
                    <button
                        onClick={() => setShowSettings(true)}
                        className="text-xs text-muted hover:text-white flex items-center gap-1"
                    >
                        <Settings size={14} />
                        {t('photoAnalyzer.apiSettings')} {selectedModel && `(${selectedModel})`}
                    </button>
                </div>
            )}

            {/* Upload Button */}
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
                        <Camera size={24} />
                        <div className="text-center">
                            <span className="block font-medium">{t('photoAnalyzer.photoPlaceholder')}</span>
                            <span className="text-xs opacity-70">{t('photoAnalyzer.poweredBy')}</span>
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
