'use client';

import React from 'react';
import { User, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { DriverProfile, Shift } from '@/lib/types';

interface HeaderProps {
  driver: DriverProfile | null;
  activeShift: Shift | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
}

export function Header({
  driver,
  activeShift,
  theme,
  onToggleTheme,
  onOpenProfile,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 liquid-glass-elevated rounded-none border-x-0 border-t-0 border-b border-black/[0.06] dark:border-white/[0.08] safe-top safe-left safe-right transition-colors duration-300">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
        {/* Brand with live status dot */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm tracking-tight text-zinc-900 dark:text-white">
            ТаксиДрайв
          </span>
          {activeShift && (
            <span className="flex h-2 w-2 relative" title="Смена активна">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
        </div>

        {/* Right actions: Theme toggle + Profile */}
        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить темную тему'}
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center liquid-glass-pill hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
            title={theme === 'dark' ? 'Включить светлую тему' : 'Включить темную тему'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-700" />
            )}
          </motion.button>

          {driver && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={onOpenProfile}
              title={driver.car_model}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-full liquid-glass-pill hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-xs text-zinc-700 dark:text-zinc-300 transition cursor-pointer"
            >
              <span className="text-[11px] font-mono">{driver.car_model.split(' ')[0]}</span>
              <User className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </div>
      </div>
    </header>
  );
}
