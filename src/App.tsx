
import { useState, useEffect } from 'react';
import type { MeterType } from './types.ts';
import { useReadings } from './hooks/useReadings';
import { ReadingForm } from './components/ReadingForm';
import { MonthlyStats } from './components/MonthlyStats';
import { AnnualStats } from './components/AnnualStats';
import { CollapsibleSection } from './components/CollapsibleSection';
import { SettingsMenu } from './components/SettingsMenu';
import { format, parseISO } from 'date-fns';
import { de, enUS } from 'date-fns/locale';
import { Zap, Flame, Settings, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function App() {
  const { readings, addReading, removeReading, importReadings, getReadingsByType } = useReadings();
  const [activeTab, setActiveTab] = useState<MeterType>('electricity');
  const currentReadings = getReadingsByType(activeTab);
  const { t, i18n } = useTranslation();

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [aiModel, setAiModel] = useState('gemini-1.5-flash');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLon, setLocationLon] = useState<number | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [billingDateElectricity, setBillingDateElectricity] = useState<string>('');
  const [billingDateGas, setBillingDateGas] = useState<string>('');
  const [priceKwhElectricity, setPriceKwhElectricity] = useState<string>('');
  const [basePriceElectricity, setBasePriceElectricity] = useState<string>('');
  const [paymentElectricity, setPaymentElectricity] = useState<string>('');
  const [priceKwhGas, setPriceKwhGas] = useState<string>('');
  const [basePriceGas, setBasePriceGas] = useState<string>('');
  const [paymentGas, setPaymentGas] = useState<string>('');
  const [billingMonths, setBillingMonths] = useState<string>('12');
  const [gasConversionFactor, setGasConversionFactor] = useState<string>('10.5');

  useEffect(() => {
    // Load settings from backend
    const loadSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const settings = await res.json();
          if (settings.gemini_api_key) {
            setApiKey(settings.gemini_api_key);
            fetchModels(settings.gemini_api_key);
          }
          if (settings.gemini_model) {
            setAiModel(settings.gemini_model);
          }
          if (settings.location_lat) {
            setLocationLat(Number(settings.location_lat));
          }
          if (settings.location_lon) {
            setLocationLon(Number(settings.location_lon));
          }
          if (settings.location_name) {
            setLocationName(settings.location_name);
          }
          if (settings.billing_date_electricity) {
            setBillingDateElectricity(settings.billing_date_electricity);
          }
          if (settings.billing_date_gas) {
            setBillingDateGas(settings.billing_date_gas);
          }
          if (settings.price_kwh_electricity) {
            setPriceKwhElectricity(settings.price_kwh_electricity);
          }
          if (settings.base_price_electricity) {
            setBasePriceElectricity(settings.base_price_electricity);
          }
          if (settings.payment_electricity) {
            setPaymentElectricity(settings.payment_electricity);
          }
          if (settings.price_kwh_gas) {
            setPriceKwhGas(settings.price_kwh_gas);
          }
          if (settings.base_price_gas) {
            setBasePriceGas(settings.base_price_gas);
          }
          if (settings.payment_gas) {
            setPaymentGas(settings.payment_gas);
          }
          if (settings.billing_months) {
            setBillingMonths(settings.billing_months);
          }
          if (settings.gas_conversion_factor) {
            setGasConversionFactor(settings.gas_conversion_factor);
          }
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      }
    };
    loadSettings();
  }, []);

  const dateLocale = i18n.resolvedLanguage === 'de' ? de : enUS;

  const handleExport = () => {
    const dataStr = JSON.stringify(readings, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meter-readings-${format(new Date(), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') return;
        const data = JSON.parse(text);
        if (Array.isArray(data)) {
          const success = await importReadings(data);
          if (success) {
            alert(t('sections.importExport.success'));
          } else {
            alert(t('sections.importExport.errorImport'));
          }
        }
      } catch (err) {
        console.error('Import error', err);
        alert(t('sections.importExport.errorRead'));
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const saveSetting = async (key: string, value: string) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value })
      });
    } catch (err) {
      console.error('Failed to save setting', err);
    }
  };

  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    saveSetting('gemini_api_key', key);
    fetchModels(key);
  };

  const handleModelChange = (model: string) => {
    setAiModel(model);
    saveSetting('gemini_model', model);
  };

  const handleLocationChange = (lat: number, lon: number, name: string) => {
    setLocationLat(lat);
    setLocationLon(lon);
    setLocationName(name);
    // save the location directly as settings
    saveSetting('location_lat', String(lat));
    saveSetting('location_lon', String(lon));
    saveSetting('location_name', name);
  };

  const handleBillingDateElectricityChange = (date: string) => {
    setBillingDateElectricity(date);
    saveSetting('billing_date_electricity', date);
  };

  const handleBillingDateGasChange = (date: string) => {
    setBillingDateGas(date);
    saveSetting('billing_date_gas', date);
  };

  const handlePriceKwhElectricityChange = (price: string) => {
    setPriceKwhElectricity(price);
    saveSetting('price_kwh_electricity', price);
  };

  const handleBasePriceElectricityChange = (price: string) => {
    setBasePriceElectricity(price);
    saveSetting('base_price_electricity', price);
  };

  const handlePaymentElectricityChange = (payment: string) => {
    setPaymentElectricity(payment);
    saveSetting('payment_electricity', payment);
  };

  const handlePriceKwhGasChange = (price: string) => {
    setPriceKwhGas(price);
    saveSetting('price_kwh_gas', price);
  };

  const handleBasePriceGasChange = (price: string) => {
    setBasePriceGas(price);
    saveSetting('base_price_gas', price);
  };

  const handlePaymentGasChange = (payment: string) => {
    setPaymentGas(payment);
    saveSetting('payment_gas', payment);
  };

  const handleBillingMonthsChange = (months: string) => {
    setBillingMonths(months);
    saveSetting('billing_months', months);
  };

  const handleGasConversionFactorChange = (factor: string) => {
    setGasConversionFactor(factor);
    saveSetting('gas_conversion_factor', factor);
  };

  const fetchModels = async (key: string) => {
    if (!key) return;
    setIsLoadingModels(true);
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
      if (response.ok) {
        const data = await response.json();
        if (data.models) {
          const models = data.models
            .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
            .map((m: any) => m.name.replace('models/', ''));
          setAvailableModels(models);

          if (!models.includes(aiModel)) {
            const fallback = models.find((m: string) => m.includes('flash')) || models[0];
            if (fallback) handleModelChange(fallback);
          }
        }
      }
    } catch (e) {
      console.error("Failed to list models", e);
    } finally {
      setIsLoadingModels(false);
    }
  };


  return (
    <div className="min-h-screen pb-20">
      <SettingsMenu
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
        model={aiModel}
        onModelChange={handleModelChange}
        availableModels={availableModels}
        isLoadingModels={isLoadingModels}
        onRefreshModels={() => fetchModels(apiKey)}
        onImport={handleImport}
        onExport={handleExport}
        locationName={locationName}
        onLocationChange={handleLocationChange}
        billingDateElectricity={billingDateElectricity}
        onBillingDateElectricityChange={handleBillingDateElectricityChange}
        billingDateGas={billingDateGas}
        onBillingDateGasChange={handleBillingDateGasChange}
        priceKwhElectricity={priceKwhElectricity}
        onPriceKwhElectricityChange={handlePriceKwhElectricityChange}
        basePriceElectricity={basePriceElectricity}
        onBasePriceElectricityChange={handleBasePriceElectricityChange}
        paymentElectricity={paymentElectricity}
        onPaymentElectricityChange={handlePaymentElectricityChange}
        priceKwhGas={priceKwhGas}
        onPriceKwhGasChange={handlePriceKwhGasChange}
        basePriceGas={basePriceGas}
        onBasePriceGasChange={handleBasePriceGasChange}
        paymentGas={paymentGas}
        onPaymentGasChange={handlePaymentGasChange}
        billingMonths={billingMonths}
        onBillingMonthsChange={handleBillingMonthsChange}
        gasConversionFactor={gasConversionFactor}
        onGasConversionFactorChange={handleGasConversionFactorChange}
      />

      <header className="mb-8 pt-4 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-2">{t('app.title')}</h1>
          <p className="text-muted">{t('app.subtitle')}</p>
        </div>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-3 bg-surface hover:bg-surface-hover text-muted hover:text-white rounded-lg transition-colors border border-white/10"
          title={t('settings.title') || 'Settings'}
        >
          <Settings size={24} />
        </button>
      </header>

      <div className="flex gap-6 mb-8">
        <button
          onClick={() => setActiveTab('electricity')}
          className={`flex-1 py-4 flex items-center justify-center gap-2 text-lg transition-all ${activeTab === 'electricity' ? 'bg-primary shadow-lg shadow-indigo-500/20' : 'bg-surface text-muted hover:bg-surface-hover'}`}
        >
          <Zap size={24} />
          {t('app.tabs.electricity')}
        </button>
        <button
          onClick={() => setActiveTab('gas')}
          className={`flex-1 py-4 flex items-center justify-center gap-2 text-lg transition-all ${activeTab === 'gas' ? 'bg-secondary shadow-lg shadow-pink-500/20' : 'bg-surface text-muted hover:bg-surface-hover'}`}
        >
          <Flame size={24} />
          {t('app.tabs.gas')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-1 space-y-6">
          <section>
            <h2 className="text-xl mb-4">{t('sections.newEntry')}</h2>
            <ReadingForm
              type={activeTab}
              onSubmit={addReading}
              apiKey={apiKey}
              model={aiModel}
            />
          </section>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl">{t('sections.analysis')}</h2>
            </div>
            <div className="space-y-6">
              <MonthlyStats
                readings={currentReadings}
                type={activeTab}
                locationLat={locationLat}
                locationLon={locationLon}
              />

              <AnnualStats
                readings={currentReadings}
                type={activeTab}
                billingDateInput={activeTab === 'electricity' ? billingDateElectricity : billingDateGas}
                priceKwh={activeTab === 'electricity' ? priceKwhElectricity : priceKwhGas}
                basePrice={activeTab === 'electricity' ? basePriceElectricity : basePriceGas}
                payment={activeTab === 'electricity' ? paymentElectricity : paymentGas}
                billingMonths={billingMonths}
                gasConversionFactor={gasConversionFactor}
              />
            </div>
          </section>
        </div>
      </div>

      <div className="space-y-4">
        <CollapsibleSection title={t('sections.status.title')} defaultOpen={false}>
          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20 text-sm">
            <p className="font-semibold mb-1">{t('sections.status.dataStatus')}</p>
            <p>{t('sections.status.count', { type: activeTab === 'electricity' ? t('app.tabs.electricity') : t('app.tabs.gas') })}: {currentReadings.length}</p>
            {currentReadings.length < 2 && (
              <p className="text-yellow-400 mt-2">
                {t('sections.status.minEntries')}
              </p>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title={t('sections.history.title')} defaultOpen={false}>
          <div className="max-h-[500px] overflow-y-auto p-1">
            {currentReadings.length === 0 ? (
              <p className="text-center text-muted py-4">{t('sections.history.empty')}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {currentReadings.map(reading => (
                  <div key={reading.id} className="relative flex flex-col justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:border-white/20 transition-all group">
                    <div className="mb-2">
                      <div className="font-medium text-lg">
                        {format(parseISO(reading.date), 'dd.MM.yyyy', { locale: dateLocale })}
                      </div>
                      <div className="text-sm text-muted">
                        {reading.value.toFixed(2)} {activeTab === 'electricity' ? 'kWh' : 'm³'}
                      </div>
                    </div>
                    <button
                      onClick={() => removeReading(reading.id)}
                      className="absolute top-2 right-2 p-1.5 text-muted hover:text-red-400 hover:bg-red-400/10 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                      title={t('sections.history.delete')}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}

export default App;
