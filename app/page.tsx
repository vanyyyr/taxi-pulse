'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  getCurrentDriver, 
  setCurrentDriver, 
  updateDriverProfile,
  getActiveShift, 
  saveActiveShift, 
  startNewShift, 
  getCompletedShifts, 
  saveCompletedShift, 
  deleteCompletedShift 
} from '@/lib/storage';
import { DriverProfile, Shift, ExpenseItem } from '@/lib/types';
import { calculateShiftMetrics, formatCurrency } from '@/lib/calculations';

// Components
import { Header } from '@/components/Header';
import { BottomNav, TabType } from '@/components/BottomNav';
import { AuthModal } from '@/components/AuthModal';
import { GoalProgressBar } from '@/components/GoalProgressBar';
import { ActiveShiftWidget } from '@/components/ActiveShiftWidget';
import { ShiftFormModal } from '@/components/ShiftFormModal';
import { AnalyticsTab } from '@/components/AnalyticsTab';
import { HistoryTab } from '@/components/HistoryTab';
import { ProfileTab } from '@/components/ProfileTab';

export default function HomePage() {
  const [isClient, setIsClient] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [completedShifts, setCompletedShifts] = useState<Shift[]>([]);
  const [currentTab, setCurrentTab] = useState<TabType>('shift');

  // Modals state
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isActiveEnding, setIsActiveEnding] = useState(false);

  // Initial load & Theme setup
  useEffect(() => {
    setIsClient(true);
    const savedTheme = (localStorage.getItem('taxipulse_theme') as 'dark' | 'light') || 'dark';
    setTheme(savedTheme);
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }

    const savedDriver = getCurrentDriver();
    if (savedDriver) {
      setDriver(savedDriver);
      const act = getActiveShift(savedDriver.id);
      setActiveShift(act);
      const list = getCompletedShifts(savedDriver.id);
      setCompletedShifts(list);
    }
  }, []);

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('taxipulse_theme', nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  };

  const refreshShifts = useCallback((driverId: string) => {
    const list = getCompletedShifts(driverId);
    setCompletedShifts(list);
  }, []);

  const handleAuthSuccess = (newDriver: DriverProfile) => {
    setDriver(newDriver);
    const act = getActiveShift(newDriver.id);
    setActiveShift(act);
    refreshShifts(newDriver.id);
  };

  const handleLogout = () => {
    if (confirm('Выйти из личного кабинета?')) {
      setCurrentDriver(null);
      setDriver(null);
      setActiveShift(null);
      setCompletedShifts([]);
    }
  };

  const handleUpdateGoal = (newGoal: number) => {
    if (!driver) return;
    const updated = updateDriverProfile({ default_goal: newGoal });
    if (updated) {
      setDriver(updated);
    }
  };

  // --------------------------------------------------------------------------
  // Действия активной смены
  // --------------------------------------------------------------------------

  const handleStartShift = (startOdometer?: number) => {
    if (!driver) return;
    const shift = startNewShift(driver, startOdometer);
    setActiveShift(shift);
  };

  const handleCancelShift = () => {
    if (!driver) return;
    if (confirm('Сбросить текущую смену?')) {
      saveActiveShift(driver.id, null);
      setActiveShift(null);
    }
  };

  const handleTriggerCompleteShift = () => {
    if (!activeShift) return;
    setEditingShift(activeShift);
    setIsActiveEnding(true);
    setIsShiftModalOpen(true);
  };

  const handleAddExpenseToActive = (expenseData: Omit<ExpenseItem, 'id' | 'created_at'>) => {
    if (!driver || !activeShift) return;

    const newItem: ExpenseItem = {
      ...expenseData,
      id: 'exp_' + Date.now(),
      created_at: new Date().toISOString(),
    };

    const updatedExpenses = [...activeShift.expenses, newItem];

    const metrics = calculateShiftMetrics({
      date: activeShift.date,
      start_time: activeShift.start_time,
      end_time: activeShift.end_time,
      duration_hours: activeShift.duration_hours,
      mileage_km: activeShift.mileage_km,
      gross_revenue: activeShift.gross_revenue,
      fuel_liters: activeShift.fuel_liters,
      fuel_cost: activeShift.fuel_cost,
      rent_cost: activeShift.rent_cost,
      expenses: updatedExpenses,
    });

    const updatedShift: Shift = {
      ...activeShift,
      expenses: updatedExpenses,
      other_expenses_total: metrics.other_expenses_total,
      total_expenses: metrics.total_expenses,
      net_profit: metrics.net_profit,
      hourly_rate: metrics.hourly_rate,
      cost_per_km: metrics.cost_per_km,
      revenue_per_km: metrics.revenue_per_km,
      fuel_consumption_per_100km: metrics.fuel_consumption_per_100km,
    };

    setActiveShift(updatedShift);
    saveActiveShift(driver.id, updatedShift);
  };

  const handleAddFuelToActive = (liters: number, cost: number) => {
    if (!driver || !activeShift) return;

    const newFuelLiters = (Number(activeShift.fuel_liters) || 0) + liters;
    const newFuelCost = (Number(activeShift.fuel_cost) || 0) + cost;

    const metrics = calculateShiftMetrics({
      date: activeShift.date,
      start_time: activeShift.start_time,
      end_time: activeShift.end_time,
      duration_hours: activeShift.duration_hours,
      mileage_km: activeShift.mileage_km,
      gross_revenue: activeShift.gross_revenue,
      fuel_liters: newFuelLiters,
      fuel_cost: newFuelCost,
      rent_cost: activeShift.rent_cost,
      expenses: activeShift.expenses,
    });

    const updatedShift: Shift = {
      ...activeShift,
      fuel_liters: newFuelLiters,
      fuel_cost: newFuelCost,
      total_expenses: metrics.total_expenses,
      net_profit: metrics.net_profit,
      hourly_rate: metrics.hourly_rate,
      cost_per_km: metrics.cost_per_km,
      revenue_per_km: metrics.revenue_per_km,
      fuel_consumption_per_100km: metrics.fuel_consumption_per_100km,
    };

    setActiveShift(updatedShift);
    saveActiveShift(driver.id, updatedShift);
  };

  const handleAddRevenueToActive = (amount: number) => {
    if (!driver || !activeShift) return;

    const newGross = (Number(activeShift.gross_revenue) || 0) + amount;

    const metrics = calculateShiftMetrics({
      date: activeShift.date,
      start_time: activeShift.start_time,
      end_time: activeShift.end_time,
      duration_hours: activeShift.duration_hours,
      mileage_km: activeShift.mileage_km,
      gross_revenue: newGross,
      fuel_liters: activeShift.fuel_liters,
      fuel_cost: activeShift.fuel_cost,
      rent_cost: activeShift.rent_cost,
      expenses: activeShift.expenses,
    });

    const updatedShift: Shift = {
      ...activeShift,
      gross_revenue: newGross,
      net_profit: metrics.net_profit,
      hourly_rate: metrics.hourly_rate,
      cost_per_km: metrics.cost_per_km,
      revenue_per_km: metrics.revenue_per_km,
      fuel_consumption_per_100km: metrics.fuel_consumption_per_100km,
    };

    setActiveShift(updatedShift);
    saveActiveShift(driver.id, updatedShift);
  };

  const handleSaveShift = (saved: Shift) => {
    if (!driver) return;

    if (activeShift && (isActiveEnding || activeShift.id === saved.id)) {
      saveActiveShift(driver.id, null);
      setActiveShift(null);
      setIsActiveEnding(false);
    }

    const updatedList = saveCompletedShift(driver.id, saved);
    setCompletedShifts(updatedList);
    setEditingShift(null);
  };

  const handleDeleteShift = (shiftId: string) => {
    if (!driver) return;
    const updated = deleteCompletedShift(driver.id, shiftId);
    setCompletedShifts(updated);
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setIsActiveEnding(false);
    setIsShiftModalOpen(true);
  };

  const handleOpenManualNewShift = () => {
    setEditingShift(null);
    setIsActiveEnding(false);
    setIsShiftModalOpen(true);
  };

  if (!isClient) {
    return <div className="min-h-screen bg-[#f4f4f7] dark:bg-black" />;
  }

  if (!driver) {
    return <AuthModal onSuccess={handleAuthSuccess} />;
  }

  const latestShift = completedShifts[0] || null;
  const currentGoalProfit = activeShift ? activeShift.net_profit : (latestShift?.net_profit || 0);
  const currentHourly = activeShift ? activeShift.hourly_rate : (latestShift?.hourly_rate || 0);

  return (
    <div className="min-h-screen bg-[#f4f4f7] dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col justify-between selection:bg-amber-400 selection:text-black relative transition-colors duration-300">
      {/* Liquid Glass Ambient Refraction Blobs */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-amber-400/20 dark:bg-amber-500/10 blur-[130px]" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-emerald-400/15 dark:bg-emerald-500/10 blur-[140px]" />
      </div>

      {/* Sleek Header with Theme Toggle */}
      <Header
        driver={driver}
        activeShift={activeShift}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onLogout={handleLogout}
        onOpenProfile={() => setCurrentTab('profile')}
      />

      {/* Main Content with Animated Tab Transitions */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-3 pb-20 flex flex-col gap-3.5">
        <AnimatePresence mode="wait">
          {/* TAB 1: СМЕНА */}
          {currentTab === 'shift' && (
            <motion.div
              key="shift"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-3.5"
            >
              {/* Hero Earnings & Goal Pacing */}
              <GoalProgressBar
                currentNetProfit={currentGoalProfit}
                targetGoal={driver.default_goal || 5000}
                hourlyRate={currentHourly}
                onUpdateGoal={handleUpdateGoal}
              />

              {/* Shift Controller */}
              <ActiveShiftWidget
                activeShift={activeShift}
                driver={driver}
                onStartShift={handleStartShift}
                onCompleteShift={handleTriggerCompleteShift}
                onCancelShift={handleCancelShift}
                onOpenManualModal={handleOpenManualNewShift}
                onAddExpense={handleAddExpenseToActive}
                onAddFuel={handleAddFuelToActive}
                onAddRevenue={handleAddRevenueToActive}
              />

              {/* Latest Shift Summary Strip (Liquid Glass) */}
              {!activeShift && latestShift && (
                <div className="p-4 rounded-3xl bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm flex flex-col gap-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">Последняя смена</span>
                    <span className="font-mono text-zinc-400 dark:text-zinc-500 text-[11px]">{latestShift.date}</span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 font-mono text-xs">
                    <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-zinc-950 border border-black/[0.04] dark:border-zinc-800/60">
                      <span className="text-[9px] text-zinc-500 font-sans block">Касса</span>
                      <span className="text-zinc-900 dark:text-white font-semibold">{formatCurrency(latestShift.gross_revenue)}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-zinc-950 border border-black/[0.04] dark:border-zinc-800/60">
                      <span className="text-[9px] text-zinc-500 font-sans block">Аренда</span>
                      <span className="text-rose-500 font-semibold">-{formatCurrency(latestShift.rent_cost)}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-zinc-950 border border-black/[0.04] dark:border-zinc-800/60">
                      <span className="text-[9px] text-zinc-500 font-sans block">Бензин</span>
                      <span className="text-rose-500 font-semibold">-{formatCurrency(latestShift.fuel_cost)}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-black/[0.02] dark:bg-zinc-950 border border-black/[0.04] dark:border-zinc-800/60">
                      <span className="text-[9px] text-zinc-500 font-sans block">Чистыми</span>
                      <span className="text-emerald-500 dark:text-emerald-400 font-bold">+{formatCurrency(latestShift.net_profit)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500 dark:text-zinc-400 pt-0.5">
                    <span>Ставка: <strong className="text-zinc-800 dark:text-zinc-200">{formatCurrency(latestShift.hourly_rate)}/ч</strong></span>
                    <span>Расход: <strong className="text-zinc-800 dark:text-zinc-200">{latestShift.fuel_consumption_per_100km} л</strong></span>
                    <span>Себестоимость: <strong className="text-zinc-800 dark:text-zinc-200">{latestShift.cost_per_km} ₽/км</strong></span>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 2: АНАЛИТИКА */}
          {currentTab === 'analytics' && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <AnalyticsTab shifts={completedShifts} driver={driver} />
            </motion.div>
          )}

          {/* TAB 3: ИСТОРИЯ */}
          {currentTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <HistoryTab
                shifts={completedShifts}
                driver={driver}
                onEditShift={handleEditShift}
                onDeleteShift={handleDeleteShift}
                onAddNewShift={handleOpenManualNewShift}
              />
            </motion.div>
          )}

          {/* TAB 4: ПРОФИЛЬ */}
          {currentTab === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <ProfileTab
                driver={driver}
                onUpdateDriver={setDriver}
                onLogout={handleLogout}
                onRefreshData={() => refreshShifts(driver.id)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Liquid Glass Bottom Nav with Spring Indicator */}
      <BottomNav
        currentTab={currentTab}
        onChangeTab={setCurrentTab}
        hasActiveShift={Boolean(activeShift)}
      />

      {/* Shift Form Modal */}
      <ShiftFormModal
        isOpen={isShiftModalOpen}
        onClose={() => {
          setIsShiftModalOpen(false);
          setEditingShift(null);
          setIsActiveEnding(false);
        }}
        onSave={handleSaveShift}
        driver={driver}
        initialShift={editingShift}
        isActiveShiftEnding={isActiveEnding}
      />
    </div>
  );
}
