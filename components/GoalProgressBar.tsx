'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';
import { calculateGoalProgress, formatCurrency } from '@/lib/calculations';

interface GoalProgressBarProps {
  currentNetProfit: number;
  targetGoal: number;
  hourlyRate?: number;
  onUpdateGoal?: (newGoal: number) => void;
}

export function GoalProgressBar({
  currentNetProfit,
  targetGoal,
  hourlyRate,
  onUpdateGoal,
}: GoalProgressBarProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [customGoal, setCustomGoal] = useState(String(targetGoal || 5000));
  const progress = calculateGoalProgress(currentNetProfit, targetGoal);

  useEffect(() => {
    setCustomGoal(String(targetGoal || 5000));
  }, [targetGoal]);

  const handleSelectPreset = (amount: number) => {
    setCustomGoal(String(amount));
    if (onUpdateGoal) onUpdateGoal(amount);
    setIsEditing(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(customGoal);
    if (val && val > 0 && onUpdateGoal) {
      onUpdateGoal(val);
    }
    setIsEditing(false);
  };

  const hoursLeft =
    !progress.isAchieved && hourlyRate && hourlyRate > 0 && progress.remaining > 0
      ? Math.round((progress.remaining / hourlyRate) * 10) / 10
      : null;

  const presets = [3000, 5000, 7000, 10000];

  return (
    <div className="w-full flex flex-col gap-3 py-1">
      {/* Hero Earnings Header */}
      <div className="flex items-end justify-between">
        <div>
          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 tracking-wider uppercase">
            Чистыми за смену
          </span>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white font-mono">
              {formatCurrency(progress.current)}
            </span>
          </div>
        </div>

        {/* Goal Selector Pill */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] text-xs font-medium text-zinc-800 dark:text-zinc-200 transition active:scale-95 shadow-sm"
          >
            <span className="text-zinc-400 dark:text-zinc-500 text-[11px]">Цель:</span>
            <span className="font-mono font-semibold text-amber-500 dark:text-amber-400">
              {formatCurrency(progress.target)}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${isEditing ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Goal Dropdown Sheet */}
      {isEditing && (
        <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.1] shadow-xl flex flex-col gap-2.5 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
            <span>Выберите цель на смену:</span>
            <button onClick={() => setIsEditing(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {presets.map(p => (
              <button
                key={p}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className={`py-2 px-2 rounded-xl text-xs font-mono font-semibold transition active:scale-95 ${
                  targetGoal === p
                    ? 'bg-amber-400 text-black shadow-sm'
                    : 'bg-black/[0.03] dark:bg-zinc-950 border border-black/[0.06] dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400'
                }`}
              >
                {p / 1000}к ₽
              </button>
            ))}
          </div>

          <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 pt-1 border-t border-black/[0.04] dark:border-zinc-800/60">
            <input
              type="number"
              inputMode="numeric"
              step="500"
              placeholder="Другая сумма..."
              value={customGoal}
              onChange={e => setCustomGoal(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-black/[0.03] dark:bg-zinc-950 border border-black/[0.08] dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-white font-mono text-xs focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 text-black text-xs font-semibold flex items-center gap-1 active:scale-95"
            >
              <Check className="w-3 h-3" />
              <span>ОК</span>
            </button>
          </form>
        </div>
      )}

      {/* Thin Sleek Progress Line */}
      <div className="w-full h-1.5 bg-black/[0.06] dark:bg-zinc-800/80 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            progress.isAchieved ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-amber-500 dark:bg-amber-400'
          }`}
          style={{ width: `${progress.percentage}%` }}
        />
      </div>

      {/* Progress Meta */}
      <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
        <span>
          {progress.isAchieved ? (
            <strong className="text-emerald-500 dark:text-emerald-400 font-medium">100% выполнено</strong>
          ) : (
            <>
              Осталось: <strong className="text-zinc-800 dark:text-zinc-200">{formatCurrency(progress.remaining)}</strong>
            </>
          )}
        </span>

        <span>
          {progress.percentage}% {hoursLeft !== null && `· ~${hoursLeft} ч`}
        </span>
      </div>
    </div>
  );
}
