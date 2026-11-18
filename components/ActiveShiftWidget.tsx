'use client';

import React, { useState, useEffect } from 'react';
import { 
  Play, Square, Plus, Fuel, Utensils, 
  DollarSign, Clock, X 
} from 'lucide-react';
import { Shift, DriverProfile } from '@/lib/types';
import { formatCurrency } from '@/lib/calculations';
import { QuickExpenseModal } from './QuickExpenseModal';

interface ActiveShiftWidgetProps {
  activeShift: Shift | null;
  driver: DriverProfile;
  onStartShift: (startOdometer?: number) => void;
  onCompleteShift: () => void;
  onCancelShift: () => void;
  onOpenManualModal: () => void;
  onAddExpense: (expense: any) => void;
  onAddFuel: (liters: number, cost: number) => void;
  onAddRevenue: (amount: number) => void;
}

export function ActiveShiftWidget({
  activeShift,
  driver,
  onStartShift,
  onCompleteShift,
  onCancelShift,
  onOpenManualModal,
  onAddExpense,
  onAddFuel,
  onAddRevenue,
}: ActiveShiftWidgetProps) {
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [startOdoInput, setStartOdoInput] = useState('');
  const [showOdoPrompt, setShowOdoPrompt] = useState(false);
  const [quickModalType, setQuickModalType] = useState<'expense' | 'fuel' | 'revenue' | null>(null);

  useEffect(() => {
    if (!activeShift) return;

    const updateTimer = () => {
      try {
        const start = new Date(activeShift.created_at).getTime();
        const now = Date.now();
        const diffSec = Math.max(0, Math.floor((now - start) / 1000));

        const hours = Math.floor(diffSec / 3600);
        const minutes = Math.floor((diffSec % 3600) / 60);
        const seconds = diffSec % 60;

        setElapsedTime(
          `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        );
      } catch {
        setElapsedTime('00:00:00');
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeShift]);

  // Смена НЕ активна
  if (!activeShift) {
    return (
      <div className="w-full flex flex-col gap-2.5 pt-1">
        {showOdoPrompt ? (
          <div className="p-4 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex flex-col gap-3">
            <span className="text-xs text-zinc-700 dark:text-zinc-300 font-medium">
              Одометр перед стартом (км):
            </span>
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                autoFocus
                placeholder="145200"
                value={startOdoInput}
                onChange={e => setStartOdoInput(e.target.value)}
                className="flex-1 px-3 py-2 bg-black/[0.03] dark:bg-zinc-950 border border-black/[0.08] dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-mono text-sm focus:outline-none focus:border-amber-400"
              />
              <button
                type="button"
                onClick={() => {
                  onStartShift(parseFloat(startOdoInput) || undefined);
                  setShowOdoPrompt(false);
                }}
                className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs rounded-xl active:scale-95 shadow-sm"
              >
                Поехали
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowOdoPrompt(false)}
              className="text-center text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              Отмена
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={() => setShowOdoPrompt(true)}
              className="w-full min-h-[50px] rounded-2xl bg-amber-400 hover:bg-amber-300 active:scale-[0.98] text-black font-bold text-sm flex items-center justify-center gap-2 transition shadow-sm"
            >
              <Play className="w-4 h-4 fill-black" />
              <span>Начать смену</span>
            </button>

            <button
              onClick={onOpenManualModal}
              className="w-full min-h-[44px] rounded-2xl bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl hover:bg-white/80 dark:hover:bg-zinc-900 active:scale-[0.98] text-zinc-700 dark:text-zinc-300 font-medium text-xs flex items-center justify-center gap-1.5 transition border border-black/[0.06] dark:border-white/[0.08]"
            >
              <Plus className="w-3.5 h-3.5 text-zinc-500" />
              <span>Записать смену вручную</span>
            </button>
          </>
        )}
      </div>
    );
  }

  // Смена АКТИВНА
  return (
    <div className="w-full rounded-2xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm p-4 flex flex-col gap-3.5">
      {/* Active Shift Header: Timer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">На линии</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/[0.04] dark:bg-zinc-950 border border-black/[0.06] dark:border-zinc-800 font-mono text-xs font-semibold text-zinc-900 dark:text-white">
          <Clock className="w-3.5 h-3.5 text-amber-500" />
          <span>{elapsedTime}</span>
        </div>
      </div>

      {/* Grid of 4 core financial metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-zinc-950 border border-black/[0.04] dark:border-zinc-800/70">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Касса</span>
          <span className="font-mono text-base font-bold text-zinc-900 dark:text-white">
            {formatCurrency(activeShift.gross_revenue)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-zinc-950 border border-black/[0.04] dark:border-zinc-800/70">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Аренда</span>
          <span className="font-mono text-base font-bold text-rose-500 dark:text-rose-400">
            -{formatCurrency(activeShift.rent_cost)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-zinc-950 border border-black/[0.04] dark:border-zinc-800/70">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
            Бензин {activeShift.fuel_liters > 0 ? `(${activeShift.fuel_liters} л)` : ''}
          </span>
          <span className="font-mono text-base font-bold text-rose-500 dark:text-rose-400">
            -{formatCurrency(activeShift.fuel_cost)}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-zinc-950 border border-black/[0.04] dark:border-zinc-800/70">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Доп. расходы</span>
          <span className="font-mono text-base font-bold text-rose-500 dark:text-rose-400">
            -{formatCurrency(activeShift.other_expenses_total)}
          </span>
        </div>
      </div>

      {/* 3 Quick Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setQuickModalType('revenue')}
          className="min-h-[44px] py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-1.5 active:scale-95 transition"
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Касса</span>
        </button>

        <button
          onClick={() => setQuickModalType('fuel')}
          className="min-h-[44px] py-2 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/15 border border-amber-500/20 text-xs font-medium text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1.5 active:scale-95 transition"
        >
          <Fuel className="w-3.5 h-3.5" />
          <span>Бензин</span>
        </button>

        <button
          onClick={() => setQuickModalType('expense')}
          className="min-h-[44px] py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/15 border border-rose-500/20 text-xs font-medium text-rose-600 dark:text-rose-400 flex items-center justify-center gap-1.5 active:scale-95 transition"
        >
          <Utensils className="w-3.5 h-3.5" />
          <span>Расход</span>
        </button>
      </div>

      {/* Complete Shift CTA */}
      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={onCancelShift}
          className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl bg-black/[0.04] dark:bg-zinc-950 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 border border-black/[0.06] dark:border-zinc-800 flex items-center justify-center transition"
          title="Сбросить смену"
        >
          <X className="w-4 h-4" />
        </button>

        <button
          onClick={onCompleteShift}
          className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-black font-semibold text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition shadow-sm"
        >
          <Square className="w-3.5 h-3.5 fill-current" />
          <span>Завершить смену</span>
        </button>
      </div>

      <QuickExpenseModal
        isOpen={Boolean(quickModalType)}
        type={quickModalType || 'expense'}
        onClose={() => setQuickModalType(null)}
        onAddExpense={onAddExpense}
        onAddFuel={onAddFuel}
        onAddRevenue={onAddRevenue}
      />
    </div>
  );
}
