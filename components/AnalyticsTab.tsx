'use client';

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shift, DriverProfile } from '@/lib/types';
import { calculateStatsSummary, calculateDayOfWeekStats, generateSmartInsights } from '@/lib/analytics';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { SmartInsightsCard } from './SmartInsightsCard';

interface AnalyticsTabProps {
  shifts: Shift[];
  driver?: DriverProfile;
}

type Period = 'all' | 'month' | 'week';

export function AnalyticsTab({ shifts, driver }: AnalyticsTabProps) {
  const [period, setPeriod] = useState<Period>('all');

  const filteredShifts = useMemo(() => {
    if (period === 'all') return shifts;

    const now = new Date();
    const threshold = new Date();

    if (period === 'month') {
      threshold.setDate(now.getDate() - 30);
    } else if (period === 'week') {
      threshold.setDate(now.getDate() - 7);
    }

    return shifts.filter(s => {
      const d = new Date(s.date + 'T12:00:00');
      return d >= threshold;
    });
  }, [shifts, period]);

  const stats = useMemo(() => calculateStatsSummary(filteredShifts), [filteredShifts]);
  const dayStats = useMemo(() => calculateDayOfWeekStats(filteredShifts), [filteredShifts]);
  const insights = useMemo(() => generateSmartInsights(filteredShifts, driver?.default_goal || 5000), [filteredShifts, driver?.default_goal]);

  const maxDayNet = useMemo(() => {
    return Math.max(1, ...dayStats.map(d => d.avgNet));
  }, [dayStats]);

  const totalExp = Math.max(1, stats.total_expenses);
  const rentPct = Math.round((stats.expense_breakdown.rent / totalExp) * 100);
  const fuelPct = Math.round((stats.expense_breakdown.fuel / totalExp) * 100);
  const otherPct = Math.max(0, 100 - rentPct - fuelPct);

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Segmented Filter with 44px min touch target */}
      <div className="grid grid-cols-3 gap-1.5 liquid-glass-card p-1.5 rounded-2xl">
        {(['all', 'month', 'week'] as Period[]).map(p => (
          <motion.button
            whileTap={{ scale: 0.97 }}
            key={p}
            type="button"
            onClick={() => setPeriod(p)}
            className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-medium flex items-center justify-center transition cursor-pointer ${
              period === p
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            {p === 'all' && 'Всё время'}
            {p === 'month' && '30 дней'}
            {p === 'week' && '7 дней'}
          </motion.button>
        ))}
      </div>

      {/* Hero Metric Card (Liquid Glass) */}
      <div className="p-4 rounded-3xl liquid-glass-card shadow-sm flex flex-col gap-3">
        <div>
          <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block">
            Чистая прибыль
          </span>
          <span className="font-mono text-3xl font-bold text-emerald-500 dark:text-emerald-400 tracking-tight block mt-0.5">
            {formatCurrency(stats.total_net_profit)}
          </span>
          <span className="font-mono text-xs text-zinc-500 mt-1 block">
            Касса {formatCurrency(stats.total_gross_revenue)} · Расходы {formatCurrency(stats.total_expenses)}
          </span>
        </div>

        {/* 4 Quick Stat Cells */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-black/[0.04] dark:border-white/[0.06] font-mono">
          <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06]">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans block">В час</span>
            <span className="text-sm font-bold text-zinc-900 dark:text-white">
              {formatCurrency(stats.avg_hourly_rate)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06]">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans block">За смену</span>
            <span className="text-sm font-bold text-zinc-900 dark:text-white">
              {formatCurrency(stats.avg_net_per_shift)}
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06]">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans block">Расход бензина</span>
            <span className="text-sm font-bold text-amber-500 dark:text-amber-400">
              {stats.avg_fuel_consumption} л/100км
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.04] dark:border-white/[0.06]">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-sans block">Себестоимость</span>
            <span className="text-sm font-bold text-rose-500 dark:text-rose-400">
              {formatNumber(stats.avg_cost_per_km, 1)} ₽/км
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1">
          <span>Смен: {stats.total_shifts}</span>
          <span>Часов: {stats.total_hours} ч</span>
          <span>Пробег: {formatNumber(stats.total_mileage_km)} км</span>
        </div>
      </div>

      {/* Clean Expenses Segmented Bar (Liquid Glass) */}
      <div className="p-4 rounded-3xl liquid-glass-card shadow-sm flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">Структура расходов</span>
          <span className="font-mono text-xs text-rose-500 font-semibold">
            {formatCurrency(stats.total_expenses)}
          </span>
        </div>

        <div className="w-full h-2 bg-black/[0.06] dark:bg-white/[0.08] rounded-full overflow-hidden flex">
          <div style={{ width: `${rentPct}%` }} className="bg-amber-400 h-full" />
          <div style={{ width: `${fuelPct}%` }} className="bg-rose-500 h-full" />
          <div style={{ width: `${otherPct}%` }} className="bg-zinc-400 dark:bg-zinc-600 h-full" />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400 pt-1">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Аренда {rentPct}%</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span>Бензин {fuelPct}%</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-zinc-400 dark:bg-zinc-600" />
            <span>Доп {otherPct}%</span>
          </span>
        </div>
      </div>

      {/* Minimalist Day of Week Vertical Bar Chart (Liquid Glass) */}
      <div className="p-4 rounded-3xl liquid-glass-card shadow-sm flex flex-col gap-3">
        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
          Прибыль по дням недели
        </span>

        <div className="grid grid-cols-7 gap-1.5 items-end h-28 pt-2">
          {dayStats.map(d => {
            const heightPct = maxDayNet > 0 && d.avgNet > 0
              ? Math.max(10, Math.round((d.avgNet / maxDayNet) * 100))
              : 6;

            const isBest = d.avgNet === maxDayNet && d.shiftsCount > 0;

            return (
              <div key={d.dayIndex} className="flex flex-col items-center gap-1.5 h-full justify-end">
                <div className="w-full flex-1 flex items-end justify-center">
                  <div
                    className={`w-full max-w-[28px] rounded-lg transition-all duration-300 ${
                      d.shiftsCount === 0
                        ? 'bg-black/[0.04] dark:bg-white/[0.04]'
                        : isBest
                        ? 'bg-amber-400 shadow-sm'
                        : 'bg-black/[0.08] dark:bg-white/[0.1] hover:bg-zinc-700'
                    }`}
                    style={{ height: `${heightPct}%` }}
                    title={`${d.dayName}: ${formatCurrency(d.avgNet)}`}
                  />
                </div>
                <span className={`text-[10px] font-mono ${isBest ? 'text-amber-500 dark:text-amber-400 font-bold' : 'text-zinc-400'}`}>
                  {d.dayName.slice(0, 2)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Smart Insights Card */}
      {insights && insights.length > 0 && (
        <SmartInsightsCard insights={insights} />
      )}
    </div>
  );
}
