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
    locationName?: string;
    onLocationChange?: (lat: number, lon: number, name: string) => void;
    billingDateElectricity?: string;
    onBillingDateElectricityChange?: (date: string) => void;
    billingDateGas?: string;
    onBillingDateGasChange?: (date: string) => void;
    priceKwhElectricity?: string;
    onPriceKwhElectricityChange?: (price: string) => void;
    basePriceElectricity?: string;
    onBasePriceElectricityChange?: (price: string) => void;
    paymentElectricity?: string;
    onPaymentElectricityChange?: (payment: string) => void;
    priceKwhGas?: string;
    onPriceKwhGasChange?: (price: string) => void;
    basePriceGas?: string;
    onBasePriceGasChange?: (price: string) => void;
    paymentGas?: string;
    onPaymentGasChange?: (payment: string) => void;
    billingMonths?: string;
    onBillingMonthsChange?: (months: string) => void;
    gasConversionFactor?: string;
    onGasConversionFactorChange?: (factor: string) => void;
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
    onExport,
    locationName = '',
    onLocationChange,
    billingDateElectricity = '',
    onBillingDateElectricityChange,
    billingDateGas = '',
    onBillingDateGasChange,
    priceKwhElectricity = '',
    onPriceKwhElectricityChange,
    basePriceElectricity = '',
    onBasePriceElectricityChange,
    paymentElectricity = '',
    onPaymentElectricityChange,
    priceKwhGas = '',
    onPriceKwhGasChange,
    basePriceGas = '',
    onBasePriceGasChange,
    paymentGas = '',
    onPaymentGasChange,
    billingMonths = '12',
    onBillingMonthsChange,
    gasConversionFactor = '10.5',
    onGasConversionFactorChange
}: SettingsMenuProps) {
    const { t } = useTranslation();
    const [tempKey, setTempKey] = useState(apiKey);
    const [activeTab, setActiveTab] = useState<'general' | 'ai' | 'data'>('general');
    const [backups, setBackups] = useState<Backup[]>([]);
    const [selectedBackup, setSelectedBackup] = useState<string>('');
    const [isLoadingBackups, setIsLoadingBackups] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);

    // Location & Billing Date state
    const [tempLocation, setTempLocation] = useState(locationName);
    const [isSearchingLocation, setIsSearchingLocation] = useState(false);
    const [tempBillingDateElectricity, setTempBillingDateElectricity] = useState(billingDateElectricity);
    const [tempBillingDateGas, setTempBillingDateGas] = useState(billingDateGas);
    const [tempPriceKwhElectricity, setTempPriceKwhElectricity] = useState(priceKwhElectricity);
    const [tempBasePriceElectricity, setTempBasePriceElectricity] = useState(basePriceElectricity);
    const [tempPaymentElectricity, setTempPaymentElectricity] = useState(paymentElectricity);
    const [tempPriceKwhGas, setTempPriceKwhGas] = useState(priceKwhGas);
    const [tempBasePriceGas, setTempBasePriceGas] = useState(basePriceGas);
    const [tempPaymentGas, setTempPaymentGas] = useState(paymentGas);
    const [tempBillingMonths, setTempBillingMonths] = useState(billingMonths);
    const [tempGasConversionFactor, setTempGasConversionFactor] = useState(gasConversionFactor);

    useEffect(() => {
        setTempKey(apiKey);
    }, [apiKey]);

    useEffect(() => {
        setTempLocation(locationName);
    }, [locationName]);

    useEffect(() => {
        setTempBillingDateElectricity(billingDateElectricity);
    }, [billingDateElectricity]);

    useEffect(() => {
        setTempBillingDateGas(billingDateGas);
    }, [billingDateGas]);

    useEffect(() => { setTempPriceKwhElectricity(priceKwhElectricity); }, [priceKwhElectricity]);
    useEffect(() => { setTempBasePriceElectricity(basePriceElectricity); }, [basePriceElectricity]);
    useEffect(() => { setTempPaymentElectricity(paymentElectricity); }, [paymentElectricity]);
    useEffect(() => { setTempPriceKwhGas(priceKwhGas); }, [priceKwhGas]);
    useEffect(() => { setTempBasePriceGas(basePriceGas); }, [basePriceGas]);
    useEffect(() => { setTempPaymentGas(paymentGas); }, [paymentGas]);
    useEffect(() => { setTempBillingMonths(billingMonths); }, [billingMonths]);
    useEffect(() => { setTempGasConversionFactor(gasConversionFactor); }, [gasConversionFactor]);

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

    const handleLocationSearch = async () => {
        if (!tempLocation.trim()) return;
        setIsSearchingLocation(true);
        try {
            const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(tempLocation)}&count=1&language=${i18n.resolvedLanguage}&format=json`);
            if (res.ok) {
                const data = await res.json();
                if (data.results && data.results.length > 0) {
                    const result = data.results[0];
                    const fullName = `${result.name}${result.admin1 ? ', ' + result.admin1 : ''}${result.country ? ', ' + result.country : ''}`;
                    setTempLocation(fullName);
                    if (onLocationChange) {
                        onLocationChange(result.latitude, result.longitude, fullName);
                    }
                } else {
                    alert(t('settings.locationNotFound') || 'Location not found.');
                }
            }
        } catch (error) {
            console.error('Failed to search location:', error);
        } finally {
            setIsSearchingLocation(false);
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

                            <div className="pt-4 border-t border-white/10 space-y-2">
                                <label className="block text-sm font-medium text-muted">{t('settings.location') || 'Location (Zip Code or City)'}</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={tempLocation}
                                        onChange={(e) => setTempLocation(e.target.value)}
                                        placeholder="e.g. Berlin"
                                        className="flex-1 bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        onKeyDown={(e) => e.key === 'Enter' && handleLocationSearch()}
                                    />
                                    <button
                                        onClick={handleLocationSearch}
                                        disabled={isSearchingLocation}
                                        className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isSearchingLocation ? (
                                            <RefreshCw size={18} className="animate-spin" />
                                        ) : (
                                            t('settings.locationSearch') || 'Search'
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-muted">
                                    {locationName ? (t('settings.locationFound', { name: locationName }) || `Current: ${locationName}`) : ''}
                                </p>
                            </div>

                            <div className="pt-4 border-t border-white/10 space-y-4">
                                <label className="block text-sm font-medium text-muted">Stichtage Jahresabrechnung</label>
                                <p className="text-xs text-muted">{t('settings.billingDateHelp') || 'Day and month of your last bill (e.g. 15.05.)'}</p>

                                <div className="space-y-2">
                                    <label className="text-xs text-muted">{t('settings.billingDateElectricity') || 'Billing Date (Electricity)'}</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={tempBillingDateElectricity}
                                            onChange={(e) => setTempBillingDateElectricity(e.target.value)}
                                            placeholder="DD.MM."
                                            className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                        <button
                                            onClick={() => onBillingDateElectricityChange?.(tempBillingDateElectricity)}
                                            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded flex items-center gap-2"
                                            title={t('common.save') || 'Save'}
                                        >
                                            <Save size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs text-muted">{t('settings.billingDateGas') || 'Billing Date (Gas)'}</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={tempBillingDateGas}
                                            onChange={(e) => setTempBillingDateGas(e.target.value)}
                                            placeholder="DD.MM."
                                            className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                                        />
                                        <button
                                            onClick={() => onBillingDateGasChange?.(tempBillingDateGas)}
                                            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded flex items-center gap-2"
                                            title={t('common.save') || 'Save'}
                                        >
                                            <Save size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10 space-y-4">
                                <label className="block text-sm font-medium text-muted">{t('settings.contractDetails') || 'Contract Details'} (Strom)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted">{t('settings.priceKwh') || 'Cents/kWh'}</label>
                                        <input type="number" step="0.01" value={tempPriceKwhElectricity} onChange={e => setTempPriceKwhElectricity(e.target.value)} onBlur={() => onPriceKwhElectricityChange?.(tempPriceKwhElectricity)} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted">{t('settings.basePrice') || 'Base €'}</label>
                                        <input type="number" step="0.01" value={tempBasePriceElectricity} onChange={e => setTempBasePriceElectricity(e.target.value)} onBlur={() => onBasePriceElectricityChange?.(tempBasePriceElectricity)} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted">{t('settings.monthlyPayment') || 'Payment €'}</label>
                                        <input type="number" step="0.01" value={tempPaymentElectricity} onChange={e => setTempPaymentElectricity(e.target.value)} onBlur={() => onPaymentElectricityChange?.(tempPaymentElectricity)} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10 space-y-4">
                                <label className="block text-sm font-medium text-muted">{t('settings.contractDetails') || 'Contract Details'} (Gas)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted">{t('settings.priceKwh') || 'Cents/kWh'}</label>
                                        <input type="number" step="0.01" value={tempPriceKwhGas} onChange={e => setTempPriceKwhGas(e.target.value)} onBlur={() => onPriceKwhGasChange?.(tempPriceKwhGas)} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted">{t('settings.basePrice') || 'Base €'}</label>
                                        <input type="number" step="0.01" value={tempBasePriceGas} onChange={e => setTempBasePriceGas(e.target.value)} onBlur={() => onBasePriceGasChange?.(tempBasePriceGas)} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-muted">{t('settings.monthlyPayment') || 'Payment €'}</label>
                                        <input type="number" step="0.01" value={tempPaymentGas} onChange={e => setTempPaymentGas(e.target.value)} onBlur={() => onPaymentGasChange?.(tempPaymentGas)} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs text-muted">{t('settings.gasConversionFactor') || 'Conversion Factor'}</label>
                                    <p className="text-[10px] text-muted-foreground/70 mb-1">{t('settings.gasConversionHelp')}</p>
                                    <input type="number" step="0.1" value={tempGasConversionFactor} onChange={e => setTempGasConversionFactor(e.target.value)} onBlur={() => onGasConversionFactorChange?.(tempGasConversionFactor)} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50" />
                                </div>
                            </div>

                            <div className="pt-4 border-t border-white/10 space-y-4">
                                <div className="space-y-1">
                                    <label className="text-xs text-muted">{t('settings.billingMonths') || 'Months Billed per Year'}</label>
                                    <select value={tempBillingMonths} onChange={e => { setTempBillingMonths(e.target.value); onBillingMonthsChange?.(e.target.value); }} className="w-full bg-black/20 border border-white/10 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-primary/50">
                                        <option value="12">12</option>
                                        <option value="11">11</option>
                                    </select>
                                </div>
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
