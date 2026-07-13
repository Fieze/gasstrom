import { AlertTriangle, FileCheck2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ImportAnalysis } from '../utils/readingValidation';

interface ImportPreviewDialogProps {
    analysis: ImportAnalysis;
    onConfirm: () => Promise<void>;
    onClose: () => void;
    isImporting: boolean;
}
export function ImportPreviewDialog({ analysis, onConfirm, onClose, isImporting }: ImportPreviewDialogProps) {
    const { t } = useTranslation();
    const canImport = analysis.issues.length === 0 && analysis.readings.length > 0;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
            <div className="card w-full max-w-xl space-y-5">
                <div className="flex justify-between items-center"><h2 className="text-xl font-bold">{t('importPreview.title')}</h2><button onClick={onClose} className="p-2"><X size={20} /></button></div>
                <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 rounded bg-green-500/10"><div className="text-xl font-bold">{analysis.readings.length}</div><div className="text-xs text-muted">{t('importPreview.valid')}</div></div>
                    <div className="p-3 rounded bg-yellow-500/10"><div className="text-xl font-bold">{analysis.conflicts.length}</div><div className="text-xs text-muted">{t('importPreview.conflicts')}</div></div>
                    <div className="p-3 rounded bg-red-500/10"><div className="text-xl font-bold">{analysis.issues.length}</div><div className="text-xs text-muted">{t('importPreview.errors')}</div></div>
                </div>
                {analysis.conflicts.length > 0 && <p className="text-sm text-yellow-300 flex gap-2"><AlertTriangle size={18} />{t('importPreview.conflictHint')}</p>}
                {analysis.issues.length > 0 && <div className="max-h-48 overflow-auto rounded border border-red-500/30 p-3 text-sm text-red-300">{analysis.issues.slice(0, 100).map((issue, index) => <div key={`${issue.row}-${index}`}>{t('importPreview.row', { row: issue.row })}: {issue.message}</div>)}</div>}
                <div className="flex gap-3 justify-end"><button onClick={onClose} className="px-4 py-2 bg-white/5 rounded">{t('common.close')}</button><button onClick={onConfirm} disabled={!canImport || isImporting} className="px-4 py-2 bg-primary disabled:opacity-50 rounded flex items-center gap-2"><FileCheck2 size={18} />{isImporting ? t('common.loading') : t('importPreview.confirm')}</button></div>
            </div>
        </div>
    );
}
