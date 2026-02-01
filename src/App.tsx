
import { useState } from 'react';
import type { MeterType } from './types.ts';
import { useReadings } from './hooks/useReadings';
import { ReadingForm } from './components/ReadingForm';
import { MonthlyStats } from './components/MonthlyStats';
import { CollapsibleSection } from './components/CollapsibleSection';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Trash2, Zap, Flame, Download, Upload } from 'lucide-react';

function App() {
  const { readings, addReading, removeReading, importReadings, getReadingsByType } = useReadings();
  const [activeTab, setActiveTab] = useState<MeterType>('electricity');
  const currentReadings = getReadingsByType(activeTab);

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
            alert('Daten erfolgreich importiert!');
          } else {
            alert('Fehler beim Importieren der Daten.');
          }
        }
      } catch (err) {
        console.error('Import error', err);
        alert('Fehler beim Lesen der Datei.');
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="mb-8 pt-4">
        <h1 className="text-3xl font-bold mb-2">Verbrauchsmonitor</h1>
        <p className="text-muted">Erfasse und analysiere deine Zählerstände</p>
      </header>

      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setActiveTab('electricity')}
          className={`flex-1 py-4 flex items-center justify-center gap-2 text-lg transition-all ${activeTab === 'electricity' ? 'bg-primary shadow-lg shadow-indigo-500/20' : 'bg-surface text-muted hover:bg-surface-hover'}`}
        >
          <Zap size={24} />
          Strom
        </button>
        <button
          onClick={() => setActiveTab('gas')}
          className={`flex-1 py-4 flex items-center justify-center gap-2 text-lg transition-all ${activeTab === 'gas' ? 'bg-secondary shadow-lg shadow-pink-500/20' : 'bg-surface text-muted hover:bg-surface-hover'}`}
        >
          <Flame size={24} />
          Gas
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="lg:col-span-1 space-y-6">
          <section>
            <h2 className="text-xl mb-4">Neuer Eintrag</h2>
            <ReadingForm type={activeTab} onSubmit={addReading} />


          </section>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl">Auswertung</h2>
            </div>
            <MonthlyStats readings={currentReadings} type={activeTab} />
          </section>
        </div>
      </div>

      <div className="space-y-4">
        <CollapsibleSection title="Status & Informationen" defaultOpen={false}>
          <div className="p-4 bg-blue-500/10 rounded-lg border border-blue-500/20 text-sm">
            <p className="font-semibold mb-1">Daten-Status</p>
            <p>Anzahl Einträge ({activeTab}): {currentReadings.length}</p>
            {currentReadings.length < 2 && (
              <p className="text-yellow-400 mt-2">
                Mindestens 2 Einträge benötigt für Diagramm.
              </p>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Historie" defaultOpen={false}>
          <div className="max-h-[500px] overflow-y-auto space-y-2">
            {currentReadings.length === 0 ? (
              <p className="text-center text-muted py-4">Noch keine Einträge vorhanden.</p>
            ) : (
              currentReadings.map(reading => (
                <div key={reading.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-white/5 transition-colors group border border-transparent hover:border-white/5">
                  <div>
                    <div className="font-medium">
                      {format(parseISO(reading.date), 'dd. MMMM yyyy', { locale: de })}
                    </div>
                    <div className="text-sm text-muted">
                      {reading.value.toFixed(2)} {activeTab === 'electricity' ? 'kWh' : 'm³'}
                    </div>
                  </div>
                  <button
                    onClick={() => removeReading(reading.id)}
                    className="p-2 text-muted hover:text-red-400 bg-transparent hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all"
                    title="Löschen"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title="Daten Import / Export" defaultOpen={false}>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10"
              title="Daten als JSON exportieren"
            >
              <Download size={16} /> Exportieren
            </button>
            <label className="flex-1 flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 rounded-lg transition-colors border border-white/10 cursor-pointer">
              <Upload size={16} /> Importieren
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}

export default App;
