'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [prevTargetGoal, setPrevTargetGoal] = useState(targetGoal);
  if (targetGoal !== prevTargetGoal) {
    setPrevTargetGoal(targetGoal);
    setCustomGoal(String(targetGoal || 5000));
  }
  const progress = calculateGoalProgress(currentNetProfit, targetGoal);

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
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            aria-label="Изменить цель смены"
            className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-full liquid-glass-pill text-xs font-medium text-zinc-800 dark:text-zinc-200 transition shadow-sm cursor-pointer"
          >
            <span className="text-zinc-400 dark:text-zinc-500 text-[11px]">Цель:</span>
            <span className="font-mono font-semibold text-amber-500 dark:text-amber-400">
              {formatCurrency(progress.target)}
            </span>
            <ChevronDown className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${isEditing ? 'rotate-180' : ''}`} />
          </motion.button>
        </div>
      </div>

      {/* Goal Dropdown Sheet */}
      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="p-4 rounded-3xl liquid-glass-elevated shadow-xl flex flex-col gap-2.5"
          >
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-medium">Выберите цель на смену:</span>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                aria-label="Закрыть выбор цели"
                className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {presets.map(p => (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  key={p}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`min-h-[44px] py-2 px-2 rounded-xl text-xs font-mono font-semibold flex items-center justify-center transition cursor-pointer ${
                    targetGoal === p
                      ? 'bg-amber-400 text-black shadow-sm font-bold'
                      : 'liquid-glass-card text-zinc-700 dark:text-zinc-300 hover:border-amber-400/50'
                  }`}
                >
                  {p / 1000}к ₽
                </motion.button>
              ))}
            </div>

            <form onSubmit={handleCustomSubmit} className="flex items-center gap-2 pt-1 border-t border-black/[0.04] dark:border-white/[0.06]">
              <input
                type="number"
                inputMode="numeric"
                step="500"
                placeholder="Другая сумма..."
                value={customGoal}
                onChange={e => setCustomGoal(e.target.value)}
                className="flex-1 min-h-[44px] px-3.5 py-2 liquid-glass-input text-zinc-900 dark:text-white font-mono text-[16px] md:text-xs focus:outline-none focus:border-amber-400"
              />
              <motion.button
                whileTap={{ scale: 0.97 }}
                type="submit"
                className="min-h-[44px] min-w-[56px] px-4 py-2 rounded-xl bg-amber-400 text-black text-xs font-semibold flex items-center justify-center gap-1 shadow-sm transition cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>ОК</span>
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thin Sleek Progress Line */}
      <div className="w-full h-2 bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden">
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
