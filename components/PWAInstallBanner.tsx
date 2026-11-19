'use client';

import React, { useState, useEffect, useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import { Share, Download, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const emptySubscribe = () => () => {};

function getDismissedSnapshot(): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem('taxipulse_pwa_dismissed') === 'true';
}

function getStandaloneSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((window.navigator as unknown as { standalone?: boolean }).standalone)
  );
}

function getIOSSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

export function PWAInstallBanner() {
  const isDismissed = useSyncExternalStore(emptySubscribe, getDismissedSnapshot, () => true);
  const isStandalone = useSyncExternalStore(emptySubscribe, getStandaloneSnapshot, () => false);
  const isIOS = useSyncExternalStore(emptySubscribe, getIOSSnapshot, () => false);

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [closedLocally, setClosedLocally] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setClosedLocally(true);
      localStorage.setItem('taxipulse_pwa_dismissed', 'true');
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setClosedLocally(true);
    localStorage.setItem('taxipulse_pwa_dismissed', 'true');
  };

  if (isStandalone || isDismissed || closedLocally) return null;
  // If neither prompt is available nor is it iOS, don't show an empty/irrelevant banner
  if (!deferredPrompt && !isIOS) return null;

  return (
    <div className="w-full rounded-2xl liquid-glass-card shadow-md p-3.5 relative flex flex-col gap-2.5">
      <div className="flex items-start gap-3 pr-10">
        <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0 mt-0.5">
          {deferredPrompt ? <Download className="w-4 h-4" /> : <Share className="w-4 h-4" />}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-0.5">
            {deferredPrompt ? 'Установить приложение' : 'Установка на экран «Домой» (Safari)'}
          </h4>
          <p className="text-[12px] text-zinc-600 dark:text-zinc-400 leading-snug">
            {deferredPrompt
              ? 'Установите ТаксиДрайв на домашний экран для быстрой работы без интернета и доступа в один клик.'
              : (
                <>
                  Нажмите <strong className="text-zinc-900 dark:text-zinc-200">«Поделиться»</strong> в Safari и выберите <strong className="text-zinc-900 dark:text-zinc-200">«На экран “Домой”»</strong> для полноэкранного режима.
                </>
              )}
          </p>
        </div>
      </div>

      {deferredPrompt && (
        <div className="pt-1">
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={handleInstallClick}
            className="w-full min-h-[44px] px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-[0.99] text-zinc-950 font-semibold rounded-xl text-sm inline-flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Установить ТаксиДрайв</span>
          </motion.button>
        </div>
      )}

      {/* Dismiss button with guaranteed min 44x44px touch target */}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Закрыть баннер установки"
        className="absolute top-1.5 right-1.5 w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
