'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, Fuel, DollarSign, Utensils, Coffee, Sparkles, 
  AlertOctagon, Plus 
} from 'lucide-react';
import { ExpenseCategory, ExpenseItem } from '@/lib/types';

interface QuickExpenseModalProps {
  isOpen: boolean;
  type: 'expense' | 'fuel' | 'revenue';
  onClose: () => void;
  onAddExpense: (expense: Omit<ExpenseItem, 'id' | 'created_at'>) => void;
  onAddFuel: (liters: number, cost: number) => void;
  onAddRevenue: (amount: number) => void;
}

export function QuickExpenseModal({
  isOpen,
  type,
  onClose,
  onAddExpense,
  onAddFuel,
  onAddRevenue,
}: QuickExpenseModalProps) {
  const [amount, setAmount] = useState('');
  const [liters, setLiters] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) return;

    if (type === 'revenue') {
      onAddRevenue(parsedAmount);
    } else if (type === 'fuel') {
      const parsedLiters = parseFloat(liters) || 0;
      onAddFuel(parsedLiters, parsedAmount);
    } else {
      onAddExpense({
        category,
        amount: parsedAmount,
        comment: comment.trim() || undefined,
      });
    }

    setAmount('');
    setLiters('');
    setComment('');
    onClose();
  };

  const categories: { id: ExpenseCategory; label: string; icon: React.ReactNode }[] = [
    { id: 'food', label: 'Обед / Еда', icon: <Utensils className="w-4 h-4" /> },
    { id: 'coffee', label: 'Кофе / Вода', icon: <Coffee className="w-4 h-4" /> },
    { id: 'wash', label: 'Мойка', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'fine', label: 'Штраф', icon: <AlertOctagon className="w-4 h-4" /> },
    { id: 'other', label: 'Прочее', icon: <Plus className="w-4 h-4" /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-4 safe-bottom safe-top safe-left safe-right">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm rounded-3xl liquid-glass-elevated p-5 flex flex-col text-zinc-900 dark:text-zinc-100 shadow-2xl relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              type === 'revenue' 
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                : type === 'fuel' 
                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
            }`}>
              {type === 'revenue' && <DollarSign className="w-4 h-4" />}
              {type === 'fuel' && <Fuel className="w-4 h-4" />}
              {type === 'expense' && <Utensils className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-semibold text-xs text-zinc-900 dark:text-white">
                {type === 'revenue' && 'Добавить выручку'}
                {type === 'fuel' && 'Заправка топливом'}
                {type === 'expense' && 'Добавить расход'}
              </h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                {type === 'revenue' && 'Увеличит кассу смены'}
                {type === 'fuel' && 'Рассчитает расход л/100 км'}
                {type === 'expense' && 'Вычитается из чистой прибыли'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть окно"
            className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-white cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          {type === 'expense' && (
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1.5">
                Категория
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {categories.map(c => (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`min-h-[44px] flex items-center gap-2 p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                      category === c.id
                        ? 'bg-amber-400/15 border-amber-400 text-amber-500 dark:text-amber-300 font-semibold shadow-sm'
                        : 'liquid-glass-card text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    {c.icon}
                    <span>{c.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {type === 'fuel' && (
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Объем бензина (литры)
              </label>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                autoFocus
                placeholder="25.0"
                value={liters}
                onChange={e => setLiters(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 liquid-glass-input text-zinc-900 dark:text-white font-mono text-[16px] md:text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
              {type === 'revenue' ? 'Сумма заказа / чаевых (₽)' : 'Сумма (₽)'}
            </label>
            <input
              type="number"
              inputMode="numeric"
              autoFocus={type !== 'fuel'}
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 liquid-glass-input text-zinc-900 dark:text-white font-mono font-bold text-[16px] md:text-base focus:outline-none focus:border-amber-400"
            />
          </div>

          {type === 'expense' && (
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                Заметка (необязательно)
              </label>
              <input
                type="text"
                placeholder="Например: кофе на АЗС"
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2 liquid-glass-input text-zinc-900 dark:text-white text-[16px] md:text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={!amount || parseFloat(amount) <= 0}
            className={`w-full min-h-[44px] mt-1 py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center transition disabled:opacity-40 cursor-pointer ${
              type === 'revenue'
                ? 'bg-emerald-400 hover:bg-emerald-300 text-black shadow-sm'
                : 'bg-amber-400 hover:bg-amber-300 text-black shadow-sm'
            }`}
          >
            Записать
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
