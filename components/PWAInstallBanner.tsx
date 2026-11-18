'use client';

import React, { useState, useEffect } from 'react';
import { Share, X } from 'lucide-react';

export function PWAInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    const dismissed = localStorage.getItem('taxipulse_pwa_dismissed');

    if (!isStandalone && !dismissed) {
      setShow(true);
    }
  }, []);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('taxipulse_pwa_dismissed', 'true');
  };

  if (!show) return null;

  return (
    <div className="w-full rounded-xl bg-zinc-900 border border-zinc-800 p-3 relative flex items-start gap-2.5">
      <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
        <Share className="w-3.5 h-3.5" />
      </div>

      <div className="flex-1 pr-6">
        <h4 className="text-xs font-semibold text-white mb-0.5">
          Установка на экран «Домой» (Safari)
        </h4>
        <p className="text-[11px] text-zinc-400 leading-snug">
          Нажмите <strong className="text-zinc-200">«Поделиться»</strong> в Safari и выберите <strong className="text-zinc-200">«На экран “Домой”»</strong> для полноэкранного режима без панелей браузера.
        </p>
      </div>

      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded text-zinc-500 hover:text-zinc-300"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
