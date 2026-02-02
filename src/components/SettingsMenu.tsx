import { useState, useEffect } from 'react';
import { X, Globe, Save, RefreshCw, Upload, Download, Key, Cpu, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';

interface SettingsMenuProps {
    isOpen: boolean;
    onClose: () => void;
    apiKey: string;
    onApiKeyChange: (key: string) => void;
    model: string;
    onModelChange: (model: string) => void;
    availableModels: string[];
    isLoadingModels: boolean;
    onRefreshModels: () => void;
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onExport: () => void;
}

interface Backup {
    name: string;
    created: string;
}

export function SettingsMenu({
    isOpen,
    onClose,
    apiKey,
    onApiKeyChange,
    model,
    onModelChange,
    availableModels,
    isLoadingModels,
    onRefreshModels,
    onImport,
    onExport
}: SettingsMenuProps) {
    const { t } = useTranslation();
    const [tempKey, setTempKey] = useState(apiKey);
    const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'data'>('general');
    const [backups, setBackups] = useState<Backup[]>([]);
    const [selectedBackup, setSelectedBackup] = useState<string>('');
    const [isLoadingBackups, setIsLoadingBackups] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    useEffect(() => {
        setTempKey(apiKey);
    }, [apiKey]);

    useEffect(() => {
        if (isOpen && activeTab === 'data') {
            fetchBackups();
        }
    }, [isOpen, activeTab]);

    const fetchBackups = async () => {
        setIsLoadingBackups(true);
        try {
            const res = await fetch('/api/backups');
            if (res.ok) {
                const data = await res.json();
                setBackups(data);
            }
        } catch (error) {
            console.error('Failed to fetch backups', error);
        } finally {
            setIsLoadingBackups(false);
        }
    };

    const handleRestore = async () => {
        if (!selectedBackup) return;
        if (!confirm(t('settings.confirmRestore') || 'Are you sure you want to restore this backup? Current data will be replaced.')) return;

        setIsRestoring(true);
        try {
            const res = await fetch('/api/backups/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: selectedBackup })
            });

            if (res.ok) {
                alert(t('settings.restoreSuccess') || 'Restore successful. The page will reload.');
                window.location.reload();
            } else {
                alert(t('settings.restoreError') || 'Restore failed.');
            }
        } catch (error) {
            console.error('Restore error', error);
            alert(t('settings.restoreError') || 'Restore failed.');
        } finally {
            setIsRestoring(false);
        }
    };

    // Trigger immediate backup (hidden feature or just helpful)
    const handleCreateBackup = async () => {
        try {
            await fetch('/api/backups', { method: 'POST' });
            fetchBackups(); // refresh list
        } catch (e) {
            console.error(e);
        }
    };

    if (!isOpen) return null;

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-surface border border-glass-border rounded-lg shadow-lg w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold">{t('settings.title') || 'Settings'}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10">
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`flex-1 py-3 px-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'general' ? 'border-primary text-white' : 'border-transparent text-muted hover:text-white'}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Globe size={16} />
                            {t('settings.general') || 'General'}
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex-1 py-3 px-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'ai' ? 'border-primary text-white' : 'border-transparent text-muted hover:text-white'}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Cpu size={16} />
                            {t('settings.ai') || 'AI Config'}
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('data')}
                        className={`flex-1 py-3 px-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'data' ? 'border-primary text-white' : 'border-transparent text-muted hover:text-white'}`}
                    >
                        <div className="flex items-center justify-center gap-2">
                            <Save size={16} />
                            {t('settings.data') || 'Data'}
                        </div>
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    {/* General Tab */}
                    {activeTab === 'general' && (
                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-muted">{t('settings.language') || 'Language'}</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => changeLanguage('de')}
                                    className={`flex-1 py-2 px-4 rounded border transition-all ${i18n.resolvedLanguage === 'de'
                                        ? 'bg-primary border-primary text-white'
                                        : 'bg-black/20 border-white/10 text-muted hover:border-white/30'
                                        }`}
                                >
                                    Deutsch
                                </button>
                                <button
                                    onClick={() => changeLanguage('en')}
                                    className={`flex-1 py-2 px-4 rounded border transition-all ${i18n.resolvedLanguage === 'en'
                                        ? 'bg-primary border-primary text-white'
                                        : 'bg-black/20 border-white/10 text-muted hover:border-white/30'
                                        }`}
                                >
                                    English
                                </button>
                            </div>
                        </div>
                    )}

                    {/* AI Tab */}
                    {activeTab === 'ai' && (
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-sm font-medium text-muted">
                                    <Key size={16} />
                                    {t('settings.apiKey') || 'Gemini API Key'}
                                </label>
                                <p className="text-xs text-muted">
                                    {t('photoAnalyzer.apiKeyRequired')} (<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">{t('photoAnalyzer.apiKeyLink')}</a>).
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        value={tempKey}
                                        onChange={(e) => setTempKey(e.target.value)}
                                        placeholder="AIza..."
                                        className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                    />
                                    <button
                                        onClick={() => onApiKeyChange(tempKey)}
                                        className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded flex items-center gap-2"
                                        title={t('common.save') || 'Save'}
                                    >
                                        <Save size={18} />
                                    </button>
                                </div>
                            </div>

                            {apiKey && (
                                <div className="space-y-3 pt-4 border-t border-white/10">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium text-muted">{t('settings.model') || 'Model'}</label>
                                        <button onClick={onRefreshModels} className="text-xs text-blue-400 flex items-center gap-1 hover:text-blue-300">
                                            <RefreshCw size={12} className={isLoadingModels ? 'animate-spin' : ''} />
                                            {t('photoAnalyzer.refresh')}
                                        </button>
                                    </div>

                                    {availableModels.length > 0 ? (
                                        <select
                                            value={model}
                                            onChange={(e) => onModelChange(e.target.value)}
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
                    )}

                    {/* Data Tab */}
                    {activeTab === 'data' && (
                        <div className="space-y-6">
                            {/* Backup Section */}
                            <div className="space-y-3">
                                <label className="text-sm font-medium text-muted">{t('settings.backups') || 'Backups'}</label>
                                <div className="flex gap-2">
                                    <select
                                        className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-white text-sm disabled:opacity-50"
                                        value={selectedBackup}
                                        onChange={(e) => setSelectedBackup(e.target.value)}
                                        disabled={isLoadingBackups}
                                    >
                                        <option value="">
                                            {isLoadingBackups
                                                ? (t('common.loading') || 'Loading...')
                                                : (t('settings.selectBackup') || 'Select a backup...')
                                            }
                                        </option>
                                        {backups.map(b => (
                                            <option key={b.name} value={b.name}>
                                                {new Date(b.created).toLocaleString()}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleRestore}
                                        disabled={!selectedBackup || isRestoring || isLoadingBackups}
                                        className="bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 px-3 py-2 rounded flex items-center gap-2 disabled:opacity-50"
                                        title={t('settings.restore') || 'Restore'}
                                    >
                                        <RotateCcw size={18} className={(isRestoring || isLoadingBackups) ? 'animate-spin' : ''} />
                                    </button>
                                </div>
                                <div className='flex justify-end'>
                                    <button
                                        onClick={handleCreateBackup}
                                        className='text-xs text-muted hover:text-white underline'
                                    >
                                        {t('settings.createBackupNow') || 'Create Backup Now'}
                                    </button>
                                </div>
                            </div>

                            <div className="w-full h-px bg-white/10" />

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted">{t('settings.exportData') || 'Export Data'}</label>
                                <button
                                    onClick={onExport}
                                    className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Download size={18} />
                                    {t('sections.importExport.export')}
                                </button>
                            </div>

                            <div className="space-y-2 pt-4 border-t border-white/10">
                                <label className="text-sm font-medium text-muted">{t('settings.importData') || 'Import Data'}</label>
                                <label className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer">
                                    <Upload size={18} />
                                    {t('sections.importExport.import')}
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={onImport}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-white/10 bg-black/20 text-center">
                    <button onClick={onClose} className="text-sm text-muted hover:text-white transition-colors">
                        {t('common.close') || 'Close'}
                    </button>
                </div>
            </div>
        </div>
    );
}
