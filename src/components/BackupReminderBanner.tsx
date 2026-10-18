import React, { useState } from 'react';
import { Shield, Download, X, Clock, CheckCircle2 } from 'lucide-react';
import { StoreSettings } from '../types';
import { StorageService } from '../services/storage';

interface BackupReminderBannerProps {
  settings: StoreSettings;
  onOpenSettings: () => void;
  onUpdateSettings: (updated: StoreSettings) => void;
}

export const BackupReminderBanner: React.FC<BackupReminderBannerProps> = ({
  settings,
  onOpenSettings,
  onUpdateSettings,
}) => {
  const reminderInfo = StorageService.checkBackupReminder(settings);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [dismissedLocally, setDismissedLocally] = useState(false);

  if (!reminderInfo.isDue || dismissedLocally) {
    return null;
  }

  const handleDownloadNow = () => {
    try {
      const res = StorageService.downloadBackupJSONFile();
      setDownloadSuccess(true);
      const updated = StorageService.getStoreSettings();
      onUpdateSettings(updated);
      setTimeout(() => {
        setDismissedLocally(true);
      }, 3500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleDismissToday = () => {
    const updated = StorageService.dismissBackupReminderToday();
    onUpdateSettings(updated);
    setDismissedLocally(true);
  };

  const getFrequencyLabel = () => {
    if (reminderInfo.frequency === 'daily') return 'diário';
    if (reminderInfo.frequency === 'monthly') return 'mensal';
    return 'semanal';
  };

  return (
    <div className="bg-gradient-to-r from-emerald-800 to-teal-900 text-white px-4 py-3 shadow-md border-b border-emerald-700/80 animate-in fade-in slide-in-from-top-2">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
            <Shield className="w-4 h-4 text-emerald-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white">Lembrete de Backup Manual (JSON)</span>
              <span className="text-[10px] bg-emerald-500/30 text-emerald-200 border border-emerald-400/40 px-2 py-0.2 rounded-full font-semibold uppercase">
                {getFrequencyLabel()}
              </span>
            </div>
            <p className="text-emerald-100 text-[11px] mt-0.5">
              {reminderInfo.daysSinceLast >= 999
                ? 'Você ainda não salvou uma cópia de segurança dos seus clientes e compras de marmitas.'
                : `Se passaram ${reminderInfo.daysSinceLast} dias desde a sua última exportação de dados.`}{' '}
              Baixe um arquivo JSON no seu aparelho para proteger suas contas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {downloadSuccess ? (
            <div className="flex items-center gap-1.5 bg-emerald-500 text-slate-950 font-black px-3 py-1.5 rounded-xl text-xs animate-in zoom-in-95">
              <CheckCircle2 className="w-4 h-4" />
              <span>Arquivo JSON salvo no aparelho!</span>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleDownloadNow}
                className="py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs shadow-xs transition flex items-center gap-1.5 shrink-0"
              >
                <Download className="w-3.5 h-3.5 stroke-[3]" />
                <span>Salvar Backup JSON Agora</span>
              </button>

              <button
                type="button"
                onClick={handleDismissToday}
                title="Lembrar amanhã"
                className="py-1.5 px-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-100 text-xs font-semibold transition shrink-0"
              >
                Lembrar Amanhã
              </button>

              <button
                type="button"
                onClick={onOpenSettings}
                title="Configurar frequência do lembrete"
                className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-white/10 transition"
              >
                <Clock className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
