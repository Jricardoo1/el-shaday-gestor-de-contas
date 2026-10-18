import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle2, Share2, PlusSquare } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed in standalone mode, hide
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {isInstallable && (
        <button
          onClick={install}
          title="Instalar no celular / computador"
          className={`flex items-center gap-1.5 font-medium transition rounded-lg shadow-sm ${
            compact
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-xs'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-sm'
          }`}
        >
          <Download className="w-4 h-4 animate-bounce" />
          <span>Instalar App</span>
        </button>
      )}

      {isIOS && (
        <button
          onClick={() => setShowIOSGuide(true)}
          title="Instalar no iPhone / iPad"
          className={`flex items-center gap-1.5 font-medium transition rounded-lg border border-slate-300 dark:border-slate-600 bg-white/90 hover:bg-white text-slate-800 ${
            compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
          <span>Instalar no iPhone</span>
        </button>
      )}

      {/* iOS Safari step-by-step installation guide */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl relative border border-slate-100">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xl">
                CF
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Instalar no iPhone</h3>
                <p className="text-xs text-slate-500">Funciona offline direto da tela inicial</p>
              </div>
            </div>

            <div className="space-y-3 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-200/80 mb-5">
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div className="flex-1">
                  Toque no botão <strong className="inline-flex items-center gap-1 text-emerald-800"><Share2 className="w-3.5 h-3.5 inline" /> Compartilhar</strong> na barra do Safari.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div className="flex-1">
                  Role a lista e toque em <strong className="inline-flex items-center gap-1 text-emerald-800"><PlusSquare className="w-3.5 h-3.5 inline" /> Adicionar à Tela de Início</strong>.
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  3
                </div>
                <div className="flex-1">
                  Toque em <strong>Adicionar</strong> no canto superior direito. Pronto!
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-200 mb-4">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>O app funciona sem precisar de internet após instalado!</span>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition"
            >
              Entendi, fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
