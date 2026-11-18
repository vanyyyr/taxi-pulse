'use client';

import React, { useState } from 'react';
import { 
  Download, Edit3, Trash2, Search, Plus 
} from 'lucide-react';
import { Shift, DriverProfile } from '@/lib/types';
import { formatCurrency, getExpenseCategoryLabel } from '@/lib/calculations';

interface HistoryTabProps {
  shifts: Shift[];
  driver: DriverProfile;
  onEditShift: (shift: Shift) => void;
  onDeleteShift: (shiftId: string) => void;
  onAddNewShift: () => void;
}

export function HistoryTab({
  shifts,
  driver,
  onEditShift,
  onDeleteShift,
  onAddNewShift,
}: HistoryTabProps) {
  const [search, setSearch] = useState('');
  const [expandedShiftId, setExpandedShiftId] = useState<string | null>(null);

  const filtered = shifts.filter(s => {
    if (!search) return true;
    return (
      s.date.includes(search) ||
      (s.notes && s.notes.toLowerCase().includes(search.toLowerCase()))
    );
  });

  const handleExportCSV = () => {
    if (shifts.length === 0) return;

    const headers = [
      'Дата', 'Часы', 'Пробег (км)', 'Касса (руб)', 'Бензин (л)', 
      'Бензин (руб)', 'Аренда (руб)', 'Доп. расходы (руб)', 
      'Чистая прибыль (руб)', 'Ставка (руб/ч)', 'Расход (л/100км)', 'Заметки'
    ];

    const rows = shifts.map(s => [
      s.date,
      s.duration_hours,
      s.mileage_km,
      s.gross_revenue,
      s.fuel_liters,
      s.fuel_cost,
      s.rent_cost,
      s.other_expenses_total,
      s.net_profit,
      s.hourly_rate,
      s.fuel_consumption_per_100km,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [
      headers.join(';'),
      ...rows.map(r => r.join(';')),
    ].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `taxi_shifts_${driver.phone}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col gap-3 pb-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-900 dark:text-white">История ({shifts.length})</span>

        <div className="flex items-center gap-1.5">
          {shifts.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="px-2.5 py-1.5 rounded-xl bg-white/70 dark:bg-zinc-900/70 hover:bg-white dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-mono flex items-center gap-1 border border-black/[0.06] dark:border-white/[0.08] active:scale-95 transition shadow-sm"
            >
              <Download className="w-3.5 h-3.5 text-zinc-500" />
              <span>CSV</span>
            </button>
          )}

          <button
            onClick={onAddNewShift}
            className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-semibold flex items-center gap-1 active:scale-95 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Смена</span>
          </button>
        </div>
      </div>

      {/* Search Input */}
      {shifts.length > 4 && (
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Поиск по дате..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] rounded-xl text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-amber-400 font-mono shadow-sm"
          />
        </div>
      )}

      {/* Transactions List */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center text-xs text-zinc-400">
          Смен пока нет
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(shift => {
            const isExpanded = expandedShiftId === shift.id;

            return (
              <div
                key={shift.id}
                className="rounded-2xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm p-3.5 transition"
              >
                <div
                  onClick={() => setExpandedShiftId(isExpanded ? null : shift.id)}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white block capitalize">
                      {new Date(shift.date + 'T12:00:00').toLocaleDateString('ru-RU', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                      {shift.duration_hours} ч · {shift.mileage_km} км · {shift.fuel_liters} л
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-sm font-bold text-emerald-500 dark:text-emerald-400 block">
                      +{formatCurrency(shift.net_profit)}
                    </span>
                    <span className="font-mono text-[10px] text-zinc-400">
                      {formatCurrency(shift.hourly_rate)}/ч
                    </span>
                  </div>
                </div>

                {isExpanded && (
                  <div className="pt-3 mt-3 border-t border-black/[0.04] dark:border-zinc-800 flex flex-col gap-2 font-mono text-[11px]">
                    <div className="grid grid-cols-2 gap-2 text-zinc-500 dark:text-zinc-400">
                      <div>Касса: <strong className="text-zinc-900 dark:text-white">{formatCurrency(shift.gross_revenue)}</strong></div>
                      <div>Аренда: <strong className="text-rose-500">-{formatCurrency(shift.rent_cost)}</strong></div>
                      <div>Бензин: <strong className="text-rose-500">-{formatCurrency(shift.fuel_cost)}</strong></div>
                      <div>Доп: <strong className="text-rose-500">-{formatCurrency(shift.other_expenses_total)}</strong></div>
                    </div>

                    {shift.expenses && shift.expenses.length > 0 && (
                      <div className="pt-1 text-[10px] text-zinc-500 dark:text-zinc-400 flex flex-col gap-0.5">
                        {shift.expenses.map(e => (
                          <div key={e.id} className="flex justify-between">
                            <span>{getExpenseCategoryLabel(e.category)}</span>
                            <span className="text-rose-500">-{formatCurrency(e.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1 font-sans">
                      <button
                        onClick={() => onEditShift(shift)}
                        className="py-1 px-2.5 rounded-lg bg-black/[0.04] dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs hover:text-black dark:hover:text-white flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Изменить</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Удалить смену?')) onDeleteShift(shift.id);
                        }}
                        className="py-1 px-2.5 rounded-lg bg-rose-500/10 text-rose-500 text-xs hover:bg-rose-500/20 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Удалить</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
