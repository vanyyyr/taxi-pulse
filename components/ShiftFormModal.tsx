'use client';

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Sliders, Check } from 'lucide-react';
import { Shift, ExpenseItem, ExpenseCategory, DriverProfile } from '@/lib/types';
import { 
  calculateShiftMetrics, 
  formatCurrency, 
  getExpenseCategoryLabel 
} from '@/lib/calculations';

interface ShiftFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shift: Shift) => void;
  driver: DriverProfile;
  initialShift?: Shift | null;
  isActiveShiftEnding?: boolean;
}

export function ShiftFormModal({
  isOpen,
  onClose,
  onSave,
  driver,
  initialShift,
  isActiveShiftEnding = false,
}: ShiftFormModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const [date, setDate] = useState(today);
  const [durationHours, setDurationHours] = useState('11');
  const [mileageKm, setMileageKm] = useState('220');
  const [grossRevenue, setGrossRevenue] = useState('8500');
  const [fuelLiters, setFuelLiters] = useState('28');
  const [fuelCost, setFuelCost] = useState('1540');
  const [fuelConsumption, setFuelConsumption] = useState('12.7'); // л / 100 км
  const [rentCost, setRentCost] = useState(String(driver.default_rent || 2200));

  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    { id: '1', category: 'food', amount: 450, comment: 'Обед', created_at: '' },
    { id: '2', category: 'coffee', amount: 160, comment: 'Кофе', created_at: '' },
  ]);

  const [newCat, setNewCat] = useState<ExpenseCategory>('food');
  const [newAmount, setNewAmount] = useState('');
  const [newComment, setNewComment] = useState('');

  // Инициализация при открытии
  useEffect(() => {
    if (initialShift) {
      setDate(initialShift.date || today);
      setDurationHours(initialShift.duration_hours ? String(initialShift.duration_hours) : '10');
      setMileageKm(initialShift.mileage_km ? String(initialShift.mileage_km) : '200');
      setGrossRevenue(initialShift.gross_revenue ? String(initialShift.gross_revenue) : '0');
      setFuelLiters(initialShift.fuel_liters ? String(initialShift.fuel_liters) : '0');
      setFuelCost(initialShift.fuel_cost ? String(initialShift.fuel_cost) : '0');
      setFuelConsumption(
        initialShift.fuel_consumption_per_100km
          ? String(initialShift.fuel_consumption_per_100km)
          : initialShift.mileage_km && initialShift.fuel_liters
          ? String(Math.round((initialShift.fuel_liters / initialShift.mileage_km) * 100 * 10) / 10)
          : '8.5'
      );
      setRentCost(String(initialShift.rent_cost ?? driver.default_rent ?? 2200));
      setExpenses(initialShift.expenses || []);
    } else {
      setDate(today);
      const km = 220;
      const baseConsumption = driver.default_fuel_consumption || 8.5;
      const basePrice = driver.default_fuel_price || 58;
      const liters = Math.round(((baseConsumption * km) / 100) * 10) / 10;
      const cost = Math.round(liters * basePrice);

      setMileageKm(String(km));
      setFuelConsumption(String(baseConsumption));
      setFuelLiters(String(liters));
      setFuelCost(String(cost));
      setRentCost(String(driver.default_rent ?? 2200));
    }
  }, [initialShift, isOpen, driver.default_rent, driver.default_fuel_consumption, driver.default_fuel_price, today]);

  // Двусторонняя синхронизация расхода топлива
  // 1. При изменении литров пересчитываем расход:
  const handleLitersChange = (val: string) => {
    setFuelLiters(val);
    const l = parseFloat(val);
    const km = parseFloat(mileageKm);
    if (l > 0 && km > 0) {
      const calculatedConsumption = Math.round((l / km) * 100 * 10) / 10;
      setFuelConsumption(String(calculatedConsumption));
    }
  };

  // 2. При ручной корректировке расхода топлива (л/100км) пересчитываем литры и стоимость:
  const handleConsumptionChange = (val: string) => {
    setFuelConsumption(val);
    const cons = parseFloat(val);
    const km = parseFloat(mileageKm);
    if (cons > 0 && km > 0) {
      const calculatedLiters = Math.round(((cons * km) / 100) * 10) / 10;
      setFuelLiters(String(calculatedLiters));

      // Если была цена за литр, пересчитываем сумму:
      const currentCost = parseFloat(fuelCost);
      const currentLiters = parseFloat(fuelLiters);
      const pricePerL = currentLiters > 0 && currentCost > 0 ? currentCost / currentLiters : (driver.default_fuel_price || 58);
      setFuelCost(String(Math.round(calculatedLiters * pricePerL)));
    }
  };

  // Кнопки пошаговой корректировки расхода (-0.5 / +0.5 л/100км)
  const stepConsumption = (delta: number) => {
    const current = parseFloat(fuelConsumption) || 8.5;
    const next = Math.max(3, Math.round((current + delta) * 10) / 10);
    handleConsumptionChange(String(next));
  };

  const liveMetrics = calculateShiftMetrics({
    date,
    start_time: '08:00',
    end_time: '20:00',
    duration_hours: parseFloat(durationHours) || 0,
    mileage_km: parseFloat(mileageKm) || 0,
    gross_revenue: parseFloat(grossRevenue) || 0,
    fuel_liters: parseFloat(fuelLiters) || 0,
    fuel_cost: parseFloat(fuelCost) || 0,
    fuel_consumption_per_100km: parseFloat(fuelConsumption) || 0,
    rent_cost: parseFloat(rentCost) || 0,
    expenses,
  });

  const handleAddExpense = () => {
    const amt = parseFloat(newAmount);
    if (!amt || amt <= 0) return;

    setExpenses(prev => [
      ...prev,
      {
        id: 'exp_' + Date.now(),
        category: newCat,
        amount: amt,
        comment: newComment.trim() || undefined,
        created_at: new Date().toISOString(),
      },
    ]);
    setNewAmount('');
    setNewComment('');
  };

  const handleRemoveExpense = (id: string) => {
    setExpenses(prev => prev.filter(item => item.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const shiftData: Shift = {
      id: initialShift?.id || 'shift_' + Date.now(),
      driver_id: driver.id,
      date,
      start_time: '08:00',
      end_time: '20:00',
      duration_hours: liveMetrics.duration_hours,
      mileage_km: liveMetrics.mileage_km,
      gross_revenue: parseFloat(grossRevenue) || 0,
      fuel_liters: parseFloat(fuelLiters) || 0,
      fuel_cost: parseFloat(fuelCost) || 0,
      rent_cost: parseFloat(rentCost) || 0,
      other_expenses_total: liveMetrics.other_expenses_total,
      expenses,
      total_expenses: liveMetrics.total_expenses,
      net_profit: liveMetrics.net_profit,
      hourly_rate: liveMetrics.hourly_rate,
      cost_per_km: liveMetrics.cost_per_km,
      revenue_per_km: liveMetrics.revenue_per_km,
      fuel_consumption_per_100km: parseFloat(fuelConsumption) || liveMetrics.fuel_consumption_per_100km,
      status: 'completed',
      created_at: initialShift?.created_at || new Date().toISOString(),
    };

    onSave(shiftData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 safe-bottom animate-in fade-in duration-200">
      <div className="w-full max-w-md rounded-3xl bg-white/90 dark:bg-zinc-900/90 backdrop-blur-2xl border border-black/[0.08] dark:border-white/[0.1] shadow-2xl p-4 max-h-[90vh] flex flex-col text-zinc-900 dark:text-zinc-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0">
          <h2 className="text-sm font-semibold tracking-tight">
            {isActiveShiftEnding ? 'Итоги смены' : initialShift ? 'Редактирование' : 'Новая смена'}
          </h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-white bg-black/[0.04] dark:bg-white/[0.06]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-3 flex flex-col gap-3">
          {/* Дата и Часы */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Дата</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full min-h-[40px] px-2.5 py-1.5 bg-black/[0.03] dark:bg-zinc-950/80 border border-black/[0.08] dark:border-zinc-800 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Время (часов)</label>
              <input
                type="number"
                step="0.5"
                required
                value={durationHours}
                onChange={e => setDurationHours(e.target.value)}
                className="w-full min-h-[40px] px-2.5 py-1.5 bg-black/[0.03] dark:bg-zinc-950/80 border border-black/[0.08] dark:border-zinc-800 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Пробег и Бензин */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Пробег (км)</label>
              <input
                type="number"
                required
                value={mileageKm}
                onChange={e => setMileageKm(e.target.value)}
                className="w-full min-h-[40px] px-2.5 py-1.5 bg-black/[0.03] dark:bg-zinc-950/80 border border-black/[0.08] dark:border-zinc-800 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Бензин (л)</label>
              <input
                type="number"
                step="0.1"
                required
                value={fuelLiters}
                onChange={e => handleLitersChange(e.target.value)}
                className="w-full min-h-[40px] px-2.5 py-1.5 bg-black/[0.03] dark:bg-zinc-950/80 border border-black/[0.08] dark:border-zinc-800 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Сумма АЗС (₽)</label>
              <input
                type="number"
                required
                value={fuelCost}
                onChange={e => setFuelCost(e.target.value)}
                className="w-full min-h-[40px] px-2.5 py-1.5 bg-black/[0.03] dark:bg-zinc-950/80 border border-black/[0.08] dark:border-zinc-800 rounded-xl text-xs font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* КОРРЕКТИРОВКА РАСХОДА ТОПЛИВА (Л/100 КМ) */}
          <div className="p-3 bg-black/[0.03] dark:bg-zinc-950/60 rounded-xl border border-black/[0.06] dark:border-zinc-800/80 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-xs font-medium">Расход топлива:</span>
              </div>
              <span className="text-[10px] text-zinc-400 block mt-0.5">
                {parseFloat(fuelLiters) > 0 ? `~${(parseFloat(fuelCost) / parseFloat(fuelLiters)).toFixed(1)} ₽/л` : 'Корректировка'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => stepConsumption(-0.5)}
                className="w-7 h-7 rounded-lg bg-black/[0.05] dark:bg-zinc-800 hover:bg-black/[0.1] text-xs font-bold transition active:scale-95"
              >
                -
              </button>

              <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-black/[0.08] dark:border-zinc-800 px-2.5 py-1 rounded-lg">
                <input
                  type="number"
                  step="0.1"
                  value={fuelConsumption}
                  onChange={e => handleConsumptionChange(e.target.value)}
                  className="w-12 text-center bg-transparent font-mono font-bold text-xs focus:outline-none"
                />
                <span className="text-[10px] text-zinc-400 font-mono">л/100км</span>
              </div>

              <button
                type="button"
                onClick={() => stepConsumption(0.5)}
                className="w-7 h-7 rounded-lg bg-black/[0.05] dark:bg-zinc-800 hover:bg-black/[0.1] text-xs font-bold transition active:scale-95"
              >
                +
              </button>
            </div>
          </div>

          {/* Касса и Аренда */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Грязная касса (₽)</label>
              <input
                type="number"
                required
                value={grossRevenue}
                onChange={e => setGrossRevenue(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 bg-black/[0.03] dark:bg-zinc-950/80 border border-black/[0.08] dark:border-zinc-800 rounded-xl font-mono font-bold text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Аренда авто (₽)</label>
              <input
                type="number"
                required
                value={rentCost}
                onChange={e => setRentCost(e.target.value)}
                className="w-full min-h-[42px] px-3 py-2 bg-black/[0.03] dark:bg-zinc-950/80 border border-black/[0.08] dark:border-zinc-800 rounded-xl font-mono font-bold text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Доп. расходы */}
          <div className="p-3 bg-black/[0.03] dark:bg-zinc-950/60 rounded-xl border border-black/[0.06] dark:border-zinc-800/80 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 dark:text-zinc-400">Доп. расходы:</span>
              <span className="font-mono text-rose-500 font-semibold">
                -{formatCurrency(liveMetrics.other_expenses_total)}
              </span>
            </div>

            {expenses.length > 0 && (
              <div className="flex flex-col gap-1">
                {expenses.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-1 text-xs border-b border-black/[0.04] dark:border-zinc-900">
                    <span className="text-zinc-700 dark:text-zinc-300">
                      {getExpenseCategoryLabel(item.category)} {item.comment && `· ${item.comment}`}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-rose-500">-{formatCurrency(item.amount)}</span>
                      <button type="button" onClick={() => handleRemoveExpense(item.id)} className="text-zinc-400 hover:text-rose-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-1.5 pt-1">
              <select
                value={newCat}
                onChange={e => setNewCat(e.target.value as ExpenseCategory)}
                className="px-2 py-1 bg-white dark:bg-zinc-900 border border-black/[0.08] dark:border-zinc-800 rounded-lg text-xs focus:outline-none"
              >
                <option value="food">Обед</option>
                <option value="coffee">Кофе</option>
                <option value="wash">Мойка</option>
                <option value="fine">Штраф</option>
                <option value="other">Прочее</option>
              </select>

              <input
                type="number"
                placeholder="Сумма"
                value={newAmount}
                onChange={e => setNewAmount(e.target.value)}
                className="flex-1 px-2.5 py-1 bg-white dark:bg-zinc-900 border border-black/[0.08] dark:border-zinc-800 rounded-lg font-mono text-xs focus:outline-none"
              />

              <button
                type="button"
                onClick={handleAddExpense}
                disabled={!newAmount || parseFloat(newAmount) <= 0}
                className="px-3 py-1 bg-black/[0.06] dark:bg-zinc-800 hover:bg-black/[0.1] text-xs font-medium rounded-lg flex items-center gap-1 transition active:scale-95"
              >
                <Plus className="w-3 h-3" />
                <span>ОК</span>
              </button>
            </div>
          </div>

          {/* Итог */}
          <div className="p-3 bg-black/[0.03] dark:bg-zinc-950/80 rounded-xl border border-black/[0.06] dark:border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Чистая прибыль</span>
              <span className="font-mono text-xl font-bold text-emerald-500 dark:text-emerald-400">
                {formatCurrency(liveMetrics.net_profit)}
              </span>
            </div>
            <div className="text-right font-mono text-xs text-zinc-500 dark:text-zinc-400">
              <div>{formatCurrency(liveMetrics.hourly_rate)}/ч</div>
              <div className="text-[10px]">{fuelConsumption} л/100км</div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[46px] rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs active:scale-[0.98] transition mt-1 shadow-lg shadow-amber-500/10"
          >
            Сохранить смену
          </button>
        </form>
      </div>
    </div>
  );
}
