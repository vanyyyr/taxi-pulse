'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Sliders } from 'lucide-react';
import { Shift, ExpenseItem, ExpenseCategory, DriverProfile } from '@/lib/types';
import { 
  calculateShiftMetrics, 
  calculateDurationHours,
  formatCurrency, 
  getExpenseCategoryLabel 
} from '@/lib/calculations';
import { generateUUID } from '@/lib/storage';

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
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('20:00');
  const [durationHours, setDurationHours] = useState('11');
  const [startOdometer, setStartOdometer] = useState('');
  const [endOdometer, setEndOdometer] = useState('');
  const [mileageKm, setMileageKm] = useState('220');
  const [grossRevenue, setGrossRevenue] = useState('8500');
  const [fuelLiters, setFuelLiters] = useState('28');
  const [fuelCost, setFuelCost] = useState('1540');
  const [fuelConsumption, setFuelConsumption] = useState('8.5'); // л / 100 км
  const [rentCost, setRentCost] = useState(String(driver.default_rent || 2200));

  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    { id: '1', category: 'food', amount: 450, comment: 'Обед', created_at: '' },
    { id: '2', category: 'coffee', amount: 160, comment: 'Кофе', created_at: '' },
  ]);

  const [newCat, setNewCat] = useState<ExpenseCategory>('food');
  const [newAmount, setNewAmount] = useState('');
  const [newComment, setNewComment] = useState('');

  const [prevInitialShift, setPrevInitialShift] = useState<Shift | null | undefined>(initialShift);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  // Инициализация при открытии или изменении initialShift
  if (initialShift !== prevInitialShift || isOpen !== prevIsOpen) {
    setPrevInitialShift(initialShift);
    setPrevIsOpen(isOpen);
    if (initialShift) {
      setDate(initialShift.date || today);
      const initStart = initialShift.start_time || '08:00';
      setStartTime(initStart);

      const initEnd = initialShift.end_time || '20:00';
      setEndTime(initEnd);

      // Расчет фактической длительности смены
      if (initialShift.duration_hours && initialShift.duration_hours > 0) {
        setDurationHours(String(initialShift.duration_hours));
      } else if (initialShift.start_time && initEnd) {
        const dur = calculateDurationHours(initialShift.start_time, initEnd);
        setDurationHours(String(dur || 10));
      } else {
        setDurationHours('10');
      }

      const initStartOdo = initialShift.start_odometer !== undefined ? String(initialShift.start_odometer) : '';
      const initEndOdo = initialShift.end_odometer !== undefined ? String(initialShift.end_odometer) : '';
      setStartOdometer(initStartOdo);
      setEndOdometer(initEndOdo);

      const calculatedMileage = (initialShift.start_odometer !== undefined && initialShift.end_odometer !== undefined && initialShift.end_odometer >= initialShift.start_odometer)
        ? (initialShift.end_odometer - initialShift.start_odometer)
        : (initialShift.mileage_km || 0);

      setMileageKm(String(calculatedMileage || (isActiveShiftEnding ? 200 : 0)));
      setGrossRevenue(initialShift.gross_revenue ? String(initialShift.gross_revenue) : '0');
      setFuelLiters(initialShift.fuel_liters ? String(initialShift.fuel_liters) : '0');
      setFuelCost(initialShift.fuel_cost ? String(initialShift.fuel_cost) : '0');
      setFuelConsumption(
        initialShift.fuel_consumption_per_100km
          ? String(initialShift.fuel_consumption_per_100km)
          : calculatedMileage && initialShift.fuel_liters
          ? String(Math.round((initialShift.fuel_liters / calculatedMileage) * 100 * 10) / 10)
          : String(driver.default_fuel_consumption || 8.5)
      );
      setRentCost(String(initialShift.rent_cost ?? driver.default_rent ?? 2200));
      setExpenses(initialShift.expenses || []);
    } else {
      setDate(today);
      setStartTime('08:00');
      setEndTime('20:00');
      setDurationHours('11');
      setStartOdometer('');
      setEndOdometer('');

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
      setGrossRevenue('8500');
      setExpenses([
        { id: '1', category: 'food', amount: 450, comment: 'Обед', created_at: '' },
        { id: '2', category: 'coffee', amount: 160, comment: 'Кофе', created_at: '' },
      ]);
    }
  }

  // Двусторонняя калибровка расхода топлива
  // 1. При изменении пробега пересчитываем литры и стоимость
  const handleMileageChange = (val: string) => {
    setMileageKm(val);
    const km = parseFloat(val);
    const cons = parseFloat(fuelConsumption);
    if (km > 0 && cons > 0) {
      const calculatedLiters = Math.round(((cons * km) / 100) * 10) / 10;
      setFuelLiters(String(calculatedLiters));

      const pricePerL = driver.default_fuel_price || 58;
      const currentCost = parseFloat(fuelCost);
      const currentLiters = parseFloat(fuelLiters);
      const effectivePrice = currentLiters > 0 && currentCost > 0 ? (currentCost / currentLiters) : pricePerL;
      setFuelCost(String(Math.round(calculatedLiters * effectivePrice)));
    }
  };

  // 2. При изменении литров пересчитываем расход (л/100км) и сумму
  const handleLitersChange = (val: string) => {
    setFuelLiters(val);
    const l = parseFloat(val);
    const km = parseFloat(mileageKm);
    if (l > 0 && km > 0) {
      const calculatedConsumption = Math.round((l / km) * 100 * 10) / 10;
      setFuelConsumption(String(calculatedConsumption));
    }
    if (l > 0) {
      const pricePerL = driver.default_fuel_price || 58;
      setFuelCost(String(Math.round(l * pricePerL)));
    }
  };

  // 3. При ручной корректировке расхода топлива (л/100км) пересчитываем литры и стоимость
  const handleConsumptionChange = (val: string) => {
    setFuelConsumption(val);
    const cons = parseFloat(val);
    const km = parseFloat(mileageKm);
    if (cons > 0 && km > 0) {
      const calculatedLiters = Math.round(((cons * km) / 100) * 10) / 10;
      setFuelLiters(String(calculatedLiters));

      const pricePerL = driver.default_fuel_price || 58;
      setFuelCost(String(Math.round(calculatedLiters * pricePerL)));
    }
  };

  // 4. Корректировка одометров
  const handleStartOdoChange = (val: string) => {
    setStartOdometer(val);
    const start = parseFloat(val);
    const end = parseFloat(endOdometer);
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      handleMileageChange(String(end - start));
    }
  };

  const handleEndOdoChange = (val: string) => {
    setEndOdometer(val);
    const start = parseFloat(startOdometer);
    const end = parseFloat(val);
    if (!isNaN(start) && !isNaN(end) && end >= start) {
      handleMileageChange(String(end - start));
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
    start_time: startTime,
    end_time: endTime,
    duration_hours: parseFloat(durationHours) || 0,
    mileage_km: parseFloat(mileageKm) || 0,
    start_odometer: startOdometer ? parseFloat(startOdometer) : undefined,
    end_odometer: endOdometer ? parseFloat(endOdometer) : undefined,
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
      id: initialShift?.id || generateUUID(),
      driver_id: driver.id,
      date,
      start_time: startTime,
      end_time: endTime,
      duration_hours: liveMetrics.duration_hours,
      mileage_km: liveMetrics.mileage_km,
      start_odometer: startOdometer ? parseFloat(startOdometer) : initialShift?.start_odometer,
      end_odometer: endOdometer ? parseFloat(endOdometer) : initialShift?.end_odometer,
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
      notes: initialShift?.notes,
      created_at: initialShift?.created_at || new Date().toISOString(),
    };

    onSave(shiftData);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-md p-3 sm:p-4 safe-bottom safe-top safe-left safe-right">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md rounded-3xl liquid-glass-elevated shadow-2xl p-4 max-h-[90dvh] flex flex-col text-zinc-900 dark:text-zinc-100 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0">
          <h2 className="text-sm font-semibold tracking-tight">
            {isActiveShiftEnding ? 'Итоги смены' : initialShift ? 'Редактирование' : 'Новая смена'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть"
            className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-white bg-black/[0.04] dark:bg-white/[0.06] transition cursor-pointer -mr-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-3 flex flex-col gap-3 min-w-0">
          {/* Дата и Длительность */}
          <div className="grid grid-cols-2 gap-2 min-w-0">
            <div className="min-w-0">
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1 truncate">Дата</label>
              <input
                type="date"
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 liquid-glass-input text-[16px] md:text-sm font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="min-w-0">
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1 truncate">Время (часов)</label>
              <input
                type="number"
                step="0.1"
                required
                value={durationHours}
                onChange={e => setDurationHours(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 liquid-glass-input text-[16px] md:text-sm font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Время начала и окончания */}
          <div className="grid grid-cols-2 gap-2 min-w-0">
            <div className="min-w-0">
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1 truncate">Время начала</label>
              <input
                type="time"
                value={startTime}
                onChange={e => {
                  setStartTime(e.target.value);
                  const dur = calculateDurationHours(e.target.value, endTime);
                  if (dur > 0) setDurationHours(String(dur));
                }}
                className="w-full min-h-[44px] px-3 py-2 liquid-glass-input text-[16px] md:text-sm font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="min-w-0">
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1 truncate">Время окончания</label>
              <input
                type="time"
                value={endTime}
                onChange={e => {
                  setEndTime(e.target.value);
                  const dur = calculateDurationHours(startTime, e.target.value);
                  if (dur > 0) setDurationHours(String(dur));
                }}
                className="w-full min-h-[44px] px-3 py-2 liquid-glass-input text-[16px] md:text-sm font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Одометры: старт и финиш */}
          <div className="grid grid-cols-2 gap-2 min-w-0">
            <div className="min-w-0">
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1 truncate">Одометр старт (км)</label>
              <input
                type="number"
                placeholder="145000"
                value={startOdometer}
                onChange={e => handleStartOdoChange(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 liquid-glass-input text-[16px] md:text-sm font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="min-w-0">
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1 truncate">Одометр финиш (км)</label>
              <input
                type="number"
                placeholder="145220"
                value={endOdometer}
                onChange={e => handleEndOdoChange(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 liquid-glass-input text-[16px] md:text-sm font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Пробег и Бензин */}
          <div className="grid grid-cols-3 gap-2 min-w-0">
            <div className="min-w-0">
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1 truncate">Пробег (км)</label>
              <input
                type="number"
                required
                value={mileageKm}
                onChange={e => handleMileageChange(e.target.value)}
                className="w-full min-h-[44px] px-2.5 py-2 liquid-glass-input text-[16px] md:text-sm font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="min-w-0">
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1 truncate">Бензин (л)</label>
              <input
                type="number"
                step="0.1"
                required
                value={fuelLiters}
                onChange={e => handleLitersChange(e.target.value)}
                className="w-full min-h-[44px] px-2.5 py-2 liquid-glass-input text-[16px] md:text-sm font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="min-w-0">
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1 truncate">Сумма АЗС (₽)</label>
              <input
                type="number"
                required
                value={fuelCost}
                onChange={e => setFuelCost(e.target.value)}
                className="w-full min-h-[44px] px-2.5 py-2 liquid-glass-input text-[16px] md:text-sm font-mono focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* КОРРЕКТИРОВКА РАСХОДА ТОПЛИВА (Л/100 КМ) */}
          <div className="p-3 liquid-glass-card flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="text-xs font-medium truncate">Расход топлива:</span>
              </div>
              <span className="text-[10px] text-zinc-400 block mt-0.5 truncate">
                {parseFloat(fuelLiters) > 0 ? `~${(parseFloat(fuelCost) / parseFloat(fuelLiters)).toFixed(1)} ₽/л` : 'Двусторонняя калибровка'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => stepConsumption(-0.5)}
                aria-label="Уменьшить расход топлива"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-black/[0.05] dark:bg-zinc-800 hover:bg-black/[0.1] text-base font-bold transition active:scale-95 flex items-center justify-center cursor-pointer"
              >
                -
              </button>

              <div className="min-h-[44px] flex items-center gap-1 liquid-glass-input px-2.5 py-1">
                <input
                  type="number"
                  step="0.1"
                  value={fuelConsumption}
                  onChange={e => handleConsumptionChange(e.target.value)}
                  className="w-12 text-center bg-transparent font-mono font-bold text-[16px] md:text-xs focus:outline-none"
                />
                <span className="text-[10px] text-zinc-400 font-mono">л/100км</span>
              </div>

              <button
                type="button"
                onClick={() => stepConsumption(0.5)}
                aria-label="Увеличить расход топлива"
                className="w-11 h-11 min-w-[44px] min-h-[44px] rounded-xl bg-black/[0.05] dark:bg-zinc-800 hover:bg-black/[0.1] text-base font-bold transition active:scale-95 flex items-center justify-center cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* Касса и Аренда */}
          <div className="grid grid-cols-2 gap-2 min-w-0">
            <div className="min-w-0">
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1 truncate">Грязная касса (₽)</label>
              <input
                type="number"
                required
                value={grossRevenue}
                onChange={e => setGrossRevenue(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 liquid-glass-input font-mono font-bold text-[16px] md:text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
            <div className="min-w-0">
              <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1 truncate">Аренда авто (₽)</label>
              <input
                type="number"
                required
                value={rentCost}
                onChange={e => setRentCost(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 liquid-glass-input font-mono font-bold text-[16px] md:text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Доп. расходы */}
          <div className="p-3 liquid-glass-card flex flex-col gap-2 min-w-0">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-500 dark:text-zinc-400 font-medium">Доп. расходы:</span>
              <span className="font-mono text-rose-500 font-semibold">
                -{formatCurrency(liveMetrics.other_expenses_total)}
              </span>
            </div>

            {expenses.length > 0 && (
              <div className="flex flex-col gap-1">
                {expenses.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-1 text-xs border-b border-black/[0.04] dark:border-zinc-900">
                    <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[170px]">
                      {getExpenseCategoryLabel(item.category)} {item.comment && `· ${item.comment}`}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-mono text-rose-500 font-medium">-{formatCurrency(item.amount)}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExpense(item.id)}
                        aria-label="Удалить расход"
                        className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-rose-500 transition-colors cursor-pointer -mr-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Добавление нового расхода: адаптивный flex контейнер с min-w-0 для 320px */}
            <div className="flex flex-col gap-2 pt-1 min-w-0">
              <div className="flex gap-1.5 min-w-0">
                <select
                  value={newCat}
                  onChange={e => setNewCat(e.target.value as ExpenseCategory)}
                  aria-label="Категория нового расхода"
                  className="flex-1 min-w-0 min-h-[44px] px-2.5 py-2 liquid-glass-input text-[16px] md:text-xs focus:outline-none"
                >
                  <option value="food">Обед</option>
                  <option value="coffee">Кофе</option>
                  <option value="wash">Мойка</option>
                  <option value="fine">Штраф</option>
                  <option value="washer_fluid">Омывайка</option>
                  <option value="car_service">Шиномонтаж / Ремонт</option>
                  <option value="phone_internet">Связь и интернет</option>
                  <option value="other">Прочее</option>
                </select>

                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Сумма (₽)"
                  value={newAmount}
                  onChange={e => setNewAmount(e.target.value)}
                  className="w-24 min-w-0 min-h-[44px] px-2.5 py-2 liquid-glass-input font-mono text-[16px] md:text-xs focus:outline-none"
                />
              </div>

              <div className="flex gap-1.5 min-w-0">
                <input
                  type="text"
                  placeholder="Заметка к расходу"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  className="flex-1 min-w-0 min-h-[44px] px-3 py-2 liquid-glass-input text-[16px] md:text-xs focus:outline-none"
                />

                <button
                  type="button"
                  onClick={handleAddExpense}
                  disabled={!newAmount || parseFloat(newAmount) <= 0}
                  aria-label="Добавить расход"
                  className="min-h-[44px] min-w-[44px] px-3.5 py-2 bg-black/[0.06] dark:bg-zinc-800 hover:bg-black/[0.1] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition active:scale-95 shrink-0 cursor-pointer disabled:opacity-40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>ОК</span>
                </button>
              </div>
            </div>
          </div>

          {/* Итог */}
          <div className="p-3 liquid-glass-card flex items-center justify-between min-w-0">
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

          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            className="w-full min-h-[46px] rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-bold text-xs transition mt-1 shadow-lg shadow-amber-500/10 cursor-pointer flex items-center justify-center"
          >
            Сохранить смену
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
