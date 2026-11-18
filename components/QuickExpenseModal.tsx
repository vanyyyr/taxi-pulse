'use client';

import React, { useState } from 'react';
import { X, Fuel, Coffee, Utensils, Sparkles, AlertOctagon, Plus, DollarSign } from 'lucide-react';
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
    const numAmount = parseFloat(amount) || 0;

    if (type === 'revenue') {
      if (numAmount <= 0) return;
      onAddRevenue(numAmount);
    } else if (type === 'fuel') {
      const numLiters = parseFloat(liters) || 0;
      if (numAmount <= 0) return;
      onAddFuel(numLiters, numAmount);
    } else {
      if (numAmount <= 0) return;
      onAddExpense({
        category,
        amount: numAmount,
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4 safe-bottom">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 border border-zinc-800 p-5 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              type === 'revenue' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                : type === 'fuel' 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
              {type === 'revenue' && <DollarSign className="w-4 h-4" />}
              {type === 'fuel' && <Fuel className="w-4 h-4" />}
              {type === 'expense' && <Utensils className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-semibold text-xs text-white">
                {type === 'revenue' && 'Добавить выручку'}
                {type === 'fuel' && 'Заправка топливом'}
                {type === 'expense' && 'Добавить расход'}
              </h3>
              <p className="text-[10px] text-zinc-400">
                {type === 'revenue' && 'Увеличит кассу смены'}
                {type === 'fuel' && 'Рассчитает расход л/100 км'}
                {type === 'expense' && 'Вычитается из чистой прибыли'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          {type === 'expense' && (
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                Категория
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {categories.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className={`min-h-[40px] flex items-center gap-2 p-2 rounded-lg border text-xs transition ${
                      category === c.id
                        ? 'bg-amber-400/10 border-amber-400 text-amber-300 font-semibold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {c.icon}
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === 'fuel' && (
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
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
                className="w-full min-h-[42px] px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] font-medium text-zinc-400 mb-1">
              {type === 'revenue' ? 'Сумма заказа / чаевых (₽)' : 'Сумма (₽)'}
            </label>
            <input
              type="number"
              inputMode="numeric"
              autoFocus={type !== 'fuel'}
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-white font-mono font-bold text-base focus:outline-none focus:border-amber-400"
            />
          </div>

          {type === 'expense' && (
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                Заметка (необязательно)
              </label>
              <input
                type="text"
                placeholder="Например: кофе на АЗС"
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="w-full min-h-[40px] px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-white text-xs focus:outline-none focus:border-amber-400"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={!amount || parseFloat(amount) <= 0}
            className={`w-full min-h-[44px] mt-1 py-2.5 rounded-lg font-semibold text-xs flex items-center justify-center transition active:scale-[0.98] disabled:opacity-40 ${
              type === 'revenue'
                ? 'bg-emerald-400 hover:bg-emerald-300 text-black'
                : 'bg-amber-400 hover:bg-amber-300 text-black'
            }`}
          >
            Записать
          </button>
        </form>
      </div>
    </div>
  );
}
