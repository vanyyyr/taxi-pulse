'use client';

import React, { useState } from 'react';
import { 
  User, Lock, Save, LogOut, Check, Sliders 
} from 'lucide-react';
import { DriverProfile, FuelType } from '@/lib/types';
import { updateDriverProfile, hashPin, seedSampleShifts } from '@/lib/storage';
import { isSupabaseConfigured } from '@/lib/supabase';

interface ProfileTabProps {
  driver: DriverProfile;
  onUpdateDriver: (driver: DriverProfile) => void;
  onLogout: () => void;
  onRefreshData: () => void;
}

export function ProfileTab({
  driver,
  onUpdateDriver,
  onLogout,
  onRefreshData,
}: ProfileTabProps) {
  const [name, setName] = useState(driver.name);
  const [carModel, setCarModel] = useState(driver.car_model);
  const [fuelType, setFuelType] = useState<FuelType>(driver.fuel_type || 'ai95');
  const [defaultRent, setDefaultRent] = useState(String(driver.default_rent || 2200));
  const [defaultGoal, setDefaultGoal] = useState(String(driver.default_goal || 5000));
  const [defaultFuelConsumption, setDefaultFuelConsumption] = useState(String(driver.default_fuel_consumption || 8.5));
  const [defaultFuelPrice, setDefaultFuelPrice] = useState(String(driver.default_fuel_price || 58));

  const [newPin, setNewPin] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = updateDriverProfile({
      name: name.trim() || 'Водитель',
      car_model: carModel.trim() || 'Автомобиль',
      fuel_type: fuelType,
      default_rent: parseFloat(defaultRent) || 0,
      default_goal: parseFloat(defaultGoal) || 5000,
      default_fuel_consumption: parseFloat(defaultFuelConsumption) || 8.5,
      default_fuel_price: parseFloat(defaultFuelPrice) || 58,
    });

    if (updated) {
      onUpdateDriver(updated);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(newPin)) {
      alert('PIN должен состоять из 4 цифр');
      return;
    }

    const pinHash = await hashPin(newPin, driver.phone);
    const updated = updateDriverProfile({ pin_hash: pinHash });
    if (updated) {
      onUpdateDriver(updated);
      setNewPin('');
      setPinSuccess(true);
      setTimeout(() => setPinSuccess(false), 2000);
    }
  };

  const handleLoadDemo = () => {
    seedSampleShifts(driver);
    onRefreshData();
    alert('5 демо-смен загружены');
  };

  const hasCloud = isSupabaseConfigured();

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Driver Identity */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{name}</h2>
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{driver.phone}</span>
        </div>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono bg-black/[0.04] dark:bg-zinc-900 border border-black/[0.06] dark:border-zinc-800 text-zinc-600 dark:text-zinc-300">
          {hasCloud ? 'Supabase' : 'Offline PWA'}
        </span>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSaveProfile} className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex flex-col gap-3">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
          Параметры и калибровка
        </span>

        <div>
          <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Позывной</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full min-h-[40px] px-3 py-1.5 bg-black/[0.03] dark:bg-zinc-950 border border-black/[0.08] dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-amber-400 text-zinc-900 dark:text-white"
          />
        </div>

        <div>
          <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Автомобиль</label>
          <input
            type="text"
            value={carModel}
            onChange={e => setCarModel(e.target.value)}
            className="w-full min-h-[40px] px-3 py-1.5 bg-black/[0.03] dark:bg-zinc-950 border border-black/[0.08] dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-amber-400 text-zinc-900 dark:text-white"
          />
        </div>

        <div>
          <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Топливо</label>
          <select
            value={fuelType}
            onChange={e => setFuelType(e.target.value as FuelType)}
            className="w-full min-h-[40px] px-3 py-1.5 bg-black/[0.03] dark:bg-zinc-950 border border-black/[0.08] dark:border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-amber-400 text-zinc-900 dark:text-white"
          >
            <option value="ai92">АИ-92</option>
            <option value="ai95">АИ-95</option>
            <option value="ai98">АИ-98 / 100</option>
            <option value="gas_propane">Газ (Пропан)</option>
            <option value="gas_methane">Газ (Метан)</option>
            <option value="diesel">Дизель</option>
          </select>
        </div>

        {/* Калибровка расхода топлива автомобиля */}
        <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-zinc-950/60 border border-black/[0.06] dark:border-zinc-800/80 flex flex-col gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
            <Sliders className="w-3.5 h-3.5 text-amber-500" />
            <span>Калибровка расхода топлива</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[9px] text-zinc-500 dark:text-zinc-400 block mb-1">Расход авто (л/100км)</label>
              <input
                type="number"
                step="0.1"
                value={defaultFuelConsumption}
                onChange={e => setDefaultFuelConsumption(e.target.value)}
                className="w-full min-h-[38px] px-2.5 py-1 bg-white dark:bg-zinc-900 border border-black/[0.08] dark:border-zinc-800 rounded-lg font-mono text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[9px] text-zinc-500 dark:text-zinc-400 block mb-1">Цена за 1 л (₽)</label>
              <input
                type="number"
                step="1"
                value={defaultFuelPrice}
                onChange={e => setDefaultFuelPrice(e.target.value)}
                className="w-full min-h-[38px] px-2.5 py-1 bg-white dark:bg-zinc-900 border border-black/[0.08] dark:border-zinc-800 rounded-lg font-mono text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Аренда авто (₽)</label>
            <input
              type="number"
              value={defaultRent}
              onChange={e => setDefaultRent(e.target.value)}
              className="w-full min-h-[40px] px-3 py-1.5 bg-black/[0.03] dark:bg-zinc-950 border border-black/[0.08] dark:border-zinc-800 rounded-xl font-mono text-xs focus:outline-none focus:border-amber-400 text-zinc-900 dark:text-white"
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Цель чистыми (₽)</label>
            <input
              type="number"
              value={defaultGoal}
              onChange={e => setDefaultGoal(e.target.value)}
              className="w-full min-h-[40px] px-3 py-1.5 bg-black/[0.03] dark:bg-zinc-950 border border-black/[0.08] dark:border-zinc-800 rounded-xl font-mono text-xs focus:outline-none focus:border-amber-400 text-zinc-900 dark:text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          className="w-full min-h-[42px] mt-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs transition active:scale-[0.98]"
        >
          {savedSuccess ? 'Сохранено' : 'Сохранить'}
        </button>
      </form>

      {/* Change PIN */}
      <form onSubmit={handleSavePin} className="p-4 rounded-2xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex flex-col gap-2">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
          PIN-код
        </span>
        <div className="flex gap-2">
          <input
            type="password"
            maxLength={4}
            inputMode="numeric"
            placeholder="Новый PIN"
            value={newPin}
            onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
            className="flex-1 min-h-[40px] px-3 py-1.5 bg-black/[0.03] dark:bg-zinc-950 border border-black/[0.08] dark:border-zinc-800 rounded-xl font-mono text-xs font-bold tracking-widest focus:outline-none focus:border-amber-400 text-zinc-900 dark:text-white"
          />
          <button
            type="submit"
            disabled={newPin.length !== 4}
            className="px-4 rounded-xl bg-black/[0.06] dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-xs font-medium disabled:opacity-40"
          >
            {pinSuccess ? 'OK' : 'Сменить'}
          </button>
        </div>
      </form>

      {/* Bottom utility actions */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleLoadDemo}
          className="w-full min-h-[40px] rounded-xl bg-white/50 dark:bg-zinc-900/50 hover:bg-white dark:hover:bg-zinc-800 border border-black/[0.06] dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs font-medium transition"
        >
          Загрузить демо-смены
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="w-full min-h-[40px] rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 text-xs font-medium transition"
        >
          Выйти
        </button>
      </div>
    </div>
  );
}
