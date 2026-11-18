'use client';

import React from 'react';
import { Car, BarChart2, Clock, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export type TabType = 'shift' | 'analytics' | 'history' | 'profile';

interface BottomNavProps {
  currentTab: TabType;
  onChangeTab: (tab: TabType) => void;
  hasActiveShift: boolean;
}

export function BottomNav({ currentTab, onChangeTab, hasActiveShift }: BottomNavProps) {
  const tabs = [
    {
      id: 'shift' as TabType,
      label: 'Смена',
      icon: Car,
      badge: hasActiveShift,
    },
    {
      id: 'analytics' as TabType,
      label: 'Аналитика',
      icon: BarChart2,
    },
    {
      id: 'history' as TabType,
      label: 'История',
      icon: Clock,
    },
    {
      id: 'profile' as TabType,
      label: 'Профиль',
      icon: Settings,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-black/70 backdrop-blur-2xl border-t border-black/[0.06] dark:border-white/[0.08] safe-bottom transition-colors duration-300">
      <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-around">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onChangeTab(tab.id)}
              className={`relative min-h-[44px] min-w-[56px] flex flex-col items-center justify-center rounded-xl transition-colors duration-200 active:scale-95 ${
                isActive
                  ? 'text-amber-500 dark:text-amber-400 font-semibold'
                  : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-4 h-4" />
                {tab.badge && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </div>
              <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 w-3 h-0.5 rounded-full bg-amber-500 dark:bg-amber-400"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
