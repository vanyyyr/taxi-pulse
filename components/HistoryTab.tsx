'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Plus, Search, Trash2, Edit3, AlertTriangle, X } from 'lucide-react';
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
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return shifts;
    const q = search.toLowerCase();
    return shifts.filter(
      s => s.date.includes(q) || (s.notes && s.notes.toLowerCase().includes(q))
    );
  }, [shifts, search]);

  const handleExportCSV = () => {
    if (shifts.length === 0) return;

    const headers = [
      'Дата',
      'Часы',
      'Пробег (км)',
      'Касса (руб)',
      'Бензин (л)',
      'Бензин (руб)',
      'Аренда (руб)',
      'Доп. расходы (руб)',
      'Чистая прибыль (руб)',
      'Ставка (руб/ч)',
      'Расход (л/100км)',
      'Заметки',
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
    URL.revokeObjectURL(url);
  };

  const handleConfirmDelete = () => {
    if (shiftToDelete) {
      onDeleteShift(shiftToDelete.id);
      setShiftToDelete(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 pb-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-zinc-900 dark:text-white">История ({shifts.length})</span>

        <div className="flex items-center gap-2">
          {shifts.length > 0 && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={handleExportCSV}
              aria-label="Экспортировать историю в CSV"
              className="min-h-[44px] min-w-[56px] px-3.5 py-2 rounded-xl liquid-glass-card hover:bg-white/80 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-mono flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-zinc-500" />
              <span>CSV</span>
            </motion.button>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="button"
            onClick={onAddNewShift}
            aria-label="Добавить новую смену"
            className="min-h-[44px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Смена</span>
          </motion.button>
        </div>
      </div>

      {/* Search Input */}
      {shifts.length > 4 && (
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Поиск по дате..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full min-h-[44px] pl-10 pr-3 py-2 liquid-glass-input text-[16px] md:text-xs text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:border-amber-400 font-mono shadow-sm"
          />
        </div>
      )}

      {/* Transactions List */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center text-xs text-zinc-400 liquid-glass-card">
          Смен пока нет
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(shift => {
            const isExpanded = expandedShiftId === shift.id;

            return (
              <div
                key={shift.id}
                className="rounded-2xl liquid-glass-card shadow-sm p-3.5 transition"
              >
                <div
                  onClick={() => setExpandedShiftId(isExpanded ? null : shift.id)}
                  className="flex items-center justify-between cursor-pointer min-h-[44px]"
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
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={() => onEditShift(shift)}
                        className="min-h-[44px] py-2 px-3.5 rounded-xl liquid-glass-pill text-zinc-700 dark:text-zinc-300 text-xs hover:text-black dark:hover:text-white flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Изменить</span>
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        type="button"
                        onClick={() => setShiftToDelete(shift)}
                        className="min-h-[44px] py-2 px-3.5 rounded-xl bg-rose-500/10 text-rose-500 text-xs hover:bg-rose-500/20 flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Удалить</span>
                      </motion.button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* In-app Liquid Glass Confirmation Modal for Shift Deletion */}
      <AnimatePresence>
        {shiftToDelete && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 safe-bottom safe-top">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-sm rounded-3xl liquid-glass-elevated p-5 flex flex-col text-zinc-900 dark:text-zinc-100 shadow-2xl relative"
            >
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-2 text-rose-500">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="font-semibold text-sm">Удаление смены</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShiftToDelete(null)}
                  aria-label="Закрыть"
                  className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="py-4 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Вы действительно хотите удалить смену от <strong className="text-zinc-900 dark:text-zinc-100">{shiftToDelete.date}</strong> (прибыль: <span className="text-emerald-500 font-mono font-semibold">+{formatCurrency(shiftToDelete.net_profit)}</span>)? Это действие необратимо.
              </div>

              <div className="flex items-center gap-2 pt-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={() => setShiftToDelete(null)}
                  className="flex-1 min-h-[44px] rounded-xl liquid-glass-pill text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition cursor-pointer"
                >
                  Отмена
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  type="button"
                  onClick={handleConfirmDelete}
                  className="flex-1 min-h-[44px] rounded-xl bg-rose-500 hover:bg-rose-600 active:scale-[0.98] text-white text-xs font-semibold shadow-sm transition cursor-pointer flex items-center justify-center"
                >
                  Удалить
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
