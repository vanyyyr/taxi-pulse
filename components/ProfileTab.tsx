'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FuelType, DriverProfile } from '@/lib/types';
import { updateDriverProfile, hashPin, seedSampleShifts } from '@/lib/storage';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Sliders, Database, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProfileTabProps {
  driver: DriverProfile;
  onUpdateDriver: (driver: DriverProfile) => void;
  onRefreshData: () => void;
  onLogout: () => void;
}

export function ProfileTab({
  driver,
  onUpdateDriver,
  onRefreshData,
  onLogout,
}: ProfileTabProps) {
  const [name, setName] = useState(driver.name);
  const [carModel, setCarModel] = useState(driver.car_model);
  const [fuelType, setFuelType] = useState<FuelType>(driver.fuel_type);
  const [defaultRent, setDefaultRent] = useState(String(driver.default_rent));
  const [defaultGoal, setDefaultGoal] = useState(String(driver.default_goal));
  const [defaultFuelConsumption, setDefaultFuelConsumption] = useState(String(driver.default_fuel_consumption || 8.5));
  const [defaultFuelPrice, setDefaultFuelPrice] = useState(String(driver.default_fuel_price || 58));
  
  const [newPin, setNewPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [pinSuccess, setPinSuccess] = useState(false);
  const [demoSuccess, setDemoSuccess] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = await updateDriverProfile({
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
    setPinError(null);
    if (!/^\d{4}$/.test(newPin)) {
      setPinError('PIN должен состоять из 4 цифр');
      setTimeout(() => setPinError(null), 3000);
      return;
    }

    const pinHash = await hashPin(newPin, driver.phone);
    const updated = await updateDriverProfile({ pin_hash: pinHash });
    if (updated) {
      onUpdateDriver(updated);
      setNewPin('');
      setPinSuccess(true);
      setTimeout(() => setPinSuccess(false), 2000);
    }
  };

  const handleLoadDemo = async () => {
    setLoadingDemo(true);
    try {
      await seedSampleShifts(driver);
      onRefreshData();
      setDemoSuccess(true);
      setTimeout(() => setDemoSuccess(false), 2500);
    } finally {
      setLoadingDemo(false);
    }
  };

  const hasCloud = isSupabaseConfigured();

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Driver Identity & Cloud DB Badge */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">{name}</h2>
          <span className="font-mono text-xs text-zinc-500 dark:text-zinc-400">{driver.phone}</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>{hasCloud ? 'Облако (PostgreSQL)' : 'Локально'}</span>
        </div>
      </div>

      {/* Cloud Storage Notice Card (Liquid Glass) */}
      <div className="p-3.5 rounded-2xl liquid-glass-card flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0 mt-0.5">
          <Database className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
            <span>Облачная база данных активна</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug mt-0.5">
            Облачная база данных активна. Профиль и история смен мгновенно синхронизируются с сервером Supabase PostgreSQL и доступны с любого устройства.
          </p>
        </div>
      </div>

      {/* Main Settings Form (Liquid Glass) */}
      <form onSubmit={handleSaveProfile} className="p-4 rounded-3xl liquid-glass-card shadow-sm flex flex-col gap-3">
        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
          Параметры и калибровка
        </span>

        <div>
          <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Позывной</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2 liquid-glass-input text-[16px] md:text-sm focus:outline-none focus:border-amber-400 text-zinc-900 dark:text-white"
          />
        </div>

        <div>
          <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Автомобиль</label>
          <input
            type="text"
            value={carModel}
            onChange={e => setCarModel(e.target.value)}
            className="w-full min-h-[44px] px-3.5 py-2 liquid-glass-input text-[16px] md:text-sm focus:outline-none focus:border-amber-400 text-zinc-900 dark:text-white"
          />
        </div>

        <div>
          <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Топливо</label>
          <select
            value={fuelType}
            onChange={e => setFuelType(e.target.value as FuelType)}
            className="w-full min-h-[44px] px-3.5 py-2 liquid-glass-input text-[16px] md:text-sm focus:outline-none focus:border-amber-400 text-zinc-900 dark:text-white"
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
        <div className="p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.06] flex flex-col gap-2">
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
                className="w-full min-h-[44px] px-3 py-2 liquid-glass-input font-mono text-[16px] md:text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-400"
              />
            </div>
            <div>
              <label className="text-[9px] text-zinc-500 dark:text-zinc-400 block mb-1">Цена за 1 л (₽)</label>
              <input
                type="number"
                step="1"
                value={defaultFuelPrice}
                onChange={e => setDefaultFuelPrice(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 liquid-glass-input font-mono text-[16px] md:text-sm text-zinc-900 dark:text-white focus:outline-none focus:border-amber-400"
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
              className="w-full min-h-[44px] px-3 py-2 liquid-glass-input font-mono text-[16px] md:text-sm focus:outline-none focus:border-amber-400 text-zinc-900 dark:text-white"
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-500 dark:text-zinc-400 block mb-1">Цель чистыми (₽)</label>
            <input
              type="number"
              value={defaultGoal}
              onChange={e => setDefaultGoal(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 liquid-glass-input font-mono text-[16px] md:text-sm focus:outline-none focus:border-amber-400 text-zinc-900 dark:text-white"
            />
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          type="submit"
          className="w-full min-h-[44px] mt-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-semibold text-xs transition cursor-pointer flex items-center justify-center shadow-sm"
        >
          {savedSuccess ? 'Сохранено в базу' : 'Сохранить'}
        </motion.button>
      </form>

      {/* Change PIN (Liquid Glass) */}
      <form onSubmit={handleSavePin} className="p-4 rounded-3xl liquid-glass-card shadow-sm flex flex-col gap-2">
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
            onChange={e => {
              setNewPin(e.target.value.replace(/\D/g, ''));
              if (pinError) setPinError(null);
            }}
            className="flex-1 min-h-[44px] px-3.5 py-2 liquid-glass-input font-mono text-[16px] md:text-sm font-bold tracking-widest focus:outline-none focus:border-amber-400 text-zinc-900 dark:text-white"
          />
          <motion.button
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={newPin.length !== 4}
            className="min-h-[44px] px-5 rounded-xl bg-black/[0.06] dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-200 text-xs font-semibold disabled:opacity-40 cursor-pointer transition flex items-center justify-center"
          >
            {pinSuccess ? 'OK' : 'Сменить'}
          </motion.button>
        </div>
        {pinError && (
          <div className="flex items-center gap-1.5 text-xs text-rose-500 pt-1 font-medium">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{pinError}</span>
          </div>
        )}
      </form>

      {/* Bottom utility actions */}
      <div className="flex flex-col gap-2">
        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          disabled={loadingDemo}
          onClick={handleLoadDemo}
          className="w-full min-h-[44px] rounded-xl liquid-glass-card hover:bg-white/80 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-xs font-medium transition disabled:opacity-50 cursor-pointer flex items-center justify-center"
        >
          {loadingDemo ? 'Запись в базу...' : demoSuccess ? 'Демо-смены записаны ✓' : 'Загрузить демо-смены'}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.97 }}
          type="button"
          onClick={onLogout}
          className="w-full min-h-[44px] rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-500 text-xs font-medium transition cursor-pointer flex items-center justify-center"
        >
          Выйти
        </motion.button>
      </div>
    </div>
  );
}
